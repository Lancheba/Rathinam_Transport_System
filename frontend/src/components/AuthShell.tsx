import React from "react";
import logoMark from "../assets/logo_mark.png";
import logoWord from "../assets/logo_word.png";
import bgImage from "../assets/login_bg_glass.png";

/* ── Page frame: uploaded background image + centered glass card slot ───────
   Kept deliberately simple: no decorative SVG, no side brand column.
   Monochrome only — the background photo supplies all the visual texture. */

export const AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="auth-root">
    <div
      className="auth-backdrop"
      style={{ backgroundImage: `url(${bgImage})` }}
      aria-hidden="true"
    />
    <div className="auth-backdrop-veil" aria-hidden="true" />
    <main className="auth-layout">
      <section className="auth-panel">{children}</section>
    </main>
  </div>
);

/* ── Page heading, shown above the glass card on the login screen ─────────── */

export const AuthHeading: React.FC = () => (
  <div className="auth-heading">
    <h1 className="auth-heading__title">Rathinam Smart Parking System</h1>
  </div>
);

/* ── Small logo lockup — still used by the Sign Up screen ─────────────────── */

export const AuthCardLogo: React.FC = () => (
  <div className="auth-card__logo">
    <div className="auth-card__logo-top">
      <img src={logoMark} alt="" className="auth-card__logo-mark" />
      <span className="auth-card__logo-script">Celebrate life</span>
    </div>
    <img src={logoWord} alt="Rathinam" className="auth-card__logo-word" />
  </div>
);
