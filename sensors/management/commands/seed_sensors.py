import random
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from parking.models import ParkingSlot
from sensors.models import ParkingEvent, Sensor
from vision.models import VisionTrack

SEED_SESSION = "SEED"
GATE_SENSORS = [
    ("RFID-GATE-IN", "RFID", "Entrance gate"),
    ("RFID-GATE-OUT", "RFID", "Exit gate"),
]


def _ultrasonic_id(slot):
    return f"US-{slot.row}{slot.slot_number}"


class Command(BaseCommand):
    help = (
        "Seed demo sensors and a demo camera so the Sensors page has something to show: "
        "two RFID gate readers, one ultrasonic sensor per parking slot, and --cameras "
        "camera(s). Sensors get a realistic last reading / last seen time. Any bus that "
        "already sits in a slot also gets a camera track in that slot. Needs the ground "
        "and slots to exist first (create_slots). Safe to re-run; use --clear to remove "
        "what this command created."
    )

    def add_arguments(self, parser):
        parser.add_argument("--cameras", type=int, default=1,
                            help="How many demo cameras to create (default: 1).")
        parser.add_argument("--offline", type=int, default=0,
                            help="Mark this many random sensors OFFLINE (default: 0).")
        parser.add_argument("--clear", action="store_true",
                            help="Delete the seeded sensors, camera tracks and their events, then stop.")

    @transaction.atomic
    def handle(self, *args, **options):
        cameras = options["cameras"]
        offline = options["offline"]
        if cameras < 0:
            raise CommandError("--cameras cannot be negative.")
        if offline < 0:
            raise CommandError("--offline cannot be negative.")

        slots = list(ParkingSlot.objects.select_related("bus").order_by("row", "slot_number"))
        camera_ids = [f"CAM-{i}" for i in range(1, cameras + 1)]

        if options["clear"]:
            self._clear(slots)
            return

        if not slots:
            raise CommandError(
                "No parking slots exist yet. Run create_slots first, then re-run this command."
            )

        now = timezone.now()
        seeded = []

        for sensor_id, kind, location in GATE_SENSORS:
            last = ParkingEvent.objects.filter(sensor__sensor_id=sensor_id).order_by("-timestamp").first()
            reading = last.bus.rfid_uid if last else None
            seen = last.timestamp if last else None
            seeded.append(self._upsert(sensor_id, kind, location, reading, seen))

        for slot in slots:
            seeded.append(self._upsert(
                _ultrasonic_id(slot), "ULTRASONIC",
                f"Row {slot.row}, Slot {slot.slot_number}",
                "occupied" if slot.is_occupied else "free",
                now - timedelta(seconds=random.randint(2, 45)),
            ))

        for cam_id in camera_ids:
            seeded.append(self._upsert(
                cam_id, "CAMERA", "Overlooking the bus ground",
                "tracking", now - timedelta(seconds=random.randint(1, 5)),
            ))

        if offline:
            for sensor in random.sample(seeded, min(offline, len(seeded))):
                sensor.is_active = False
                sensor.save(update_fields=["is_active"])

        tracks = 0
        if camera_ids:
            tracks = self._seed_tracks(camera_ids[0], slots, now)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(seeded)} sensor(s) ({len(slots)} ultrasonic, {len(GATE_SENSORS)} RFID, "
            f"{cameras} camera) and {tracks} camera track(s)."
        ))
        if camera_ids and tracks == 0:
            self.stdout.write(
                "No bus is parked in any slot yet, so no camera tracks were created."
            )

    def _upsert(self, sensor_id, kind, location, reading, seen):
        sensor, _ = Sensor.objects.update_or_create(
            sensor_id=sensor_id,
            defaults={
                "sensor_type": kind,
                "location": location,
                "is_active": True,
                "last_reading": reading,
                "last_seen": seen,
            },
        )
        return sensor

    def _seed_tracks(self, camera_id, slots, now):
        count = 0
        track_id = 0
        for slot in slots:
            if not slot.is_occupied or slot.bus_id is None:
                continue
            track_id += 1
            VisionTrack.objects.update_or_create(
                camera_id=camera_id, session=SEED_SESSION, track_id=track_id,
                defaults={
                    "bus": slot.bus,
                    "slot": slot,
                    "x_m": float(slot.x_position_m) + random.uniform(-0.3, 0.3),
                    "y_m": float(slot.y_position_m) + random.uniform(-0.3, 0.3),
                    "confidence": round(random.uniform(0.82, 0.97), 2),
                    "frames_seen": random.randint(40, 400),
                    "is_active": True,
                    "last_seen": now,
                },
            )
            count += 1
        return count

    def _clear(self, slots):
        ids = [s[0] for s in GATE_SENSORS] + [_ultrasonic_id(s) for s in slots]
        sensors = Sensor.objects.filter(sensor_id__in=ids) | Sensor.objects.filter(
            sensor_type="CAMERA", sensor_id__startswith="CAM-"
        )
        n = sensors.count()
        sensors.delete()
        t, _ = VisionTrack.objects.filter(session=SEED_SESSION).delete()
        self.stdout.write(self.style.SUCCESS(f"Removed {n} seeded sensor(s) and {t} camera track(s)."))
