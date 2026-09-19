import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Bus, Lock, User, ArrowRight, Sparkles, Eye, EyeOff } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [role, setRole] = useState<"ADMIN" | "STAFF" | "STUDENT">("ADMIN");
  const [showPassword, setShowPassword] = useState(false);
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
      setError("Invalid credentials. Please verify your username and password.");
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (u: string, p: string, r: "ADMIN" | "STAFF") => {
    setUsername(u);
    setPassword(p);
    setRole(r);
    setError("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: "24px 16px",
        overflow: "hidden",
      }}
    >
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
          d="M-100 200 C 300 50, 700 400, 1100 120 C 1300 -20, 1500 150, 1600 240"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="2.5"
        />
        <path
          d="M-50 350 C 400 150, 800 500, 1200 220 C 1400 80, 1550 260, 1650 340"
          stroke="rgba(56, 189, 248, 0.08)"
          strokeWidth="1.5"
        />
      </svg>

      {/* Floating Glass Container */}
      <div
        className="liquid-glass-card"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "36px 32px",
          borderRadius: 24,
          background: "rgba(14, 18, 28, 0.78)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Back Link */}
        <div style={{ marginBottom: 20 }}>
          <Link
            to="/landing"
            style={{
              fontSize: 12,
              color: "#94a3b8",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
          >
            <span>&larr;</span>
            <span>Back to Campus Home</span>
          </Link>
        </div>

        {/* Logo & Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.05) 100%)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              margin: "0 auto 14px auto",
            }}
          >
            <Bus size={28} strokeWidth={2.2} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
            Sign In to Portal
          </h2>
          <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
            Rathinam Smart Bus Parking &amp; Retrieval System
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div
          style={{
            display: "flex",
            background: "rgba(255, 255, 255, 0.05)",
            borderRadius: 12,
            padding: 4,
            marginBottom: 24,
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <button
            type="button"
            onClick={() => setRole("ADMIN")}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 9,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: role === "ADMIN" ? "rgba(255, 255, 255, 0.16)" : "transparent",
              color: role === "ADMIN" ? "#ffffff" : "#94a3b8",
              boxShadow: role === "ADMIN" ? "0 2px 8px rgba(0,0,0,0.4)" : "none",
              transition: "all 0.2s",
            }}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => setRole("STAFF")}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 9,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: role === "STAFF" ? "rgba(255, 255, 255, 0.16)" : "transparent",
              color: role === "STAFF" ? "#ffffff" : "#94a3b8",
              boxShadow: role === "STAFF" ? "0 2px 8px rgba(0,0,0,0.4)" : "none",
              transition: "all 0.2s",
            }}
          >
            Staff
          </button>
          <button
            type="button"
            onClick={() => {
              setRole("STUDENT");
              navigate("/dashboard/find");
            }}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 9,
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: role === "STUDENT" ? "rgba(255, 255, 255, 0.16)" : "transparent",
              color: role === "STUDENT" ? "#ffffff" : "#94a3b8",
              boxShadow: role === "STUDENT" ? "0 2px 8px rgba(0,0,0,0.4)" : "none",
              transition: "all 0.2s",
            }}
          >
            Student
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Username */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
              Username
            </label>
            <div style={{ position: "relative" }}>
              <User
                size={16}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#ffffff",
                  fontSize: 14,
                  outline: "none",
                  transition: "all 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(56, 189, 248, 0.5)";
                  e.target.style.boxShadow = "0 0 14px rgba(56, 189, 248, 0.2)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255, 255, 255, 0.12)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>Password</label>
              <span style={{ fontSize: 11, color: "#38bdf8", cursor: "pointer" }}>Forgot password?</span>
            </div>
            <div style={{ position: "relative" }}>
              <Lock
                size={16}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "12px 42px 12px 42px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#ffffff",
                  fontSize: 14,
                  outline: "none",
                  transition: "all 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(56, 189, 248, 0.5)";
                  e.target.style.boxShadow = "0 0 14px rgba(56, 189, 248, 0.2)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255, 255, 255, 0.12)";
                  e.target.style.boxShadow = "none";
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
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(244, 63, 94, 0.15)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                color: "#fca5a5",
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              width: "100%",
              padding: "13px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)",
              color: "#090d16",
              fontWeight: 800,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(255, 255, 255, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span>{loading ? "Authenticating..." : "Sign In to Dashboard"}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, color: "#94a3b8", fontSize: 11, fontWeight: 600 }}>
            <Sparkles size={13} style={{ color: "#f59e0b" }} />
            <span>QUICK DEMO CREDENTIALS:</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              type="button"
              onClick={() => fillCredentials("admin", "admin123", "ADMIN")}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#e2e8f0",
                fontSize: 11,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontWeight: 700, color: "#fff" }}>Admin Demo</div>
              <div style={{ color: "#94a3b8", fontSize: 10 }}>admin / admin123</div>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("staff", "staff123", "STAFF")}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#e2e8f0",
                fontSize: 11,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ fontWeight: 700, color: "#fff" }}>Staff Demo</div>
              <div style={{ color: "#94a3b8", fontSize: 10 }}>staff / staff123</div>
            </button>
          </div>
        </div>

        {/* Student Bus Finder Link */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link
            to="/dashboard/find"
            style={{
              fontSize: 12,
              color: "#38bdf8",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Are you a student? Find your bus without signing in &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
