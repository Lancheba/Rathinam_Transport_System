import React, { useEffect, useRef, useState } from "react";
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
  Phone,
  ArrowUp,
  MessageCircle,
} from "lucide-react";
import { ParkingGroundRealistic } from "../components/ParkingGroundRealistic";
import rathinamLogo from "../assets/rathinam_logo_crop.png";
import rguFooterLogo from "../assets/rgu_footer_logo.png";
import "./LandingPage.css";

/* ── Footer content ─────────────────────────────────────────────
   Every link goes to the login page for now. To point one at a real page, change its `to`
   (or `href` for the WhatsApp / phone links below). */
const QUICK_LINKS = [
  "About RGU",
  "Leadership",
  "Research",
  "Placements",
  "Alumni",
  "Careers",
  "FAQs",
  "Contact",
  "RGU Summer Camp - 2026",
];

const ACCREDITATIONS = ["NAAC A++", "NBA", "UGC", "AICTE", "QS"];

const WHATSAPP_URL = "https://wa.me/918448448909";

/* Brand icons drawn inline (the icon library has no brand logos) */
const IconX = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const IconLinkedIn = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
  </svg>
);
const IconFacebook = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const IconYouTube = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);
const IconInstagram = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
);

const SOCIALS = [
  { label: "X", icon: <IconX /> },
  { label: "LinkedIn", icon: <IconLinkedIn /> },
  { label: "Facebook", icon: <IconFacebook /> },
  { label: "YouTube", icon: <IconYouTube /> },
  { label: "Instagram", icon: <IconInstagram /> },
];

/**
 * Landing page — liquid-glass UI.
 *
 * Every animated surface on this page is a "liquid glass" layer: translucent, blurred,
 * with a bright specular rim and a highlight that follows the pointer. Behind the glass
 * drift soft blobs in the four colours of the Rathinam logo, so the glass has something
 * to refract. All motion is switched off for people who ask for reduced motion.
 */
