import React, { useEffect, useState } from "react";
import { Map, RefreshCw, Circle, CircleDot, TriangleAlert } from "lucide-react";
import { getSlots } from "../api/endpoints";
import type { ParkingSlot } from "../types";
import ParkingMap2D from "../components/ParkingMap2D";

const ParkingPage: React.FC = () => {
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [filter, setFilter] = useState("ALL");

  const load = () => {
    const params: Record<string, string> = {};
    if (filter === "OCCUPIED") params.occupied = "true";
    else if (filter === "FREE") params.occupied = "false";
    else if (filter === "BLOCKED") params.blocked = "true";
    getSlots(params).then(setSlots).catch(() => {});
  };

  useEffect(() => { load(); }, [filter]);

  const occupied = slots.filter(s => s.is_occupied).length;
  const blocked = slots.filter(s => s.is_blocked).length;

  return (
    <div>
      <h2 style={{ color: "#f5f5f5", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <Map size={20} strokeWidth={1.9} /> Parking Map
      </h2>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {["ALL", "OCCUPIED", "FREE", "BLOCKED"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)",
            color: "#fff", border: filter === f ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: "bold"
          }}>{f}</button>
        ))}
        <button onClick={load} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.05)", color: "#a3a3a3", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8, padding: "8px 16px", cursor: "pointer", marginLeft: "auto"
        }}><RefreshCw size={13} /> Refresh</button>
      </div>

      <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
        <span style={{ color: "#a3a3a3", fontSize: 14 }}>Showing {slots.length} slots</span>
        <span style={{ color: "#c4c4c4", fontSize: 14 }}>{occupied} occupied</span>
        <span style={{ color: "#b3b3b3", fontSize: 14 }}>{blocked} blocked</span>
      </div>

      <ParkingMap2D slots={filter === "ALL" ? slots : slots} />

      {/* Slot table */}
      <div style={{ marginTop: 32, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", color: "#d4d4d4", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)" }}>
              {["Slot", "Row", "#", "Bus", "Route", "Departure", "Status"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#a3a3a3" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map(slot => (
              <tr key={slot.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <td style={{ padding: "10px 12px", fontWeight: "bold" }}>{slot.row}{slot.slot_number}</td>
                <td style={{ padding: "10px 12px" }}>{slot.row}</td>
                <td style={{ padding: "10px 12px" }}>{slot.slot_number}</td>
                <td style={{ padding: "10px 12px", color: "#c4c4c4" }}>{slot.bus_number ?? "—"}</td>
                <td style={{ padding: "10px 12px", color: "#a3a3a3", fontSize: 12 }}>{slot.bus_route ?? "—"}</td>
                <td style={{ padding: "10px 12px" }}>{slot.bus_departure ?? "—"}</td>
                <td style={{ padding: "10px 12px" }}>
                  {!slot.is_occupied ? (
                    <span style={{ color: "#a3a3a3", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Circle size={12} /> Free
                    </span>
                  ) : slot.is_blocked ? (
                    <span style={{ color: "#f5f5f5", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                      <TriangleAlert size={12} /> Blocked
                    </span>
                  ) : (
                    <span style={{ color: "#c4c4c4", display: "inline-flex", alignItems: "center", gap: 6 }}>
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
