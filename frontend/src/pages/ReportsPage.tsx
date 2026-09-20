import React, { useEffect, useMemo, useState } from "react";
import { Download, BarChart3 } from "lucide-react";
import { getEvents, getParkingSummary } from "../api/endpoints";
import type { ParkingEvent, ParkingSummary } from "../types";

const EVENT_LIMIT = "5000";
const ARRIVAL_EVENTS = new Set(["PARKED", "DETECTED", "ENTRY"]);

const formatDuration = (ms: number) => {
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatHour = (hour: number) => {
  const fmt = (h: number) => {
    const suffix = h < 12 || h === 24 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, "0")}:00 ${suffix}`;
  };
  return `${fmt(hour)} – ${fmt(hour + 1)}`;
};

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

/** Everything on this page is derived from the parking event log and live summary. */
const computeStats = (events: ParkingEvent[]) => {
  const chronological = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // A stay starts when a bus is parked/detected and ends at its next EXIT.
  const openStays = new Map<number, number>();
  const stays: number[] = [];
  const arrivalsByHour = new Array<number>(24).fill(0);

  chronological.forEach((ev) => {
    const time = new Date(ev.timestamp).getTime();
    if (ev.event_type === "EXIT") {
      const start = openStays.get(ev.bus);
      if (start !== undefined) {
        stays.push(time - start);
        openStays.delete(ev.bus);
      }
    } else if (ev.event_type === "PARKED" || ev.event_type === "DETECTED") {
      if (!openStays.has(ev.bus)) openStays.set(ev.bus, time);
    }
    if (ARRIVAL_EVENTS.has(ev.event_type)) {
      arrivalsByHour[new Date(ev.timestamp).getHours()] += 1;
    }
  });

  const avgStayMs = stays.length ? stays.reduce((a, b) => a + b, 0) / stays.length : null;
  const peakCount = Math.max(...arrivalsByHour);
  const peakHour = peakCount > 0 ? arrivalsByHour.indexOf(peakCount) : null;

  return { avgStayMs, completedStays: stays.length, peakHour, peakCount };
};

export const ReportsPage: React.FC = () => {
  const [events, setEvents] = useState<ParkingEvent[]>([]);
  const [summary, setSummary] = useState<ParkingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getEvents({ limit: EVENT_LIMIT }), getParkingSummary()])
      .then(([evs, sum]) => { setEvents(evs); setSummary(sum); })
      .catch(() => setError("Could not load report data."))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => computeStats(events), [events]);
  const dash = loading ? "…" : "—";

  const exportCsv = () => {
    const header = ["Time", "Bus", "Event", "Slot", "Message"];
    const lines = events.map((ev) =>
      [
        new Date(ev.timestamp).toISOString(),
        ev.bus_number ?? "",
        ev.event_type,
        ev.slot_label ?? "",
        ev.message ?? "",
      ].map(csvCell).join(",")
    );
    const blob = new Blob([[header.map(csvCell).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "parking-events.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div className="rp-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--accent-blue)", display: "flex", alignItems: "center", gap: 10 }}>
            <BarChart3 size={19} strokeWidth={1.9} /> Parking Analytics &amp; Reports
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Historical movement analysis and stay durations, calculated from the recorded parking events.
          </p>
        </div>
        <button className="liquid-pill liquid-pill-active rp-export"
          onClick={exportCsv}
          disabled={events.length === 0}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", fontSize: 13, cursor: events.length === 0 ? "not-allowed" : "pointer", opacity: events.length === 0 ? 0.5 : 1, border: "none" }}>
          <Download size={15} /> <span>Export CSV Report</span>
        </button>
      </div>

      {error && (
        <div style={{ color: "var(--accent-red)", fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      <div className="rp-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div className="liquid-glass-card" style={{ padding: "18px 20px", borderColor: "rgba(96,165,250,0.25)" }}>
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Avg. Parking Duration</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-blue)", marginTop: 6 }}>
            {stats.avgStayMs !== null ? formatDuration(stats.avgStayMs) : dash}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
            {stats.completedStays > 0
              ? `Across ${stats.completedStays} completed stay${stats.completedStays === 1 ? "" : "s"}`
              : "No completed stays recorded yet"}
          </div>
        </div>
        <div className="liquid-glass-card" style={{ padding: "18px 20px", borderColor: "rgba(251,191,36,0.25)" }}>
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Blocked Buses Now</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-amber)", marginTop: 6 }}>
            {summary ? summary.blocked : dash}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
            {summary ? `Out of ${summary.occupied} parked` : "Live count"}
          </div>
        </div>
        <div className="liquid-glass-card" style={{ padding: "18px 20px", borderColor: "rgba(167,139,250,0.25)" }}>
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Peak Arrival Time</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-violet)", marginTop: 6 }}>
            {stats.peakHour !== null ? formatHour(stats.peakHour) : dash}
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
            {stats.peakHour !== null
              ? `${stats.peakCount} arrival${stats.peakCount === 1 ? "" : "s"} in the busiest hour`
              : "No arrivals recorded yet"}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ReportsPage;
