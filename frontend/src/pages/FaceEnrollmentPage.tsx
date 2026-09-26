import { useRef, useState, useEffect, useCallback } from "react";
import * as faceapi from "face-api.js";
import api from "../api/client";
import {
  DETECTOR_OPTIONS,
  getFaceGuidance,
  loadFastFaceModels,
} from "../utils/faceGuidance";

const MODELS_URL = "/models";
const STABLE_FRAMES_REQUIRED = 6;
const DETECT_INTERVAL_MS = 150;

type FaceStatus = {
  enrolled: boolean;
  last_enrolled_at: string | null;
};

type Step =
  | "idle"
  | "loading"
  | "capturing"
  | "processing"
  | "done"
  | "error"
  | "duplicate";

function Spinner() {
  return (
    <span
      style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        border: "3px solid #e5e7eb",
        borderTopColor: "#2563eb",
        display: "inline-block",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}

function BanWarning({ onTryAgain }: { onTryAgain: () => void }) {
  return (
    <div
      style={{
        marginTop: "1.5rem",
        padding: "1.25rem",
        borderRadius: 12,
        background: "#fef2f2",
        border: "2px solid #fca5a5",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "1.6rem" }}>🚫</span>
        <strong style={{ color: "#991b1b", fontSize: "1rem" }}>
          Duplicate Face Detected
        </strong>
      </div>
      <p style={{ margin: "0 0 0.5rem", color: "#7f1d1d", fontWeight: 600 }}>
        This face is already registered to a different account.
      </p>
      <p style={{ margin: "0 0 0.75rem", color: "#b91c1c", fontSize: "0.9rem" }}>
        Please use your own correct credentials to log in and enroll your face.
      </p>
      <div
        style={{
          padding: "0.75rem 1rem",
          borderRadius: 8,
          background: "#fee2e2",
          border: "1px solid #f87171",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#7f1d1d" }}>
          ⚠️ <strong>Warning:</strong> Attempting to register another student's
          face is a violation of the app rules. This incident has been logged.
          Repeated violations may result in a{" "}
          <strong>permanent account ban</strong> and escalation to your
          institution.
        </p>
      </div>
      <button
        onClick={onTryAgain}
        style={{
          marginTop: "1rem",
          padding: "0.55rem 1.2rem",
          background: "#1d4ed8",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: "0.9rem",
        }}
      >
        ← Go back
      </button>
    </div>
  );
}

export default function FaceEnrollmentPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const stableCountRef = useRef(0);
  const capturingRef = useRef(false);

  const [info, setInfo] = useState<FaceStatus | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [retaking, setRetaking] = useState(false);
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState("");
  const [guidanceOk, setGuidanceOk] = useState(false);
  const [progress, setProgress] = useState(0);
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
      setStep("error");
      setMessage(
        e?.response?.data?.detail ?? "Could not load face enrollment status."
      );
    } finally {
      setLoadingInfo(false);
    }
  }

  useEffect(() => {
    refreshInfo();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runDetectionTick = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || capturingRef.current) return;

    const detection = await faceapi.detectSingleFace(video, DETECTOR_OPTIONS);

    if (!detection) {
      stableCountRef.current = 0;
      setGuidanceOk(false);
      setProgress(0);
      setMessage("Bring your face into the frame");
      return;
    }

    const guidance = getFaceGuidance(detection.box, video.videoWidth, video.videoHeight);
    setGuidanceOk(guidance.ok);
    setMessage(guidance.text);

    if (guidance.ok) {
      stableCountRef.current += 1;
      setProgress(Math.min(stableCountRef.current / STABLE_FRAMES_REQUIRED, 1));
      if (stableCountRef.current >= STABLE_FRAMES_REQUIRED) {
        void finalizeCapture();
      }
    } else {
      stableCountRef.current = 0;
      setProgress(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnrollmentFlow() {
    setStep("loading");
    setMessage("Loading face models…");

    try {
      await loadFastFaceModels(MODELS_URL);
    } catch {
      setStep("error");
      setMessage("Could not load face models. Check your connection and try again.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setStep("error");
      setMessage("Camera access was blocked. Allow camera permission and try again.");
      return;
    }

    setStep("capturing");
    setMessage("Position your face in the frame");
    stableCountRef.current = 0;
    capturingRef.current = false;
    setProgress(0);
    setCanForceCapture(false);

    window.setTimeout(() => setCanForceCapture(true), 3000);
    intervalRef.current = window.setInterval(runDetectionTick, DETECT_INTERVAL_MS);
  }

  async function finalizeCapture() {
    if (capturingRef.current) return;
    capturingRef.current = true;
    stopDetectionLoop();
    setProgress(1);
    setStep("processing");
    setMessage("Hold still — capturing…");

    const video = videoRef.current;
    if (!video) { capturingRef.current = false; return; }

    const detection = await faceapi
      .detectSingleFace(video, DETECTOR_OPTIONS)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      capturingRef.current = false;
      setStep("capturing");
      setProgress(0);
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
      setStep("done");
      setMessage("Face enrolled successfully!");
    } catch (e: any) {
      stopCamera();
      const code: string | undefined = e?.response?.data?.code;
      const httpStatus: number | undefined = e?.response?.status;
      if (httpStatus === 409 && code === "FACE_DUPLICATE") {
        setStep("duplicate");
        setMessage("");
      } else {
        setStep("error");
        setMessage(e?.response?.data?.detail ?? "Enrollment failed.");
      }
      await refreshInfo();
    } finally {
      capturingRef.current = false;
    }
  }

  function startRetake() {
    setRetaking(true);
    setConsent(false);
    setStep("idle");
    setMessage("");
  }

  function cancelRetake() {
    stopCamera();
    setRetaking(false);
    setConsent(false);
    setStep("idle");
    setMessage("");
  }

  function resetToIdle() {
    stopCamera();
    setStep("idle");
    setMessage("");
    setProgress(0);
  }

  const messageColor =
    step === "error"
      ? "#dc2626"
      : step === "done"
      ? "#16a34a"
      : step === "capturing"
      ? guidanceOk ? "#16a34a" : "#b45309"
      : undefined;

  if (loadingInfo) {
    return <div style={{ maxWidth: 480, margin: "2rem auto", padding: "1rem" }}>Loading...</div>;
  }

  // Already enrolled
  if (info?.enrolled && !retaking) {
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

        <button
          onClick={startRetake}
          style={{ marginTop: "1rem", padding: "0.6rem 1.2rem", cursor: "pointer" }}
        >
          Update face enrollment
        </button>

        {message && (
          <p style={{ marginTop: "1rem", fontWeight: 500, color: messageColor }}>{message}</p>
        )}
      </div>
    );
  }

  // Not enrolled / retaking
  return (
    <div style={{ maxWidth: 480, margin: "2rem auto", padding: "1rem" }}>
      <style>{`
        @keyframes faceScanLine {
          0%   { top: 10%; opacity: 0.9; }
          50%  { top: 86%; opacity: 0.9; }
          100% { top: 10%; opacity: 0.9; }
        }
        @keyframes faceGlowPulseWarn {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.35); }
          50%      { box-shadow: 0 0 0 14px rgba(245,158,11,0); }
        }
        @keyframes faceGlowPulseOk {
          0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.4); }
          50%      { box-shadow: 0 0 0 16px rgba(22,163,74,0); }
        }
        @keyframes popIn {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1);  opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <h2>{retaking ? "Update Face Enrollment" : "Face Enrollment"}</h2>
      <p style={{ fontSize: "0.9rem", color: "var(--text-secondary, #666)" }}>
        Your face data is converted to a numeric vector inside your browser.
        No photo is ever uploaded. You can update it any time.
      </p>

      {step === "idle" && (
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
            {retaking ? "Start Update" : "Start Face Enrollment"}
          </button>
        </>
      )}

      {step === "loading" && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "1rem" }}>
          <Spinner />
          <span>{message}</span>
        </div>
      )}

      <div
        style={{
          position: "relative", marginTop: "1rem",
          display: step === "capturing" || step === "processing" ? "block" : "none",
        }}
      >
        <video
          ref={videoRef} autoPlay muted playsInline
          style={{ width: "100%", borderRadius: 12, display: "block", transform: "scaleX(-1)" }}
        />

        {(step === "capturing" || step === "processing") && (
          <div
            style={{
              position: "absolute", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center", pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: "56%", aspectRatio: "3 / 4", borderRadius: "50%",
                border: `3px dashed ${guidanceOk ? "#16a34a" : "#f59e0b"}`,
                position: "relative", overflow: "hidden",
                transition: "border-color 0.2s ease",
                animation: `${guidanceOk ? "faceGlowPulseOk" : "faceGlowPulseWarn"} 1.4s ease-in-out infinite`,
              }}
            >
              {step === "capturing" && !guidanceOk && (
                <div
                  style={{
                    position: "absolute", left: "8%", right: "8%", height: 3,
                    background: "linear-gradient(90deg,transparent,#f59e0b,transparent)",
                    animation: "faceScanLine 1.8s ease-in-out infinite", borderRadius: 2,
                  }}
                />
              )}
              {step === "processing" && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span
                    style={{
                      width: 44, height: 44, borderRadius: "50%", background: "#16a34a",
                      color: "#fff", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "1.5rem", animation: "popIn 0.35s ease-out",
                    }}
                  >
                    &#10003;
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {step === "capturing" && (
        <div style={{ marginTop: "0.6rem" }}>
          <div style={{ height: 6, borderRadius: 3, background: "#e5e7eb", overflow: "hidden" }}>
            <div
              style={{
                height: "100%", width: `${Math.round(progress * 100)}%`,
                background: guidanceOk ? "#16a34a" : "#f59e0b",
                transition: "width 0.15s ease, background-color 0.2s ease",
              }}
            />
          </div>
        </div>
      )}

      {step === "capturing" && canForceCapture && (
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

      {step === "duplicate" && <BanWarning onTryAgain={resetToIdle} />}

      {message && step !== "loading" && step !== "duplicate" && (
        <p style={{ marginTop: "1rem", fontWeight: 500, color: messageColor }}>{message}</p>
      )}

      {step === "error" && (
        <button
          onClick={resetToIdle}
          style={{ marginTop: "0.8rem", padding: "0.5rem 1rem", display: "block" }}
        >
          Try again
        </button>
      )}

      {retaking && step !== "processing" && step !== "duplicate" && (
        <button onClick={cancelRetake} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
          Cancel
        </button>
      )}
    </div>
  );
}
