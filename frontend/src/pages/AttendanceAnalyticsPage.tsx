import React, { useEffect, useState } from "react";
import {
  BarChart3, Download, LoaderCircle, Lock, CheckCircle2,
} from "lucide-react";
import {
  getAttendanceAnalyticsOverview, getStudentAttendanceAnalytics, getBuses, searchStudents, correctAttendanceRecord,
} from "../api/endpoints";
import { inputStyle, labelStyle, ghostBtn, errorText } from "./DriverAttendancePage";
import { useAuth } from "../context/AuthContext";
import type {
  AttendanceAnalyticsOverview, AttendanceStudentAnalytics, Bus, Student, AnalyticsPeriod,
} from "../types";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const cardStyle: React.CSSProperties = {
  padding: "16px 18px", borderRadius: 14, border: "1px solid rgba(99,102,241,0.14)",
  background: "rgba(99,102,241,0.04)", flex: 1, minWidth: 140,
};

const StatCard: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
  <div style={cardStyle}>
    <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 800, color: color ?? "var(--text-strong)", marginTop: 4 }}>{value}</div>
  </div>
);

const BarRow: React.FC<{ label: string; pct: number; sub: string }> = ({ label, pct, sub }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
    <div style={{ width: 90, fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{label}</div>
    <div style={{ flex: 1, height: 10, borderRadius: 6, background: "rgba(99,102,241,0.08)", overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, pct))}%`, height: "100%",
        background: pct >= 75 ? "var(--accent-green)" : pct >= 50 ? "var(--accent-amber)" : "var(--accent-red)",
        borderRadius: 6, transition: "width 0.3s",
      }} />
    </div>
    <div style={{ width: 110, fontSize: 12, color: "var(--text-dim)", textAlign: "right", flexShrink: 0 }}>{sub}</div>
  </div>
);

const AttendanceAnalyticsPage: React.FC = () => {
  const { canManageBuses } = useAuth();
  const [period, setPeriod] = useState<AnalyticsPeriod>("monthly");
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [busId, setBusId] = useState("");
  const [department, setDepartment] = useState("");
  const [overview, setOverview] = useState<AttendanceAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Student[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<{ id: number; name: string; roll_number: string } | null>(null);
  const [studentData, setStudentData] = useState<AttendanceStudentAnalytics | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [correcting, setCorrecting] = useState<number | null>(null);

  useEffect(() => { getBuses().then(setBuses).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true); setError("");
    getAttendanceAnalyticsOverview({
      period, year,
      ...(period === "monthly" ? { month } : {}),
      ...(busId ? { bus: Number(busId) } : {}),
      ...(department.trim() ? { department: department.trim() } : {}),
    })
      .then(setOverview)
      .catch(err => setError(errorText(err, "Couldn't load attendance analytics.")))
      .finally(() => setLoading(false));
  }, [period, year, month, busId, department]);

  const runSearch = (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    searchStudents(q.trim()).then(setResults).catch(() => setResults([])).finally(() => setSearching(false));
  };

  const loadStudent = (s: { id: number; name: string; roll_number: string }) => {
    setSelected(s); setResults([]); setQuery(""); setStudentLoading(true);
    getStudentAttendanceAnalytics(s.id, { year, ...(period === "monthly" ? { month } : {}) })
      .then(setStudentData)
      .catch(() => setError("Couldn't load that student's attendance."))
      .finally(() => setStudentLoading(false));
  };

  const markPresent = async (recordId: number) => {
    if (!selected) return;
    setCorrecting(recordId);
    try {
      await correctAttendanceRecord(recordId);
      loadStudent(selected);
    } catch (err) {
      setError(errorText(err, "Couldn't correct that record."));
    } finally {
      setCorrecting(null);
    }
  };

  const exportCsv = () => {
    if (!overview) return;
    const rows: string[][] = [["Bus", "Present", "Total", "Attendance %"]];
    overview.by_bus.forEach(b => rows.push([b.bus_number, String(b.present), String(b.total), `${b.pct}%`]));
    rows.push([]);
    rows.push(["Top absentees", "Roll No.", "Absences"]);
    overview.top_absentees.forEach(a => rows.push([a.name, a.roll_number, String(a.absences)]));
    const csv = rows.map(r => r.join(",")).join("\\n");
    const url = window.URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_analytics_${year}${period === "monthly" ? `_${month}` : ""}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h2 style={{ color: "var(--accent-amber)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <BarChart3 size={20} strokeWidth={1.9} /> Attendance Analytics
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 18px" }}>
        Cohort-wide trends and per-student drill-down.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 18 }}>
        <label style={{ ...labelStyle, width: "auto" }}>Period
          <select style={{ ...inputStyle, width: "auto" }} value={period} onChange={e => setPeriod(e.target.value as AnalyticsPeriod)}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
        <label style={{ ...labelStyle, width: "auto" }}>Year
          <input type="number" style={{ ...inputStyle, width: 100 }} value={year} onChange={e => setYear(Number(e.target.value))} />
        </label>
        {period === "monthly" && (
          <label style={{ ...labelStyle, width: "auto" }}>Month
            <select style={{ ...inputStyle, width: "auto" }} value={month} onChange={e => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString("default", { month: "long" })}</option>
              ))}
            </select>
          </label>
        )}
        <label style={{ ...labelStyle, width: "auto" }}>Bus
          <select style={{ ...inputStyle, width: "auto" }} value={busId} onChange={e => setBusId(e.target.value)}>
            <option value="">All buses</option>
            {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number}</option>)}
          </select>
        </label>
        <label style={{ ...labelStyle, width: "auto" }}>Department
          <input style={{ ...inputStyle, width: 140 }} value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. CSE" />
        </label>
        <button type="button" style={ghostBtn} onClick={exportCsv} disabled={!overview}>
          <Download size={13} /> Export CSV
        </button>
      </div>

      <div style={{ position: "relative", maxWidth: 360, marginBottom: 20 }}>
        <label style={labelStyle}>Search a student
          <input style={inputStyle} value={query} onChange={e => runSearch(e.target.value)} placeholder="Name or roll number..." />
        </label>
        {searching && <LoaderCircle size={14} className="spin" style={{ position: "absolute", right: 10, top: 34 }} />}
        {results.length > 0 && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 5, marginTop: 4,
            background: "var(--surface-side)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10,
            maxHeight: 220, overflowY: "auto",
          }}>
            {results.map(s => (
              <div key={s.id} onClick={() => loadStudent(s)}
                style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "var(--text-strong)" }}>
                {s.name} <span style={{ color: "var(--text-dim)" }}>({s.roll_number})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div role="alert" style={{ color: "var(--accent-red)", marginBottom: 14 }}>{error}</div>}

      {loading ? (
        <div style={{ color: "var(--text-dim)" }}>Loading analytics...</div>
      ) : overview && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
            <StatCard label="Overall attendance" value={`${overview.overall_pct}%`} color="var(--accent-green)" />
            <StatCard label="Present" value={overview.present_count} color="var(--accent-green)" />
            <StatCard label="Absent" value={overview.absent_count} color="var(--accent-red)" />
            <StatCard label="Total records" value={overview.total_count} />
          </div>

          <h4 style={{ color: "var(--text-strong)", marginBottom: 10 }}>Attendance trend</h4>
          <div style={{ marginBottom: 22 }}>
            {overview.trend.length === 0
              ? <div style={{ color: "var(--text-dim)", fontSize: 13 }}>No data for this period.</div>
              : overview.trend.map(t => <BarRow key={t.label} label={t.label} pct={t.pct} sub={`${t.present}/${t.total} (${t.pct}%)`} />)}
          </div>

          <h4 style={{ color: "var(--text-strong)", marginBottom: 10 }}>Bus-wise comparison</h4>
          <div style={{ marginBottom: 22 }}>
            {overview.by_bus.length === 0
              ? <div style={{ color: "var(--text-dim)", fontSize: 13 }}>No data for this period.</div>
              : overview.by_bus.map(b => <BarRow key={b.bus_id} label={b.bus_number} pct={b.pct} sub={`${b.present}/${b.total} (${b.pct}%)`} />)}
          </div>

          <h4 style={{ color: "var(--text-strong)", marginBottom: 10 }}>Top absentees</h4>
          {overview.top_absentees.length === 0 ? (
            <div style={{ color: "var(--text-dim)", fontSize: 13 }}>No absences recorded for this period.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {overview.top_absentees.map(a => (
                <div key={a.student_id} onClick={() => loadStudent({ id: a.student_id, name: a.name, roll_number: a.roll_number })}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", borderRadius: 10, cursor: "pointer",
                    border: "1px solid rgba(99,102,241,0.14)", background: "rgba(99,102,241,0.04)", fontSize: 13,
                  }}>
                  <span style={{ color: "var(--text-strong)", fontWeight: 600, flex: 1 }}>{a.name}</span>
                  <span style={{ color: "var(--text-dim)" }}>{a.roll_number}</span>
                  <span style={{ color: "var(--accent-red)", fontWeight: 700 }}>{a.absences} absent</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selected && (
        <div style={{
          marginTop: 28, padding: 18, borderRadius: 14, border: "1px solid rgba(99,102,241,0.2)",
          background: "rgba(99,102,241,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h4 style={{ color: "var(--text-strong)", margin: 0 }}>
              {selected.name} <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>({selected.roll_number})</span>
            </h4>
            <button type="button" style={ghostBtn} onClick={() => { setSelected(null); setStudentData(null); }}>Close</button>
          </div>
          {studentLoading ? (
            <div style={{ color: "var(--text-dim)" }}>Loading...</div>
          ) : studentData && (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <StatCard label="Attendance %" value={`${studentData.attendance_pct}%`} color="var(--accent-green)" />
                <StatCard label="Present" value={studentData.present_count} color="var(--accent-green)" />
                <StatCard label="Absent" value={studentData.absent_count} color="var(--accent-red)" />
                <StatCard label="Longest absence streak" value={`${studentData.longest_absence_streak}d`} color="var(--accent-amber)" />
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>
                Click an absent day to mark it present (admin/staff only — locked once present).
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {studentData.calendar.map(d => {
                  const canCorrect = canManageBuses && d.status === "ABSENT" && !d.locked;
                  return (
                    <div key={d.id}
                      title={`${d.date}: ${d.status}${d.is_correction ? " (corrected)" : ""}`}
                      onClick={() => canCorrect && correcting === null && markPresent(d.id)}
                      style={{
                        width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                        background: d.status === "PRESENT" ? "rgba(34,197,94,0.18)" : "rgba(248,113,113,0.18)",
                        color: d.status === "PRESENT" ? "var(--accent-green)" : "var(--accent-red)",
                        fontSize: 10, fontWeight: 700, position: "relative",
                        cursor: canCorrect ? "pointer" : "default",
                        opacity: correcting === d.id ? 0.5 : 1,
                      }}>
                      {new Date(d.date).getDate()}
                      {d.status === "PRESENT" && <Lock size={9} style={{ position: "absolute", bottom: 1, right: 1 }} />}
                      {d.is_correction && <CheckCircle2 size={9} style={{ position: "absolute", top: 1, right: 1 }} />}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceAnalyticsPage;
