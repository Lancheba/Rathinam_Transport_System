import React, { useEffect, useState, useCallback } from "react";
import { MapPin, TriangleAlert, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ArrowLeftRight, Building2, Lightbulb } from "lucide-react";
import { getGround, getSlots } from "../api/endpoints";
import { useGateRows } from "../hooks/useGateRows";
import type { ParkingGround, ParkingSlot } from "../types";
import { useIsMobile } from "../hooks/useMediaQuery";
import { alpha } from "../utils/color";
import { isBusParkable, hasBusException, busExceptionRangeLabel } from "../utils/busSlots";

interface ParkingGroundRealisticProps {
  onSlotClick?: (slotId: string, busNumber?: string) => void;
  selectedSlot?: string | null;
  refreshIntervalMs?: number;
}

const fmtMeters = (val: string | number | undefined): string => {
  if (val === undefined || val === null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (Number.isNaN(n)) return "—";
  return (Math.round(n * 100) / 100).toString();
};

/* ── slot appearance ── */
const slotBg = (hasBus: boolean, isBlocked: boolean, isSelected: boolean) => {
  if (isBlocked)  return "radial-gradient(circle at 50% 30%, rgba(251,191,36,0.22) 0%, rgba(251,191,36,0.05) 100%)";
  if (isSelected) return "radial-gradient(circle at 50% 30%, rgba(96,165,250,0.22) 0%, rgba(96,165,250,0.05) 100%)";
  if (hasBus)     return "radial-gradient(circle at 50% 30%, rgba(96,165,250,0.1) 0%, var(--slot-fade) 100%)";
  return "rgb(var(--shadow-rgb) / calc(0.22 * var(--shadow-k)))";
};

const slotBorder = (hasBus: boolean, isBlocked: boolean, isSelected: boolean) => {
  if (isBlocked)  return "1.5px solid rgba(251,191,36,0.7)";
  if (isSelected) return "1.5px solid rgba(96,165,250,0.8)";
  if (hasBus)     return "1px solid rgba(96,165,250,0.35)";
  return "1px dashed var(--slot-free-border)";
};

const slotGlow = (hasBus: boolean, isBlocked: boolean, isSelected: boolean) => {
  if (isBlocked)  return "0 0 18px rgba(251,191,36,0.35), inset 0 0 10px rgba(251,191,36,0.1)";
  if (isSelected) return "0 0 16px rgba(96,165,250,0.45)";
  if (hasBus)     return "0 0 10px rgba(96,165,250,0.15)";
  return "none";
};

/* bus body gradient */
const busBg = (isBlocked: boolean) =>
  isBlocked
    ? "linear-gradient(180deg, #92400e 0%, #78350f 60%, #451a03 100%)"
    : "linear-gradient(180deg, #dbeafe 0%, var(--accent-blue-soft) 50%, #3b82f6 100%)";

const busGlow = (isBlocked: boolean) =>
  isBlocked
    ? "0 4px 14px rgba(251,191,36,0.5)"
    : "0 4px 12px rgba(59,130,246,0.55)";

const busBorder = (isBlocked: boolean) =>
  isBlocked ? "1px solid rgba(251,191,36,0.6)" : "1px solid rgba(147,197,253,0.8)";

export const ParkingGroundRealistic: React.FC<ParkingGroundRealisticProps> = ({
  onSlotClick,
  selectedSlot,
  refreshIntervalMs = 15000,
}) => {
  const [viewMode, setViewMode] = useState<"2D" | "3D">("3D");
  const [ground, setGround] = useState<ParkingGround | null>(null);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);
  // Touch screens have no hover tooltips, so a tapped slot's details are shown in a strip under the map
  const isMobile = useIsMobile();
  const [picked, setPicked] = useState<string | null>(null);
  const pickedKey = isMobile ? picked : null;

  const load = useCallback(async () => {
    try {
      const [grounds, slotList] = await Promise.all([getGround(), getSlots()]);
      setGround(grounds?.[0] ?? null);
      setSlots(slotList);
      setError("");
    } catch {
      setError("Could not reach the parking backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (!refreshIntervalMs) return;
    const id = setInterval(load, refreshIntervalMs);
    return () => clearInterval(id);
  }, [load, refreshIntervalMs]);

  const slotMap: Record<string, ParkingSlot> = {};
  const rowSet = new Set<string>();
  let maxSlotNum = 0;
  slots.forEach((s) => {
    slotMap[`${s.row}${s.slot_number}`] = s;
    rowSet.add(s.row);
    if (s.slot_number > maxSlotNum) maxSlotNum = s.slot_number;
  });
  const rows = Array.from(rowSet).sort();
  const slotNumbers = Array.from({ length: maxSlotNum || 0 }, (_, i) => i + 1);
  const pickedSlot = pickedKey ? slotMap[pickedKey] : undefined;

  // Gate rows come from the registered RFID sensors — that's where buses enter/exit.
  const GATE_ROWS = useGateRows(rows);
  const gateRows = rows.filter((r) => GATE_ROWS.has(r));
  const nonGateRows = rows.filter((r) => !GATE_ROWS.has(r));
  const fullyReservedRows = nonGateRows.filter((r) => !hasBusException(r));
  const partialBusRows = nonGateRows.filter((r) => hasBusException(r));

  /* live mini-stats */
  const freeCount     = slots.filter(s => !s.is_occupied).length;
  const parkedCount   = slots.filter(s => s.is_occupied && !s.is_blocked).length;
  const blockedCount  = slots.filter(s => s.is_blocked).length;

  return (
    <div className="liquid-glass-card pg" style={{ padding: "20px 22px" }}>
      {/* ── Header ── */}
      <div className="pg__head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="pg__title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MapPin size={18} style={{ color: "var(--accent-violet)" }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>Parking Ground Overview</span>
          {error && <span style={{ fontSize: 11, color: "var(--accent-red)", fontWeight: 600 }}>{error}</span>}
        </div>

        <div className="pg__tools" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Live stat pills */}
          {!loading && rows.length > 0 && (
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { val: freeCount,    color: "var(--accent-green)", bg: "rgba(74,222,128,0.1)",  label: "Free"    },
                { val: parkedCount,  color: "var(--accent-blue)", bg: "rgba(96,165,250,0.1)",  label: "Parked"  },
                { val: blockedCount, color: "var(--accent-amber)", bg: "rgba(251,191,36,0.1)",  label: "Blocked" },
              ].map(p => (
                <div key={p.label} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "3px 9px", borderRadius: 9999,
                  background: p.bg, border: `1px solid ${alpha(p.color, 27)}`, fontSize: 11,
                }}>
                  <span style={{ color: p.color, fontWeight: 800 }}>{p.val}</span>
                  <span style={{ color: "var(--text-muted)" }}>{p.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* 2D / 3D toggle */}
          <div className="pg__toggle" style={{
            display: "flex", background: "rgb(var(--ov) / 0.05)",
            borderRadius: 9999, padding: 3,
            border: "1px solid rgb(var(--ov) / 0.08)",
          }}>
            {(["2D","3D"] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding: "5px 14px", borderRadius: 9999, border: "none",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: viewMode === mode
                  ? "linear-gradient(135deg,rgba(99,102,241,0.6) 0%,rgba(139,92,246,0.4) 100%)"
                  : "transparent",
                color: viewMode === mode ? "var(--text-strong)" : "var(--text-muted)",
                boxShadow: viewMode === mode ? "0 0 12px rgba(99,102,241,0.3)" : "none",
                transition: "all 0.2s ease",
              }}>{mode} View</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Dimension wrapper ── */}
      <div className="pg__wrap" style={{ position: "relative", padding: "18px 28px 8px 12px" }}>

        {/* Top dimension line */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 11, fontFamily: "monospace" }}>
          <ArrowLeft size={12} style={{ color: "var(--text-dim)" }} />
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(167,139,250,0.4), rgba(167,139,250,0.15))" }} />
          <span style={{ fontWeight: 700, color: "var(--accent-violet)", padding: "2px 8px", borderRadius: 9999, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)" }}>
            {ground ? `${fmtMeters(ground.length_m)} m` : loading ? "…" : "— m"}
          </span>
          <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, rgba(167,139,250,0.4), rgba(167,139,250,0.15))" }} />
          <ArrowRight size={12} style={{ color: "var(--text-dim)" }} />
        </div>

        {/* Right width label */}
        <div style={{
          position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          fontSize: 11, fontFamily: "monospace",
        }}>
          <ArrowUp size={12} style={{ color: "var(--text-dim)" }} />
          <span style={{ fontWeight: 700, color: "var(--accent-violet)", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
            {ground ? `${fmtMeters(ground.width_m)} m` : loading ? "…" : "— m"}
          </span>
          <ArrowDown size={12} style={{ color: "var(--text-dim)" }} />
        </div>

        {/* ── The Ground ── */}
        <div className="pg__ground" style={{
          background: "var(--canvas-grad)",
          borderRadius: 16,
          border: "1px solid rgba(99,102,241,0.2)",
          boxShadow: "var(--canvas-shadow)",
          padding: "24px 20px 20px 20px",
          position: "relative",
          overflow: "hidden",
          transform: viewMode === "3D" ? "perspective(1200px) rotateX(18deg) scale(0.98)" : "none",
          transition: "transform 0.5s cubic-bezier(0.16,1,0.3,1)",
          transformOrigin: "center bottom",
        }}>

          {/* Colored lamp glows */}
          <div style={{
            position: "absolute", top: 0, left: 30, width: 160, height: 160,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", top: 0, right: 30, width: 160, height: 160,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          {/* subtle lane lines */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: 16,
            backgroundImage: "repeating-linear-gradient(90deg, rgb(var(--ov) / 0.012) 0px, rgb(var(--ov) / 0.012) 1px, transparent 1px, transparent 80px)",
            pointerEvents: "none",
          }} />

          {/* Lamp icons */}
          <Lightbulb size={13} style={{ position: "absolute", top: 8, left: 14, color: "var(--accent-blue)", filter: "drop-shadow(0 0 4px var(--accent-blue))" }} />
          <Lightbulb size={13} style={{ position: "absolute", top: 8, right: 14, color: "var(--accent-violet)", filter: "drop-shadow(0 0 4px var(--accent-violet))" }} />

          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
              Loading live slot data…
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
              No parking slots are configured on the server yet.
            </div>
          ) : (
            <div className="pg__scroll" style={{ marginBottom: 28 }}>
            <div
              className="pg__rows"
              style={{ display: "flex", flexDirection: "column", gap: 30, ["--pg-cols" as string]: slotNumbers.length }}
            >
              {rows.map((row) => {
                const isGate = GATE_ROWS.has(row);
                const isReservedGate = (row === "B" || row === "C");
                return (
                <div key={row} className="pg__row" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Lane gate: gated rows are open at their left end (Slot 1) —
                      buses drive in and back out through those openings.
                      Rows without a gate are accessed internally. */}
                  <div
                    className="pg__label"
                    title={
                      isGate
                        ? `Gate ${row} — buses enter and leave this lane here`
                        : hasBusException(row)
                        ? `Row ${row} — no direct entry/exit, but slots ${busExceptionRangeLabel(row)} allow bus parking`
                        : `Row ${row} — no direct entry/exit`
                    }
                    style={{
                    width: 56, height: 48, flexShrink: 0, marginRight: 36,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                    borderRadius: 8,
                    backgroundColor: "var(--canvas-solid)",
                    backgroundImage: isReservedGate
                      ? "linear-gradient(90deg, rgba(251,191,36,0.18) 0%, rgba(251,191,36,0.04) 100%)"
                      : isGate
                      ? "linear-gradient(90deg, rgba(74,222,128,0.18) 0%, rgba(74,222,128,0.04) 100%)"
                      : "none",
                    border: isReservedGate ? "1px solid rgba(251,191,36,0.5)" : isGate ? "1px solid rgba(74,222,128,0.35)" : "1px solid rgb(var(--ov) / 0.08)",
                    borderLeft: isReservedGate ? "3px solid var(--accent-amber)" : isGate ? "3px solid var(--accent-green)" : "3px solid rgb(var(--ov) / 0.15)",
                    boxShadow: isReservedGate ? "0 0 12px rgba(251,191,36,0.14)" : isGate ? "0 0 12px rgba(74,222,128,0.14)" : "none",
                    fontFamily: "monospace",
                  }}>
                    <span style={{
                      fontSize: 14, fontWeight: 800, lineHeight: 1,
                      color: "var(--accent-violet)", textShadow: "0 0 10px rgba(167,139,250,0.6)",
                    }}>{row}</span>
                    {isReservedGate ? (
                      <span className="pg__gate-text" style={{
                        display: "flex", alignItems: "center", gap: 2,
                        fontSize: 7.5, fontWeight: 800, letterSpacing: "0.06em", color: "var(--accent-amber)",
                      }}>
                        BLOCKED
                      </span>
                    ) : isGate ? (
                      <span className="pg__gate-text" style={{
                        display: "flex", alignItems: "center", gap: 2,
                        fontSize: 7.5, fontWeight: 800, letterSpacing: "0.06em", color: "var(--accent-green)",
                      }}>
                        <ArrowLeftRight size={9} /> IN/OUT
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 7, fontWeight: 700, letterSpacing: "0.05em", color: "var(--text-dim)",
                      }}>NO GATE</span>
                    )}
                  </div>

                  <div className="pg__slots" style={{ display: "flex", flex: 1, gap: 18 }}>
                    {/* B1-B3 and C1-C3: show as one merged Cars & Bikes cell */}
                    {(row === "B" || row === "C") && slotNumbers[0] === 1 && (
                      <div
                        title="Cars & Bikes Parking — B1-B3 / C1-C3"
                        style={{
                          flex: 3, height: 48, borderRadius: 6,
                          background: "repeating-linear-gradient(45deg, rgba(251,191,36,0.18) 0 7px, rgba(251,191,36,0.04) 7px 14px)",
                          border: "1.5px dashed rgba(251,191,36,0.6)",
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center", gap: 2,
                          cursor: "default",
                        }}
                      >
                        <span style={{ fontSize: 13 }}>🚗🛵</span>
                        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", color: "rgba(251,191,36,0.9)", textAlign: "center" }}>CARS &amp; BIKES</span>
                        <span style={{ fontSize: 7, fontFamily: "monospace", color: "rgba(251,191,36,0.55)" }}>{row}1 – {row}3</span>
                      </div>
                    )}
                    {slotNumbers.map((num) => {
                      if ((row === "B" || row === "C") && num <= 3) return null;
                      const slotKey = `${row}${num}`;
                      const slot = slotMap[slotKey];
                      const hasBus    = !!slot?.is_occupied;
                      const isBlocked = !!slot?.is_blocked;
                      const isSelected = selectedSlot === slotKey || pickedKey === slotKey;
                      const exists = !!slot;
                      const isHov = hovered === slotKey;
                      const reserved = exists && !isBusParkable(row, num, isGate) && !hasBus;
                      return (
                        <div key={num} className="pg__slot"
                          onClick={() => { if (!exists) return; if (isMobile) setPicked((cur) => (cur === slotKey ? null : slotKey)); onSlotClick?.(slotKey, slot?.bus_number ?? undefined); }}
                          onMouseEnter={() => exists && setHovered(slotKey)}
                          onMouseLeave={() => setHovered(null)}
                          title={!exists ? "No such slot" : reserved ? `${slotKey} — Bikes & cars only` : hasBus ? `${slot?.bus_number ?? "Unknown"}` : `${slotKey} — Free`}
                          style={{
                            flex: 1, height: 48, borderRadius: 6, position: "relative",
                            opacity: exists ? 1 : 0.25,
                            background: reserved ? "repeating-linear-gradient(45deg, rgba(251,191,36,0.16) 0 6px, rgba(251,191,36,0.03) 6px 12px)" : slotBg(hasBus, isBlocked, isSelected),
                            border: reserved ? "1px dashed rgba(251,191,36,0.45)" : slotBorder(hasBus, isBlocked, isSelected),
                            boxShadow: reserved ? "none" : isHov && exists ? (isBlocked ? "0 0 22px rgba(251,191,36,0.5)" : hasBus ? "0 0 18px rgba(96,165,250,0.4)" : "0 0 10px rgba(74,222,128,0.2)") : slotGlow(hasBus, isBlocked, isSelected),
                            cursor: reserved ? "not-allowed" : exists ? "pointer" : "default",
                            outline: pickedKey === slotKey ? "2px solid rgb(var(--ov) / 0.9)" : undefined,
                            outlineOffset: pickedKey === slotKey ? 2 : undefined,
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            transition: "all 0.15s ease",
                            transform: isHov && hasBus ? "translateY(-2px)" : "none",
                          }}
                        >
                          {hasBus ? (
                            <div style={{ width: "82%", height: 24, borderRadius: 4, background: busBg(isBlocked), boxShadow: busGlow(isBlocked), border: busBorder(isBlocked), position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <div style={{ position: "absolute", left: 3, width: 5, height: 16, background: isBlocked ? "rgb(var(--shadow-rgb) / calc(0.5 * var(--shadow-k)))" : "rgba(30,58,138,0.8)", borderRadius: 1 }} />
                              {isBlocked ? <TriangleAlert size={12} style={{ color: "var(--accent-amber)", filter: "drop-shadow(0 0 4px var(--accent-amber))" }} /> : <span style={{ fontSize: 8, fontWeight: 800, color: "#1e3a8a", letterSpacing: "-0.03em" }}>{slot?.bus_number ?? ""}</span>}
                            </div>
                          ) : null}
                          <span style={{ position: "absolute", bottom: 2, fontSize: 9, fontFamily: "monospace", fontWeight: 600, color: reserved ? "rgba(251,191,36,0.65)" : isBlocked ? "var(--accent-amber)" : hasBus ? "var(--accent-blue)" : "var(--slot-free-label)" }}>{slotKey}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </div>
            </div>
          )}

          {/* ── Lane gates note ── */}
          <div className="pg__gates" style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
            paddingTop: 10, borderTop: "1px solid rgba(99,102,241,0.15)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                background: "linear-gradient(135deg, rgba(74,222,128,0.2) 0%, rgba(74,222,128,0.05) 100%)",
                border: "1px solid rgba(74,222,128,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 12px rgba(74,222,128,0.2)",
              }}>
                <Building2 size={15} style={{ color: "var(--accent-green)" }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, letterSpacing: "0.06em" }}>
                  <ArrowLeftRight size={12} style={{ color: "var(--accent-green)" }} />
                  <span style={{ color: "var(--accent-green)", textShadow: "0 0 8px rgba(74,222,128,0.5)" }}>ENTRY / EXIT</span>
                </div>
                <div style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "monospace" }}>
                  Gates {gateRows.join(" · ")} — open end of the lane
                  {fullyReservedRows.length > 0 && ` · rows ${fullyReservedRows.join("/")} are for bikes & cars — no bus parking`}
                  {partialBusRows.map((r) => ` · row ${r}: slots ${busExceptionRangeLabel(r)} open for bus parking, rest bikes & cars only`).join("")}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "monospace", textAlign: "right" }}>
              Slot 1 = at the gate
            </div>
          </div>
        </div>
      </div>

      {/* Tap-to-inspect: replaces the hover tooltip on touch screens */}
      {pickedKey && (
        <div className="pg__info" role="status" aria-live="polite">
          {pickedSlot?.is_occupied ? (
            <>
              <div className="pg__info-main">
                <strong>{pickedSlot.bus_number ?? "Unknown bus"}</strong>
                <span>Row {pickedSlot.row}, Slot {pickedSlot.slot_number}</span>
                {pickedSlot.is_blocked && (
                  <span className="pg__info-flag"><TriangleAlert size={12} /> Blocked</span>
                )}
              </div>
              <div className="pg__info-sub">
                {pickedSlot.bus_route ?? "No route"} · Departs {pickedSlot.bus_departure?.slice(0, 5) ?? "—"}
              </div>
            </>
          ) : (
            <div className="pg__info-main">
              <strong>{pickedKey}</strong>
              <span>Free slot</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
