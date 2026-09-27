# Generated manually: add TEACHER to UserProfile.role choices.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_device'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='role',
            field=models.CharField(
                choices=[
                    ('ADMIN', 'Admin'),
                    ('STAFF', 'Transport Staff'),
                    ('DRIVER', 'Driver'),
                    ('STUDENT', 'Student'),
                    ('TEACHER', 'Teacher'),
                    ('INCHARGE', 'Cab In-Charge'),
                ],
                default='STUDENT',
                max_length=20,
            ),
        ),
    ]
