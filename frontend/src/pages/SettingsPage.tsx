import React from "react";
import { Sliders, Wifi } from "lucide-react";

export const SettingsPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#ffffff" }}>⚙️ System Settings</h2>
        <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
          Ground dimensions, sensor configurations, and role permissions.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="liquid-glass-card" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Sliders size={18} style={{ color: "#38bdf8" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>Ground Dimensions</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "#94a3b8" }}>Ground Length (meters)</label>
              <input type="text" defaultValue="60.00" disabled style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", marginTop: 4 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#94a3b8" }}>Ground Width (meters)</label>
              <input type="text" defaultValue="35.00" disabled style={{ width: "100%", padding: "8px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", marginTop: 4 }} />
            </div>
          </div>
        </div>

        <div className="liquid-glass-card" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Wifi size={18} style={{ color: "#10b981" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>ESP32 Gateway &amp; IoT</span>
          </div>
          <p style={{ fontSize: 13, color: "#94a3b8" }}>
            RFID readers listen on <code>POST /api/sensors/rfid/</code> and ultrasonic arrays on <code>POST /api/sensors/occupancy/</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;
