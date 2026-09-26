import React, { useEffect, useState } from "react";
import { FileText, Download, LoaderCircle } from "lucide-react";
import { getAttendanceReportPreview, exportAttendanceReport, getBuses } from "../api/endpoints";
import { inputStyle, labelStyle, ghostBtn, errorText } from "./DriverAttendancePage";
import { useAuth } from "../context/AuthContext";
import type { AttendanceReportPreview, Bus } from "../types";

/**
 * Attendance report for every role. The backend (/attendance/report/) auto-scopes
 * what each role may see: admin/staff can pick any bus, everyone else (driver,
 * in-charge, student) is locked to their own cab or their own record.
 */
const AttendanceReportPage: React.FC = () => {
  const { canManageBuses } = useAuth();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [busId, setBusId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [preview, setPreview] = useState<AttendanceReportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | "pdf" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (canManageBuses) getBuses().then(setBuses).catch(() => {});
  }, [canManageBuses]);

  const params = () => ({
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(canManageBuses && busId ? { bus: busId } : {}),
  });

  const loadPreview = async () => {
    setLoading(true);
    setError("");
    try {
      setPreview(await getAttendanceReportPreview(params()));
    } catch (err) {
      setError(errorText(err, "Couldn't load the report."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPreview(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = async (filetype: "csv" | "xlsx" | "pdf") => {
    setExporting(filetype);
    setError("");
    try {
      await exportAttendanceReport(filetype, params());
    } catch (err) {
      setError(errorText(err, "Couldn't export the report."));
    } finally {
      setExporting(null);
    }
  };

  return (
    <div>
      <h2 style={{ color: "var(--accent-indigo)", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
        <FileText size={20} strokeWidth={1.9} /> Attendance Report
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 18 }}>
        Roll number, bus, route, boarding point and attendance % per student — scoped to what your role can see.
      </p>

      <div className="liquid-glass-card st-card" style={{ padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
          <div>
            <label style={labelStyle}>From</label>
            <input type="date" style={inputStyle} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>To</label>
            <input type="date" style={inputStyle} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {canManageBuses && (
            <div>
              <label style={labelStyle}>Bus (optional)</label>
              <select style={inputStyle} value={busId} onChange={(e) => setBusId(e.target.value)}>
                <option value="">All buses</option>
                {buses.map((b) => (
                  <option key={b.id} value={b.id}>{b.bus_number}</option>
                ))}
              </select>
            </div>
          )}
          <button type="button" style={ghostBtn} onClick={loadPreview} disabled={loading}>
            {loading ? <LoaderCircle size={13} className="spin" /> : null} Apply Filters
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          {(["csv", "xlsx", "pdf"] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              style={ghostBtn}
              onClick={() => handleExport(fmt)}
              disabled={exporting !== null}
            >
              {exporting === fmt ? <LoaderCircle size={13} className="spin" /> : <Download size={13} />}
              {" "}Download {fmt.toUpperCase()}
            </button>
          ))}
        </div>

        {error && <p style={{ color: "var(--accent-red)", fontSize: 13, marginTop: 10 }}>{error}</p>}
      </div>

      <div className="liquid-glass-card st-card" style={{ padding: "18px 20px", overflowX: "auto" }}>
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading report…</p>
        ) : !preview || preview.rows.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No rows for this filter.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {preview.columns.map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: "left", padding: "8px 10px", color: "var(--text-muted)",
                      borderBottom: "1px solid rgb(var(--ov) / 0.12)", whiteSpace: "nowrap",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: "8px 10px", borderBottom: "1px solid rgb(var(--ov) / 0.06)", whiteSpace: "nowrap" }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AttendanceReportPage;
