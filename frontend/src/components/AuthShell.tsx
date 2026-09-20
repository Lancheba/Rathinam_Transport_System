import React from "react";
import logoMark from "../assets/logo_mark.png";
import logoWord from "../assets/logo_word.png";

/* ── Background: black canvas, silver silk ribbons, glass bubbles ─────────── */

const Bubble: React.FC<{ cx: number; cy: number; r: number; className?: string }> = ({
  cx, cy, r, className,
}) => (
  <g className={className}>
    <circle cx={cx} cy={cy} r={r} fill="url(#ab-bubble)" stroke="#fff" strokeOpacity=".4" strokeWidth="1.4" />
    <ellipse
      cx={cx - r * 0.32} cy={cy - r * 0.42} rx={r * 0.34} ry={r * 0.17}
      fill="#fff" fillOpacity=".55" transform={`rotate(-32 ${cx - r * 0.32} ${cy - r * 0.42})`}
      filter="url(#ab-blur-sm)"
    />
    <path
      d={`M ${cx + r * 0.55} ${cy + r * 0.62} A ${r * 0.85} ${r * 0.85} 0 0 1 ${cx - r * 0.3} ${cy + r * 0.82}`}
      fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth={Math.max(1.5, r * 0.05)} strokeLinecap="round"
    />
  </g>
);

const AuthBackdrop: React.FC = () => (
  <svg
    className="auth-backdrop"
    viewBox="0 0 1536 1024"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <radialGradient id="ab-base" cx="58%" cy="58%" r="80%">
        <stop offset="0" stopColor="#262626" />
        <stop offset=".45" stopColor="#0d0d0d" />
        <stop offset="1" stopColor="#000" />
      </radialGradient>
      <linearGradient id="ab-silk-a" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f4f4f4" stopOpacity=".95" />
        <stop offset=".5" stopColor="#9b9b9b" stopOpacity=".5" />
        <stop offset="1" stopColor="#333" stopOpacity=".05" />
      </linearGradient>
      <linearGradient id="ab-silk-b" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#d8d8d8" stopOpacity=".5" />
        <stop offset=".55" stopColor="#7d7d7d" stopOpacity=".18" />
        <stop offset="1" stopColor="#bcbcbc" stopOpacity=".38" />
      </linearGradient>
      <linearGradient id="ab-silk-c" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity=".0" />
        <stop offset=".5" stopColor="#e9e9e9" stopOpacity=".42" />
        <stop offset="1" stopColor="#fff" stopOpacity=".0" />
      </linearGradient>
      <linearGradient id="ab-fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity=".26" />
        <stop offset=".6" stopColor="#bdbdbd" stopOpacity=".1" />
        <stop offset="1" stopColor="#fff" stopOpacity=".03" />
      </linearGradient>
      <linearGradient id="ab-fadeend" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity=".5" />
        <stop offset=".6" stopColor="#fff" stopOpacity=".3" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="ab-fadestart" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0" />
        <stop offset=".3" stopColor="#fff" stopOpacity=".32" />
        <stop offset="1" stopColor="#fff" stopOpacity=".3" />
      </linearGradient>
      <linearGradient id="ab-edge" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity=".85" />
        <stop offset=".5" stopColor="#fff" stopOpacity=".28" />
        <stop offset="1" stopColor="#fff" stopOpacity=".7" />
      </linearGradient>
      <radialGradient id="ab-bubble" cx=".5" cy=".5" r=".5">
        <stop offset="0" stopColor="#fff" stopOpacity="0" />
        <stop offset=".7" stopColor="#fff" stopOpacity=".05" />
        <stop offset=".93" stopColor="#fff" stopOpacity=".3" />
        <stop offset="1" stopColor="#fff" stopOpacity=".62" />
      </radialGradient>
      <filter id="ab-soft" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
      <filter id="ab-blur-sm" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="1.6" />
      </filter>
    </defs>

    <rect width="1536" height="1024" fill="url(#ab-base)" />

    {/* Top-left silk sheet */}
    <g>
      <path
        d="M0 0 H392 C330 44 270 92 244 150 C214 218 130 236 64 300 C34 330 12 360 0 392 Z"
        fill="url(#ab-silk-a)" opacity=".92"
      />
      <path
        d="M0 210 C90 190 150 130 236 92 C292 66 350 40 392 0 C340 70 290 130 226 176 C150 232 84 262 0 330 Z"
        fill="#000" opacity=".28" filter="url(#ab-soft)"
      />
      <path
        d="M0 150 C96 118 176 60 268 0"
        fill="none" stroke="url(#ab-edge)" strokeWidth="2" opacity=".55" filter="url(#ab-blur-sm)"
      />
      <path
        d="M0 292 C86 262 168 214 236 138 C270 100 318 52 366 8"
        fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="1.6"
      />
    </g>

    {/* Left mid: fold, drawn as light edges only so nothing ends in a hard cut */}
    <path
      d="M-20 470 C60 500 118 590 170 690 C216 776 290 842 430 900 C520 936 610 950 700 950"
      fill="none" stroke="url(#ab-fadeend)" strokeWidth="1.5"
    />

    {/* Bottom sweeping ribbons (closed off-canvas so edges never show) */}
    <g>
      <path
        d="M-60 838 C170 786 330 826 520 872 C720 920 890 962 1090 948 C1300 934 1440 852 1600 760 L1600 1100 L-60 1100 Z"
        fill="url(#ab-fade)"
      />
      <path
        d="M-60 838 C170 786 330 826 520 872 C720 920 890 962 1090 948 C1300 934 1440 852 1600 760"
        fill="none" stroke="url(#ab-edge)" strokeWidth="2.2" filter="url(#ab-blur-sm)"
      />
      <path
        d="M-60 940 C200 900 380 930 560 986 C700 1030 860 1050 1000 1040 C1200 1030 1400 960 1600 860 L1600 1100 L-60 1100 Z"
        fill="url(#ab-silk-c)" opacity=".5"
      />
      <path
        d="M120 900 C300 852 470 880 650 940 C800 990 960 1030 1130 1000 C1290 972 1420 900 1600 822"
        fill="none" stroke="url(#ab-fadestart)" strokeWidth="1.6"
      />
    </g>

    {/* Right-side ribbon rising behind the card */}
    <g>
      <path
        d="M1100 1100 C1240 1010 1420 900 1600 690 L1600 1100 Z"
        fill="url(#ab-fade)" opacity=".9"
      />
      <path
        d="M1200 1010 C1320 950 1450 850 1580 680"
        fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2.2" filter="url(#ab-blur-sm)"
      />
      <path
        d="M1300 916 C1390 876 1470 800 1560 610"
        fill="none" stroke="#fff" strokeOpacity=".26" strokeWidth="1.5"
      />
    </g>

    {/* Glass bubbles */}
    <Bubble cx={1461} cy={85} r={44} className="auth-bubble auth-bubble--a" />
    <Bubble cx={95} cy={369} r={16} className="auth-bubble auth-bubble--b" />
    <Bubble cx={90} cy={822} r={94} className="auth-bubble auth-bubble--c" />
  </svg>
);

/* ── Page frame: backdrop + brand lockup (left) + card slot (right) ───────── */

export const AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="auth-root">
    <AuthBackdrop />
    <main className="auth-layout">
      <section className="auth-brand" aria-label="Rathinam">
        <div className="auth-brand__lockup">
          <div className="auth-brand__top">
            <img src={logoMark} alt="" className="auth-brand__mark" />
            <span className="auth-brand__script">Celebrate life</span>
          </div>
          <img src={logoWord} alt="Rathinam" className="auth-brand__word" />
        </div>
        <p className="auth-brand__values">
          <span>Learn</span>
          <span className="auth-brand__dot" aria-hidden="true" />
          <span>Grow</span>
          <span className="auth-brand__dot" aria-hidden="true" />
          <span>Succeed</span>
        </p>
      </section>

      <section className="auth-panel">{children}</section>
    </main>
  </div>
);

