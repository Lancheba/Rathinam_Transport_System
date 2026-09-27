import React, { useCallback, useEffect, useState } from "react";
import { Combine, ShieldAlert, RefreshCcw, X } from "lucide-react";
import { getBuses, getCombinations, createCombination, endCombination } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { Bus, CabCombination } from "../types";

const todayStr = () => new Date().toISOString().slice(0, 10);

const inputStyle: React.CSSProperties = {
  padding: "7px 10px", fontSize: 13, outline: "none",
  background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)",
  borderRadius: 8, color: "var(--text-strong)", fontFamily: "inherit",
};

const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 8,
  border: "1px solid var(--accent-indigo)", background: "rgba(99,102,241,0.15)",
  color: "var(--text-strong)", fontWeight: 700, fontSize: 14, cursor: "pointer",
};

const badge = (color: string): React.CSSProperties => ({
  color, border: `1px solid ${color}`, background: "transparent",
  padding: "1px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
});

const CombinationCard: React.FC<{ item: CabCombination; onEnded: (id: number) => void }> = ({ item, onEnded }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const end = async () => {
    setBusy(true); setError("");
    try {
      await endCombination(item.id);
      onEnded(item.id);
    } catch {
      setError("Couldn't end this combination. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="liquid-glass-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={badge("var(--accent-cyan)")}>{item.bus_numbers.join(" + ")}</span>
        <span style={{ color: "var(--text-dim)", fontSize: 12 }}>{item.date}</span>
      </div>
      {item.reason && <p style={{ margin: "0 0 8px", fontSize: 14, color: "var(--text-soft)" }}>{item.reason}</p>}
      <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>
        Combined by {item.created_by_username ?? "someone"} at {new Date(item.created_at).toLocaleString("en-IN")}
      </div>
      <button type="button" onClick={end} disabled={busy}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8,
          border: "1px solid rgba(248,113,113,0.4)", background: "transparent",
          color: "var(--accent-red)", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: busy ? 0.6 : 1,
        }}>
        <X size={13} /> End combination
      </button>
      {error && <div role="alert" style={{ color: "var(--accent-red)", fontSize: 12, marginTop: 8 }}>{error}</div>}
    </div>
  );
};

const CombinedCabsPage: React.FC = () => {
  const { canManageBuses } = useAuth();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [items, setItems] = useState<CabCombination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<number[]>([]);
  const [date, setDate] = useState(todayStr());
  const [reason, setReason] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const load = useCallback(() => {
    setLoading(true); setError("");
    getCombinations(date)
      .then(setItems)
      .catch(() => setError("Couldn't load combinations."))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    (async () => { await Promise.resolve(); load(); })();
  }, [load]);
  useEffect(() => { if (canManageBuses) getBuses().then(setBuses).catch(() => {}); }, [canManageBuses]);

  const toggleBus = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const combine = async () => {
    if (selected.length < 2) { setCreateError("Pick at least 2 buses."); return; }
    setCreating(true); setCreateError("");
    try {
      await createCombination({ buses: selected, date, reason: reason.trim() || undefined });
      setSelected([]); setReason("");
      load();
    } catch {
      setCreateError("Couldn't create the combination. Check the buses and date, then try again.");
    } finally {
      setCreating(false);
    }
  };

  const onEnded = (id: number) => setItems(prev => prev.filter(i => i.id !== id));

  if (!canManageBuses) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "60px 20px", textAlign: "center" }}>
        <ShieldAlert size={32} style={{ color: "var(--accent-amber)" }} />
        <h2 style={{ color: "var(--text-strong)", margin: 0 }}>Staff or admin access needed</h2>
        <p style={{ color: "var(--text-muted)", maxWidth: 420, fontSize: 14, margin: 0 }}>
          Combining cabs is only available to transport staff and administrators.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: "var(--accent-cyan)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <Combine size={20} strokeWidth={1.9} /> Combined Cabs
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 18px" }}>
        Merge two or more buses for a day so students from any of them can scan any of their combined QRs.
        Each student's attendance still lands under their own bus.
      </p>

      <div className="liquid-glass-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {buses.map(b => (
            <button key={b.id} type="button" onClick={() => toggleBus(b.id)} aria-pressed={selected.includes(b.id)}
              style={{
                ...badge(selected.includes(b.id) ? "var(--accent-indigo)" : "var(--text-muted)"),
                padding: "5px 12px", fontSize: 12, cursor: "pointer",
                background: selected.includes(b.id) ? "rgba(99,102,241,0.15)" : "transparent",
              }}>
              {b.bus_number}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)"
            style={{ ...inputStyle, flex: 1, minWidth: 180 }} maxLength={300} />
          <button type="button" onClick={combine} disabled={creating} style={{ ...primaryBtn, opacity: creating ? 0.6 : 1 }}>
            <Combine size={14} /> Combine
          </button>
        </div>
        {createError && <div role="alert" style={{ color: "var(--accent-red)", fontSize: 12, marginTop: 8 }}>{createError}</div>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: "var(--text-strong)" }}>Active on {date}</h3>
        <button type="button" onClick={load} style={{ ...primaryBtn, padding: "6px 12px", fontSize: 13 }}>
          <RefreshCcw size={13} /> Refresh
        </button>
      </div>

      {error && <div role="alert" style={{ color: "var(--accent-red)", marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div style={{ color: "var(--text-dim)" }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ color: "var(--text-dim)" }}>No active combinations for this date.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))", gap: 14 }}>
          {items.map(item => <CombinationCard key={item.id} item={item} onEnded={onEnded} />)}
        </div>
      )}
    </div>
  );
};

export default CombinedCabsPage;
