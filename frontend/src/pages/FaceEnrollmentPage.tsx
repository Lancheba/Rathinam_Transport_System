import { useRef, useState, useEffect } from "react";
import * as faceapi from "face-api.js";
import api from "../api/client";

const MODELS_URL = "/models";

export default function FaceEnrollmentPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle"|"loading"|"ready"|"capturing"|"done"|"error">("idle");
  const [message, setMessage] = useState("");
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  async function loadModels() {
    setStatus("loading");
    setMessage("Loading face models…");
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL);
    setStatus("ready");
    setMessage("Models ready. Click Start Camera.");
  }

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
    setStatus("capturing");
    setMessage("Hold still — look straight at the camera.");
  }

  async function capture() {
    if (!videoRef.current) return;
    setMessage("Detecting face…");
    const detection = await faceapi
      .detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) {
      setMessage("No face detected. Please try again with better lighting.");
      return;
    }
    const embedding = Array.from(detection.descriptor);
    setMessage("Uploading embedding…");
    try {
      await api.post("/students/me/face-enrollment/", { embedding, consent: true });
      setStatus("done");
      setMessage("✅ Face enrolled successfully!");
      streamRef.current?.getTracks().forEach(t => t.stop());
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.response?.data?.detail ?? "Enrollment failed.");
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "2rem auto", padding: "1rem" }}>
      <h2>Face Enrollment</h2>
      <p style={{ fontSize: "0.9rem", color: "var(--text-secondary, #666)" }}>
        Your face data is converted to a numeric vector inside your browser.
        No photo is ever uploaded. You can delete it any time.
      </p>

      <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1rem" }}>
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
        I consent to storing my face embedding for attendance verification.
      </label>

      {status === "idle" && (
        <button disabled={!consent} onClick={loadModels}
          style={{ padding: "0.6rem 1.2rem", cursor: consent ? "pointer" : "not-allowed" }}>
          Load Face Models
        </button>
      )}

      {status === "ready" && (
        <button onClick={startCamera} style={{ padding: "0.6rem 1.2rem" }}>
          Start Camera
        </button>
      )}

      <video ref={videoRef} autoPlay muted playsInline
        style={{ width: "100%", borderRadius: 12, marginTop: "1rem",
                 display: status === "capturing" ? "block" : "none" }} />

      {status === "capturing" && (
        <button onClick={capture}
          style={{ marginTop: "0.8rem", padding: "0.7rem 1.4rem",
                   background: "#2563eb", color: "#fff", borderRadius: 8, border: "none", cursor: "pointer" }}>
          📸 Capture &amp; Enroll
        </button>
      )}

      {message && (
        <p style={{ marginTop: "1rem", fontWeight: 500,
                    color: status === "error" ? "#dc2626" : status === "done" ? "#16a34a" : undefined }}>
          {message}
        </p>
      )}

      {status === "done" && (
        <button onClick={() => window.history.back()}
          style={{ marginTop: "1rem", padding: "0.6rem 1.2rem" }}>
          ← Back
        </button>
      )}
    </div>
  );
}
