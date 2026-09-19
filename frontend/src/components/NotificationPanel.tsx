import React, { useEffect, useState, useCallback } from "react";
import {
  Bell,
  ParkingSquare,
  Radio,
  ArrowRightLeft,
  CreditCard,
  AlertTriangle,
  LogIn,
  X,
  RefreshCw,
} from "lucide-react";
import { getEvents } from "../api/endpoints";
import type { ParkingEvent } from "../types";

// ── helpers ────────────────────────────────────────────────────────────────────

function relativeTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return diff <= 1 ? "just now" : `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type EventIconFC = React.FC<{ size: number }>;

const EVENT_META: Record<string, { icon: EventIconFC; bg: string; color: string }> = {
  PARKED:   { icon: ParkingSquare,  bg: "rgba(255,255,255,0.18)",  color: "#a3a3a3" },
  ENTRY:    { icon: LogIn,          bg: "rgba(255,255,255,0.18)",  color: "#c4c4c4" },
  DETECTED: { icon: Radio,          bg: "rgba(255,255,255,0.18)",  color: "#c4c4c4" },
  MOVED:    { icon: ArrowRightLeft, bg: "rgba(255,255,255,0.18)",  color: "#d4d4d4" },
  RFID:     { icon: CreditCard,     bg: "rgba(255,255,255,0.18)", color: "#d4d4d4" },
  EXIT:     { icon: AlertTriangle,  bg: "rgba(255,255,255,0.18)",   color: "#b3b3b3" },
};

function getMetaForEvent(ev: ParkingEvent) {
  return EVENT_META[ev.event_type] ?? EVENT_META["RFID"];
}

// ── component ──────────────────────────────────────────────────────────────────

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ open, onClose }) => {
  const [events, setEvents] = useState<ParkingEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchEvents = useCallback(() => {
    setLoading(true);
    getEvents({ limit: "20" })
      .then((data) => {
        setEvents(data);
        setLastRefresh(new Date());
      })
      .catch(() => {
        // keep stale data on error
      })
      .finally(() => setLoading(false));
  }, []);

  // fetch when panel opens
  useEffect(() => {
    if (open) fetchEvents();
  }, [open, fetchEvents]);

  // auto-refresh every 15 s while open
  useEffect(() => {
    if (!open) return;
    const id = setInterval(fetchEvents, 15_000);
    return () => clearInterval(id);
  }, [open, fetchEvents]);

  if (!open) return null;

  return (
    <>
      {/* backdrop — click outside to close */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 55 }}
      />

      {/* panel */}
      <div
        className="liquid-glass-card"
        style={{
          position: "absolute",
          right: 0,
          top: "calc(100% + 10px)",
          width: 340,
          maxHeight: 480,
          display: "flex",
          flexDirection: "column",
          borderRadius: 16,
          boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
          zIndex: 60,
          overflow: "hidden",
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Bell size={15} style={{ color: "#ffffff" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>Notifications</span>
            {events.length > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#141414",
                  background: "#c4c4c4",
                  borderRadius: 9999,
                  padding: "1px 6px",
                }}
              >
                {events.length}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={fetchEvents}
              disabled={loading}
              title="Refresh"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#a3a3a3",
                display: "flex",
                alignItems: "center",
                padding: 4,
              }}
            >
              <RefreshCw
                size={13}
                style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}
              />
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#a3a3a3",
                display: "flex",
                alignItems: "center",
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* last refresh */}
        {lastRefresh && (
          <div style={{ fontSize: 10, color: "#6b6b6b", padding: "6px 16px 0", flexShrink: 0 }}>
            Last updated{" "}
            {lastRefresh.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
        )}

        {/* list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "10px 12px 12px" }}>
          {loading && events.length === 0 ? (
            <div style={{ color: "#737373", fontSize: 12, textAlign: "center", padding: "24px 0" }}>
              Loading events…
            </div>
          ) : events.length === 0 ? (
            <div style={{ color: "#737373", fontSize: 12, textAlign: "center", padding: "24px 0" }}>
              No events yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {events.map((ev) => {
                const meta = getMetaForEvent(ev);
                const Icon = meta.icon;
                return (
                  <div
                    key={ev.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 10px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: meta.bg,
                        color: meta.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      <Icon size={14} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#e5e5e5",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {ev.message || `${ev.bus_number ?? "Bus"} — ${ev.event_type}`}
                      </div>
                      <div style={{ fontSize: 10, color: "#737373", marginTop: 2 }}>
                        {ev.bus_number && (
                          <span style={{ color: "#a3a3a3", fontWeight: 600, marginRight: 5 }}>
                            {ev.bus_number}
                          </span>
                        )}
                        {relativeTime(ev.timestamp)}
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: meta.color,
                        background: meta.bg,
                        borderRadius: 4,
                        padding: "2px 6px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        alignSelf: "center",
                      }}
                    >
                      {ev.event_type}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
};
