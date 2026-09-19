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
      <h2 style={{ color: "#f5f5f5", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <Radio size={20} strokeWidth={1.9} /> Sensor Monitoring
      </h2>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <p style={{ color: "#a3a3a3", fontSize: 14, margin: 0 }}>
          Auto-refreshes every 10 seconds · {online}/{sensors.length} online
        </p>
        <AddSensorButton onCreated={handleCreated} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {sensors.map(sensor => (
          <div key={sensor.id} style={{
            background: "#232323", borderRadius: 10, padding: 16,
            border: `1px solid ${sensor.is_active ? "#8f8f8f" : "#8f8f8f"}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: "bold", color: "#f5f5f5", display: "flex", alignItems: "center", gap: 8 }}>
                {sensor.sensor_type === "RFID" ? <Radio size={14} /> : <Volume2 size={14} />} {sensor.sensor_id}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  background: sensor.is_active ? "#1c1c1c" : "#1c1c1c",
                  color: sensor.is_active ? "#e5e5e5" : "#d4d4d4",
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
                      border: "1px solid #2a2a2a", background: "transparent",
                      color: "#c4c4c4", cursor: deletingId === sensor.id ? "default" : "pointer",
                      opacity: deletingId === sensor.id ? 0.5 : 1,
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ color: "#a3a3a3", fontSize: 13, lineHeight: 1.7 }}>
              <div>Type: <strong style={{ color: "#d4d4d4" }}>{sensor.sensor_type}</strong></div>
              <div>Location: <strong style={{ color: "#d4d4d4" }}>{sensor.location}</strong></div>
              {sensor.last_reading && (
                <div>Last reading: <code style={{ color: "#d4d4d4", fontSize: 11 }}>{sensor.last_reading}</code></div>
              )}
              {sensor.last_seen && (
                <div style={{ fontSize: 11, color: "#737373" }}>
                  Last seen: {new Date(sensor.last_seen).toLocaleString("en-IN")}
                </div>
              )}
            </div>
          </div>
        ))}

        {sensors.length === 0 && (
          <div style={{ color: "#737373", gridColumn: "1/-1" }}>
            No sensors found. Run <code>seed_demo_data</code> to add demo sensors.
          </div>
        )}
      </div>
    </div>
  );
};

export default SensorsPage;
