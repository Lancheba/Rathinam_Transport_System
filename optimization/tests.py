from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from buses.models import Bus
from parking.models import ParkingGround, ParkingSlot
from sensors.models import ParkingEvent
from .engine import run_optimization, apply_optimization, StaleOptimization
from .models import OptimizationResult


def make_ground():
    return ParkingGround.objects.create(
        name="Main Ground", length_m=50, width_m=30,
        entrance_width_m=4, exit_width_m=4,
    )


def make_slot(ground, row, number, slot_type, x, y=0):
    return ParkingSlot.objects.create(
        ground=ground, row=row, slot_number=number, slot_type=slot_type,
        x_position_m=x, y_position_m=y,
    )


def make_bus(number, departure_time, rfid):
    return Bus.objects.create(
        bus_number=number, rfid_uid=rfid, route="Campus loop",
        departure_time=departure_time, length_m=10, width_m=2.5,
    )


class OptimizerScenario(TestCase):
    """
    One shared row: A1 RESERVED, A5 CAR_BIKE (neither is ever a candidate),
    A2/A3/A4 BUS-type at x=0/10/20 so distances are round numbers.
    Three buses start parked out of departure order (X@A2 10:00, Y@A3 08:00,
    Z@A4 09:00), so the optimal recommendation is Y->A2, Z->A3, X->A4 --
    every bus moves, which exercises the full move-plan/cost path.
    """

    def setUp(self):
        self.ground = make_ground()
        self.a1_reserved = make_slot(self.ground, "A", 1, ParkingSlot.SLOT_TYPE_RESERVED, x=-10)
        self.a2 = make_slot(self.ground, "A", 2, ParkingSlot.SLOT_TYPE_BUS, x=0)
        self.a3 = make_slot(self.ground, "A", 3, ParkingSlot.SLOT_TYPE_BUS, x=10)
        self.a4 = make_slot(self.ground, "A", 4, ParkingSlot.SLOT_TYPE_BUS, x=20)
        self.a5_carbike = make_slot(self.ground, "A", 5, ParkingSlot.SLOT_TYPE_CAR_BIKE, x=30)

        self.bus_x = make_bus("X-10AM", "10:00", "RFID-X")
        self.bus_y = make_bus("Y-08AM", "08:00", "RFID-Y")
        self.bus_z = make_bus("Z-09AM", "09:00", "RFID-Z")

        for slot, bus in [(self.a2, self.bus_x), (self.a3, self.bus_y), (self.a4, self.bus_z)]:
            slot.bus = bus
            slot.is_occupied = True
            slot.save(update_fields=["bus", "is_occupied"])


class RunOptimizationTests(OptimizerScenario):
    def test_reserved_and_carbike_slots_are_never_recommended(self):
        result = run_optimization()
        recommended_slot_ids = {item["slot_id"] for item in result["recommended"]}
        self.assertNotIn(self.a1_reserved.pk, recommended_slot_ids)
        self.assertNotIn(self.a5_carbike.pk, recommended_slot_ids)
        self.assertEqual(len(result["recommended"]), 3)

    def test_earliest_departure_goes_to_gate_slot(self):
        result = run_optimization()
        by_slot = {item["slot_id"]: item["bus_id"] for item in result["recommended"]}
        self.assertEqual(by_slot[self.a2.pk], self.bus_y.pk)  # 08:00 -> closest to gate
        self.assertEqual(by_slot[self.a3.pk], self.bus_z.pk)  # 09:00
        self.assertEqual(by_slot[self.a4.pk], self.bus_x.pk)  # 10:00 -> furthest

    def test_move_plan_and_cost(self):
        result = run_optimization()
        moves_by_bus = {m["bus_id"]: m for m in result["moves"]}
        self.assertEqual(len(result["moves"]), 3)

        self.assertEqual(moves_by_bus[self.bus_y.pk]["from_slot"], "A3")
        self.assertEqual(moves_by_bus[self.bus_y.pk]["to_slot"], "A2")
        self.assertEqual(moves_by_bus[self.bus_y.pk]["distance_m"], 10.0)

        self.assertEqual(moves_by_bus[self.bus_z.pk]["from_slot"], "A4")
        self.assertEqual(moves_by_bus[self.bus_z.pk]["to_slot"], "A3")
        self.assertEqual(moves_by_bus[self.bus_z.pk]["distance_m"], 10.0)

        self.assertEqual(moves_by_bus[self.bus_x.pk]["from_slot"], "A2")
        self.assertEqual(moves_by_bus[self.bus_x.pk]["to_slot"], "A4")
        self.assertEqual(moves_by_bus[self.bus_x.pk]["distance_m"], 20.0)

        self.assertEqual(result["stats"]["cost_m"], 40.0)
        self.assertEqual(result["stats"]["movements_required"], 3)
        self.assertEqual(result["stats"]["buses_optimised"], 3)

    def test_bus_already_in_recommended_slot_is_not_a_move(self):
        # Swap X and Z by hand (via a clear-then-set, since bus is OneToOne)
        # so X ends up at A4 -- exactly where the recommendation already
        # puts it -- and must therefore be absent from the move list.
        self.a2.bus = None
        self.a2.is_occupied = False
        self.a2.save(update_fields=["bus", "is_occupied"])
        self.a4.bus = None
        self.a4.is_occupied = False
        self.a4.save(update_fields=["bus", "is_occupied"])

        self.a2.bus = self.bus_z
        self.a2.is_occupied = True
        self.a2.save(update_fields=["bus", "is_occupied"])
        self.a4.bus = self.bus_x
        self.a4.is_occupied = True
        self.a4.save(update_fields=["bus", "is_occupied"])

        result = run_optimization()
        moved_bus_ids = {m["bus_id"] for m in result["moves"]}
        self.assertNotIn(self.bus_x.pk, moved_bus_ids)
        self.assertEqual(len(result["moves"]), 2)

    def test_run_optimization_writes_nothing(self):
        run_optimization()
        self.a2.refresh_from_db()
        self.a3.refresh_from_db()
        self.a4.refresh_from_db()
        self.assertEqual(self.a2.bus_id, self.bus_x.pk)
        self.assertEqual(self.a3.bus_id, self.bus_y.pk)
        self.assertEqual(self.a4.bus_id, self.bus_z.pk)


