import React, { useState } from "react";
import axios from "axios";
import { LoaderCircle, Send } from "lucide-react";
import { createAnnouncement } from "../api/endpoints";
import type { Announcement, AnnouncementInput, AnnouncementPriority } from "../types";
import { PRIORITY_META } from "./announcementMeta";

const TITLE_MAX = 120;
const MESSAGE_MAX = 1000;
const PRIORITIES: AnnouncementPriority[] = ["INFO", "IMPORTANT", "URGENT"];

interface Props {
  onPosted: (a: Announcement) => void;
  onCancel: () => void;
}

/** Turn a DRF error response into one readable line */
const errorText = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    if (!err.response) return "Can't reach the server. Check your connection and try again.";
    if (err.response.status === 401) return "Your session has expired. Please sign in again.";
    if (err.response.status === 403) return "Only admins and transport staff can post announcements.";
    const data = err.response.data as Record<string, unknown> | undefined;
    if (data && typeof data === "object") {
      for (const key of ["title", "message", "priority", "detail"]) {
        const v = data[key];
        if (Array.isArray(v) && v.length) return String(v[0]);
        if (typeof v === "string") return v;
      }
    }
  }
  return "Couldn't post the announcement. Please try again.";
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  background: "rgb(var(--ov) / 0.05)",
  border: "1px solid rgb(var(--ov) / 0.12)",
  color: "var(--text-strong)",
  fontSize: 12,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export const AnnouncementForm: React.FC<Props> = ({ onPosted, onCancel }) => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<AnnouncementPriority>("INFO");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = title.trim().length > 0 && message.trim().length > 0 && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    const body: AnnouncementInput = { title: title.trim(), message: message.trim(), priority };
    try {
      onPosted(await createAnnouncement(body));
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      aria-label="New announcement"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 10,
        marginBottom: 10,
        borderRadius: 10,
        background: "rgb(var(--ov) / 0.04)",
        border: "1px solid rgb(var(--ov) / 0.1)",
      }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={TITLE_MAX}
        placeholder="Title"
        aria-label="Announcement title"
        disabled={saving}
        autoFocus
        style={fieldStyle}
      />
      <div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MESSAGE_MAX}
          rows={3}
          placeholder="Write the message students will see…"
          aria-label="Announcement message"
          disabled={saving}
          style={{ ...fieldStyle, resize: "vertical", minHeight: 60, maxHeight: 160 }}
        />
        <div style={{ fontSize: 10, color: "var(--text-dim)", textAlign: "right", marginTop: 2 }}>
          {message.length}/{MESSAGE_MAX}
        </div>
      </div>

      <div role="radiogroup" aria-label="Priority" style={{ display: "flex", gap: 6 }}>
        {PRIORITIES.map((p) => {
          const meta = PRIORITY_META[p];
          const active = priority === p;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPriority(p)}
              disabled={saving}
              style={{
                flex: 1,
                padding: "6px 4px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                color: active ? meta.color : "var(--text-muted)",
                background: active ? meta.bg : "transparent",
                border: `1px solid ${active ? meta.color : "rgb(var(--ov) / 0.12)"}`,
              }}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div role="alert" style={{ fontSize: 11, color: "var(--accent-red)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          style={{
            padding: "7px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            background: "transparent",
            color: "var(--text-muted)",
            border: "1px solid rgb(var(--ov) / 0.12)",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.5,
            background: "var(--text-soft)",
            color: "var(--btn-fg)",
            border: "none",
          }}
        >
          {saving ? (
            <LoaderCircle size={13} style={{ animation: "spin 0.8s linear infinite" }} />
          ) : (
            <Send size={13} />
          )}
          {saving ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
};
