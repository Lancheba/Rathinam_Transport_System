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
  ExternalLink,
} from "lucide-react";
import { ParkingGroundRealistic } from "../components/ParkingGroundRealistic";
import bgImage from "../assets/login_bg_glass.png";
import "./LandingPage.css";

export const LandingPage: React.FC = () => {
  return (
    <div className="rlp-root">
      <div className="rlp-backdrop" style={{ backgroundImage: `url(${bgImage})` }} aria-hidden="true" />
      <div className="rlp-veil" aria-hidden="true" />

      {/* Floating Glass Navigation */}
      <header className="lp-nav">
        <div className="lp-nav__bar">
          <div className="lp-nav__brand">
            <div className="lp-nav__logo">
              <Bus size={20} strokeWidth={2.2} />
            </div>
            <div className="lp-nav__text">
              <div className="lp-nav__title">Rathinam Smart Parking System</div>
              <div className="lp-nav__sub">Rathinam College of Engineering</div>
            </div>
          </div>

          <div className="lp-nav__actions">
            <Link to="/dashboard/find" className="lp-nav__link" aria-label="Find Bus">
              <Search size={14} />
              <span>Find Bus</span>
            </Link>

            <Link to="/login" className="lp-nav__link" aria-label="Login">
              <Lock size={14} />
              <span>Login</span>
            </Link>

            <Link to="/dashboard" className="lp-nav__cta">
              <span>Dashboard</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="lp-hero">
        <div className="lp-hero__inner">
          <div className="lp-hero__pill">
            <Sparkles size={14} />
            <span>AI-Driven Transport Optimization &bull; IoT Gateway Enabled</span>
          </div>

          <h1 className="lp-hero__title">
            Eliminating College Bus Gridlocks with{" "}
            <span className="lp-hero__title-accent">Smart Parking &amp; Retrieval</span>
          </h1>

          <p className="lp-hero__lede">
            A full-stack cyber-physical system connecting physical RFID sensing, ultrasonic slot detection,
            and constraint-based departure optimization to prevent blocked buses and empower students with real-time locator lookup.
          </p>

          <div className="lp-hero__cta">
            <Link to="/dashboard" className="lp-btn-primary">
              <Bus size={18} />
              <span>Launch Live Dashboard</span>
              <ArrowRight size={16} />
            </Link>

            <Link to="/dashboard/find" className="lp-btn-ghost">
              <Search size={16} />
              <span>Student Bus Finder</span>
            </Link>
          </div>

          <div className="lp-hero__stats">
            <div className="lp-hero__stat">
              <CheckCircle2 size={16} />
              <span><strong>32</strong> Ground Slots (60m &times; 35m)</span>
            </div>
            <div className="lp-hero__stat">
              <Clock size={16} />
              <span><strong>2.5 min</strong> Avg. Retrieval Time</span>
            </div>
            <div className="lp-hero__stat">
              <Shield size={16} />
              <span><strong>0</strong> Blocked Buses with AI</span>
            </div>
          </div>
        </div>

        {/* Live Ground Preview Card */}
        <div className="lp-preview">
          <span className="lp-preview__eyebrow">Live Digital Twin Preview</span>
          <h2 className="lp-preview__title">Interactive 2D/3D Parking Ground</h2>
          <ParkingGroundRealistic />
        </div>

        {/* Core Pillars Feature Grid */}
        <div className="lp-features">
          <div className="lp-feature-card">
            <div className="lp-feature-card__icon"><Radio size={22} /></div>
            <h3>Automated IoT Detection</h3>
            <p>RC522 RFID readers log vehicle entrance and exit timestamps instantly while ultrasonic sensors maintain live slot occupancy.</p>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-card__icon"><Cpu size={22} /></div>
            <h3>Departure Optimization Engine</h3>
            <p>Eliminates the morning blocked-bus bottleneck by rearranging parking allocations according to scheduled route departure times.</p>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-card__icon"><Search size={22} /></div>
            <h3>Student Mobile Bus Locator</h3>
            <p>Quick, frictionless search where students enter their bus number to see row, slot number, departure time, and walking instructions.</p>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-card__icon"><MapPin size={22} /></div>
            <h3>Real-time Conflict Alerts</h3>
            <p>Instantly notifies campus transport coordinators when a parked bus is blocked by an earlier vehicle, giving automated relocation steps.</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="lp-footer">
          <div>
            &copy; {new Date().getFullYear()} Rathinam College of Engineering &bull; Smart Bus Parking &amp; Retrieval System
          </div>
          <div className="lp-footer__links">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/dashboard/find">Find Bus</Link>
            <Link to="/login">Staff Portal</Link>
            <a href="http://localhost:8000/api/docs/" target="_blank" rel="noreferrer">
              API Docs <ExternalLink size={12} />
            </a>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default LandingPage;
