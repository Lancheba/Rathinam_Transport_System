import * as faceapi from "face-api.js";

// Tiny detector: ~190KB vs ssdMobilenetv1's ~5.4MB, and built for
// real-time use. Loads faster AND runs faster per frame, which is what
// makes a live "move left/right" guidance loop possible in the first
// place. Never use this at consumer-hardware sizes above 224 - bigger
// input sizes cost latency for no accuracy gain on a single close-up face.
export const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,
  scoreThreshold: 0.5,
});

export type Guidance = { text: string; ok: boolean };

/**
 * Turn one detected face box into a human instruction.
 *
 * The <video> element is displayed mirrored (CSS `scaleX(-1)`) so it feels
 * like a selfie camera, but face-api reads the RAW (unmirrored) frame.
 * That means "raw left" is what the user sees on their right, so the
 * left/right instructions below are intentionally flipped relative to the
 * raw coordinates - this is not a bug.
 */
export function getFaceGuidance(
  box: { x: number; y: number; width: number; height: number },
  videoWidth: number,
  videoHeight: number
): Guidance {
  const cx = (box.x + box.width / 2) / videoWidth;
  const cy = (box.y + box.height / 2) / videoHeight;
  const sizeRatio = box.width / videoWidth;

  const H_LOW = 0.38, H_HIGH = 0.62;
  const V_LOW = 0.3, V_HIGH = 0.75;
  const SIZE_LOW = 0.22, SIZE_HIGH = 0.55;

  if (cx < H_LOW) return { text: "Move left", ok: false };
  if (cx > H_HIGH) return { text: "Move right", ok: false };
  if (cy < V_LOW) return { text: "Move down a little", ok: false };
  if (cy > V_HIGH) return { text: "Move up a little", ok: false };
  if (sizeRatio < SIZE_LOW) return { text: "Move closer", ok: false };
  if (sizeRatio > SIZE_HIGH) return { text: "Move back a little", ok: false };
  return { text: "Hold still…", ok: true };
}

export async function loadFastFaceModels(modelsUrl: string) {
  await faceapi.nets.tinyFaceDetector.loadFromUri(modelsUrl);
  await faceapi.nets.faceLandmark68Net.loadFromUri(modelsUrl);
  await faceapi.nets.faceRecognitionNet.loadFromUri(modelsUrl);
}
