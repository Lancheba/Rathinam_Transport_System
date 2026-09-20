import { useCallback, useEffect, useState } from "react";
import { getAnnouncements } from "../api/endpoints";
import type { Announcement } from "../types";

const SEEN_KEY = "announcements_seen_at";
const POLL_MS = 30_000;

const readSeenAt = (): number => {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
};

/**
 * Loads announcements, keeps them fresh, and tracks which ones this browser has
 * already looked at (so the bell can show an unread dot).
 */
export function useAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [seenAt, setSeenAt] = useState(readSeenAt);

  const reload = useCallback(
    () =>
      getAnnouncements()
        .then(setItems)
        .catch(() => {
          // keep whatever we already have if the server can't be reached
        }),
    []
  );

  useEffect(() => {
    reload();
    const id = setInterval(() => {
      if (!document.hidden) reload();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [reload]);

  const unread = items.filter((a) => Date.parse(a.created_at) > seenAt).length;

  /** Call while the person is looking at the list */
  const markSeen = useCallback(() => {
    const newest = items.reduce((m, a) => Math.max(m, Date.parse(a.created_at)), 0);
    if (newest <= seenAt) return;
    setSeenAt(newest);
    try {
      localStorage.setItem(SEEN_KEY, String(newest));
    } catch {
      // private mode etc.: the dot just comes back next visit
    }
  }, [items, seenAt]);

  return { items, unread, reload, markSeen };
}
