import React from "react";
import { Link } from "react-router-dom";
import {
  Bus,
  Shield,
  Cpu,
  Search,
  Radio,
  ArrowRight,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { ParkingGroundRealistic } from "../components/ParkingGroundRealistic";

export const LandingPage: React.FC = () => {
  return (
    <div style={{ position: "relative", minHeight: "100vh", overflowX: "hidden" }}>
      {/* Background Liquid Glass Fluid Waveforms */}
      <div className="liquid-bg-waves" />
      <svg
        className="liquid-silk-svg"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="none"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <path
          d="M-100 150 C 300 0, 700 350, 1100 80 C 1300 -50, 1500 120, 1600 200"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="2.5"
          filter="blur(1px)"
        />
        <path
          d="M-50 250 C 400 100, 800 450, 1200 180 C 1400 50, 1550 220, 1650 300"
          stroke="rgba(56, 189, 248, 0.1)"
          strokeWidth="1.5"
        />
      </svg>

      {/* Floating Glass Navigation */}
      <header
        style={{
          position: "sticky",
          top: 14,
          zIndex: 40,
          maxWidth: 1200,
          margin: "0 auto 20px auto",
          padding: "0 16px",
        }}
      >
        <div
          className="liquid-glass-card"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 24px",
            borderRadius: 9999,
            background: "rgba(12, 16, 26, 0.75)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.05) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <Bus size={20} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.01em" }}>
                Smart Bus Parking
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Rathinam College of Engineering</div>
            </div>
          </div>

          {/* Nav buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              to="/dashboard/find"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 600,
                color: "#cbd5e1",
                textDecoration: "none",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                transition: "all 0.2s",
              }}
            >
              <Search size={14} />
              <span>Find Bus</span>
            </Link>

            <Link
              to="/login"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 600,
                color: "#cbd5e1",
                textDecoration: "none",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                transition: "all 0.2s",
              }}
            >
              <Lock size={14} />
              <span>Login</span>
            </Link>

            <Link
              to="/dashboard"
              className="liquid-pill-active"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 20px",
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 0 16px rgba(255, 255, 255, 0.2)",
              }}
            >
              <span>Dashboard</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 60px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", maxWidth: 880, margin: "0 auto 48px auto" }}>
          {/* Pill Tag */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 18px",
              borderRadius: 9999,
              background: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              color: "#38bdf8",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 20,
              boxShadow: "0 0 20px rgba(56, 189, 248, 0.15)",
            }}
          >
            <Sparkles size={14} />
            <span>AI-Driven Transport Optimization &bull; IoT Gateway Enabled</span>
          </div>

          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 54px)",
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              marginBottom: 20,
              textShadow: "0 2px 20px rgba(0,0,0,0.8)",
            }}
          >
            Eliminating College Bus Gridlocks with{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, #93c5fd 50%, #38bdf8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Smart Parking &amp; Retrieval
            </span>
          </h1>

          <p
            style={{
              fontSize: "clamp(15px, 2vw, 17px)",
              color: "#94a3b8",
              lineHeight: 1.6,
              maxWidth: 720,
              margin: "0 auto 36px auto",
            }}
          >
            A full-stack cyber-physical system connecting physical RFID sensing, ultrasonic slot detection,
            and constraint-based departure optimization to prevent blocked buses and empower students with real-time locator lookup.
          </p>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <Link
              to="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 32px",
                borderRadius: 9999,
                background: "linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)",
                color: "#090d16",
                fontWeight: 800,
                fontSize: 14,
                textDecoration: "none",
                boxShadow: "0 8px 30px rgba(255, 255, 255, 0.25), inset 0 1px 0 #ffffff",
                transition: "transform 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <Bus size={18} />
              <span>Launch Live Dashboard</span>
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/dashboard/find"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 28px",
                borderRadius: 9999,
                background: "rgba(255, 255, 255, 0.07)",
                backdropFilter: "blur(14px)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.16)";
              }}
            >
              <Search size={16} />
              <span>Student Bus Finder</span>
            </Link>
          </div>

          {/* Quick Stats Pills */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 24,
              flexWrap: "wrap",
              marginTop: 48,
              padding: "16px 28px",
              borderRadius: 9999,
              background: "rgba(14, 18, 28, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(16px)",
              maxWidth: 820,
              margin: "48px auto 0 auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={16} style={{ color: "#10b981" }} />
              <span style={{ fontSize: 13, color: "#e2e8f0" }}>
                <strong style={{ color: "#fff" }}>32</strong> Ground Slots (60m &times; 35m)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={16} style={{ color: "#38bdf8" }} />
              <span style={{ fontSize: 13, color: "#e2e8f0" }}>
                <strong style={{ color: "#fff" }}>2.5 min</strong> Avg. Retrieval Time
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Shield size={16} style={{ color: "#f59e0b" }} />
              <span style={{ fontSize: 13, color: "#e2e8f0" }}>
                <strong style={{ color: "#fff" }}>0</strong> Blocked Buses with AI
              </span>
            </div>
          </div>
        </div>

        {/* Live Ground Preview Card */}
        <div style={{ marginBottom: 60 }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "#38bdf8", fontWeight: 700 }}>
              Live Digital Twin Preview
            </span>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#ffffff", marginTop: 4 }}>
              Interactive 2D/3D Parking Ground
            </h2>
          </div>
          <ParkingGroundRealistic />
        </div>

        {/* Core Pillars Feature Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          <div className="liquid-glass-card" style={{ padding: "26px 24px" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Radio size={22} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", marginBottom: 8 }}>
              Automated IoT Detection
            </h3>
            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
              RC522 RFID readers log vehicle entrance and exit timestamps instantly while ultrasonic sensors maintain live slot occupancy.
            </p>
          </div>

          <div className="liquid-glass-card" style={{ padding: "26px 24px" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Cpu size={22} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", marginBottom: 8 }}>
              Departure Optimization Engine
            </h3>
            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
              Eliminates the morning blocked-bus bottleneck by rearranging parking allocations according to scheduled route departure times.
            </p>
          </div>

          <div className="liquid-glass-card" style={{ padding: "26px 24px" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16, 185, 129, 0.15)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Search size={22} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", marginBottom: 8 }}>
              Student Mobile Bus Locator
            </h3>
            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
              Quick, frictionless search where students enter their bus number to see row, slot number, departure time, and walking instructions.
            </p>
          </div>

          <div className="liquid-glass-card" style={{ padding: "26px 24px" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(244, 63, 94, 0.15)", color: "#fb7185", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <MapPin size={22} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", marginBottom: 8 }}>
              Real-time Conflict Alerts
            </h3>
            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
              Instantly notifies campus transport coordinators when a parked bus is blocked by an earlier vehicle, giving automated relocation steps.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer
          style={{
            marginTop: 80,
            paddingTop: 32,
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            color: "#64748b",
            fontSize: 12,
          }}
        >
          <div>
            &copy; {new Date().getFullYear()} Rathinam College of Engineering &bull; Smart Bus Parking &amp; Retrieval System
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <Link to="/dashboard" style={{ color: "#94a3b8", textDecoration: "none" }}>Dashboard</Link>
            <Link to="/dashboard/find" style={{ color: "#94a3b8", textDecoration: "none" }}>Find Bus</Link>
            <Link to="/login" style={{ color: "#94a3b8", textDecoration: "none" }}>Staff Portal</Link>
            <a href="http://localhost:8000/api/docs/" target="_blank" rel="noreferrer" style={{ color: "#94a3b8", textDecoration: "none" }}>API Docs ↗</a>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default LandingPage;
