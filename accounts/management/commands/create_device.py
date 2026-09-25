from django.core.management.base import BaseCommand, CommandError

from accounts.models import Device


class Command(BaseCommand):
    help = (
        "Register a new hardware device (RFID reader, ultrasonic node, camera "
        "script) and print its one-time key. The plaintext key is never shown "
        "again -- copy it into the device's config immediately."
    )

    def add_arguments(self, parser):
        parser.add_argument("--name", required=True, help="Human-readable name, e.g. 'RFID reader - Gate 1'")

    def handle(self, *args, **options):
        name = options["name"].strip()
        if not name:
            raise CommandError("--name must not be empty.")
        device, plaintext_key = Device.generate(name)
        self.stdout.write(self.style.SUCCESS(f"Created device '{device.name}' (id={device.pk})."))
        self.stdout.write("")
        self.stdout.write("Device key (copy this into the device now -- it will not be shown again):")
        self.stdout.write(self.style.WARNING(plaintext_key))
        self.stdout.write("")
        self.stdout.write("Send it in the X-Device-Key header on every request from this device.")
