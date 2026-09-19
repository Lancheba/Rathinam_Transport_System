import React, { useState } from "react";
import { Cpu, ArrowUp, Play, Loader2, CircleX, CircleCheck, TriangleAlert, ArrowRight } from "lucide-react";
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
      <h4 style={{ color: "#a3a3a3", marginBottom: 12, textAlign: "center", fontWeight: 600 }}>{label}</h4>
      <div className="liquid-glass-card" style={{ padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#d4d4d4", fontSize: 11, marginBottom: 8 }}>
          <ArrowUp size={12} /> EXIT
        </div>
        {rows.map(row => (
          <div key={row} style={{ display: "flex", gap: 4, marginBottom: 6, alignItems: "center" }}>
            <span style={{ color: "#737373", width: 16, fontSize: 12 }}>{row}</span>
            {(slotsByRow[row] || []).sort((a, b) => a.slot_number - b.slot_number).map(s => (
              <div key={s.slot_id} title={`${s.bus_number}\nDeparts: ${s.departure_time}`}
                style={{
                  background: s.is_blocked ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.09)",
                  color: "#fff", borderRadius: 4, padding: "4px 6px",
                  fontSize: 10, fontWeight: "bold", textAlign: "center",
                  minWidth: 44, border: s.is_blocked ? "1px solid #f5f5f5" : "1px solid rgba(255,255,255,0.14)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                }}>
                {s.is_blocked && <TriangleAlert size={9} />}
                {s.bus_number}
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
      <h2 style={{ color: "#f5f5f5", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <Cpu size={20} strokeWidth={1.9} /> Parking Optimisation
      </h2>
      <p style={{ color: "#a3a3a3", marginBottom: 20, fontSize: 14 }}>
        Rearranges buses by departure time — earliest buses go to slots closest to the exit.
        This eliminates blocking.
      </p>

      <button onClick={handleRun} disabled={loading} style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: loading ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.16)", color: "#fff",
        border: "1px solid rgba(255,255,255,0.24)", borderRadius: 10, padding: "12px 28px",
        fontWeight: "bold", fontSize: 15, cursor: "pointer", marginBottom: 24,
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      }}>
        {loading ? <Loader2 size={16} className="spin" /> : <Play size={15} />}
        {loading ? "Running..." : "Run Optimisation"}
      </button>

      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.3)",
          borderRadius: 8, padding: 12, color: "#d4d4d4", marginBottom: 16
        }}>
          <CircleX size={15} /> {error}
        </div>
      )}

      {result && (
        <>
          {/* Stats comparison */}
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { label: "Blocked Before", before: result.stats.blocked_before, after: result.stats.blocked_after, color: "#b3b3b3" },
              { label: "Movements Needed", before: "—", after: result.stats.movements_required, color: "#c4c4c4" },
              { label: "Buses Optimised", before: "—", after: result.stats.buses_optimised, color: "#a3a3a3" },
            ].map(stat => (
              <div key={stat.label} className="liquid-glass-card" style={{
                padding: "12px 20px",
                borderTop: `3px solid ${stat.color}`, minWidth: 160
              }}>
                <div style={{ color: "#a3a3a3", fontSize: 12, marginBottom: 4 }}>{stat.label}</div>
                <div style={{ color: "#d4d4d4", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  Before: <strong style={{ color: "#f5f5f5" }}>{stat.before}</strong>
                  <ArrowRight size={12} />
                  After: <strong style={{ color: stat.color }}>{stat.after}</strong>
                </div>
              </div>
            ))}
          </div>

          {/* Side-by-side layout */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
            <SlotGrid slots={result.current} label="Current Layout" />
            <SlotGrid slots={result.recommended} label="Optimised Layout" />
          </div>

          {!applied ? (
            <button onClick={handleApply} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.16)", color: "#fff", border: "1px solid rgba(255,255,255,0.24)",
              borderRadius: 10, padding: "12px 28px", fontWeight: "bold",
              fontSize: 15, cursor: "pointer",
              backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
            }}>
              <CircleCheck size={16} /> Apply Optimised Parking Plan
            </button>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.28)",
              borderRadius: 10, padding: 14, color: "#e5e5e5"
            }}>
              <CircleCheck size={16} /> Optimised plan applied! The parking map now reflects the new arrangement.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OptimizePage;
