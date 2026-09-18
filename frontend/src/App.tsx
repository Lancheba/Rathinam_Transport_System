import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { TopNav } from "./components/TopNav";
import { Sidebar } from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import ParkingPage from "./pages/ParkingPage";
import BusesPage from "./pages/BusesPage";
import BusFinder from "./pages/BusFinder";
import OptimizePage from "./pages/OptimizePage";
import SensorsPage from "./pages/SensorsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.trim().length > 1) {
      navigate(`/find?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Background Liquid Glass Fluid Waveforms */}
      <div className="liquid-bg-waves" />
      <svg
        className="liquid-silk-svg"
        viewBox="0 0 1440 900"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M-100 150 C 300 0, 700 350, 1100 80 C 1300 -50, 1500 120, 1600 200"
          stroke="rgba(255, 255, 255, 0.09)"
          strokeWidth="2.5"
          filter="blur(1px)"
        />
        <path
          d="M-50 250 C 400 100, 800 450, 1200 180 C 1400 50, 1550 220, 1650 300"
          stroke="rgba(56, 189, 248, 0.08)"
          strokeWidth="1.5"
        />
        <path
          d="M-80 50 C 250 200, 650 50, 1050 220 C 1250 320, 1450 150, 1550 220"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      </svg>

      {/* Top Navbar */}
      <TopNav
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        adminName="Admin"
        roleTitle="Administrator"
      />

      {/* Body with Sidebar and Main Content */}
      <div style={{ display: "flex", flex: 1, position: "relative", zIndex: 1 }}>
        <Sidebar />
        <main style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/parking" element={<ParkingPage />} />
                  <Route path="/buses" element={<BusesPage />} />
                  <Route path="/optimize" element={<OptimizePage />} />
                  <Route path="/sensors" element={<SensorsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/find" element={<BusFinder />} />
                </Routes>
              </MainLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
