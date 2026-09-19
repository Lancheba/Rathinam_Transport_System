import React, { useState } from "react";
import { TriangleAlert, Bus } from "lucide-react";
import type { ParkingSlot } from "../types";

interface Props {
  slots: ParkingSlot[];
}

const slotStyle = (slot: ParkingSlot): React.CSSProperties => {
  if (!slot.is_occupied) {
    return {
      background: "rgba(74,222,128,0.04)",
      border: "1px dashed rgba(74,222,128,0.28)",
      boxShadow: "none",
    };
  }
  if (slot.is_blocked) {
    return {
      background: "rgba(251,191,36,0.14)",
      border: "2px solid rgba(251,191,36,0.7)",
      boxShadow: "0 0 12px rgba(251,191,36,0.25), inset 0 0 8px rgba(251,191,36,0.06)",
    };
  }
  return {
    background: "rgba(96,165,250,0.12)",
    border: "1px solid rgba(96,165,250,0.45)",
    boxShadow: "0 0 10px rgba(96,165,250,0.18), inset 0 0 6px rgba(96,165,250,0.05)",
  };
};

const slotTextColor = (slot: ParkingSlot): string => {
  if (!slot.is_occupied) return "rgba(74,222,128,0.5)";
  if (slot.is_blocked) return "#fbbf24";
  return "#93c5fd";
};