class ApplyOptimizationTests(OptimizerScenario):
    def _save_preview(self):
        result = run_optimization()
        opt = OptimizationResult(
            blocked_before=result["stats"]["blocked_before"],
            blocked_after=result["stats"]["blocked_after"],
            movements_required=result["stats"]["movements_required"],
        )
        opt.set_layout(result)
        opt.save()
        return opt

    def test_apply_writes_recommended_layout(self):
        opt = self._save_preview()
        apply_optimization(opt)

        self.a2.refresh_from_db()
        self.a3.refresh_from_db()
        self.a4.refresh_from_db()
        self.assertEqual(self.a2.bus_id, self.bus_y.pk)
        self.assertEqual(self.a3.bus_id, self.bus_z.pk)
        self.assertEqual(self.a4.bus_id, self.bus_x.pk)
        self.assertIsNotNone(opt.applied_at)

    def test_apply_logs_one_moved_event_per_relocated_bus(self):
        opt = self._save_preview()
        apply_optimization(opt)

        events = ParkingEvent.objects.filter(event_type="MOVED")
        self.assertEqual(events.count(), 3)
        buses_with_events = set(events.values_list("bus_id", flat=True))
        self.assertEqual(buses_with_events, {self.bus_x.pk, self.bus_y.pk, self.bus_z.pk})

    def test_apply_rejects_stale_preview_and_writes_nothing(self):
        opt = self._save_preview()

        # Ground truth changes between Run and Apply: X is manually freed.
        self.a2.bus = None
        self.a2.is_occupied = False
        self.a2.save(update_fields=["bus", "is_occupied"])

        with self.assertRaises(StaleOptimization):
            apply_optimization(opt)

        self.a2.refresh_from_db()
        self.a3.refresh_from_db()
        self.a4.refresh_from_db()
        self.assertIsNone(self.a2.bus_id)  # untouched by the failed apply
        self.assertEqual(self.a3.bus_id, self.bus_y.pk)
        self.assertEqual(self.a4.bus_id, self.bus_z.pk)
        self.assertEqual(ParkingEvent.objects.filter(event_type="MOVED").count(), 0)
        opt.refresh_from_db()
        self.assertIsNone(opt.applied_at)


class ApplyEndpointTests(OptimizerScenario):
    def setUp(self):
        super().setUp()
        self.admin = User.objects.create_superuser("admin", "admin@example.com", "pw12345!")
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_double_apply_is_rejected(self):
        run_resp = self.client.post("/api/optimization/run/")
        self.assertEqual(run_resp.status_code, 200)
        result_id = run_resp.data["id"]

        first = self.client.post("/api/optimization/apply/", {"result_id": result_id})
        self.assertEqual(first.status_code, 200)

        second = self.client.post("/api/optimization/apply/", {"result_id": result_id})
        self.assertEqual(second.status_code, 409)
        self.assertIn("already applied", second.data["error"])

        # Only the first apply's events exist -- the second call wrote nothing.
        self.assertEqual(ParkingEvent.objects.filter(event_type="MOVED").count(), 3)
