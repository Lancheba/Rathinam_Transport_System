import React, { useEffect, useState, useCallback } from "react";
import { MapPin, AlertTriangle } from "lucide-react";
import { getGround, getSlots } from "../api/endpoints";
import type { ParkingGround, ParkingSlot } from "../types";

interface ParkingGroundRealisticProps {
  onSlotClick?: (slotId: string, busNumber?: string) => void;
  selectedSlot?: string | null;
  /** Poll the backend for live updates. Set to 0 to disable. */
  refreshIntervalMs?: number;
}

const fmtMeters = (val: string | number | undefined): string => {
  if (val === undefined || val === null) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (Number.isNaN(n)) return "—";
  return (Math.round(n * 100) / 100).toString();
};

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

  // Build the grid dynamically from whatever slots actually exist on the server
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

  return (
    <div className="liquid-glass-card" style={{ padding: "20px 22px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MapPin size={18} style={{ color: "#ffffff" }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>
            Parking Ground Overview
          </span>
          {error && (
            <span style={{ fontSize: 11, color: "#f87171", fontWeight: 600 }}>
              {error}
            </span>
          )}
        </div>

        {/* 2D / 3D Toggle Pill */}
        <div
          style={{
            display: "flex",
            background: "rgba(255, 255, 255, 0.06)",
            borderRadius: 9999,
            padding: 3,
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <button
            onClick={() => setViewMode("2D")}
            style={{
              padding: "5px 14px",
              borderRadius: 9999,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: viewMode === "2D" ? "rgba(255, 255, 255, 0.2)" : "transparent",
              color: viewMode === "2D" ? "#ffffff" : "#94a3b8",
              boxShadow: viewMode === "2D" ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            2D View
          </button>
          <button
            onClick={() => setViewMode("3D")}
            style={{
              padding: "5px 14px",
              borderRadius: 9999,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: viewMode === "3D" ? "rgba(255, 255, 255, 0.2)" : "transparent",
              color: viewMode === "3D" ? "#ffffff" : "#94a3b8",
              boxShadow: viewMode === "3D" ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            3D View
          </button>
        </div>
      </div>

      {/* Ground Container with Top and Right Dimension Labels — driven by /api/parking/ground/ */}
      <div style={{ position: "relative", padding: "18px 24px 8px 12px" }}>
        {/* Top Length Dimension Line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 8,
            color: "#94a3b8",
            fontSize: 11,
            fontFamily: "monospace",
          }}
        >
          <span style={{ opacity: 0.5 }}>←</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255, 255, 255, 0.15)" }} />
          <span style={{ fontWeight: 600, color: "#cbd5e1" }}>
            {ground ? `${fmtMeters(ground.length_m)} m` : loading ? "…" : "— m"}
          </span>
          <div style={{ flex: 1, height: 1, background: "rgba(255, 255, 255, 0.15)" }} />
          <span style={{ opacity: 0.5 }}>→</span>
        </div>

        {/* Right Width Dimension Line */}
        <div
          style={{
            position: "absolute",
            right: 2,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            color: "#94a3b8",
            fontSize: 11,
            fontFamily: "monospace",
          }}
        >
          <span style={{ opacity: 0.5 }}>↑</span>
          <span style={{ fontWeight: 600, color: "#cbd5e1", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
            {ground ? `${fmtMeters(ground.width_m)} m` : loading ? "…" : "— m"}
          </span>
          <span style={{ opacity: 0.5 }}>↓</span>
        </div>

        {/* The Realistic Ground Area */}
        <div
          style={{
            background: "radial-gradient(ellipse at 50% 40%, #171c26 0%, #0c1018 70%, #07090f 100%)",
            borderRadius: 16,
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "inset 0 0 60px rgba(0, 0, 0, 0.85), 0 12px 36px rgba(0, 0, 0, 0.6)",
            padding: "24px 20px 20px 20px",
            position: "relative",
            overflow: "hidden",
            transform: viewMode === "3D" ? "perspective(1200px) rotateX(18deg) scale(0.98)" : "none",
            transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            transformOrigin: "center bottom",
          }}
        >
          {/* Subtle Asphalt Texture & Overhead Lamp Glows */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 30,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 30,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Lamp Post Visuals at corners */}
          <div style={{ position: "absolute", top: 8, left: 14, color: "#94a3b8", fontSize: 10 }}>💡</div>
          <div style={{ position: "absolute", top: 8, right: 14, color: "#94a3b8", fontSize: 10 }}>💡</div>

          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#64748b", fontSize: 13 }}>
              Loading live slot data…
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#64748b", fontSize: 13 }}>
              No parking slots are configured on the server yet.
            </div>
          ) : (
            /* Rows — derived from real slot rows returned by /api/parking/slots/ */
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
              {rows.map((row) => (
                <div key={row} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Row Label */}
                  <div
                    style={{
                      width: 24,
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#ffffff",
                      textAlign: "center",
                      textShadow: "0 0 10px rgba(255, 255, 255, 0.4)",
                    }}
                  >
                    {row}
                  </div>

                  {/* Parking Slots for this row */}
                  <div style={{ display: "flex", flex: 1, gap: 6 }}>
                    {slotNumbers.map((num) => {
                      const slotKey = `${row}${num}`;
                      const slot = slotMap[slotKey];
                      const hasBus = !!slot?.is_occupied;
                      const isBlocked = !!slot?.is_blocked;
                      const isSelected = selectedSlot === slotKey;
                      const exists = !!slot;

                      return (
                        <div
                          key={num}
                          onClick={() => exists && onSlotClick?.(slotKey, slot?.bus_number ?? undefined)}
                          title={
                            !exists
                              ? "No such slot"
                              : hasBus
                              ? `${slot?.bus_number ?? "Unknown bus"}${isBlocked ? " — BLOCKED" : ""}`
                              : "Free"
                          }
                          style={{
                            flex: 1,
                            height: 48,
                            borderRadius: 6,
                            position: "relative",
                            opacity: exists ? 1 : 0.35,
                            border: isBlocked
                              ? "1.5px solid #f43f5e"
                              : isSelected
                              ? "1.5px solid #38bdf8"
                              : "1px dashed rgba(255, 255, 255, 0.16)",
                            background: isBlocked
                              ? "radial-gradient(circle, rgba(244, 63, 94, 0.28) 0%, rgba(244, 63, 94, 0.06) 100%)"
                              : hasBus
                              ? "rgba(255, 255, 255, 0.04)"
                              : "rgba(0, 0, 0, 0.2)",
                            boxShadow: isBlocked
                              ? "0 0 20px rgba(244, 63, 94, 0.45), inset 0 0 12px rgba(244, 63, 94, 0.3)"
                              : isSelected
                              ? "0 0 16px rgba(56, 189, 248, 0.4)"
                              : "none",
                            cursor: exists ? "pointer" : "default",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s ease",
                          }}
                        >
                          {/* Bus Vehicle Rendering */}
                          {hasBus ? (
                            <div
                              style={{
                                width: "82%",
                                height: 24,
                                borderRadius: 4,
                                background: isBlocked
                                  ? "linear-gradient(180deg, #e11d48 0%, #be123c 100%)"
                                  : "linear-gradient(180deg, #f8fafc 0%, #cbd5e1 50%, #94a3b8 100%)",
                                boxShadow: isBlocked
                                  ? "0 4px 12px rgba(244, 63, 94, 0.6)"
                                  : "0 4px 10px rgba(0, 0, 0, 0.6)",
                                position: "relative",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: isBlocked
                                  ? "1px solid #fda4af"
                                  : "1px solid rgba(255, 255, 255, 0.8)",
                              }}
                            >
                              {/* Bus Front Windshield & Windows */}
                              <div
                                style={{
                                  position: "absolute",
                                  left: 3,
                                  width: 5,
                                  height: 16,
                                  background: isBlocked ? "#881337" : "#1e293b",
                                  borderRadius: 1,
                                }}
                              />
                              {/* Warning Icon on Blocked Bus */}
                              {isBlocked ? (
                                <AlertTriangle size={13} style={{ color: "#ffffff", zIndex: 2 }} />
                              ) : (
                                <span
                                  style={{
                                    fontSize: 8,
                                    fontWeight: 800,
                                    color: "#0f172a",
                                    letterSpacing: "-0.03em",
                                  }}
                                >
                                  {slot?.bus_number ?? ""}
                                </span>
                              )}
                            </div>
                          ) : null}

                          {/* Slot Identifier at bottom */}
                          <span
                            style={{
                              position: "absolute",
                              bottom: 2,
                              fontSize: 9,
                              fontFamily: "monospace",
                              fontWeight: 600,
                              color: isBlocked ? "#fca5a5" : "#64748b",
                            }}
                          >
                            {slotKey}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom ENTRY & EXIT Gates with Security Cabins — widths from /api/parking/ground/ */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              paddingTop: 8,
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            {/* ENTRY Gate */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Cabin */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: "linear-gradient(135deg, #334155 0%, #1e293b 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
                }}
              >
                🏢
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                  }}
                >
                  <span>↑</span>
                  <span>ENTRY</span>
                </div>
                <div style={{ fontSize: 9, color: "#64748b", fontFamily: "monospace" }}>
                  Gate A ({ground ? fmtMeters(ground.entrance_width_m) : "—"}m)
                </div>
              </div>
            </div>

            {/* EXIT Gate */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                    justifyContent: "flex-end",
                  }}
                >
                  <span>↓</span>
                  <span>EXIT</span>
                </div>
                <div style={{ fontSize: 9, color: "#64748b", fontFamily: "monospace" }}>
                  Gate B ({ground ? fmtMeters(ground.exit_width_m) : "—"}m)
                </div>
              </div>
              {/* Cabin */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: "linear-gradient(135deg, #334155 0%, #1e293b 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
                }}
              >
                🏢
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
