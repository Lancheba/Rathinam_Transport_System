#!/usr/bin/env python3
"""
Camera -> Django bridge for the Rathinam Smart Bus Parking system.

  camera / video / photo  ->  YOLO detects + tracks buses
                          ->  pixel positions become ground positions (metres)
                          ->  POST /api/vision/positions/  (Django)

The camera only knows WHERE a bus is. Which bus it is comes from the RFID gate
readers; the Django server joins the two (vision/linking.py).

Typical use
-----------
  # 1. Once: click 4 known ground points on a camera frame -> calibration.json
  python vision_tracker.py --calibrate --source frame.jpg

  # 2. Try it on a photo without sending anything
  python vision_tracker.py --source bus_ground.jpg --dry-run --save out.jpg

  # 3. Live: RTSP camera (or 0 for a USB webcam) posting to the server
  python vision_tracker.py --source rtsp://user:pass@192.168.1.60/stream \
      --server http://192.168.1.50:8000 --key <DEVICE_API_KEY>

Ground coordinates use the same axes as ParkingSlot: x along the ground length
starting at the slot-1 end, y across the rows.
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

import cv2
import numpy as np

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
COCO_BUS = 5  # class id of "bus" in the COCO dataset the pretrained YOLO models use


# ----------------------------------------------------------- geometry ----

def load_homography(path):
    """calibration.json -> 3x3 matrix mapping image pixels to ground metres."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    px = np.float32(data["pixel_points"])
    gr = np.float32(data["ground_points_m"])
    if px.shape != (4, 2) or gr.shape != (4, 2):
        raise ValueError("calibration needs exactly 4 pixel_points and 4 ground_points_m")
    return cv2.getPerspectiveTransform(px, gr)


def pixel_to_ground(H, x, y):
    out = cv2.perspectiveTransform(np.array([[[x, y]]], dtype=np.float32), H)[0][0]
    return float(out[0]), float(out[1])


def anchor_point(xyxy, mode="bottom"):
    """
    Which point of a bounding box stands for 'where the bus is'.
    'bottom' = bottom-centre (closest to where it touches the ground; best for a
    camera looking at the ground from the side). 'center' suits a top-down camera.
    """
    x1, y1, x2, y2 = xyxy
    cx = (x1 + x2) / 2
    return (cx, y2) if mode == "bottom" else (cx, (y1 + y2) / 2)


def build_payload(camera_id, session, detections, H=None, anchor="bottom"):
    """detections: [{'track_id', 'xyxy', 'conf'}] -> JSON body for the server."""
    items = []
    for d in detections:
        px, py = anchor_point(d["xyxy"], anchor)
        x_m, y_m = pixel_to_ground(H, px, py) if H is not None else (px, py)
        items.append({
            "track_id": int(d["track_id"]),
            "x_m": round(x_m, 2),
            "y_m": round(y_m, 2),
            "confidence": round(float(d["conf"]), 3),
        })
    return {"camera_id": camera_id, "session": session, "detections": items}


# ------------------------------------------------------------ network ----

def post_payload(server, key, payload, timeout=5):
    import requests  # imported here so geometry helpers work without it

    url = server.rstrip("/") + "/api/vision/positions/"
    try:
        r = requests.post(url, json=payload, headers={"X-Device-Key": key}, timeout=timeout)
        return r.ok, f"HTTP {r.status_code} {r.text[:200]}"
    except requests.RequestException as exc:
        return False, f"network error: {exc}"


# ---------------------------------------------------------- detection ----

def load_model(name):
    from ultralytics import YOLO  # heavy import, only when detecting

    return YOLO(name)


def detect(model, frame, conf, classes, tracker, track=True):
    if track:
        result = model.track(frame, persist=True, conf=conf, classes=classes,
                             tracker=tracker, verbose=False)[0]
    else:
        result = model.predict(frame, conf=conf, classes=classes, verbose=False)[0]

    boxes = result.boxes
    if boxes is None or len(boxes) == 0:
        return []
    ids = boxes.id.int().tolist() if boxes.id is not None else list(range(1, len(boxes) + 1))
    return [
        {"track_id": tid, "xyxy": xyxy, "conf": c}
        for tid, xyxy, c in zip(ids, boxes.xyxy.tolist(), boxes.conf.tolist())
    ]


