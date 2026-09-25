"""
Camera <-> RFID linking.

RFID answers "WHICH bus entered / left". The camera answers "WHERE is every bus".
Nothing physical connects the two, so this module joins them:

  1. Each detection (a point on the ground, in metres) is matched to the nearest
     free parking slot, one detection per slot (match_detections_to_slots).
  2. A track must stay closest to the same slot for VISION_STABLE_FRAMES frames
     before it is treated as parked there (debounce against jitter).
  3. A track learns which bus it is, in this order:
       a. Inherit: it settled in a slot the database already says holds a bus
          (this is what makes a restart of the edge script harmless).
       b. FIFO: the oldest recent RFID ENTRY that no track has claimed yet goes
          to the oldest unidentified track (buses show up on camera in the same
          order they tapped in).
       c. Staff assign it by hand (assign_track).
  4. Identified, settled tracks write their bus into ParkingSlot, then the
     blocked flags are recomputed.

An RFID EXIT (or a fresh ENTRY) calls release_bus(), which frees the slot and
lets the camera forget the old identity.
"""
import math

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta

from buses.models import Bus
from parking.models import ParkingSlot, recompute_blocked_slots
from sensors.models import ParkingEvent, Sensor, SensorAlert

from .models import VisionTrack


def _cfg(name, default):
    return getattr(settings, name, default)


# ---------------------------------------------------------------- matching --

def match_detections_to_slots(detections, slots, max_distance_m):
    """
    Greedy one-to-one matching, closest pair first.

    detections: list of dicts with x_m / y_m
    slots:      iterable of ParkingSlot
    returns:    {detection_index: ParkingSlot}  (unmatched detections are absent)
    """
    pairs = []
    for i, d in enumerate(detections):
        for s in slots:
            dist = math.hypot(d["x_m"] - float(s.x_position_m), d["y_m"] - float(s.y_position_m))
            if dist <= max_distance_m:
                pairs.append((dist, i, s.pk, s))
    pairs.sort(key=lambda p: (p[0], p[1], p[2]))

    used_det, used_slot, result = set(), set(), {}
    for _, i, slot_pk, slot in pairs:
        if i in used_det or slot_pk in used_slot:
            continue
        used_det.add(i)
        used_slot.add(slot_pk)
        result[i] = slot
    return result


def _settle_slot(track, target_slot, stable_frames):
    """Debounce: commit a slot only after `stable_frames` matching frames in a row."""
    new_id = target_slot.pk if target_slot else None

    if new_id == track.slot_id:
        track.candidate_slot_id = None
        track.candidate_count = 0
        return

    if new_id is not None and new_id == track.candidate_slot_id:
        track.candidate_count += 1
    else:
        track.candidate_slot_id = new_id
        track.candidate_count = 1 if new_id is not None else 0

    if new_id is not None and track.candidate_count >= stable_frames:
        track.slot_id = new_id
        track.candidate_slot_id = None
        track.candidate_count = 0


# ---------------------------------------------------------------- identity --

def _linked_bus_ids():
    return set(
        VisionTrack.objects.filter(is_active=True, bus__isnull=False).values_list("bus_id", flat=True)
    )


def _pending_entries(exclude_bus_ids, window_min):
    """Oldest-first list of buses that tapped ENTRY recently and no track has claimed."""
    since = timezone.now() - timedelta(minutes=window_min)
    events = (
        ParkingEvent.objects.filter(event_type="ENTRY", timestamp__gte=since)
        .exclude(bus_id__in=exclude_bus_ids)
        .select_related("bus")
        .order_by("timestamp")
    )
    seen, buses = set(), []
    for ev in events:
        if ev.bus_id not in seen:
            seen.add(ev.bus_id)
            buses.append(ev.bus)
    return buses


