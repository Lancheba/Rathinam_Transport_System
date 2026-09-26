import csv
import io
from datetime import datetime

from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils.dateparse import parse_date
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import can_manage_buses
from attendance.permissions import driver_bus, incharge_bus, is_driver, is_incharge
from students.models import Student

from .exports import safe_rows

# Change the columns here (and in _build_rows below) if you want different report fields.
HEADER = [
    "Roll No.", "Name", "Department", "Year", "Bus", "Route",
    "Boarding Point", "Phone", "Sessions", "Present", "Absent", "Attendance %",
]


def _scope(request):
    """Which students this person may export. Returns (queryset, error_response)."""
    user = request.user
    qs = Student.objects.select_related("bus")

    if can_manage_buses(user):  # admin / staff: any bus, any student
        bus_id = request.query_params.get("bus")
        student_id = request.query_params.get("student")
        if bus_id:
            qs = qs.filter(bus_id=bus_id)
        if student_id:
            qs = qs.filter(pk=student_id)
        return qs, None

    if is_incharge(user):  # only their own cab
        bus = incharge_bus(user)
        return (qs.filter(bus=bus) if bus else qs.none()), None

    if is_driver(user):  # read-only, own cab
        bus = driver_bus(user)
        return (qs.filter(bus=bus) if bus else qs.none()), None

    student = getattr(user, "student_profile", None)  # a student: only themselves
    if student:
        return qs.filter(pk=student.pk), None

    return None, Response({"detail": "Not allowed."}, status=403)


def _build_rows(qs, date_from, date_to):
    rec = Q(attendance_records__session__is_holiday=False)
    if date_from:
        rec &= Q(attendance_records__session__date__gte=date_from)
    if date_to:
        rec &= Q(attendance_records__session__date__lte=date_to)

    qs = qs.annotate(
        present=Count("attendance_records", filter=rec & Q(attendance_records__status="PRESENT")),
        absent=Count("attendance_records", filter=rec & Q(attendance_records__status="ABSENT")),
    ).order_by("roll_number")

    rows = [HEADER]
    for s in qs:
        total = s.present + s.absent
        pct = f"{(s.present / total * 100):.1f}%" if total else "-"
        rows.append([
            s.roll_number, s.name, s.department or "-",
            s.get_year_display() if s.year else "-",
            s.bus.bus_number if s.bus else "-",
            s.bus.route if s.bus else "-",
            s.boarding_point or "-", s.phone or "-",
            total, s.present, s.absent, pct,
        ])
    return rows


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def attendance_report(request):
    """
    GET /api/attendance/report/?filetype=csv|pdf&bus=<id>&student=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD
    (bus/student are only honoured for admin/staff; everyone else is auto-scoped.)
    """
    qs, error = _scope(request)
    if error:
        return error

    date_from = parse_date(request.query_params.get("from", "") or "")
    date_to = parse_date(request.query_params.get("to", "") or "")
    rows = _build_rows(qs, date_from, date_to)
    fmt = (request.query_params.get("filetype") or "csv").lower()
    name = f"attendance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    if fmt == "pdf":
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4, landscape
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
        except ImportError:
            return Response({"detail": "PDF export needs the 'reportlab' package on the server."}, status=501)

        styles = getSampleStyleSheet()
        span = f"{date_from or 'start'} to {date_to or 'today'}"
        story = [
            Paragraph("Rathinam Transport - Attendance & Student Report", styles["Title"]),
            Paragraph(f"Period: {span} &nbsp;|&nbsp; Students: {len(rows) - 1} &nbsp;|&nbsp; "
                      f"Generated: {datetime.now():%d %b %Y %H:%M}", styles["Normal"]),
            Spacer(1, 12),
        ]
        table = Table(rows, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f4f6")]),
        ]))
        story.append(table)
        buf = io.BytesIO()
        SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=20, rightMargin=20).build(story)
        resp = HttpResponse(buf.getvalue(), content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="{name}.pdf"'
        return resp

    if fmt == "json":
        # Preview data for the frontend report page - not a download.
        header, *body_rows = rows
        return Response({
            "columns": header,
            "rows": body_rows,
            "count": len(body_rows),
        })

    if fmt == "xlsx":
        try:
            from openpyxl import Workbook
        except ImportError:
            return Response({"detail": "Excel export needs the \'openpyxl\' package on the server."}, status=501)
        wb = Workbook()
        ws = wb.active
        ws.title = "Attendance Report"
        for row in safe_rows(rows):
            ws.append(row)
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        resp = HttpResponse(
            buf.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        resp["Content-Disposition"] = f'attachment; filename="{name}.xlsx"'
        return resp

    buf = io.StringIO()
    csv.writer(buf).writerows(safe_rows(rows))  # neutralise spreadsheet formulas
    resp = HttpResponse("\ufeff" + buf.getvalue(), content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="{name}.csv"'
    return resp