export const LandingPage: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Pointer-tracked specular highlight: writes --mx / --my (px, relative to the glass
  // surface under the pointer) so the CSS can place a soft light on it.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(".lg, .lg-btn");
      if (!target) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        target.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        target.style.setProperty("--my", `${e.clientY - rect.top}px`);
      });
    };

    root.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("pointermove", onMove);
    };
  }, []);

  // True refraction (SVG displacement inside backdrop-filter) only works in desktop
  // Chromium. Everywhere else the header uses plain frosted glass.
  const canRefract =
    typeof navigator !== "undefined" &&
    /Chrome\//.test(navigator.userAgent) &&
    !/Mobile|Android/i.test(navigator.userAgent);

  return (
    <div ref={rootRef} className={`rlp-root${canRefract ? " rlp-root--refract" : ""}`}>
      {/* Glass refraction filter used by the header */}
      <svg className="lg-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="lg-refract" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="2" seed="7" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2" result="softNoise" />
            <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="46" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Colour the glass has to refract: four drifting blobs in the logo colours */}
      <div className="rlp-stage" aria-hidden="true">
        <span className="rlp-orb rlp-orb--orange" />
        <span className="rlp-orb rlp-orb--blue" />
        <span className="rlp-orb rlp-orb--green" />
        <span className="rlp-orb rlp-orb--magenta" />
      </div>
      <div className="rlp-veil" aria-hidden="true" />

      {/* Big header */}
      <header className="lp-nav">
        <div className="lp-nav__bar lg">
          <div className="lp-nav__brand">
            <div className="lp-nav__logo">
              <img src={rathinamLogo} alt="Rathinam — Celebrate life" width={96} height={96} />
            </div>
            <div className="lp-nav__text">
              <h1 className="lp-nav__title">Rathinam Transport System</h1>
              <p className="lp-nav__sub">Rathinam Technical Campus</p>
            </div>
          </div>

          <Link to="/login" className="lp-nav__cta lg-btn" aria-label="Login">
            <Lock size={16} />
            <span>Login</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="lp-hero">
        <section className="lp-hero__inner">
          <div className="lp-hero__pill lg">
            <Sparkles size={14} />
            <span>AI-Driven Transport Optimization &bull; IoT Gateway Enabled</span>
          </div>

          <h2 className="lp-hero__title">
            Eliminating College Bus Gridlocks with Smart Parking &amp; Retrieval
          </h2>

          <p className="lp-hero__lede">
            A full-stack cyber-physical system connecting physical RFID sensing, ultrasonic slot detection,
            and constraint-based departure optimization to prevent blocked buses and empower students with real-time locator lookup.
          </p>

          <div className="lp-hero__cta">
            <Link to="/login" className="lp-btn-primary lg-btn">
              <Bus size={18} />
              <span>Launch Live Dashboard</span>
              <ArrowRight size={16} />
            </Link>

            <Link to="/login" className="lp-btn-ghost lg-btn">
              <Search size={16} />
              <span>Student Bus Finder</span>
            </Link>
          </div>

          <div className="lp-hero__stats lg">
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
        </section>

        {/* Live ground preview */}
        <section className="lp-preview">
          <p className="lp-preview__eyebrow">Live Digital Twin Preview</p>
          <h2 className="lp-preview__title">Interactive 2D/3D Parking Ground</h2>
          <div className="lp-preview__frame lg">
            <ParkingGroundRealistic />
          </div>
        </section>

        {/* Core pillars */}
        <section className="lp-features">
          <article className="lp-feature-card lg lp-feature-card--orange">
            <div className="lp-feature-card__icon"><Radio size={22} /></div>
            <h3>Automated IoT Detection</h3>
            <p>RC522 RFID readers log vehicle entrance and exit timestamps instantly while ultrasonic sensors maintain live slot occupancy.</p>
          </article>

          <article className="lp-feature-card lg lp-feature-card--blue">
            <div className="lp-feature-card__icon"><Cpu size={22} /></div>
            <h3>Departure Optimization Engine</h3>
            <p>Eliminates the morning blocked-bus bottleneck by rearranging parking allocations according to scheduled route departure times.</p>
          </article>

          <article className="lp-feature-card lg lp-feature-card--green">
            <div className="lp-feature-card__icon"><Search size={22} /></div>
            <h3>Student Mobile Bus Locator</h3>
            <p>Quick, frictionless search where students enter their bus number to see row, slot number, departure time, and walking instructions.</p>
          </article>

          <article className="lp-feature-card lg lp-feature-card--magenta">
            <div className="lp-feature-card__icon"><MapPin size={22} /></div>
            <h3>Real-time Conflict Alerts</h3>
            <p>Instantly notifies campus transport coordinators when a parked bus is blocked by an earlier vehicle, giving automated relocation steps.</p>
          </article>
        </section>
      </main>

      {/* Footer — same layout as the university website */}
      <footer className="rgu-footer">
        <div className="rgu-footer__bar" aria-hidden="true" />
        <div className="rgu-footer__inner">
          <div className="rgu-footer__grid">
            <div className="rgu-footer__col rgu-footer__brand">
              <img className="rgu-footer__logo" src={rguFooterLogo} alt="Rathinam Global University — NAAC A++ accredited, 1st in Tamil Nadu" />
              <p>
                Rathinam Global University &mdash; a leading deemed university in Coimbatore shaping future-ready graduates.
              </p>
              <div className="rgu-footer__social">
                {SOCIALS.map((item) => (
                  <Link key={item.label} to="/login" className="rgu-footer__social-btn" aria-label={item.label}>
                    {item.icon}
                  </Link>
                ))}
              </div>
              <div className="rgu-footer__badges">
                {ACCREDITATIONS.map((badge) => (
                  <span key={badge} className="rgu-footer__badge">{badge}</span>
                ))}
              </div>
            </div>

            <nav className="rgu-footer__col" aria-label="Quick links">
              <h3 className="rgu-footer__heading">Quick Links</h3>
              <ul className="rgu-footer__links">
                {QUICK_LINKS.map((label) => (
                  <li key={label}><Link to="/login">{label}</Link></li>
                ))}
              </ul>
            </nav>

            <div className="rgu-footer__col">
              <h3 className="rgu-footer__heading">Contact</h3>
              <ul className="rgu-footer__contact">
                <li>
                  <MapPin size={18} />
                  <span>Eachanari, Coimbatore<br />Tamil Nadu &ndash; 641021</span>
                </li>
                <li>
                  <Phone size={18} />
                  <a href="tel:+918448448909">+91-844-844-8909</a>
                </li>
              </ul>
            </div>

            <div className="rgu-footer__col">
              <h3 className="rgu-footer__heading">Admissions</h3>
              <p className="rgu-footer__admissions">
                Admissions are now open for Undergraduate, Postgraduate and Research programs.
              </p>
              <Link to="/login" className="rgu-footer__cta">Explore Programs</Link>
            </div>
          </div>

          <div className="rgu-footer__legal">
            &copy; {new Date().getFullYear()} Rathinam Global University. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Floating actions */}
      <Link to="/login" className="rgu-enquire">Enquire Now</Link>
      <div className="rgu-float">
        <button
          type="button"
          className={`rgu-float__btn rgu-float__btn--top${showTop ? " is-visible" : ""}`}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
        >
          <ArrowUp size={26} />
        </button>
        <a className="rgu-float__btn rgu-float__btn--whatsapp" href={WHATSAPP_URL} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
          <MessageCircle size={28} />
        </a>
      </div>
    </div>
  );
};

export default LandingPage;
