import React, { useEffect, useState } from "react";
import { Users, Bus as BusIcon, GraduationCap } from "lucide-react";
import { getStudents } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import type { Student } from "../types";

const YEAR_LABEL: Record<number, string> = { 1: "1st Yr", 2: "2nd Yr", 3: "3rd Yr", 4: "4th Yr" };

/* ------------------------------------------------------------- Page */
/* Read-only: cab in-charges can view their own cab's roster. The bus is  */
/* assigned by an admin (not self-claimed) - the API scopes /students/    */
/* to the in-charge's own bus automatically.                              */

const InchargeStudentsPage: React.FC = () => {
  const { inchargeBusNumber } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!inchargeBusNumber) { setLoading(false); return; }
    setLoading(true);
    getStudents()
      .then((data) => setStudents([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .finally(() => setLoading(false));
  }, [inchargeBusNumber]);

  if (!inchargeBusNumber) {
    return (
      <div>
        <h2 style={{ color: "var(--accent-amber)", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
          <Users size={20} strokeWidth={1.9} /> My Bus
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 18 }}>
          No bus has been assigned to you yet. Ask an admin or transport staff to assign you as the in-charge of a cab.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <h2 style={{ color: "var(--accent-amber)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <Users size={20} strokeWidth={1.9} /> My Bus
        </h2>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 13 }}>
          <BusIcon size={14} /> {inchargeBusNumber} &middot; {students.length} student{students.length === 1 ? "" : "s"}
        </span>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 18 }}>
        Read-only: only students riding your own cab.
      </p>

      {loading ? (
        <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "32px 0", textAlign: "center" }}>Loading roster...</div>
      ) : students.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "var(--text-muted)",
          fontSize: 14, padding: "40px 0", textAlign: "center",
        }}>
          <GraduationCap size={24} style={{ opacity: 0.6 }} />
          No students on your cab yet.
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(96,165,250,0.15)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr>
                {["Roll No.", "Name", "Dept", "Year", "Phone", "Boarding Point"].map((h) => (
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
                  <td style={{ color: "var(--text-muted)", padding: "8px 12px" }}>{s.department || "-"}</td>
                  <td style={{ color: "var(--text-muted)", padding: "8px 12px" }}>{s.year ? YEAR_LABEL[s.year] : "-"}</td>
                  <td style={{ color: "var(--text-muted)", padding: "8px 12px" }}>{s.phone || "-"}</td>
                  <td style={{ color: "var(--text-muted)", padding: "8px 12px" }}>{s.boarding_point || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InchargeStudentsPage;
