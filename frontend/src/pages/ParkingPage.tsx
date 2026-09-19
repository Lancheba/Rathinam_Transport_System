import React, { useEffect, useState } from "react";
import { Map, RefreshCw, Circle, CircleDot, TriangleAlert } from "lucide-react";
import { getSlots } from "../api/endpoints";
import type { ParkingSlot } from "../types";
import ParkingMap2D from "../components/ParkingMap2D";
import { alpha } from "../utils/color";

const FILTERS = [
  { label: "ALL",      color: "var(--accent-violet)", bg: "rgba(167,139,250," },
  { label: "OCCUPIED", color: "var(--accent-pink)", bg: "rgba(244,114,182," },
  { label: "FREE",     color: "var(--accent-green)", bg: "rgba(74,222,128,"  },
  { label: "BLOCKED",  color: "var(--accent-amber)", bg: "rgba(251,191,36,"  },
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
      <h2 style={{ color: "var(--accent-violet)", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <Map size={20} strokeWidth={1.9} /> Parking Map
      </h2>

      <div className="pk-filters" style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {FILTERS.map(f => {
          const active = filter === f.label;
          return (
            <button key={f.label} onClick={() => setFilter(f.label)} style={{
              background: active ? `${f.bg}0.18)` : `${f.bg}0.05)`,
              color: active ? f.color : "var(--text-muted)",
              border: active ? `1px solid ${alpha(f.color, 40)}` : "1px solid rgb(var(--ov) / 0.08)",
              borderRadius: 9, padding: "8px 16px", cursor: "pointer",
              fontWeight: 700, fontSize: 12,
              boxShadow: active ? `0 0 14px ${f.bg}0.3)` : undefined,
              transition: "all 0.2s",
            }}>{f.label}</button>
          );
        })}
        <button onClick={load} className="pk-refresh" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgb(var(--ov) / 0.04)", color: "var(--text-muted)",
          border: "1px solid rgb(var(--ov) / 0.08)", borderRadius: 9,
          padding: "8px 16px", cursor: "pointer", marginLeft: "auto", fontSize: 12,
        }}><RefreshCw size={13} /> Refresh</button>
      </div>

      <div className="pk-summary" style={{ display: "flex", gap: 20, marginBottom: 24 }}>
        <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Showing {slots.length} slots</span>
        <span style={{ color: "var(--accent-pink)", fontSize: 14, fontWeight: 600 }}>● {occupied} occupied</span>
        <span style={{ color: "var(--accent-amber)", fontSize: 14, fontWeight: 600 }}>● {blocked} blocked</span>
      </div>

      <ParkingMap2D slots={filter === "ALL" ? slots : slots} />

      <div className="pk-tablewrap" style={{ marginTop: 32, overflowX: "auto" }}>
        <table className="pk-table" style={{ width: "100%", borderCollapse: "collapse", color: "var(--text-soft)", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "rgba(167,139,250,0.05)" }}>
              {["Slot","Row","#","Bus","Route","Departure","Status"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid rgba(167,139,250,0.15)", color: "var(--text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map(slot => (
              <tr key={slot.id} className="pk-row" style={{ borderBottom: "1px solid rgb(var(--ov) / 0.04)" }}>
                <td className="c-slot" style={{ padding: "10px 12px", fontWeight: "bold", color: "var(--accent-violet)" }}>{slot.row}{slot.slot_number}</td>
                <td className="c-row" style={{ padding: "10px 12px" }}>{slot.row}</td>
                <td className="c-num" style={{ padding: "10px 12px" }}>{slot.slot_number}</td>
                <td className="c-bus" style={{ padding: "10px 12px", color: "var(--text-soft)" }}>{slot.bus_number ?? "—"}</td>
                <td className="c-route" style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: 12 }}>{slot.bus_route ?? "—"}</td>
                <td className="c-dep" style={{ padding: "10px 12px" }}>{slot.bus_departure ?? "—"}</td>
                <td className="c-status" style={{ padding: "10px 12px" }}>
                  {!slot.is_occupied ? (
                    <span style={{ color: "var(--accent-green)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Circle size={12} /> Free
                    </span>
                  ) : slot.is_blocked ? (
                    <span style={{ color: "var(--accent-amber)", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                      <TriangleAlert size={12} /> Blocked
                    </span>
                  ) : (
                    <span style={{ color: "var(--accent-pink)", display: "inline-flex", alignItems: "center", gap: 6 }}>
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
