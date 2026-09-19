import React, { useEffect, useState } from "react";
import { Trash2, Radio, Volume2 } from "lucide-react";
import { getSensors, deleteSensor } from "../api/endpoints";
import { AddSensorButton } from "../components/AddSensorButton";
import { useAuth } from "../context/AuthContext";
import type { Sensor } from "../types";

const SensorsPage: React.FC = () => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { canManageBuses } = useAuth();

  useEffect(() => {
    getSensors().then(setSensors).catch(() => {});
    const interval = setInterval(() => getSensors().then(setSensors).catch(() => {}), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreated = (sensor: Sensor) => { setSensors(prev => [...prev, sensor]); };

  const handleDelete = async (sensor: Sensor) => {
    if (!window.confirm(`Remove sensor ${sensor.sensor_id}? This cannot be undone.`)) return;
    setDeletingId(sensor.id);
    try {
      await deleteSensor(sensor.id);
      setSensors(prev => prev.filter(s => s.id !== sensor.id));
    } catch {
      window.alert("Couldn't remove the sensor. Check your connection or permissions and try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const online = sensors.filter(s => s.is_active).length;

  return (
    <div>
      <h2 style={{ color: "var(--accent-cyan)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <Radio size={20} strokeWidth={1.9} /> Sensor Monitoring
      </h2>
      <div className="sp-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
          Auto-refreshes every 10 seconds ·{" "}
          <span style={{ color: "var(--accent-green)", fontWeight: 700 }}>{online}</span>
          <span style={{ color: "var(--text-muted)" }}>/{sensors.length} online</span>
        </p>
        <AddSensorButton onCreated={handleCreated} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: 14 }}>
        {sensors.map(sensor => (
          <div key={sensor.id} className="liquid-glass-card" style={{
            padding: 16,
            borderColor: sensor.is_active ? "rgba(34,211,238,0.25)" : "rgba(248,113,113,0.2)",
            boxShadow: sensor.is_active
              ? "var(--glass-glow), 0 0 16px rgba(34,211,238,0.08)"
              : "var(--glass-glow), 0 0 16px rgba(248,113,113,0.08)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: "bold", color: "var(--text-strong)", display: "flex", alignItems: "center", gap: 8 }}>
                {sensor.sensor_type === "RFID"
                  ? <Radio size={14} style={{ color: "var(--accent-cyan)" }} />
                  : <Volume2 size={14} style={{ color: "var(--accent-violet)" }} />}
                {sensor.sensor_id}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  background: sensor.is_active ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                  color: sensor.is_active ? "var(--accent-green)" : "var(--accent-red)",
                  border: `1px solid ${sensor.is_active ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
                  padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                }}>
                  {sensor.is_active ? "ONLINE" : "OFFLINE"}
                </span>
                {canManageBuses && (
                  <button type="button" className="icon-btn" onClick={() => handleDelete(sensor)} disabled={deletingId === sensor.id}
                    aria-label={`Remove sensor ${sensor.sensor_id}`}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 26, height: 26, borderRadius: 6,
                      border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.06)",
                      color: "var(--accent-red)", cursor: deletingId === sensor.id ? "default" : "pointer",
                      opacity: deletingId === sensor.id ? 0.5 : 1,
                    }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
              <div>Type: <strong style={{ color: "var(--accent-cyan)" }}>{sensor.sensor_type}</strong></div>
              <div>Location: <strong style={{ color: "var(--text-soft)" }}>{sensor.location}</strong></div>
              {sensor.last_reading && (
                <div>Last reading: <code style={{ color: "var(--accent-violet)", fontSize: 11, overflowWrap: "anywhere" }}>{sensor.last_reading}</code></div>
              )}
              {sensor.last_seen && (
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  Last seen: {new Date(sensor.last_seen).toLocaleString("en-IN")}
                </div>
              )}
            </div>
          </div>
        ))}
        {sensors.length === 0 && (
          <div style={{ color: "var(--text-dim)", gridColumn: "1/-1" }}>
            No sensors found. Run <code>seed_demo_data</code> to add demo sensors.
          </div>
        )}
      </div>
    </div>
  );
};
export default SensorsPage;
