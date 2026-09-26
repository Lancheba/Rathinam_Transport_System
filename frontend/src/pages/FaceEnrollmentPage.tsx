import { useRef, useState, useEffect, useCallback } from "react";
import * as faceapi from "face-api.js";
import api from "../api/client";
import { DETECTOR_OPTIONS, getFaceGuidance, loadFastFaceModels } from "../utils/faceGuidance";

const MODELS_URL = "/models";
const STABLE_FRAMES_REQUIRED = 6; // ~6 * 150ms = ~0.9s well-centered before auto-capture
const DETECT_INTERVAL_MS = 150;

type FaceStatus = {
  enrolled: boolean;
  last_enrolled_at: string | null;
  retakes_used: number;
  retakes_remaining: number;
  max_retakes: number;
};

type Step = "idle" | "loading" | "capturing" | "processing" | "done" | "error";

export default function FaceEnrollmentPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const stableCountRef = useRef(0);
  const capturingRef = useRef(false); // guards against double auto-capture

  const [info, setInfo] = useState<FaceStatus | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [retaking, setRetaking] = useState(false);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Step>("idle");
  const [message, setMessage] = useState("");
  const [guidanceOk, setGuidanceOk] = useState(false);
  const [canForceCapture, setCanForceCapture] = useState(false);

  function stopDetectionLoop() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function stopCamera() {
    stopDetectionLoop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function refreshInfo() {
    try {
      const res = await api.get<FaceStatus>("/students/me/face-enrollment/");
      setInfo(res.data);
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.response?.data?.detail ?? "Could not load face enrollment status.");
    } finally {
      setLoadingInfo(false);
    }
  }

  useEffect(() => {
    refreshInfo();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Detection loop: cheap tiny-detector pass, no landmarks/descriptor ----
  const runDetectionTick = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || capturingRef.current) return;

    const detection = await faceapi.detectSingleFace(video, DETECTOR_OPTIONS);

    if (!detection) {
      stableCountRef.current = 0;
      setGuidanceOk(false);
      setMessage("Bring your face into the frame");
      return;
    }

    const guidance = getFaceGuidance(detection.box, video.videoWidth, video.videoHeight);
    setGuidanceOk(guidance.ok);
    setMessage(guidance.text);

    if (guidance.ok) {
      stableCountRef.current += 1;
      if (stableCountRef.current >= STABLE_FRAMES_REQUIRED) {
        void finalizeCapture();
      }
    } else {
      stableCountRef.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnrollmentFlow() {
    setStatus("loading");
    setMessage("Loading face models…");
    try {
      await loadFastFaceModels(MODELS_URL);
    } catch {
      setStatus("error");
      setMessage("Could not load face models. Check your connection and try again.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setStatus("error");
      setMessage("Camera access was blocked. Allow camera permission and try again.");
      return;
    }

    setStatus("capturing");
    setMessage("Position your face in the frame");
    stableCountRef.current = 0;
    capturingRef.current = false;
    setCanForceCapture(false);

    // A manual override appears after a few seconds in case auto-detect
    // struggles (poor lighting, low-end camera) so the user is never stuck.
    window.setTimeout(() => setCanForceCapture(true), 3000);

    intervalRef.current = window.setInterval(runDetectionTick, DETECT_INTERVAL_MS);
  }

  async function finalizeCapture() {
    if (capturingRef.current) return;
    capturingRef.current = true;
    stopDetectionLoop();
    setStatus("processing");
    setMessage("Hold still — capturing…");

    const video = videoRef.current;
    if (!video) {
      capturingRef.current = false;
      return;
    }

    const detection = await faceapi
      .detectSingleFace(video, DETECTOR_OPTIONS)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      // Lost the face between the guidance loop and the final capture —
      // resume the live loop instead of failing the whole attempt.
      capturingRef.current = false;
      setStatus("capturing");
      setMessage("Lost the face — hold position and try again");
      intervalRef.current = window.setInterval(runDetectionTick, DETECT_INTERVAL_MS);
      return;
    }

    const embedding = Array.from(detection.descriptor);
    setMessage("Uploading…");
    try {
      await api.post("/students/me/face-enrollment/", { embedding, consent: true });
      stopCamera();
      await refreshInfo();
      setRetaking(false);
      setConsent(false);
      setStatus("done");
      setMessage("Face enrolled successfully!");
    } catch (e: any) {
      stopCamera();
      setStatus("error");
      setMessage(e?.response?.data?.detail ?? "Enrollment failed.");
      await refreshInfo();
    } finally {
      capturingRef.current = false;
    }
  }

  function startRetake() {
    setRetaking(true);
    setConsent(false);
    setStatus("idle");
    setMessage("");
  }

  function cancelRetake() {
    stopCamera();
    setRetaking(false);
    setConsent(false);
    setStatus("idle");
    setMessage("");
  }

  const messageColor =
    status === "error" ? "#dc2626" : status === "done" ? "#16a34a" : status === "capturing" ? (guidanceOk ? "#16a34a" : "#b45309") : undefined;

  if (loadingInfo) {
    return <div style={{ maxWidth: 480, margin: "2rem auto", padding: "1rem" }}>Loading...</div>;
  }

  // ---- Already enrolled: show the checkmark state ----
  if (info?.enrolled && !retaking) {
    const canRetake = info.retakes_remaining > 0;
    return (
      <div style={{ maxWidth: 480, margin: "2rem auto", padding: "1rem" }}>
        <h2>Face Enrollment</h2>

        <div
          style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            padding: "1rem", borderRadius: 12,
            background: "#f0fdf4", border: "1px solid #86efac",
          }}
        >
          <span
            style={{
              width: 36, height: 36, borderRadius: "50%", background: "#16a34a",
              color: "#fff", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "1.2rem", flexShrink: 0,
            }}
          >
            &#10003;
          </span>
          <div>
            <div style={{ fontWeight: 600, color: "#166534" }}>Face enrolled</div>
            {info.last_enrolled_at && (
              <div style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                Last updated {new Date(info.last_enrolled_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
          Retakes used: {info.retakes_used} of {info.max_retakes}
        </p>

        {canRetake ? (
          <button onClick={startRetake} style={{ padding: "0.6rem 1.2rem", cursor: "pointer" }}>
            Retake face ({info.retakes_remaining} left)
          </button>
        ) : (
          <p style={{ fontSize: "0.9rem", color: "#b45309" }}>
            You have used all {info.max_retakes} retakes. Please contact your admin if you need
            your face re-enrolled.
          </p>
        )}

        {message && (
          <p style={{ marginTop: "1rem", fontWeight: 500, color: messageColor }}>{message}</p>
        )}
      </div>
    );
  }

  // ---- Not enrolled yet, or retaking ----
  return (
    <div style={{ maxWidth: 480, margin: "2rem auto", padding: "1rem" }}>
      <h2>{retaking ? "Retake Face Enrollment" : "Face Enrollment"}</h2>
      <p style={{ fontSize: "0.9rem", color: "var(--text-secondary, #666)" }}>
        Your face data is converted to a numeric vector inside your browser.
        No photo is ever uploaded. You can delete it any time.
      </p>

      {retaking && info && (
        <p style={{ fontSize: "0.9rem", color: "#b45309" }}>
          This uses 1 of your {info.retakes_remaining} remaining retakes.
        </p>
      )}

      {(status === "idle") && (
        <>
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            I consent to storing my face embedding for attendance verification.
          </label>
          <button
            disabled={!consent}
            onClick={startEnrollmentFlow}
            style={{ padding: "0.6rem 1.2rem", cursor: consent ? "pointer" : "not-allowed" }}
          >
            Start Face Enrollment
          </button>
        </>
      )}

      <div style={{ position: "relative", display: status === "capturing" || status === "processing" ? "block" : "none" }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: "100%", borderRadius: 12, marginTop: "1rem",
            transform: "scaleX(-1)", // natural selfie view; guidance math accounts for this
            border: status === "capturing" ? `3px solid ${guidanceOk ? "#16a34a" : "#f59e0b"}` : "3px solid transparent",
          }}
        />
      </div>

      {status === "capturing" && canForceCapture && (
        <button
          onClick={() => void finalizeCapture()}
          style={{
            marginTop: "0.8rem", padding: "0.7rem 1.4rem", background: "#2563eb",
            color: "#fff", borderRadius: 8, border: "none", cursor: "pointer",
          }}
        >
          Capture Now
        </button>
      )}

      {message && (
        <p style={{ marginTop: "1rem", fontWeight: 500, color: messageColor }}>{message}</p>
      )}

      {status === "error" && (
        <button
          onClick={() => { stopCamera(); setStatus("idle"); setMessage(""); }}
          style={{ marginTop: "0.8rem", padding: "0.5rem 1rem", display: "block" }}
        >
          Try again
        </button>
      )}

      {retaking && status !== "processing" && (
        <button onClick={cancelRetake} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
          Cancel
        </button>
      )}
    </div>
  );
}
