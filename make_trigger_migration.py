import pathlib
content = '''\
from django.db import migrations

TRIGGER_UP = """
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

TRIGGER_DOWN = """
DROP TRIGGER IF EXISTS audit_no_update ON attendance_attendanceaudit;
DROP TRIGGER IF EXISTS audit_no_delete ON attendance_attendanceaudit;
DROP FUNCTION IF EXISTS attendance_audit_immutable();
"""

class Migration(migrations.Migration):
    dependencies = [
        ("attendance", "0009_audit_extra_columns"),
    ]
    operations = [
        migrations.RunSQL(TRIGGER_UP, reverse_sql=TRIGGER_DOWN),
    ]
'''
pathlib.Path('attendance/migrations/0010_audit_immutable_trigger.py').write_text(content, encoding='utf-8')
print('OK')
