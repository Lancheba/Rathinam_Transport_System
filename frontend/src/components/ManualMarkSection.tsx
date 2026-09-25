import React, { useEffect, useState, useCallback } from "react";
import { UserCheck, LoaderCircle, RefreshCw } from "lucide-react";
import api from "../api/client";
import {
  inputStyle, labelStyle, primaryBtn, ghostBtn, errorText,
} from "../pages/DriverAttendancePage";

interface RosterRow {
  id: number;
  name: string;
  roll_number: string;
  status: "PRESENT" | "ABSENT";
  source: string;
}

interface RosterData {
  session_open: boolean;
  students: RosterRow[];
}

const statusBadge = (status: string, source: string) => {
  const isManual = source === "MANUAL";
  const color =
    status === "PRESENT"
      ? "var(--accent-green, #22c55e)"
      : "var(--accent-red, #ef4444)";
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
      background: `${color}22`, color, marginLeft: 6, letterSpacing: 0.3,
    }}>
      {status}{isManual ? " · Manual" : ""}
    </span>
  );
};

const ManualMarkSection: React.FC = () => {
  const [roster, setRoster]         = useState<RosterRow[]>([]);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [error, setError]           = useState("");
  const [successId, setSuccessId]   = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [reason, setReason]         = useState("");
  const [markStatus, setMarkStatus] = useState<"PRESENT" | "ABSENT">("PRESENT");

  const fetchRoster = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<RosterData>("/attendance/qr/roster/");
      setRoster(res.data.students);
      setSessionOpen(res.data.session_open);
    } catch (e) {
      setError(errorText(e, "Could not load student roster."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoster(); }, [fetchRoster]);

  const handleMark = async () => {
    if (!selectedId) { setError("Select a student first."); return; }
    if (!reason.trim()) { setError("Enter a reason (required for manual marks)."); return; }
    setSubmitting(selectedId as number);
    setError("");
    try {
      await api.post("/attendance/qr/manual/", {
        student_id: selectedId,
        status: markStatus,
        reason: reason.trim(),
      });
      setSuccessId(selectedId as number);
      setSelectedId("");
      setReason("");
      await fetchRoster();
      setTimeout(() => setSuccessId(null), 3000);
    } catch (e) {
      setError(errorText(e, "Manual mark failed."));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div style={{
      border: "1px solid var(--border, #e5e7eb)", borderRadius: 12,
      padding: "1.25rem", marginTop: "1.5rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <UserCheck size={18} style={{ color: "var(--accent-amber, #f59e0b)" }} />
        <h3 style={{ margin: 0, color: "var(--text-strong)", fontSize: 15 }}>
          Manual mark
        </h3>
        <button
          onClick={fetchRoster}
          disabled={loading}
          title="Refresh roster"
          style={{ ...ghostBtn, marginLeft: "auto", padding: "4px 10px" }}
        >
          <RefreshCw size={13} style={loading ? { animation: "spin 1s linear infinite" } : {}} />
        </button>
      </div>

      {!sessionOpen && !loading && (
        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 10px" }}>
          No attendance session is open right now. Manual marks are only saved
          when a session is active.
        </p>
      )}

      {error && (
        <div role="alert" style={{ color: "var(--accent-red, #ef4444)", fontSize: 13, marginBottom: 10 }}>
          {error}
        </div>
      )}

      {successId && (
        <div role="status" style={{ color: "var(--accent-green, #22c55e)", fontSize: 13, marginBottom: 10 }}>
          Marked successfully.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 460 }}>
        <label style={labelStyle}>
          Student
          <select
            style={{ ...inputStyle, marginTop: 4 }}
            value={selectedId}
            onChange={e => setSelectedId(e.target.value ? Number(e.target.value) : "")}
            disabled={loading || roster.length === 0}
          >
            <option value="">— pick a student —</option>
            {roster.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.roll_number}) — {s.status}{s.source === "MANUAL" ? " · Manual" : ""}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Mark as
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {(["PRESENT", "ABSENT"] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setMarkStatus(s)}
                style={{
                  ...ghostBtn,
                  borderColor: markStatus === s ? "var(--accent-indigo, #6366f1)" : undefined,
                  background: markStatus === s ? "rgba(99,102,241,0.15)" : "transparent",
                  color: markStatus === s ? "var(--text-strong)" : "var(--text-muted)",
                  fontWeight: markStatus === s ? 700 : 600,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </label>

        <label style={labelStyle}>
          Reason <span style={{ fontWeight: 400, color: "var(--text-dim)" }}>(required)</span>
          <input
            style={inputStyle}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Phone battery dead, verified in person"
            maxLength={200}
          />
        </label>

        <button
          type="button"
          onClick={handleMark}
          disabled={!!submitting || !sessionOpen}
          style={{
            ...primaryBtn,
            opacity: (submitting || !sessionOpen) ? 0.55 : 1,
            justifyContent: "center",
          }}
        >
          {submitting ? <LoaderCircle size={15} className="spin" /> : <UserCheck size={15} />}
          &nbsp;Save manual mark
        </button>
      </div>

      {roster.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 8px", fontWeight: 600 }}>
            TODAY'S ROSTER
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {roster.map(s => (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", gap: 10, fontSize: 13,
                padding: "7px 12px", borderRadius: 8,
                background: "rgba(99,102,241,0.04)",
                border: "1px solid rgba(99,102,241,0.1)",
              }}>
                <span style={{ color: "var(--text-strong)", fontWeight: 600, flex: 1 }}>
                  {s.name}
                </span>
                <span style={{ color: "var(--text-dim)", fontSize: 12 }}>{s.roll_number}</span>
                {statusBadge(s.status, s.source)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualMarkSection;
