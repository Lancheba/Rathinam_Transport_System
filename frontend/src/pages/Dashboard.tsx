import React, { useEffect, useState } from "react";
import { getParkingSummary, getSlots, getEvents, getBuses } from "../api/endpoints";
import type { ParkingSummary, ParkingSlot, ParkingEvent, Bus } from "../types";
import ParkingMap2D from "../components/ParkingMap2D";

const StatCard: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
  <div style={{
    background: "#1f2937", borderRadius: 10, padding: "16px 24px",
    minWidth: 140, textAlign: "center", borderTop: `4px solid ${color ?? "#3b82f6"}`
  }}>
    <div style={{ fontSize: 28, fontWeight: "bold", color: "#fff" }}>{value}</div>
    <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>{label}</div>
  </div>
);

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<ParkingSummary | null>(null);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [events, setEvents] = useState<ParkingEvent[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);

  useEffect(() => {
    getParkingSummary().then(setSummary).catch(() => {});
    getSlots().then(setSlots).catch(() => {});
    getEvents({ limit: "10" }).then(setEvents).catch(() => {});
    getBuses().then(setBuses).catch(() => {});
  }, []);

  return (
    <div>
      <h2 style={{ color: "#f9fafb", marginBottom: 20 }}>📊 Dashboard</h2>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        <StatCard label="Total Slots" value={summary?.total_slots ?? "—"} color="#6366f1" />
        <StatCard label="Occupied" value={summary?.occupied ?? "—"} color="#3b82f6" />
        <StatCard label="Free Slots" value={summary?.free ?? "—"} color="#22c55e" />
        <StatCard label="Blocked Buses" value={summary?.blocked ?? "—"} color="#ef4444" />
        <StatCard label="Utilisation" value={summary ? `${summary.utilisation_pct}%` : "—"} color="#f59e0b" />
        <StatCard label="Active Buses" value={buses.filter(b => b.is_active).length || "—"} color="#8b5cf6" />
      </div>

      {/* Parking map */}
      <h3 style={{ color: "#d1d5db", marginBottom: 12 }}>🅿️ Parking Ground (Live)</h3>
      {slots.length > 0 ? <ParkingMap2D slots={slots} /> : (
        <div style={{ color: "#6b7280" }}>Loading map...</div>
      )}

      {/* Recent events */}
      <h3 style={{ color: "#d1d5db", marginTop: 32, marginBottom: 12 }}>📋 Recent Events</h3>
      <div style={{ background: "#1f2937", borderRadius: 8, overflow: "hidden" }}>
        {events.length === 0 ? (
          <div style={{ color: "#6b7280", padding: 16 }}>No events yet</div>
        ) : events.map((ev) => (
          <div key={ev.id} style={{
            padding: "10px 16px", borderBottom: "1px solid #374151",
            display: "flex", gap: 12, alignItems: "center"
          }}>
            <span style={{
              background: ev.event_type === "EXIT" ? "#dc2626" : ev.event_type === "PARKED" ? "#16a34a" : "#2563eb",
              color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: "bold"
            }}>{ev.event_type}</span>
            <span style={{ color: "#f9fafb", fontWeight: "bold" }}>{ev.bus_number}</span>
            {ev.slot_label && <span style={{ color: "#9ca3af", fontSize: 13 }}>→ Slot {ev.slot_label}</span>}
            <span style={{ color: "#6b7280", fontSize: 12, marginLeft: "auto" }}>
              {new Date(ev.timestamp).toLocaleTimeString("en-IN")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
