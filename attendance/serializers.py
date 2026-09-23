from rest_framework import serializers

from .models import AttendanceRecord, AttendanceSession, Teacher


class TeacherSerializer(serializers.ModelSerializer):
    bus_number = serializers.CharField(source="bus.bus_number", read_only=True, allow_null=True)

    class Meta:
        model = Teacher
        fields = [
            "id", "name", "staff_id", "department", "phone", "email",
            "boarding_point", "bus", "bus_number",
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
    id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=["PRESENT", "ABSENT"])
    remarks = serializers.CharField(required=False, allow_blank=True, default="")


class AttendanceSubmitSerializer(serializers.Serializer):
    date = serializers.DateField()
    slot = serializers.ChoiceField(choices=["MORNING", "EVENING"], required=False, default="MORNING")
    is_holiday = serializers.BooleanField(required=False, default=False)
    holiday_reason = serializers.CharField(required=False, allow_blank=True, default="")
    records = AttendanceRecordInputSerializer(many=True, required=False, default=list)

    def validate(self, data):
        if not data.get("is_holiday") and not data.get("records"):
            raise serializers.ValidationError("Mark at least one person present/absent, or mark the day a holiday.")
        return data
