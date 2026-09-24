import { useState, useEffect, useRef } from "react";
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

interface WindowData {
  slot: "MORNING" | "EVENING" | null;
  school_day: boolean;
  morning: [string, string];
  evening: [string, string];
}

interface TallyData {
  slot: string;
  session_id: number | null;
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
  const tallyRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Which slot is open is decided by the SERVER (configured windows, IST clock,
  // holidays and weekends) so this screen can never disagree with the API.
  const [windowInfo, setWindowInfo] = useState<WindowData | null>(null);

  async function fetchWindow() {
    try {
      const res = await api.get<WindowData>("/attendance/qr/window/");
      setWindowInfo(res.data);
    } catch {
      // Keep the last known state; the server still enforces the window.
    }
  }

  function currentSlotLabel() {
    if (windowInfo?.slot === "MORNING") return "Morning";
    if (windowInfo?.slot === "EVENING") return "Evening";
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

  // Lightweight tally-only refresh — doesn't touch the QR image/token, so it
  // can run on a much tighter interval than the 45s QR regeneration cycle.
  async function fetchTally() {
    try {
      const res = await api.get<TallyData>("/attendance/qr/tally/");
      setQrData(prev =>
        prev
          ? { ...prev, present_count: res.data.present_count, total_count: res.data.total_count }
          : prev
      );
    } catch {
      // Silent — a missed tally tick isn't worth surfacing as an error;
      // the next 45s QR refresh will resync anyway.
    }
  }

  function start() {
    setActive(true);
    fetchQR();
    pollRef.current  = setInterval(fetchQR, 45_000);
    timerRef.current = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : 0)), 1_000);
    tallyRef.current = setInterval(fetchTally, 7_000);
  }

  function stop() {
    setActive(false);
    setQrData(null);
    clearInterval(pollRef.current!);
    clearInterval(timerRef.current!);
    clearInterval(tallyRef.current!);
  }

  useEffect(() => {
    fetchWindow();
    const id = setInterval(fetchWindow, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => {
    clearInterval(pollRef.current!);
    clearInterval(timerRef.current!);
    clearInterval(tallyRef.current!);
  }, []);

  const label = currentSlotLabel();

  return (
    <div style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: 12,
                  padding: "1.25rem", marginBottom: "1.5rem" }}>
      <h3 style={{ marginTop: 0 }}>🟢 Smart QR Attendance {label ? `— ${label}` : ""}</h3>

      {!label && !active && windowInfo && (
        <p style={{ color: "#6b7280" }}>
          {windowInfo.school_day
            ? `No attendance window is open right now. Morning ${windowInfo.morning[0]}\u2013${windowInfo.morning[1]}, evening ${windowInfo.evening[0]}\u2013${windowInfo.evening[1]}.`
            : "Attendance is not taken today (weekend or holiday)."}
        </p>
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
