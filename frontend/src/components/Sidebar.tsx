import React from "react";
import {
  Home,
  Map,
  Bus,
  Cpu,
  BarChart3,
  Radio,
  Settings,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/parking", label: "Parking Map", icon: Map },
  { to: "/buses", label: "Bus Information", icon: Bus },
  { to: "/optimize", label: "Optimisation", icon: Cpu },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/sensors", label: "Sensor Monitoring", icon: Radio },
  { to: "/settings", label: "Settings", icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside
      style={{
        width: 230,
        background: "rgba(10, 13, 20, 0.6)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Navigation Links */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 6, zIndex: 2 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "11px 16px",
                borderRadius: 14,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#ffffff" : "#94a3b8",
                background: isActive
                  ? "linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.05) 100%)"
                  : "transparent",
                border: isActive
                  ? "1px solid rgba(255, 255, 255, 0.22)"
                  : "1px solid transparent",
                boxShadow: isActive
                  ? "0 4px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)"
                  : "none",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.classList.contains("active")) {
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.classList.contains("active")) {
                  e.currentTarget.style.color = "#94a3b8";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <Icon size={18} strokeWidth={1.9} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Liquid Glass Ribbon Graphic & Tagline */}
      <div style={{ position: "relative", zIndex: 2, paddingTop: 32 }}>
        {/* Abstract Liquid Glass curves */}
        <svg
          viewBox="0 0 200 120"
          style={{
            width: "100%",
            height: 90,
            opacity: 0.45,
            marginBottom: 8,
          }}
        >
          <defs>
            <linearGradient id="liquidGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.02" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.65" />
            </linearGradient>
            <linearGradient id="liquidGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d="M 10 110 Q 50 10 110 60 T 190 20"
            fill="none"
            stroke="url(#liquidGrad)"
            strokeWidth="2.5"
          />
          <path
            d="M 0 90 Q 70 30 130 80 T 200 40"
            fill="none"
            stroke="url(#liquidGrad2)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <path
            d="M 30 115 Q 90 40 150 95 T 195 70"
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1"
          />
        </svg>

        <div
          style={{
            fontSize: 11,
            color: "#94a3b8",
            fontStyle: "italic",
            lineHeight: 1.4,
            paddingLeft: 4,
          }}
        >
          Smarter Parking<br />
          <span style={{ color: "#cbd5e1" }}>for a Smoother Journey</span>
        </div>
      </div>
    </aside>
  );
};
