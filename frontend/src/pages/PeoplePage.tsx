import React, { useEffect, useMemo, useState } from "react";
import { Users, ShieldAlert, UserCog, Bus as BusIcon, GraduationCap, UserCheck2, X, Search } from "lucide-react";
import axios from "axios";
import { getPeople, getStudents, getTeachers, getBuses, assignIncharge, removeIncharge } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { Person, Student, Teacher, Bus } from "../types";

type TabKey = "STAFF" | "DRIVER" | "INCHARGE" | "TEACHER" | "STUDENT";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "STAFF", label: "Staff & Admins", icon: UserCog },
  { key: "DRIVER", label: "Drivers", icon: BusIcon },
  { key: "INCHARGE", label: "In-Charges", icon: UserCheck2 },
  { key: "TEACHER", label: "Teachers", icon: GraduationCap },
  { key: "STUDENT", label: "Students", icon: Users },
];

type AssignTarget = { source_type: "STUDENT" | "TEACHER"; source_id: number; name: string };

const PeoplePage: React.FC = () => {
  const { isLoggedIn } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>("STAFF");
  const [people, setPeople] = useState<Person[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [pickedBusId, setPickedBusId] = useState<number | "">("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadAll = () => {
    setLoading(true);
    setForbidden(false);
    Promise.all([getPeople(), getStudents(), getTeachers(), getBuses()])
      .then(([p, s, t, b]) => { setPeople(p); setStudents(s); setTeachers(t); setBuses(b); })
      .catch((err) => {
        if (axios.isAxiosError(err) && (err.response?.status === 403 || err.response?.status === 401)) {
          setForbidden(true);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadAll, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const q = search.trim().toLowerCase();

  const staffAdmins = useMemo(
    () => people.filter((p) => (p.role === "ADMIN" || p.role === "STAFF") && p.username.toLowerCase().includes(q)),
    [people, q]
  );
  const drivers = useMemo(
    () => people.filter((p) => p.role === "DRIVER" && p.username.toLowerCase().includes(q)),
    [people, q]
  );
  const incharges = useMemo(
    () => people.filter((p) => p.role === "INCHARGE" && p.username.toLowerCase().includes(q)),
    [people, q]
  );
  const filteredTeachers = useMemo(
    () => teachers.filter((t) => t.name.toLowerCase().includes(q) || t.staff_id.toLowerCase().includes(q)),
    [teachers, q]
  );
  const filteredStudents = useMemo(
    () => students.filter((s) => s.name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q)),
    [students, q]
  );

  const searchPlaceholder: Record<TabKey, string> = {
    STAFF: "Search by username...",
    DRIVER: "Search by username...",
    INCHARGE: "Search by username...",
    TEACHER: "Search by name or staff ID...",
    STUDENT: "Search by name or roll number...",
  };

  const handleAssignSubmit = async () => {
    if (!assignTarget || pickedBusId === "") return;
    setBusyKey(`assign-${assignTarget.source_type}-${assignTarget.source_id}`);
    setError(null);
    try {
      await assignIncharge(Number(pickedBusId), {
        source_type: assignTarget.source_type,
        source_id: assignTarget.source_id,
      });
      setNotice(`${assignTarget.name} is now the in-charge of that bus.`);
      setAssignTarget(null);
      setPickedBusId("");
      loadAll();
    } catch (err) {
      const msg = axios.isAxiosError(err) && err.response?.data
        ? JSON.stringify(err.response.data)
        : "Couldn't assign in-charge. Check the account has a login and isn't already Driver/Admin/Staff.";
      setError(msg);
    } finally {
      setBusyKey(null);
    }
  };

  const handleRemove = async (person: Person) => {
    if (!window.confirm(`Remove ${person.username} as in-charge? Their role reverts to Student.`)) return;
    const bus = buses.find((b) => b.bus_number === person.incharge_bus_number);
    if (!bus) { window.alert("Couldn't find that bus."); return; }
    setBusyKey(`remove-${person.id}`);
    try {
      await removeIncharge(bus.id);
      setNotice(`${person.username} removed as in-charge.`);
      loadAll();
    } catch {
      window.alert("Couldn't remove in-charge. Check your connection or permissions and try again.");
    } finally {
      setBusyKey(null);
    }
  };

  if (!isLoggedIn || forbidden) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "60px 20px", textAlign: "center" }}>
        <ShieldAlert size={32} style={{ color: "var(--accent-amber)" }} />
        <h2 style={{ color: "var(--text-strong)", margin: 0 }}>Staff access only</h2>
        <p style={{ color: "var(--text-muted)", maxWidth: 420, fontSize: 14 }}>
          The People page lists every login account and is only visible to transport staff and admins.
        </p>
      </div>
    );
  }

  const thStyle: React.CSSProperties = {
    textAlign: "left", padding: "10px 12px", fontSize: 11.5, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: 0.4, color: "var(--text-muted)",
    borderBottom: "1px solid rgba(96,165,250,0.15)", background: "rgba(96,165,250,0.04)",
  };

  const tableWrap = (children: React.ReactNode) => (
    <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(96,165,250,0.15)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>{children}</table>
    </div>
  );

  const actionBtnStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px",
    fontSize: 12.5, fontWeight: 600, borderRadius: 7, cursor: "pointer", whiteSpace: "nowrap",
  };

  return (
    <div>
      <h2 style={{ color: "var(--accent-blue)", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <Users size={20} strokeWidth={1.9} /> People
      </h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key} type="button" onClick={() => setActiveTab(key)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px",
              fontSize: 13, fontWeight: 600, borderRadius: 8, cursor: "pointer",
              border: activeTab === key ? "1px solid var(--text-strong)" : "1px solid rgba(96,165,250,0.2)",
              background: activeTab === key ? "var(--text-strong)" : "rgba(96,165,250,0.05)",
              color: activeTab === key ? "var(--btn-fg)" : "var(--text-strong)",
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div style={{ position: "relative", maxWidth: 360, marginBottom: 20 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
        <input
          type="text" enterKeyHint="search" autoComplete="off"
          aria-label={searchPlaceholder[activeTab]}
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder[activeTab]}
          style={{
            width: "100%", padding: "9px 14px 9px 36px", borderRadius: 10,
            border: "1px solid rgba(96,165,250,0.2)", background: "rgba(96,165,250,0.05)",
            color: "var(--text-strong)", fontSize: 13.5, outline: "none",
          }}
        />
      </div>

      {notice && (
        <div role="status" style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
          padding: "10px 14px", borderRadius: 10, fontSize: 13,
          color: "var(--accent-green)", background: "rgba(74,222,128,0.08)",
          border: "1px solid rgba(74,222,128,0.35)",
        }}>
          <span style={{ flex: 1 }}>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss"
            style={{ display: "flex", background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 2 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "32px 0", textAlign: "center" }}>Loading...</div>
      ) : (
        <>
          {activeTab === "STAFF" && tableWrap(
            <>
              <thead><tr><th style={thStyle}>Username</th><th style={thStyle}>Email</th><th style={thStyle}>Role</th><th style={thStyle}>Phone</th></tr></thead>
              <tbody>
                {staffAdmins.map((p) => (
                  <tr key={p.id}>
                    <td style={{ padding: "8px 12px" }}>{p.username}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{p.email || "-"}</td>
                    <td style={{ padding: "8px 12px" }}>{p.role}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{p.phone || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </>
          )}

          {activeTab === "DRIVER" && tableWrap(
            <>
              <thead><tr><th style={thStyle}>Username</th><th style={thStyle}>Email</th><th style={thStyle}>Bus</th><th style={thStyle}>Phone</th></tr></thead>
              <tbody>
                {drivers.map((p) => (
                  <tr key={p.id}>
                    <td style={{ padding: "8px 12px" }}>{p.username}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{p.email || "-"}</td>
                    <td style={{ padding: "8px 12px", color: "var(--accent-blue)" }}>{p.driven_bus_number ?? <span style={{ color: "var(--text-dim)" }}>Unassigned</span>}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{p.phone || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </>
          )}

          {activeTab === "INCHARGE" && tableWrap(
            <>
              <thead><tr><th style={thStyle}>Username</th><th style={thStyle}>Identity</th><th style={thStyle}>Bus</th><th style={thStyle} /></tr></thead>
              <tbody>
                {incharges.map((p) => (
                  <tr key={p.id}>
                    <td style={{ padding: "8px 12px" }}>{p.username}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{p.identity ?? "-"}</td>
                    <td style={{ padding: "8px 12px", color: "var(--accent-blue)" }}>{p.incharge_bus_number ?? "-"}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <button
                        type="button" onClick={() => handleRemove(p)} disabled={busyKey === `remove-${p.id}`}
                        style={{ ...actionBtnStyle, color: "var(--accent-red)", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.25)" }}
                      >
                        Remove in-charge
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}

          {activeTab === "TEACHER" && tableWrap(
            <>
              <thead><tr><th style={thStyle}>Name</th><th style={thStyle}>Staff ID</th><th style={thStyle}>Dept</th><th style={thStyle}>Bus</th><th style={thStyle}>Login</th><th style={thStyle} /></tr></thead>
              <tbody>
                {filteredTeachers.map((t) => (
                  <tr key={t.id}>
                    <td style={{ padding: "8px 12px" }}>{t.name}</td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 13 }}>{t.staff_id}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{t.department || "-"}</td>
                    <td style={{ padding: "8px 12px", color: "var(--accent-blue)" }}>{t.bus_number ?? "-"}</td>
                    <td style={{ padding: "8px 12px" }}>
                      {t.has_login
                        ? <span style={{ color: "var(--accent-green)" }}>Has login</span>
                        : <span style={{ color: "var(--text-dim)" }}>No login</span>}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {t.has_login && (
                        <button
                          type="button"
                          onClick={() => setAssignTarget({ source_type: "TEACHER", source_id: t.id, name: t.name })}
                          style={{ ...actionBtnStyle, color: "var(--accent-blue)", background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.25)" }}
                        >
                          Assign as in-charge
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}

          {activeTab === "STUDENT" && tableWrap(
            <>
              <thead><tr><th style={thStyle}>Name</th><th style={thStyle}>Roll No.</th><th style={thStyle}>Dept</th><th style={thStyle}>Bus</th><th style={thStyle} /></tr></thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id}>
                    <td style={{ padding: "8px 12px" }}>{s.name}</td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 13 }}>{s.roll_number}</td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{s.department || "-"}</td>
                    <td style={{ padding: "8px 12px", color: "var(--accent-blue)" }}>{s.bus_number ?? "-"}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <button
                        type="button"
                        onClick={() => setAssignTarget({ source_type: "STUDENT", source_id: s.id, name: s.name })}
                        style={{ ...actionBtnStyle, color: "var(--accent-blue)", background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.25)" }}
                      >
                        Assign as in-charge
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </>
      )}

      {assignTarget && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
        }}>
          <div style={{ background: "var(--bg-elevated, #111827)", borderRadius: 12, padding: 24, width: 360, border: "1px solid rgba(96,165,250,0.2)" }}>
            <h3 style={{ color: "var(--text-strong)", marginTop: 0 }}>Assign {assignTarget.name} as in-charge</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              Pick a bus. If that bus already has an in-charge, they'll revert to Student automatically.
            </p>
            <select
              value={pickedBusId}
              onChange={(e) => setPickedBusId(e.target.value ? Number(e.target.value) : "")}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, marginBottom: 14, border: "1px solid rgba(96,165,250,0.2)" }}
            >
              <option value="">Select a bus...</option>
              {buses.map((b) => <option key={b.id} value={b.id}>{b.bus_number}</option>)}
            </select>
            {error && <p style={{ color: "var(--accent-red)", fontSize: 12.5 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setAssignTarget(null); setError(null); }} style={{ ...actionBtnStyle, background: "none", border: "1px solid rgba(96,165,250,0.2)", color: "var(--text-muted)" }}>Cancel</button>
              <button
                type="button" onClick={handleAssignSubmit} disabled={pickedBusId === "" || busyKey !== null}
                style={{ ...actionBtnStyle, background: "var(--text-strong)", color: "var(--btn-fg)", border: "1px solid var(--text-strong)" }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeoplePage;