def draw(frame, detections, payload=None):
    out = frame.copy()
    by_id = {d["track_id"]: d for d in (payload or {}).get("detections", [])}
    for d in detections:
        x1, y1, x2, y2 = map(int, d["xyxy"])
        cv2.rectangle(out, (x1, y1), (x2, y2), (0, 200, 255), 2)
        label = f"#{d['track_id']} {d['conf']:.2f}"
        g = by_id.get(d["track_id"])
        if g:
            label += f" ({g['x_m']:.0f},{g['y_m']:.0f})m"
        cv2.putText(out, label, (x1, max(15, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.55,
                    (0, 200, 255), 2, cv2.LINE_AA)
    return out


# -------------------------------------------------------- calibration ----

def grab_frame(source):
    if Path(str(source)).suffix.lower() in IMAGE_EXT:
        frame = cv2.imread(str(source))
    else:
        cap = cv2.VideoCapture(int(source) if str(source).isdigit() else source)
        ok, frame = cap.read()
        cap.release()
        frame = frame if ok else None
    if frame is None:
        sys.exit(f"Could not read a frame from {source}")
    return frame


def calibrate(source, out_path):
    frame = grab_frame(source)
    points = []

    def on_click(event, x, y, *_):
        if event == cv2.EVENT_LBUTTONDOWN and len(points) < 4:
            points.append((x, y))

    win = "Click 4 ground points (ESC to cancel)"
    cv2.namedWindow(win)
    cv2.setMouseCallback(win, on_click)
    print("Click 4 points on the ground that you can also measure in metres.")
    print("Use the same axes as the slots: x along the ground length from the slot-1 end, y across the rows.")
    while len(points) < 4:
        view = frame.copy()
        for i, (x, y) in enumerate(points, 1):
            cv2.circle(view, (x, y), 8, (0, 0, 255), -1)
            cv2.putText(view, str(i), (x + 10, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        cv2.imshow(win, view)
        if cv2.waitKey(30) == 27:
            sys.exit("Calibration cancelled")
    cv2.destroyAllWindows()

    ground = []
    for i, p in enumerate(points, 1):
        while True:
            raw = input(f"Point {i} at pixel {p}: ground x,y in metres (e.g. 12.5,4): ")
            try:
                gx, gy = (float(v) for v in raw.replace(" ", "").split(","))
                ground.append([gx, gy])
                break
            except ValueError:
                print("  Please type two numbers separated by a comma.")

    Path(out_path).write_text(
        json.dumps({"pixel_points": [list(p) for p in points], "ground_points_m": ground}, indent=2),
        encoding="utf-8",
    )
    print(f"Saved {out_path}")


# --------------------------------------------------------------- main ----

def parse_args():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--source", required=True, help="RTSP/HTTP URL, video file, webcam index (0), or a photo")
    p.add_argument("--server", default=os.environ.get("BUS_SERVER", "http://localhost:8000"))
    p.add_argument("--key", default=os.environ.get("DEVICE_API_KEY", "dev-device-key"),
                   help="must match DEVICE_API_KEY on the server")
    p.add_argument("--camera-id", default="CAM-1")
    p.add_argument("--calibration", default=str(Path(__file__).with_name("calibration.json")))
    p.add_argument("--calibrate", action="store_true", help="create calibration.json interactively, then exit")
    p.add_argument("--model", default="yolov8n.pt", help="YOLO weights; use your fine-tuned .pt here")
    p.add_argument("--conf", type=float, default=0.35)
    p.add_argument("--classes", type=int, nargs="+", default=[COCO_BUS],
                   help="COCO class ids to keep (5=bus, 7=truck). Custom models: your own ids.")
    p.add_argument("--tracker", default="bytetrack.yaml")
    p.add_argument("--anchor", choices=["bottom", "center"], default="bottom")
    p.add_argument("--fps", type=float, default=2.0, help="max detections per second")
    p.add_argument("--interval", type=float, default=2.0, help="seconds between posts to the server")
    p.add_argument("--repeat", type=int, default=1, help="photo mode only: post the same result N times")
    p.add_argument("--dry-run", action="store_true", help="print the payload, send nothing")
    p.add_argument("--show", action="store_true", help="show a live window (q to quit)")
    p.add_argument("--save", help="photo mode: write the annotated image here")
    return p.parse_args()


def main():
    args = parse_args()

    if args.calibrate:
        calibrate(args.source, args.calibration)
        return

    H = None
    if Path(args.calibration).exists():
        H = load_homography(args.calibration)
    elif args.dry_run:
        print("WARNING: no calibration.json - printing PIXEL coordinates. Run with --calibrate first.")
    else:
        sys.exit("No calibration.json found. Run:  python vision_tracker.py --calibrate --source <frame>")

    model = load_model(args.model)
    session = time.strftime("%Y%m%d%H%M%S")

    def send(payload):
        if args.dry_run:
            print(json.dumps(payload, indent=2))
            return
        ok, msg = post_payload(args.server, args.key, payload)
        print(("sent  " if ok else "FAILED ") + msg)

    # ---- single photo ---------------------------------------------------
    if Path(args.source).suffix.lower() in IMAGE_EXT:
        frame = cv2.imread(args.source)
        if frame is None:
            sys.exit(f"Could not read {args.source}")
        dets = detect(model, frame, args.conf, args.classes, args.tracker, track=False)
        payload = build_payload(args.camera_id, session, dets, H, args.anchor)
        print(f"Found {len(dets)} vehicle(s).")
        for _ in range(max(1, args.repeat)):
            send(payload)
        if args.save:
            cv2.imwrite(args.save, draw(frame, dets, payload))
            print(f"Annotated image -> {args.save}")
        return

    # ---- live camera / video -------------------------------------------
    src = int(args.source) if args.source.isdigit() else args.source
    cap = cv2.VideoCapture(src)
    is_stream = not Path(args.source).is_file()
    last_infer = last_post = 0.0
    dets, payload = [], None

    print(f"Tracking from {args.source}  ->  {args.server}   (Ctrl+C to stop)")
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                if not is_stream:
                    break  # video file finished
                print("Stream lost, reconnecting in 3 s...")
                cap.release()
                time.sleep(3)
                cap = cv2.VideoCapture(src)
                continue

            now = time.time()
            if now - last_infer >= 1.0 / args.fps:
                dets = detect(model, frame, args.conf, args.classes, args.tracker, track=True)
                payload = build_payload(args.camera_id, session, dets, H, args.anchor)
                last_infer = now
                if now - last_post >= args.interval:
                    send(payload)
                    last_post = now

            if args.show:
                cv2.imshow("bus tracker", draw(frame, dets, payload))
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
    except KeyboardInterrupt:
        pass
    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
