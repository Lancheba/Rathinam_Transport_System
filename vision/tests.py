from datetime import time
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APITestCase

from buses.models import Bus
from parking.models import ParkingGround, ParkingSlot
from sensors.models import ParkingEvent, Sensor

from .linking import match_detections_to_slots
from .models import VisionTrack

KEY = "test-key"


def make_ground():
    ground = ParkingGround.objects.create(
        name="Test ground", length_m=50, width_m=20,
        entrance_width_m=6, exit_width_m=6, total_slots=8,
    )
    slots = {}
    for row, y in (("A", 5), ("B", 15)):
        for n in range(1, 5):
            slots[f"{row}{n}"] = ParkingSlot.objects.create(
                ground=ground, row=row, slot_number=n,
                x_position_m=Decimal(10 * n), y_position_m=Decimal(y),
            )
    return slots


def make_bus(number, uid):
    return Bus.objects.create(
        bus_number=number, rfid_uid=uid, route="R", departure_time=time(16, 0),
        length_m=Decimal("10.5"), width_m=Decimal("2.5"),
    )


class MatchingTests(TestCase):
    def test_each_slot_used_once(self):
        slots = make_ground()
        # Both detections are closest to A1; the second must not steal it.
        dets = [{"x_m": 10.0, "y_m": 5.0}, {"x_m": 11.0, "y_m": 5.0}]
        result = match_detections_to_slots(dets, list(slots.values()), 4.0)
        matched = {i: s.pk for i, s in result.items()}
        self.assertEqual(matched[0], slots["A1"].pk)
        self.assertNotIn(slots["A1"].pk, [v for k, v in matched.items() if k != 0])

    def test_far_detection_is_ignored(self):
        slots = make_ground()
        result = match_detections_to_slots([{"x_m": 200.0, "y_m": 200.0}], list(slots.values()), 4.0)
        self.assertEqual(result, {})