def _link_identities(tracks, slots_by_id, sensor):
    linked = _linked_bus_ids()
    link_min = _cfg("VISION_LINK_MIN_FRAMES", 5)
    window = _cfg("VISION_ENTRY_WINDOW_MIN", 15)

    # a) inherit from a slot the database already knows
    for t in tracks:
        if t.bus_id or not t.slot_id:
            continue
        slot = slots_by_id.get(t.slot_id)
        if slot is not None and slot.bus_id and slot.bus_id not in linked:
            t.bus_id = slot.bus_id
            t.bus_confirmed = True
            linked.add(slot.bus_id)

    # b) FIFO against RFID ENTRY events
    waiting = sorted(
        (t for t in tracks if not t.bus_id and t.frames_seen >= link_min),
        key=lambda t: (t.first_seen or timezone.now(), t.track_id),
    )
    if waiting:
        for track, bus in zip(waiting, _pending_entries(linked, window)):
            track.bus_id = bus.pk
            track.bus_confirmed = False  # FIFO guess -- suggestion only until reconfirmed or staff-assigned
            linked.add(bus.pk)
            ParkingEvent.objects.create(
                bus=bus, sensor=sensor, event_type="DETECTED",
                message=f"Camera {track.camera_id} matched track #{track.track_id} to {bus.bus_number} (unconfirmed)",
            )


# --------------------------------------------------------------- occupancy --

def _apply_occupancy(tracks, sensor):
    """Write identified + settled tracks into ParkingSlot and log real moves."""
    desired = {t.slot_id: (t.bus_id, t.bus_confirmed) for t in tracks if t.bus_id and t.slot_id}
    if not desired:
        return 0

    bus_ids = {bus_id for bus_id, _ in desired.values()}
    previous = dict(
        ParkingSlot.objects.filter(bus_id__in=bus_ids).values_list("bus_id", "pk")
    )

    ParkingSlot.objects.filter(Q(bus_id__in=bus_ids) | Q(pk__in=desired.keys())).update(
        bus=None, is_occupied=False, is_blocked=False
    )
    now = timezone.now()
    confirmed_slot_ids = []
    for slot_id, (bus_id, confirmed) in desired.items():
        ParkingSlot.objects.filter(pk=slot_id).update(
            bus_id=bus_id, is_occupied=True, is_unconfirmed=not confirmed,
        )
        if confirmed:
            confirmed_slot_ids.append(slot_id)
    if confirmed_slot_ids:
        SensorAlert.objects.filter(
            parking_slot_id__in=confirmed_slot_ids, alert_type=SensorAlert.SLOT_UNCONFIRMED,
            resolved_at__isnull=True,
        ).update(resolved_at=now)

    moved = 0
    slots = {s.pk: s for s in ParkingSlot.objects.filter(pk__in=desired.keys())}
    buses = {b.pk: b for b in Bus.objects.filter(pk__in=bus_ids)}
    for slot_id, (bus_id, confirmed) in desired.items():
        if previous.get(bus_id) != slot_id:
            moved += 1
            slot = slots[slot_id]
            tag = "" if confirmed else " (unconfirmed)"
            ParkingEvent.objects.create(
                bus=buses[bus_id], sensor=sensor, parking_slot=slot, event_type="PARKED",
                message=f"Camera placed {buses[bus_id].bus_number} at {slot.row}{slot.slot_number}{tag}",
            )
    return moved


def _touch_camera(camera_id, count, now):
    sensor, _ = Sensor.objects.get_or_create(
        sensor_id=camera_id,
        defaults={"sensor_type": "CAMERA", "location": "Bus ground camera"},
    )
    was_offline = not sensor.is_active
    sensor.last_reading = f"{count} bus(es) in view"
    sensor.last_seen = now
    sensor.is_active = True
    sensor.save(update_fields=["last_reading", "last_seen", "is_active"])
    if was_offline:
        SensorAlert.objects.filter(
            sensor=sensor, alert_type=SensorAlert.CAMERA_OFFLINE, resolved_at__isnull=True,
        ).update(resolved_at=now)
    return sensor


# ------------------------------------------------------------- entry point --

@transaction.atomic
def process_frame(camera_id, session, detections):
    """
    Handle one batch of detections from the edge script.
    Returns a small summary dict for the HTTP response.
    """
    now = timezone.now()
    stable = _cfg("VISION_STABLE_FRAMES", 3)
    max_dist = _cfg("VISION_MAX_SLOT_DISTANCE_M", 4.0)

    sensor = _touch_camera(camera_id, len(detections), now)

    # Script restarted -> its old track ids are meaningless now.
    VisionTrack.objects.filter(camera_id=camera_id, is_active=True).exclude(session=session).update(
        is_active=False
    )

    slots = list(ParkingSlot.objects.all())
    slots_by_id = {s.pk: s for s in slots}
    matches = match_detections_to_slots(detections, slots, max_dist)

    tracks = []
    for i, d in enumerate(detections):
        track, _ = VisionTrack.objects.get_or_create(
            camera_id=camera_id, session=session, track_id=d["track_id"],
            defaults={"last_seen": now},
        )
        track.x_m, track.y_m = d["x_m"], d["y_m"]
        track.confidence = d.get("confidence", 1.0)
        track.frames_seen += 1
        track.last_seen = now
        track.is_active = True
        _settle_slot(track, matches.get(i), stable)
        tracks.append(track)

    _link_identities(tracks, slots_by_id, sensor)

    for t in tracks:
        t.save()

    moved = _apply_occupancy(tracks, sensor)

    recompute_blocked_slots()

    return {
        "camera_id": camera_id,
        "tracks": len(tracks),
        "identified": sum(1 for t in tracks if t.bus_id),
        "unidentified": sum(1 for t in tracks if not t.bus_id),
        "slots_changed": moved,
    }


