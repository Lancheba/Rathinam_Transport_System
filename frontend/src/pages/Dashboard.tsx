import React, { useState, useEffect } from "react";
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
import { getParkingSummary } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

export const Dashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [greeting, setGreeting] = useState("Good Afternoon");
  const { username } = useAuth();

  // Live state from API with fallback to demo match
  const [summary, setSummary] = useState({
    total_slots: 32,
    occupied: 4,
    free: 28,
    blocked: 1,
    utilisation_pct: 12.5,
  });

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

      // Dynamic Greeting
      const hour = now.getHours();
      if (hour < 12) setGreeting("Good Morning");
      else if (hour < 17) setGreeting("Good Afternoon");
      else setGreeting("Good Evening");
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    getParkingSummary()
      .then((data) => {
        if (data) {
          setSummary({
            total_slots: data.total_slots || 32,
            occupied: data.occupied || 4,
            free: data.free || 28,
            blocked: data.blocked || 1,
            utilisation_pct: data.utilisation_pct || 12.5,
          });
        }
      })
      .catch(() => {
        // Fallback demo state matches reference image
      });
  }, []);

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
            {currentDate || "Sep 26, 2025"}
          </span>
          <div style={{ width: 1, height: 14, background: "rgb(var(--ov) / 0.15)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-strong)", fontFamily: "monospace" }}>
              {currentTime || "12:28 PM"}
            </span>
            <Clock size={14} style={{ color: "var(--text-muted)" }} />
          </div>
        </div>
      </div>

      {/* 6 Metric Cards */}
      <MetricCards
        totalBuses={4}
        activeBuses={4}
        blockedBuses={summary.blocked}
        occupiedSlots={summary.occupied}
        freeSlots={summary.free}
        totalSlots={summary.total_slots}
        avgRetrievalTime="2.5 min"
        retrievalImprovement="45% faster (vs. last hour)"
        activeSensors={5}
        offlineSensors={1}
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
