import React from "react";
import { Bus, Search, Bell, ChevronDown } from "lucide-react";

interface TopNavProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  adminName?: string;
  roleTitle?: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  searchQuery,
  onSearchChange,
  adminName = "Admin",
  roleTitle = "Administrator",
}) => {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 28px",
        background: "rgba(10, 13, 20, 0.72)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.05) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
          }}
        >
          <Bus size={24} strokeWidth={2.2} />
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.01em" }}>
            Smart Bus Parking
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, marginTop: 1 }}>
            College Bus Parking &amp; Retrieval System
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div
        style={{
          flex: 1,
          maxWidth: 460,
          margin: "0 32px",
          position: "relative",
        }}
      >
        <Search
          size={16}
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#94a3b8",
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search bus number, slot, RFID..."
          style={{
            width: "100%",
            padding: "10px 18px 10px 42px",
            borderRadius: 9999,
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderTop: "1px solid rgba(255, 255, 255, 0.18)",
            color: "#ffffff",
            fontSize: 13,
            outline: "none",
            transition: "all 0.2s ease",
            boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.3)",
          }}
          onFocus={(e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.08)";
            e.target.style.borderColor = "rgba(255, 255, 255, 0.28)";
            e.target.style.boxShadow = "0 0 16px rgba(56, 189, 248, 0.15), inset 0 1px 3px rgba(0, 0, 0, 0.4)";
          }}
          onBlur={(e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.05)";
            e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
            e.target.style.boxShadow = "inset 0 1px 3px rgba(0, 0, 0, 0.3)";
          }}
        />
      </div>

      {/* Right Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {/* Notification Bell */}
        <button
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            cursor: "pointer",
            position: "relative",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#ffffff";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.09)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#94a3b8";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
          }}
        >
          <Bell size={17} />
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#ef4444",
              boxShadow: "0 0 8px #ef4444",
            }}
          />
        </button>

        {/* User Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "5px 14px 5px 6px",
            borderRadius: 9999,
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0f172a",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            A
          </div>
          <div style={{ textAlign: "left", lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{adminName}</div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>{roleTitle}</div>
          </div>
          <ChevronDown size={14} style={{ color: "#94a3b8", marginLeft: 4 }} />
        </div>
      </div>
    </header>
  );
};