# ---------------------------------------------------------------- releases --

def release_bus(bus):
    """
    A bus left (RFID EXIT) or arrived again (RFID ENTRY): its old camera identity
    and slot are stale. Free the slot and detach the bus from any active track.
    """
    ParkingSlot.objects.filter(bus=bus).update(bus=None, is_occupied=False, is_blocked=False)
    VisionTrack.objects.filter(bus=bus, is_active=True).update(bus=None, slot=None, is_active=False)
    recompute_blocked_slots()


def assign_track(track, bus):
    """Staff override: this track IS this bus. Always fully confirmed."""
    VisionTrack.objects.filter(bus=bus, is_active=True).exclude(pk=track.pk).update(bus=None)
    track.bus = bus
    track.bus_confirmed = True
    track.save(update_fields=["bus", "bus_confirmed"])
    sensor = Sensor.objects.filter(sensor_id=track.camera_id).first()
    with transaction.atomic():
        _apply_occupancy([track], sensor)
        recompute_blocked_slots()
    return track


@transaction.atomic
def sweep_stale(now=None):
    """
    Periodic pass driven by the clock (plan item 4.3), not by whether a frame
    happens to arrive for a given camera. Three jobs:

      1. A track unseen for VISION_TRACK_TIMEOUT_S goes inactive. If it was
         the confirmed occupant of a slot, that slot flips to unconfirmed and
         a SensorAlert is raised (camera lost the bus without an RFID EXIT --
         could be a real, unlogged departure or the camera missing it).
      2. A CAMERA sensor silent for longer than VISION_CAMERA_OFFLINE_S is
         marked inactive and raises one SensorAlert (only on the transition,
         not once per pass).
      3. Old inactive tracks (>1 day) are pruned.
    """
    now = now or timezone.now()
    timeout = _cfg("VISION_TRACK_TIMEOUT_S", 30)
    offline_after = _cfg("VISION_CAMERA_OFFLINE_S", 90)

    stale_qs = VisionTrack.objects.filter(
        is_active=True, last_seen__lt=now - timedelta(seconds=timeout)
    ).select_related("slot", "slot__bus")
    newly_unconfirmed = 0
    for track in stale_qs:
        slot = track.slot
        if slot is not None and slot.bus_id and not slot.is_unconfirmed:
            ParkingSlot.objects.filter(pk=slot.pk).update(is_unconfirmed=True)
            SensorAlert.objects.create(
                parking_slot=slot, alert_type=SensorAlert.SLOT_UNCONFIRMED,
                message=f"Camera lost track of {slot.bus.bus_number} at "
                        f"{slot.row}{slot.slot_number} (track #{track.track_id} timed out).",
            )
            newly_unconfirmed += 1
    went_stale = stale_qs.update(is_active=False)

    offline_cameras = Sensor.objects.filter(
        sensor_type="CAMERA", is_active=True, last_seen__lt=now - timedelta(seconds=offline_after),
    )
    cameras_offline = 0
    for cam in offline_cameras:
        SensorAlert.objects.create(
            sensor=cam, alert_type=SensorAlert.CAMERA_OFFLINE,
            message=f"Camera {cam.sensor_id} has not reported in over {offline_after}s.",
        )
        cameras_offline += 1
    offline_cameras.update(is_active=False)

    pruned, _ = VisionTrack.objects.filter(
        is_active=False, last_seen__lt=now - timedelta(days=1)
    ).delete()

    return {
        "went_stale": went_stale,
        "newly_unconfirmed": newly_unconfirmed,
        "cameras_offline": cameras_offline,
        "pruned": pruned,
    }
