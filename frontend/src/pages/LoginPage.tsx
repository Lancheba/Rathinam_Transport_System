import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Users, Bus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import logoMark from "../assets/logo_mark.png";
import "./AuthPage.css";

const MicrosoftIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20">
    <rect x="2.5" y="2.5" width="9" height="9" rx="1.5" fill="currentColor" />
    <rect x="12.5" y="2.5" width="9" height="9" rx="1.5" fill="currentColor" />
    <rect x="2.5" y="12.5" width="9" height="9" rx="1.5" fill="currentColor" />
    <rect x="12.5" y="12.5" width="9" height="9" rx="1.5" fill="currentColor" />
  </svg>
);

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername]       = useState("");
  const [password, setPassword]       = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [remember, setRemember]       = useState(false);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true); setError("");
    try {
      await login(username.trim(), password.trim());
      navigate("/dashboard");
    } catch {
      setError("Incorrect username or password.");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-root">
      {/* Animated background */}
      <div className="auth-bg">
        <div className="auth-bg__orb auth-bg__orb--1" />
        <div className="auth-bg__orb auth-bg__orb--2" />
        <div className="auth-bg__orb auth-bg__orb--3" />
        <div className="auth-bg__grid" />
      </div>

      <div className="auth-wrap">
        {/* Left panel */}
        <div className="auth-left">
          <div className="auth-left__inner">
            <div className="auth-brand">
              <img src={logoMark} alt="Rathinam" className="auth-brand__logo" />
              <div>
                <h2 className="auth-brand__name">RATHINAM</h2>
                <p className="auth-brand__sub">Smart Parking System</p>
              </div>
            </div>
            <h1 className="auth-left__title">
              Park Smarter,<br />
              <span>Move Faster.</span>
            </h1>
            <p className="auth-left__desc">
              Real-time bus parking management for Rathinam Campus. Know exactly where every bus is, every moment.
            </p>
            <div className="auth-features">
              {[
                { icon: "🚌", label: "Real-time Bus Tracking" },
                { icon: "🅿️", label: "Smart Slot Allocation" },
                { icon: "📡", label: "IoT Sensor Integration" },
                { icon: "🔒", label: "Role-based Access" },
              ].map(f => (
                <div key={f.label} className="auth-feature">
                  <span className="auth-feature__icon">{f.icon}</span>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
            <div className="auth-left__badge">
              <Bus size={14} />
              <span>Rathinam College of Arts & Science</span>
            </div>
          </div>
        </div>

        {/* Right panel – form */}
        <div className="auth-right">
          <div className="auth-card">
            <div className="auth-card__header">
              <h2 className="auth-card__title">Welcome Back</h2>
              <p className="auth-card__sub">Login to your account</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="lp-user">Email / Register Number</label>
                <div className="auth-field__wrap">
                  <Mail size={16} className="auth-field__icon" />
                  <input
                    id="lp-user" type="text"
                    autoComplete="username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter email or register number"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="lp-pass">Password</label>
                <div className="auth-field__wrap">
                  <Lock size={16} className="auth-field__icon" />
                  <input
                    id="lp-pass"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                  <button type="button" className="auth-field__eye"
                    onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? "Hide" : "Show"}>
                    {showPass ? <Eye size={16}/> : <EyeOff size={16}/>}
                  </button>
                </div>
              </div>

              <div className="auth-row">
                <label className="auth-check">
                  <input type="checkbox" checked={remember}
                    onChange={e => setRemember(e.target.checked)} />
                  <span className="auth-check__box" />
                  <span>Remember me</span>
                </label>
                <button type="button" className="auth-link--yellow">Forgot password?</button>
              </div>

              {error && <p className="auth-error" role="alert">{error}</p>}

              <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
                {loading ? "Logging in…" : "Login"}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <div className="auth-divider"><span>or continue with</span></div>

            <div className="auth-socials">
              <button type="button" className="auth-social" aria-label="Google">
                <span className="auth-social__g">G</span>
              </button>
              <button type="button" className="auth-social" aria-label="Microsoft">
                <MicrosoftIcon />
              </button>
              <button type="button" className="auth-social" aria-label="Campus SSO">
                <Users size={18} />
              </button>
            </div>

            <p className="auth-switch">
              Don't have an account?{" "}
              <Link to="/signup" className="auth-link--yellow">
                Sign Up <ArrowRight size={13} />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
