import * as faceapi from "face-api.js";

// Shared high-accuracy capture used by BOTH face enrollment and attendance scan.
// Instead of trusting one video frame, it waits for the camera to settle, collects
// several good frames, drops outliers and averages them into a single descriptor.

const CAPTURE_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 320,
  scoreThreshold: 0.6,
});

const TARGET_FRAMES = 5;
const MIN_FRAMES = 3;
const WARMUP_MS = 800;
const FRAME_GAP_MS = 120;
const MAX_CAPTURE_MS = 6000;
const MIN_DETECTION_SCORE = 0.8;
const MIN_BRIGHTNESS = 60;
const MAX_BRIGHTNESS = 215;
const MAX_YAW_OFFSET = 0.18;
const MAX_OUTLIER_DISTANCE = 0.45;

export type CapturedFace = { descriptor: number[]; frames: number };

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function faceBrightness(
  video: HTMLVideoElement,
  box: { x: number; y: number; width: number; height: number }
): number | null {
  try {
    const x = Math.max(0, Math.floor(box.x));
    const y = Math.max(0, Math.floor(box.y));
    const w = Math.min(video.videoWidth - x, Math.floor(box.width));
    const h = Math.min(video.videoHeight - y, Math.floor(box.height));
    if (w < 10 || h < 10) return null;
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, x, y, w, h, 0, 0, 32, 32);
    const data = ctx.getImageData(0, 0, 32, 32).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return sum / (data.length / 4);
  } catch {
    return null;
  }
}

function isFrontal(landmarks: faceapi.FaceLandmarks68): boolean {
  const avgX = (pts: faceapi.Point[]) => pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const a = avgX(landmarks.getLeftEye());
  const b = avgX(landmarks.getRightEye());
  const nose = landmarks.positions[30].x;
  const span = Math.abs(b - a);
  if (span < 1) return false;
  const ratio = Math.abs(nose - Math.min(a, b)) / span;
  return Math.abs(ratio - 0.5) <= MAX_YAW_OFFSET;
}

function meanVector(vs: Float32Array[]): number[] {
  const out: number[] = new Array(128).fill(0);
  for (const v of vs) {
    for (let i = 0; i < 128; i++) out[i] += v[i];
  }
  return out.map((x: number) => x / vs.length);
}

function distance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < 128; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

export async function captureAveragedDescriptor(
  video: HTMLVideoElement,
  onProgress?: (text: string) => void
): Promise<CapturedFace | null> {
  onProgress?.("Hold still - getting ready...");
  await sleep(WARMUP_MS);

  const samples: Float32Array[] = [];
  const start = Date.now();

  while (samples.length < TARGET_FRAMES && Date.now() - start < MAX_CAPTURE_MS) {
    if (video.readyState >= 2) {
      const det = await faceapi
        .detectSingleFace(video, CAPTURE_OPTIONS)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (det && det.detection.score >= MIN_DETECTION_SCORE && isFrontal(det.landmarks)) {
        const b = faceBrightness(video, det.detection.box);
        if (b === null || (b >= MIN_BRIGHTNESS && b <= MAX_BRIGHTNESS)) {
          samples.push(det.descriptor);
          onProgress?.(`Hold still - capturing ${samples.length}/${TARGET_FRAMES}`);
        } else {
          onProgress?.(b < MIN_BRIGHTNESS ? "Too dark - face a light" : "Too bright - avoid glare");
        }
      } else {
        onProgress?.("Look straight at the camera");
      }
    }
    await sleep(FRAME_GAP_MS);
  }

  if (samples.length < MIN_FRAMES) return null;

  let mean = meanVector(samples);
  const kept = samples.filter((s: Float32Array) => distance(s, mean) <= MAX_OUTLIER_DISTANCE);
  if (kept.length < MIN_FRAMES) return null;

  mean = meanVector(kept);
  return { descriptor: mean, frames: kept.length };
}
