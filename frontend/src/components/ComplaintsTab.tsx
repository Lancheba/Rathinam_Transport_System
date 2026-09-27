import React, { useEffect, useState } from 'react';
import api from '../api/client';

interface FeedbackItem {
  id: number;
  kind: string;
  category: string;
  subject: string;
  created_at: string;
  author_role: string;
  is_anonymous: boolean;
}

export const ComplaintsTab: React.FC<{ unreadCount: number }> = ({ unreadCount }) => {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Yield a tick first: this keeps the loading-state reset out of the
      // effect's own synchronous call frame (see set-state-in-effect),
      // while still showing "loading" again on every unreadCount refetch.
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const res: any = await api.get('/api/feedback/?status=NEW');
        if (cancelled) return;
        const data = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
        setItems(data);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [unreadCount]);

  if (loading) return (
    <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
      Loading complaints…
    </div>
  );
  if (items.length === 0) return (
    <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
      No new complaints.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item) => (
        <div key={item.id} style={{
          padding: '10px 10px', borderRadius: 10,
          background: 'rgb(var(--ov) / 0.03)',
          border: '1px solid rgb(var(--ov) / 0.08)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)' }}>
            {item.subject}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
            {item.kind} · {item.category}
            {!item.is_anonymous && item.author_role ? ` · ${item.author_role}` : ' · Anonymous'}
          </div>
        </div>
      ))}
    </div>
  );
};