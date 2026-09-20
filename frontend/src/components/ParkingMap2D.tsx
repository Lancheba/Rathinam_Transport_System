import React, { useState } from "react";
import { TriangleAlert, Bus, ArrowLeftRight } from "lucide-react";
import type { ParkingSlot } from "../types";
import { alpha } from "../utils/color";
import { useGateRows } from "../hooks/useGateRows";
import { isBusParkable, hasBusException, busExceptionRangeLabel } from "../utils/busSlots";

interface Props {
  slots: ParkingSlot[];
}

const slotStyle = (slot: ParkingSlot): React.CSSProperties => {
  if (!slot.is_occupied) {
    return {
      background: "rgba(74,222,128,0.04)",
      border: "1px dashed var(--slot-free-border-2d)",
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
  if (!slot.is_occupied) return "var(--slot-free-label)";
  if (slot.is_blocked) return "var(--accent-amber)";
  return "var(--accent-blue-soft)";
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

  // Gate rows come from the registered RFID sensors — that's where buses enter/exit.
  const GATE_ROWS = useGateRows(rows);
  const gateRows = rows.filter((r) => GATE_ROWS.has(r));
  const nonGateRows = rows.filter((r) => !GATE_ROWS.has(r));
  const fullyReservedRows = nonGateRows.filter((r) => !hasBusException(r));
  const partialBusRows = nonGateRows.filter((r) => hasBusException(r));

  const totalSlots   = slots.length;
  const occupiedSlots = slots.filter(s => s.is_occupied && !s.is_blocked).length;
  const blockedSlots  = slots.filter(s => s.is_blocked).length;
  const freeSlots     = slots.filter(s => !s.is_occupied).length;

  if (rows.length === 0) {
    return (
      <div style={{ color: "var(--text-dim)", fontSize: 13, padding: "24px 0" }}>
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
            border: "1px dashed var(--slot-free-border-2d)",
            display: "inline-block",
          }} />
          <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>Free</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{
            width: 24, height: 14, borderRadius: 3,
            background: "rgba(96,165,250,0.14)",
            border: "1px solid rgba(96,165,250,0.5)",
            display: "inline-block",
          }} />
          <span style={{ color: "var(--accent-blue)", fontWeight: 600 }}>Parked</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{
            width: 24, height: 14, borderRadius: 3,
            background: "rgba(251,191,36,0.15)",
            border: "2px solid rgba(251,191,36,0.6)",
            display: "inline-block",
          }} />
          <span style={{ color: "var(--accent-amber)", fontWeight: 600 }}>Blocked</span>
        </span>

        {/* Mini stat pills */}
        <div className="pm2d__pills" style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[
            { label: "Free",     val: freeSlots,     color: "var(--accent-green)", bg: "rgba(74,222,128,0.1)"  },
            { label: "Parked",   val: occupiedSlots, color: "var(--accent-blue)", bg: "rgba(96,165,250,0.1)"  },
            { label: "Blocked",  val: blockedSlots,  color: "var(--accent-amber)", bg: "rgba(251,191,36,0.1)"  },
            { label: "Total",    val: totalSlots,    color: "var(--accent-violet)", bg: "rgba(167,139,250,0.1)" },
          ].map(p => (
            <div key={p.label} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 9999,
              background: p.bg, border: `1px solid ${alpha(p.color, 27)}`,
              fontSize: 11,
            }}>
              <span style={{ color: p.color, fontWeight: 800 }}>{p.val}</span>
              <span style={{ color: "var(--text-muted)" }}>{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ground */}
      <div className="pm2d__ground" style={{
        border: "1px solid rgba(167,139,250,0.2)",
        borderRadius: 16,
        padding: "18px 20px",
        background: "var(--canvas-glass)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "inline-block",
        boxShadow: "0 0 40px rgba(99,102,241,0.08), inset 0 1px 0 rgb(var(--ov) / 0.06)",
        position: "relative",
      }}>
        {/* Subtle grid lines background */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 16,
          backgroundImage: `
            linear-gradient(rgb(var(--ov) / 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgb(var(--ov) / 0.015) 1px, transparent 1px)
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
            color: "var(--accent-violet)", padding: "4px 14px", borderRadius: 9999,
            background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)",
          }}>
            ⇄ LANE GATES {gateRows.join(" · ")} — ENTRY / EXIT
          </span>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(167,139,250,0.4))" }} />
        </div>

        {/* Rows */}
        {rows.map((row) => {
          const isGate = GATE_ROWS.has(row);
          return (
          <div key={row} className="pm2d__row" style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            {/* Lane gate: gated rows are open at their left end (slot 1) —
                buses drive in and out through those lanes. Other rows have no gate. */}
            <span
              className="pm2d__label"
              title={
                isGate
                  ? `Gate ${row} — buses enter and leave this lane here`
                  : hasBusException(row)
                  ? `Row ${row} — no direct entry/exit, but slots ${busExceptionRangeLabel(row)} allow bus parking`
                  : `Row ${row} — no direct entry/exit`
              }
              style={{
              width: 34, height: 48, flexShrink: 0, marginRight: 24,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
              borderRadius: 6,
              backgroundColor: "var(--canvas-solid)",
              backgroundImage: isGate
                ? "linear-gradient(90deg, rgba(74,222,128,0.18) 0%, rgba(74,222,128,0.04) 100%)"
                : "none",
              borderLeft: isGate ? "3px solid var(--accent-green)" : "3px solid rgb(var(--ov) / 0.15)",
              fontSize: 13, fontWeight: 800, lineHeight: 1,
              color: "var(--accent-violet)", textShadow: "0 0 8px rgba(167,139,250,0.5)",
            }}>
              {row}
              {isGate ? (
                <ArrowLeftRight size={10} style={{ color: "var(--accent-green)" }} />
              ) : (
                <span style={{ fontSize: 6, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.04em" }}>NO GATE</span>
              )}
            </span>

            {slotNums.map((num) => {
              const key = `${row}${num}`;
              const slot = slotMap[key];
              const isHov = hovered === key;

              if (!slot) return (
                <div key={num} className="pm2d__slot" style={{
                  width: 68, height: 48, margin: "0 3px",
                  background: "rgb(var(--ov) / 0.01)",
                  borderRadius: 5,
                  border: "1px dashed rgb(var(--ov) / 0.04)",
                }} />
              );

              // Empty slots in rows with no bus gate are the bike & car area — unless
              // this slot falls inside that row's extra bus-parking range.
              const reserved = !isBusParkable(row, num, isGate) && !slot.is_occupied;
              const base: React.CSSProperties = reserved
                ? {
                    background: "repeating-linear-gradient(45deg, rgba(251,191,36,0.16) 0 6px, rgba(251,191,36,0.03) 6px 12px)",
                    border: "1px dashed rgba(251,191,36,0.45)",
                    boxShadow: "none",
                  }
                : slotStyle(slot);
              const textColor = reserved ? "rgba(251,191,36,0.65)" : slotTextColor(slot);

              return (
                <div
                  key={num}
                  className="pm2d__slot"
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                  title={
                    slot.is_occupied
                      ? `${slot.bus_number} — ${slot.bus_route}\nDeparts: ${slot.bus_departure}${slot.is_blocked ? "\n⚠ BLOCKED" : ""}`
                      : reserved ? `${key} — Bikes & cars only, no bus parking`
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
                    <TriangleAlert size={11} style={{ marginBottom: 1, color: "var(--accent-amber)" }} />
                  )}
                  {slot.is_occupied && !slot.is_blocked && (
                    <Bus size={10} style={{ marginBottom: 1, color: "var(--accent-blue)", opacity: 0.8 }} />
                  )}
                  <span style={{ lineHeight: 1.2 }}>
                    {slot.is_occupied ? (slot.bus_number ?? "") : ""}
                  </span>
                  <span style={{ fontSize: 9, opacity: 0.65, fontWeight: 500 }}>{key}</span>
                </div>
              );
            })}
          </div>
          );
        })}

        {/* Footer */}
        <div style={{
          textAlign: "center", marginTop: 8, fontSize: 10,
          color: "var(--text-dim)", letterSpacing: "0.05em",
        }}>
          Slots 1–{maxSlotNum} &nbsp;·&nbsp; Slot 1 = at the lane gate (open end)
          {fullyReservedRows.length > 0 && <> &nbsp;·&nbsp; Rows {fullyReservedRows.join("/")} are for bikes &amp; cars — no bus parking</>}
          {partialBusRows.map((r) => (
            <React.Fragment key={r}>
              {" "}&nbsp;·&nbsp; Row {r}: slots {busExceptionRangeLabel(r)} open for bus parking, rest bikes &amp; cars only
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParkingMap2D;
