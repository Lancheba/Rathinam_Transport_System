import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import api from "../api/client";
import { AuthCardLogo, AuthShell } from "../components/AuthShell";
import "./AuthPage.css";

/** 0 = empty, 1 = weak, 2 = medium, 3 = strong */
const strengthOf = (p: string): 0 | 1 | 2 | 3 => {
  if (!p) return 0;
  if (p.length < 6) return 1;
  if (p.length >= 10 && /[A-Z]/.test(p) && /\d/.test(p)) return 3;
  return 2;
};
const STRENGTH_LABEL = ["", "Weak", "Medium", "Strong"] as const;

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = strengthOf(password);

  const nextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError("Enter your full name and email.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Enter a username and password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/register/", {
        username, password, email, full_name: fullName, phone,
      });
      navigate("/login?registered=1");
    } catch (err) {
      const data = axios.isAxiosError(err) ? err.response?.data : undefined;
      if (data && typeof data === "object") {
        const first = Object.values(data)[0];
        setError(Array.isArray(first) ? String(first[0]) : String(first));
      } else {
        setError("Registration failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-card">
        <AuthCardLogo />

        <div className="auth-progress" role="img" aria-label={`Step ${step} of 2`}>
          <span className="is-on" />
          <span className={step === 2 ? "is-on" : ""} />
        </div>

        <header className="auth-card__head">
          <h1 className="auth-card__title">{step === 1 ? "Create Account" : "Set Up Login"}</h1>
          <p className="auth-card__sub">
            {step === 1 ? "Tell us about yourself" : "Choose how you'll sign in"}
          </p>
        </header>

        {step === 1 && (
          <form className="auth-form" onSubmit={nextStep} noValidate>
            <div className="auth-field">
              <User size={20} strokeWidth={1.6} className="auth-field__icon" aria-hidden="true" />
              <input
                type="text" autoComplete="name" aria-label="Full name" placeholder="Full name"
                value={fullName} onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <Mail size={20} strokeWidth={1.6} className="auth-field__icon" aria-hidden="true" />
              <input
                type="email" autoComplete="email" aria-label="Email address" placeholder="Email address"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <Phone size={20} strokeWidth={1.6} className="auth-field__icon" aria-hidden="true" />
              <input
                type="tel" autoComplete="tel" aria-label="Phone number (optional)" placeholder="Phone (optional)"
                value={phone} onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button type="submit" className="auth-btn">
              <span>Continue</span>
              <ArrowRight size={20} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </form>
        )}

        {step === 2 && (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <User size={20} strokeWidth={1.6} className="auth-field__icon" aria-hidden="true" />
              <input
                type="text" autoComplete="username" aria-label="Username" placeholder="Username"
                value={username} onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <Lock size={20} strokeWidth={1.6} className="auth-field__icon" aria-hidden="true" />
              <input
                type={showPass ? "text" : "password"} autoComplete="new-password"
                aria-label="Password" placeholder="Password (8+ characters)"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button" className="auth-field__toggle"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "Hide password" : "Show password"} aria-pressed={showPass}
              >
                {showPass ? <EyeOff size={20} strokeWidth={1.6} /> : <Eye size={20} strokeWidth={1.6} />}
              </button>
            </div>

            <div className={`auth-strength auth-strength--${strength}`} aria-live="polite">
              <span /><span /><span />
              <em>{STRENGTH_LABEL[strength]}</em>
            </div>

            <div className="auth-field">
              <Lock size={20} strokeWidth={1.6} className="auth-field__icon" aria-hidden="true" />
              <input
                type={showConf ? "text" : "password"} autoComplete="new-password"
                aria-label="Confirm password" placeholder="Confirm password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
              />
              <button
                type="button" className="auth-field__toggle"
                onClick={() => setShowConf((v) => !v)}
                aria-label={showConf ? "Hide password" : "Show password"} aria-pressed={showConf}
              >
                {showConf ? <EyeOff size={20} strokeWidth={1.6} /> : <Eye size={20} strokeWidth={1.6} />}
              </button>
            </div>

            {error && <p className="auth-error" role="alert">{error}</p>}

            <div className="auth-actions">
              <button
                type="button" className="auth-btn auth-btn--ghost"
                onClick={() => { setStep(1); setError(""); }}
              >
                Back
              </button>
              <button type="submit" className="auth-btn" disabled={loading}>
                <span>{loading ? "Creating…" : "Create Account"}</span>
                {!loading && <ArrowRight size={20} strokeWidth={1.8} aria-hidden="true" />}
              </button>
            </div>
          </form>
        )}

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default SignUpPage;
