import React from "react";
import { ArrowUp, TriangleAlert } from "lucide-react";
import type { ParkingSlot } from "../types";

interface Props {
  slots: ParkingSlot[];
}

// Status is carried by fill + border style, never by hue — every color
// below is a shade of the same neutral gray.
const slotStyle = (slot: ParkingSlot): React.CSSProperties => {
  if (!slot.is_occupied) {
    return { background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.22)" };
  }
  if (slot.is_blocked) {
    return { background: "rgba(255,255,255,0.16)", border: "2px solid #f5f5f5" };
  }
  return { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.3)" };
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
      <div style={{ color: "#737373", fontSize: 13, padding: "24px 0" }}>
        No parking slots are configured on the server yet.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: '"JetBrains Mono", monospace', overflowX: "auto" }}>
      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginBottom: 14, fontSize: 12, color: "#d4d4d4" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 22, height: 14, borderRadius: 3, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.22)" }} />
          Free
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 22, height: 14, borderRadius: 3, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.3)" }} />
          Parked
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 22, height: 14, borderRadius: 3, background: "rgba(255,255,255,0.16)", border: "2px solid #f5f5f5" }} />
          Blocked
        </span>
      </div>

      {/* Ground */}
      <div style={{
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14,
        padding: 16, background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        display: "inline-block",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#d4d4d4", marginBottom: 8, fontSize: 12 }}>
          <ArrowUp size={13} strokeWidth={2} />
          EXIT / ENTRY
        </div>
        {rows.map((row) => (
          <div key={row} style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: "#a3a3a3", width: 24, fontSize: 13 }}>{row}</span>
            {slotNums.map((num) => {
              const key = `${row}${num}`;
              const slot = slotMap[key];
              if (!slot) return (
                <div key={num} style={{
                  width: 68, height: 42, margin: "0 3px",
                  background: "rgba(255,255,255,0.02)", borderRadius: 4,
                  border: "1px dashed rgba(255,255,255,0.08)"
                }} />
              );
              return (
                <div key={num}
                  title={slot.is_occupied ? `${slot.bus_number} — ${slot.bus_route}\nDeparts: ${slot.bus_departure}${slot.is_blocked ? "\nBLOCKED" : ""}` : "Free"}
                  style={{
                    width: 68, height: 42, margin: "0 3px",
                    ...slotStyle(slot), borderRadius: 4,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    cursor: "pointer", fontSize: 11, fontWeight: "bold",
                    color: "#f5f5f5",
                    transition: "transform 0.1s",
                  }}
                >
                  {slot.is_blocked && <TriangleAlert size={11} style={{ marginBottom: 1 }} />}
                  <span>{slotLabel(slot)}</span>
                  <span style={{ fontSize: 9, opacity: 0.75 }}>{key}</span>
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ textAlign: "center", color: "#a3a3a3", marginTop: 4, fontSize: 11 }}>
          Slots 1–{maxSlotNum} (1 = closest to exit)
        </div>
      </div>
    </div>
  );
};

export default ParkingMap2D;
