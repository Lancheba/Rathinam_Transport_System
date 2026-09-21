import React, { useState, useEffect, useCallback } from "react";
import { Clock } from "lucide-react";
import { MetricCards } from "../components/MetricCards";
import { ParkingGroundRealistic } from "../components/ParkingGroundRealistic";
import {
  BusInformationCard,
  RecentEventsCard,
  SensorStatusCard,
} from "../components/RightColumnCards";
import {
  SlotUtilizationCard,
  BusRouteDistributionCard,
} from "../components/BottomAnalyticsCards";
import { getParkingSummary, getBuses, getSensors, getStudentSummary } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const greetingFor = (date: Date) => {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

export const Dashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [greeting, setGreeting] = useState(() => greetingFor(new Date()));
  const { username, canManageBuses } = useAuth();

  // Live state from API — starts at 0 so a slow/failed fetch never shows a
  // value that doesn't exist in the backend.
  const [summary, setSummary] = useState({
    total_slots: 0,
    occupied: 0,
    free: 0,
    blocked: 0,
    utilisation_pct: 0,
  });
  const [busStats, setBusStats] = useState({ total: 0, active: 0 });
  const [sensorStats, setSensorStats] = useState({ active: 0, offline: 0 });
  const [studentStats, setStudentStats] = useState<{ total: number; unassigned: number } | null>(null);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      // Date formatting
      const dateStr = now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      setCurrentDate(dateStr);

      // Time formatting
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      setCurrentTime(timeStr);

      setGreeting(greetingFor(now));
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadSummary = useCallback(() => {
    getParkingSummary()
      .then((data) => {
        if (data) {
          setSummary({
            total_slots: data.total_slots ?? 0,
            occupied: data.occupied ?? 0,
            free: data.free ?? 0,
            blocked: data.blocked ?? 0,
            utilisation_pct: data.utilisation_pct ?? 0,
          });
        }
      })
      .catch(() => {
        // keep whatever we last had on a transient error; next poll retries
      });
  }, []);

  const loadBuses = useCallback(() => {
    getBuses()
      .then((buses) => {
        setBusStats({
          total: buses.length,
          active: buses.filter((b) => b.is_active).length,
        });
      })
      .catch(() => {});
  }, []);

  const loadSensors = useCallback(() => {
    getSensors()
      .then((sensors) => {
        setSensorStats({
          active: sensors.filter((s) => s.is_active).length,
          offline: sensors.filter((s) => !s.is_active).length,
        });
      })
      .catch(() => {});
  }, []);

  // Roll numbers are personal data — the API 403s for students, so only
  // staff/admin ever attempt this call (and only they see the resulting card).
  const loadStudents = useCallback(() => {
    if (!canManageBuses) { setStudentStats(null); return; }
    getStudentSummary()
      .then((s) => setStudentStats({ total: s.total, unassigned: s.unassigned }))
      .catch(() => {});
  }, [canManageBuses]);

  useEffect(() => {
    loadSummary();
    loadBuses();
    loadSensors();
    loadStudents();
    // Poll every 15s so the top metric cards stay in sync with the live ground
    // view instead of freezing at whatever the first successful fetch returned.
    const id = setInterval(() => {
      loadSummary();
      loadBuses();
      loadSensors();
      loadStudents();
    }, 15000);
    return () => clearInterval(id);
  }, [loadSummary, loadBuses, loadSensors, loadStudents]);

  return (
    <div style={{ maxWidth: 1480, margin: "0 auto" }}>
      {/* Greeting & Date/Time Bar */}
      <div
        className="dash-head"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            className="dash-head__title"
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text-strong)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              letterSpacing: "-0.02em",
            }}
          >
            <span>{greeting}, {username ?? "User"}</span>
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Here's what's happening at the college bus parking ground today.
          </p>
        </div>

        {/* Date & Time Glass Pill */}
        <div
          className="dash-clock"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 16px",
            borderRadius: 9999,
            background: "rgb(var(--ov) / 0.05)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgb(var(--ov) / 0.1)",
            boxShadow: "0 4px 12px rgb(var(--shadow-rgb) / calc(0.3 * var(--shadow-k)))",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
            {currentDate}
          </span>
          <div style={{ width: 1, height: 14, background: "rgb(var(--ov) / 0.15)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-strong)", fontFamily: "monospace" }}>
              {currentTime}
            </span>
            <Clock size={14} style={{ color: "var(--text-muted)" }} />
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <MetricCards
        totalBuses={busStats.total}
        activeBuses={busStats.active}
        blockedBuses={summary.blocked}
        occupiedSlots={summary.occupied}
        freeSlots={summary.free}
        totalSlots={summary.total_slots}
        activeSensors={sensorStats.active}
        offlineSensors={sensorStats.offline}
        totalStudents={studentStats?.total}
        unassignedStudents={studentStats?.unassigned}
      />

      {/* Main Grid: Left (Ground + Bottom Analytics) vs. Right (3 Cards) */}
      <div
        className="dash-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Left Column */}
        <div className="dash-left" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Realistic Parking Ground */}
          <ParkingGroundRealistic />

          {/* Bottom Analytics (Slot Utilization + Route Distribution) */}
          <div
            className="dash-analytics"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
          >
            <SlotUtilizationCard
              occupied={summary.occupied}
              free={summary.free}
              total={summary.total_slots}
            />
            <BusRouteDistributionCard />
          </div>
        </div>

        {/* Right Column (Bus Information, Recent Events, Sensor Status) */}
        <div className="dash-side" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <BusInformationCard />
          <RecentEventsCard />
          <SensorStatusCard />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
