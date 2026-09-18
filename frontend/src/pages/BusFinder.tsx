import React, { useState } from "react";
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
      <h2 style={{ color: "#f9fafb", textAlign: "center", marginBottom: 8 }}>🔍 Find My Bus</h2>
      <p style={{ color: "#9ca3af", textAlign: "center", marginBottom: 24, fontSize: 14 }}>
        Enter your bus number to find its parking location
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="e.g. B04"
          style={{
            flex: 1, padding: "12px 16px", borderRadius: 8,
            border: "2px solid #374151", background: "#1f2937",
            color: "#f9fafb", fontSize: 16, outline: "none",
          }}
        />
        <button onClick={handleSearch} disabled={loading} style={{
          background: "#3b82f6", color: "#fff", border: "none",
          borderRadius: 8, padding: "12px 24px", fontWeight: "bold",
          fontSize: 15, cursor: "pointer"
        }}>
          {loading ? "..." : "Search"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#450a0a", border: "1px solid #ef4444", borderRadius: 8, padding: 16, color: "#fca5a5" }}>
          ❌ {error}
        </div>
      )}

      {result && (
        <div style={{ background: "#1f2937", borderRadius: 12, padding: 24, border: "1px solid #374151" }}>
          <div style={{ fontSize: 28, fontWeight: "bold", color: "#f9fafb", marginBottom: 16 }}>
            🚌 Bus {result.bus_number}
          </div>
          <hr style={{ borderColor: "#374151", marginBottom: 16 }} />

          {slot ? (
            <>
              <div style={{ fontSize: 18, color: "#22c55e", marginBottom: 8 }}>
                📍 Row <strong>{slot.row}</strong>
              </div>
              <div style={{ fontSize: 18, color: "#3b82f6", marginBottom: 8 }}>
                🅿️ Slot <strong>{slot.slot_number}</strong>
              </div>
              {slot.is_blocked && (
                <div style={{ background: "#450a0a", borderRadius: 6, padding: "8px 12px", color: "#fca5a5", marginBottom: 12 }}>
                  ⚠️ This bus may be blocked by another bus. Check with transport staff.
                </div>
              )}
            </>
          ) : (
            <div style={{ color: "#f59e0b", marginBottom: 12 }}>📍 Not currently parked</div>
          )}

          <div style={{ color: "#9ca3af", marginTop: 8 }}>
            <div>🛣️ Route: <strong style={{ color: "#d1d5db" }}>{result.route}</strong></div>
            <div style={{ marginTop: 6 }}>⏰ Departure: <strong style={{ color: "#d1d5db" }}>{result.departure_time}</strong></div>
          </div>
        </div>
      )}

      {!result && !error && (
        <div style={{ marginTop: 32 }}>
          <div style={{ color: "#6b7280", textAlign: "center", fontSize: 13 }}>
            Quick search: {["B01", "B02", "B03", "B04"].map(b => (
              <button key={b} onClick={() => { setQuery(b); }} style={{
                background: "#374151", color: "#9ca3af", border: "none",
                borderRadius: 4, padding: "4px 10px", margin: "0 4px", cursor: "pointer"
              }}>{b}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BusFinder;
