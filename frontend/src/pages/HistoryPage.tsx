import React, { useCallback, useEffect, useState } from "react";
import { History as HistoryIcon, ShieldAlert, RefreshCcw } from "lucide-react";
import { getHistory } from "../api/endpoints";
import { getBuses } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { HistoryEvent, HistoryEventType, Bus } from "../types";

const EVENT_TYPES: { value: HistoryEventType; label: string; color: string }[] = [
  { value: "INCHARGE_DELEGATED", label: "Delegated",       color: "var(--accent-indigo)" },
  { value: "DELEGATION_ENDED",   label: "Delegation ended",color: "var(--text-muted)" },
  { value: "CABS_COMBINED",      label: "Cabs combined",   color: "var(--accent-cyan)" },
  { value: "COMBINATION_ENDED",  label: "Combination ended", color: "var(--text-muted)" },
  { value: "MANUAL_MARK",        label: "Manual mark",     color: "var(--accent-amber)" },
  { value: "QR_SESSION_OPENED",  label: "QR opened",       color: "var(--accent-green)" },
  { value: "QR_SESSION_CLOSED",  label: "QR closed",       color: "var(--text-muted)" },
  { value: "FLAG_REVIEWED",      label: "Flag reviewed",   color: "var(--accent-red)" },
];
const typeColor = (t: string): string => EVENT_TYPES.find(x => x.value === t)?.color ?? "var(--text-muted)";

const inputStyle: React.CSSProperties = {
  padding: "7px 10px", fontSize: 13, outline: "none",
  background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)",
  borderRadius: 8, color: "var(--text-strong)", fontFamily: "inherit",
};

const badge = (color: string): React.CSSProperties => ({
  color, border: `1px solid ${color}`, background: "transparent",
  padding: "1px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
});

const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 8,
  border: "1px solid var(--accent-indigo)", background: "rgba(99,102,241,0.15)",
  color: "var(--text-strong)", fontWeight: 700, fontSize: 13, cursor: "pointer",
};

const HistoryRow: React.FC<{ item: HistoryEvent }> = ({ item }) => (
  <div className="liquid-glass-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <span style={badge(typeColor(item.event_type))}>{item.event_type_label}</span>
      <span style={{ color: "var(--text-dim)", fontSize: 12 }}>
        {new Date(item.created_at).toLocaleString("en-IN")}
      </span>
    </div>
    <p style={{ margin: 0, fontSize: 14, color: "var(--text-soft)" }}>{item.description}</p>
    <div style={{ fontSize: 12, color: "var(--text-dim)", display: "flex", gap: 10, flexWrap: "wrap" }}>
      {item.bus_number && <span>Bus {item.bus_number}</span>}
      {item.actor_username && <span>by {item.actor_username}</span>}
    </div>
  </div>
);

const HistoryPage: React.FC = () => {
  const { canManageBuses } = useAuth();
  const [items, setItems] = useState<HistoryEvent[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bus, setBus] = useState<string>("");
  const [eventType, setEventType] = useState<string>("");
  const [date, setDate] = useState<string>("");

  const load = useCallback(() => {
    setLoading(true); setError("");
    getHistory({
      bus: bus ? Number(bus) : undefined,
      event_type: (eventType || undefined) as HistoryEventType | undefined,
      date: date || undefined,
    })
      .then(setItems)
      .catch(() => setError("Couldn't load history."))
      .finally(() => setLoading(false));
  }, [bus, eventType, date]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (canManageBuses) getBuses().then(setBuses).catch(() => {}); }, [canManageBuses]);

  if (!canManageBuses) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "60px 20px", textAlign: "center" }}>
        <ShieldAlert size={32} style={{ color: "var(--accent-amber)" }} />
        <h2 style={{ color: "var(--text-strong)", margin: 0 }}>Staff or admin access needed</h2>
        <p style={{ color: "var(--text-muted)", maxWidth: 420, fontSize: 14, margin: 0 }}>
          The history feed is only visible to transport staff and administrators.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: "var(--accent-indigo)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <HistoryIcon size={20} strokeWidth={1.9} /> History
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 18px" }}>
        A running log of delegations, cab combinations, manual marks, QR sessions and flag reviews.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <select value={bus} onChange={e => setBus(e.target.value)} style={inputStyle}>
          <option value="">All buses</option>
          {buses.map(b => <option key={b.id} value={b.id}>{b.bus_number}</option>)}
        </select>
        <select value={eventType} onChange={e => setEventType(e.target.value)} style={inputStyle}>
          <option value="">All event types</option>
          {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
        <button type="button" onClick={load} style={primaryBtn}>
          <RefreshCcw size={13} /> Refresh
        </button>
        <span style={{ marginLeft: "auto", color: "var(--text-dim)", fontSize: 12 }}>{items.length} shown</span>
      </div>

      {error && <div role="alert" style={{ color: "var(--accent-red)", marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div style={{ color: "var(--text-dim)" }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ color: "var(--text-dim)" }}>Nothing here yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map(item => <HistoryRow key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
