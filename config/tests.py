import os
import subprocess
import sys
import tempfile
from pathlib import Path

from django.core.cache import cache
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APITestCase

from optimization.models import OptimizationResult


class FrontendServingTests(SimpleTestCase):
    """serve_frontend must never hand out files from outside frontend/dist."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        dist = self.tmp / "frontend" / "dist"
        (dist / "assets").mkdir(parents=True)
        (dist / "index.html").write_text("<html>APP SHELL</html>")
        (dist / "assets" / "app.js").write_text("console.log('ok')")
        (self.tmp / "db.sqlite3").write_text("SECRET DATABASE CONTENT")
        (self.tmp / "config").mkdir()
        (self.tmp / "config" / "settings.py").write_text("SECRET_KEY = 'leaked'")

    def get(self, path):
        with override_settings(BASE_DIR=self.tmp):
            return self.client.get(path)

    def body(self, resp):
        return b"".join(resp.streaming_content) if resp.streaming else resp.content

    def test_real_assets_are_served(self):
        r = self.get("/assets/app.js")
        self.assertEqual(r.status_code, 200)
        self.assertIn(b"console.log", self.body(r))

    def test_unknown_route_falls_back_to_the_app_shell(self):
        self.assertIn(b"APP SHELL", self.body(self.get("/dashboard")))

    def test_parent_directory_paths_do_not_leak_files(self):
        for evil in (
            "/../../db.sqlite3",
            "/../../config/settings.py",
            "/assets/../../../db.sqlite3",
            "/%2e%2e/%2e%2e/db.sqlite3",
            "/..%2f..%2fdb.sqlite3",
        ):
            body = self.body(self.get(evil))
            self.assertNotIn(b"SECRET DATABASE CONTENT", body, evil)
            self.assertNotIn(b"leaked", body, evil)

    def test_unknown_api_url_is_a_json_404(self):
        r = self.get("/api/does-not-exist/")
        self.assertEqual(r.status_code, 404)
        self.assertEqual(r["Content-Type"], "application/json")

    def test_null_byte_does_not_crash(self):
        self.assertEqual(self.get("/assets/%00x").status_code, 200)


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

    def test_public_optimisation_preview_still_works_and_keeps_only_50_rows(self):
        for _ in range(60):
            OptimizationResult.objects.create()
        r = self.client.post("/api/optimization/run/")
        self.assertEqual(r.status_code, 200)
        self.assertLessEqual(OptimizationResult.objects.count(), 50)


class ProductionGuardTests(TestCase):
    """With DJANGO_DEBUG=0, refuse to start on the built-in dev secrets."""

    def import_settings(self, **env):
        base = {k: v for k, v in os.environ.items() if not k.startswith(("DJANGO_", "DEVICE_API_KEY"))}
        base.update(env)
        return subprocess.run(
            [sys.executable, "-c", "import config.settings"],
            env=base, cwd=Path(__file__).resolve().parent.parent, capture_output=True, text=True,
        )

    def test_default_secret_key_is_refused_when_debug_is_off(self):
        r = self.import_settings(DJANGO_DEBUG="0")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("DJANGO_SECRET_KEY", r.stderr)

    def test_default_device_key_is_refused_when_debug_is_off(self):
        r = self.import_settings(DJANGO_DEBUG="0", DJANGO_SECRET_KEY="x" * 60)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("DEVICE_API_KEY", r.stderr)

    def test_properly_configured_production_starts(self):
        r = self.import_settings(DJANGO_DEBUG="0", DJANGO_SECRET_KEY="x" * 60, DEVICE_API_KEY="y" * 30)
        self.assertEqual(r.returncode, 0, r.stderr)
