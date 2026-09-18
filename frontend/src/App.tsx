import React from "react";
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import ParkingPage from "./pages/ParkingPage";
import BusesPage from "./pages/BusesPage";
import BusFinder from "./pages/BusFinder";
import OptimizePage from "./pages/OptimizePage";
import SensorsPage from "./pages/SensorsPage";
import LoginPage from "./pages/LoginPage";

const navItems = [
  { to: "/", label: "📊 Dashboard" },
  { to: "/parking", label: "🅿️ Parking Map" },
  { to: "/buses", label: "🚌 Buses" },
  { to: "/optimize", label: "🤖 Optimise" },
  { to: "/sensors", label: "📡 Sensors" },
  { to: "/find", label: "🔍 Find Bus" },
];

const linkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  display: "block", padding: "10px 16px", borderRadius: 8, textDecoration: "none",
  color: isActive ? "#f9fafb" : "#9ca3af",
  background: isActive ? "#1d4ed8" : "transparent",
  fontWeight: isActive ? "bold" : "normal",
  marginBottom: 4, fontSize: 14,
  transition: "background 0.15s",
});

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, username, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#030712", color: "#f9fafb" }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: "#0f172a", padding: 20,
        borderRight: "1px solid #1e293b", flexShrink: 0,
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🚍</div>
          <div style={{ fontWeight: "bold", fontSize: 14, color: "#f9fafb" }}>Smart Bus Parking</div>
          <div style={{ fontSize: 11, color: "#475569" }}>Rathinam College</div>
        </div>

        <nav style={{ flex: 1 }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} style={linkStyle}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ borderTop: "1px solid #1e293b", paddingTop: 14 }}>
          {isLoggedIn ? (
            <>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>👤 {username}</div>
              <button onClick={() => { logout(); navigate("/login"); }} style={{
                width: "100%", background: "#1e293b", color: "#94a3b8",
                border: "1px solid #334155", borderRadius: 6, padding: "8px", cursor: "pointer", fontSize: 13,
              }}>Logout</button>
            </>
          ) : (
            <button onClick={() => navigate("/login")} style={{
              width: "100%", background: "#1d4ed8", color: "#fff",
              border: "none", borderRadius: 6, padding: "8px", cursor: "pointer", fontSize: 13,
            }}>Login</button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: 32, overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
};

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="*" element={
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/parking" element={<ParkingPage />} />
          <Route path="/buses" element={<BusesPage />} />
          <Route path="/optimize" element={<OptimizePage />} />
          <Route path="/sensors" element={<SensorsPage />} />
          <Route path="/find" element={<BusFinder />} />
        </Routes>
      </Layout>
    } />
  </Routes>
);

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
