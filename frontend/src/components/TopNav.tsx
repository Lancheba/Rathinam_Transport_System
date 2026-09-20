import React, { useEffect, useRef, useState } from "react";
import { Search, Bell, ChevronDown, LogOut, Lock, X } from "lucide-react";
import rathinamLogo from "../assets/rathinam_logo.jpg";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotificationPanel } from "./NotificationPanel";
import { useAnnouncements } from "../hooks/useAnnouncements";
import { ThemeToggle } from "./ThemeToggle";

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
  // Admins and transport staff (the people who manage buses) are the ones who post announcements
  const { isLoggedIn, username, logout, canManageBuses: canPostAnnouncements } = useAuth();
  const announcements = useAnnouncements();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  // Phones show the search field only when asked for it, to keep the bar to one row
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Going to another page (tab bar, sidebar, links) dismisses any open popovers.
  // Adjusting state during render is React's recommended way to reset state when a value changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setNotifOpen(false);
    setDropdownOpen(false);
  }

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Tap/click anywhere outside the user menu closes it (there is no other way to dismiss it on touch)
  useEffect(() => {
    if (!dropdownOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [dropdownOpen]);

  return (
    <header
      className="tn"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 28px",
        background: "var(--surface-nav)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgb(var(--ov) / 0.08)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        margin: 0,
      }}
    >
      {/* Brand */}
      <Link to="/dashboard" className="tn__brand" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
        <div
          className="tn__logo"
          style={{
            width: 46,
            height: 46,
            borderRadius: 10,
            background: "#ffffff",
            border: "1px solid rgb(var(--ov) / 0.15)",
            boxShadow: "0 4px 16px rgb(var(--shadow-rgb) / calc(0.4 * var(--shadow-k)))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <img src={rathinamLogo} alt="Rathinam" className="tn__logo-img" style={{ width: 42, height: 42, objectFit: "contain" }} />
        </div>
        <div className="tn__text">
          <div className="tn__title" style={{ fontSize: 15, fontWeight: 800, color: "var(--text-strong)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            Rathinam Smart Bus Parking
          </div>
          <div className="tn__sub" style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400, marginTop: 2 }}>
            College Bus Parking &amp; Retrieval System
          </div>
        </div>
      </Link>

      {/* Search Bar */}
      <div
        className={`tn__search${searchOpen ? " is-open" : ""}`}
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
            color: "var(--text-muted)",
            pointerEvents: "none",
          }}
        />
        <input
          ref={searchInputRef}
          type="text"
          enterKeyHint="search"
          autoComplete="off"
          aria-label="Search bus number, slot or RFID"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            // Enter searches again with what's already typed (works from any page)
            if (e.key === "Enter") onSearchChange(searchQuery);
          }}
          placeholder="Search bus number, slot, RFID..."
          style={{
            width: "100%",
            padding: "9px 18px 9px 42px",
            borderRadius: 9999,
            background: "rgb(var(--ov) / 0.05)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgb(var(--ov) / 0.1)",
            borderTop: "1px solid rgb(var(--ov) / 0.18)",
            color: "var(--text-strong)",
            fontSize: 13,
            outline: "none",
            transition: "all 0.2s ease",
            boxShadow: "inset 0 1px 3px rgb(var(--shadow-rgb) / calc(0.3 * var(--shadow-k)))",
          }}
          onFocus={(e) => {
            e.target.style.background = "rgb(var(--ov) / 0.08)";
            e.target.style.borderColor = "rgb(var(--ov) / 0.28)";
            e.target.style.boxShadow = "0 0 16px rgb(var(--ov) / 0.15), inset 0 1px 3px rgb(var(--shadow-rgb) / calc(0.4 * var(--shadow-k)))";
          }}
          onBlur={(e) => {
            e.target.style.background = "rgb(var(--ov) / 0.05)";
            e.target.style.borderColor = "rgb(var(--ov) / 0.1)";
            e.target.style.boxShadow = "inset 0 1px 3px rgb(var(--shadow-rgb) / calc(0.3 * var(--shadow-k)))";
          }}
        />
      </div>

      {/* Right Controls */}
      <div className="tn__actions" style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Search toggle: phones only (hidden by CSS on larger screens) */}
        <button
          type="button"
          className="tn__icon-btn tn__search-toggle"
          onClick={() => { setNotifOpen(false); setSearchOpen((v) => !v); }}
          aria-label={searchOpen ? "Close search" : "Search"}
          aria-expanded={searchOpen}
        >
          {searchOpen ? <X size={16} /> : <Search size={16} />}
        </button>

        {/* Light / dark switch */}
        <ThemeToggle />

        {/* Notification Bell */}
        <div className="tn__bell-wrap" style={{ position: "relative" }}>
          <button
            className="tn__icon-btn"
            aria-label="Notifications"
            onClick={() => setNotifOpen((v) => !v)}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: notifOpen
                ? "rgb(var(--ov) / 0.15)"
                : "rgb(var(--ov) / 0.05)",
              border: notifOpen
                ? "1px solid rgb(var(--ov) / 0.4)"
                : "1px solid rgb(var(--ov) / 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: notifOpen ? "var(--text-soft)" : "var(--text-muted)",
              cursor: "pointer",
              position: "relative",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!notifOpen) {
                e.currentTarget.style.color = "var(--text-strong)";
                e.currentTarget.style.background = "rgb(var(--ov) / 0.09)";
              }
            }}
            onMouseLeave={(e) => {
              if (!notifOpen) {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.background = "rgb(var(--ov) / 0.05)";
              }
            }}
          >
            <Bell size={16} />
            {announcements.unread > 0 && (
              <span
                aria-label={`${announcements.unread} unread announcements`}
                style={{
                  position: "absolute",
                  top: 7,
                  right: 7,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--accent-red)",
                  boxShadow: "0 0 8px var(--accent-red)",
                }}
              />
            )}
          </button>
          <NotificationPanel
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            announcements={announcements.items}
            unreadAnnouncements={announcements.unread}
            canPost={canPostAnnouncements}
            onReloadAnnouncements={announcements.reload}
            onSeenAnnouncements={announcements.markSeen}
          />
        </div>

        {/* User Pill with Dropdown */}
        <div ref={userMenuRef} style={{ position: "relative" }}>
          <div
            className="tn__user"
            role="button"
            tabIndex={0}
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
            aria-label="Account menu"
            onClick={() => { setNotifOpen(false); setDropdownOpen(!dropdownOpen); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setNotifOpen(false);
                setDropdownOpen((v) => !v);
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "4px 14px 4px 5px",
              borderRadius: 9999,
              background: "rgb(var(--ov) / 0.06)",
              border: "1px solid rgb(var(--ov) / 0.12)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--text-soft) 0%, var(--text-muted) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--btn-fg)",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {(username || adminName)[0]?.toUpperCase()}
            </div>
            <div className="tn__user-text" style={{ textAlign: "left", lineHeight: 1.2 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-strong)" }}>
                {isLoggedIn ? username : adminName}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{roleTitle}</div>
            </div>
            <ChevronDown className="tn__user-chev" size={13} style={{ color: "var(--text-muted)", marginLeft: 2 }} />
          </div>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div
              className="liquid-glass-card tn__menu"
              role="menu"
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                marginTop: 8,
                width: 170,
                padding: "8px 6px",
                borderRadius: 14,
                zIndex: 60,
                boxShadow: "0 10px 30px rgb(var(--shadow-rgb) / calc(0.7 * var(--shadow-k)))",
              }}
            >
              {/* The name is hidden in the bar on phones, so show who is signed in here */}
              <div className="tn__menu-id">
                <div className="tn__menu-name">{isLoggedIn ? username : adminName}</div>
                <div className="tn__menu-role">{roleTitle}</div>
              </div>
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
                    color: "var(--text-muted)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--ov) / 0.1)")}
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
                    color: "var(--text-strong)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgb(var(--ov) / 0.08)")}
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
