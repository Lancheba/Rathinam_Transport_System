import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Wrench, Fuel, Plus, Trash2, Pencil, X, LoaderCircle, Bus as BusIcon, Gauge, IndianRupee,
  MapPin, Clock, Ruler, Users, CheckCircle2, XCircle,
} from "lucide-react";
import {
  getMyBus, getMaintenanceSummary, getMaintenanceLogs, createMaintenanceLog,
  updateMaintenanceLog, deleteMaintenanceLog,
} from "../api/endpoints";
import { ClaimBusForm, inputStyle, labelStyle, primaryBtn, ghostBtn, errorText } from "./DriverAttendancePage";
import type { Bus, MaintenanceLog, MaintenanceLogInput, MaintenanceLogType, MaintenanceSummary } from "../types";

const todayStr = () => new Date().toISOString().slice(0, 10);

const daysAgo = (dateStr: string): string => {
  const diff = Math.round((Date.now() - new Date(dateStr + "T00:00:00").getTime()) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
};

const money = (v: string | null) => (v ? `₹${Number(v).toLocaleString("en-IN")}` : "—");

/* --------------------------------------------------------- Cab details card */

const DetailItem: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div>
    <div style={{
      display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 11.5,
      fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4,
    }}>
      {icon} {label}
    </div>
    <div style={{ color: "var(--text-strong)", fontSize: 14, fontWeight: 600 }}>{children}</div>
  </div>
);

