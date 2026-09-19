import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CircleCheck, X, Trash2, Bus as BusIcon, Route as RouteIcon, Clock, Radio, MapPin, TriangleAlert } from "lucide-react";
import { getBuses, deleteBus } from "../api/endpoints";
import { AddBusButton } from "../components/AddBusButton";
import { useAuth } from "../context/AuthContext";
import type { Bus } from "../types";

const BusesPage: React.FC = () => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { canManageBuses } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<string | null>(() => {
    const added = (location.state as { addedBus?: string } | null)?.addedBus;
    return added ? `Bus ${added} added.` : null;
  });

  useEffect(() => { getBuses().then(setBuses).catch(() => {}); }, []);

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
    setSearch("");
    setNotice(`Bus ${bus.bus_number} added.`);
  };

  const handleDelete = async (bus: Bus) => {
    if (!window.confirm(`Remove bus ${bus.bus_number}? This cannot be undone.`)) return;
    setDeletingId(bus.id);
    try {
      await deleteBus(bus.id);
      setBuses(prev => prev.filter(b => b.id !== bus.id));
      setNotice(`Bus ${bus.bus_number} removed.`);
    } catch {
      window.alert("Couldn't remove the bus. Check your connection or permissions and try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = buses.filter(b =>
    b.bus_number.toLowerCase().includes(search.toLowerCase()) ||
    b.route.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h2 style={{ color: "#f5f5f5", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <BusIcon size={20} strokeWidth={1.9} /> Bus Management
      </h2>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search bus number or route..."
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 8,
            border: "1px solid #2a2a2a", background: "#232323",
            color: "#f5f5f5", fontSize: 14
          }}
        />
        <span style={{ color: "#a3a3a3", alignSelf: "center", fontSize: 13 }}>
          {filtered.length} buses
        </span>
        <AddBusButton onCreated={handleCreated} />
      </div>

      {notice && (
        <div role="status" style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
          padding: "10px 14px", borderRadius: 8, fontSize: 13,
          color: "#e5e5e5", background: "rgba(255, 255, 255, 0.12)",
          border: "1px solid rgba(255, 255, 255, 0.35)"
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
        <div style={{ color: "#a3a3a3", fontSize: 14, padding: "32px 0", textAlign: "center" }}>
          {buses.length === 0 ? "No buses yet." : "No buses match your search."}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {filtered.map(bus => {
          const slot = bus.parking_slot_info;
          return (
            <div key={bus.id} style={{
              background: "#232323", borderRadius: 10, padding: 18,
              border: `1px solid ${slot?.is_blocked ? "#8f8f8f" : "#2a2a2a"}`
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 20, fontWeight: "bold", color: "#f5f5f5", display: "flex", alignItems: "center", gap: 8 }}>
                  <BusIcon size={18} strokeWidth={1.9} /> {bus.bus_number}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    background: bus.is_active ? "#1c1c1c" : "#2a2a2a",
                    color: bus.is_active ? "#e5e5e5" : "#a3a3a3",
                    padding: "2px 8px", borderRadius: 4, fontSize: 11
                  }}>{bus.is_active ? "ACTIVE" : "INACTIVE"}</span>
                  {canManageBuses && (
                    <button
                      type="button"
                      onClick={() => handleDelete(bus)}
                      disabled={deletingId === bus.id}
                      aria-label={`Remove bus ${bus.bus_number}`}
                      title="Remove bus"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: 26, height: 26, borderRadius: 6,
                        border: "1px solid #2a2a2a", background: "transparent",
                        color: "#c4c4c4", cursor: deletingId === bus.id ? "default" : "pointer",
                        opacity: deletingId === bus.id ? 0.5 : 1,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              <div style={{ color: "#a3a3a3", fontSize: 13, lineHeight: 1.7, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}><RouteIcon size={13} /> {bus.route}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Clock size={13} /> Departs: <strong style={{ color: "#d4d4d4" }}>{bus.departure_time}</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Radio size={13} /> RFID: <code style={{ color: "#d4d4d4", fontSize: 11 }}>{bus.rfid_uid}</code>
                </div>
                {slot ? (
                  <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 7 }}>
                    <MapPin size={13} />
                    <strong style={{ color: "#c4c4c4" }}>Row {slot.row}, Slot {slot.slot_number}</strong>
                    {slot.is_blocked && (
                      <span style={{ color: "#f5f5f5", marginLeft: 4, display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
                        <TriangleAlert size={12} /> BLOCKED
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ marginTop: 4, color: "#737373", display: "flex", alignItems: "center", gap: 7 }}>
                    <MapPin size={13} /> Not parked
                  </div>
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
