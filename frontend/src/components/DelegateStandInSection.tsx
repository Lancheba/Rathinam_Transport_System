import React, { useCallback, useEffect, useState } from "react";
import { UserCog, LoaderCircle, RefreshCw } from "lucide-react";
import api from "../api/client";
import { getInchargeDelegateStatus, setInchargeDelegate, endInchargeDelegate } from "../api/endpoints";
import type { InchargeDelegateStatus } from "../api/endpoints";
import {
  inputStyle, labelStyle, primaryBtn, ghostBtn, errorText,
} from "../pages/DriverAttendancePage";

interface RosterRow {
  id: number;
  name: string;
  roll_number: string;
}

interface RosterData {
  session_open: boolean;
  students: RosterRow[];
}

const DelegateStandInSection: React.FC = () => {
  const [status, setStatus]         = useState<InchargeDelegateStatus | null>(null);
  const [roster, setRoster]         = useState<RosterRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [loading, setLoading]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [notice, setNotice]         = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statusRes, rosterRes] = await Promise.all([
        getInchargeDelegateStatus(),
        api.get<RosterData>("/attendance/qr/roster/"),
      ]);
      setStatus(statusRes);
      setRoster(rosterRes.data.students);
    } catch (e) {
      setError(errorText(e, "Could not load stand-in status."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleHandOff = async () => {
    if (!selectedId) { setError("Select a student first."); return; }
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const res = await setInchargeDelegate(selectedId as number);
      setStatus(res);
      setSelectedId("");
      setNotice("Handed off for today.");
      setTimeout(() => setNotice(""), 3000);
    } catch (e) {
      setError(errorText(e, "Could not hand off attendance duties."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnd = async () => {
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await endInchargeDelegate();
      setStatus({ active: false });
      setNotice("Delegation ended.");
      setTimeout(() => setNotice(""), 3000);
    } catch (e) {
      setError(errorText(e, "Could not end the delegation."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      border: "1px solid var(--border, #e5e7eb)", borderRadius: 12,
      padding: "1.25rem", marginTop: "1.5rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <UserCog size={18} style={{ color: "var(--accent-amber, #f59e0b)" }} />
        <h3 style={{ margin: 0, color: "var(--text-strong)", fontSize: 15 }}>
          I'm absent today
        </h3>
        <button
          onClick={fetchAll}
          disabled={loading}
          title="Refresh"
          style={{ ...ghostBtn, marginLeft: "auto", padding: "4px 10px" }}
        >
          <RefreshCw size={13} style={loading ? { animation: "spin 1s linear infinite" } : {}} />
        </button>
      </div>

      <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 10px" }}>
        Hand off today's QR/manual attendance, roster and analytics access to a
        student on your cab. This only lasts for today.
      </p>

      {error && (
        <div role="alert" style={{ color: "var(--accent-red, #ef4444)", fontSize: 13, marginBottom: 10 }}>
          {error}
        </div>
      )}

      {notice && (
        <div role="status" style={{ color: "var(--accent-green, #22c55e)", fontSize: 13, marginBottom: 10 }}>
          {notice}
        </div>
      )}

      {status?.active ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ color: "var(--text-strong)", fontSize: 14 }}>
            Standing in today: <strong>{status.name}</strong> ({status.roll_number})
          </span>
          <button
            type="button"
            onClick={handleEnd}
            disabled={submitting}
            style={{ ...ghostBtn, opacity: submitting ? 0.55 : 1 }}
          >
            {submitting ? <LoaderCircle size={14} className="spin" /> : null}
            &nbsp;End delegation
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 460 }}>
          <label style={labelStyle}>
            Student
            <select
              style={{ ...inputStyle, marginTop: 4 }}
              value={selectedId}
              onChange={e => setSelectedId(e.target.value ? Number(e.target.value) : "")}
              disabled={loading || roster.length === 0}
            >
              <option value="">-- pick a student --</option>
              {roster.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.roll_number})
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleHandOff}
            disabled={submitting || !selectedId}
            style={{
              ...primaryBtn,
              opacity: (submitting || !selectedId) ? 0.55 : 1,
              justifyContent: "center",
            }}
          >
            {submitting ? <LoaderCircle size={15} className="spin" /> : <UserCog size={15} />}
            &nbsp;Hand off for today
          </button>
        </div>
      )}
    </div>
  );
};

export default DelegateStandInSection;