/* ── Small logo at the top of the glass card ──────────────────────────────── */

export const AuthCardLogo: React.FC = () => (
  <div className="auth-card__logo">
    <div className="auth-card__logo-top">
      <img src={logoMark} alt="" className="auth-card__logo-mark" />
      <span className="auth-card__logo-script">Celebrate life</span>
    </div>
    <img src={logoWord} alt="Rathinam" className="auth-card__logo-word" />
  </div>
);

/* ── Monochrome social icons ──────────────────────────────────────────────── */

const GoogleIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
  </svg>
);

const MicrosoftIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">
    <rect x="2.5" y="2.5" width="9" height="9" rx="1.2" />
    <rect x="12.5" y="2.5" width="9" height="9" rx="1.2" />
    <rect x="2.5" y="12.5" width="9" height="9" rx="1.2" />
    <rect x="12.5" y="12.5" width="9" height="9" rx="1.2" />
  </svg>
);

const AppleIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
);

export const SocialButtons: React.FC = () => (
  <div className="auth-socials">
    <button type="button" className="auth-social" aria-label="Continue with Google"><GoogleIcon /></button>
    <button type="button" className="auth-social" aria-label="Continue with Microsoft"><MicrosoftIcon /></button>
    <button type="button" className="auth-social" aria-label="Continue with Apple"><AppleIcon /></button>
  </div>
);
