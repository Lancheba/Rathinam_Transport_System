import React, { useEffect, useState } from "react";
import { Sliders, Wifi, Check, Loader2 } from "lucide-react";
import { getGround, updateGround } from "../api/endpoints";
import type { ParkingGround } from "../types";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px",
  background: "rgba(99,102,241,0.06)",
  border: "1px solid rgba(99,102,241,0.2)",
  borderRadius: 8, color: "#f0f4ff",
  marginTop: 4, fontSize: 14, outline: "none",
  transition: "border-color 0.2s",
};

export const SettingsPage: React.FC = () => {
  const [ground, setGround] = useState<ParkingGround | null>(null);
  const [length, setLength] = useState("");
  const [width,  setWidth]  = useState("");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    getGround()
      .then(grounds => {
        const g = grounds?.[0];
        if (g) { setGround(g); setLength(String(g.length_m)); setWidth(String(g.width_m)); }
      })
      .catch(() => setError("Could not load ground dimensions."))
      .finally(() => setLoading(false));
  }, []);

  const hasChanges = ground && (length !== String(ground.length_m) || width !== String(ground.width_m));

  const handleSave = async () => {
    if (!ground) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const updated = await updateGround(ground.id, { length_m: length, width_m: width });
      setGround(updated); setLength(String(updated.length_m)); setWidth(String(updated.width_m));
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch { setError("Failed to save. Please check the values and try again."); }
    finally  { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#818cf8", display: "flex", alignItems: "center", gap: 10 }}>
          <Sliders size={19} strokeWidth={1.9} /> System Settings
        </h2>
        <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
          Ground dimensions, sensor configurations, and role permissions.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="liquid-glass-card" style={{ padding: "20px 24px", borderColor: "rgba(129,140,248,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Sliders size={18} style={{ color: "#818cf8" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>Ground Dimensions</span>
          </div>

          {loading ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading current dimensions…</p>
          ) : !ground ? (
            <p style={{ fontSize: 13, color: "#f87171" }}>No parking ground record found on the server.</p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#9ca3af" }}>Ground Length (meters)</label>
                  <input type="number" step="0.01" min="0" value={length}
                    onChange={e => setLength(e.target.value)} style={inputStyle}
                    onFocus={e  => (e.currentTarget.style.borderColor = "rgba(129,140,248,0.6)")}
                    onBlur={e   => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.2)")} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#9ca3af" }}>Ground Width (meters)</label>
                  <input type="number" step="0.01" min="0" value={width}
                    onChange={e => setWidth(e.target.value)} style={inputStyle}
                    onFocus={e  => (e.currentTarget.style.borderColor = "rgba(129,140,248,0.6)")}
                    onBlur={e   => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.2)")} />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
                <button onClick={handleSave} disabled={!hasChanges || saving} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 20px", borderRadius: 9999, border: "none",
                  fontSize: 13, fontWeight: 700, transition: "all 0.2s",
                  cursor: hasChanges && !saving ? "pointer" : "not-allowed",
                  background: hasChanges && !saving
                    ? "linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)"
                    : "rgba(255,255,255,0.06)",
                  color: hasChanges && !saving ? "#ffffff" : "#6b7280",
                  boxShadow: hasChanges && !saving ? "0 0 20px rgba(129,140,248,0.4)" : undefined,
                }}>
                  {saving ? <><Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /><span>Saving…</span></> : <span>Save Changes</span>}
                </button>
                {saved && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#4ade80" }}>
                    <Check size={14} /> Saved
                  </span>
                )}
                {error && <span style={{ fontSize: 12, color: "#f87171" }}>{error}</span>}
              </div>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </>
          )}
        </div>

        <div className="liquid-glass-card" style={{ padding: "20px 24px", borderColor: "rgba(34,211,238,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Wifi size={18} style={{ color: "#22d3ee" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#ffffff" }}>ESP32 Gateway &amp; IoT</span>
          </div>
          <p style={{ fontSize: 13, color: "#9ca3af" }}>
            RFID readers listen on <code style={{ color: "#22d3ee" }}>POST /api/sensors/rfid/</code> and ultrasonic arrays on <code style={{ color: "#a78bfa" }}>POST /api/sensors/occupancy/</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;
