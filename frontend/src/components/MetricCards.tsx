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
  retrievalImprovement = "45% faster (vs. last hour)",
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
      iconColor: "#60a5fa",
      iconBg: "rgba(96,165,250,0.15)",
      iconBorder: "rgba(96,165,250,0.3)",
      valueColor: "#f0f4ff",
      subColor: "#60a5fa",
      accentBorder: "rgba(96,165,250,0.25)",
    },
    {
      title: "Blocked Buses",
      value: blockedBuses,
      sub: "● Needs attention",
      icon: AlertTriangle,
      iconColor: "#fbbf24",
      iconBg: "rgba(251,191,36,0.15)",
      iconBorder: "rgba(251,191,36,0.3)",
      valueColor: blockedBuses > 0 ? "#fbbf24" : "#f0f4ff",
      subColor: blockedBuses > 0 ? "#fbbf24" : "#9ca3af",
      accentBorder: blockedBuses > 0 ? "rgba(251,191,36,0.4)" : undefined,
      glowCard: blockedBuses > 0 ? "0 0 20px rgba(251,191,36,0.12)" : undefined,
    },
    {
      title: "Occupied Slots",
      value: occupiedSlots,
      sub: `● ${occupiedPct}% of ${totalSlots}`,
      icon: ParkingCircle,
      iconColor: "#f472b6",
      iconBg: "rgba(244,114,182,0.15)",
      iconBorder: "rgba(244,114,182,0.3)",
      valueColor: "#f0f4ff",
      subColor: "#f472b6",
      accentBorder: "rgba(244,114,182,0.2)",
    },
    {
      title: "Free Slots",
      value: freeSlots,
      sub: `● ${freePct}% of ${totalSlots}`,
      icon: Car,
      iconColor: "#4ade80",
      iconBg: "rgba(74,222,128,0.15)",
      iconBorder: "rgba(74,222,128,0.3)",
      valueColor: "#4ade80",
      subColor: "#4ade80",
      accentBorder: "rgba(74,222,128,0.25)",
    },
    {
      title: "Avg. Retrieval Time",
      value: avgRetrievalTime,
      sub: retrievalImprovement,
      icon: Clock,
      iconColor: "#22d3ee",
      iconBg: "rgba(34,211,238,0.15)",
      iconBorder: "rgba(34,211,238,0.3)",
      valueColor: "#f0f4ff",
      subColor: "#22d3ee",
      accentBorder: "rgba(34,211,238,0.2)",
    },
    {
      title: "Active Sensors",
      value: activeSensors,
      sub: `● ${offlineSensors} Offline`,
      icon: Radio,
      iconColor: "#a78bfa",
      iconBg: "rgba(167,139,250,0.15)",
      iconBorder: "rgba(167,139,250,0.3)",
      valueColor: "#f0f4ff",
      subColor: offlineSensors > 0 ? "#fbbf24" : "#a78bfa",
      accentBorder: "rgba(167,139,250,0.2)",
    },
  ];

  return (
    <div
      className="metric-grid"
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
            className="liquid-glass-card metric-card"
            style={{
              padding: "16px 18px",
              borderColor: c.accentBorder,
              boxShadow: c.glowCard
                ? `var(--glass-glow), ${c.glowCard}`
                : undefined,
            }}
          >
            {/* Top row */}
            <div className="metric-card__top" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div
                className="metric-card__icon"
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: c.iconBg,
                  border: `1px solid ${c.iconBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: c.iconColor,
                  boxShadow: `0 0 12px ${c.iconBg}`,
                }}
              >
                <Icon size={16} strokeWidth={2} />
              </div>
              <span className="metric-card__title" style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af" }}>{c.title}</span>
            </div>

            {/* Value */}
            <div
              className="metric-card__value"
              style={{
                fontSize: 26, fontWeight: 800,
                color: c.valueColor,
                lineHeight: 1.1, marginBottom: 8,
                letterSpacing: "-0.02em",
              }}
            >
              {c.value}
            </div>

            {/* Sub */}
            <div
              className="metric-card__sub"
              style={{
                fontSize: 11, color: c.subColor, fontWeight: 600,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
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
