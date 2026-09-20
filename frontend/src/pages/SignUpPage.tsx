import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Bus, Phone } from "lucide-react";
import api from "../api/client";
import logoMark from "../assets/logo_mark.png";
import "./AuthPage.css";

type Role = "STUDENT" | "STAFF";

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep]           = useState<1 | 2>(1);
  const [fullName, setFullName]   = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");
  const [role, setRole]           = useState<Role>("STUDENT");
  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  const nextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) { setError("Please fill in all required fields."); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError("Enter a valid email address."); return; }
    setError(""); setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true); setError("");
    try {
      await api.post("/auth/register/", { username, password, email, full_name: fullName, phone, role });
      navigate("/login?registered=1");
    } catch (err: any) {
      const data = err?.response?.data;
      if (data && typeof data === "object") {
        const first = Object.values(data)[0];
        setError(Array.isArray(first) ? String(first[0]) : String(first));
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-root">
      <div className="auth-bg">
        <div className="auth-bg__orb auth-bg__orb--1" />
        <div className="auth-bg__orb auth-bg__orb--2" />
        <div className="auth-bg__orb auth-bg__orb--3" />
        <div className="auth-bg__grid" />
      </div>

      <div className="auth-wrap auth-wrap--rev">
        {/* Right panel — form */}
        <div className="auth-right">
          <div className="auth-card">
            {/* Step indicator */}
            <div className="auth-steps">
              <div className={`auth-step ${step >= 1 ? "auth-step--active" : ""}`}>
                <div className="auth-step__dot">1</div>
                <span>Personal Info</span>
              </div>
              <div className="auth-step__line" />
              <div className={`auth-step ${step >= 2 ? "auth-step--active" : ""}`}>
                <div className="auth-step__dot">2</div>
                <span>Account Setup</span>
              </div>
            </div>

            <div className="auth-card__header">
              <h2 className="auth-card__title">
                {step === 1 ? "Create Account" : "Set Up Login"}
              </h2>
              <p className="auth-card__sub">
                {step === 1 ? "Step 1 of 2 — Personal details" : "Step 2 of 2 — Choose credentials"}
              </p>
            </div>

            {/* Step 1 */}
            {step === 1 && (
              <form className="auth-form" onSubmit={nextStep} noValidate>
                <div className="auth-field">
                  <label htmlFor="su-name">Full Name *</label>
                  <div className="auth-field__wrap">
                    <User size={16} className="auth-field__icon" />
                    <input id="su-name" type="text" value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Your full name" />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="su-email">Email Address *</label>
                  <div className="auth-field__wrap">
                    <Mail size={16} className="auth-field__icon" />
                    <input id="su-email" type="email" value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@rathinam.in" />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="su-phone">Phone (optional)</label>
                  <div className="auth-field__wrap">
                    <Phone size={16} className="auth-field__icon" />
                    <input id="su-phone" type="tel" value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 98765 43210" />
                  </div>
                </div>

                <div className="auth-field">
                  <label>I am a</label>
                  <div className="auth-role-group">
                    {(["STUDENT", "STAFF"] as Role[]).map(r => (
                      <button key={r} type="button"
                        className={`auth-role-btn ${role === r ? "auth-role-btn--active" : ""}`}
                        onClick={() => setRole(r)}>
                        <span>{r === "STUDENT" ? "🎓" : "🚌"}</span>
                        <span>{r === "STUDENT" ? "Student" : "Transport Staff"}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="auth-error" role="alert">{error}</p>}

                <button type="submit" className="auth-btn auth-btn--primary">
                  Continue <ArrowRight size={16} />
                </button>
              </form>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <div className="auth-field">
                  <label htmlFor="su-user">Username *</label>
                  <div className="auth-field__wrap">
                    <User size={16} className="auth-field__icon" />
                    <input id="su-user" type="text" autoComplete="username"
                      value={username} onChange={e => setUsername(e.target.value)}
                      placeholder="Choose a username" />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="su-pass">Password *</label>
                  <div className="auth-field__wrap">
                    <Lock size={16} className="auth-field__icon" />
                    <input id="su-pass"
                      type={showPass ? "text" : "password"}
                      autoComplete="new-password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters" />
                    <button type="button" className="auth-field__eye"
                      onClick={() => setShowPass(v => !v)}>
                      {showPass ? <Eye size={16}/> : <EyeOff size={16}/>}
                    </button>
                  </div>
                  {/* strength bar */}
                  <div className="auth-strength">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`auth-strength__bar ${
                        password.length >= i * 2 ? (
                          password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? "auth-strength__bar--strong" :
                          password.length >= 6 ? "auth-strength__bar--medium" : "auth-strength__bar--weak"
                        ) : ""
                      }`} />
                    ))}
                    <span>{
                      password.length === 0 ? "" :
                      password.length < 6 ? "Weak" :
                      password.length < 10 ? "Medium" : "Strong"
                    }</span>
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="su-conf">Confirm Password *</label>
                  <div className="auth-field__wrap">
                    <Lock size={16} className="auth-field__icon" />
                    <input id="su-conf"
                      type={showConf ? "text" : "password"}
                      autoComplete="new-password"
                      value={confirm} onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat your password" />
                    <button type="button" className="auth-field__eye"
                      onClick={() => setShowConf(v => !v)}>
                      {showConf ? <Eye size={16}/> : <EyeOff size={16}/>}
                    </button>
                  </div>
                </div>

                {error && <p className="auth-error" role="alert">{error}</p>}

                <div className="auth-form__actions">
                  <button type="button" className="auth-btn auth-btn--ghost"
                    onClick={() => { setStep(1); setError(""); }}>
                    ← Back
                  </button>
                  <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
                    {loading ? "Creating…" : "Create Account"}
                    {!loading && <ArrowRight size={16} />}
                  </button>
                </div>
              </form>
            )}

            <p className="auth-switch">
              Already have an account?{" "}
              <Link to="/login" className="auth-link--yellow">
                Login <ArrowRight size={13} />
              </Link>
            </p>
          </div>
        </div>

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
              Join the<br />
              <span>Smart Campus.</span>
            </h1>
            <p className="auth-left__desc">
              Create your account and get instant access to real-time bus parking information across Rathinam Campus.
            </p>
            <div className="auth-features">
              {[
                { icon: "⚡", label: "Instant Access" },
                { icon: "📍", label: "Live Slot Status" },
                { icon: "🔔", label: "Smart Alerts" },
                { icon: "📊", label: "Parking Analytics" },
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
      </div>
    </div>
  );
};

export default SignUpPage;
