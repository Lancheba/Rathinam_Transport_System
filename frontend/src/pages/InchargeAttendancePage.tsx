import React from "react";
import { QrCode } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import QRDisplaySection from "../components/QRDisplaySection";
import ManualMarkSection from "../components/ManualMarkSection";
import InchargeAnalyticsSection from "../components/InchargeAnalyticsSection";
import DelegateStandInSection from "../components/DelegateStandInSection";

const InchargeAttendancePage: React.FC = () => {
  const { isLoggedIn, role, isStandIn, standinBusNumber } = useAuth();
  const canTakeAttendance = isLoggedIn && (role === "INCHARGE" || isStandIn);

  if (!canTakeAttendance) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "60px 20px", textAlign: "center" }}>
        <QrCode size={32} style={{ color: "var(--accent-amber)" }} />
        <h2 style={{ color: "var(--text-strong)", margin: 0 }}>Take attendance</h2>
        <p style={{ color: "var(--text-muted)", maxWidth: 420, fontSize: 14, margin: 0 }}>
          This page is for signed-in Cab In-Charges to run QR attendance for their bus.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: "var(--accent-amber)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <QrCode size={20} strokeWidth={1.9} /> Take attendance
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 18px" }}>
        Start a session and students scan the QR, then confirm with their face.
      </p>
      {isStandIn && role !== "INCHARGE" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 18,
          borderRadius: 12, background: "rgb(var(--accent-amber-rgb, 245 158 11) / 0.12)",
          border: "1px solid rgb(var(--accent-amber-rgb, 245 158 11) / 0.3)",
          color: "var(--accent-amber)", fontSize: 13, fontWeight: 500,
        }}>
          You're standing in for Bus {standinBusNumber}'s in-charge today.
        </div>
      )}
      <QRDisplaySection />
      <ManualMarkSection />
      {role === "INCHARGE" && <DelegateStandInSection />}
      <InchargeAnalyticsSection />
    </div>
  );
};

export default InchargeAttendancePage;
