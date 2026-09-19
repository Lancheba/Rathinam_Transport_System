import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Users,
  Bus,
  MapPin,
  Clock,
  ShieldCheck,
  Check,
} from "lucide-react";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/caveat/500.css";
import { useAuth } from "../context/AuthContext";
import logoMark from "../assets/logo_mark.png";
import logoWord from "../assets/logo_word.png";
import scene from "../assets/login_scene.jpg";
import blobTl from "../assets/blob_tl.png";
import blobBl from "../assets/blob_bl.png";
import blobBr from "../assets/blob_br.png";
import "./LoginPage.css";

const FEATURES = [
  { icon: Bus, lines: ["Real-Time", "Bus Availability"] },
  { icon: MapPin, lines: ["Easy", "Navigation"] },
  { icon: Clock, lines: ["Save Time", "& Effort"] },
  { icon: ShieldCheck, lines: ["Safe & Organized", "Parking"] },
];

const MicrosoftIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="lp__social-icon">
    <rect x="2.5" y="2.5" width="9" height="9" rx="1.6" fill="currentColor" />
    <rect x="12.5" y="2.5" width="9" height="9" rx="1.6" fill="currentColor" />
    <rect x="2.5" y="12.5" width="9" height="9" rx="1.6" fill="currentColor" />
    <rect x="12.5" y="12.5" width="9" height="9" rx="1.6" fill="currentColor" />
  </svg>
);

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Enter your email or register number and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(username.trim(), password.trim());
      navigate("/dashboard");
    } catch {
      setError("Incorrect email, register number or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp">
      <div className="lp__scene" style={{ backgroundImage: `url(${scene})` }} aria-hidden="true" />
      <img className="lp__blob lp__blob--tl" src={blobTl} alt="" aria-hidden="true" />
      <img className="lp__blob lp__blob--bl" src={blobBl} alt="" aria-hidden="true" />
      <img className="lp__blob lp__blob--br" src={blobBr} alt="" aria-hidden="true" />

      <main className="lp__page">
        {/* Top-left campus label */}
        <div className="lp__corner" aria-hidden="true">
          <span>Rathinam</span>
          <span>Campus</span>
          <i />
          <span>Parking</span>
          <span>System</span>
          <i />
        </div>

        {/* Top-right script tagline */}
        <p className="lp__tagline" aria-hidden="true">
          <span>Park Smart</span>
          <span>Move Forward</span>
          <svg viewBox="0 0 120 14" preserveAspectRatio="none">
            <path d="M2 11 C 30 9, 80 6, 118 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </p>

        {/* Brand */}
        <header className="lp__brand">
          <img className="lp__logo-mark" src={logoMark} alt="" />
          <img className="lp__logo-word" src={logoWord} alt="Rathinam" />
          <p className="lp__product">Smart Parking System</p>
        </header>

        {/* Glass login card */}
        <section className="lp__card" aria-labelledby="lp-title">
          <h1 id="lp-title" className="lp__title">Welcome Back</h1>
          <p className="lp__subtitle">Login to your account</p>

          <form className="lp__form" onSubmit={handleLogin} noValidate>
            <label className="lp__field lp__field--user">
              <span className="lp__sr">Email or register number</span>
              <Mail className="lp__field-icon" strokeWidth={1.6} aria-hidden="true" />
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Email / Register Number"
              />
            </label>

            <label className="lp__field lp__field--pass">
              <span className="lp__sr">Password</span>
              <Lock className="lp__field-icon" strokeWidth={1.6} aria-hidden="true" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
              <button
                type="button"
                className="lp__eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <Eye strokeWidth={1.6} /> : <EyeOff strokeWidth={1.6} />}
              </button>
            </label>

            <div className="lp__row">
              <label className="lp__remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="lp__box" aria-hidden="true">
                  <Check strokeWidth={3} />
                </span>
                <span>Remember me</span>
              </label>
              <button type="button" className="lp__forgot">Forgot password?</button>
            </div>

            {error && (
              <p className="lp__error" role="alert">{error}</p>
            )}

            <button type="submit" className="lp__submit" disabled={loading}>
              <span>{loading ? "Logging in..." : "Login"}</span>
              <ArrowRight strokeWidth={2} aria-hidden="true" />
            </button>
          </form>

          <div className="lp__divider"><span>or continue with</span></div>

          <div className="lp__socials">
            <button type="button" className="lp__social" aria-label="Continue with Google">
              <span className="lp__g" aria-hidden="true">G</span>
            </button>
            <button type="button" className="lp__social" aria-label="Continue with Microsoft">
              <MicrosoftIcon />
            </button>
            <button type="button" className="lp__social" aria-label="Continue with campus single sign-on">
              <Users strokeWidth={1.8} className="lp__social-icon" aria-hidden="true" />
            </button>
          </div>

          <p className="lp__signup">
            Don't have an account?{" "}
            <Link to="/dashboard/find">
              Sign Up <ArrowRight strokeWidth={2} aria-hidden="true" />
            </Link>
          </p>
        </section>

        {/* Feature strip */}
        <ul className="lp__features">
          {FEATURES.map(({ icon: Icon, lines }) => (
            <li key={lines.join(" ")}>
              <Icon strokeWidth={1.4} aria-hidden="true" />
              <span>{lines[0]}<br />{lines[1]}</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
};

export default LoginPage;
