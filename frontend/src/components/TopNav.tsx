import React, { useState } from "react";
import { Search, Bell, ChevronDown, LogOut, Lock } from "lucide-react";
import rathinamLogo from "../assets/rathinam_logo.jpg";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotificationPanel } from "./NotificationPanel";

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
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 28px",
        background: "rgba(10, 10, 10, 0.85)",
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
      <Link to="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 10,
            background: "#ffffff",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <img src={rathinamLogo} alt="Rathinam" style={{ width: 42, height: 42, objectFit: "contain" }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            Rathinam Smart Bus Parking
          </div>
          <div style={{ fontSize: 10, color: "#a3a3a3", fontWeight: 400, marginTop: 2 }}>
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
            color: "#a3a3a3",
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
            e.target.style.boxShadow = "0 0 16px rgba(255, 255, 255, 0.15), inset 0 1px 3px rgba(0, 0, 0, 0.4)";
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
        {/* Notification Bell */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: notifOpen
                ? "rgba(255, 255, 255, 0.15)"
                : "rgba(255, 255, 255, 0.05)",
              border: notifOpen
                ? "1px solid rgba(255, 255, 255, 0.4)"
                : "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: notifOpen ? "#c4c4c4" : "#a3a3a3",
              cursor: "pointer",
              position: "relative",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!notifOpen) {
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.09)";
              }
            }}
            onMouseLeave={(e) => {
              if (!notifOpen) {
                e.currentTarget.style.color = "#a3a3a3";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              }
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
                background: "#b3b3b3",
                boxShadow: "0 0 8px #b3b3b3",
              }}
            />
          </button>
          <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

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
                background: "linear-gradient(135deg, #e5e5e5 0%, #a3a3a3 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#141414",
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
              <div style={{ fontSize: 9, color: "#a3a3a3" }}>{roleTitle}</div>
            </div>
            <ChevronDown size={13} style={{ color: "#a3a3a3", marginLeft: 2 }} />
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
                    navigate("/");
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
                    color: "#b3b3b3",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)")}
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
