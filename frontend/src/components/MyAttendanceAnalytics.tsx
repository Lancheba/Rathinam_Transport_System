import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { getStudentAttendanceAnalytics } from "../api/endpoints";
import type { AttendanceStudentAnalytics } from "../types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pctColor = (pct: number) =>
  pct >= 75 ? "var(--accent-green)" : pct >= 50 ? "var(--accent-amber)" : "var(--accent-red)";

const cardStyle: React.CSSProperties = {
  padding: "14px 16px", borderRadius: 14, border: "1px solid rgba(99,102,241,0.14)",
  background: "rgba(99,102,241,0.04)", flex: 1, minWidth: 130,
};

const StatCard: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
  <div style={cardStyle}>
    <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color: color ?? "var(--text-strong)", marginTop: 4 }}>{value}</div>
  </div>
);

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700,
  color: active ? "var(--text-strong)" : "var(--text-muted)",
  border: `1px solid ${active ? "var(--accent-indigo)" : "rgba(99,102,241,0.2)"}`,
  background: active ? "rgba(99,102,241,0.15)" : "transparent",
});

const navBtn = (disabled: boolean): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 28, height: 28, borderRadius: 8, cursor: disabled ? "default" : "pointer",
  border: "1px solid rgba(99,102,241,0.2)", background: "transparent",
  color: "var(--text-muted)", opacity: disabled ? 0.4 : 1,
});

type DayCell = { date: string; day: number; present: number; total: number };

const MyAttendanceAnalytics: React.FC<{ studentId: number }> = ({ studentId }) => {
  const today = new Date();
  const [mode, setMode] = useState<"month" | "year">("month");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState<AttendanceStudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getStudentAttendanceAnalytics(studentId, { year, ...(mode === "month" ? { month } : {}) })
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => { if (!cancelled) setError("Couldn't load your attendance summary."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studentId, mode, year, month]);

  // A day can have a morning and an evening record - merge them into one cell.
  const dayCells = useMemo<DayCell[]>(() => {
    const map = new Map<string, DayCell>();
    (data?.calendar ?? []).forEach((r) => {
      const cell = map.get(r.date) ?? { date: r.date, day: Number(r.date.slice(8, 10)), present: 0, total: 0 };
      cell.total += 1;
      if (r.status === "PRESENT") cell.present += 1;
      map.set(r.date, cell);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  // Year view: per-month breakdown computed from the same calendar data.
  const monthRows = useMemo(() => {
    const rows = MONTH_NAMES.map((name) => ({ name, present: 0, total: 0 }));
    (data?.calendar ?? []).forEach((r) => {
      const idx = Number(r.date.slice(5, 7)) - 1;
      rows[idx].total += 1;
      if (r.status === "PRESENT") rows[idx].present += 1;
    });
    return rows.filter((r) => r.total > 0);
  }, [data]);

  const atCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  const atCurrentYear = year === today.getFullYear();

  const step = (delta: number) => {
    if (mode === "year") { setYear((y) => y + delta); return; }
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  };

  const nextDisabled = mode === "month" ? atCurrentMonth : atCurrentYear;
  const periodLabel = mode === "month" ? `${MONTH_NAMES[month - 1]} ${year}` : `${year}`;

  return (
    <div className="liquid-glass-card no-lift" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", margin: 0, textTransform: "uppercase", letterSpacing: 0.4 }}>
          My attendance summary
        </h3>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" style={tabStyle(mode === "month")} onClick={() => setMode("month")}>Month</button>
          <button type="button" style={tabStyle(mode === "year")} onClick={() => setMode("year")}>Year</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button type="button" aria-label="Previous period" style={navBtn(false)} onClick={() => step(-1)}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)", minWidth: 130, textAlign: "center" }}>
          {periodLabel}
        </span>
        <button type="button" aria-label="Next period" style={navBtn(nextDisabled)} disabled={nextDisabled} onClick={() => step(1)}>
          <ChevronRight size={16} />
        </button>
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Morning + evening combined</span>
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13 }}>
          <LoaderCircle size={15} className="spin" /> Loading...
        </div>
      )}

      {!loading && error && <div role="alert" style={{ color: "var(--accent-red)", fontSize: 13 }}>{error}</div>}

      {!loading && !error && data && data.total_count === 0 && (
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No attendance recorded for this period yet.</div>
      )}

      {!loading && !error && data && data.total_count > 0 && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <StatCard label="Attendance" value={`${data.attendance_pct}%`} color={pctColor(data.attendance_pct)} />
            <StatCard label="Present" value={data.present_count} color="var(--accent-green)" />
            <StatCard label="Absent" value={data.absent_count} color="var(--accent-red)" />
            <StatCard
              label="Longest absent run"
              value={`${data.longest_absence_streak} session${data.longest_absence_streak === 1 ? "" : "s"}`}
              color="var(--accent-amber)"
            />
          </div>

          <div style={{ height: 10, borderRadius: 6, background: "rgba(99,102,241,0.08)", overflow: "hidden", marginBottom: 16 }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, data.attendance_pct))}%`, height: "100%",
              background: pctColor(data.attendance_pct), borderRadius: 6, transition: "width 0.3s",
            }} />
          </div>

          {mode === "month" ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {dayCells.map((d) => {
                const allPresent = d.present === d.total;
                const nonePresent = d.present === 0;
                const color = allPresent ? "var(--accent-green)" : nonePresent ? "var(--accent-red)" : "var(--accent-amber)";
                const bg = allPresent ? "rgba(34,197,94,0.18)" : nonePresent ? "rgba(248,113,113,0.18)" : "rgba(251,191,36,0.18)";
                const word = allPresent ? "Present" : nonePresent ? "Absent" : "Partly present";
                return (
                  <div
                    key={d.date}
                    title={`${d.date}: ${word} (${d.present}/${d.total} sessions)`}
                    style={{
                      width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 11, fontWeight: 700, background: bg, color,
                    }}
                  >
                    {d.day}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              {monthRows.map((r) => {
                const pct = Math.round((r.present / r.total) * 1000) / 10;
                return (
                  <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 90, fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{r.name}</div>
                    <div style={{ flex: 1, height: 10, borderRadius: 6, background: "rgba(99,102,241,0.08)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: pctColor(pct), borderRadius: 6 }} />
                    </div>
                    <div style={{ width: 110, fontSize: 12, color: "var(--text-dim)", textAlign: "right", flexShrink: 0 }}>
                      {r.present}/{r.total} ({pct}%)
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {mode === "month" && (
            <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 11, color: "var(--text-dim)", flexWrap: "wrap" }}>
              <span style={{ color: "var(--accent-green)" }}>&#9632; Present</span>
              <span style={{ color: "var(--accent-amber)" }}>&#9632; Partly present</span>
              <span style={{ color: "var(--accent-red)" }}>&#9632; Absent</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyAttendanceAnalytics;
