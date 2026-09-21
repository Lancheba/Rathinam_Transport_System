import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  MessageSquareWarning, Send, Inbox as InboxIcon, Trash2, Check, LoaderCircle, ShieldCheck, EyeOff, Bus as BusIcon,
} from "lucide-react";
import { deleteFeedback, getBuses, getFeedback, sendFeedback, updateFeedback } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { Bus, Feedback, FeedbackCategory, FeedbackKind, FeedbackStatus } from "../types";

const KINDS: { value: FeedbackKind; label: string; color: string }[] = [
  { value: "COMPLAINT",  label: "Complaint",  color: "var(--accent-red)" },
  { value: "FEEDBACK",   label: "Feedback",   color: "var(--accent-cyan)" },
  { value: "SUGGESTION", label: "Suggestion", color: "var(--accent-green)" },
];
const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: "BUS",     label: "Bus condition" },
  { value: "DRIVER",  label: "Driver" },
  { value: "ROUTE",   label: "Route or timing" },
  { value: "PARKING", label: "Parking" },
  { value: "APP",     label: "This app" },
  { value: "OTHER",   label: "Other" },
];
const STATUSES: { value: FeedbackStatus; label: string; color: string }[] = [
  { value: "NEW",       label: "New",       color: "var(--accent-amber)" },
  { value: "IN_REVIEW", label: "In review", color: "var(--accent-cyan)" },
  { value: "RESOLVED",  label: "Resolved",  color: "var(--accent-green)" },
];

const kindColor = (k: FeedbackKind) => KINDS.find(x => x.value === k)?.color ?? "var(--accent-cyan)";
const statusColor = (s: FeedbackStatus) => STATUSES.find(x => x.value === s)?.color ?? "var(--accent-amber)";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", marginTop: 4, fontSize: 14, outline: "none",
  background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)",
  borderRadius: 8, color: "var(--text-strong)", fontFamily: "inherit", boxSizing: "border-box",
};
// The native dropdown list ignores the select's see-through tint, so in dark mode the
// options came out white on white. Give them a solid theme colour.
const optionStyle: React.CSSProperties = { background: "var(--canvas-solid)", color: "var(--text-strong)" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 13, color: "var(--text-muted)", fontWeight: 600 };

const badge = (color: string): React.CSSProperties => ({
  color, border: `1px solid ${color}`, background: "transparent",
  padding: "1px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
});

/** Turns a DRF error response into one readable line. */
const errorText = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 429) return "You've sent a lot of messages recently. Please try again later.";
    if (err.response?.status === 401) return "Please sign in again to send this.";
    const data = err.response?.data;
    if (data && typeof data === "object") {
      const first = Object.values(data as Record<string, unknown>)[0];
      const msg = Array.isArray(first) ? first[0] : first;
      if (typeof msg === "string") return msg;
    }
  }
  return fallback;
};

/* ------------------------------------------------------------------ Send form */

