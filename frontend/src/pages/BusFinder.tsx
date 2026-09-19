import React, { useState } from "react";
import { Search, CircleX, Bus as BusIcon, MapPin, ParkingSquare, TriangleAlert, Route as RouteIcon, Clock } from "lucide-react";
import { searchBus } from "../api/endpoints";
import type { Bus } from "../types";

const BusFinder: React.FC = () => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Bus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const bus = await searchBus(query.trim().toUpperCase());
      setResult(bus);
    } catch {
      setError("Bus not found. Check the bus number and try again.");
    } finally {
      setLoading(false);
    }
  };

  const slot = result?.parking_slot_info;

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", paddingTop: 40 }}>
      <h2 style={{ color: "#f5f5f5", textAlign: "center", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Search size={20} strokeWidth={1.9} /> Find My Bus
      </h2>
      <p style={{ color: "#a3a3a3", textAlign: "center", marginBottom: 24, fontSize: 14 }}>
        Enter your bus number to find its parking location
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="e.g. B04"
          style={{
            flex: 1, padding: "12px 16px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
            color: "#f5f5f5", fontSize: 16, outline: "none",
          }}
        />
        <button onClick={handleSearch} disabled={loading} style={{
          background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.28)",
          borderRadius: 10, padding: "12px 24px", fontWeight: "bold",
          fontSize: 15, cursor: "pointer",
          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        }}>
          {loading ? "..." : "Search"}
        </button>
      </div>

      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.3)",
          borderRadius: 10, padding: 16, color: "#d4d4d4"
        }}>
          <CircleX size={16} /> {error}
        </div>
      )}

      {result && (
        <div className="liquid-glass-card" style={{ padding: 24 }}>
          <div style={{ fontSize: 26, fontWeight: "bold", color: "#f5f5f5", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <BusIcon size={24} strokeWidth={1.9} /> Bus {result.bus_number}
          </div>
          <hr style={{ borderColor: "rgba(255,255,255,0.1)", marginBottom: 16 }} />

          {slot ? (
            <>
              <div style={{ fontSize: 17, color: "#a3a3a3", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={16} /> Row <strong style={{ color: "#f5f5f5" }}>{slot.row}</strong>
              </div>
              <div style={{ fontSize: 17, color: "#c4c4c4", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <ParkingSquare size={16} /> Slot <strong style={{ color: "#f5f5f5" }}>{slot.slot_number}</strong>
              </div>
              {slot.is_blocked && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(255,255,255,0.08)", border: "1px dashed rgba(255,255,255,0.3)",
                  borderRadius: 8, padding: "8px 12px", color: "#f5f5f5", marginBottom: 12, fontWeight: 600
                }}>
                  <TriangleAlert size={14} /> This bus may be blocked by another bus. Check with transport staff.
                </div>
              )}
            </>
          ) : (
            <div style={{ color: "#c4c4c4", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <MapPin size={16} /> Not currently parked
            </div>
          )}

          <div style={{ color: "#a3a3a3", marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <RouteIcon size={14} /> Route: <strong style={{ color: "#d4d4d4" }}>{result.route}</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={14} /> Departure: <strong style={{ color: "#d4d4d4" }}>{result.departure_time}</strong>
            </div>
          </div>
        </div>
      )}

      {!result && !error && (
        <div style={{ marginTop: 32 }}>
          <div style={{ color: "#737373", textAlign: "center", fontSize: 13 }}>
            Quick search: {["B01", "B02", "B03", "B04"].map(b => (
              <button key={b} onClick={() => { setQuery(b); }} style={{
                background: "rgba(255,255,255,0.06)", color: "#a3a3a3", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6, padding: "4px 10px", margin: "0 4px", cursor: "pointer"
              }}>{b}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BusFinder;
