import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
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

  const handleCreated = (sensor: Sensor) => {
    setSensors(prev => [...prev, sensor]);
  };

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
      <h2 style={{ color: "#f9fafb", marginBottom: 8 }}>📡 Sensor Monitoring</h2>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>
          Auto-refreshes every 10 seconds · {online}/{sensors.length} online
        </p>
        <AddSensorButton onCreated={handleCreated} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {sensors.map(sensor => (
          <div key={sensor.id} style={{
            background: "#1f2937", borderRadius: 10, padding: 16,
            border: `1px solid ${sensor.is_active ? "#16a34a" : "#dc2626"}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: "bold", color: "#f9fafb" }}>
                {sensor.sensor_type === "RFID" ? "📡" : "🔊"} {sensor.sensor_id}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  background: sensor.is_active ? "#14532d" : "#450a0a",
                  color: sensor.is_active ? "#86efac" : "#fca5a5",
                  padding: "2px 8px", borderRadius: 4, fontSize: 11
                }}>
                  {sensor.is_active ? "ONLINE" : "OFFLINE"}
                </span>
                {canManageBuses && (
                  <button
                    type="button"
                    onClick={() => handleDelete(sensor)}
                    disabled={deletingId === sensor.id}
                    aria-label={`Remove sensor ${sensor.sensor_id}`}
                    title="Remove sensor"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 26, height: 26, borderRadius: 6,
                      border: "1px solid #374151", background: "transparent",
                      color: "#f87171", cursor: deletingId === sensor.id ? "default" : "pointer",
                      opacity: deletingId === sensor.id ? 0.5 : 1,
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.7 }}>
              <div>Type: <strong style={{ color: "#d1d5db" }}>{sensor.sensor_type}</strong></div>
              <div>Location: <strong style={{ color: "#d1d5db" }}>{sensor.location}</strong></div>
              {sensor.last_reading && (
                <div>Last reading: <code style={{ color: "#818cf8", fontSize: 11 }}>{sensor.last_reading}</code></div>
              )}
              {sensor.last_seen && (
                <div style={{ fontSize: 11, color: "#6b7280" }}>
                  Last seen: {new Date(sensor.last_seen).toLocaleString("en-IN")}
                </div>
              )}
            </div>
          </div>
        ))}

        {sensors.length === 0 && (
          <div style={{ color: "#6b7280", gridColumn: "1/-1" }}>
            No sensors found. Run <code>seed_demo_data</code> to add demo sensors.
          </div>
        )}
      </div>
    </div>
  );
};

export default SensorsPage;
