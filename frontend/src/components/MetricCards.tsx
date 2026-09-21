import React from "react";
import { Bus, AlertTriangle, ParkingCircle, Car, Radio, Users } from "lucide-react";

interface MetricCardsProps {
  totalBuses: number;
  activeBuses: number;
  blockedBuses: number;
  occupiedSlots: number;
  freeSlots: number;
  totalSlots: number;
  activeSensors: number;
  offlineSensors: number;
  /** Omit entirely for students — roster totals are a staff/admin-only metric. */
  totalStudents?: number;
  unassignedStudents?: number;
}

const pctOf = (part: number, whole: number) =>
  whole > 0 ? ((part / whole) * 100).toFixed(1) : "0.0";

export const MetricCards: React.FC<MetricCardsProps> = ({
  totalBuses,
  activeBuses,
  blockedBuses,
  occupiedSlots,
  freeSlots,
  totalSlots,
  activeSensors,
  offlineSensors,
  totalStudents,
  unassignedStudents,
}) => {
  const occupiedPct = pctOf(occupiedSlots, totalSlots);
  const freePct = pctOf(freeSlots, totalSlots);

  const cards = [
    {
      title: "Total Buses",
      value: totalBuses,
      sub: `Active: ${activeBuses} | Inactive: ${totalBuses - activeBuses}`,
      icon: Bus,
      iconColor: "var(--accent-blue)",
      iconBg: "rgba(96,165,250,0.15)",
      iconBorder: "rgba(96,165,250,0.3)",
      valueColor: "var(--text-strong)",
      subColor: "var(--accent-blue)",
      accentBorder: "rgba(96,165,250,0.25)",
    },
    {
      title: "Blocked Buses",
      value: blockedBuses,
      sub: "● Needs attention",
      icon: AlertTriangle,
      iconColor: "var(--accent-amber)",
      iconBg: "rgba(251,191,36,0.15)",
      iconBorder: "rgba(251,191,36,0.3)",
      valueColor: blockedBuses > 0 ? "var(--accent-amber)" : "var(--text-strong)",
      subColor: blockedBuses > 0 ? "var(--accent-amber)" : "var(--text-muted)",
      accentBorder: blockedBuses > 0 ? "rgba(251,191,36,0.4)" : undefined,
      glowCard: blockedBuses > 0 ? "0 0 20px rgba(251,191,36,0.12)" : undefined,
    },
    {
      title: "Occupied Slots",
      value: occupiedSlots,
      sub: `● ${occupiedPct}% of ${totalSlots}`,
      icon: ParkingCircle,
      iconColor: "var(--accent-pink)",
      iconBg: "rgba(244,114,182,0.15)",
      iconBorder: "rgba(244,114,182,0.3)",
      valueColor: "var(--text-strong)",
      subColor: "var(--accent-pink)",
      accentBorder: "rgba(244,114,182,0.2)",
    },
    {
      title: "Free Slots",
      value: freeSlots,
      sub: `● ${freePct}% of ${totalSlots}`,
      icon: Car,
      iconColor: "var(--accent-green)",
      iconBg: "rgba(74,222,128,0.15)",
      iconBorder: "rgba(74,222,128,0.3)",
      valueColor: "var(--accent-green)",
      subColor: "var(--accent-green)",
      accentBorder: "rgba(74,222,128,0.25)",
    },
    {
      title: "Active Sensors",
      value: activeSensors,
      sub: `● ${offlineSensors} Offline`,
      icon: Radio,
      iconColor: "var(--accent-violet)",
      iconBg: "rgba(167,139,250,0.15)",
      iconBorder: "rgba(167,139,250,0.3)",
      valueColor: "var(--text-strong)",
      subColor: offlineSensors > 0 ? "var(--accent-amber)" : "var(--accent-violet)",
      accentBorder: "rgba(167,139,250,0.2)",
    },
  ];

  if (totalStudents !== undefined) {
    cards.push({
      title: "Total Students",
      value: totalStudents,
      sub: unassignedStudents ? `● ${unassignedStudents} unassigned` : "● All assigned to a bus",
      icon: Users,
      iconColor: "var(--accent-cyan)",
      iconBg: "rgba(34,211,238,0.15)",
      iconBorder: "rgba(34,211,238,0.3)",
      valueColor: "var(--text-strong)",
      subColor: unassignedStudents ? "var(--accent-amber)" : "var(--accent-cyan)",
      accentBorder: "rgba(34,211,238,0.2)",
    });
  }

  return (
    <div
      className="metric-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
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
              padding: "18px 20px",
              borderRadius: 20,
              borderColor: c.accentBorder,
              boxShadow: c.glowCard
                ? `var(--glass-glow), ${c.glowCard}`
                : undefined,
            }}
          >
            {/* Top row */}
            <div className="metric-card__top" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div
                className="metric-card__icon glass-orb"
                style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: c.iconBg,
                  border: `1px solid ${c.iconBorder}`,
                  color: c.iconColor,
                  boxShadow: `0 0 14px ${c.iconBg}, inset 0 1px 0 0 rgba(255,255,255,0.3), inset 0 -1px 2px 0 rgb(var(--shadow-rgb) / calc(0.25 * var(--shadow-k)))`,
                }}
              >
                <Icon size={16} strokeWidth={2} />
              </div>
              <span className="metric-card__title" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>{c.title}</span>
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
