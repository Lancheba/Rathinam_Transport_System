import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, XCircle, CalendarOff, Clock, LoaderCircle, IdCard, Bus as BusIcon, LogOut,
} from "lucide-react";
import { getMyStudentLink, linkMyStudentProfile, unlinkMyStudentProfile, getMyAttendance, getQrStatus } from "../api/endpoints";
import type { QrStatus } from "../api/endpoints";
import type { MyStudentLink, MyAttendance, MyAttendanceDay, AttendanceSlot, AttendanceSource } from "../types";
import { inputStyle, labelStyle, primaryBtn, ghostBtn, errorText } from "./DriverAttendancePage";
import MyAttendanceAnalytics from "../components/MyAttendanceAnalytics";
import { ExportButton } from "../components/ExportButton";

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const sourceLabel = (source: AttendanceSource | null): string => {
  if (source === "MANUAL") return "Manual";
  if (source === "QR_FACE") return "QR + Face";
  if (source === "AUTO_ABSENT") return "Auto-absent";
  return "";
};

/** One day's outcome, resolved to an icon + colour + human label. */
const dayMeaning = (day: MyAttendanceDay) => {
  if (day.is_holiday) return { label: "Holiday", color: "var(--accent-amber)", Icon: CalendarOff };
  if (!day.marked || !day.status) return { label: "Not marked", color: "var(--text-dim)", Icon: Clock };
  if (day.status === "PRESENT") return { label: "Present", color: "var(--accent-green)", Icon: CheckCircle2 };
  return { label: "Absent", color: "var(--accent-red)", Icon: XCircle };
};

/* --------------------------------------------------- Link-my-account form */

const LinkAccountForm: React.FC<{ onLinked: (link: MyStudentLink) => void }> = ({ onLinked }) => {
  const [rollNumber, setRollNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber.trim()) { setError("Enter your roll number."); return; }
    setBusy(true); setError("");
    try {
      const res = await linkMyStudentProfile(rollNumber.trim());
      onLinked(res);
    } catch (err) {
      setError(errorText(err, "Couldn't link that roll number to your account."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="liquid-glass-card no-lift" style={{ padding: 24, maxWidth: 440 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span className="glass-orb" style={{ width: 36, height: 36, borderRadius: 12 }}>
          <IdCard size={18} strokeWidth={1.9} />
        </span>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-strong)" }}>Link your roll number</h2>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 16px" }}>
        Connect your login to your seat on the roster so you can see your own attendance,
        taken by your bus's driver.
      </p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={labelStyle}>Roll number
          <input
            style={inputStyle} value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            placeholder="e.g. 22CS045" autoFocus
          />
        </label>
        {error && <div role="alert" style={{ color: "var(--accent-red)", fontSize: 13 }}>{error}</div>}
        <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1, justifyContent: "center" }}>
          {busy ? <LoaderCircle size={16} className="spin" /> : <IdCard size={16} />} Link my account
        </button>
      </form>
    </div>
  );
};

/* ------------------------------------------------------------ Today card */

