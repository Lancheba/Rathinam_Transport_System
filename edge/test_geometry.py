"""Run:  python -m unittest test_geometry   (needs only numpy + opencv, no YOLO)"""
import json
import tempfile
import unittest
from pathlib import Path

from vision_tracker import anchor_point, build_payload, load_homography, pixel_to_ground


class GeometryTests(unittest.TestCase):
    def setUp(self):
        # A 1000x500 px image showing a 60 m x 30 m rectangle of ground.
        calib = {
            "pixel_points": [[0, 500], [1000, 500], [1000, 0], [0, 0]],
            "ground_points_m": [[0, 0], [60, 0], [60, 30], [0, 30]],
        }
        self.tmp = Path(tempfile.mkdtemp()) / "c.json"
        self.tmp.write_text(json.dumps(calib))
        self.H = load_homography(self.tmp)

    def test_corners_and_centre_map_to_metres(self):
        for (px, py), (gx, gy) in [((0, 500), (0, 0)), ((1000, 0), (60, 30)), ((500, 250), (30, 15))]:
            x, y = pixel_to_ground(self.H, px, py)
            self.assertAlmostEqual(x, gx, places=3)
            self.assertAlmostEqual(y, gy, places=3)

    def test_anchor_modes(self):
        box = (100, 200, 300, 260)
        self.assertEqual(anchor_point(box, "bottom"), (200, 260))
        self.assertEqual(anchor_point(box, "center"), (200, 230))

    def test_payload_shape(self):
        dets = [{"track_id": 7, "xyxy": [400, 100, 600, 200], "conf": 0.87}]
        p = build_payload("CAM-1", "s1", dets, self.H, anchor="center")
        self.assertEqual(p["camera_id"], "CAM-1")
        d = p["detections"][0]
        self.assertEqual(d["track_id"], 7)
        self.assertAlmostEqual(d["x_m"], 30.0, places=1)   # pixel x=500 -> 30 m
        self.assertAlmostEqual(d["y_m"], 21.0, places=1)   # pixel y=150 -> 21 m

    def test_bad_calibration_rejected(self):
        self.tmp.write_text(json.dumps({"pixel_points": [[0, 0]], "ground_points_m": [[0, 0]]}))
        with self.assertRaises(Exception):
            load_homography(self.tmp)


if __name__ == "__main__":
    unittest.main()
