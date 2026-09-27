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
import { getParkingSummary, getGround } from "../api/endpoints";
import type { ParkingSummary, ParkingGround } from "../types";
import rathinamLogo from "../assets/rathinam_logo_crop.png";
import rguFooterLogo from "../assets/rgu_footer_logo.png";
import "./LandingPage.css";

/* ── Footer content ──────────────────────────────────────── */
const QUICK_LINKS = [
  "About RGU", "Leadership", "Research", "Placements",
  "Alumni", "Careers", "FAQs", "Contact", "RGU Summer Camp - 2026",
];
const ACCREDITATIONS = ["NAAC A++", "NBA", "UGC", "AICTE", "QS"];
const WHATSAPP_URL = "https://wa.me/918448448909";

/* Brand icons */
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
  { label: "X",         icon: <IconX /> },
  { label: "LinkedIn",  icon: <IconLinkedIn /> },
  { label: "Facebook",  icon: <IconFacebook /> },
  { label: "YouTube",   icon: <IconYouTube /> },
  { label: "Instagram", icon: <IconInstagram /> },
];

/* ── Scroll-reveal hook ───────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ── Popup / modal for feature cards ─────────────────────── */
interface FeatureDetail {
  title: string;
  body: string;
  color: string;
}

const FEATURE_DETAILS: FeatureDetail[] = [
  {
    title: "Automated IoT Detection",
    body: "RC522 RFID readers are mounted at every entry/exit gate and log precise timestamps the moment a vehicle crosses. Ultrasonic HC-SR04 sensors above each slot stream occupancy state over MQTT to the Django backend, which updates the live map in under 300 ms.",
    color: "orange",
  },
  {
    title: "Departure Optimization Engine",
    body: "A constraint-satisfaction solver runs each night (and on demand) against the day's timetable. It reassigns parking slots so that the first bus to leave occupies the outermost position, eliminating the morning blocked-bus cascade that previously delayed hundreds of students.",
    color: "blue",
  },
  {
    title: "Student Mobile Bus Locator",
    body: "Students open the public Bus Finder on any device, type their route number, and instantly see their bus's row, slot, walking distance from the gate, and scheduled departure time — no login required.",
    color: "green",
  },
  {
    title: "Real-time Conflict Alerts",
    body: "When the system detects that a parked bus will be blocked at departure time, it pushes an alert to the transport coordinator dashboard with the exact offending vehicle and automated step-by-step relocation instructions.",
    color: "magenta",
  },
];

