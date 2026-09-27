import os
import subprocess
import sys
from pathlib import Path

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APITestCase

from optimization.models import OptimizationResult
from parking.models import ParkingGround, ParkingSlot


class ApiOnlyRoutingTests(SimpleTestCase):
    """Audit item 1.3: the backend is API-only (the React app is hosted on Vercel).

    Every unknown URL must be a JSON 404, and Django must never serve files from disk.
    """

    def assert_json_404(self, response, url=""):
        self.assertEqual(response.status_code, 404, url)
        self.assertEqual(response["Content-Type"], "application/json", url)
        self.assertEqual(response.json(), {"detail": "Not found."}, url)

    def test_unknown_api_url_is_a_json_404(self):
        self.assert_json_404(self.client.get("/api/does-not-exist/"))

    def test_frontend_routes_are_not_served_by_django(self):
        for url in ("/", "/dashboard", "/login", "/index.html", "/assets/app.js"):
            self.assert_json_404(self.client.get(url), url)

    def test_parent_directory_paths_do_not_leak_files(self):
        for evil in (
            "/../../db.sqlite3",
            "/../../config/settings.py",
            "/assets/../../../db.sqlite3",
            "/%2e%2e/%2e%2e/db.sqlite3",
            "/..%2f..%2fdb.sqlite3",
        ):
            self.assert_json_404(self.client.get(evil), evil)

    def test_null_byte_does_not_crash(self):
        self.assert_json_404(self.client.get("/assets/%00x"))


class ThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_login_is_rate_limited(self):
        codes = [
            self.client.post("/api/auth/login/", {"username": "nobody", "password": "wrong"}, format="json").status_code
            for _ in range(12)
        ]
        self.assertEqual(codes[0], 401)
        self.assertIn(429, codes)

    def test_optimizer_throttle_is_per_user(self):
        a = User.objects.create_user("opt_a", password="x", is_staff=True)
        b = User.objects.create_user("opt_b", password="x", is_staff=True)
        self.client.force_authenticate(a)
        codes = [self.client.post("/api/optimization/run/").status_code for _ in range(31)]
        self.assertEqual(codes[0], 200)
        self.assertEqual(codes[-1], 429)
        self.client.force_authenticate(b)  # a different user is not affected
        self.assertEqual(self.client.post("/api/optimization/run/").status_code, 200)


class OptimizerAccessTests(APITestCase):
    """Audit item 1.6: the optimiser preview is staff-only and never changes parking slots."""

    URL = "/api/optimization/run/"

    def setUp(self):
        cache.clear()
        ground = ParkingGround.objects.create(
            name="Test ground", length_m=50, width_m=20,
            entrance_width_m=6, exit_width_m=6, total_slots=2,
        )
        # A "ghost": marked occupied, but no bus is attached to it.
        self.ghost = ParkingSlot.objects.create(
            ground=ground, row="A", slot_number=1, x_position_m=10, y_position_m=5, is_occupied=True,
        )
        self.staff = User.objects.create_user("opt_staff", password="x", is_staff=True)
        self.student = User.objects.create_user("opt_student", password="x")

    def tearDown(self):
        cache.clear()

    def test_anonymous_is_rejected_and_changes_nothing(self):
        r = self.client.post(self.URL)
        self.assertEqual(r.status_code, 401)
        self.assertEqual(OptimizationResult.objects.count(), 0)
        self.ghost.refresh_from_db()
        self.assertTrue(self.ghost.is_occupied)

    def test_student_is_rejected(self):
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.post(self.URL).status_code, 403)
        self.assertEqual(OptimizationResult.objects.count(), 0)

    def test_staff_preview_is_read_only(self):
        self.client.force_authenticate(self.staff)
        r = self.client.post(self.URL)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(OptimizationResult.objects.count(), 1)  # the preview is stored...
        self.ghost.refresh_from_db()
        self.assertTrue(self.ghost.is_occupied)  # ...but no slot was touched

    def test_preview_keeps_only_50_rows(self):
        for _ in range(60):
            OptimizationResult.objects.create()
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.post(self.URL).status_code, 200)
        self.assertLessEqual(OptimizationResult.objects.count(), 50)

    def test_applying_a_result_clears_ghost_slots(self):
        self.client.force_authenticate(self.staff)
        result_id = self.client.post(self.URL).data["id"]
        self.assertEqual(self.client.post("/api/optimization/apply/", {"result_id": result_id}, format="json").status_code, 200)
        self.ghost.refresh_from_db()
        self.assertFalse(self.ghost.is_occupied)


