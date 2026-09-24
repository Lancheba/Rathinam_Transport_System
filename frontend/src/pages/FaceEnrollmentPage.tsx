import { useRef, useState, useEffect } from "react";
import * as faceapi from "face-api.js";
import api from "../api/client";

const MODELS_URL = "/models";

type FaceStatus = {
  enrolled: boolean;
  last_enrolled_at: string | null;
  retakes_used: number;
  retakes_remaining: number;
  max_retakes: number;
};

type Step = "idle" | "loading" | "ready" | "capturing" | "done" | "error";

export default function FaceEnrollmentPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [info, setInfo] = useState<FaceStatus | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [retaking, setRetaking] = useState(false);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Step>("idle");
  const [message, setMessage] = useState("");

  function stopCamera() {
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
  }, []);

  async function loadModels() {
    setStatus("loading");
    setMessage("Loading face models...");
    try {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL);
      setStatus("ready");
      setMessage("Models ready. Click Start Camera.");
    } catch {
      setStatus("error");
      setMessage("Could not load face models.");
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus("capturing");
      setMessage("Hold still - look straight at the camera.");
    } catch {
      setStatus("error");
      setMessage("Camera access was blocked. Allow camera permission and try again.");
    }
  }

  async function capture() {
    if (!videoRef.current) return;
    setMessage("Detecting face...");
    const detection = await faceapi
      .detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) {
      setMessage("No face detected. Please try again with better lighting.");
      return;
    }
    const embedding = Array.from(detection.descriptor);
    setMessage("Uploading embedding...");
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
    status === "error" ? "#dc2626" : status === "done" ? "#16a34a" : undefined;

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

      <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        I consent to storing my face embedding for attendance verification.
      </label>

      {status === "idle" && (
        <button
          disabled={!consent}
          onClick={loadModels}
          style={{ padding: "0.6rem 1.2rem", cursor: consent ? "pointer" : "not-allowed" }}
        >
          Load Face Models
        </button>
      )}

      {status === "ready" && (
        <button onClick={startCamera} style={{ padding: "0.6rem 1.2rem" }}>
          Start Camera
        </button>
      )}

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: "100%", borderRadius: 12, marginTop: "1rem",
          display: status === "capturing" ? "block" : "none",
        }}
      />

      {status === "capturing" && (
        <button
          onClick={capture}
          style={{
            marginTop: "0.8rem", padding: "0.7rem 1.4rem", background: "#2563eb",
            color: "#fff", borderRadius: 8, border: "none", cursor: "pointer",
          }}
        >
          Capture &amp; Enroll
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

      {retaking && (
        <button onClick={cancelRetake} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
          Cancel
        </button>
      )}
    </div>
  );
}
