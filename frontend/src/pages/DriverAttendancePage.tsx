import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Bus as BusIcon, CalendarDays, CheckCircle2, XCircle, Download, ClipboardCheck,
  LoaderCircle, History as HistoryIcon, Save,
} from "lucide-react";
import QRDisplaySection from "../components/QRDisplaySection";
import { useAuth } from "../context/AuthContext";
import {
  getMyBus, setMyBus, getRoster, submitAttendance, getAttendanceHistory, exportAttendance,
} from "../api/endpoints";
import type {
  Bus, AttendanceRoster, AttendanceRosterPerson, AttendanceRecordInput, AttendanceStatus, AttendanceSession,
} from "../types";

const todayStr = () => new Date().toISOString().slice(0, 10);

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

/* --------------------------------------------------------- Roster row */

const StatusButtons: React.FC<{
  value: AttendanceStatus | null;
  onChange: (s: AttendanceStatus) => void;
}> = ({ value, onChange }) => (
  <div style={{ display: "flex", gap: 6 }}>
    <button type="button" onClick={() => onChange("PRESENT")}
      aria-pressed={value === "PRESENT"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700,
        border: `1px solid ${value === "PRESENT" ? "var(--accent-green)" : "rgba(99,102,241,0.2)"}`,
        background: value === "PRESENT" ? "rgba(34,197,94,0.15)" : "transparent",
        color: value === "PRESENT" ? "var(--accent-green)" : "var(--text-muted)", cursor: "pointer",
      }}>
      <CheckCircle2 size={13} /> Present
    </button>
    <button type="button" onClick={() => onChange("ABSENT")}
      aria-pressed={value === "ABSENT"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700,
        border: `1px solid ${value === "ABSENT" ? "var(--accent-red)" : "rgba(99,102,241,0.2)"}`,
        background: value === "ABSENT" ? "rgba(248,113,113,0.15)" : "transparent",
        color: value === "ABSENT" ? "var(--accent-red)" : "var(--text-muted)", cursor: "pointer",
      }}>
      <XCircle size={13} /> Absent
    </button>
  </div>
);

const RosterRow: React.FC<{
  person: AttendanceRosterPerson;
  value: AttendanceStatus | null;
  onChange: (s: AttendanceStatus) => void;
}> = ({ person, value, onChange }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10,
    border: "1px solid rgba(99,102,241,0.14)", background: "rgba(99,102,241,0.04)",
  }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: "var(--text-strong)", fontWeight: 600, fontSize: 14 }}>{person.name}</div>
      <div style={{ color: "var(--text-dim)", fontSize: 12 }}>{person.roll_number ?? person.staff_id ?? ""}</div>
    </div>
    <StatusButtons value={value} onChange={onChange} />
  </div>
);

/* --------------------------------------------------------- Mark tab */

