import React, { useEffect, useMemo, useState } from "react";
import { Users, Search, Bus as BusIcon, Plus, Trash2, X, ShieldAlert, ArrowLeft } from "lucide-react";
import axios from "axios";
import { getBuses, getBusRoster, searchStudents, deleteStudent } from "../api/endpoints";
import { AddStudentModal } from "../components/AddStudentModal";
import { useAuth } from "../context/AuthContext";
import type { Bus, BusRoster, Student } from "../types";

const YEAR_LABEL: Record<number, string> = { 1: "1st Yr", 2: "2nd Yr", 3: "3rd Yr", 4: "4th Yr" };

const StudentsPage: React.FC = () => {
  const { canManageBuses, isLoggedIn } = useAuth();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [roster, setRoster] = useState<BusRoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Student[] | null>(null);
  const [searching, setSearching] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadRoster = () => {
    setLoading(true);
    setForbidden(false);
    Promise.all([getBuses(), getBusRoster()])
      .then(([b, r]) => { setBuses(b); setRoster(r); })
      .catch((err) => {
        if (axios.isAxiosError(err) && (err.response?.status === 403 || err.response?.status === 401)) {
          setForbidden(true);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadRoster, []);

  // Debounced cross-bus search by name / roll number / department
  useEffect(() => {
    const q = search.trim();
    if (!q) { setSearchResults(null); return; }
    setSearching(true);
    const t = setTimeout(() => {
      searchStudents(q)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const selectedRoster = useMemo(
    () => roster.find((r) => r.bus_id === selectedBusId) ?? null,
    [roster, selectedBusId]
  );

  const handleCreated = (student: Student) => {
    setShowAdd(false);
    setNotice(`${student.name} (${student.roll_number}) added${student.bus_number ? ` to ${student.bus_number}` : ""}.`);
    loadRoster();
  };

  const handleDelete = async (student: Student | BusRoster["students"][number]) => {
    if (!window.confirm(`Remove ${student.name} (${student.roll_number}) from the roster?`)) return;
    setDeletingId(student.id);
    try {
      await deleteStudent(student.id);
      setNotice(`${student.name} removed.`);
      loadRoster();
      if (searchResults) setSearchResults((prev) => prev?.filter((s) => s.id !== student.id) ?? null);
    } catch {
      window.alert("Couldn't remove the student. Check your connection or permissions and try again.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isLoggedIn || forbidden) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "60px 20px", textAlign: "center" }}>
        <ShieldAlert size={32} style={{ color: "var(--accent-amber)" }} />
        <h2 style={{ color: "var(--text-strong)", margin: 0 }}>Staff access only</h2>
        <p style={{ color: "var(--text-muted)", maxWidth: 420, fontSize: 14 }}>
          Student roll numbers and contact details are only visible to transport staff and admins.
          Sign in with a staff or admin account to see which students are on which bus.
        </p>
      </div>
    );
  }

  const renderStudentRow = (s: BusRoster["students"][number] | Student, showBus: boolean) => (
    <tr key={s.id}>
      <td style={{ fontFamily: "monospace", fontSize: 13 }}>{s.roll_number}</td>
      <td>{s.name}</td>
      <td style={{ color: "var(--text-muted)" }}>{s.department || "—"}</td>
      <td style={{ color: "var(--text-muted)" }}>{s.year ? YEAR_LABEL[s.year] : "—"}</td>
      <td style={{ color: "var(--text-muted)" }}>{s.phone || "—"}</td>
      {showBus && (
        <td style={{ color: "var(--accent-blue)" }}>
          {"bus_number" in s ? (s.bus_number ?? <span style={{ color: "var(--text-dim)" }}>Unassigned</span>) : "—"}
        </td>
      )}
      <td style={{ color: "var(--text-muted)" }}>{s.boarding_point || "—"}</td>
      {canManageBuses && (
        <td>
          <button
            type="button" className="icon-btn" onClick={() => handleDelete(s)} disabled={deletingId === s.id}
            aria-label={`Remove ${s.name}`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 26, height: 26, borderRadius: 6,
              border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.06)",
              color: "var(--accent-red)", cursor: deletingId === s.id ? "default" : "pointer",
              opacity: deletingId === s.id ? 0.5 : 1,
            }}
          >
            <Trash2 size={13} />
          </button>
        </td>
      )}
    </tr>
  );

  const tableWrap = (children: React.ReactNode) => (
    <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(96,165,250,0.15)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        {children}
      </table>
    </div>
  );

  const thStyle: React.CSSProperties = {
    textAlign: "left", padding: "10px 12px", fontSize: 11.5, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: 0.4, color: "var(--text-muted)",
    borderBottom: "1px solid rgba(96,165,250,0.15)", background: "rgba(96,165,250,0.04)",
  };
  return (
    <div>
      <h2 style={{ color: "var(--accent-blue)", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <Users size={20} strokeWidth={1.9} /> Students by Bus
      </h2>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 260px" }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
          <input
            type="text" enterKeyHint="search" autoComplete="off"
            aria-label="Search student by name, roll number or department"
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a student by name or roll number..."
            style={{
              width: "100%", padding: "10px 14px 10px 36px", borderRadius: 10,
              border: "1px solid rgba(96,165,250,0.2)", background: "rgba(96,165,250,0.05)",
              color: "var(--text-strong)", fontSize: 14, outline: "none",
            }}
          />
        </div>
        {canManageBuses && (
          <button
            type="button" onClick={() => setShowAdd(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px",
              fontSize: 13, fontWeight: 600, color: "var(--btn-fg)", background: "var(--text-strong)",
              border: "1px solid var(--text-strong)", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            <Plus size={15} strokeWidth={2.4} /> Add student
          </button>
        )}
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

      {/* Cross-bus search results take over the view while there's a query */}
      {search.trim() ? (
        <div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 10 }}>
            {searching ? "Searching…" : `${searchResults?.length ?? 0} student(s) match "${search.trim()}"`}
          </div>
          {!searching && searchResults && searchResults.length > 0 &&
            tableWrap(
              <>
                <thead>
                  <tr>
                    <th style={thStyle}>Roll No.</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Dept</th>
                    <th style={thStyle}>Year</th>
                    <th style={thStyle}>Phone</th>
                    <th style={thStyle}>Bus</th>
                    <th style={thStyle}>Boarding Point</th>
                    {canManageBuses && <th style={thStyle} />}
                  </tr>
                </thead>
                <tbody>{searchResults.map((s) => renderStudentRow(s, true))}</tbody>
              </>
            )}
          {!searching && searchResults && searchResults.length === 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "32px 0", textAlign: "center" }}>
              No student matches that search.
            </div>
          )}
        </div>
      ) : selectedRoster ? (
        // A single bus's roster
        <div>
          <button
            type="button" onClick={() => setSelectedBusId(null)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 14,
              background: "none", border: "none", color: "var(--accent-blue)", cursor: "pointer", fontSize: 13, padding: 0,
            }}
          >
            <ArrowLeft size={14} /> All buses
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <BusIcon size={17} style={{ color: "var(--accent-blue)" }} />
            <strong style={{ color: "var(--text-strong)", fontSize: 16 }}>{selectedRoster.bus_number}</strong>
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{selectedRoster.route}</span>
            <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 13 }}>
              {selectedRoster.student_count} student{selectedRoster.student_count === 1 ? "" : "s"}
            </span>
          </div>
          {selectedRoster.students.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "32px 0", textAlign: "center" }}>
              No students assigned to this bus yet.
            </div>
          ) : (
            tableWrap(
              <>
                <thead>
                  <tr>
                    <th style={thStyle}>Roll No.</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Dept</th>
                    <th style={thStyle}>Year</th>
                    <th style={thStyle}>Phone</th>
                    <th style={thStyle}>Boarding Point</th>
                    {canManageBuses && <th style={thStyle} />}
                  </tr>
                </thead>
                <tbody>{selectedRoster.students.map((s) => renderStudentRow(s, false))}</tbody>
              </>
            )
          )}
        </div>
      ) : (
        // Overview: every bus as a card, with its student count
        <div>
          {loading ? (
            <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "32px 0", textAlign: "center" }}>Loading roster…</div>
          ) : roster.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "32px 0", textAlign: "center" }}>No buses yet.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(220px, 100%), 1fr))", gap: 14 }}>
              {roster.map((r) => (
                <button
                  key={r.bus_id} type="button" onClick={() => setSelectedBusId(r.bus_id)}
                  className="liquid-glass-card"
                  style={{
                    padding: 16, textAlign: "left", cursor: "pointer", border: "1px solid rgba(96,165,250,0.2)",
                    display: "flex", flexDirection: "column", gap: 8, font: "inherit",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-strong)", fontWeight: 700, fontSize: 15 }}>
                    <BusIcon size={16} style={{ color: "var(--accent-blue)" }} /> {r.bus_number}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{r.route}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent-green)", fontSize: 13, fontWeight: 600 }}>
                    <Users size={13} /> {r.student_count} student{r.student_count === 1 ? "" : "s"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <AddStudentModal
          buses={buses}
          defaultBusId={selectedRoster?.bus_id ?? null}
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
};

export default StudentsPage;
