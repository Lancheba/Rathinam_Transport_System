from django.db import models

from buses.models import Bus
from parking.models import ParkingSlot


class VisionTrack(models.Model):
    """
    One vehicle followed by the camera.

    The edge script (edge/vision_tracker.py) runs YOLO + a tracker, so every bus
    it sees keeps the same `track_id` from frame to frame. The camera knows WHERE
    a bus is but not WHICH bus it is; `bus` is filled in by vision/linking.py,
    using the RFID gate events (or by staff, through the assign endpoint).
    """

    camera_id = models.CharField(max_length=50)
    # Tracker ids restart from 1 every time the edge script restarts, so ids are
    # only unique inside one run ("session") of the script.
    session = models.CharField(max_length=40, default="default")
    track_id = models.PositiveIntegerField()

    bus = models.ForeignKey(
        Bus, null=True, blank=True, on_delete=models.SET_NULL, related_name="vision_tracks"
    )

    # Slot this track has settled in (after VISION_STABLE_FRAMES matching frames).
    slot = models.ForeignKey(
        ParkingSlot, null=True, blank=True, on_delete=models.SET_NULL, related_name="vision_tracks"
    )
    # Slot it currently looks closest to, and for how many frames in a row.
    # Used so a bus jittering between two neighbouring slots does not flip-flop.
    candidate_slot = models.ForeignKey(
        ParkingSlot, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    candidate_count = models.PositiveSmallIntegerField(default=0)

    x_m = models.FloatField(default=0)
    y_m = models.FloatField(default=0)
    confidence = models.FloatField(default=0)
    frames_seen = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)
    first_seen = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField()

    class Meta:
        unique_together = [("camera_id", "session", "track_id")]
        ordering = ["-last_seen"]

    def __str__(self):
        who = self.bus.bus_number if self.bus_id else "unidentified"
        return f"{self.camera_id}#{self.track_id} ({who})"
