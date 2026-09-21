import React, { useCallback, useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { assignVisionTrack, getBuses, getVisionTracks } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { relativeTime } from "../utils/time";
import type { Bus, VisionTrack } from "../types";

/**
 * What the camera (YOLO) currently sees. Each row is one vehicle it is following.
 * A track shows "Unidentified" until an RFID entry is matched to it; staff can fix
 * that here by choosing the bus — this is the human-in-the-loop correction step.
 */
const VisionTracksPanel: React.FC = () => {
  const { canManageBuses } = useAuth();
  const [tracks, setTracks] = useState<VisionTrack[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    getVisionTracks().then(setTracks).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (canManageBuses) getBuses().then(setBuses).catch(() => {});
  }, [canManageBuses]);

  const assign = async (track: VisionTrack) => {
    const busId = Number(picked[track.id]);
    if (!busId) {
      setError("Choose a bus first.");
      return;
    }
    setError("");
    setBusyId(track.id);
    try {
      await assignVisionTrack(track.id, busId);
      load();
    } catch {
      setError("Could not assign that bus. Check you are logged in as staff.");
    } finally {
      setBusyId(null);
    }
  };

  const unidentified = tracks.filter((t) => !t.bus).length;

  return (
    <div style={{ marginTop: 28 }}>
      <h3 style={{ color: "var(--accent-violet)", display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Camera size={18} strokeWidth={1.9} /> Camera tracking
      </h3>
      <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 12px" }}>
        {tracks.length} vehicle(s) in view
        {unidentified > 0 && (
          <span style={{ color: "var(--accent-red)", fontWeight: 700 }}> · {unidentified} unidentified</span>
        )}
      </p>
      {error && <div role="alert" style={{ color: "var(--accent-red)", fontSize: 12, marginBottom: 8 }}>{error}</div>}

      {tracks.length === 0 ? (
        <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
          No vehicles tracked yet. Start <code>edge/vision_tracker.py</code> to feed the camera in.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: 12 }}>
          {tracks.map((t) => (
            <div key={t.id} className="liquid-glass-card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <strong style={{ color: t.bus ? "var(--text-strong)" : "var(--accent-red)" }}>
                  {t.bus_number ?? "Unidentified"}
                </strong>
                <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "monospace" }}>
                  {t.camera_id} #{t.track_id}
                </span>
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
                <div>Slot: <strong style={{ color: "var(--text-soft)" }}>{t.slot_label ?? "moving / not settled"}</strong></div>
                <div>Position: {t.x_m.toFixed(1)} m, {t.y_m.toFixed(1)} m</div>
                <div>Confidence: {Math.round(t.confidence * 100)}%</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Seen {relativeTime(t.last_seen)}</div>
              </div>
              {!t.bus && canManageBuses && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <select
                    aria-label={`Bus for track ${t.track_id}`}
                    value={picked[t.id] ?? ""}
                    onChange={(e) => setPicked((p) => ({ ...p, [t.id]: e.target.value }))}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <option value="">Which bus?</option>
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>{b.bus_number}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => assign(t)} disabled={busyId === t.id}>
                    Assign
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VisionTracksPanel;
