import React, { useEffect, useState } from "react";
import { Map, RefreshCw, Circle, CircleDot, TriangleAlert } from "lucide-react";
import { getSlots } from "../api/endpoints";
import type { ParkingSlot } from "../types";
import ParkingMap2D from "../components/ParkingMap2D";

const FILTERS = [
  { label: "ALL",      color: "#a78bfa", bg: "rgba(167,139,250," },
  { label: "OCCUPIED", color: "#f472b6", bg: "rgba(244,114,182," },
  { label: "FREE",     color: "#4ade80", bg: "rgba(74,222,128,"  },
  { label: "BLOCKED",  color: "#fbbf24", bg: "rgba(251,191,36,"  },
];

const ParkingPage: React.FC = () => {
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [filter, setFilter] = useState("ALL");

  const load = () => {
    const params: Record<string, string> = {};
    if (filter === "OCCUPIED") params.occupied = "true";
    else if (filter === "FREE")     params.occupied = "false";
    else if (filter === "BLOCKED")  params.blocked  = "true";
    getSlots(params).then(setSlots).catch(() => {});
  };

  useEffect(() => { load(); }, [filter]);

  const occupied = slots.filter(s => s.is_occupied).length;
  const blocked  = slots.filter(s => s.is_blocked).length;

  return (
    <div>
      <h2 style={{ color: "#a78bfa", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <Map size={20} strokeWidth={1.9} /> Parking Map
      </h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {FILTERS.map(f => {
          const active = filter === f.label;
          return (
            <button key={f.label} onClick={() => setFilter(f.label)} style={{
              background: active ? `${f.bg}0.18)` : `${f.bg}0.05)`,
              color: active ? f.color : "#9ca3af",
              border: active ? `1px solid ${f.color}66` : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 9, padding: "8px 16px", cursor: "pointer",
              fontWeight: 700, fontSize: 12,
              boxShadow: active ? `0 0 14px ${f.bg}0.3)` : undefined,
              transition: "all 0.2s",
            }}>{f.label}</button>
          );
        })}
        <button onClick={load} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.04)", color: "#9ca3af",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9,
          padding: "8px 16px", cursor: "pointer", marginLeft: "auto", fontSize: 12,
        }}><RefreshCw size={13} /> Refresh</button>
      </div>

      <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
        <span style={{ color: "#9ca3af", fontSize: 14 }}>Showing {slots.length} slots</span>
        <span style={{ color: "#f472b6", fontSize: 14, fontWeight: 600 }}>● {occupied} occupied</span>
        <span style={{ color: "#fbbf24", fontSize: 14, fontWeight: 600 }}>● {blocked} blocked</span>
      </div>

      <ParkingMap2D slots={filter === "ALL" ? slots : slots} />

      <div style={{ marginTop: 32, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", color: "#d1d5db", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "rgba(167,139,250,0.05)" }}>
              {["Slot","Row","#","Bus","Route","Departure","Status"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid rgba(167,139,250,0.15)", color: "#9ca3af" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map(slot => (
              <tr key={slot.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "10px 12px", fontWeight: "bold", color: "#a78bfa" }}>{slot.row}{slot.slot_number}</td>
                <td style={{ padding: "10px 12px" }}>{slot.row}</td>
                <td style={{ padding: "10px 12px" }}>{slot.slot_number}</td>
                <td style={{ padding: "10px 12px", color: "#d1d5db" }}>{slot.bus_number ?? "—"}</td>
                <td style={{ padding: "10px 12px", color: "#9ca3af", fontSize: 12 }}>{slot.bus_route ?? "—"}</td>
                <td style={{ padding: "10px 12px" }}>{slot.bus_departure ?? "—"}</td>
                <td style={{ padding: "10px 12px" }}>
                  {!slot.is_occupied ? (
                    <span style={{ color: "#4ade80", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Circle size={12} /> Free
                    </span>
                  ) : slot.is_blocked ? (
                    <span style={{ color: "#fbbf24", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                      <TriangleAlert size={12} /> Blocked
                    </span>
                  ) : (
                    <span style={{ color: "#f472b6", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <CircleDot size={12} /> Parked
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default ParkingPage;
