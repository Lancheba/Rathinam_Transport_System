import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { deleteAnnouncement } from "../api/endpoints";
import type { Announcement } from "../types";
import { relativeTime } from "../utils/time";
import { AnnouncementForm } from "./AnnouncementForm";
import { PRIORITY_META } from "./announcementMeta";

interface Props {
  items: Announcement[];
  /** Admins and transport staff get the "New announcement" button */
  canPost: boolean;
  /** Re-fetch the list after posting or deleting */
  onChanged: () => void;
}

export const AnnouncementsTab: React.FC<Props> = ({ items, canPost, onChanged }) => {
  const [composing, setComposing] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const remove = async (id: number) => {
    setBusyId(id);
    setDeleteError("");
    try {
      await deleteAnnouncement(id);
      setConfirmId(null);
      onChanged();
    } catch {
      setDeleteError("Couldn't delete that announcement. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      {canPost &&
        (composing ? (
          <AnnouncementForm
            onCancel={() => setComposing(false)}
            onPosted={() => {
              setComposing(false);
              onChanged();
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setComposing(true)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "9px 10px",
              marginBottom: 10,
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              color: "var(--text-soft)",
              background: "rgb(var(--ov) / 0.05)",
              border: "1px dashed rgb(var(--ov) / 0.25)",
            }}
          >
            <Plus size={14} /> New announcement
          </button>
        ))}

      {deleteError && (
        <div role="alert" style={{ fontSize: 11, color: "var(--accent-red)", marginBottom: 8 }}>
          {deleteError}
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ color: "var(--text-dim)", fontSize: 12, textAlign: "center", padding: "24px 0" }}>
          No announcements yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((a) => {
            const meta = PRIORITY_META[a.priority] ?? PRIORITY_META.INFO;
            const Icon = meta.icon;
            const loud = a.priority !== "INFO";
            return (
              <article
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: 10,
                  borderRadius: 10,
                  background: loud ? meta.bg : "rgb(var(--ov) / 0.03)",
                  border: `1px solid ${loud ? meta.color : "rgb(var(--ov) / 0.05)"}`,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: meta.bg,
                    color: meta.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <Icon size={14} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-strong)", overflowWrap: "anywhere" }}>
                      {a.title}
                    </span>
                    {loud && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: meta.color,
                          border: `1px solid ${meta.color}`,
                          borderRadius: 4,
                          padding: "1px 5px",
                          textTransform: "uppercase",
                        }}
                      >
                        {meta.label}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-soft)",
                      marginTop: 3,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      lineHeight: 1.4,
                    }}
                  >
                    {a.message}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 5 }}>
                    <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>{a.author_name}</span>
                    {" · "}
                    {a.author_role}
                    {" · "}
                    {relativeTime(a.created_at)}
                  </div>

                  {confirmId === a.id && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 11 }}>
                      <span style={{ color: "var(--text-muted)" }}>Delete this announcement?</span>
                      <button
                        type="button"
                        onClick={() => remove(a.id)}
                        disabled={busyId === a.id}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          color: "var(--accent-red)",
                          background: "none",
                          border: "none",
                          padding: 0,
                        }}
                      >
                        {busyId === a.id ? "Deleting…" : "Delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        disabled={busyId === a.id}
                        style={{
                          fontSize: 11,
                          cursor: "pointer",
                          color: "var(--text-muted)",
                          background: "none",
                          border: "none",
                          padding: 0,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {a.can_edit && confirmId !== a.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError("");
                      setConfirmId(a.id);
                    }}
                    title="Delete announcement"
                    aria-label={`Delete announcement: ${a.title}`}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-dim)",
                      padding: 4,
                      display: "flex",
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
};
