import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await login(username, password);
      navigate("/");
    } catch {
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px", borderRadius: 8,
    border: "1px solid #374151", background: "#111827",
    color: "#f9fafb", fontSize: 15, boxSizing: "border-box", marginBottom: 14,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#111827", borderRadius: 14, padding: 40, width: 360, border: "1px solid #1f2937" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40 }}>🚍</div>
          <h2 style={{ color: "#f9fafb", margin: "8px 0 4px" }}>Smart Bus Parking</h2>
          <p style={{ color: "#6b7280", fontSize: 13 }}>Rathinam College</p>
        </div>
        <form onSubmit={handleLogin}>
          <input value={username} onChange={e => setUsername(e.target.value)}
            placeholder="Username" style={inputStyle} autoFocus />
          <input value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" type="password" style={inputStyle} />
          {error && (
            <div style={{ color: "#fca5a5", fontSize: 13, marginBottom: 12 }}>❌ {error}</div>
          )}
          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "13px", background: "#3b82f6",
            color: "#fff", border: "none", borderRadius: 8,
            fontSize: 15, fontWeight: "bold", cursor: "pointer",
          }}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <div style={{ marginTop: 20, color: "#6b7280", fontSize: 12, textAlign: "center" }}>
          Demo: <strong style={{ color: "#9ca3af" }}>admin / admin123</strong> or <strong style={{ color: "#9ca3af" }}>staff / staff123</strong>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
