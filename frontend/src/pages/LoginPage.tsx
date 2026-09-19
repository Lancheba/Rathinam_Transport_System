import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, Bus, MapPin, Clock, Shield } from "lucide-react";
import rathinamLogo from "../assets/rathinam_logo.jpg";
import loginBg from "../assets/login_bg.jpg";

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
      setError("Please enter both username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(username.trim(), password.trim());
      navigate("/dashboard");
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError("");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "15px 16px 15px 48px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.13)",
    color: "#ffffff",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    transition: "all 0.2s",
    fontFamily: "inherit",
  };

  const iconStyle: React.CSSProperties = {
    position: "absolute",
    left: 16,
    top: "50%",
    transform: "translateY(-50%)",
    color: "rgba(255,255,255,0.4)",
    pointerEvents: "none",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* ── Full-screen background image ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `url(${loginBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: 0,
          filter: "brightness(0.35) grayscale(0.3)",
        }}
      />

      {/* ── Dark overlay gradient ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.85) 100%)",
          zIndex: 1,
        }}
      />

      {/* ── Liquid glass shimmer blobs (corners) ── */}
      <div
        style={{
          position: "fixed",
          top: -80,
          left: -80,
          width: 260,
          height: 260,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: -80,
          right: -80,
          width: 260,
          height: 260,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)",
          filter: "blur(40px)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      {/* ── Content wrapper ── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* ── TOP: corner labels ── */}
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 36,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.1em" }}>RATHINAM</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.1em" }}>CAMPUS</div>
          <div style={{ width: 24, height: 1, background: "rgba(255,255,255,0.3)", margin: "5px 0" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.1em" }}>PARKING</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.1em" }}>SYSTEM</div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 28,
            right: 36,
            textAlign: "right",
            fontStyle: "italic",
            fontFamily: "Georgia, 'Times New Roman', serif",
            lineHeight: 1.4,
          }}
        >
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontWeight: 400 }}>Park Smart</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontWeight: 400 }}>Move Forward</div>
        </div>

        {/* ── LOGO + NAME (top center) ── */}
        <div style={{ textAlign: "center", paddingTop: 48, marginBottom: 8 }}>
          <img
            src={rathinamLogo}
            alt="Rathinam"
            style={{
              width: 110,
              height: 110,
              objectFit: "contain",
              filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.6))",
            }}
          />
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              marginTop: 6,
            }}
          >
            Smart Parking System
          </div>
        </div>

        {/* ── GLASS LOGIN CARD (center) ── */}
        <div
          style={{
            width: "100%",
            maxWidth: 500,
            margin: "20px auto 0 auto",
            padding: "0 20px",
          }}
        >
          <div
            style={{
              background: "rgba(18, 20, 28, 0.82)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 28,
              padding: "40px 36px 32px",
              boxShadow:
                "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 1px 0 rgba(255,255,255,0.15) inset",
            }}
          >
            {/* Card header */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <h2
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#ffffff",
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                Welcome Back
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
                Login to your account
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Username */}
              <div style={{ position: "relative" }}>
                <Mail size={17} style={iconStyle} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Email / Register Number"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.3)";
                    e.target.style.background = "rgba(255,255,255,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.13)";
                    e.target.style.background = "rgba(255,255,255,0.07)";
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ position: "relative" }}>
                <Lock size={17} style={iconStyle} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  style={{ ...inputStyle, paddingRight: 48 }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.3)";
                    e.target.style.background = "rgba(255,255,255,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.13)";
                    e.target.style.background = "rgba(255,255,255,0.07)";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showPassword ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
              </div>

              {/* Remember + Forgot */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <div
                    onClick={() => setRememberMe(!rememberMe)}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: "1.5px solid rgba(255,255,255,0.35)",
                      background: rememberMe ? "rgba(255,255,255,0.2)" : "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {rememberMe && <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>Remember me</span>
                </label>
                <span
                  style={{ fontSize: 13, color: "#ffffff", fontWeight: 700, cursor: "pointer" }}
                >
                  Forgot password?
                </span>
              </div>

              {/* Error */}
              {error && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "rgba(244,63,94,0.12)",
                    border: "1px solid rgba(244,63,94,0.25)",
                    color: "#fca5a5",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Login button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "15px",
                  marginTop: 6,
                  borderRadius: 9999,
                  background: "linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)",
                  color: "#111827",
                  fontWeight: 800,
                  fontSize: 16,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 24px rgba(255,255,255,0.18), inset 0 1px 0 rgba(255,255,255,0.6)",
                  transition: "transform 0.15s ease, opacity 0.15s",
                  opacity: loading ? 0.75 : 1,
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <span>{loading ? "Logging in..." : "Login"}</span>
                <ArrowRight size={17} />
              </button>
            </form>

            {/* Or continue with */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                margin: "22px 0 18px",
              }}
            >
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>
                or continue with
              </span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>

            {/* Social buttons */}
            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              {[
                { label: "G", title: "Google" },
                { label: "⊞", title: "Microsoft" },
                { label: "👤", title: "SSO" },
              ].map((s) => (
                <button
                  key={s.title}
                  type="button"
                  title={s.title}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#ffffff",
                    fontSize: 17,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                    backdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.16)";
                    e.currentTarget.style.transform = "scale(1.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Sign up */}
            <div style={{ textAlign: "center", marginTop: 22, fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
              Don't have an account?{" "}
              <Link
                to="/dashboard/find"
                style={{ color: "#ffffff", fontWeight: 800, textDecoration: "none" }}
              >
                Sign Up →
              </Link>
            </div>

            {/* Quick Demo */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10, color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>
                <Sparkles size={10} style={{ color: "#f59e0b" }} />
                QUICK DEMO CREDENTIALS
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Admin Demo", user: "admin", pass: "admin123", sub: "admin / admin123" },
                  { label: "Staff Demo", user: "staff", pass: "staff123", sub: "staff / staff123" },
                ].map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => fillCredentials(d.user, d.pass)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#e2e8f0",
                      fontSize: 11,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  >
                    <div style={{ fontWeight: 700, color: "#fff", marginBottom: 2 }}>{d.label}</div>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>{d.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM FEATURE CHIPS ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 40,
            padding: "28px 24px 32px",
            marginTop: "auto",
            width: "100%",
          }}
        >
          {[
            { icon: Bus,    label: "Real-Time\nBus Availability" },
            { icon: MapPin, label: "Easy\nNavigation" },
            { icon: Clock,  label: "Save Time\n& Effort" },
            { icon: Shield, label: "Safe & Organized\nParking" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                <Icon size={16} />
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: 600,
                  whiteSpace: "pre-line",
                  lineHeight: 1.4,
                  textAlign: "center",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
