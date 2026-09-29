import * as faceapi from "face-api.js";

// Shared high-accuracy capture used by BOTH face enrollment and attendance scan.
// It waits for the camera to settle, normalizes each frame's brightness/contrast
// (so dim or uneven light still works), collects several good frames, drops
// outliers and averages them into a single 128-number descriptor.

const CAPTURE_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 320,
  scoreThreshold: 0.45,
});

const TARGET_FRAMES = 5;
const MIN_FRAMES = 3;
const WARMUP_MS = 800;
const FRAME_GAP_MS = 120;
const MAX_CAPTURE_MS = 8000;
const MIN_DETECTION_SCORE = 0.7;
const MAX_YAW_OFFSET = 0.2;
const MAX_OUTLIER_DISTANCE = 0.45;
const WORK_WIDTH = 640;
const TOO_DARK_LEVEL = 25;

export type CapturedFace = { descriptor: number[]; frames: number };

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let workCanvas: HTMLCanvasElement | null = null;

export type NormalizedFrame = { canvas: HTMLCanvasElement; tooDark: boolean };

// Draw the video frame to a canvas and auto-correct it: stretch contrast between
// the 2nd and 98th brightness percentiles, then apply gamma so the average
// brightness lands near mid-grey. The same correction runs at enrollment and scan.
export function normalizeFrame(video: HTMLVideoElement): NormalizedFrame | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const scale = Math.min(1, WORK_WIDTH / vw);
  const w = Math.round(vw * scale);
  const h = Math.round(vh * scale);

  if (!workCanvas) workCanvas = document.createElement("canvas");
  workCanvas.width = w;
  workCanvas.height = h;
  const ctx = workCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  const hist = new Uint32Array(256);
  const total = w * h;
  for (let i = 0; i < d.length; i += 4) {
    const y = Math.floor(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    hist[y]++;
  }

  const lowTarget = total * 0.02;
  const highTarget = total * 0.98;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= lowTarget) { lo = v; break; }
  }
  acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= highTarget) { hi = v; break; }
  }

  const tooDark = hi < TOO_DARK_LEVEL;
  if (hi - lo < 40) hi = Math.min(255, lo + 40);

  const stretch = (v: number) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)));

  let meanStretched = 0;
  for (let v = 0; v < 256; v++) meanStretched += hist[v] * stretch(v);
  meanStretched = Math.min(0.9, Math.max(0.05, meanStretched / total));

  const gamma = Math.min(1.5, Math.max(0.45, Math.log(0.5) / Math.log(meanStretched)));

  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    lut[v] = Math.round(Math.pow(stretch(v), gamma) * 255);
  }

  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }
  ctx.putImageData(img, 0, 0);

  return { canvas: workCanvas, tooDark };
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
      const frame = normalizeFrame(video);
      if (frame && frame.tooDark) {
        onProgress?.("Too dark - move toward a light");
      } else if (frame) {
        const det = await faceapi
          .detectSingleFace(frame.canvas, CAPTURE_OPTIONS)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (det && det.detection.score >= MIN_DETECTION_SCORE && isFrontal(det.landmarks)) {
          samples.push(det.descriptor);
          onProgress?.(`Hold still - capturing ${samples.length}/${TARGET_FRAMES}`);
        } else {
          onProgress?.("Look straight at the camera");
        }
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
