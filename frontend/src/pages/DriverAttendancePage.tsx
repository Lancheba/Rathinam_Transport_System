import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Bus as BusIcon, ClipboardCheck, Download, LoaderCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getMyBus, setMyBus, getAttendanceHistory, exportAttendance,
} from "../api/endpoints";
import type { Bus, AttendanceSession } from "../types";

export const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", marginTop: 4, fontSize: 14, outline: "none",
  background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)",
  borderRadius: 8, color: "var(--text-strong)", fontFamily: "inherit", boxSizing: "border-box",
};
export const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, color: "var(--text-muted)", fontWeight: 600 };
export const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
  border: "1px solid var(--accent-indigo)", background: "rgba(99,102,241,0.15)",
  color: "var(--text-strong)", fontWeight: 700, fontSize: 14, cursor: "pointer",
};
export const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8,
  border: "1px solid rgba(99,102,241,0.2)", background: "transparent",
  color: "var(--text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer",
};

export const errorText = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (data && typeof data === "object") {
      const first = Object.values(data as Record<string, unknown>)[0];
      const msg = Array.isArray(first) ? first[0] : first;
      if (typeof msg === "string") return msg;
    }
  }
  return fallback;
};

/* --------------------------------------------------- Claim-a-bus setup form */

export const ClaimBusForm: React.FC<{ onClaimed: (bus: Bus) => void }> = ({ onClaimed }) => {
  const [busNumber, setBusNumber] = useState("");
  const [studentCap, setStudentCap] = useState("");
  const [teacherCap, setTeacherCap] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busNumber.trim()) { setError("Enter your bus number."); return; }
    setBusy(true); setError("");
    try {
      const res = await setMyBus({
        bus_number: busNumber.trim(),
        student_capacity: studentCap ? Number(studentCap) : undefined,
        teacher_capacity: teacherCap ? Number(teacherCap) : undefined,
      });
      if (res.bus) onClaimed(res.bus);
    } catch (err) {
      setError(errorText(err, "Couldn't link that bus to your account."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: 12 }}>
      <label style={labelStyle}>Bus number
        <input style={inputStyle} value={busNumber} onChange={e => setBusNumber(e.target.value)}
          placeholder="e.g. B04" autoFocus />
      </label>
      <label style={labelStyle}>Student capacity (optional)
        <input style={inputStyle} type="number" min={0} value={studentCap} onChange={e => setStudentCap(e.target.value)} />
      </label>
      <label style={labelStyle}>Teacher capacity (optional)
        <input style={inputStyle} type="number" min={0} value={teacherCap} onChange={e => setTeacherCap(e.target.value)} />
      </label>
      {error && <div role="alert" style={{ color: "var(--accent-red)", fontSize: 13 }}>{error}</div>}
      <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1, justifyContent: "center" }}>
        {busy ? <LoaderCircle size={16} className="spin" /> : <BusIcon size={16} />} Link my bus
      </button>
    </form>
  );
};

/* --------------------------------------------------------- History tab */

const HistoryTab: React.FC = () => {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<"csv" | "xlsx" | "pdf" | "">("");

  useEffect(() => {
    getAttendanceHistory()
      .then(setSessions)
      .catch(() => setError("Couldn't load attendance history."))
      .finally(() => setLoading(false));
  }, []);

  const doExport = async (filetype: "csv" | "xlsx" | "pdf") => {
    setExporting(filetype);
    try { await exportAttendance(filetype); }
    catch { setError("Export failed."); }
    finally { setExporting(""); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["csv", "xlsx", "pdf"] as const).map(ft => (
          <button key={ft} type="button" onClick={() => doExport(ft)} disabled={exporting !== ""} style={ghostBtn}>
            {exporting === ft ? <LoaderCircle size={13} className="spin" /> : <Download size={13} />} {ft.toUpperCase()}
          </button>
        ))}
      </div>

      {error && <div role="alert" style={{ color: "var(--accent-red)", marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div style={{ color: "var(--text-dim)" }}>Loading...</div>
      ) : sessions.length === 0 ? (
        <div style={{ color: "var(--text-dim)" }}>No attendance has been submitted yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sessions.map(s => (
            <div key={s.id} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", borderRadius: 10,
              border: "1px solid rgba(99,102,241,0.14)", background: "rgba(99,102,241,0.04)", fontSize: 13,
            }}>
              <span style={{ color: "var(--text-strong)", fontWeight: 700, width: 100 }}>{s.date}</span>
              {s.is_holiday ? (
                <span style={{ color: "var(--accent-amber)" }}>Holiday{s.holiday_reason ? ` - ${s.holiday_reason}` : ""}</span>
              ) : (
                <>
                  <span style={{ color: "var(--accent-green)" }}>{s.present_count} present</span>
                  <span style={{ color: "var(--accent-red)" }}>{s.absent_count} absent</span>
                  <span style={{ color: "var(--text-dim)" }}>of {s.total_count}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ----------------------------------------------------------------------- Page */

const DriverAttendancePage: React.FC = () => {
  const { isLoggedIn, role } = useAuth();
  const [bus, setBus] = useState<Bus | null | undefined>(undefined);

  useEffect(() => {
    if (role !== "DRIVER") return;
    getMyBus().then(r => setBus(r.bus)).catch(() => setBus(null));
  }, [role]);

  if (!isLoggedIn || role !== "DRIVER") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "60px 20px", textAlign: "center" }}>
        <ClipboardCheck size={32} style={{ color: "var(--accent-amber)" }} />
        <h2 style={{ color: "var(--text-strong)", margin: 0 }}>Driver attendance</h2>
        <p style={{ color: "var(--text-muted)", maxWidth: 420, fontSize: 14, margin: 0 }}>
          This page is for signed-in drivers to view student and teacher attendance history on their bus.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: "var(--accent-amber)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <ClipboardCheck size={20} strokeWidth={1.9} /> Attendance
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 18px" }}>
        {bus
          ? `Attendance for bus ${bus.bus_number} is taken via QR/face check-in - this is your submission history.`
          : "Link your bus to view its attendance history."}
      </p>

      {bus === undefined ? (
        <div style={{ color: "var(--text-dim)" }}>Loading...</div>
      ) : bus === null ? (
        <ClaimBusForm onClaimed={setBus} />
      ) : (
        <HistoryTab />
      )}
    </div>
  );
};

export default DriverAttendancePage;