import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AuthCardLogo, AuthShell, SocialButtons } from "../components/AuthShell";
import "./AuthPage.css";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
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
      await login(username.trim(), password.trim());
      navigate("/dashboard");
    } catch {
      setError("Incorrect username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-card">
        <AuthCardLogo />

        <header className="auth-card__head">
          <h1 className="auth-card__title">Welcome Back</h1>
          <p className="auth-card__sub">Sign in to your account</p>
        </header>

        {params.get("registered") === "1" && (
          <p className="auth-notice" role="status">Account created. Sign in to continue.</p>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <User size={20} strokeWidth={1.6} className="auth-field__icon" aria-hidden="true" />
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
            <Lock size={20} strokeWidth={1.6} className="auth-field__icon" aria-hidden="true" />
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

          <div className="auth-row">
            <label className="auth-check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span className="auth-check__box" aria-hidden="true" />
              <span>Remember me</span>
            </label>
            <button type="button" className="auth-link">Forgot password?</button>
          </div>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="auth-btn" disabled={loading}>
            <span>{loading ? "Signing in…" : "Login"}</span>
            {!loading && <ArrowRight size={20} strokeWidth={1.8} aria-hidden="true" />}
          </button>
        </form>

        <div className="auth-divider"><span>Or continue with</span></div>

        <SocialButtons />

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default LoginPage;