const SendForm: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [kind, setKind] = useState<FeedbackKind>("COMPLAINT");
  const [category, setCategory] = useState<FeedbackCategory>("BUS");
  const [busId, setBusId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => { getBuses().then(setBuses).catch(() => {}); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    if (!subject.trim()) { setError("Enter a subject."); return; }
    if (message.trim().length < 10) { setError("Please write at least 10 characters in the message."); return; }
    setSending(true); setError("");
    try {
      await sendFeedback({
        kind, category, subject: subject.trim(), message: message.trim(),
        bus: busId ? Number(busId) : null, is_anonymous: anonymous,
      });
      setSent(true);
      setSubject(""); setMessage(""); setBusId(""); setAnonymous(false);
    } catch (err) {
      setError(errorText(err, "Couldn't send. Check your connection and try again."));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="liquid-glass-card" style={{ padding: 28, textAlign: "center", maxWidth: 640 }}>
        <Check size={32} style={{ color: "var(--accent-green)" }} />
        <h3 style={{ color: "var(--text-strong)", margin: "10px 0 6px" }}>Sent to the administrators</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 16px" }}>
          {isAdmin
            ? "It now appears in the Inbox tab."
            : "Only administrators can read it. You won't see it here again, so keep a copy if you need one."}
        </p>
        <button type="button" onClick={() => setSent(false)} style={primaryBtn}>Send another</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="liquid-glass-card" style={{ padding: 20, maxWidth: 640 }} noValidate>
      <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 16px", display: "flex", gap: 8, alignItems: "center" }}>
        <ShieldCheck size={15} style={{ color: "var(--accent-green)", flexShrink: 0 }} />
        Only administrators can read what you send here.
      </p>

      <span style={labelStyle}>Type</span>
      <div role="radiogroup" aria-label="Type" style={{ display: "flex", gap: 8, margin: "6px 0 14px", flexWrap: "wrap" }}>
        {KINDS.map(k => (
          <button key={k.value} type="button" role="radio" aria-checked={kind === k.value}
            onClick={() => setKind(k.value)}
            style={{
              padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
              color: kind === k.value ? k.color : "var(--text-muted)",
              border: `1px solid ${kind === k.value ? k.color : "rgba(99,102,241,0.2)"}`,
              background: kind === k.value ? "rgba(99,102,241,0.08)" : "transparent",
            }}>
            {k.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 14 }}>
        <label style={labelStyle}>About
          <select value={category} onChange={e => setCategory(e.target.value as FeedbackCategory)} style={inputStyle}>
            {CATEGORIES.map(c => <option style={optionStyle} key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label style={labelStyle}>Bus (optional)
          <select value={busId} onChange={e => setBusId(e.target.value)} style={inputStyle}>
            <option style={optionStyle} value="">Not about one bus</option>
            {buses.map(b => <option style={optionStyle} key={b.id} value={b.id}>{b.bus_number}</option>)}
          </select>
        </label>
      </div>

      <label style={{ ...labelStyle, marginBottom: 14 }}>Subject
        <input value={subject} maxLength={120} onChange={e => setSubject(e.target.value)} style={inputStyle}
          placeholder="One line summary" />
      </label>

      <label style={{ ...labelStyle, marginBottom: 6 }}>Message
        <textarea value={message} maxLength={2000} rows={6} onChange={e => setMessage(e.target.value)}
          style={{ ...inputStyle, resize: "vertical" }} placeholder="What happened, or what would you change?" />
      </label>
      <div style={{ textAlign: "right", fontSize: 11, color: "var(--text-dim)", marginBottom: 12 }}>{message.length}/2000</div>

      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "var(--text-soft)", marginBottom: 14, cursor: "pointer" }}>
        <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} style={{ marginTop: 3 }} />
        <span>
          Send anonymously
          <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>
            Your name is not saved with it. Admins will see only that it came from a student or staff member.
          </span>
        </span>
      </label>

      {error && <div role="alert" style={{ color: "var(--accent-red)", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <button type="submit" disabled={sending} style={{ ...primaryBtn, opacity: sending ? 0.7 : 1 }}>
        {sending ? <LoaderCircle size={15} className="spin" /> : <Send size={15} />}
        {sending ? "Sending..." : "Send"}
      </button>
    </form>
  );
};

const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 8,
  border: "1px solid var(--accent-indigo)", background: "rgba(99,102,241,0.15)",
  color: "var(--text-strong)", fontWeight: 700, fontSize: 14, cursor: "pointer",
};

/* ---------------------------------------------------------------- Admin inbox */

const InboxCard: React.FC<{
  item: Feedback;
  onChanged: (f: Feedback) => void;
  onRemoved: (id: number) => void;
}> = ({ item, onChanged, onRemoved }) => {
  const [note, setNote] = useState(item.admin_note);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await fn(); } catch { setError("That didn't work. Check your connection and permissions, then try again."); }
    finally { setBusy(false); }
  };

  const setStatus = (status: FeedbackStatus) =>
    run(async () => onChanged(await updateFeedback(item.id, { status })));
  const saveNote = () =>
    run(async () => onChanged(await updateFeedback(item.id, { admin_note: note.trim() })));
  const remove = () => {
    if (!window.confirm(`Delete "${item.subject}"? This cannot be undone.`)) return;
    return run(async () => { await deleteFeedback(item.id); onRemoved(item.id); });
  };

  return (
    <div className="liquid-glass-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={badge(kindColor(item.kind))}>{item.kind_label.toUpperCase()}</span>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{item.category_label}</span>
          {item.bus_number && (
            <span style={{ color: "var(--accent-violet)", fontSize: 12, display: "inline-flex", gap: 4, alignItems: "center" }}>
              <BusIcon size={12} /> {item.bus_number}
            </span>
          )}
        </div>
        <span style={badge(statusColor(item.status))}>{STATUSES.find(s => s.value === item.status)?.label.toUpperCase()}</span>
      </div>

      <h3 style={{ margin: "0 0 6px", fontSize: 16, color: "var(--text-strong)", overflowWrap: "anywhere" }}>{item.subject}</h3>
      <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--text-soft)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
        {item.message}
      </p>
      <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {item.is_anonymous && <EyeOff size={12} />}
        <strong style={{ color: "var(--text-muted)" }}>{item.author_name}</strong>
        <span>({item.author_role || "unknown role"})</span>
        <span>· {new Date(item.created_at).toLocaleString("en-IN")}</span>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}>
          Status
          <select value={item.status} disabled={busy} onChange={e => setStatus(e.target.value as FeedbackStatus)}
            style={{ ...inputStyle, width: "auto", marginTop: 0 }}>
            {STATUSES.map(s => <option style={optionStyle} key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <button type="button" onClick={remove} disabled={busy} aria-label={`Delete ${item.subject}`}
          style={{
            marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 6,
            border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.06)",
            color: "var(--accent-red)", fontSize: 12, cursor: "pointer",
          }}>
          <Trash2 size={13} /> Delete
        </button>
      </div>

      <label style={labelStyle}>Admin note (only admins see this)
        <textarea value={note} rows={2} maxLength={1000} onChange={e => setNote(e.target.value)}
          style={{ ...inputStyle, resize: "vertical" }} placeholder="What was done, or what happens next" />
      </label>
      <button type="button" onClick={saveNote} disabled={busy || note.trim() === item.admin_note}
        style={{ ...primaryBtn, marginTop: 8, padding: "6px 14px", fontSize: 13, opacity: busy || note.trim() === item.admin_note ? 0.5 : 1 }}>
        Save note
      </button>
      {error && <div role="alert" style={{ color: "var(--accent-red)", fontSize: 12, marginTop: 8 }}>{error}</div>}
    </div>
  );
};

const Inbox: React.FC = () => {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"" | FeedbackStatus>("");
  const [kind, setKind] = useState<"" | FeedbackKind>("");

  const load = useCallback(() => {
    setError("");
    getFeedback()
      .then(setItems)
      .catch(() => setError("Couldn't load the inbox."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => ({
    NEW: items.filter(i => i.status === "NEW").length,
    IN_REVIEW: items.filter(i => i.status === "IN_REVIEW").length,
    RESOLVED: items.filter(i => i.status === "RESOLVED").length,
  }), [items]);

  const shown = items.filter(i => (!status || i.status === status) && (!kind || i.kind === kind));

  const replace = (f: Feedback) => setItems(prev => prev.map(i => (i.id === f.id ? f : i)));
  const remove = (id: number) => setItems(prev => prev.filter(i => i.id !== id));

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        {STATUSES.map(s => (
          <button key={s.value} type="button" onClick={() => setStatus(status === s.value ? "" : s.value)}
            aria-pressed={status === s.value}
            style={{
              ...badge(s.color), padding: "5px 12px", fontSize: 12, cursor: "pointer",
              background: status === s.value ? "rgba(99,102,241,0.12)" : "transparent",
            }}>
            {s.label}: {counts[s.value]}
          </button>
        ))}
        <select value={kind} onChange={e => setKind(e.target.value as "" | FeedbackKind)} aria-label="Filter by type"
          style={{ ...inputStyle, width: "auto", marginTop: 0 }}>
          <option style={optionStyle} value="">All types</option>
          {KINDS.map(k => <option style={optionStyle} key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <button type="button" onClick={load} style={{ ...primaryBtn, padding: "6px 12px", fontSize: 13 }}>Refresh</button>
      </div>

      {error && <div role="alert" style={{ color: "var(--accent-red)", marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div style={{ color: "var(--text-dim)" }}>Loading...</div>
      ) : shown.length === 0 ? (
        <div style={{ color: "var(--text-dim)" }}>
          {items.length === 0 ? "Nothing has been sent yet." : "Nothing matches these filters."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(380px, 100%), 1fr))", gap: 14 }}>
          {shown.map(item => <InboxCard key={item.id} item={item} onChanged={replace} onRemoved={remove} />)}
        </div>
      )}
    </div>
  );
};

/* ----------------------------------------------------------------------- Page */

const FeedbackPage: React.FC = () => {
  const { isLoggedIn, isAdmin } = useAuth();
  const [tab, setTab] = useState<"send" | "inbox">("send");

  if (!isLoggedIn) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "60px 20px", textAlign: "center" }}>
        <MessageSquareWarning size={32} style={{ color: "var(--accent-amber)" }} />
        <h2 style={{ color: "var(--text-strong)", margin: 0 }}>Sign in to send a complaint or feedback</h2>
        <p style={{ color: "var(--text-muted)", maxWidth: 420, fontSize: 14, margin: 0 }}>
          Signing in lets the administrators follow up and stops spam. You can still choose to send anonymously.
        </p>
        <Link to="/login" style={{ color: "var(--accent-cyan)", fontWeight: 700 }}>Go to sign in</Link>
      </div>
    );
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, cursor: "pointer",
    fontSize: 14, fontWeight: 700,
    color: active ? "var(--text-strong)" : "var(--text-muted)",
    border: `1px solid ${active ? "var(--accent-indigo)" : "rgba(99,102,241,0.2)"}`,
    background: active ? "rgba(99,102,241,0.15)" : "transparent",
  });

  return (
    <div>
      <h2 style={{ color: "var(--accent-amber)", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <MessageSquareWarning size={20} strokeWidth={1.9} /> Complaints &amp; Feedback
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 18px" }}>
        {isAdmin
          ? "Everything students and staff send in lands here. Only administrators can see it."
          : "Tell the administrators about a problem, or share an idea."}
      </p>

      {isAdmin && (
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <button type="button" style={tabStyle(tab === "send")} onClick={() => setTab("send")}><Send size={14} /> Send</button>
          <button type="button" style={tabStyle(tab === "inbox")} onClick={() => setTab("inbox")}><InboxIcon size={14} /> Inbox</button>
        </div>
      )}

      {isAdmin && tab === "inbox" ? <Inbox /> : <SendForm isAdmin={isAdmin} />}
    </div>
  );
};

export default FeedbackPage;
