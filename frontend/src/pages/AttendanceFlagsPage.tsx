import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldAlert, RefreshCcw, Check, X, Users2 } from "lucide-react";
import { getFlags, reviewFlag } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { AttendanceFlag, AttendanceFlagStatus } from "../types";

const STATUSES: { value: AttendanceFlagStatus; label: string; color: string }[] = [
  { value: "OPEN",       label: "Open",       color: "var(--accent-amber)" },
  { value: "REVIEWED",   label: "Reviewed",   color: "var(--accent-green)" },
  { value: "DISMISSED",  label: "Dismissed",  color: "var(--text-muted)" },
];

const RULE_LABELS: Record<string, string> = {
  SAME_DEVICE_MANY_STUDENTS: "One device used for many students",
  SAME_IP_BURST: "Many scans from one IP in a short window",
  EMBEDDING_CLONE: "Two students share a near-identical face embedding",
  IDENTICAL_SCORES: "Many scans share an unusually exact match score",
  MANUAL_MARK_SHARE_HIGH: "Unusually high share of manual marks in a session",
  SESSION_INSTANT_PRESENT: "Everyone marked present within one minute",
  HOLIDAY_ATTENDANCE: "Attendance recorded on a declared holiday",
  MANUAL_MARK_LOGGED: "Manual mark by in-charge",
};
const ruleLabel = (rule: string): string => RULE_LABELS[rule] ?? rule;

const severityColor = (sev: string): string => {
  const s = sev.toUpperCase();
  if (s === "HIGH" || s === "CRITICAL") return "var(--accent-red)";
  if (s === "MEDIUM") return "var(--accent-amber)";
  return "var(--accent-cyan)";
};

const statusColor = (s: AttendanceFlagStatus) => STATUSES.find(x => x.value === s)?.color ?? "var(--accent-amber)";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", marginTop: 4, fontSize: 14, outline: "none",
  background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)",
  borderRadius: 8, color: "var(--text-strong)", fontFamily: "inherit", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, color: "var(--text-muted)", fontWeight: 600 };

const badge = (color: string): React.CSSProperties => ({
  color, border: `1px solid ${color}`, background: "transparent",
  padding: "1px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
});

const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 8,
  border: "1px solid var(--accent-indigo)", background: "rgba(99,102,241,0.15)",
  color: "var(--text-strong)", fontWeight: 700, fontSize: 14, cursor: "pointer",
};

/* --------------------------------------------------------------------- Card */

const FlagCard: React.FC<{
  item: AttendanceFlag;
  onChanged: (f: AttendanceFlag) => void;
}> = ({ item, onChanged }) => {
  const [note, setNote] = useState(item.review_note);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const decide = async (status: "REVIEWED" | "DISMISSED") => {
    setBusy(true); setError("");
    try {
      onChanged(await reviewFlag(item.id, { status, review_note: note.trim() }));
    } catch {
      setError("That didn't work. Check your connection and permissions, then try again.");
    } finally {
      setBusy(false);
    }
  };

  const decided = item.status !== "OPEN";

  return (
    <div className="liquid-glass-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={badge(severityColor(item.severity))}>{item.severity.toUpperCase()}</span>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{ruleLabel(item.rule)}</span>
        </div>
        <span style={badge(statusColor(item.status))}>{item.status}</span>
      </div>

      <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--text-soft)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
        {item.detail}
      </p>

      <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span>Session #{item.session}{item.session_date ? ` · ${item.session_date}` : ""}</span>
        <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          <Users2 size={12} /> {item.record_ids.length} record{item.record_ids.length === 1 ? "" : "s"}
        </span>
        <span>· {new Date(item.created_at).toLocaleString("en-IN")}</span>
      </div>

      {decided && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
          {item.status === "REVIEWED" ? "Reviewed" : "Dismissed"} by{" "}
          <strong style={{ color: "var(--text-soft)" }}>{item.reviewed_by_username ?? "someone"}</strong>
          {item.reviewed_at ? ` on ${new Date(item.reviewed_at).toLocaleString("en-IN")}` : ""}
        </div>
      )}

      <label style={labelStyle}>Review note
        <textarea value={note} rows={2} maxLength={1000} disabled={busy} onChange={e => setNote(e.target.value)}
          style={{ ...inputStyle, resize: "vertical" }} placeholder="What did you check, and what happened" />
      </label>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" onClick={() => decide("REVIEWED")} disabled={busy}
          style={{ ...primaryBtn, padding: "6px 14px", fontSize: 13, opacity: busy ? 0.6 : 1 }}>
          <Check size={13} /> Mark reviewed
        </button>
        <button type="button" onClick={() => decide("DISMISSED")} disabled={busy}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8,
            border: "1px solid rgba(148,163,184,0.3)", background: "transparent",
            color: "var(--text-muted)", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: busy ? 0.6 : 1,
          }}>
          <X size={13} /> Dismiss
        </button>
      </div>
      {error && <div role="alert" style={{ color: "var(--accent-red)", fontSize: 12, marginTop: 8 }}>{error}</div>}
    </div>
  );
};

/* ----------------------------------------------------------------------- Page */

const AttendanceFlagsPage: React.FC = () => {
  const { canManageBuses } = useAuth();
  const [items, setItems] = useState<AttendanceFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<AttendanceFlagStatus>("OPEN");

  const load = useCallback(() => {
    setLoading(true); setError("");
    getFlags(status)
      .then(setItems)
      .catch(() => setError("Couldn't load flags."))
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const replace = (f: AttendanceFlag) => setItems(prev => prev.filter(i => i.id !== f.id));

  const counts = useMemo(() => ({ shown: items.length }), [items]);

  if (!canManageBuses) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "60px 20px", textAlign: "center" }}>
        <ShieldAlert size={32} style={{ color: "var(--accent-amber)" }} />
        <h2 style={{ color: "var(--text-strong)", margin: 0 }}>Staff or admin access needed</h2>
        <p style={{ color: "var(--text-muted)", maxWidth: 420, fontSize: 14, margin: 0 }}>
          Attendance flags are only visible to transport staff and administrators.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: "var(--accent-amber)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <ShieldAlert size={20} strokeWidth={1.9} /> Attendance Flags
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 18px" }}>
        Automatic checks on scans and manual marks. Review each one and mark it reviewed or dismissed.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        {STATUSES.map(s => (
          <button key={s.value} type="button" onClick={() => setStatus(s.value)} aria-pressed={status === s.value}
            style={{
              ...badge(s.color), padding: "5px 12px", fontSize: 12, cursor: "pointer",
              background: status === s.value ? "rgba(99,102,241,0.12)" : "transparent",
            }}>
            {s.label}
          </button>
        ))}
        <button type="button" onClick={load} style={{ ...primaryBtn, padding: "6px 12px", fontSize: 13 }}>
          <RefreshCcw size={13} /> Refresh
        </button>
        <span style={{ marginLeft: "auto", color: "var(--text-dim)", fontSize: 12 }}>{counts.shown} shown</span>
      </div>

      {error && <div role="alert" style={{ color: "var(--accent-red)", marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div style={{ color: "var(--text-dim)" }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ color: "var(--text-dim)" }}>
          {status === "OPEN" ? "No open flags. Clean data yields zero flags." : "Nothing here yet."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(380px, 100%), 1fr))", gap: 14 }}>
          {items.map(item => <FlagCard key={item.id} item={item} onChanged={replace} />)}
        </div>
      )}
    </div>
  );
};

export default AttendanceFlagsPage;


