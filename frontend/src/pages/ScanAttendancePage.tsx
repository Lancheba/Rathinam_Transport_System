import { useRef, useState, useEffect, useCallback } from "react";
import jsQR from "jsqr";
import * as faceapi from "face-api.js";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { DETECTOR_OPTIONS, getFaceGuidance, loadFastFaceModels } from "../utils/faceGuidance";

const MODELS_URL = "/models";
const FACE_LOCK_TIMEOUT_MS = 6000; // give up and show an error after this long
const DETECT_INTERVAL_MS = 150;

type Stage = "loading" | "scanning" | "verifying" | "done" | "error";

export default function ScanAttendancePage() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const navigate  = useNavigate();

  const [stage, setStage]     = useState<Stage>("loading");
  const [message, setMessage] = useState("Loading face models…");
  const [guidanceOk, setGuidanceOk] = useState(false);
  const [slot, setSlot]       = useState("");
  const [markedAt, setMarkedAt] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadFastFaceModels(MODELS_URL);
      if (cancelled) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStage("scanning");
      setMessage("Point your camera at the in-charge's QR code.");
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

  // Poll with the fast tiny-detector (no landmarks/descriptor) until a
  // well-centered, well-sized face is seen, giving live guidance the whole
  // time instead of blindly waiting a fixed 800ms and hoping for the best.
  async function waitForGoodFace(): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < FACE_LOCK_TIMEOUT_MS) {
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        const detection = await faceapi.detectSingleFace(video, DETECTOR_OPTIONS);
        if (!detection) {
          setGuidanceOk(false);
          setMessage("Bring your face into the frame");
        } else {
          const guidance = getFaceGuidance(detection.box, video.videoWidth, video.videoHeight);
          setGuidanceOk(guidance.ok);
          setMessage(guidance.text);
          if (guidance.ok) return true;
        }
      }
      await new Promise((r) => setTimeout(r, DETECT_INTERVAL_MS));
    }
    return false;
  }

  async function handleQR(raw: string) {
    cancelAnimationFrame(rafRef.current);
    setStage("verifying");
    setMessage("QR detected — switching to front camera…");

    let payload: { token: string };
    try { payload = JSON.parse(raw); }
    catch { setStage("error"); setMessage("Invalid QR format."); return; }

    // Switch to front camera for face capture
    streamRef.current?.getTracks().forEach(t => t.stop());
    let frontStream: MediaStream;
    try {
      frontStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    } catch {
      setStage("error");
      setMessage("Could not access the front camera.");
      return;
    }
    streamRef.current = frontStream;
    if (videoRef.current) videoRef.current.srcObject = frontStream;

    const gotGoodFace = await waitForGoodFace();
    if (!gotGoodFace) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      setStage("error");
      setMessage("Could not get a clear look at your face. Try again with better lighting.");
      return;
    }

    setMessage("Hold still — verifying…");
    const detection = await faceapi
      .detectSingleFace(videoRef.current!, DETECTOR_OPTIONS)
      .withFaceLandmarks()
      .withFaceDescriptor();

    streamRef.current?.getTracks().forEach(t => t.stop());

    if (!detection) {
      setStage("error");
      setMessage("Lost the face — try again with better lighting.");
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
        style={{
          width: "100%", borderRadius: 12, background: "#000",
          border: stage === "verifying" ? `3px solid ${guidanceOk ? "#16a34a" : "#f59e0b"}` : "3px solid transparent",
        }} />
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
