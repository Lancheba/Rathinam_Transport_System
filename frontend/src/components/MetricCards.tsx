import React from "react";
import { Bus, AlertTriangle, ParkingCircle, Car, Clock, Radio } from "lucide-react";

interface MetricCardsProps {
  totalBuses?: number;
  activeBuses?: number;
  blockedBuses?: number;
  occupiedSlots?: number;
  freeSlots?: number;
  totalSlots?: number;
  avgRetrievalTime?: string;
  retrievalImprovement?: string;
  activeSensors?: number;
  offlineSensors?: number;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  totalBuses = 4,
  activeBuses = 4,
  blockedBuses = 1,
  occupiedSlots = 4,
  freeSlots = 28,
  totalSlots = 32,
  avgRetrievalTime = "2.5 min",
  retrievalImprovement = "↓ 45% (vs. last hour)",
  activeSensors = 5,
  offlineSensors = 1,
}) => {
  const occupiedPct = ((occupiedSlots / (totalSlots || 32)) * 100).toFixed(1);
  const freePct = ((freeSlots / (totalSlots || 32)) * 100).toFixed(1);

  const cards = [
    {
      title: "Total Buses",
      value: totalBuses,
      sub: `Active: ${activeBuses} | Inactive: ${totalBuses - activeBuses}`,
      icon: Bus,
      badgeBg: "rgba(255, 255, 255, 0.08)",
      subColor: "#94a3b8",
    },
    {
      title: "Blocked Buses",
      value: blockedBuses,
      sub: "● Needs attention",
      icon: AlertTriangle,
      badgeBg: "rgba(244, 63, 94, 0.12)",
      valueColor: blockedBuses > 0 ? "#ffffff" : "#ffffff",
      subColor: blockedBuses > 0 ? "#f43f5e" : "#94a3b8",
      glowBorder: blockedBuses > 0 ? "rgba(244, 63, 94, 0.2)" : undefined,
    },
    {
      title: "Occupied Slots",
      value: occupiedSlots,
      sub: `● ${occupiedPct}% of ${totalSlots}`,
      icon: ParkingCircle,
      badgeBg: "rgba(56, 189, 248, 0.1)",
      subColor: "#94a3b8",
    },
    {
      title: "Free Slots",
      value: freeSlots,
      sub: `● ${freePct}% of ${totalSlots}`,
      icon: Car,
      badgeBg: "rgba(16, 185, 129, 0.1)",
      subColor: "#94a3b8",
    },
    {
      title: "Avg. Retrieval Time",
      value: avgRetrievalTime,
      sub: retrievalImprovement,
      icon: Clock,
      badgeBg: "rgba(255, 255, 255, 0.08)",
      subColor: "#10b981",
    },
    {
      title: "Active Sensors",
      value: activeSensors,
      sub: `● ${offlineSensors} Offline`,
      icon: Radio,
      badgeBg: "rgba(255, 255, 255, 0.08)",
      subColor: offlineSensors > 0 ? "#f43f5e" : "#10b981",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: 14,
        marginBottom: 20,
      }}
    >
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className="liquid-glass-card"
            style={{
              padding: "16px 18px",
              borderColor: c.glowBorder || undefined,
            }}
          >
            {/* Top row: Icon Badge + Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: c.badgeBg,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                }}
              >
                <Icon size={16} strokeWidth={2} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>{c.title}</span>
            </div>

            {/* Middle: Big Value */}
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: c.valueColor || "#ffffff",
                lineHeight: 1.1,
                marginBottom: 8,
                letterSpacing: "-0.02em",
              }}
            >
              {c.value}
            </div>

            {/* Bottom: Subtitle info */}
            <div
              style={{
                fontSize: 11,
                color: c.subColor,
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {c.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
};
