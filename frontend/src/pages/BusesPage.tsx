import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CircleCheck, X, Trash2, Bus as BusIcon, Route as RouteIcon, Clock, Radio, MapPin, TriangleAlert } from "lucide-react";
import { getBuses, deleteBus } from "../api/endpoints";
import { AddBusButton } from "../components/AddBusButton";
import { BusDetailModal } from "../components/BusDetailModal";
import { useAuth } from "../context/AuthContext";
import type { Bus } from "../types";

const BusesPage: React.FC = () => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
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
      <h2 style={{ color: "var(--accent-blue)", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <BusIcon size={20} strokeWidth={1.9} /> Bus Management
      </h2>
      <div className="bp-toolbar" style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input
          className="bp-search"
          type="text" enterKeyHint="search" autoComplete="off"
          aria-label="Search bus number or route"
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search bus number or route..."
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 10,
            border: "1px solid rgba(96,165,250,0.2)",
            background: "rgba(96,165,250,0.05)",
            color: "var(--text-strong)", fontSize: 14, outline: "none",
          }}
        />
        <span className="bp-count" style={{ color: "var(--text-muted)", alignSelf: "center", fontSize: 13 }}>{filtered.length} buses</span>
        <AddBusButton onCreated={handleCreated} />
      </div>

      {notice && (
        <div role="status" style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
          padding: "10px 14px", borderRadius: 10, fontSize: 13,
          color: "var(--accent-green)", background: "rgba(74,222,128,0.08)",
          border: "1px solid rgba(74,222,128,0.35)"
        }}>
          <CircleCheck size={16} />
          <span style={{ flex: 1 }}>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss"
            style={{ display: "flex", background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 2 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "32px 0", textAlign: "center" }}>
          {buses.length === 0 ? "No buses yet." : "No buses match your search."}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: 16 }}>
        {filtered.map(bus => {
          const slot = bus.parking_slot_info;
          const borderColor = slot?.is_blocked ? "rgba(251,191,36,0.4)" : "rgba(96,165,250,0.2)";
          return (
            <div key={bus.id} className="liquid-glass-card" role="button" tabIndex={0} onClick={() => setSelectedBus(bus)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedBus(bus); } }} style={{
              cursor: "pointer",
              padding: 18,
              borderColor,
              boxShadow: slot?.is_blocked
                ? "var(--glass-glow), 0 0 20px rgba(251,191,36,0.1)"
                : undefined,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 18, fontWeight: "bold", color: "var(--text-strong)", display: "flex", alignItems: "center", gap: 8 }}>
                  <BusIcon size={18} strokeWidth={1.9} style={{ color: "var(--accent-blue)" }} /> {bus.bus_number}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    background: bus.is_active ? "rgba(74,222,128,0.12)" : "rgba(107,114,128,0.15)",
                    color: bus.is_active ? "var(--accent-green)" : "var(--text-muted)",
                    border: `1px solid ${bus.is_active ? "rgba(74,222,128,0.3)" : "rgba(107,114,128,0.2)"}`,
                    padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                  }}>{bus.is_active ? "ACTIVE" : "INACTIVE"}</span>
                  {canManageBuses && (
                    <button type="button" className="icon-btn" onClick={(e) => { e.stopPropagation(); handleDelete(bus); }} disabled={deletingId === bus.id}
                      aria-label={`Remove bus ${bus.bus_number}`}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: 26, height: 26, borderRadius: 6,
                        border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.06)",
                        color: "var(--accent-red)", cursor: deletingId === bus.id ? "default" : "pointer",
                        opacity: deletingId === bus.id ? 0.5 : 1,
                      }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--accent-violet)" }}><RouteIcon size={13} /> {bus.route}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Clock size={13} style={{ color: "var(--accent-cyan)" }} /> Departs: <strong style={{ color: "var(--text-soft)" }}>{bus.departure_time}</strong>
                </div>
                {bus.rfid_uid !== undefined && (
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Radio size={13} style={{ color: "var(--accent-cyan)" }} /> RFID: <code style={{ color: "var(--text-soft)", fontSize: 11 }}>{bus.rfid_uid}</code>
                  </div>
                )}
                {slot ? (
                  <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 7 }}>
                    <MapPin size={13} style={{ color: "var(--accent-green)" }} />
                    <strong style={{ color: "var(--text-soft)" }}>Row {slot.row}, Slot {slot.slot_number}</strong>
                    {slot.is_blocked && (
                      <span style={{ color: "var(--accent-amber)", marginLeft: 4, display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
                        <TriangleAlert size={12} /> BLOCKED
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ marginTop: 4, color: "var(--text-dim)", display: "flex", alignItems: "center", gap: 7 }}>
                    <MapPin size={13} /> Not parked
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {selectedBus && <BusDetailModal bus={selectedBus} onClose={() => setSelectedBus(null)} />}
    </div>
  );
};
export default BusesPage;
