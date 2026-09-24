import React, { useEffect, useState } from "react";
import { Users, Bus as BusIcon, GraduationCap } from "lucide-react";
import { getMyBus, getStudents } from "../api/endpoints";
import { ClaimBusForm } from "./DriverAttendancePage";
import type { Bus, Student } from "../types";

const YEAR_LABEL: Record<number, string> = { 1: "1st Yr", 2: "2nd Yr", 3: "3rd Yr", 4: "4th Yr" };

/* ------------------------------------------------------------- Page */
/* Read-only: drivers can view their own cab's roster but can no longer  */
/* add, edit or remove students - that write access was removed here.    */

const DriverStudentsPage: React.FC = () => {
  const [bus, setBus] = useState<Bus | null | undefined>(undefined); // undefined = loading
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (bus === undefined || (loading && bus)) {
    return <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "32px 0", textAlign: "center" }}>Loading...</div>;
  }

  if (!bus) {
    return (
      <div>
        <h2 style={{ color: "var(--accent-blue)", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
          <Users size={20} strokeWidth={1.9} /> My Students
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 18 }}>
          Link your bus first - once it's set up, you can view the students riding it.
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
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 18 }}>
        Read-only: only students riding your own cab. Roster changes are made by the cab in-charge or transport staff.
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

export default DriverStudentsPage;
