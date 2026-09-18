import React from "react";
import { PieChart as PieIcon, BarChart2 } from "lucide-react";

export const SlotUtilizationCard: React.FC<{
  occupied?: number;
  free?: number;
  total?: number;
}> = ({ occupied = 4, free = 28, total = 32 }) => {
  const pct = ((occupied / (total || 32)) * 100).toFixed(1);

  return (
    <div className="liquid-glass-card" style={{ padding: "18px 22px", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
        <PieIcon size={17} style={{ color: "#ffffff" }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>Slot Utilization</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around" }}>
        {/* SVG Donut */}
        <div style={{ position: "relative", width: 110, height: 110 }}>
          <svg viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="11"
            />
            {/* Active Arc */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="url(#donutGrad)"
              strokeWidth="11"
              strokeDasharray="251.2"
              strokeDashoffset={251.2 - (251.2 * (occupied / (total || 32)))}
              strokeLinecap="round"
              style={{
                transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                filter: "drop-shadow(0 0 6px rgba(255, 255, 255, 0.5))",
              }}
            />
            <defs>
              <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center Label */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1.1,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 800, color: "#ffffff" }}>{pct}%</span>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>Occupied</span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ffffff" }} />
              <span style={{ fontSize: 12, color: "#94a3b8" }}>Occupied</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", fontFamily: "monospace" }}>
              {occupied}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255, 255, 255, 0.4)" }} />
              <span style={{ fontSize: 12, color: "#94a3b8" }}>Free</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", fontFamily: "monospace" }}>
              {free}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255, 255, 255, 0.15)" }} />
              <span style={{ fontSize: 12, color: "#94a3b8" }}>Total</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", fontFamily: "monospace" }}>
              {total}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BusRouteDistributionCard: React.FC = () => {
  const routes = [
    { name: "Route 1", count: 1 },
    { name: "Route 2", count: 1 },
    { name: "Route 3", count: 1 },
    { name: "Route 4", count: 1 },
  ];
  const maxScale = 6;

  return (
    <div className="liquid-glass-card" style={{ padding: "18px 22px", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
        <BarChart2 size={17} style={{ color: "#ffffff" }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>Bus Route Distribution</span>
      </div>

      {/* Bar Chart Area */}
      <div style={{ display: "flex", height: 110, gap: 10, alignItems: "flex-end", paddingBottom: 6 }}>
        {/* Y Axis */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
            color: "#64748b",
            fontSize: 10,
            fontFamily: "monospace",
            paddingRight: 6,
          }}
        >
          <span>6</span>
          <span>4</span>
          <span>2</span>
          <span>0</span>
        </div>

        {/* Bars Container */}
        <div
          style={{
            flex: 1,
            height: "100%",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-around",
            borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
            borderLeft: "1px solid rgba(255, 255, 255, 0.12)",
            paddingLeft: 12,
            paddingRight: 12,
          }}
        >
          {routes.map((r, i) => {
            const heightPct = (r.count / maxScale) * 100;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "100%",
                  justifyContent: "flex-end",
                  width: "18%",
                }}
              >
                {/* Value on top */}
                <span style={{ fontSize: 10, color: "#cbd5e1", marginBottom: 4, fontFamily: "monospace" }}>
                  {r.count}
                </span>

                {/* Glass Bar */}
                <div
                  style={{
                    width: "100%",
                    height: `${heightPct}%`,
                    borderRadius: "4px 4px 0 0",
                    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(203, 213, 225, 0.5) 100%)",
                    boxShadow: "0 0 12px rgba(255, 255, 255, 0.35)",
                    transition: "height 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* X Axis Labels */}
      <div style={{ display: "flex", justifyContent: "space-around", paddingLeft: 28, marginTop: 6 }}>
        {routes.map((r, i) => (
          <span key={i} style={{ fontSize: 10, color: "#94a3b8" }}>
            {r.name}
          </span>
        ))}
      </div>
    </div>
  );
};
