from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="FaceProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("embedding", models.JSONField()),
                ("embedding_model", models.CharField(default="face-api-128d", max_length=50)),
                ("consent_given", models.BooleanField(default=False)),
                ("consent_at", models.DateTimeField(blank=True, null=True)),
                ("enrolled_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("student", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="face_profile",
                    to="students.student",
                )),
            ],
        ),
    ]