class ProductionGuardTests(TestCase):
    """With DJANGO_DEBUG=0 (the default), refuse to start on unsafe settings."""

    GOOD = dict(
        DJANGO_SECRET_KEY="x" * 60,
        DJANGO_ALLOWED_HOSTS="app.example.com",
        FACE_EMBEDDING_KEY="zH8f3s5D9pQeYw2mVn7tR4uJk1oXcAbLgN0iT6yEqF8=",
    )

    def import_settings(self, **env):
        base = {k: v for k, v in os.environ.items() if not k.startswith("DJANGO_")}
        base["DJANGO_SKIP_DOTENV"] = "1"  # a developer's local .env must not affect these tests
        base.update(env)
        return subprocess.run(
            [sys.executable, "-c", "import config.settings"],
            env=base, cwd=Path(__file__).resolve().parent.parent, capture_output=True, text=True,
        )

    def test_no_environment_variables_refuses_to_boot(self):
        r = self.import_settings()
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("DJANGO_SECRET_KEY", r.stderr)

    def test_default_secret_key_is_refused_when_debug_is_off(self):
        r = self.import_settings(DJANGO_DEBUG="0")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("DJANGO_SECRET_KEY", r.stderr)

    def test_default_face_embedding_key_is_refused_when_debug_is_off(self):
        r = self.import_settings(DJANGO_DEBUG="0", DJANGO_SECRET_KEY="x" * 60, DEVICE_API_KEY="y" * 30)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("FACE_EMBEDDING_KEY", r.stderr)

    def test_missing_allowed_hosts_is_refused_when_debug_is_off(self):
        good = {k: v for k, v in self.GOOD.items() if k != "DJANGO_ALLOWED_HOSTS"}
        r = self.import_settings(**good)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("DJANGO_ALLOWED_HOSTS", r.stderr)

    def test_wildcard_allowed_hosts_is_refused_when_debug_is_off(self):
        r = self.import_settings(**{**self.GOOD, "DJANGO_ALLOWED_HOSTS": "*"})
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("DJANGO_ALLOWED_HOSTS", r.stderr)

    def test_properly_configured_production_starts(self):
        r = self.import_settings(**self.GOOD)
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_debug_can_still_be_turned_on_explicitly(self):
        r = self.import_settings(DJANGO_DEBUG="1")
        self.assertEqual(r.returncode, 0, r.stderr)

