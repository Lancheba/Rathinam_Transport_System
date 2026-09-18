import React, { useState } from "react";
import { runOptimization, applyOptimization } from "../api/endpoints";
import type { OptimizationResult, OptimizationSlot } from "../types";

const SlotGrid: React.FC<{ slots: OptimizationSlot[]; label: string }> = ({ slots, label }) => {
  const rows = [...new Set(slots.map(s => s.row))].sort();
  const slotsByRow: Record<string, OptimizationSlot[]> = {};
  slots.forEach(s => {
    if (!slotsByRow[s.row]) slotsByRow[s.row] = [];
    slotsByRow[s.row].push(s);
  });

  return (
    <div style={{ flex: 1, minWidth: 300 }}>
      <h4 style={{ color: "#9ca3af", marginBottom: 12, textAlign: "center" }}>{label}</h4>
      <div style={{
        background: "#111827", border: "2px solid #374151",
        borderRadius: 8, padding: 12
      }}>
        <div style={{ color: "#fbbf24", fontSize: 11, textAlign: "center", marginBottom: 8 }}>↑ EXIT</div>
        {rows.map(row => (
          <div key={row} style={{ display: "flex", gap: 4, marginBottom: 6, alignItems: "center" }}>
            <span style={{ color: "#6b7280", width: 16, fontSize: 12 }}>{row}</span>
            {(slotsByRow[row] || []).sort((a, b) => a.slot_number - b.slot_number).map(s => (
              <div key={s.slot_id} title={`${s.bus_number}\nDeparts: ${s.departure_time}`}
                style={{
                  background: s.is_blocked ? "#dc2626" : "#1d4ed8",
                  color: "#fff", borderRadius: 4, padding: "4px 6px",
                  fontSize: 10, fontWeight: "bold", textAlign: "center",
                  minWidth: 44, border: s.is_blocked ? "1px solid #fca5a5" : "none"
                }}>
                {s.bus_number}<br />
                <span style={{ opacity: 0.7, fontSize: 9 }}>{s.departure_time.slice(0, 5)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const OptimizePage: React.FC = () => {
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");

  const handleRun = async () => {
    setLoading(true); setError(""); setApplied(false);
    try {
      const data = await runOptimization();
      setResult(data);
    } catch {
      setError("Failed to run optimisation. Make sure buses are parked.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!result) return;
    try {
      await applyOptimization(result.id);
      setApplied(true);
    } catch {
      setError("Failed to apply. You may need to log in as staff.");
    }
  };

  return (
    <div>
      <h2 style={{ color: "#f9fafb", marginBottom: 8 }}>🤖 Parking Optimisation</h2>
      <p style={{ color: "#9ca3af", marginBottom: 20, fontSize: 14 }}>
        Rearranges buses by departure time — earliest buses go to slots closest to the exit.
        This eliminates blocking.
      </p>

      <button onClick={handleRun} disabled={loading} style={{
        background: loading ? "#374151" : "#7c3aed", color: "#fff",
        border: "none", borderRadius: 8, padding: "12px 28px",
        fontWeight: "bold", fontSize: 15, cursor: "pointer", marginBottom: 24
      }}>
        {loading ? "⏳ Running..." : "▶ Run Optimisation"}
      </button>

      {error && (
        <div style={{ background: "#450a0a", border: "1px solid #ef4444", borderRadius: 8, padding: 12, color: "#fca5a5", marginBottom: 16 }}>
          ❌ {error}
        </div>
      )}

      {result && (
        <>
          {/* Stats comparison */}
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { label: "Blocked Before", before: result.stats.blocked_before, after: result.stats.blocked_after, color: "#ef4444" },
              { label: "Movements Needed", before: "—", after: result.stats.movements_required, color: "#f59e0b" },
              { label: "Buses Optimised", before: "—", after: result.stats.buses_optimised, color: "#22c55e" },
            ].map(stat => (
              <div key={stat.label} style={{
                background: "#1f2937", borderRadius: 8, padding: "12px 20px",
                borderTop: `3px solid ${stat.color}`, minWidth: 160
              }}>
                <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4 }}>{stat.label}</div>
                <div style={{ color: "#d1d5db", fontSize: 13 }}>
                  Before: <strong style={{ color: "#f9fafb" }}>{stat.before}</strong>
                  &nbsp;→&nbsp;After: <strong style={{ color: stat.color }}>{stat.after}</strong>
                </div>
              </div>
            ))}
          </div>

          {/* Side-by-side layout */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
            <SlotGrid slots={result.current} label="🔴 Current Layout" />
            <SlotGrid slots={result.recommended} label="🟢 Optimised Layout" />
          </div>

          {!applied ? (
            <button onClick={handleApply} style={{
              background: "#16a34a", color: "#fff", border: "none",
              borderRadius: 8, padding: "12px 28px", fontWeight: "bold",
              fontSize: 15, cursor: "pointer"
            }}>
              ✅ Apply Optimised Parking Plan
            </button>
          ) : (
            <div style={{ background: "#14532d", border: "1px solid #16a34a", borderRadius: 8, padding: 14, color: "#86efac" }}>
              ✅ Optimised plan applied! The parking map now reflects the new arrangement.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OptimizePage;
