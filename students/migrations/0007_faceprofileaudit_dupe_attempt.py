"""
Migration: add DUPE_ATTEMPT action to FaceProfileAudit.

Changes:
  - action max_length: 12 → 16  (to fit "DUPE_ATTEMPT")
  - No data migration needed; existing rows are unaffected.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0006_faceprofileaudit"),
    ]

    operations = [
        migrations.AlterField(
            model_name="faceprofileaudit",
            name="action",
            field=models.CharField(
                max_length=16,
                choices=[
                    ("ENROLL", "Enrolled"),
                    ("REENROLL", "Re-enrolled"),
                    ("DELETE", "Deleted"),
                    ("ADMIN_READ", "Admin viewed"),
                    ("DUPE_ATTEMPT", "Duplicate face attempt"),
                ],
            ),
        ),
    ]