@override_settings(
    DEVICE_API_KEY=KEY, VISION_STABLE_FRAMES=3, VISION_LINK_MIN_FRAMES=5,
    VISION_MAX_SLOT_DISTANCE_M=4.0, VISION_ENTRY_WINDOW_MIN=15, VISION_TRACK_TIMEOUT_S=30,
)
class VisionFlowTests(APITestCase):
    def setUp(self):
        self.slots = make_ground()
        self.b1 = make_bus("B01", "AAAA0001")
        self.b2 = make_bus("B02", "BBBB0002")

    # helpers -------------------------------------------------------------
    def rfid(self, uid, event_type="ENTRY"):
        return self.client.post(
            "/api/sensors/rfid/",
            {"rfid_uid": uid, "sensor_id": "RFID-GATE", "event_type": event_type},
            format="json", HTTP_X_DEVICE_KEY=KEY,
        )

    def frame(self, detections, session="s1"):
        return self.client.post(
            "/api/vision/positions/",
            {"camera_id": "CAM-1", "session": session, "detections": detections},
            format="json", HTTP_X_DEVICE_KEY=KEY,
        )

    def det(self, track_id, slot_name, dx=0.0, dy=0.0):
        s = self.slots[slot_name]
        return {"track_id": track_id, "x_m": float(s.x_position_m) + dx,
                "y_m": float(s.y_position_m) + dy, "confidence": 0.9}

    def frames(self, detections, n, session="s1"):
        resp = None
        for _ in range(n):
            resp = self.frame(detections, session)
            self.assertEqual(resp.status_code, 200, resp.content)
        return resp

    # security ------------------------------------------------------------
    def test_device_endpoints_need_the_key(self):
        body = {"camera_id": "CAM-1", "detections": []}
        self.assertIn(self.client.post("/api/vision/positions/", body, format="json").status_code, (401, 403))
        self.assertIn(
            self.client.post("/api/sensors/rfid/", {"rfid_uid": "AAAA0001"}, format="json").status_code, (401, 403)
        )
        self.assertIn(
            self.client.post("/api/sensors/occupancy/", {"sensor_id": "X", "is_occupied": True}, format="json").status_code,
            (401, 403),
        )
        bad = self.client.post("/api/vision/positions/", body, format="json", HTTP_X_DEVICE_KEY="wrong")
        self.assertIn(bad.status_code, (401, 403))

    def test_device_routes_are_not_shadowed_by_the_sensor_router(self):
        from django.urls import resolve
        self.assertEqual(resolve("/api/sensors/rfid/").view_name, "rfid-event")
        self.assertEqual(resolve("/api/sensors/occupancy/").view_name, "occupancy-event")

    def test_duplicate_track_ids_rejected(self):
        d = self.det(1, "A1")
        self.assertEqual(self.frame([d, d]).status_code, 400)

    # the main story ------------------------------------------------------
    def test_entry_then_camera_places_the_bus(self):
        self.assertEqual(self.rfid("AAAA0001", "ENTRY").status_code, 200)
        resp = self.frames([self.det(1, "A2", dx=0.8)], 6)
        self.assertEqual(resp.data["identified"], 1)

        slot = ParkingSlot.objects.get(pk=self.slots["A2"].pk)
        self.assertEqual(slot.bus_id, self.b1.pk)
        self.assertTrue(slot.is_occupied)
        self.assertTrue(ParkingEvent.objects.filter(bus=self.b1, event_type="PARKED", parking_slot=slot).exists())
        self.assertEqual(Sensor.objects.get(sensor_id="CAM-1").sensor_type, "CAMERA")

    def test_without_an_entry_the_track_stays_unidentified(self):
        resp = self.frames([self.det(1, "A2")], 8)
        self.assertEqual(resp.data["unidentified"], 1)
        self.assertFalse(ParkingSlot.objects.filter(is_occupied=True).exists())

    def test_first_in_first_matched(self):
        self.rfid("AAAA0001", "ENTRY")
        self.rfid("BBBB0002", "ENTRY")
        dets = [self.det(1, "A1"), self.det(2, "B3")]
        self.frames(dets, 6)
        self.assertEqual(VisionTrack.objects.get(track_id=1).bus_id, self.b1.pk)
        self.assertEqual(VisionTrack.objects.get(track_id=2).bus_id, self.b2.pk)
        self.assertEqual(ParkingSlot.objects.get(pk=self.slots["B3"].pk).bus_id, self.b2.pk)

    def test_jitter_between_slots_does_not_place_the_bus(self):
        self.rfid("AAAA0001", "ENTRY")
        for i in range(8):
            # 2 m apart -> nearest slot flips every frame
            self.frame([{"track_id": 1, "x_m": 15.0 + (1.0 if i % 2 == 0 else -1.0), "y_m": 5.0}])
        self.assertFalse(ParkingSlot.objects.filter(is_occupied=True).exists())

    def test_blocked_flag_follows_the_camera(self):
        self.rfid("AAAA0001", "ENTRY")
        self.rfid("BBBB0002", "ENTRY")
        self.frames([self.det(1, "A2"), self.det(2, "A1")], 6)  # B01 in A2, B02 in A1 (nearer the exit)
        a1 = ParkingSlot.objects.get(pk=self.slots["A1"].pk)
        a2 = ParkingSlot.objects.get(pk=self.slots["A2"].pk)
        self.assertFalse(a1.is_blocked)
        self.assertTrue(a2.is_blocked)

    def test_edge_script_restart_keeps_identity(self):
        self.rfid("AAAA0001", "ENTRY")
        self.frames([self.det(1, "A3")], 6, session="run-1")
        slot = ParkingSlot.objects.get(pk=self.slots["A3"].pk)
        self.assertEqual(slot.bus_id, self.b1.pk)

        # Script restarts: tracker ids start again from 1, new session, no ENTRY pending.
        self.frames([self.det(1, "A3")], 4, session="run-2")
        self.assertEqual(VisionTrack.objects.filter(session="run-1", is_active=True).count(), 0)
        new = VisionTrack.objects.get(session="run-2", track_id=1)
        self.assertEqual(new.bus_id, self.b1.pk)
        self.assertEqual(ParkingSlot.objects.get(pk=self.slots["A3"].pk).bus_id, self.b1.pk)

    def test_exit_frees_slot_and_track(self):
        self.rfid("AAAA0001", "ENTRY")
        self.frames([self.det(1, "A2")], 6)
        self.assertEqual(self.rfid("AAAA0001", "EXIT").status_code, 200)

        slot = ParkingSlot.objects.get(pk=self.slots["A2"].pk)
        self.assertIsNone(slot.bus_id)
        self.assertFalse(slot.is_occupied)
        self.assertFalse(VisionTrack.objects.filter(bus=self.b1, is_active=True).exists())

    def test_staff_can_assign_an_unidentified_track(self):
        self.frames([self.det(1, "B2")], 6)
        track = VisionTrack.objects.get(track_id=1)
        self.assertIsNone(track.bus_id)

        url = f"/api/vision/tracks/{track.pk}/assign/"
        self.assertIn(self.client.post(url, {"bus_id": self.b1.pk}, format="json").status_code, (401, 403))

        staff = User.objects.create_user("staff", password="x", is_staff=True)
        self.client.force_authenticate(staff)
        resp = self.client.post(url, {"bus_id": self.b1.pk}, format="json")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(ParkingSlot.objects.get(pk=self.slots["B2"].pk).bus_id, self.b1.pk)

    def test_track_list_is_public(self):
        self.frames([self.det(1, "A1")], 2)
        resp = self.client.get("/api/vision/tracks/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["camera_id"], "CAM-1")
