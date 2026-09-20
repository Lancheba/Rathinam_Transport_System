import React, { useEffect, useState, useCallback } from "react";
import {
  Bus as BusIcon, Clock, Radio, ChevronRight,
  ParkingSquare, ArrowRightLeft, CreditCard, AlertTriangle, LogIn, Volume2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AddBusButton } from "./AddBusButton";
import { alpha } from "../utils/color";
import { getBuses, getEvents, getSensors } from "../api/endpoints";
import type { Bus, ParkingEvent, Sensor } from "../types";
import { relativeTime } from "../utils/time";

export const BusInformationCard: React.FC = () => {
  const navigate = useNavigate();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    getBuses()
      .then(setBuses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  // Only buses currently sitting in a slot, most recently placed first, capped to 4 rows
  const parkedBuses = buses
    .filter(b => b.parking_slot_info)
    .slice(-4)
    .reverse();

  return (
    <div className="liquid-glass-card" style={{ padding: "18px 20px" }}>
      <div className="card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <BusIcon size={17} style={{ color: "var(--accent-blue)" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>Bus Information</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <AddBusButton variant="subtle" onCreated={(bus) => { setBuses(prev => [...prev, bus]); navigate("/dashboard/buses", { state: { addedBus: bus.bus_number } }); }} />
          <Link to="/dashboard/buses" style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: 3, fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-blue)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
            View All <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "10px 0" }}>Loading buses…</div>
      ) : parkedBuses.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "10px 0" }}>No buses parked right now.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: "var(--text-dim)", borderBottom: "1px solid rgb(var(--ov) / 0.08)", textAlign: "left" }}>
              {["Bus No.", "Route", "Slot", "Status", ""].map(h => (
                <th key={h} style={{ paddingBottom: 8, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parkedBuses.map(b => {
              const info = b.parking_slot_info!;
              const blocked = info.is_blocked;
              return (
                <tr key={b.id} style={{ borderBottom: "1px solid rgb(var(--ov) / 0.04)", transition: "background 0.15s" }}>
                  <td style={{ padding: "10px 0", fontWeight: 700, color: "var(--text-strong)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <BusIcon size={13} style={{ color: "var(--accent-blue)" }} /> {b.bus_number}
                    </div>
                  </td>
                  <td style={{ padding: "10px 0", color: "var(--text-soft)" }}>{b.route}</td>
                  <td style={{ padding: "10px 0", fontFamily: "monospace", color: "var(--text-muted)" }}>{info.row}{info.slot_number}</td>
                  <td style={{ padding: "10px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: blocked ? "var(--accent-amber)" : "var(--accent-green)",
                        boxShadow: blocked ? "0 0 8px var(--accent-amber)" : "0 0 8px var(--accent-green)",
                      }} />
                      <span style={{ color: blocked ? "var(--accent-amber)" : "var(--accent-green)", fontWeight: 600 }}>
                        {blocked ? "Blocked" : "Parked"}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 0", color: "var(--text-dim)", textAlign: "right" }}>
                    <ChevronRight size={14} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

const EVENT_META: Record<string, { icon: React.FC<{ size: number }>; bg: string; color: string }> = {
  PARKED:   { icon: ParkingSquare,  bg: "rgba(74,222,128,0.15)",  color: "var(--accent-green)" },
  ENTRY:    { icon: LogIn,          bg: "rgba(167,139,250,0.15)", color: "var(--accent-violet)" },
  DETECTED: { icon: Radio,          bg: "rgba(34,211,238,0.15)",  color: "var(--accent-cyan)" },
  MOVED:    { icon: ArrowRightLeft, bg: "rgba(96,165,250,0.15)",  color: "var(--accent-blue)" },
  RFID:     { icon: CreditCard,     bg: "rgba(167,139,250,0.15)", color: "var(--accent-violet)" },
  EXIT:     { icon: AlertTriangle,  bg: "rgba(251,191,36,0.15)",  color: "var(--accent-amber)" },
};

const eventMeta = (ev: ParkingEvent) => EVENT_META[ev.event_type] ?? EVENT_META["RFID"];

export const RecentEventsCard: React.FC = () => {
  const [events, setEvents] = useState<ParkingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    getEvents({ limit: "5" })
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="liquid-glass-card" style={{ padding: "18px 20px" }}>
      <div className="card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Clock size={17} style={{ color: "var(--accent-violet)" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>Recent Events</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 2 }}>
          View All <ChevronRight size={12} />
        </span>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "6px 0" }}>Loading activity…</div>
      ) : events.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "6px 0" }}>No recent activity yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {events.map((ev) => {
            const meta = eventMeta(ev);
            const Icon = meta.icon;
            return (
              <div key={ev.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 6,
                    background: meta.bg, color: meta.color,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    border: `1px solid ${alpha(meta.color, 25)}`,
                  }}>
                    <Icon size={14} />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text-soft)", fontWeight: 500 }}>
                    {ev.message || `${ev.bus_number ?? "Bus"} — ${ev.event_type}`}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "monospace", flexShrink: 0 }}>{relativeTime(ev.timestamp)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const SensorStatusCard: React.FC = () => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    getSensors()
      .then(setSensors)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="liquid-glass-card" style={{ padding: "18px 20px" }}>
      <div className="card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Radio size={17} style={{ color: "var(--accent-cyan)" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>Sensor Status</span>
        </div>
        <Link to="/dashboard/sensors" style={{ fontSize: 11, color: "var(--text-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 2, textDecoration: "none" }}>
          View All <ChevronRight size={12} />
        </Link>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "6px 0" }}>Loading sensors…</div>
      ) : sensors.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "6px 0" }}>No sensors registered yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {sensors.slice(0, 5).map(s => (
            <div key={s.id} className="sensor-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
              <div className="sensor-id" style={{ display: "flex", alignItems: "center", gap: 8, width: 95 }}>
                {s.sensor_type === "RFID"
                  ? <Radio size={12} style={{ color: s.is_active ? "var(--accent-cyan)" : "var(--text-dim)" }} />
                  : <Volume2 size={12} style={{ color: s.is_active ? "var(--accent-cyan)" : "var(--text-dim)" }} />}
                <span style={{ fontWeight: 600, color: "var(--text-strong)", fontFamily: "monospace" }}>{s.sensor_id}</span>
              </div>
              <span style={{ color: "var(--text-muted)", flex: 1, textAlign: "left", paddingLeft: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.location}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: s.is_active ? "var(--accent-green)" : "var(--accent-red)",
                  boxShadow: s.is_active ? "0 0 8px var(--accent-green)" : "0 0 8px var(--accent-red)",
                }} />
                <span style={{ color: s.is_active ? "var(--accent-green)" : "var(--accent-red)", fontWeight: 600, fontSize: 11 }}>
                  {s.is_active ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
