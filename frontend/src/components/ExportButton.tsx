import React, { useState } from "react";
import { Download } from "lucide-react";
import api from "../api/client";

type ParamValue = string | number | null | undefined;

interface ExportButtonProps {
  /** Extra filters sent to the report endpoint, e.g. { bus: 3 } or { student: 12 }. */
  params?: Record<string, ParamValue>;
  /** Hide the from/to date pickers if a page doesn't need them. */
  showDates?: boolean;
}

/**
 * One reusable attendance + student-detail download control (PDF or CSV).
 * The server decides what the person is allowed to export, so the same
 * button works on the Admin, Staff, In-Charge and Student pages.
 */
export const ExportButton: React.FC<ExportButtonProps> = ({ params = {}, showDates = true }) => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState<"pdf" | "csv" | null>(null);

  const download = async (filetype: "pdf" | "csv") => {
    setBusy(filetype);
    try {
      const query: Record<string, string> = { filetype };
      for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined && value !== "") query[key] = String(value);
      }
      if (from) query.from = from;
      if (to) query.to = to;

      const res = await api.get("/attendance/report/", { params: query, responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance_report.${filetype}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("Couldn't download the report. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const dateStyle: React.CSSProperties = {
    padding: "8px 10px", borderRadius: 8, fontSize: 13, color: "var(--text-strong)",
    border: "1px solid rgba(96,165,250,0.2)", background: "rgba(96,165,250,0.05)",
  };
  const btnStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px",
    fontSize: 13, fontWeight: 600, color: "var(--text-strong)", background: "transparent",
    border: "1px solid rgba(96,165,250,0.35)", borderRadius: 8, whiteSpace: "nowrap",
    cursor: active ? "default" : "pointer", opacity: active ? 0.6 : 1,
  });

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      {showDates && (
        <>
          <input type="date" aria-label="Report from date" value={from} max={to || undefined}
            onChange={(e) => setFrom(e.target.value)} style={dateStyle} />
          <input type="date" aria-label="Report to date" value={to} min={from || undefined}
            onChange={(e) => setTo(e.target.value)} style={dateStyle} />
        </>
      )}
      <button type="button" onClick={() => download("pdf")} disabled={busy !== null} style={btnStyle(busy === "pdf")}>
        <Download size={14} /> {busy === "pdf" ? "Preparing..." : "PDF"}
      </button>
      <button type="button" onClick={() => download("csv")} disabled={busy !== null} style={btnStyle(busy === "csv")}>
        <Download size={14} /> {busy === "csv" ? "Preparing..." : "CSV"}
      </button>
    </div>
  );
};
