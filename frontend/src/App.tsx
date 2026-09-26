import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { TopNav } from "./components/TopNav";
import { Sidebar } from "./components/Sidebar";
import { MobileNav } from "./components/MobileNav";
import { useIsMobile } from "./hooks/useMediaQuery";
import Dashboard from "./pages/Dashboard";
import ParkingPage from "./pages/ParkingPage";
import BusesPage from "./pages/BusesPage";
import StudentsPage from "./pages/StudentsPage";
import PeoplePage from "./pages/PeoplePage";
import BusFinder from "./pages/BusFinder";
import OptimizePage from "./pages/OptimizePage";
import SensorsPage from "./pages/SensorsPage";
import ReportsPage from "./pages/ReportsPage";
import FeedbackPage from "./pages/FeedbackPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import SignUpPage from "./pages/SignUpPage";
import DriverAttendancePage from "./pages/DriverAttendancePage";
import DriverStudentsPage from "./pages/DriverStudentsPage";
import InchargeAttendancePage from "./pages/InchargeAttendancePage";
import InchargeStudentsPage from "./pages/InchargeStudentsPage";
import MyBusPage from "./pages/MyBusPage";
import MyAttendancePage from "./pages/MyAttendancePage";
import FaceEnrollmentPage from "./pages/FaceEnrollmentPage";
import ScanAttendancePage from "./pages/ScanAttendancePage";
import AttendanceAnalyticsPage from "./pages/AttendanceAnalyticsPage";
import AttendanceFlagsPage from "./pages/AttendanceFlagsPage";
import { IdentityPromptModal } from "./components/IdentityPromptModal";

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  // On the Find page the search text lives in the URL, so a refresh or shared link
  // starts with the navbar box already filled in.
  const [searchQuery, setSearchQuery] = useState(() =>
    pathname === "/dashboard/find" ? params.get("q") ?? "" : ""
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const { roleLabel } = useAuth();
  const { role, identity } = useAuth();
  const isMobile = useIsMobile();

  const onFindPage = pathname === "/dashboard/find";
  const urlQuery = params.get("q") ?? "";

  // The Find page keeps the search text in the URL (?q=B04). When that changes from
  // somewhere else (e.g. a quick-search chip), reflect it in the navbar search box.
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  if (lastUrlQuery !== urlQuery) {
    setLastUrlQuery(urlQuery);
    if (onFindPage && urlQuery !== searchQuery.trim()) setSearchQuery(urlQuery);
  }

  // Leaving the Find page (sidebar, back button...) clears the search box, so old text
  // isn't left sitting there looking like an active search.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (lastPath === "/dashboard/find") setSearchQuery("");
  }

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    const trimmed = q.trim();
    if (onFindPage) {
      // Already on the Find page: update the URL in place (don't fill the back button)
      navigate(trimmed ? `/dashboard/find?q=${encodeURIComponent(trimmed)}` : "/dashboard/find", { replace: true });
    } else if (trimmed.length > 1) {
      navigate(`/dashboard/find?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <div className="app-shell">
      {role === "INCHARGE" && !identity && <IdentityPromptModal />}
      {/* Background Liquid Glass Fluid Waveforms — Strictly fixed, never in-flow */}
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
          d="M-100 150 C 300 0, 700 350, 1100 80 C 1300 -50, 1500 120, 1600 200"
          stroke="rgb(var(--ov) / 0.09)"
          strokeWidth="2.5"
          filter="blur(1px)"
        />
        <path
          d="M-50 250 C 400 100, 800 450, 1200 180 C 1400 50, 1550 220, 1650 300"
          stroke="rgb(var(--ov) / 0.08)"
          strokeWidth="1.5"
        />
        <path
          d="M-80 50 C 250 200, 650 50, 1050 220 C 1250 320, 1450 150, 1550 220"
          stroke="rgb(var(--ov) / 0.05)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      </svg>

      {/* Top Navbar sits flush at the very top */}
      <TopNav
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        adminName="Admin"
        roleTitle={roleLabel ?? "Administrator"}
      />

      {/* Body: sidebar + content on desktop, content + bottom tab bar on phones/tablets */}
      <div className="app-body">
        {!isMobile && <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />}
        <main className="app-main">{children}</main>
      </div>

      {isMobile && <MobileNav />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Standalone Landing & Login routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          {/* App Dashboard and Inner Pages with Sidebar & TopNav */}
          <Route
            path="/dashboard/*"
            element={
              <MainLayout>
                <Routes>
                  <Route path="" element={<Dashboard />} />
                  <Route path="parking" element={<ParkingPage />} />
                  <Route path="buses" element={<BusesPage />} />
                  <Route path="students" element={<StudentsPage />} />
                  <Route path="people" element={<PeoplePage />} />
                  <Route path="optimize" element={<OptimizePage />} />
                  <Route path="sensors" element={<SensorsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="feedback" element={<FeedbackPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="find" element={<BusFinder />} />
                  <Route path="attendance" element={<DriverAttendancePage />} />
                  <Route path="my-students" element={<DriverStudentsPage />} />
                  <Route path="incharge-attendance" element={<InchargeAttendancePage />} />
                  <Route path="incharge-students" element={<InchargeStudentsPage />} />
                  <Route path="my-bus" element={<MyBusPage />} />
                  <Route path="my-attendance" element={<MyAttendancePage />} />
                  <Route path="face-enrollment" element={<FaceEnrollmentPage />} />
                  <Route path="scan-attendance" element={<ScanAttendancePage />} />
                  <Route path="attendance-analytics" element={<AttendanceAnalyticsPage />} />
                  <Route path="attendance-flags" element={<AttendanceFlagsPage />} />
                </Routes>
              </MainLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
};

export default App;