const MarkTab: React.FC<{ bus: Bus }> = ({ bus: _bus }) => {
  const [date, setDate] = useState(todayStr());
  const [roster, setRoster] = useState<AttendanceRoster | null>(null);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayReason, setHolidayReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const key = (type: "STUDENT" | "TEACHER", id: number) => `${type}:${id}`;

  const load = useCallback((d: string) => {
    setLoading(true); setError(""); setSavedMsg("");
    getRoster(d)
      .then((r) => {
        setRoster(r);
        setIsHoliday(r.is_holiday);
        setHolidayReason(r.holiday_reason ?? "");
        const initial: Record<string, AttendanceStatus> = {};
        r.students.forEach(s => { if (s.status) initial[key("STUDENT", s.id)] = s.status; });
        r.teachers.forEach(t => { if (t.status) initial[key("TEACHER", t.id)] = t.status; });
        setStatuses(initial);
      })
      .catch(() => setError("Couldn't load the roster for this date."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  const setStatus = (type: "STUDENT" | "TEACHER", id: number, s: AttendanceStatus) =>
    setStatuses(prev => ({ ...prev, [key(type, id)]: s }));

  const markAll = (s: AttendanceStatus) => {
    if (!roster) return;
    const next: Record<string, AttendanceStatus> = {};
    roster.students.forEach(p => { next[key("STUDENT", p.id)] = s; });
    roster.teachers.forEach(p => { next[key("TEACHER", p.id)] = s; });
    setStatuses(next);
  };

  const submit = async () => {
    if (!roster) return;
    setSaving(true); setError(""); setSavedMsg("");
    try {
      const records: AttendanceRecordInput[] = isHoliday ? [] : [
        ...roster.students.map(p => ({ person_type: "STUDENT" as const, id: p.id, status: statuses[key("STUDENT", p.id)] ?? "PRESENT" })),
        ...roster.teachers.map(p => ({ person_type: "TEACHER" as const, id: p.id, status: statuses[key("TEACHER", p.id)] ?? "PRESENT" })),
      ];
      await submitAttendance({ date, is_holiday: isHoliday, holiday_reason: isHoliday ? holidayReason.trim() : "", records });
      setSavedMsg("Attendance saved.");
      load(date);
    } catch (err) {
      setError(errorText(err, "Couldn't save attendance."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ color: "var(--text-dim)" }}>Loading roster...</div>;
  if (!roster) return <div role="alert" style={{ color: "var(--accent-red)" }}>{error || "No roster available."}</div>;

  const total = roster.students.length + roster.teachers.length;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <label style={{ ...labelStyle, width: "auto" }}>Date
          <input type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)}
            style={{ ...inputStyle, width: "auto" }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)", fontWeight: 600, marginTop: 18 }}>
          <input type="checkbox" checked={isHoliday} onChange={e => setIsHoliday(e.target.checked)} />
          Mark as holiday / no service
        </label>
        {roster.already_marked && (
          <span style={{ marginTop: 18, fontSize: 12, color: "var(--accent-amber)", fontWeight: 700 }}>
            Already submitted for this date — saving again will update it.
          </span>
        )}
      </div>

      {isHoliday ? (
        <label style={{ ...labelStyle, maxWidth: 420, display: "block", marginBottom: 16 }}>Reason (optional)
          <input style={inputStyle} value={holidayReason} onChange={e => setHolidayReason(e.target.value)}
            placeholder="e.g. Public holiday" />
        </label>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button type="button" style={ghostBtn} onClick={() => markAll("PRESENT")}>Mark all present</button>
            <button type="button" style={ghostBtn} onClick={() => markAll("ABSENT")}>Mark all absent</button>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-dim)" }}>{total} on this bus</span>
          </div>

          {roster.students.length > 0 && (
            <>
              <h4 style={{ color: "var(--text-strong)", margin: "14px 0 8px" }}>Students</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {roster.students.map(p => (
                  <RosterRow key={`s-${p.id}`} person={p}
                    value={statuses[key("STUDENT", p.id)] ?? null}
                    onChange={s => setStatus("STUDENT", p.id, s)} />
                ))}
              </div>
            </>
          )}

          {roster.teachers.length > 0 && (
            <>
              <h4 style={{ color: "var(--text-strong)", margin: "18px 0 8px" }}>Teachers</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {roster.teachers.map(p => (
                  <RosterRow key={`t-${p.id}`} person={p}
                    value={statuses[key("TEACHER", p.id)] ?? null}
                    onChange={s => setStatus("TEACHER", p.id, s)} />
                ))}
              </div>
            </>
          )}

          {total === 0 && <div style={{ color: "var(--text-dim)" }}>No students or teachers are assigned to this bus yet.</div>}
        </>
      )}

      {error && <div role="alert" style={{ color: "var(--accent-red)", marginTop: 14 }}>{error}</div>}
      {savedMsg && <div role="status" style={{ color: "var(--accent-green)", marginTop: 14 }}>{savedMsg}</div>}

      <button type="button" onClick={submit} disabled={saving} style={{ ...primaryBtn, marginTop: 18, opacity: saving ? 0.6 : 1 }}>
        {saving ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />} {roster.already_marked ? "Update attendance" : "Submit attendance"}
      </button>
    </div>
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
                <span style={{ color: "var(--accent-amber)" }}>Holiday{s.holiday_reason ? ` — ${s.holiday_reason}` : ""}</span>
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
  const [tab, setTab] = useState<"mark" | "history">("mark");

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
          This page is for signed-in drivers to mark student and teacher attendance on their bus.
        </p>
      </div>
    );
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, cursor: "pointer",
    fontSize: 14, fontWeight: 700,
    color: active ? "var(--text-strong)" : "var(--text-muted)",
    border: `1px solid ${active ? "var(--accent-indigo)" : "rgba(99,102,241,0.2)"}`,
    background: active ? "rgba(99,102,241,0.15)" : "transparent",
  });

  return (
    <div>
      <h2 style={{ color: "var(--accent-amber)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <ClipboardCheck size={20} strokeWidth={1.9} /> Attendance
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 18px" }}>
        {bus ? `Marking attendance for bus ${bus.bus_number}.` : "Link your bus to start marking attendance."}
      </p>

      {bus === undefined ? (
        <div style={{ color: "var(--text-dim)" }}>Loading...</div>
      ) : bus === null ? (
        <ClaimBusForm onClaimed={setBus} />
      ) : (
        <>
          <QRDisplaySection />
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <button type="button" style={tabStyle(tab === "mark")} onClick={() => setTab("mark")}>
              <CalendarDays size={14} /> Mark attendance
            </button>
            <button type="button" style={tabStyle(tab === "history")} onClick={() => setTab("history")}>
              <HistoryIcon size={14} /> History
            </button>
          </div>
          {tab === "mark" ? <MarkTab bus={bus} /> : <HistoryTab />}
        </>
      )}
    </div>
  );
};

export default DriverAttendancePage;