export const LandingPage: React.FC = () => {
  const rootRef   = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop]   = useState(false);
  const [summary, setSummary]   = useState<ParkingSummary | null>(null);
  const [ground,  setGround]    = useState<ParkingGround  | null>(null);
  const [popup,   setPopup]     = useState<FeatureDetail  | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);

  const featuresReveal = useReveal(0.1);

  /* Live parking figures */
  useEffect(() => {
    const load = () => {
      getParkingSummary().then(setSummary).catch(() => {});
      getGround().then((g) => setGround(g?.[0] ?? null)).catch(() => {});
    };
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  /* Back-to-top visibility */
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Pointer-tracked specular highlight */
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
    return () => { cancelAnimationFrame(frame); root.removeEventListener("pointermove", onMove); };
  }, []);

  /* Popup open/close with animation */
  const openPopup = (detail: FeatureDetail) => {
    setPopup(detail);
    requestAnimationFrame(() => requestAnimationFrame(() => setPopupVisible(true)));
  };
  const closePopup = () => {
    setPopupVisible(false);
    setTimeout(() => setPopup(null), 340);
  };

  /* Escape key closes popup */
  useEffect(() => {
    if (!popup) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePopup(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popup]);

  const canRefract =
    typeof navigator !== "undefined" &&
    /Chrome\//.test(navigator.userAgent) &&
    !/Mobile|Android/i.test(navigator.userAgent);

  return (
    <div ref={rootRef} className={`rlp-root${canRefract ? " rlp-root--refract" : ""}`}>
      {/* Glass refraction filter */}
      <svg className="lg-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="lg-refract" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="2" seed="7" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2" result="softNoise" />
            <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="46" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Drifting colour orbs */}
      <div className="rlp-stage" aria-hidden="true">
        <span className="rlp-orb rlp-orb--orange" />
        <span className="rlp-orb rlp-orb--blue" />
        <span className="rlp-orb rlp-orb--green" />
        <span className="rlp-orb rlp-orb--magenta" />
      </div>
      <div className="rlp-veil" aria-hidden="true" />

      {/* ── Header ─────────────────────────────────────────── */}
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

      {/* ── Hero ───────────────────────────────────────────── */}
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
              <span>
                <strong>{summary ? summary.total_slots : "—"}</strong> Ground Slots
                {ground && <> ({Number(ground.length_m)}m &times; {Number(ground.width_m)}m)</>}
              </span>
            </div>
            <div className="lp-hero__stat">
              <Clock size={16} />
              <span><strong>{summary ? summary.occupied : "—"}</strong> Buses Parked Now</span>
            </div>
            <div className="lp-hero__stat">
              <Shield size={16} />
              <span><strong>{summary ? summary.blocked : "—"}</strong> Blocked Buses Now</span>
            </div>
          </div>
        </section>

        {/* ── Feature cards ─────────────────────────────── */}
        <section
          ref={featuresReveal.ref as React.RefObject<HTMLElement>}
          className={`lp-features${featuresReveal.visible ? " lp-features--visible" : ""}`}
          aria-label="Core feature highlights"
        >
          {(
            [
              { icon: <Radio size={22} />,  color: "orange",  idx: 0 },
              { icon: <Cpu size={22} />,    color: "blue",    idx: 1 },
              { icon: <Search size={22} />, color: "green",   idx: 2 },
              { icon: <MapPin size={22} />, color: "magenta", idx: 3 },
            ] as const
          ).map(({ icon, color, idx }) => {
            const detail = FEATURE_DETAILS[idx];
            return (
              <article
                key={color}
                className={`lp-feature-card lg lp-feature-card--${color}`}
                style={{ "--card-delay": `${idx * 120}ms` } as React.CSSProperties}
                onClick={() => openPopup(detail)}
                role="button"
                tabIndex={0}
                aria-label={`Learn more about ${detail.title}`}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPopup(detail); } }}
              >
                <div className="lp-feature-card__icon">{icon}</div>
                <h3>{detail.title}</h3>
                <p>{
                  idx === 0 ? "RC522 RFID readers log vehicle entrance and exit timestamps instantly while ultrasonic sensors maintain live slot occupancy." :
                  idx === 1 ? "Eliminates the morning blocked-bus bottleneck by rearranging parking allocations according to scheduled route departure times." :
                  idx === 2 ? "Quick, frictionless search where students enter their bus number to see row, slot number, departure time, and walking instructions." :
                             "Instantly notifies campus transport coordinators when a parked bus is blocked by an earlier vehicle, giving automated relocation steps."
                }</p>
                <span className="lp-feature-card__cta">Learn more <ArrowRight size={13} /></span>
              </article>
            );
          })}
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="rgu-footer">
        <div className="rgu-footer__bar" aria-hidden="true" />
        <div className="rgu-footer__inner">
          <div className="rgu-footer__grid">
            <div className="rgu-footer__col rgu-footer__brand">
              <img className="rgu-footer__logo" src={rguFooterLogo} alt="Rathinam Global University" />
              <p>Rathinam Global University &mdash; a leading deemed university in Coimbatore shaping future-ready graduates.</p>
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

      {/* ── Feature detail popup ───────────────────────────── */}
      {popup && (
        <div
          className={`lg-popup-overlay${popupVisible ? " lg-popup-overlay--in" : ""}`}
          onClick={closePopup}
          role="dialog"
          aria-modal="true"
          aria-label={popup.title}
        >
          <div
            className={`lg-popup lg lp-feature-card--${popup.color}${popupVisible ? " lg-popup--in" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="lg-popup__close lg-btn" onClick={closePopup} aria-label="Close">✕</button>
            <h3 className="lg-popup__title">{popup.title}</h3>
            <p className="lg-popup__body">{popup.body}</p>
            <Link to="/login" className="lp-btn-primary lg-btn lg-popup__action">
              <Bus size={16} />
              <span>Open Dashboard</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
