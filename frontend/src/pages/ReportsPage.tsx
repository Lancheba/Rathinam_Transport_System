import React from "react";
import { Download } from "lucide-react";

export const ReportsPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#ffffff" }}>📊 Parking Analytics &amp; Reports</h2>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
            Historical movement analysis, slot turnover, and blocked-bus trends.
          </p>
        </div>
        <button
          className="liquid-pill liquid-pill-active"
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", fontSize: 13, cursor: "pointer" }}
        >
          <Download size={15} />
          <span>Export CSV Report</span>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div className="liquid-glass-card" style={{ padding: "18px 20px" }}>
          <div style={{ color: "#94a3b8", fontSize: 12 }}>Avg. Parking Duration</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#ffffff", marginTop: 6 }}>4h 22m</div>
          <div style={{ color: "#10b981", fontSize: 11, marginTop: 4 }}>↑ 12% campus activity</div>
        </div>
        <div className="liquid-glass-card" style={{ padding: "18px 20px" }}>
          <div style={{ color: "#94a3b8", fontSize: 12 }}>Conflict Frequency</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#f43f5e", marginTop: 6 }}>1.2 / day</div>
          <div style={{ color: "#10b981", fontSize: 11, marginTop: 4 }}>↓ 75% after optimization</div>
        </div>
        <div className="liquid-glass-card" style={{ padding: "18px 20px" }}>
          <div style={{ color: "#94a3b8", fontSize: 12 }}>Peak Utilization Time</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#38bdf8", marginTop: 6 }}>08:15 AM</div>
          <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>Morning arrival window</div>
        </div>
      </div>
    </div>
  );
};
export default ReportsPage;
