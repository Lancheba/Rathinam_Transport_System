import React, { useEffect, useState } from "react";
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
      <h2 style={{ color: "#f9fafb", marginBottom: 16 }}>🅿️ Parking Map</h2>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {["ALL", "OCCUPIED", "FREE", "BLOCKED"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? "#3b82f6" : "#374151",
            color: "#fff", border: "none", borderRadius: 6,
            padding: "8px 16px", cursor: "pointer", fontWeight: "bold"
          }}>{f}</button>
        ))}
        <button onClick={load} style={{
          background: "#1f2937", color: "#9ca3af", border: "1px solid #374151",
          borderRadius: 6, padding: "8px 16px", cursor: "pointer", marginLeft: "auto"
        }}>↻ Refresh</button>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <span style={{ color: "#9ca3af", fontSize: 14 }}>Showing {slots.length} slots</span>
        <span style={{ color: "#3b82f6", fontSize: 14 }}>• {occupied} occupied</span>
        <span style={{ color: "#ef4444", fontSize: 14 }}>• {blocked} blocked</span>
      </div>

      <ParkingMap2D slots={filter === "ALL" ? slots : slots} />

      {/* Slot table */}
      <div style={{ marginTop: 32, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", color: "#d1d5db", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#111827" }}>
              {["Slot", "Row", "#", "Bus", "Route", "Departure", "Status"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #374151", color: "#9ca3af" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map(slot => (
              <tr key={slot.id} style={{ borderBottom: "1px solid #1f2937" }}>
                <td style={{ padding: "10px 12px", fontWeight: "bold" }}>{slot.row}{slot.slot_number}</td>
                <td style={{ padding: "10px 12px" }}>{slot.row}</td>
                <td style={{ padding: "10px 12px" }}>{slot.slot_number}</td>
                <td style={{ padding: "10px 12px", color: "#3b82f6" }}>{slot.bus_number ?? "—"}</td>
                <td style={{ padding: "10px 12px", color: "#9ca3af", fontSize: 12 }}>{slot.bus_route ?? "—"}</td>
                <td style={{ padding: "10px 12px" }}>{slot.bus_departure ?? "—"}</td>
                <td style={{ padding: "10px 12px" }}>
                  {!slot.is_occupied ? (
                    <span style={{ color: "#22c55e" }}>🟢 Free</span>
                  ) : slot.is_blocked ? (
                    <span style={{ color: "#ef4444" }}>🔴 Blocked</span>
                  ) : (
                    <span style={{ color: "#3b82f6" }}>🔵 Parked</span>
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
