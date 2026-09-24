import React, { useEffect, useState } from "react";
import { Sliders, Wifi, Check, Loader2, Palette, Sun, Moon, Monitor, Clock } from "lucide-react";
import { getGround, updateGround, getAttendanceWindowConfig, updateAttendanceWindowConfig } from "../api/endpoints";
import type { ParkingGround, AttendanceWindowConfig } from "../types";
import { useTheme, type ThemePreference } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

// Backend stores "HH:MM:SS"; <input type="time"> wants/returns "HH:MM".
const toInputTime = (t: string) => t.slice(0, 5);
const toApiTime = (t: string) => (t.length === 5 ? `${t}:00` : t);

const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string; Icon: React.ElementType }[] = [
  { value: "light",  label: "Light",  hint: "Bright surfaces",        Icon: Sun },
  { value: "dark",   label: "Dark",   hint: "Easy on the eyes",       Icon: Moon },
  { value: "system", label: "System", hint: "Match this device",      Icon: Monitor },
];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px",
  background: "rgba(99,102,241,0.06)",
  border: "1px solid rgba(99,102,241,0.2)",
  borderRadius: 8, color: "var(--text-strong)",
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
  const { preference, setPreference } = useTheme();
  const { canManageBuses } = useAuth();

  // Attendance window times (when MORNING/EVENING open & close)
  const [windowConfig, setWindowConfig] = useState<AttendanceWindowConfig | null>(null);
  const [morningStart, setMorningStart] = useState("");
  const [morningEnd,   setMorningEnd]   = useState("");
  const [eveningStart, setEveningStart] = useState("");
  const [eveningEnd,   setEveningEnd]   = useState("");
  const [windowLoading, setWindowLoading] = useState(true);
  const [windowSaving,  setWindowSaving]  = useState(false);
  const [windowSaved,   setWindowSaved]   = useState(false);
  const [windowError,   setWindowError]   = useState("");

  useEffect(() => {
    getGround()
      .then(grounds => {
        const g = grounds?.[0];
        if (g) { setGround(g); setLength(String(g.length_m)); setWidth(String(g.width_m)); }
      })
      .catch(() => setError("Could not load ground dimensions."))
      .finally(() => setLoading(false));

    getAttendanceWindowConfig()
      .then(w => {
        setWindowConfig(w);
        setMorningStart(toInputTime(w.morning_start));
        setMorningEnd(toInputTime(w.morning_end));
        setEveningStart(toInputTime(w.evening_start));
        setEveningEnd(toInputTime(w.evening_end));
      })
      .catch(() => setWindowError("Could not load attendance window times."))
      .finally(() => setWindowLoading(false));
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

  const hasWindowChanges = windowConfig && (
    morningStart !== toInputTime(windowConfig.morning_start) ||
    morningEnd   !== toInputTime(windowConfig.morning_end) ||
    eveningStart !== toInputTime(windowConfig.evening_start) ||
    eveningEnd   !== toInputTime(windowConfig.evening_end)
  );

  const handleSaveWindow = async () => {
    setWindowSaving(true); setWindowError(""); setWindowSaved(false);
    try {
      const updated = await updateAttendanceWindowConfig({
        morning_start: toApiTime(morningStart),
        morning_end: toApiTime(morningEnd),
        evening_start: toApiTime(eveningStart),
        evening_end: toApiTime(eveningEnd),
      });
      setWindowConfig(updated);
      setMorningStart(toInputTime(updated.morning_start));
      setMorningEnd(toInputTime(updated.morning_end));
      setEveningStart(toInputTime(updated.evening_start));
      setEveningEnd(toInputTime(updated.evening_end));
      setWindowSaved(true); setTimeout(() => setWindowSaved(false), 2500);
    } catch (e: any) {
      const detail = e?.response?.data && Object.values(e.response.data)[0];
      setWindowError(Array.isArray(detail) ? String(detail[0]) : "Failed to save. Start times must be before end times.");
    } finally { setWindowSaving(false); }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--accent-indigo)", display: "flex", alignItems: "center", gap: 10 }}>
          <Sliders size={19} strokeWidth={1.9} /> System Settings
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          Ground dimensions, sensor configurations, and role permissions.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="liquid-glass-card st-card" style={{ padding: "20px 24px", borderColor: "rgba(167,139,250,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Palette size={18} style={{ color: "var(--accent-violet)" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>Appearance</span>
          </div>
          <div role="radiogroup" aria-label="Colour theme" className="st-theme" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {THEME_OPTIONS.map(({ value, label, hint, Icon }) => {
              const active = preference === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPreference(value)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6,
                    padding: "12px 14px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                    font: "inherit", transition: "all 0.2s ease",
                    background: active ? "rgba(139,92,246,0.14)" : "rgb(var(--ov) / 0.04)",
                    border: active ? "1px solid var(--accent-violet)" : "1px solid rgb(var(--ov) / 0.12)",
                    boxShadow: active ? "0 0 0 3px rgba(139,92,246,0.15)" : "none",
                    color: active ? "var(--text-strong)" : "var(--text-soft)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
                    <Icon size={16} style={{ color: active ? "var(--accent-violet)" : "var(--text-muted)" }} />
                    {label}
                    {active && <Check size={13} style={{ color: "var(--accent-violet)", marginLeft: "auto" }} />}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="liquid-glass-card st-card" style={{ padding: "20px 24px", borderColor: "rgba(129,140,248,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Sliders size={18} style={{ color: "var(--accent-indigo)" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>Ground Dimensions</span>
          </div>

          {loading ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading current dimensions…</p>
          ) : !ground ? (
            <p style={{ fontSize: 13, color: "var(--accent-red)" }}>No parking ground record found on the server.</p>
          ) : (
            <>
              <div className="st-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label htmlFor="st-length" style={{ fontSize: 12, color: "var(--text-muted)" }}>Ground Length (meters)</label>
                  <input id="st-length" type="number" inputMode="decimal" step="0.01" min="0" value={length}
                    onChange={e => setLength(e.target.value)} style={inputStyle}
                    disabled={!canManageBuses}
                    onFocus={e  => (e.currentTarget.style.borderColor = "rgba(129,140,248,0.6)")}
                    onBlur={e   => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.2)")} />
                </div>
                <div>
                  <label htmlFor="st-width" style={{ fontSize: 12, color: "var(--text-muted)" }}>Ground Width (meters)</label>
                  <input id="st-width" type="number" inputMode="decimal" step="0.01" min="0" value={width}
                    onChange={e => setWidth(e.target.value)} style={inputStyle}
                    disabled={!canManageBuses}
                    onFocus={e  => (e.currentTarget.style.borderColor = "rgba(129,140,248,0.6)")}
                    onBlur={e   => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.2)")} />
                </div>
              </div>

              {!canManageBuses && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
                  Only admins and transport staff can change ground dimensions.
                </p>
              )}
              <div className="st-actions" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
                <button className="st-save" onClick={handleSave} disabled={!hasChanges || saving || !canManageBuses} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 20px", borderRadius: 9999, border: "none",
                  fontSize: 13, fontWeight: 700, transition: "all 0.2s",
                  cursor: hasChanges && !saving ? "pointer" : "not-allowed",
                  background: hasChanges && !saving
                    ? "linear-gradient(135deg, var(--accent-indigo) 0%, var(--accent-violet) 100%)"
                    : "rgb(var(--ov) / 0.06)",
                  color: hasChanges && !saving ? "var(--text-strong)" : "var(--text-dim)",
                  boxShadow: hasChanges && !saving ? "0 0 20px rgba(129,140,248,0.4)" : undefined,
                }}>
                  {saving ? <><Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /><span>Saving…</span></> : <span>Save Changes</span>}
                </button>
                {saved && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--accent-green)" }}>
                    <Check size={14} /> Saved
                  </span>
                )}
                {error && <span style={{ fontSize: 12, color: "var(--accent-red)" }}>{error}</span>}
              </div>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </>
          )}
        </div>

        <div className="liquid-glass-card st-card" style={{ padding: "20px 24px", borderColor: "rgba(52,211,153,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Clock size={18} style={{ color: "var(--accent-green, #34d399)" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>Attendance Window Times</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -6, marginBottom: 14 }}>
            When students and teachers can take attendance each day. Outside these windows, QR/face scanning is closed and the day auto-finalizes (unmarked riders become Absent) shortly after the window ends.
          </p>

          {windowLoading ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading current times…</p>
          ) : !windowConfig ? (
            <p style={{ fontSize: 13, color: "var(--accent-red)" }}>Could not load attendance window times.</p>
          ) : (
            <>
              <div className="st-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label htmlFor="aw-morning-start" style={{ fontSize: 12, color: "var(--text-muted)" }}>Morning window opens</label>
                  <input id="aw-morning-start" type="time" value={morningStart}
                    onChange={e => setMorningStart(e.target.value)} style={inputStyle}
                    disabled={!canManageBuses} />
                </div>
                <div>
                  <label htmlFor="aw-morning-end" style={{ fontSize: 12, color: "var(--text-muted)" }}>Morning window closes</label>
                  <input id="aw-morning-end" type="time" value={morningEnd}
                    onChange={e => setMorningEnd(e.target.value)} style={inputStyle}
                    disabled={!canManageBuses} />
                </div>
                <div>
                  <label htmlFor="aw-evening-start" style={{ fontSize: 12, color: "var(--text-muted)" }}>Evening window opens</label>
                  <input id="aw-evening-start" type="time" value={eveningStart}
                    onChange={e => setEveningStart(e.target.value)} style={inputStyle}
                    disabled={!canManageBuses} />
                </div>
                <div>
                  <label htmlFor="aw-evening-end" style={{ fontSize: 12, color: "var(--text-muted)" }}>Evening window closes</label>
                  <input id="aw-evening-end" type="time" value={eveningEnd}
                    onChange={e => setEveningEnd(e.target.value)} style={inputStyle}
                    disabled={!canManageBuses} />
                </div>
              </div>

              {!canManageBuses ? (
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
                  Only admins and transport staff can change attendance window times.
                </p>
              ) : (
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12 }}>
                  {windowConfig.updated_by_username
                    ? `Last changed by ${windowConfig.updated_by_username}.`
                    : "Using default times."}
                </p>
              )}

              <div className="st-actions" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
                <button className="st-save" onClick={handleSaveWindow} disabled={!hasWindowChanges || windowSaving || !canManageBuses} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 20px", borderRadius: 9999, border: "none",
                  fontSize: 13, fontWeight: 700, transition: "all 0.2s",
                  cursor: hasWindowChanges && !windowSaving ? "pointer" : "not-allowed",
                  background: hasWindowChanges && !windowSaving
                    ? "linear-gradient(135deg, var(--accent-indigo) 0%, var(--accent-violet) 100%)"
                    : "rgb(var(--ov) / 0.06)",
                  color: hasWindowChanges && !windowSaving ? "var(--text-strong)" : "var(--text-dim)",
                  boxShadow: hasWindowChanges && !windowSaving ? "0 0 20px rgba(129,140,248,0.4)" : undefined,
                }}>
                  {windowSaving ? <><Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /><span>Saving…</span></> : <span>Save Changes</span>}
                </button>
                {windowSaved && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--accent-green)" }}>
                    <Check size={14} /> Saved
                  </span>
                )}
                {windowError && <span style={{ fontSize: 12, color: "var(--accent-red)" }}>{windowError}</span>}
              </div>
            </>
          )}
        </div>

        <div className="liquid-glass-card st-card" style={{ padding: "20px 24px", borderColor: "rgba(34,211,238,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Wifi size={18} style={{ color: "var(--accent-cyan)" }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>ESP32 Gateway &amp; IoT</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            RFID readers listen on <code style={{ color: "var(--accent-cyan)" }}>POST /api/sensors/rfid/</code> and ultrasonic arrays on <code style={{ color: "var(--accent-violet)" }}>POST /api/sensors/occupancy/</code>.
          </p>
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;
