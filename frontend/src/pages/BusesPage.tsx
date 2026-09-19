import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CircleCheck, X } from "lucide-react";
import { getBuses } from "../api/endpoints";
import { AddBusButton } from "../components/AddBusButton";
import type { Bus } from "../types";

const BusesPage: React.FC = () => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  // Arriving from the dashboard's "Add bus" carries the new bus number in history state
  const [notice, setNotice] = useState<string | null>(() => {
    const added = (location.state as { addedBus?: string } | null)?.addedBus;
    return added ? `Bus ${added} added.` : null;
  });

  useEffect(() => { getBuses().then(setBuses).catch(() => {}); }, []);

  // Clear it from history state so a refresh doesn't show the message again
  useEffect(() => {
    if ((location.state as { addedBus?: string } | null)?.addedBus) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const handleCreated = (bus: Bus) => {
    setBuses(prev => [...prev, bus].sort((a, b) => a.bus_number.localeCompare(b.bus_number)));
    setSearch(""); // otherwise an active filter could hide the new bus
    setNotice(`Bus ${bus.bus_number} added.`);
  };

  const filtered = buses.filter(b =>
    b.bus_number.toLowerCase().includes(search.toLowerCase()) ||
    b.route.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h2 style={{ color: "#f9fafb", marginBottom: 16 }}>🚌 Bus Management</h2>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search bus number or route..."
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 8,
            border: "1px solid #374151", background: "#1f2937",
            color: "#f9fafb", fontSize: 14
          }}
        />
        <span style={{ color: "#9ca3af", alignSelf: "center", fontSize: 13 }}>
          {filtered.length} buses
        </span>
        <AddBusButton onCreated={handleCreated} />
      </div>

      {notice && (
        <div role="status" style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
          padding: "10px 14px", borderRadius: 8, fontSize: 13,
          color: "#6ee7b7", background: "rgba(16, 185, 129, 0.12)",
          border: "1px solid rgba(16, 185, 129, 0.35)"
        }}>
          <CircleCheck size={16} />
          <span style={{ flex: 1 }}>{notice}</span>
          <button
            type="button" onClick={() => setNotice(null)} aria-label="Dismiss"
            style={{ display: "flex", background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ color: "#9ca3af", fontSize: 14, padding: "32px 0", textAlign: "center" }}>
          {buses.length === 0 ? "No buses yet." : "No buses match your search."}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {filtered.map(bus => {
          const slot = bus.parking_slot_info;
          return (
            <div key={bus.id} style={{
              background: "#1f2937", borderRadius: 10, padding: 18,
              border: `1px solid ${slot?.is_blocked ? "#dc2626" : "#374151"}`
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 20, fontWeight: "bold", color: "#f9fafb" }}>🚌 {bus.bus_number}</span>
                <span style={{
                  background: bus.is_active ? "#14532d" : "#374151",
                  color: bus.is_active ? "#86efac" : "#9ca3af",
                  padding: "2px 8px", borderRadius: 4, fontSize: 11
                }}>{bus.is_active ? "ACTIVE" : "INACTIVE"}</span>
              </div>
              <div style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.7 }}>
                <div>🛣️ {bus.route}</div>
                <div>⏰ Departs: <strong style={{ color: "#d1d5db" }}>{bus.departure_time}</strong></div>
                <div>📡 RFID: <code style={{ color: "#818cf8", fontSize: 11 }}>{bus.rfid_uid}</code></div>
                {slot ? (
                  <div style={{ marginTop: 8 }}>
                    📍 <strong style={{ color: "#3b82f6" }}>Row {slot.row}, Slot {slot.slot_number}</strong>
                    {slot.is_blocked && <span style={{ color: "#ef4444", marginLeft: 8 }}>⚠ BLOCKED</span>}
                  </div>
                ) : (
                  <div style={{ marginTop: 8, color: "#6b7280" }}>📍 Not parked</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BusesPage;
