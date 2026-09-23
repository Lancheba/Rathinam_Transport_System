import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Users, Plus, Trash2, Pencil, X, LoaderCircle, Bus as BusIcon, GraduationCap,
} from "lucide-react";
import { getMyBus, getStudents, createStudent, updateStudent, deleteStudent } from "../api/endpoints";
import { ClaimBusForm, inputStyle, labelStyle, primaryBtn, ghostBtn, errorText } from "./DriverAttendancePage";
import type { Bus, Student, StudentInput } from "../types";

const YEAR_LABEL: Record<number, string> = { 1: "1st Yr", 2: "2nd Yr", 3: "3rd Yr", 4: "4th Yr" };

type FormState = {
  name: string; roll_number: string; department: string; year: string;
  phone: string; email: string; boarding_point: string;
};
const EMPTY_FORM: FormState = { name: "", roll_number: "", department: "", year: "", phone: "", email: "", boarding_point: "" };

const toForm = (s: Student): FormState => ({
  name: s.name, roll_number: s.roll_number, department: s.department ?? "",
  year: s.year ? String(s.year) : "", phone: s.phone ?? "", email: s.email ?? "",
  boarding_point: s.boarding_point ?? "",
});

/* --------------------------------------------------------- Add/edit form */

const StudentForm: React.FC<{
  editing: Student | null;
  onDone: (s: Student) => void;
  onCancel: () => void;
}> = ({ editing, onDone, onCancel }) => {
  const [form, setForm] = useState<FormState>(editing ? toForm(editing) : EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setForm(editing ? toForm(editing) : EMPTY_FORM), [editing]);

  const set = <K extends keyof FormState>(key: K, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.roll_number.trim()) { setError("Name and roll number are required."); return; }
    setBusy(true); setError("");
    const payload: StudentInput = {
      name: form.name.trim(), roll_number: form.roll_number.trim(), department: form.department.trim(),
      year: form.year ? (Number(form.year) as 1 | 2 | 3 | 4) : null, phone: form.phone.trim(),
      email: form.email.trim(), boarding_point: form.boarding_point.trim(),
      bus: editing ? editing.bus : null, // ignored by the API for drivers — they can only ever act on their own bus
    };
    try {
      const saved = editing ? await updateStudent(editing.id, payload) : await createStudent(payload);
      onDone(saved);
    } catch (err) {
      setError(errorText(err, editing ? "Couldn't save those changes." : "Couldn't add that student."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="liquid-glass-card" style={{
      padding: 18, display: "flex", flexDirection: "column", gap: 12, marginBottom: 20,
      border: "1px solid rgba(99,102,241,0.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-strong)", fontWeight: 700 }}>
        {editing ? <Pencil size={16} /> : <Plus size={16} />}
        {editing ? `Edit ${editing.name}` : "Add a student to your cab"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        <label style={labelStyle}>Full name
          <input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={150} autoFocus disabled={busy} />
        </label>
        <label style={labelStyle}>Roll number
          <input style={inputStyle} value={form.roll_number} onChange={(e) => set("roll_number", e.target.value)} maxLength={30} disabled={busy} />
        </label>
        <label style={labelStyle}>Department
          <input style={inputStyle} value={form.department} onChange={(e) => set("department", e.target.value)} maxLength={100} disabled={busy} />
        </label>
        <label style={labelStyle}>Year
          <select style={inputStyle} value={form.year} onChange={(e) => set("year", e.target.value)} disabled={busy}>
            <option value="">Not set</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </label>
        <label style={labelStyle}>Phone
          <input style={inputStyle} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} disabled={busy} />
        </label>
        <label style={labelStyle}>Email
          <input style={inputStyle} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} disabled={busy} />
        </label>
        <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>Boarding point
          <input style={inputStyle} value={form.boarding_point} onChange={(e) => set("boarding_point", e.target.value)} maxLength={150} disabled={busy} />
        </label>
      </div>
      {error && <div role="alert" style={{ color: "var(--accent-red)", fontSize: 13 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
          {busy && <LoaderCircle size={15} className="spin" />}
          {editing ? "Save changes" : "Add student"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} style={ghostBtn}>
          <X size={14} /> Cancel
        </button>
      </div>
    </form>
  );
};

/* ------------------------------------------------------------- Page */

const DriverStudentsPage: React.FC = () => {
  const [bus, setBus] = useState<Bus | null | undefined>(undefined); // undefined = loading
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadStudents = () => {
    setLoading(true);
    getStudents()
      .then((data) => setStudents([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getMyBus()
      .then((res) => { setBus(res.bus); if (res.bus) loadStudents(); else setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const handleSaved = (s: Student) => {
    setShowForm(false); setEditing(null);
    setNotice(editing ? `${s.name} updated.` : `${s.name} added to your cab.`);
    loadStudents();
  };

  const handleDelete = async (s: Student) => {
    if (!window.confirm(`Remove ${s.name} (${s.roll_number}) from your cab?`)) return;
    setDeletingId(s.id);
    try {
      await deleteStudent(s.id);
      setNotice(`${s.name} removed.`);
      setStudents((prev) => prev.filter((x) => x.id !== s.id));
    } catch (err) {
      window.alert(axios.isAxiosError(err) ? errorText(err, "Couldn't remove that student.") : "Couldn't remove that student.");
    } finally {
      setDeletingId(null);
    }
  };

  if (bus === undefined || (loading && bus)) {
    return <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "32px 0", textAlign: "center" }}>Loading…</div>;
  }

  if (!bus) {
    return (
      <div>
        <h2 style={{ color: "var(--accent-blue)", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
          <Users size={20} strokeWidth={1.9} /> My Students
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 18 }}>
          Link your bus first — once it's set up, you can manage the students riding it.
        </p>
        <ClaimBusForm onClaimed={(b) => { setBus(b); loadStudents(); }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <h2 style={{ color: "var(--accent-blue)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <Users size={20} strokeWidth={1.9} /> My Students
        </h2>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 13 }}>
          <BusIcon size={14} /> {bus.bus_number} &middot; {students.length} student{students.length === 1 ? "" : "s"}
        </span>
        {!showForm && (
          <button type="button" onClick={() => { setEditing(null); setShowForm(true); }} style={{ ...primaryBtn, marginLeft: "auto" }}>
            <Plus size={15} /> Add student
          </button>
        )}
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 18 }}>
        Only students riding your own cab — you can't see or edit any other bus's roster.
      </p>

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

      {(showForm || editing) && (
        <StudentForm editing={editing} onDone={handleSaved} onCancel={() => { setShowForm(false); setEditing(null); }} />
      )}

      {loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "32px 0", textAlign: "center" }}>Loading roster…</div>
      ) : students.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "var(--text-muted)",
          fontSize: 14, padding: "40px 0", textAlign: "center",
        }}>
          <GraduationCap size={24} style={{ opacity: 0.6 }} />
          No students on your cab yet. Add the first one above.
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(96,165,250,0.15)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr>
                {["Roll No.", "Name", "Dept", "Year", "Phone", "Boarding Point", ""].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "10px 12px", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: 0.4, color: "var(--text-muted)", borderBottom: "1px solid rgba(96,165,250,0.15)",
                    background: "rgba(96,165,250,0.04)",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 13, padding: "8px 12px" }}>{s.roll_number}</td>
                  <td style={{ padding: "8px 12px" }}>{s.name}</td>
                  <td style={{ color: "var(--text-muted)", padding: "8px 12px" }}>{s.department || "—"}</td>
                  <td style={{ color: "var(--text-muted)", padding: "8px 12px" }}>{s.year ? YEAR_LABEL[s.year] : "—"}</td>
                  <td style={{ color: "var(--text-muted)", padding: "8px 12px" }}>{s.phone || "—"}</td>
                  <td style={{ color: "var(--text-muted)", padding: "8px 12px" }}>{s.boarding_point || "—"}</td>
                  <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                    <button
                      type="button" onClick={() => { setShowForm(false); setEditing(s); }}
                      aria-label={`Edit ${s.name}`}
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26,
                        borderRadius: 6, border: "1px solid rgba(96,165,250,0.25)", background: "rgba(96,165,250,0.06)",
                        color: "var(--accent-blue)", cursor: "pointer", marginRight: 6,
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button" onClick={() => handleDelete(s)} disabled={deletingId === s.id}
                      aria-label={`Remove ${s.name}`}
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26,
                        borderRadius: 6, border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.06)",
                        color: "var(--accent-red)", cursor: deletingId === s.id ? "default" : "pointer",
                        opacity: deletingId === s.id ? 0.5 : 1,
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

export default DriverStudentsPage;
