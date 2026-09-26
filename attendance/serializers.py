from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from accounts.permissions import is_admin

from .models import AttendanceRecord, AttendanceSession, AttendanceWindowConfig, Teacher


class AttendanceWindowConfigSerializer(serializers.ModelSerializer):
    updated_by_username = serializers.CharField(source="updated_by.username", read_only=True, allow_null=True)

    class Meta:
        model = AttendanceWindowConfig
        fields = [
            "morning_start", "morning_end",
            "evening_start", "evening_end",
            "updated_by_username", "updated_at",
        ]

    def validate(self, data):
        morning_start = data.get("morning_start", getattr(self.instance, "morning_start", None))
        morning_end = data.get("morning_end", getattr(self.instance, "morning_end", None))
        evening_start = data.get("evening_start", getattr(self.instance, "evening_start", None))
        evening_end = data.get("evening_end", getattr(self.instance, "evening_end", None))

        if morning_start >= morning_end:
            raise serializers.ValidationError({"morning_end": "Morning end time must be after morning start time."})
        if evening_start >= evening_end:
            raise serializers.ValidationError({"evening_end": "Evening end time must be after evening start time."})
        if morning_end > evening_start:
            raise serializers.ValidationError({"evening_start": "Evening start time must be after morning end time."})
        return data


class TeacherSerializer(serializers.ModelSerializer):
    bus_number = serializers.CharField(source="bus.bus_number", read_only=True, allow_null=True)
    has_login = serializers.SerializerMethodField()
    username = serializers.CharField(source="linked_user.username", read_only=True, allow_null=True)
    login_username = serializers.CharField(write_only=True, required=False, allow_blank=True)
    login_password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Teacher
        fields = [
            "id", "name", "staff_id", "department", "phone", "email",
            "boarding_point", "bus", "bus_number",
            "has_login", "username", "login_username", "login_password",
            "created_at", "updated_at",
        ]
        extra_kwargs = {"staff_id": {"validators": []}}

    def validate_staff_id(self, value):
        value = value.strip().upper()
        if not value:
            raise serializers.ValidationError("Enter a staff ID.")
        clash = Teacher.objects.filter(staff_id__iexact=value)
        if self.instance:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError("A teacher with this staff ID already exists.")
        return value

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Enter the teacher's name.")
        return value


    def get_has_login(self, obj):
        return obj.linked_user_id is not None

    def create(self, validated_data):
        login_username = (validated_data.pop("login_username", "") or "").strip()
        login_password = validated_data.pop("login_password", "") or ""
        teacher = super().create(validated_data)
        if login_username or login_password:
            from accounts.linking import create_teacher_login, LinkError
            from django.core.exceptions import ValidationError as DjangoValidationError
            try:
                create_teacher_login(teacher, login_username, login_password)
            except LinkError as exc:
                raise serializers.ValidationError({"login_username": str(exc)})
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"login_password": exc.messages})
        return teacher


class AttendanceRecordSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    identifier = serializers.SerializerMethodField()
    locked = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = [
            "id", "person_type", "student", "teacher", "status", "remarks",
            "source", "marked_at", "face_match_score",
            "locked", "is_correction", "corrected_at",
            "name", "identifier",
        ]

    def get_name(self, obj):
        who = obj.student or obj.teacher
        return who.name if who else None

    def get_identifier(self, obj):
        if obj.student_id:
            return obj.student.roll_number
        if obj.teacher_id:
            return obj.teacher.staff_id
        return None

    def get_locked(self, obj):
        return obj.status == "PRESENT"


class AttendanceSessionSerializer(serializers.ModelSerializer):
    bus_number = serializers.CharField(source="bus.bus_number", read_only=True)
    marked_by_username = serializers.CharField(source="marked_by.username", read_only=True, allow_null=True)
    records = AttendanceRecordSerializer(many=True, read_only=True)
    present_count = serializers.SerializerMethodField()
    absent_count = serializers.SerializerMethodField()
    total_count = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = [
            "id", "bus", "bus_number", "date", "slot", "is_holiday", "holiday_reason",
            "marked_by_username", "records",
            "present_count", "absent_count", "total_count",
            "created_at", "updated_at",
        ]

    def get_present_count(self, obj):
        return sum(1 for r in obj.records.all() if r.status == "PRESENT")

    def get_absent_count(self, obj):
        return sum(1 for r in obj.records.all() if r.status == "ABSENT")

    def get_total_count(self, obj):
        return len(obj.records.all())


class AttendanceRecordInputSerializer(serializers.Serializer):
    person_type = serializers.ChoiceField(choices=["STUDENT", "TEACHER"])
    id = serializers.IntegerField(min_value=1, max_value=2147483647)
    status = serializers.ChoiceField(choices=["PRESENT", "ABSENT"])
    remarks = serializers.CharField(required=False, allow_blank=True, default="", max_length=200)


class AttendanceSubmitSerializer(serializers.Serializer):
    date = serializers.DateField()
    slot = serializers.ChoiceField(choices=["MORNING", "EVENING"], required=False, default="MORNING")
    is_holiday = serializers.BooleanField(required=False, default=False)
    holiday_reason = serializers.CharField(required=False, allow_blank=True, default="", max_length=200)
    records = AttendanceRecordInputSerializer(many=True, required=False, default=list)

    def validate_date(self, value):
        today = timezone.localdate()
        if value > today:
            raise serializers.ValidationError("Date cannot be in the future.")
        limit = getattr(settings, "ATTENDANCE_BACKFILL_DAYS", 30)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if (today - value).days > limit and not is_admin(user):
            raise serializers.ValidationError(
                f"Date is older than the {limit}-day back-fill limit. Ask an admin to make this change."
            )
        return value

    def validate(self, data):
        if not data.get("is_holiday") and not data.get("records"):
            raise serializers.ValidationError("Mark at least one person present/absent, or mark the day a holiday.")
        return data


class AttendanceFlagSerializer(serializers.ModelSerializer):
    reviewed_by_username = serializers.CharField(
        source="reviewed_by.username", read_only=True, default=None
    )
    session_date = serializers.CharField(source="session.date", read_only=True, default=None)
    record_ids = serializers.PrimaryKeyRelatedField(
        source="records", many=True, read_only=True
    )

    class Meta:
        from attendance.models import AttendanceFlag
        model = AttendanceFlag
        fields = [
            "id", "session", "session_date", "rule", "severity", "detail",
            "status", "record_ids", "reviewed_by", "reviewed_by_username",
            "reviewed_at", "review_note", "created_at",
        ]
        read_only_fields = [
            "id", "session", "session_date", "rule", "severity", "detail",
            "record_ids", "reviewed_by", "reviewed_by_username",
            "reviewed_at", "created_at",
        ]
