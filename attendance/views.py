from .net import client_ip
import csv
import io
from datetime import date as date_cls, datetime, timedelta

from django.db import transaction
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from django.http import HttpResponse
from django.utils.dateparse import parse_date
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import CanManageBuses, IsStudent, is_incharge
from accounts.linking import create_teacher_login, LinkError
from django.core.exceptions import ValidationError as DjangoValidationError
from buses.models import Bus
from students.models import Student

from attendance.services import set_attendance
from utils.params import int_param
from .exports import force_text_cells, safe_rows
from .models import AttendanceRecord, AttendanceSession, AttendanceWindowConfig, Teacher
from .permissions import IsDriver, driver_bus, is_driver, IsInCharge, incharge_bus
from .serializers import (
    AttendanceRecordSerializer,
    AttendanceSessionSerializer,
    AttendanceSubmitSerializer,
    AttendanceWindowConfigSerializer,
    TeacherSerializer,
)


# ---------------------------------------------------------------------------
# Attendance window times (when MORNING/EVENING open & close) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â admins and
# transport staff can view and edit these; everyone else can only view them
# read-only (e.g. so the incharge UI can show "window opens at 5:00 AM").
# ---------------------------------------------------------------------------
@api_view(["GET", "PUT", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def attendance_window_config(request):
    config = AttendanceWindowConfig.get_solo()

    if request.method == "GET":
        return Response(AttendanceWindowConfigSerializer(config).data)

    if not CanManageBuses().has_permission(request, None):
        return Response({"detail": "Only admins and transport staff can change attendance window times."}, status=403)

    serializer = AttendanceWindowConfigSerializer(
        config, data=request.data, partial=(request.method == "PATCH"),
    )
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Teachers roster (admin/staff manage it, the same way students are managed)
# ---------------------------------------------------------------------------
class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.select_related("bus").all()
    serializer_class = TeacherSerializer
    permission_classes = [CanManageBuses]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "staff_id", "department"]

    def get_queryset(self):
        qs = super().get_queryset()
        bus_id = self.request.query_params.get("bus")
        if bus_id:
            qs = qs.filter(bus_id=bus_id)
        return qs

    @action(detail=True, methods=["post"], url_path="create-login")
    def create_login(self, request, pk=None):
        """Give an existing teacher (e.g. imported by CSV) a login account."""
        teacher = self.get_object()
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""
        try:
            create_teacher_login(teacher, username, password)
        except LinkError as exc:
            return Response({"username": str(exc)}, status=400)
        except DjangoValidationError as exc:
            return Response({"password": exc.messages}, status=400)
        return Response(TeacherSerializer(teacher).data)


# ---------------------------------------------------------------------------
# Driver "my bus" setup: bus number + how many students/teachers ride it
# ---------------------------------------------------------------------------
class DriverBusView(APIView):
    """
    GET  -> the signed-in driver's linked bus (or null if not set up yet).
    POST -> claim a bus by its (unique) bus number and set headcounts.
    PATCH -> update headcounts only, without re-claiming the bus.
    """

    permission_classes = [IsDriver]

    def get(self, request):
        bus = driver_bus(request.user)
        if not bus:
            return Response({"bus": None})
        from buses.serializers import BusSerializer

        return Response({"bus": BusSerializer(bus).data})

    def post(self, request):
        bus_number = (request.data.get("bus_number") or "").strip()
        if not bus_number:
            return Response({"bus_number": "Enter the bus number."}, status=400)

        try:
            bus = Bus.objects.get(bus_number__iexact=bus_number)
        except Bus.DoesNotExist:
            return Response(
                {"bus_number": "No bus with that number. Ask an admin to add it first."}, status=404
            )

        if bus.driver_id and bus.driver_id != request.user.id:
            return Response(
                {"bus_number": f"Bus {bus.bus_number} is already linked to another driver."}, status=400
            )

        existing = driver_bus(request.user)
        if existing and existing.pk != bus.pk:
            existing.driver = None
            existing.save(update_fields=["driver"])

        bus.driver = request.user
        self._apply_capacity(bus, request.data)
        bus.save(update_fields=["driver", "student_capacity", "teacher_capacity"])

        from buses.serializers import BusSerializer

        return Response({"bus": BusSerializer(bus).data}, status=status.HTTP_200_OK)

    def patch(self, request):
        bus = driver_bus(request.user)
        if not bus:
            return Response({"detail": "Set up your bus first."}, status=400)
        self._apply_capacity(bus, request.data)
        bus.save(update_fields=["student_capacity", "teacher_capacity"])

        from buses.serializers import BusSerializer

        return Response({"bus": BusSerializer(bus).data})

    @staticmethod
    def _apply_capacity(bus, data):
        for field in ("student_capacity", "teacher_capacity"):
            if field in data and data[field] not in (None, ""):
                try:
                    value = int(data[field])
                except (TypeError, ValueError):
                    continue
                setattr(bus, field, max(0, value))


def _resolve_bus(request):
    """The bus this request is about: the driver's own bus, the in-charge's
    own bus, or ?bus=<id> for staff/admin."""
    if is_driver(request.user):
        return driver_bus(request.user), None
    if is_incharge(request.user):
        return incharge_bus(request.user), None
    bus_id = request.query_params.get("bus") or request.data.get("bus")
    if not bus_id:
        return None, Response({"detail": "Provide ?bus=<id>."}, status=400)
    try:
        return Bus.objects.get(pk=bus_id), None
    except (Bus.DoesNotExist, ValueError, TypeError):
        return None, Response({"detail": "Bus not found."}, status=404)


def _resolve_slot(request):
    """?slot=MORNING|EVENING, defaulting to MORNING. Returns (slot, error_response)."""
    slot = (request.query_params.get("slot") or request.data.get("slot") or "MORNING").upper()
    if slot not in dict(AttendanceSession.SLOT_CHOICES):
        return None, Response({"detail": "Invalid slot. Use MORNING or EVENING."}, status=400)
    return slot, None


# ---------------------------------------------------------------------------
# Today's (or any date's) roster to take attendance against
# ---------------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def attendance_roster(request):
    bus, error = _resolve_bus(request)
    if error:
        return error
    if not bus:
        return Response({"detail": "You're not linked to a bus yet. Set it up first."}, status=400)
    if not (is_driver(request.user) or CanManageBuses().has_permission(request, None)):
        return Response({"detail": "Not allowed."}, status=403)

    slot, error = _resolve_slot(request)
    if error:
        return error

    day = parse_date(request.query_params.get("date", "")) or date_cls.today()

    session = (
        AttendanceSession.objects.filter(bus=bus, date=day, slot=slot)
        .prefetch_related("records__student", "records__teacher")
        .first()
    )
    status_by_student = {}
    status_by_teacher = {}
    if session:
        for r in session.records.all():
            if r.student_id:
                status_by_student[r.student_id] = r.status
            if r.teacher_id:
                status_by_teacher[r.teacher_id] = r.status

    students = Student.objects.filter(bus=bus).order_by("roll_number")
    teachers = Teacher.objects.filter(bus=bus).order_by("name")

    return Response({
        "bus_id": bus.id,
        "bus_number": bus.bus_number,
        "date": str(day),
        "slot": slot,
        "is_holiday": session.is_holiday if session else False,
        "holiday_reason": session.holiday_reason if session else "",
        "already_marked": session is not None,
        "students": [
            {
                "id": s.id, "name": s.name, "roll_number": s.roll_number,
                "status": status_by_student.get(s.id),
                "locked": status_by_student.get(s.id) == "PRESENT",
            }
            for s in students
        ],
        "teachers": [
            {
                "id": t.id, "name": t.name, "staff_id": t.staff_id,
                "status": status_by_teacher.get(t.id),
                "locked": status_by_teacher.get(t.id) == "PRESENT",
            }
            for t in teachers
        ],
    })


# ---------------------------------------------------------------------------
# Submit today's (or a chosen date's) attendance, or mark it a holiday
# ---------------------------------------------------------------------------
@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def attendance_submit(request):
    bus, error = _resolve_bus(request)
    if error:
        return error
    if not bus:
        return Response({"detail": "You're not linked to a bus yet. Set it up first."}, status=400)
    if not CanManageBuses().has_permission(request, None):
        return Response({"detail": "Not allowed. Attendance is now taken via QR/face check-in."}, status=403)

    serializer = AttendanceSubmitSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    # Every person in the payload must exist AND belong to this bus.
    if not data["is_holiday"]:
        student_ids = {r["id"] for r in data["records"] if r["person_type"] == "STUDENT"}
        teacher_ids = {r["id"] for r in data["records"] if r["person_type"] == "TEACHER"}
        ok_students = set(Student.objects.filter(pk__in=student_ids, bus=bus).values_list("pk", flat=True))
        ok_teachers = set(Teacher.objects.filter(pk__in=teacher_ids, bus=bus).values_list("pk", flat=True))
        bad_students = sorted(student_ids - ok_students)
        bad_teachers = sorted(teacher_ids - ok_teachers)
        if bad_students or bad_teachers:
            return Response(
                {
                    "detail": "Some people are not on this bus's roster.",
                    "invalid_student_ids": bad_students,
                    "invalid_teacher_ids": bad_teachers,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    with transaction.atomic():
        session, created = AttendanceSession.objects.update_or_create(
            bus=bus,
            date=data["date"],
            slot=data["slot"],
            defaults={
                "is_holiday": data["is_holiday"],
                "holiday_reason": data.get("holiday_reason", "") if data["is_holiday"] else "",
            },
        )
        if created:
            session.marked_by = request.user
            session.save(update_fields=["marked_by"])

        if data["is_holiday"]:
            # Never delete verified records. Only remove ABSENT/AUTO_ABSENT rows;
            # if any PRESENT records exist, refuse and tell the caller.
            present_count = session.records.filter(status="PRESENT").count()
            if present_count:
                return Response(
                    {"detail": f"Cannot mark as holiday: {present_count} student(s) are already marked PRESENT. Correct those records first."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Never delete records: their audit rows are immutable. Reports skip holiday sessions.
        else:
            seen_student_ids, seen_teacher_ids = set(), set()
            for row in data["records"]:
                person_type = row["person_type"]
                lookup = {"session": session}
                if person_type == "STUDENT":
                    lookup["student_id"] = row["id"]
                else:
                    lookup["teacher_id"] = row["id"]

                existing = AttendanceRecord.objects.filter(**lookup).first()

                # A driver can never flip an already-Present record, either
                # direction, and can never self-correct Absent -> Present.
                # Only a fresh (never-submitted) record may be saved as Present.
                locked = existing and existing.status == "PRESENT"
                blocked_flip = existing and existing.status == "ABSENT" and row["status"] == "PRESENT"
                if locked or blocked_flip:
                    if person_type == "STUDENT":
                        seen_student_ids.add(row["id"])
                    else:
                        seen_teacher_ids.add(row["id"])
                    continue

                set_attendance(
                    session=session,
                    person_type=person_type,
                    student_id=row["id"] if person_type == "STUDENT" else None,
                    teacher_id=row["id"] if person_type == "TEACHER" else None,
                    status=row["status"],
                    action="SUBMIT",
                    actor=request.user,
                    remarks=row.get("remarks", ""),
                    reason=row.get("remarks", ""),
                    ip_address=client_ip(request),
                )
                if person_type == "STUDENT":
                    seen_student_ids.add(row["id"])
                else:
                    seen_teacher_ids.add(row["id"])
            # Records for people missing from this submission are left untouched.
            # Deleting them would also erase their audit trail (cascade).

    return Response(AttendanceSessionSerializer(session).data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Admin/staff correction: the ONLY way to flip an Absent record to Present
# after the driver has already submitted. Never lets a Present record change.
# ---------------------------------------------------------------------------
@api_view(["PATCH"])
@permission_classes([CanManageBuses])
def attendance_correct(request, record_id):
    try:
        record = AttendanceRecord.objects.select_related("session").get(pk=record_id)
    except AttendanceRecord.DoesNotExist:
        return Response({"detail": "Attendance record not found."}, status=404)

    if record.status == "PRESENT":
        return Response({"detail": "This record is already marked Present and is locked."}, status=400)

    remark = (request.data.get("remark") or "").strip()
    if not 10 <= len(remark) <= 200:
        return Response(
            {"detail": "remark is required and must be between 10 and 200 characters."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    ip = client_ip(request) or ''
    record = set_attendance(
        session=record.session,
        person_type=record.person_type,
        student=record.student,
        teacher=record.teacher,
        status='PRESENT',
        action='CORRECT',
        source='MANUAL',
        remarks=remark,
        actor=request.user,
        reason=remark,
        ip_address=ip.split(',')[0].strip() or None,
    )

    return Response(AttendanceRecordSerializer(record).data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# History: past sessions for a bus, for review / export
# ---------------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def attendance_history(request):
    bus, error = _resolve_bus(request)
    if error:
        return error
    if not bus:
        return Response({"detail": "You're not linked to a bus yet. Set it up first."}, status=400)
    if not (is_driver(request.user) or CanManageBuses().has_permission(request, None)):
        return Response({"detail": "Not allowed."}, status=403)

    qs = AttendanceSession.objects.filter(bus=bus).select_related("bus").prefetch_related("records__student", "records__teacher").order_by("-date")
    date_from = parse_date(request.query_params.get("from", "") or "")
    date_to = parse_date(request.query_params.get("to", "") or "")
    if date_from:
        qs = qs.filter(date__gte=date_from)
    if date_to:
        qs = qs.filter(date__lte=date_to)

    return Response(AttendanceSessionSerializer(qs[:180], many=True).data)


# ---------------------------------------------------------------------------
# Export attendance history as a downloadable file (CSV / Excel / PDF)
# ---------------------------------------------------------------------------
def _export_rows(bus, date_from, date_to):
    qs = AttendanceSession.objects.filter(bus=bus).prefetch_related("records__student", "records__teacher")
    if date_from:
        qs = qs.filter(date__gte=date_from)
    if date_to:
        qs = qs.filter(date__lte=date_to)
    qs = qs.order_by("date")

    rows = [["Date", "Bus", "Slot", "Type", "ID/Roll No.", "Name", "Status", "Source", "Remarks"]]
    for session in qs:
        if session.is_holiday:
            rows.append([
                str(session.date), bus.bus_number, session.slot, "-", "-", "-",
                f"HOLIDAY ({session.holiday_reason or '-'})", "-", "-",
            ])
            continue
        for r in session.records.all():
            who = r.student or r.teacher
            identifier = r.student.roll_number if r.student else (r.teacher.staff_id if r.teacher else "")
            rows.append([
                str(session.date), bus.bus_number, session.slot, r.person_type,
                identifier, who.name if who else "", r.status, r.source, r.remarks,
            ])
    return rows


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def attendance_export(request):
    bus, error = _resolve_bus(request)
    if error:
        return error
    if not bus:
        return Response({"detail": "You're not linked to a bus yet. Set it up first."}, status=400)
    if not (is_driver(request.user) or is_incharge(request.user) or CanManageBuses().has_permission(request, None)):
        return Response({"detail": "Not allowed."}, status=403)

    # NOTE: DRF reserves the "format" query parameter for its own content
    # negotiation (it 404s before this view even runs if given an unknown
    # value like "xlsx"), so the export type is passed as "filetype" instead.
    fmt = (request.query_params.get("filetype") or "csv").lower()
    date_from = parse_date(request.query_params.get("from", "") or "")
    date_to = parse_date(request.query_params.get("to", "") or "")
    rows = _export_rows(bus, date_from, date_to)
    filename_base = f"attendance_{bus.bus_number}_{timezone.localtime().strftime('%Y%m%d_%H%M%S')}"

    if fmt == "xlsx":
        try:
            from openpyxl import Workbook
        except ImportError:
            return Response({"detail": "Excel export needs the 'openpyxl' package on the server."}, status=501)
        wb = Workbook()
        ws = wb.active
        ws.title = "Attendance"
        for row in rows:
            ws.append(row)
        force_text_cells(ws)  # names like "=1+1" must stay text, not become formulas
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        resp = HttpResponse(
            buf.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        resp["Content-Disposition"] = f'attachment; filename="{filename_base}.xlsx"'
        return resp

    if fmt == "pdf":
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4, landscape
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
        except ImportError:
            return Response({"detail": "PDF export needs the 'reportlab' package on the server."}, status=501)
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=landscape(A4))
        table = Table(rows, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f4f6")]),
        ]))
        doc.build([table])
        buf.seek(0)
        resp = HttpResponse(buf.read(), content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="{filename_base}.pdf"'
        return resp

    # Default: CSV - no extra dependency needed.
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerows(safe_rows(rows))  # neutralise spreadsheet formulas in names etc.
    resp = HttpResponse(buf.getvalue(), content_type="text/csv")
    resp["Content-Disposition"] = f'attachment; filename="{filename_base}.csv"'
    return resp


# ---------------------------------------------------------------------------
# A student's own "was I marked present or absent" view - read-only, and only
# ever about the day their driver already took attendance for, on the roster
# row *they* linked their account to (see students.views.MyStudentLinkView).
# Returns separate morning/evening blocks since a bus can run two slots a day.
# ---------------------------------------------------------------------------
def _day_status_for_student(bus, student, day, slot):
    """What the driver's attendance says about `student` on `day`/`slot`, or
    the 'not marked yet' shape if that slot hasn't been marked (yet, or at all)."""
    base = {
        "date": str(day), "status": None, "is_holiday": False,
        "holiday_reason": "", "marked": False, "source": None,
    }
    if not bus:
        return base

    session = (
        AttendanceSession.objects.filter(bus=bus, date=day, slot=slot)
        .prefetch_related("records")
        .first()
    )
    if not session:
        return base

    if session.is_holiday:
        return {**base, "is_holiday": True, "holiday_reason": session.holiday_reason, "marked": True}

    record = next((r for r in session.records.all() if r.student_id == student.id), None)
    if not record:
        return base
    return {**base, "status": record.status, "marked": True, "source": record.source}


@api_view(["GET"])
@permission_classes([IsStudent])
def my_attendance(request):
    """
    For the signed-in student's own linked roster row: today's present/absent
    status for each slot (as taken by their bus's driver), plus a short
    per-slot recent trend so "today" has some context. Shows "not marked
    yet" until the driver actually submits that slot's roster.
    """
    student = getattr(request.user, "student_profile", None)
    if not student:
        return Response({"linked": False, "student": None})

    bus = student.bus
    today = date_cls.today()

    def slot_block(slot):
        recent = [_day_status_for_student(bus, student, today - timedelta(days=i), slot) for i in range(7)]
        return {"today": recent[0], "recent": recent}

    return Response({
        "linked": True,
        "student": {"id": student.id, "name": student.name, "roll_number": student.roll_number},
        "bus_number": bus.bus_number if bus else None,
        "morning": slot_block("MORNING"),
        "evening": slot_block("EVENING"),
    })


# ---------------------------------------------------------------------------
# Analytics: cohort-wide overview (trend, bus comparison, top absentees)
# ---------------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([CanManageBuses])
def attendance_analytics_overview(request):
    period = (request.query_params.get("period") or "monthly").lower()
    bus_id = request.query_params.get("bus")
    department = request.query_params.get("department")

    today = date_cls.today()
    year = int_param(request.query_params, "year", today.year)

    sessions = AttendanceSession.objects.filter(date__year=year, is_holiday=False)
    month = None
    if period == "monthly":
        month = int_param(request.query_params, "month", today.month)
        sessions = sessions.filter(date__month=month)
    if bus_id:
        sessions = sessions.filter(bus_id=bus_id)

    records = AttendanceRecord.objects.filter(
        session__in=sessions, person_type="STUDENT"
    ).select_related("session", "student")
    if department:
        records = records.filter(student__department__iexact=department)

    total = records.count()
    present = records.filter(status="PRESENT").count()
    absent = total - present
    overall_pct = round((present / total) * 100, 1) if total else 0.0

    if period == "monthly":
        trend_qs = (
            records.values("session__date")
            .annotate(present_n=Count("id", filter=Q(status="PRESENT")), total_n=Count("id"))
            .order_by("session__date")
        )
        trend = [
            {
                "label": str(row["session__date"]),
                "present": row["present_n"], "total": row["total_n"],
                "pct": round((row["present_n"] / row["total_n"]) * 100, 1) if row["total_n"] else 0.0,
            }
            for row in trend_qs
        ]
    else:
        trend_qs = (
            records.annotate(month=TruncMonth("session__date"))
            .values("month")
            .annotate(present_n=Count("id", filter=Q(status="PRESENT")), total_n=Count("id"))
            .order_by("month")
        )
        trend = [
            {
                "label": row["month"].strftime("%Y-%m"),
                "present": row["present_n"], "total": row["total_n"],
                "pct": round((row["present_n"] / row["total_n"]) * 100, 1) if row["total_n"] else 0.0,
            }
            for row in trend_qs
        ]

    bus_qs = (
        records.values("session__bus_id", "session__bus__bus_number")
        .annotate(present_n=Count("id", filter=Q(status="PRESENT")), total_n=Count("id"))
        .order_by("session__bus__bus_number")
    )
    by_bus = [
        {
            "bus_id": row["session__bus_id"], "bus_number": row["session__bus__bus_number"],
            "present": row["present_n"], "total": row["total_n"],
            "pct": round((row["present_n"] / row["total_n"]) * 100, 1) if row["total_n"] else 0.0,
        }
        for row in bus_qs
    ]

    absentee_qs = (
        records.filter(status="ABSENT")
        .values("student_id", "student__name", "student__roll_number")
        .annotate(absences=Count("id"))
        .order_by("-absences")[:10]
    )
    top_absentees = [
        {
            "student_id": row["student_id"], "name": row["student__name"],
            "roll_number": row["student__roll_number"], "absences": row["absences"],
        }
        for row in absentee_qs
    ]

    return Response({
        "period": period, "year": year, "month": month,
        "overall_pct": overall_pct, "present_count": present,
        "absent_count": absent, "total_count": total,
        "trend": trend, "by_bus": by_bus, "top_absentees": top_absentees,
    })


# ---------------------------------------------------------------------------
# Analytics: in-charge's own cab only (same shape as the overview above, but
# there's exactly one bus so no by_bus/department breakdown is needed).
# ---------------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([IsInCharge])
def attendance_analytics_incharge(request):
    bus = incharge_bus(request.user)
    if not bus:
        return Response({"detail": "You're not assigned to a bus yet."}, status=400)

    period = (request.query_params.get("period") or "monthly").lower()
    today = date_cls.today()
    year = int_param(request.query_params, "year", today.year)

    sessions = AttendanceSession.objects.filter(date__year=year, is_holiday=False, bus=bus)
    month = None
    if period == "monthly":
        month = int_param(request.query_params, "month", today.month)
        sessions = sessions.filter(date__month=month)

    records = AttendanceRecord.objects.filter(
        session__in=sessions, person_type="STUDENT"
    ).select_related("session", "student")

    total = records.count()
    present = records.filter(status="PRESENT").count()
    absent = total - present
    overall_pct = round((present / total) * 100, 1) if total else 0.0

    if period == "monthly":
        trend_qs = (
            records.values("session__date")
            .annotate(present_n=Count("id", filter=Q(status="PRESENT")), total_n=Count("id"))
            .order_by("session__date")
        )
        trend = [
            {
                "label": str(row["session__date"]),
                "present": row["present_n"], "total": row["total_n"],
                "pct": round((row["present_n"] / row["total_n"]) * 100, 1) if row["total_n"] else 0.0,
            }
            for row in trend_qs
        ]
    else:
        trend_qs = (
            records.annotate(month=TruncMonth("session__date"))
            .values("month")
            .annotate(present_n=Count("id", filter=Q(status="PRESENT")), total_n=Count("id"))
            .order_by("month")
        )
        trend = [
            {
                "label": row["month"].strftime("%Y-%m"),
                "present": row["present_n"], "total": row["total_n"],
                "pct": round((row["present_n"] / row["total_n"]) * 100, 1) if row["total_n"] else 0.0,
            }
            for row in trend_qs
        ]

    absentee_qs = (
        records.filter(status="ABSENT")
        .values("student_id", "student__name", "student__roll_number")
        .annotate(absences=Count("id"))
        .order_by("-absences")[:10]
    )
    top_absentees = [
        {
            "student_id": row["student_id"], "name": row["student__name"],
            "roll_number": row["student__roll_number"], "absences": row["absences"],
        }
        for row in absentee_qs
    ]

    return Response({
        "bus_number": bus.bus_number,
        "period": period, "year": year, "month": month,
        "overall_pct": overall_pct, "present_count": present,
        "absent_count": absent, "total_count": total,
        "trend": trend, "top_absentees": top_absentees,
    })


# ---------------------------------------------------------------------------
# Analytics: per-student attendance (calendar, streak, % this month/year)
# ---------------------------------------------------------------------------
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def attendance_analytics_student(request, student_id):
    try:
        student = Student.objects.get(pk=student_id)
    except Student.DoesNotExist:
        return Response({"detail": "Student not found."}, status=404)

    # Staff/admin may look up any student. A cab in-charge may look up a
    # student on their own cab. A student may only ever look up their own
    # linked record (same scoping as the existing my_attendance view).
    if not CanManageBuses().has_permission(request, None):
        own = getattr(request.user, "student_profile", None)
        own_incharge_bus = incharge_bus(request.user) if is_incharge(request.user) else None
        is_own_cab_student = own_incharge_bus is not None and student.bus_id == own_incharge_bus.id
        if not is_own_cab_student and (not own or own.id != student.id):
            return Response({"detail": "Not allowed."}, status=403)

    today = date_cls.today()
    year = int_param(request.query_params, "year", today.year)
    month = request.query_params.get("month")

    records = AttendanceRecord.objects.filter(
        student=student, session__date__year=year, session__is_holiday=False,
    ).select_related("session").order_by("session__date")
    if month:
        records = records.filter(session__date__month=int_param({"month": month}, "month", 1))

    total = records.count()
    present = records.filter(status="PRESENT").count()
    absent = total - present
    pct = round((present / total) * 100, 1) if total else 0.0

    calendar = [
        {
            "id": r.id, "date": str(r.session.date), "status": r.status,
            "is_correction": r.is_correction, "locked": r.status == "PRESENT",
        }
        for r in records
    ]

    # Group multi-slot records into one status per calendar day before
    # computing the streak: a student absent in both slots on one day is a
    # one-day absence, not two. A day counts PRESENT if present in any slot
    # that day, else ABSENT.
    day_status = {}
    for r in records:
        d = r.session.date
        if day_status.get(d) == "PRESENT":
            continue
        if r.status == "PRESENT":
            day_status[d] = "PRESENT"
        else:
            day_status.setdefault(d, "ABSENT")

    longest_streak = 0
    current_streak = 0
    for d in sorted(day_status):
        if day_status[d] == "ABSENT":
            current_streak += 1
            longest_streak = max(longest_streak, current_streak)
        else:
            current_streak = 0

    return Response({
        "student": {"id": student.id, "name": student.name, "roll_number": student.roll_number},
        "year": year, "month": int(month) if month else None,
        "present_count": present, "absent_count": absent, "total_count": total,
        "attendance_pct": pct, "calendar": calendar,
        "longest_absence_streak": longest_streak,
    })
