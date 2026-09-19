import React from "react";
import {
  Bus as BusIcon,
  Clock,
  Radio,
  ChevronRight,
  ParkingSquare,
  ArrowRightLeft,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AddBusButton } from "./AddBusButton";

export const BusInformationCard: React.FC = () => {
  const navigate = useNavigate();
  const buses = [
    { num: "B01", route: "Route 1", slot: "D1", status: "Parked", blocked: false },
    { num: "B02", route: "Route 2", slot: "C2", status: "Parked", blocked: false },
    { num: "B03", route: "Route 3", slot: "B3", status: "Blocked", blocked: true },
    { num: "B04", route: "Route 4", slot: "B6", status: "Parked", blocked: false },
  ];

  return (
    <div className="liquid-glass-card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <BusIcon size={17} style={{ color: "#ffffff" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>Bus Information</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Admins and transport staff only; hidden for everyone else */}
          <AddBusButton
            variant="subtle"
            onCreated={(bus) =>
              navigate("/dashboard/buses", { state: { addedBus: bus.bus_number } })
            }
          />
          <Link
            to="/dashboard/buses"
            style={{
              fontSize: 11,
              color: "#a3a3a3",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 3,
              fontWeight: 500,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#a3a3a3")}
          >
            View All <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ color: "#737373", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", textAlign: "left" }}>
            <th style={{ paddingBottom: 8, fontWeight: 600 }}>Bus No.</th>
            <th style={{ paddingBottom: 8, fontWeight: 600 }}>Route</th>
            <th style={{ paddingBottom: 8, fontWeight: 600 }}>Slot</th>
            <th style={{ paddingBottom: 8, fontWeight: 600 }}>Status</th>
            <th style={{ paddingBottom: 8, width: 16 }}></th>
          </tr>
        </thead>
        <tbody>
          {buses.map((b) => (
            <tr
              key={b.num}
              style={{
                borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                transition: "background 0.15s",
              }}
            >
              <td style={{ padding: "10px 0", fontWeight: 700, color: "#ffffff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <BusIcon size={13} style={{ color: "#a3a3a3" }} />
                  <span>{b.num}</span>
                </div>
              </td>
              <td style={{ padding: "10px 0", color: "#d4d4d4" }}>{b.route}</td>
              <td style={{ padding: "10px 0", fontFamily: "monospace", color: "#a3a3a3" }}>{b.slot}</td>
              <td style={{ padding: "10px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: b.blocked ? "#b3b3b3" : "#a3a3a3",
                      boxShadow: b.blocked ? "0 0 8px #b3b3b3" : "0 0 8px #a3a3a3",
                    }}
                  />
                  <span style={{ color: b.blocked ? "#b3b3b3" : "#a3a3a3", fontWeight: 600 }}>{b.status}</span>
                </div>
              </td>
              <td style={{ padding: "10px 0", color: "#737373", textAlign: "right" }}>
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
    {
      icon: ParkingSquare,
      badgeBg: "rgba(255, 255, 255, 0.18)",
      badgeColor: "#a3a3a3",
      text: "B04 parked at Row B - Slot 6",
      time: "12:15 PM",
    },
    {
      icon: Radio,
      badgeBg: "rgba(255, 255, 255, 0.18)",
      badgeColor: "#c4c4c4",
      text: "B03 detected at Row B - Slot 3",
      time: "12:10 PM",
    },
    {
      icon: ArrowRightLeft,
      badgeBg: "rgba(255, 255, 255, 0.18)",
      badgeColor: "#d4d4d4",
      text: "B02 moved to Row C - Slot 2",
      time: "11:56 AM",
    },
    {
      icon: CreditCard,
      badgeBg: "rgba(255, 255, 255, 0.18)",
      badgeColor: "#d4d4d4",
      text: "B01 entry detected (RFID-001)",
      time: "11:42 AM",
    },
    {
      icon: AlertTriangle,
      badgeBg: "rgba(255, 255, 255, 0.18)",
      badgeColor: "#b3b3b3",
      text: "B05 blocked by B02",
      time: "11:30 AM",
    },
  ];

  return (
    <div className="liquid-glass-card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Clock size={17} style={{ color: "#ffffff" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>Recent Events</span>
        </div>
        <span style={{ fontSize: 11, color: "#a3a3a3", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 2 }}>View All <ChevronRight size={12} /></span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {events.map((ev, i) => {
          const Icon = ev.icon;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: ev.badgeBg,
                    color: ev.badgeColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} />
                </div>
                <span style={{ fontSize: 12, color: "#e5e5e5", fontWeight: 500 }}>{ev.text}</span>
              </div>
              <span style={{ fontSize: 11, color: "#737373", fontFamily: "monospace", flexShrink: 0 }}>
                {ev.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const SensorStatusCard: React.FC = () => {
  const sensors = [
    { id: "RFID-001", loc: "Main Entrance", online: true },
    { id: "US-001", loc: "Row A - Slot 1", online: true },
    { id: "US-002", loc: "Row B - Slot 3", online: true },
    { id: "US-003", loc: "Row C - Slot 7", online: false },
    { id: "RFID-002", loc: "Exit Gate", online: true },
  ];

  return (
    <div className="liquid-glass-card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Radio size={17} style={{ color: "#ffffff" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>Sensor Status</span>
        </div>
        <span style={{ fontSize: 11, color: "#a3a3a3", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 2 }}>View All <ChevronRight size={12} /></span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {sensors.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: 95 }}>
              <Radio size={12} style={{ color: "#a3a3a3" }} />
              <span style={{ fontWeight: 600, color: "#ffffff", fontFamily: "monospace" }}>{s.id}</span>
            </div>
            <span style={{ color: "#a3a3a3", flex: 1, textAlign: "left", paddingLeft: 10 }}>{s.loc}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: s.online ? "#a3a3a3" : "#b3b3b3",
                  boxShadow: s.online ? "0 0 8px #a3a3a3" : "0 0 8px #b3b3b3",
                }}
              />
              <span style={{ color: s.online ? "#a3a3a3" : "#b3b3b3", fontWeight: 600, fontSize: 11 }}>
                {s.online ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
