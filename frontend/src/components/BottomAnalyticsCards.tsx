import React from "react";
import { PieChart as PieIcon, BarChart2 } from "lucide-react";
import { alpha } from "../utils/color";

export const SlotUtilizationCard: React.FC<{
  occupied?: number;
  free?: number;
  total?: number;
}> = ({ occupied = 4, free = 28, total = 32 }) => {
  const pct = ((occupied / (total || 32)) * 100).toFixed(1);

  return (
    <div className="liquid-glass-card" style={{ padding: "18px 22px", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
        <PieIcon size={17} style={{ color: "var(--accent-pink)" }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>Slot Utilization</span>
      </div>

      <div className="util-body" style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: 16 }}>
        {/* SVG Donut */}
        <div style={{ position: "relative", width: 110, height: 110 }}>
          <svg viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgb(var(--ov) / 0.07)" strokeWidth="11" />
            <circle
              cx="50" cy="50" r="40" fill="transparent"
              stroke="url(#donutGradColor)" strokeWidth="11"
              strokeDasharray="251.2"
              strokeDashoffset={251.2 - (251.2 * (occupied / (total || 32)))}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)", filter: "drop-shadow(0 0 8px rgba(244,114,182,0.6))" }}
            />
            <defs>
              <linearGradient id="donutGradColor" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="var(--accent-pink)" />
                <stop offset="100%" stopColor="var(--accent-violet)" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1.1 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: "var(--accent-pink)" }}>{pct}%</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Occupied</span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { color: "var(--accent-pink)", label: "Occupied", val: occupied },
            { color: "var(--accent-green)", label: "Free",     val: free     },
            { color: "var(--text-dim)", label: "Total",    val: total    },
          ].map(item => (
            <div key={item.label} className="util-legend-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.label}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: item.color, fontFamily: "monospace" }}>{item.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const BusRouteDistributionCard: React.FC = () => {
  const routes = [
    { name: "Route 1", count: 1, color: "var(--accent-blue)" },
    { name: "Route 2", count: 1, color: "var(--accent-violet)" },
    { name: "Route 3", count: 1, color: "var(--accent-pink)" },
    { name: "Route 4", count: 1, color: "var(--accent-green)" },
  ];
  const maxScale = 6;

  return (
    <div className="liquid-glass-card" style={{ padding: "18px 22px", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
        <BarChart2 size={17} style={{ color: "var(--accent-blue)" }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>Bus Route Distribution</span>
      </div>

      <div style={{ display: "flex", height: 110, gap: 10, alignItems: "flex-end", paddingBottom: 6 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", color: "var(--text-dim)", fontSize: 10, fontFamily: "monospace", paddingRight: 6 }}>
          <span>6</span><span>4</span><span>2</span><span>0</span>
        </div>
        <div style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "space-around", borderBottom: "1px solid rgb(var(--ov) / 0.1)", borderLeft: "1px solid rgb(var(--ov) / 0.1)", paddingLeft: 12, paddingRight: 12 }}>
          {routes.map((r, i) => {
            const heightPct = (r.count / maxScale) * 100;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", width: "18%" }}>
                <span style={{ fontSize: 10, color: r.color, marginBottom: 4, fontFamily: "monospace", fontWeight: 700 }}>{r.count}</span>
                <div style={{
                  width: "100%", height: `${heightPct}%`,
                  borderRadius: "4px 4px 0 0",
                  background: `linear-gradient(180deg, ${r.color} 0%, ${alpha(r.color, 33)} 100%)`,
                  boxShadow: `0 0 12px ${alpha(r.color, 33)}`,
                  transition: "height 0.6s cubic-bezier(0.16,1,0.3,1)",
                }} />
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-around", paddingLeft: 28, marginTop: 6 }}>
        {routes.map((r, i) => (
          <span key={i} style={{ fontSize: 10, color: r.color, fontWeight: 600 }}>{r.name}</span>
        ))}
      </div>
    </div>
  );
};
