import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Lock, User, Bus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AuthCardLogo, AuthShell } from "../components/AuthShell";
import "./AuthPage.css";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cabNumber, setCabNumber] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Enter your username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(username.trim(), password.trim(), cabNumber.trim() || undefined);
      navigate("/dashboard");
    } catch (err: any) {
      const detail =
        err?.response?.data?.cab_number?.[0] ||
        err?.response?.data?.detail ||
        "Incorrect username or password.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-card">
        <AuthCardLogo />

        <header className="auth-card__head">
          <p className="auth-card__sub">Sign in to continue</p>
        </header>

        {params.get("registered") === "1" && (
          <p className="auth-notice" role="status">Account created. Sign in to continue.</p>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <User size={19} strokeWidth={1.6} className="auth-field__icon" aria-hidden="true" />
            <input
              id="login-user"
              type="text"
              autoComplete="username"
              aria-label="Username or Email"
              placeholder="Username or Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <Lock size={19} strokeWidth={1.6} className="auth-field__icon" aria-hidden="true" />
            <input
              id="login-pass"
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              aria-label="Password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="auth-field__toggle"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? "Hide password" : "Show password"}
              aria-pressed={showPass}
            >
              {showPass ? <EyeOff size={20} strokeWidth={1.6} /> : <Eye size={20} strokeWidth={1.6} />}
            </button>
          </div>

          <div className="auth-field">
            <Bus size={19} strokeWidth={1.6} className="auth-field__icon" aria-hidden="true" />
            <input
              id="login-cab"
              type="text"
              autoComplete="off"
              aria-label="Cab Number (drivers only)"
              placeholder="Cab Number (drivers only)"
              value={cabNumber}
              onChange={(e) => setCabNumber(e.target.value)}
            />
          </div>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="auth-btn" disabled={loading}>
            <span>{loading ? "Signing in…" : "Login"}</span>
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default LoginPage;
