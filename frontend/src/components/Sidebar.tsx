import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NavLink } from "react-router-dom";
import { navItems } from "./navItems";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  return (
    <aside
      style={{
        width: collapsed ? 72 : 230,
        background: "rgba(10, 10, 10, 0.6)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        padding: collapsed ? "24px 10px" : "24px 16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        transition: "width 0.22s cubic-bezier(0.16, 1, 0.3, 1), padding 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Collapse / expand toggle */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          position: "absolute",
          top: 18,
          right: collapsed ? "50%" : 12,
          transform: collapsed ? "translateX(50%)" : "none",
          width: 26,
          height: 26,
          borderRadius: 8,
          border: "1px solid rgba(255, 255, 255, 0.12)",
          background: "rgba(255, 255, 255, 0.06)",
          color: "#a3a3a3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 3,
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Navigation Links */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 6, zIndex: 2, marginTop: 40 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              title={collapsed ? item.label : undefined}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 14,
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "11px 0" : "11px 16px",
                borderRadius: 14,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#ffffff" : "#a3a3a3",
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
                  e.currentTarget.style.color = "#a3a3a3";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <Icon size={18} strokeWidth={1.9} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Liquid Glass Ribbon Graphic & Tagline (hidden while collapsed) */}
      {!collapsed && (
        <div style={{ position: "relative", zIndex: 2, paddingTop: 32 }}>
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
                <stop offset="50%" stopColor="#c4c4c4" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.65" />
              </linearGradient>
              <linearGradient id="liquidGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#d4d4d4" stopOpacity="0.1" />
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
              color: "#a3a3a3",
              fontStyle: "italic",
              lineHeight: 1.4,
              paddingLeft: 4,
            }}
          >
            Smarter Parking<br />
            <span style={{ color: "#d4d4d4" }}>for a Smoother Journey</span>
          </div>
        </div>
      )}
    </aside>
  );
};
