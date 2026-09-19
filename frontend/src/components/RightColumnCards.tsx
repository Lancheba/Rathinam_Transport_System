import React from "react";
import {
  Bus as BusIcon, Clock, Radio, ChevronRight,
  ParkingSquare, ArrowRightLeft, CreditCard, AlertTriangle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AddBusButton } from "./AddBusButton";

export const BusInformationCard: React.FC = () => {
  const navigate = useNavigate();
  const buses = [
    { num: "B01", route: "Route 1", slot: "D1", status: "Parked",  blocked: false },
    { num: "B02", route: "Route 2", slot: "C2", status: "Parked",  blocked: false },
    { num: "B03", route: "Route 3", slot: "B3", status: "Blocked", blocked: true },
    { num: "B04", route: "Route 4", slot: "B6", status: "Parked",  blocked: false },
  ];

  return (
    <div className="liquid-glass-card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <BusIcon size={17} style={{ color: "#60a5fa" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>Bus Information</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <AddBusButton variant="subtle" onCreated={(bus) => navigate("/dashboard/buses", { state: { addedBus: bus.bus_number } })} />
          <Link to="/dashboard/buses" style={{ fontSize: 11, color: "#9ca3af", textDecoration: "none", display: "flex", alignItems: "center", gap: 3, fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.color = "#60a5fa")}
            onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}>
            View All <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ color: "#6b7280", borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "left" }}>
            {["Bus No.", "Route", "Slot", "Status", ""].map(h => (
              <th key={h} style={{ paddingBottom: 8, fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {buses.map(b => (
            <tr key={b.num} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}>
              <td style={{ padding: "10px 0", fontWeight: 700, color: "#ffffff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <BusIcon size={13} style={{ color: "#60a5fa" }} /> {b.num}
                </div>
              </td>
              <td style={{ padding: "10px 0", color: "#d1d5db" }}>{b.route}</td>
              <td style={{ padding: "10px 0", fontFamily: "monospace", color: "#9ca3af" }}>{b.slot}</td>
              <td style={{ padding: "10px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: b.blocked ? "#fbbf24" : "#4ade80",
                    boxShadow: b.blocked ? "0 0 8px #fbbf24" : "0 0 8px #4ade80",
                  }} />
                  <span style={{ color: b.blocked ? "#fbbf24" : "#4ade80", fontWeight: 600 }}>{b.status}</span>
                </div>
              </td>
              <td style={{ padding: "10px 0", color: "#6b7280", textAlign: "right" }}>
                <ChevronRight size={14} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const RecentEventsCard: React.FC = () => {
  const events = [
    { icon: ParkingSquare, badgeBg: "rgba(74,222,128,0.15)",   badgeColor: "#4ade80",  text: "B04 parked at Row B - Slot 6",       time: "12:15 PM" },
    { icon: Radio,         badgeBg: "rgba(34,211,238,0.15)",   badgeColor: "#22d3ee",  text: "B03 detected at Row B - Slot 3",     time: "12:10 PM" },
    { icon: ArrowRightLeft,badgeBg: "rgba(96,165,250,0.15)",   badgeColor: "#60a5fa",  text: "B02 moved to Row C - Slot 2",        time: "11:56 AM" },
    { icon: CreditCard,    badgeBg: "rgba(167,139,250,0.15)",  badgeColor: "#a78bfa",  text: "B01 entry detected (RFID-001)",      time: "11:42 AM" },
    { icon: AlertTriangle, badgeBg: "rgba(251,191,36,0.15)",   badgeColor: "#fbbf24",  text: "B05 blocked by B02",                 time: "11:30 AM" },
  ];

  return (
    <div className="liquid-glass-card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Clock size={17} style={{ color: "#a78bfa" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>Recent Events</span>
        </div>
        <span style={{ fontSize: 11, color: "#9ca3af", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 2 }}>
          View All <ChevronRight size={12} />
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {events.map((ev, i) => {
          const Icon = ev.icon;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 6,
                  background: ev.badgeBg, color: ev.badgeColor,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  border: `1px solid ${ev.badgeColor}40`,
                }}>
                  <Icon size={14} />
                </div>
                <span style={{ fontSize: 12, color: "#e5e7eb", fontWeight: 500 }}>{ev.text}</span>
              </div>
              <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace", flexShrink: 0 }}>{ev.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const SensorStatusCard: React.FC = () => {
  const sensors = [
    { id: "RFID-001", loc: "Main Entrance",   online: true  },
    { id: "US-001",   loc: "Row A - Slot 1",  online: true  },
    { id: "US-002",   loc: "Row B - Slot 3",  online: true  },
    { id: "US-003",   loc: "Row C - Slot 7",  online: false },
    { id: "RFID-002", loc: "Exit Gate",       online: true  },
  ];

  return (
    <div className="liquid-glass-card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Radio size={17} style={{ color: "#22d3ee" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>Sensor Status</span>
        </div>
        <span style={{ fontSize: 11, color: "#9ca3af", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 2 }}>
          View All <ChevronRight size={12} />
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {sensors.map(s => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: 95 }}>
              <Radio size={12} style={{ color: s.online ? "#22d3ee" : "#6b7280" }} />
              <span style={{ fontWeight: 600, color: "#ffffff", fontFamily: "monospace" }}>{s.id}</span>
            </div>
            <span style={{ color: "#9ca3af", flex: 1, textAlign: "left", paddingLeft: 10 }}>{s.loc}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: s.online ? "#4ade80" : "#f87171",
                boxShadow: s.online ? "0 0 8px #4ade80" : "0 0 8px #f87171",
              }} />
              <span style={{ color: s.online ? "#4ade80" : "#f87171", fontWeight: 600, fontSize: 11 }}>
                {s.online ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
