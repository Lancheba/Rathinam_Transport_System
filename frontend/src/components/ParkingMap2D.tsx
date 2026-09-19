import React from "react";
import type { ParkingSlot } from "../types";

interface Props {
  slots: ParkingSlot[];
}

const slotColor = (slot: ParkingSlot): string => {
  if (!slot.is_occupied) return "#22c55e";   // green — free
  if (slot.is_blocked) return "#ef4444";     // red — blocked
  return "#3b82f6";                          // blue — parked OK
};

const slotLabel = (slot: ParkingSlot): string => {
  if (!slot.is_occupied) return "";
  return slot.bus_number ?? "";
};

const ParkingMap2D: React.FC<Props> = ({ slots }) => {
  const slotMap: Record<string, ParkingSlot> = {};
  const rowSet = new Set<string>();
  let maxSlotNum = 0;
  slots.forEach((s) => {
    slotMap[`${s.row}${s.slot_number}`] = s;
    rowSet.add(s.row);
    if (s.slot_number > maxSlotNum) maxSlotNum = s.slot_number;
  });
  const rows = Array.from(rowSet).sort();
  const slotNums = Array.from({ length: maxSlotNum || 0 }, (_, i) => i + 1);

  if (rows.length === 0) {
    return (
      <div style={{ color: "#64748b", fontSize: 13, padding: "24px 0" }}>
        No parking slots are configured on the server yet.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "monospace", overflowX: "auto" }}>
      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 13 }}>
        <span><span style={{ background: "#22c55e", padding: "2px 10px", borderRadius: 4 }}>&nbsp;</span> Free</span>
        <span><span style={{ background: "#3b82f6", padding: "2px 10px", borderRadius: 4 }}>&nbsp;</span> Parked</span>
        <span><span style={{ background: "#ef4444", padding: "2px 10px", borderRadius: 4 }}>&nbsp;</span> Blocked</span>
      </div>

      {/* Ground */}
      <div style={{
        border: "3px solid #374151", borderRadius: 8,
        padding: 16, background: "#111827", display: "inline-block"
      }}>
        <div style={{ textAlign: "center", color: "#fbbf24", marginBottom: 8, fontSize: 12 }}>
          ↑  EXIT / ENTRY
        </div>
        {rows.map((row) => (
          <div key={row} style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: "#9ca3af", width: 24, fontSize: 13 }}>{row}</span>
            {slotNums.map((num) => {
              const key = `${row}${num}`;
              const slot = slotMap[key];
              if (!slot) return (
                <div key={num} style={{
                  width: 68, height: 42, margin: "0 3px",
                  background: "#1f2937", borderRadius: 4,
                  border: "1px dashed #374151"
                }} />
              );
              return (
                <div key={num}
                  title={slot.is_occupied ? `${slot.bus_number} — ${slot.bus_route}\nDeparts: ${slot.bus_departure}${slot.is_blocked ? "\n⚠ BLOCKED" : ""}` : "Free"}
                  style={{
                    width: 68, height: 42, margin: "0 3px",
                    background: slotColor(slot), borderRadius: 4,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    cursor: "pointer", fontSize: 11, fontWeight: "bold",
                    color: "#fff", border: slot.is_blocked ? "2px solid #fbbf24" : "none",
                    transition: "transform 0.1s",
                  }}
                >
                  <span>{slotLabel(slot)}</span>
                  <span style={{ fontSize: 9, opacity: 0.8 }}>{key}</span>
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ textAlign: "center", color: "#9ca3af", marginTop: 4, fontSize: 11 }}>
          Slots 1–{maxSlotNum} (1 = closest to exit)
        </div>
      </div>
    </div>
  );
};

export default ParkingMap2D;