class PublicReadAuditTests(APITestCase):
    """Audit item 1.3 (security): DRF's project-wide default permission is
    IsAuthenticatedOrReadOnly (see REST_FRAMEWORK in settings.py), so any
    ModelViewSet that forgets to override permissions silently allows
    unauthenticated GET access to its data.

    This hits list/retrieve on every registered ViewSet across all 11 apps
    as an anonymous client. A handful are DELIBERATELY public (buses, parking
    ground/slots, announcements -- see their own get_permissions()); everything
    else must reject an anonymous reader outright (401, since JWTAuthentication
    gives anonymous requests an authenticate_header, so DRF raises
    NotAuthenticated rather than PermissionDenied -- see ProductionGuardTests-
    adjacent OptimizerAccessTests for the same pattern).

    If this test ever fails, it means a new (or edited) ViewSet is relying on
    the IsAuthenticatedOrReadOnly default instead of making a deliberate
    choice -- see accounts.permissions and each app's get_permissions().
    """

    # Endpoints where an anonymous GET is intentional and documented in the
    # view itself (see get_permissions()/permission_classes there).
    INTENTIONALLY_PUBLIC = {
        "/api/buses/",
        "/api/parking/ground/",
        "/api/parking/slots/",
        "/api/announcements/",
    }

    # Every other registered ViewSet's collection URL. Anonymous access to
    # ANY of these must be refused.
    MUST_BE_PROTECTED = {
        "/api/students/",
        "/api/sensors/",
        "/api/events/",
        "/api/feedback/",
        "/api/attendance/teachers/",
        "/api/maintenance/logs/",
    }

    def test_intentionally_public_viewsets_allow_anonymous_reads(self):
        for url in self.INTENTIONALLY_PUBLIC:
            with self.subTest(url=url):
                r = self.client.get(url)
                self.assertEqual(r.status_code, 200, f"{url} should be publicly readable: {r.data}")

    def test_every_other_viewset_rejects_anonymous_reads(self):
        for url in self.MUST_BE_PROTECTED:
            with self.subTest(url=url):
                r = self.client.get(url)
                self.assertIn(
                    r.status_code, (401, 403),
                    f"{url} unexpectedly allowed an anonymous GET (status {r.status_code}): "
                    "check its ViewSet for a missing permission override.",
                )

    def test_registered_viewset_urls_are_fully_accounted_for(self):
        """Guards against this audit silently going stale: if a new ViewSet
        is registered on a router, it must be added to one of the two sets
        above (or the intentional-vs-protected split loses its meaning)."""
        from django.urls import get_resolver

        known = self.INTENTIONALLY_PUBLIC | self.MUST_BE_PROTECTED
        seen_viewset_roots = set()

        def walk(patterns, prefix=""):
            for p in patterns:
                if hasattr(p, "url_patterns"):
                    walk(p.url_patterns, prefix + str(p.pattern))
                else:
                    cls = getattr(getattr(p.callback, "cls", None), "__name__", "")
                    pattern = str(p.pattern)
                    if (
                        cls.endswith("ViewSet")
                        and getattr(p, "name", "").split("-")[-1] in ("list", "root")
                        and r"(?P<format>" not in pattern  # skip the `.json`-style format suffix route
                    ):
                        seen_viewset_roots.add("/" + (prefix + pattern).replace("^", "").replace("$", ""))

        walk(get_resolver().url_patterns)
        # Every collection URL DRF's router actually registered must be one
        # we deliberately classified above (allowing for the '' vs '/' router
        # quirk on feedback/students/buses, which mount at their own prefix).
        unaccounted = {
            u for u in seen_viewset_roots
            if u not in known and u.rstrip("/") + "/" not in known and u not in {
                "/api/buses/", "/api/students/", "/api/feedback/",
            }
        }
        self.assertEqual(
            unaccounted, set(),
            f"New/unclassified ViewSet route(s) found: {unaccounted}. "
            "Add them to INTENTIONALLY_PUBLIC or MUST_BE_PROTECTED above "
            "after deciding, deliberately, whether anonymous GET is intended.",
        )


class HealthzTests(SimpleTestCase):
    databases = {"default"}
    def test_healthz_ok_when_db_reachable(self):
        res = self.client.get("/healthz")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")
        self.assertEqual(res.json()["db"], "ok")

    def test_healthz_503_when_db_unreachable(self):
        from unittest.mock import patch as mock_patch
        with mock_patch("config.healthz.connection.ensure_connection", side_effect=Exception("boom")):
            res = self.client.get("/healthz")
        self.assertEqual(res.status_code, 503)
        self.assertEqual(res.json()["status"], "degraded")
        self.assertIn("boom", res.json()["db"])

