import React from "react";
import { QrCode } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import QRDisplaySection from "../components/QRDisplaySection";

const InchargeAttendancePage: React.FC = () => {
  const { isLoggedIn, role } = useAuth();

  if (!isLoggedIn || role !== "INCHARGE") {
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
      <QRDisplaySection />
    </div>
  );
};

export default InchargeAttendancePage;
