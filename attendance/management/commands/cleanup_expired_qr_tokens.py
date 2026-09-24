from django.core.management.base import BaseCommand
from django.utils import timezone

from attendance.models import AttendanceQRToken


class Command(BaseCommand):
    help = "Delete expired attendance QR tokens (item 2.8)."

    def handle(self, *args, **options):
        deleted, _ = AttendanceQRToken.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} expired QR token(s)."))
