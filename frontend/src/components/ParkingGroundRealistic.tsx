import React, { useState } from "react";
import { MapPin, AlertTriangle } from "lucide-react";


interface ParkingGroundRealisticProps {
  onSlotClick?: (slotId: string, busNumber?: string) => void;
  selectedSlot?: string | null;
}

export const ParkingGroundRealistic: React.FC<ParkingGroundRealisticProps> = ({
  onSlotClick,
  selectedSlot,
}) => {
  const [viewMode, setViewMode] = useState<"2D" | "3D">("3D");

  // Configuration matching the image:
  // D1 -> B01, C2 -> B02, B3 -> B03 (Blocked!), B6 -> B04
  const busPlacements: Record<string, { bus: string; blocked?: boolean }> = {
    D1: { bus: "B01" },
    C2: { bus: "B02" },
    B3: { bus: "B03", blocked: true },
    B6: { bus: "B04" },
  };

  const rows = ["A", "B", "C", "D"];
  const slotNumbers = [1, 2, 3, 4, 5, 6, 7, 8];

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

      {/* Ground Container with Top and Right Dimension Labels */}
      <div style={{ position: "relative", padding: "18px 24px 8px 12px" }}>
        {/* Top 60m Dimension Line */}
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
          <span style={{ fontWeight: 600, color: "#cbd5e1" }}>60 m</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255, 255, 255, 0.15)" }} />
          <span style={{ opacity: 0.5 }}>→</span>
        </div>

        {/* Right 35m Dimension Line */}
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
            35 m
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

          {/* 4 Rows (A, B, C, D) */}
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

                {/* 8 Parking Slots */}
                <div style={{ display: "flex", flex: 1, gap: 6 }}>
                  {slotNumbers.map((num) => {
                    const slotKey = `${row}${num}`;
                    const placement = busPlacements[slotKey];
                    const hasBus = !!placement;
                    const isBlocked = placement?.blocked;
                    const isSelected = selectedSlot === slotKey;

                    return (
                      <div
                        key={num}
                        onClick={() => onSlotClick?.(slotKey, placement?.bus)}
                        style={{
                          flex: 1,
                          height: 48,
                          borderRadius: 6,
                          position: "relative",
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
                          cursor: "pointer",
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
                                {placement.bus}
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

          {/* Bottom ENTRY & EXIT Gates with Security Cabins */}
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
                <div style={{ fontSize: 9, color: "#64748b", fontFamily: "monospace" }}>Gate A (6m)</div>
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
                <div style={{ fontSize: 9, color: "#64748b", fontFamily: "monospace" }}>Gate B (6m)</div>
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
