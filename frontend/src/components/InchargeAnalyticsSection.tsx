import React, { useEffect, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { getInchargeAnalytics } from "../api/endpoints";
import { inputStyle, labelStyle, ghostBtn, errorText } from "../pages/DriverAttendancePage";
import type { AttendanceInchargeAnalytics, AnalyticsPeriod } from "../types";

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

const InchargeAnalyticsSection: React.FC = () => {
  const [period, setPeriod] = useState<AnalyticsPeriod>("monthly");
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<AttendanceInchargeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true); setError("");
    getInchargeAnalytics({ period, year, ...(period === "monthly" ? { month } : {}) })
      .then(setData)
      .catch(err => setError(errorText(err, "Couldn't load your cab's attendance analytics.")))
      .finally(() => setLoading(false));
  }, [period, year, month]);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[][] = [["Bus", data.bus_number], []];
    rows.push(["Date/Month", "Present", "Total", "Attendance %"]);
    data.trend.forEach(t => rows.push([t.label, String(t.present), String(t.total), `${t.pct}%`]));
    rows.push([]);
    rows.push(["Top absentees", "Roll No.", "Absences"]);
    data.top_absentees.forEach(a => rows.push([a.name, a.roll_number, String(a.absences)]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const url = window.URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `incharge_attendance_analytics_${year}${period === "monthly" ? `_${month}` : ""}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ marginTop: 28 }}>
      <h3 style={{ color: "var(--accent-amber)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <BarChart3 size={18} strokeWidth={1.9} /> Attendance Analytics{data ? ` — Bus ${data.bus_number}` : ""}
      </h3>
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 18px" }}>
        Trends and top absentees for your own cab.
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
        <button type="button" style={ghostBtn} onClick={exportCsv} disabled={!data}>
          <Download size={13} /> Export CSV
        </button>
      </div>

      {error && <div role="alert" style={{ color: "var(--accent-red)", marginBottom: 14 }}>{error}</div>}

      {loading ? (
        <div style={{ color: "var(--text-dim)" }}>Loading analytics...</div>
      ) : data && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
            <StatCard label="Overall attendance" value={`${data.overall_pct}%`} color="var(--accent-green)" />
            <StatCard label="Present" value={data.present_count} color="var(--accent-green)" />
            <StatCard label="Absent" value={data.absent_count} color="var(--accent-red)" />
            <StatCard label="Total records" value={data.total_count} />
          </div>

          <h4 style={{ color: "var(--text-strong)", marginBottom: 10 }}>Attendance trend</h4>
          <div style={{ marginBottom: 22 }}>
            {data.trend.length === 0
              ? <div style={{ color: "var(--text-dim)", fontSize: 13 }}>No data for this period.</div>
              : data.trend.map(t => <BarRow key={t.label} label={t.label} pct={t.pct} sub={`${t.present}/${t.total} (${t.pct}%)`} />)}
          </div>

          <h4 style={{ color: "var(--text-strong)", marginBottom: 10 }}>Top absentees</h4>
          {data.top_absentees.length === 0 ? (
            <div style={{ color: "var(--text-dim)", fontSize: 13 }}>No absences recorded for this period.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.top_absentees.map(a => (
                <div key={a.student_id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", borderRadius: 10,
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
    </div>
  );
};

export default InchargeAnalyticsSection;
