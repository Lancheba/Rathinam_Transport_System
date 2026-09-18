import React, { useState } from "react";
import { Bus, Search, Bell, ChevronDown, Globe, LogOut, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
  const { isLoggedIn, username, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 28px",
        background: "rgba(10, 13, 20, 0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        margin: 0,
      }}
    >
      {/* Brand */}
      <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 42,
            height: 42,
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
          <Bus size={22} strokeWidth={2.2} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.01em" }}>
            Smart Bus Parking
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400, marginTop: 1 }}>
            College Bus Parking &amp; Retrieval System
          </div>
        </div>
      </Link>

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
            padding: "9px 18px 9px 42px",
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
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Landing Link */}
        <Link
          to="/landing"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 9999,
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "#cbd5e1",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)")}
        >
          <Globe size={13} style={{ color: "#38bdf8" }} />
          <span>Landing</span>
        </Link>

        {/* Notification Bell */}
        <button
          style={{
            width: 36,
            height: 36,
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
          <Bell size={16} />
          <span
            style={{
              position: "absolute",
              top: 7,
              right: 7,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#ef4444",
              boxShadow: "0 0 8px #ef4444",
            }}
          />
        </button>

        {/* User Pill with Dropdown */}
        <div style={{ position: "relative" }}>
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "4px 14px 4px 5px",
              borderRadius: 9999,
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0f172a",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {(username || adminName)[0]?.toUpperCase()}
            </div>
            <div style={{ textAlign: "left", lineHeight: 1.2 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#ffffff" }}>
                {isLoggedIn ? username : adminName}
              </div>
              <div style={{ fontSize: 9, color: "#94a3b8" }}>{roleTitle}</div>
            </div>
            <ChevronDown size={13} style={{ color: "#94a3b8", marginLeft: 2 }} />
          </div>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div
              className="liquid-glass-card"
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                marginTop: 8,
                width: 170,
                padding: "8px 6px",
                borderRadius: 14,
                zIndex: 60,
                boxShadow: "0 10px 30px rgba(0,0,0,0.7)",
              }}
            >
              {isLoggedIn ? (
                <button
                  onClick={() => {
                    logout();
                    setDropdownOpen(false);
                    navigate("/login");
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 8,
                    color: "#f43f5e",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(244, 63, 94, 0.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setDropdownOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    textDecoration: "none",
                    borderRadius: 8,
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Lock size={14} />
                  <span>Login Portal</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
