import pathlib

# ── 1. FaceEnrollmentPage.tsx ────────────────────────────────────────────────
face_enrollment = r"""import React, { useRef, useState, useEffect } from "react";
import * as faceapi from "face-api.js";
import api from "../api/client";

const MODELS_URL = "/models";

export default function FaceEnrollmentPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
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
    setModelsLoaded(true);
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
"""

# ── 2. ScanAttendancePage.tsx ────────────────────────────────────────────────
scan_attendance = r"""import React, { useRef, useState, useEffect, useCallback } from "react";
import jsQR from "jsqr";
import * as faceapi from "face-api.js";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

const MODELS_URL = "/models";

type Stage = "loading"|"scanning"|"verifying"|"done"|"error";

export default function ScanAttendancePage() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const navigate  = useNavigate();

  const [stage, setStage]     = useState<Stage>("loading");
  const [message, setMessage] = useState("Loading face models…");
  const [slot, setSlot]       = useState("");
  const [markedAt, setMarkedAt] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL);
      if (cancelled) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStage("scanning");
      setMessage("Point your camera at the driver's QR code.");
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const scanFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const ctx = canvas.getContext("2d")!;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = jsQR(imageData.data, imageData.width, imageData.height);
    if (qr) {
      handleQR(qr.data);
    } else {
      rafRef.current = requestAnimationFrame(scanFrame);
    }
  }, []);

  useEffect(() => {
    if (stage === "scanning") {
      rafRef.current = requestAnimationFrame(scanFrame);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [stage, scanFrame]);

  async function handleQR(raw: string) {
    cancelAnimationFrame(rafRef.current);
    setStage("verifying");
    setMessage("QR detected — verifying your face…");

    let payload: { token: string };
    try { payload = JSON.parse(raw); }
    catch { setStage("error"); setMessage("Invalid QR format."); return; }

    // Switch to front camera for face capture
    streamRef.current?.getTracks().forEach(t => t.stop());
    const frontStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
    });
    streamRef.current = frontStream;
    if (videoRef.current) videoRef.current.srcObject = frontStream;

    // Brief pause so the camera adjusts
    await new Promise(r => setTimeout(r, 800));

    const detection = await faceapi
      .detectSingleFace(videoRef.current!)
      .withFaceLandmarks()
      .withFaceDescriptor();

    streamRef.current?.getTracks().forEach(t => t.stop());

    if (!detection) {
      setStage("error");
      setMessage("No face detected. Try again with better lighting.");
      return;
    }

    try {
      const res = await api.post("/attendance/qr/scan/", {
        token: payload.token,
        embedding: Array.from(detection.descriptor),
      });
      setStage("done");
      setSlot(res.data.slot);
      setMarkedAt(new Date(res.data.marked_at).toLocaleTimeString("en-IN"));
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? "Scan failed.";
      if (detail.includes("Face not enrolled")) {
        setStage("error");
        setMessage("Face not enrolled yet. Enrolling now…");
        setTimeout(() => navigate("/dashboard/face-enrollment"), 1500);
        return;
      }
      setStage("error");
      setMessage(detail);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "2rem auto", padding: "1rem", textAlign: "center" }}>
      <h2>Scan Attendance</h2>

      <video ref={videoRef} autoPlay muted playsInline
        style={{ width: "100%", borderRadius: 12, background: "#000" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <p style={{ marginTop: "1rem", fontWeight: 500,
                  color: stage === "error" ? "#dc2626" : stage === "done" ? "#16a34a" : undefined }}>
        {stage === "done"
          ? `✅ Marked Present — ${slot} at ${markedAt}`
          : message}
      </p>

      {(stage === "error" || stage === "done") && (
        <button onClick={() => navigate("/dashboard/my-attendance")}
          style={{ marginTop: "1rem", padding: "0.6rem 1.2rem" }}>
          ← Back to My Attendance
        </button>
      )}
    </div>
  );
}
"""

# ── 3. QRDisplaySection.tsx  (embedded in DriverAttendancePage) ──────────────
qr_section = r"""import React, { useState, useEffect, useRef } from "react";
import api from "../api/client";

interface QRData {
  qr_image_base64: string;
  token: string;
  expires_at: string;
  session_id: number;
  slot: string;
  present_count: number;
  total_count: number;
}

export default function QRDisplaySection() {
  const [qrData, setQrData]       = useState<QRData | null>(null);
  const [active, setActive]        = useState(false);
  const [error, setError]          = useState("");
  const [countdown, setCountdown]  = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  function currentSlotLabel() {
    const h = new Date().getHours();
    if (h >= 5  && h < 10)  return "Morning";
    if (h >= 16 && h < 20)  return "Evening";
    return null;
  }

  async function fetchQR() {
    try {
      const res = await api.post<QRData>("/attendance/qr/generate/");
      setQrData(res.data);
      setError("");
      setCountdown(45);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to generate QR.");
    }
  }

  function start() {
    setActive(true);
    fetchQR();
    pollRef.current  = setInterval(fetchQR, 45_000);
    timerRef.current = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : 0)), 1_000);
  }

  function stop() {
    setActive(false);
    setQrData(null);
    clearInterval(pollRef.current!);
    clearInterval(timerRef.current!);
  }

  useEffect(() => () => { clearInterval(pollRef.current!); clearInterval(timerRef.current!); }, []);

  const label = currentSlotLabel();

  return (
    <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: 12,
                  padding: "1.25rem", marginBottom: "1.5rem" }}>
      <h3 style={{ marginTop: 0 }}>🟢 Smart QR Attendance {label ? `— ${label}` : ""}</h3>

      {!label && !active && (
        <p style={{ color: "#6b7280" }}>No attendance window is open right now.</p>
      )}

      {!active ? (
        <button onClick={start} disabled={!label}
          style={{ padding: "0.65rem 1.3rem", background: "#2563eb", color: "#fff",
                   borderRadius: 8, border: "none", cursor: label ? "pointer" : "not-allowed" }}>
          Start {label ?? "Attendance"}
        </button>
      ) : (
        <button onClick={stop}
          style={{ padding: "0.65rem 1.3rem", background: "#dc2626", color: "#fff",
                   borderRadius: 8, border: "none", cursor: "pointer" }}>
          Stop
        </button>
      )}

      {error && <p style={{ color: "#dc2626", marginTop: "0.75rem" }}>{error}</p>}

      {qrData && (
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <img
            src={`data:image/png;base64,${qrData.qr_image_base64}`}
            alt="Attendance QR"
            style={{ width: 220, height: 220, borderRadius: 8 }}
          />
          <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0.4rem 0 0" }}>
            Refreshing in {countdown}s
          </p>
          <p style={{ fontWeight: 600, margin: "0.5rem 0 0" }}>
            {qrData.present_count} / {qrData.total_count} present
          </p>
        </div>
      )}
    </div>
  );
}
"""

pages_dir = pathlib.Path("src/pages")
comp_dir  = pathlib.Path("src/components")
pages_dir.mkdir(parents=True, exist_ok=True)
comp_dir.mkdir(parents=True, exist_ok=True)

(pages_dir / "FaceEnrollmentPage.tsx").write_text(face_enrollment, encoding="utf-8")
print("Created: src/pages/FaceEnrollmentPage.tsx")

(pages_dir / "ScanAttendancePage.tsx").write_text(scan_attendance, encoding="utf-8")
print("Created: src/pages/ScanAttendancePage.tsx")

(comp_dir / "QRDisplaySection.tsx").write_text(qr_section, encoding="utf-8")
print("Created: src/components/QRDisplaySection.tsx")