const TodayCard: React.FC<{ day: MyAttendanceDay }> = ({ day }) => {
  const { label, color, Icon } = dayMeaning(day);
  const showSource = day.marked && !day.is_holiday && day.source;
  return (
    <div className="liquid-glass-card no-lift" style={{ padding: 28, display: "flex", alignItems: "center", gap: 20 }}>
      <span
        className="glass-orb"
        style={{ width: 64, height: 64, borderRadius: 20, color, flexShrink: 0 }}
      >
        <Icon size={32} strokeWidth={1.8} />
      </span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>
          Today · {dayLabel(day.date)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color }}>{label}</span>
          {showSource && (
            <span
              style={{
                fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                background: "rgb(var(--ov) / 0.06)", border: "1px solid rgb(var(--ov) / 0.12)",
                color: "var(--text-muted)",
              }}
            >
              {sourceLabel(day.source)}
            </span>
          )}
        </div>
        {day.is_holiday && day.holiday_reason && (
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{day.holiday_reason}</div>
        )}
        {!day.marked && !day.is_holiday && (
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Your driver hasn't taken attendance for today yet.
          </div>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------ Recent trend */

const RecentTrend: React.FC<{ days: MyAttendanceDay[] }> = ({ days }) => (
  <div className="liquid-glass-card no-lift" style={{ padding: 20 }}>
    <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: 0.4 }}>
      Last 7 days
    </h3>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {days.map((day) => {
        const { label, color, Icon } = dayMeaning(day);
        const src = day.marked && !day.is_holiday ? sourceLabel(day.source) : "";
        return (
          <div
            key={day.date}
            title={src ? `${dayLabel(day.date)} — ${label} (${src})` : `${dayLabel(day.date)} — ${label}`}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              padding: "10px 12px", borderRadius: 12, minWidth: 74,
              background: "rgb(var(--ov) / 0.04)", border: "1px solid rgb(var(--ov) / 0.08)",
            }}
          >
            <Icon size={18} strokeWidth={1.9} color={color} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
              {new Date(`${day.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" })}
            </span>
            {src && (
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-dim)", letterSpacing: 0.3 }}>
                {src}
              </span>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

/* ------------------------------------------------------------------- Page */

export const MyAttendancePage: React.FC = () => {
  const [link, setLink] = useState<MyStudentLink | null>(null);
  const [attendance, setAttendance] = useState<MyAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeSlot, setActiveSlot] = useState<AttendanceSlot>("MORNING");

  const load = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const linkRes = await getMyStudentLink();
      setLink(linkRes);
      if (linkRes.linked) {
        setAttendance(await getMyAttendance());
      } else {
        setAttendance(null);
      }
    } catch (err) {
      setLoadError(errorText(err, "Couldn't load your attendance right now."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUnlink = async () => {
    if (!window.confirm("Unlink your account from this roll number?")) return;
    await unlinkMyStudentProfile();
    setLink({ linked: false, student: null });
    setAttendance(null);
  };

  const navigate = useNavigate();

  // Live session state from the server, polled every few seconds (paused while the tab is hidden).
  const [qrStatus, setQrStatus] = useState<QrStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const s = await getQrStatus();
        if (!cancelled) setQrStatus(s);
      } catch { /* keep last known state */ }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  const sessionOpen = !!qrStatus?.open;
  const alreadyMarked = !!qrStatus?.already_marked;

  // When the session opens/closes or this student gets marked, refresh the attendance table.
  useEffect(() => { if (qrStatus) load(); }, [qrStatus?.open, qrStatus?.already_marked]);

  const slotBlock = attendance ? attendance[activeSlot === "MORNING" ? "morning" : "evening"] : null;

  const slotTabStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, cursor: "pointer",
    fontSize: 13, fontWeight: 700,
    color: active ? "var(--text-strong)" : "var(--text-muted)",
    border: `1px solid ${active ? "var(--accent-indigo)" : "rgba(99,102,241,0.2)"}`,
    background: active ? "rgba(99,102,241,0.15)" : "transparent",
  });

  return (
    <div style={{ padding: "8px 4px 32px", maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-strong)", margin: 0 }}>My Attendance</h1>
        {sessionOpen && !alreadyMarked && (
          <button onClick={() => navigate("/dashboard/scan-attendance")}
            style={{ padding: "8px 16px", background: "#2563eb", color: "#fff",
                     borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700 }}>
            📷 Scan QR Attendance
          </button>
        )}
      </div>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 12px" }}>
        Whether you were marked present or absent on your bus, straight from your driver's attendance sheet.
      </p>
      {qrStatus && (
        <div role="status" style={{
          marginBottom: 14, padding: "10px 14px", borderRadius: 10, fontSize: 13.5, fontWeight: 600,
          color: sessionOpen ? (alreadyMarked ? "var(--accent-green, #22c55e)" : "var(--accent-amber, #f59e0b)") : "var(--text-muted)",
          border: "1px solid rgba(99,102,241,0.25)", background: "rgba(99,102,241,0.08)",
        }}>
          {sessionOpen
            ? (alreadyMarked
                ? "You are marked present for this session."
                : "Attendance is open for the " + (qrStatus.slot ?? "").toLowerCase() + " session. Tap Scan QR Attendance.")
            : "Attendance is closed right now."}
        </div>
      )}
      <button onClick={() => navigate("/dashboard/face-enrollment")}
        style={{ fontSize: 13, color: "var(--accent-indigo, #6366f1)", background: "none",
                 border: "none", cursor: "pointer", padding: 0, marginBottom: 16 }}>
        🪪 Update my Face ID
      </button>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 14 }}>
          <LoaderCircle size={16} className="spin" /> Loading…
        </div>
      )}

      {!loading && loadError && (
        <div role="alert" style={{ color: "var(--accent-red)", fontSize: 14 }}>{loadError}</div>
      )}

      {!loading && !loadError && link && !link.linked && (
        <LinkAccountForm onLinked={(res) => { setLink(res); load(); }} />
      )}

      {!loading && !loadError && link?.linked && link.student && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            className="liquid-pill"
            style={{
              display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 14px",
              width: "fit-content", fontSize: 13, color: "var(--text-strong)",
            }}
          >
            <IdCard size={15} /> {link.student.name} · {link.student.roll_number}
            {attendance?.bus_number && (
              <>
                <span style={{ opacity: 0.4 }}>|</span>
                <BusIcon size={15} /> Bus {attendance.bus_number}
              </>
            )}
            <button
              type="button" onClick={handleUnlink}
              style={{ ...ghostBtn, padding: "4px 8px", marginLeft: 6, fontSize: 12 }}
              title="Not you? Unlink this roll number"
            >
              <LogOut size={13} /> Unlink
            </button>
          </div>

          {!attendance?.bus_number && (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              You're not assigned to a bus yet, so there's no attendance to show. Ask transport staff to add you to a bus.
            </div>
          )}

          {attendance?.bus_number && (
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" style={slotTabStyle(activeSlot === "MORNING")} onClick={() => setActiveSlot("MORNING")}>
                Morning
              </button>
              <button type="button" style={slotTabStyle(activeSlot === "EVENING")} onClick={() => setActiveSlot("EVENING")}>
                Evening
              </button>
            </div>
          )}

          {slotBlock?.today && <TodayCard day={slotBlock.today} />}
          {slotBlock?.recent && slotBlock.recent.length > 0 && <RecentTrend days={slotBlock.recent} />}
          <ExportButton />
          <MyAttendanceAnalytics studentId={link.student.id} />
        </div>
      )}
    </div>
  );
};

export default MyAttendancePage;