const CabDetailsCard: React.FC<{ bus: Bus }> = ({ bus }) => (
  <div className="liquid-glass-card" style={{
    padding: 18, marginBottom: 20, border: "1px solid rgba(96,165,250,0.15)",
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16,
  }}>
    <DetailItem icon={<MapPin size={13} />} label="Route">{bus.route || "—"}</DetailItem>
    <DetailItem icon={<Clock size={13} />} label="Departure">{bus.departure_time || "—"}</DetailItem>
    <DetailItem icon={<Ruler size={13} />} label="Dimensions">{bus.length_m} m × {bus.width_m} m</DetailItem>
    <DetailItem icon={<Users size={13} />} label="Capacity">
      {bus.student_capacity ?? 0} students &middot; {bus.teacher_capacity ?? 0} teachers
    </DetailItem>
    <DetailItem
      icon={bus.is_active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      label="Status"
    >
      <span style={{ color: bus.is_active ? "var(--accent-green)" : "var(--accent-red)" }}>
        {bus.is_active ? "Active" : "Inactive"}
      </span>
    </DetailItem>
  </div>
);

/* --------------------------------------------------------- Summary card */

const SummaryCard: React.FC<{
  icon: React.ReactNode; label: string; entry: MaintenanceLog | null; accent: string;
}> = ({ icon, label, entry, accent }) => (
  <div className="liquid-glass-card" style={{
    padding: 18, display: "flex", flexDirection: "column", gap: 8, border: `1px solid ${accent}33`, flex: "1 1 220px",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>
      <span style={{ color: accent, display: "flex" }}>{icon}</span> {label}
    </div>
    {entry ? (
      <>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-strong)" }}>{daysAgo(entry.date)}</div>
        <div style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
          {entry.date}
          {entry.odometer_km != null && ` · ${entry.odometer_km.toLocaleString()} km`}
          {entry.log_type === "FUEL" && entry.fuel_liters && ` · ${entry.fuel_liters} L`}
          {entry.cost && ` · ${money(entry.cost)}`}
        </div>
      </>
    ) : (
      <div style={{ color: "var(--text-dim)", fontSize: 13.5 }}>No entries yet</div>
    )}
  </div>
);

/* --------------------------------------------------------- Add/edit form */

type FormState = { date: string; odometer_km: string; cost: string; fuel_liters: string; notes: string };
const emptyForm = (): FormState => ({ date: todayStr(), odometer_km: "", cost: "", fuel_liters: "", notes: "" });
const toForm = (l: MaintenanceLog): FormState => ({
  date: l.date, odometer_km: l.odometer_km != null ? String(l.odometer_km) : "",
  cost: l.cost ?? "", fuel_liters: l.fuel_liters ?? "", notes: l.notes,
});

const LogForm: React.FC<{
  logType: MaintenanceLogType; editing: MaintenanceLog | null; onDone: (l: MaintenanceLog) => void; onCancel: () => void;
}> = ({ logType, editing, onDone, onCancel }) => {
  const [form, setForm] = useState<FormState>(editing ? toForm(editing) : emptyForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setForm(editing ? toForm(editing) : emptyForm()), [editing]);

  const set = <K extends keyof FormState>(key: K, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date) { setError("Pick a date."); return; }
    setBusy(true); setError("");
    const payload: MaintenanceLogInput = {
      log_type: logType, date: form.date,
      odometer_km: form.odometer_km ? Number(form.odometer_km) : null,
      cost: form.cost ? form.cost : null,
      fuel_liters: logType === "FUEL" && form.fuel_liters ? form.fuel_liters : null,
      notes: form.notes.trim(),
    };
    try {
      const saved = editing ? await updateMaintenanceLog(editing.id, payload) : await createMaintenanceLog(payload);
      onDone(saved);
    } catch (err) {
      setError(errorText(err, editing ? "Couldn't save those changes." : "Couldn't add that entry."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="liquid-glass-card" style={{
      padding: 18, display: "flex", flexDirection: "column", gap: 12, marginBottom: 20, border: "1px solid rgba(99,102,241,0.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-strong)", fontWeight: 700 }}>
        {editing ? <Pencil size={16} /> : <Plus size={16} />}
        {editing ? "Edit entry" : logType === "SERVICE" ? "Log a service" : "Log a refuel"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        <label style={labelStyle}>Date
          <input style={inputStyle} type="date" max={todayStr()} value={form.date} onChange={(e) => set("date", e.target.value)} disabled={busy} autoFocus />
        </label>
        <label style={labelStyle}>Odometer (km)
          <input style={inputStyle} type="number" min={0} value={form.odometer_km} onChange={(e) => set("odometer_km", e.target.value)} disabled={busy} />
        </label>
        {logType === "FUEL" && (
          <label style={labelStyle}>Fuel (litres)
            <input style={inputStyle} type="number" min={0} step="0.1" value={form.fuel_liters} onChange={(e) => set("fuel_liters", e.target.value)} disabled={busy} />
          </label>
        )}
        <label style={labelStyle}>Cost (₹)
          <input style={inputStyle} type="number" min={0} step="0.01" value={form.cost} onChange={(e) => set("cost", e.target.value)} disabled={busy} />
        </label>
        <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>Notes
          <input style={inputStyle} value={form.notes} onChange={(e) => set("notes", e.target.value)}
            placeholder={logType === "SERVICE" ? "e.g. Oil change, brake pads" : "e.g. Full tank at ABC pump"} maxLength={255} disabled={busy} />
        </label>
      </div>
      {error && <div role="alert" style={{ color: "var(--accent-red)", fontSize: 13 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
          {busy && <LoaderCircle size={15} className="spin" />}
          {editing ? "Save changes" : "Add entry"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} style={ghostBtn}>
          <X size={14} /> Cancel
        </button>
      </div>
    </form>
  );
};

/* ------------------------------------------------------------- Page */

const MyBusPage: React.FC = () => {
  const [bus, setBus] = useState<Bus | null | undefined>(undefined); // undefined = loading
  const [summary, setSummary] = useState<MaintenanceSummary | null>(null);
  const [tab, setTab] = useState<MaintenanceLogType>("SERVICE");
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MaintenanceLog | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAll = (activeTab: MaintenanceLogType) => {
    setLoading(true);
    Promise.all([getMaintenanceSummary(), getMaintenanceLogs({ log_type: activeTab })])
      .then(([s, l]) => { setSummary(s); setLogs(l); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getMyBus()
      .then((res) => { setBus(res.bus); if (res.bus) loadAll(tab); else setLoading(false); })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (bus) loadAll(tab); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const handleSaved = (l: MaintenanceLog) => {
    setShowForm(false); setEditing(null);
    setNotice(editing ? "Entry updated." : `${l.log_type === "SERVICE" ? "Service" : "Refuel"} logged.`);
    loadAll(tab);
  };

  const handleDelete = async (l: MaintenanceLog) => {
    if (!window.confirm(`Delete this ${l.log_type === "SERVICE" ? "service" : "fuel"} entry from ${l.date}?`)) return;
    setDeletingId(l.id);
    try {
      await deleteMaintenanceLog(l.id);
      setNotice("Entry removed.");
      setLogs((prev) => prev.filter((x) => x.id !== l.id));
      getMaintenanceSummary().then(setSummary);
    } catch (err) {
      window.alert(axios.isAxiosError(err) ? errorText(err, "Couldn't remove that entry.") : "Couldn't remove that entry.");
    } finally {
      setDeletingId(null);
    }
  };

  if (bus === undefined || (loading && bus && !summary)) {
    return <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "32px 0", textAlign: "center" }}>Loading…</div>;
  }

  if (!bus) {
    return (
      <div>
        <h2 style={{ color: "var(--accent-blue)", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
          <Wrench size={20} strokeWidth={1.9} /> My Bus
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 18 }}>
          Link your bus first — once it's set up, you can log its service and fuel history.
        </p>
        <ClaimBusForm onClaimed={(b) => { setBus(b); loadAll(tab); }} />
      </div>
    );
  }

  const tabBtn = (t: MaintenanceLogType, label: string, Icon: typeof Wrench) => (
    <button
      type="button" onClick={() => { setTab(t); setShowForm(false); setEditing(null); }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8,
        border: `1px solid ${tab === t ? "var(--accent-indigo)" : "rgba(99,102,241,0.2)"}`,
        background: tab === t ? "rgba(99,102,241,0.15)" : "transparent",
        color: tab === t ? "var(--text-strong)" : "var(--text-muted)",
        fontWeight: 700, fontSize: 13.5, cursor: "pointer",
      }}
    >
      <Icon size={14} /> {label}
    </button>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <h2 style={{ color: "var(--accent-blue)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <Wrench size={20} strokeWidth={1.9} /> My Bus
        </h2>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 13 }}>
          <BusIcon size={14} /> {bus.bus_number}
        </span>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 18 }}>
        Every detail of your assigned cab, plus its service and fuel history.
      </p>

      <CabDetailsCard bus={bus} />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <SummaryCard icon={<Wrench size={15} />} label="Last Service" entry={summary?.last_service ?? null} accent="var(--accent-amber)" />
        <SummaryCard icon={<Fuel size={15} />} label="Last Refuel" entry={summary?.last_fuel ?? null} accent="var(--accent-cyan)" />
      </div>

      {notice && (
        <div role="status" style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px",
          borderRadius: 10, fontSize: 13, color: "var(--accent-green)", background: "rgba(74,222,128,0.08)",
          border: "1px solid rgba(74,222,128,0.35)",
        }}>
          <span style={{ flex: 1 }}>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss"
            style={{ display: "flex", background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 2 }}>
            <X size={14} />
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {tabBtn("SERVICE", "Service log", Wrench)}
        {tabBtn("FUEL", "Fuel log", Fuel)}
        {!showForm && (
          <button type="button" onClick={() => { setEditing(null); setShowForm(true); }} style={{ ...primaryBtn, marginLeft: "auto" }}>
            <Plus size={15} /> {tab === "SERVICE" ? "Log service" : "Log refuel"}
          </button>
        )}
      </div>

      {(showForm || editing) && (
        <LogForm logType={tab} editing={editing} onDone={handleSaved} onCancel={() => { setShowForm(false); setEditing(null); }} />
      )}

      {loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "32px 0", textAlign: "center" }}>Loading…</div>
      ) : logs.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "var(--text-muted)",
          fontSize: 14, padding: "40px 0", textAlign: "center",
        }}>
          {tab === "SERVICE" ? <Wrench size={24} style={{ opacity: 0.6 }} /> : <Fuel size={24} style={{ opacity: 0.6 }} />}
          No {tab === "SERVICE" ? "service" : "fuel"} entries yet. Log the first one above.
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(96,165,250,0.15)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr>
                {["Date", "Odometer", ...(tab === "FUEL" ? ["Litres"] : []), "Cost", "Notes", ""].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "10px 12px", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: 0.4, color: "var(--text-muted)", borderBottom: "1px solid rgba(96,165,250,0.15)",
                    background: "rgba(96,165,250,0.04)",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ padding: "8px 12px" }}>{l.date}</td>
                  <td style={{ color: "var(--text-muted)", padding: "8px 12px" }}>
                    {l.odometer_km != null ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Gauge size={12} />{l.odometer_km.toLocaleString()} km</span> : "—"}
                  </td>
                  {tab === "FUEL" && <td style={{ color: "var(--text-muted)", padding: "8px 12px" }}>{l.fuel_liters ? `${l.fuel_liters} L` : "—"}</td>}
                  <td style={{ color: "var(--text-muted)", padding: "8px 12px" }}>
                    {l.cost ? <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><IndianRupee size={12} />{Number(l.cost).toLocaleString("en-IN")}</span> : "—"}
                  </td>
                  <td style={{ color: "var(--text-muted)", padding: "8px 12px" }}>{l.notes || "—"}</td>
                  <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                    <button
                      type="button" onClick={() => { setShowForm(false); setEditing(l); }}
                      aria-label="Edit entry"
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26,
                        borderRadius: 6, border: "1px solid rgba(96,165,250,0.25)", background: "rgba(96,165,250,0.06)",
                        color: "var(--accent-blue)", cursor: "pointer", marginRight: 6,
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button" onClick={() => handleDelete(l)} disabled={deletingId === l.id}
                      aria-label="Delete entry"
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26,
                        borderRadius: 6, border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.06)",
                        color: "var(--accent-red)", cursor: deletingId === l.id ? "default" : "pointer",
                        opacity: deletingId === l.id ? 0.5 : 1,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyBusPage;