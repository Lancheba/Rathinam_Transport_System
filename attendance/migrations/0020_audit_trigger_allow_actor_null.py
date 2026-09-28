from django.db import migrations
from django.db.models import F

# Same as 0010, except an UPDATE is now allowed when the ONLY change is
# actor_id going from a value to NULL (what Django's SET_NULL does when a user
# is deleted). Any other UPDATE, and every DELETE, is still refused.
TRIGGER_UP = """
CREATE OR REPLACE FUNCTION attendance_audit_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE'
       AND OLD.actor_id IS NOT NULL
       AND NEW.actor_id IS NULL
       AND (to_jsonb(NEW) - 'actor_id') = (to_jsonb(OLD) - 'actor_id') THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION
        'attendance_attendanceaudit rows are immutable (action=%, id=%)',
        TG_OP, OLD.id;
END;
$$;

CREATE TRIGGER audit_no_update
BEFORE UPDATE ON attendance_attendanceaudit
FOR EACH ROW EXECUTE FUNCTION attendance_audit_immutable();

CREATE TRIGGER audit_no_delete
BEFORE DELETE ON attendance_attendanceaudit
FOR EACH ROW EXECUTE FUNCTION attendance_audit_immutable();
"""

DROP = """
DROP TRIGGER IF EXISTS audit_no_update ON attendance_attendanceaudit;
DROP TRIGGER IF EXISTS audit_no_delete ON attendance_attendanceaudit;
"""

OLD_FUNCTION = """
CREATE OR REPLACE FUNCTION attendance_audit_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION
        'attendance_attendanceaudit rows are immutable (action=%, id=%)',
        TG_OP, OLD.id;
END;
$$;
CREATE TRIGGER audit_no_update
BEFORE UPDATE ON attendance_attendanceaudit
FOR EACH ROW EXECUTE FUNCTION attendance_audit_immutable();
CREATE TRIGGER audit_no_delete
BEFORE DELETE ON attendance_attendanceaudit
FOR EACH ROW EXECUTE FUNCTION attendance_audit_immutable();
"""


def forwards(apps, schema_editor):
    pg = schema_editor.connection.vendor == "postgresql"
    if pg:
        schema_editor.execute(DROP, params=None)
    # Backfill actor_ref so existing hashes stay verifiable after a user is deleted.
    Audit = apps.get_model("attendance", "AttendanceAudit")
    Audit.objects.filter(actor_ref__isnull=True, actor__isnull=False).update(actor_ref=F("actor_id"))
    if pg:
        schema_editor.execute(TRIGGER_UP, params=None)


def backwards(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute(DROP, params=None)
        schema_editor.execute(OLD_FUNCTION, params=None)


class Migration(migrations.Migration):
    dependencies = [
        ("attendance", "0019_attendanceaudit_actor_ref"),
    ]
    operations = [
        migrations.RunPython(forwards, backwards),
    ]