const ParkingMap2D: React.FC<Props> = ({ slots }) => {
  const [hovered, setHovered] = useState<string | null>(null);

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

  const totalSlots   = slots.length;
  const occupiedSlots = slots.filter(s => s.is_occupied && !s.is_blocked).length;
  const blockedSlots  = slots.filter(s => s.is_blocked).length;
  const freeSlots     = slots.filter(s => !s.is_occupied).length;

  if (rows.length === 0) {
    return (
      <div style={{ color: "#6b7280", fontSize: 13, padding: "24px 0" }}>
        No parking slots are configured on the server yet.
      </div>
    );
  }

  return (
    <div className="pm2d" style={{ fontFamily: '"JetBrains Mono", monospace', overflowX: "auto" }}>

      {/* Legend */}
      <div className="pm2d__legend" style={{ display: "flex", gap: 20, marginBottom: 16, fontSize: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{
            width: 24, height: 14, borderRadius: 3,
            background: "rgba(74,222,128,0.06)",
            border: "1px dashed rgba(74,222,128,0.3)",
            display: "inline-block",
          }} />
          <span style={{ color: "#4ade80", fontWeight: 600 }}>Free</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{
            width: 24, height: 14, borderRadius: 3,
            background: "rgba(96,165,250,0.14)",
            border: "1px solid rgba(96,165,250,0.5)",
            display: "inline-block",
          }} />
          <span style={{ color: "#60a5fa", fontWeight: 600 }}>Parked</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{
            width: 24, height: 14, borderRadius: 3,
            background: "rgba(251,191,36,0.15)",
            border: "2px solid rgba(251,191,36,0.6)",
            display: "inline-block",
          }} />
          <span style={{ color: "#fbbf24", fontWeight: 600 }}>Blocked</span>
        </span>

        {/* Mini stat pills */}
        <div className="pm2d__pills" style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[
            { label: "Free",     val: freeSlots,     color: "#4ade80", bg: "rgba(74,222,128,0.1)"  },
            { label: "Parked",   val: occupiedSlots, color: "#60a5fa", bg: "rgba(96,165,250,0.1)"  },
            { label: "Blocked",  val: blockedSlots,  color: "#fbbf24", bg: "rgba(251,191,36,0.1)"  },
            { label: "Total",    val: totalSlots,    color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
          ].map(p => (
            <div key={p.label} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 9999,
              background: p.bg, border: `1px solid ${p.color}44`,
              fontSize: 11,
            }}>
              <span style={{ color: p.color, fontWeight: 800 }}>{p.val}</span>
              <span style={{ color: "#9ca3af" }}>{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ground */}
      <div className="pm2d__ground" style={{
        border: "1px solid rgba(167,139,250,0.2)",
        borderRadius: 16,
        padding: "18px 20px",
        background: "rgba(10,10,20,0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "inline-block",
        boxShadow: "0 0 40px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
        position: "relative",
      }}>
        {/* Subtle grid lines background */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 16,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: "74px 50px",
          pointerEvents: "none",
        }} />

        {/* EXIT label */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, marginBottom: 14, fontSize: 11, fontWeight: 700,
          letterSpacing: "0.12em",
        }}>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(167,139,250,0.4))" }} />
          <span style={{
            color: "#a78bfa", padding: "4px 14px", borderRadius: 9999,
            background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)",
          }}>
            ↑ EXIT / ENTRY
          </span>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(167,139,250,0.4))" }} />
        </div>

        {/* Rows */}
        {rows.map((row) => (
          <div key={row} className="pm2d__row" style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            {/* Row label */}
            <span className="pm2d__label" style={{
              width: 26, fontSize: 13, fontWeight: 800,
              color: "#a78bfa", textAlign: "center",
              textShadow: "0 0 8px rgba(167,139,250,0.5)",
            }}>{row}</span>

            {slotNums.map((num) => {
              const key = `${row}${num}`;
              const slot = slotMap[key];
              const isHov = hovered === key;

              if (!slot) return (
                <div key={num} className="pm2d__slot" style={{
                  width: 68, height: 48, margin: "0 3px",
                  background: "rgba(255,255,255,0.01)",
                  borderRadius: 5,
                  border: "1px dashed rgba(255,255,255,0.04)",
                }} />
              );

              const base = slotStyle(slot);
              const textColor = slotTextColor(slot);

              return (
                <div
                  key={num}
                  className="pm2d__slot"
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                  title={
                    slot.is_occupied
                      ? `${slot.bus_number} — ${slot.bus_route}\nDeparts: ${slot.bus_departure}${slot.is_blocked ? "\n⚠ BLOCKED" : ""}`
                      : `${key} — Free`
                  }
                  style={{
                    width: 68, height: 48, margin: "0 3px",
                    ...base, borderRadius: 6,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    cursor: slot.is_occupied ? "pointer" : "default",
                    fontSize: 11, fontWeight: 700,
                    color: textColor,
                    transition: "all 0.15s ease",
                    transform: isHov && slot.is_occupied ? "translateY(-2px) scale(1.04)" : "none",
                    position: "relative",
                    zIndex: isHov ? 2 : 1,
                    ...(isHov && slot.is_occupied ? {
                      boxShadow: slot.is_blocked
                        ? "0 6px 20px rgba(251,191,36,0.4)"
                        : "0 6px 20px rgba(96,165,250,0.35)",
                    } : {}),
                  }}
                >
                  {slot.is_blocked && (
                    <TriangleAlert size={11} style={{ marginBottom: 1, color: "#fbbf24" }} />
                  )}
                  {slot.is_occupied && !slot.is_blocked && (
                    <Bus size={10} style={{ marginBottom: 1, color: "#60a5fa", opacity: 0.8 }} />
                  )}
                  <span style={{ lineHeight: 1.2 }}>
                    {slot.is_occupied ? (slot.bus_number ?? "") : ""}
                  </span>
                  <span style={{ fontSize: 9, opacity: 0.65, fontWeight: 500 }}>{key}</span>
                </div>
              );
            })}
          </div>
        ))}

        {/* Footer */}
        <div style={{
          textAlign: "center", marginTop: 8, fontSize: 10,
          color: "#6b7280", letterSpacing: "0.05em",
        }}>
          Slots 1–{maxSlotNum} &nbsp;·&nbsp; 1 = closest to exit
        </div>
      </div>
    </div>
  );
};

export default ParkingMap2D;
