import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../../services/notificationService';

const POLL_MS = 60_000; // gentle polling, paused while the tab is hidden (saves mobile data)

const NotificationBell = () => {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    if (document.hidden) return;
    fetchUnreadCount().then(setUnread).catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = window.setInterval(refreshCount, POLL_MS);
    return () => window.clearInterval(timer);
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        const data = await fetchNotifications();
        setItems(data.notifications);
        setUnread(data.unread);
      } catch {
        setItems([]);
      }
    }
  };

  const openItem = async (n: AppNotification) => {
    if (!n.readAt) {
      await markNotificationRead(n._id).catch(() => undefined);
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    await markAllNotificationsRead().catch(() => undefined);
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        className="relative rounded-full border border-stone-200 bg-white px-3 py-2 text-lg shadow-sm hover:bg-stone-50"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[85vw] rounded-2xl border border-stone-100 bg-white p-2 shadow-xl">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-semibold text-stone-800">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={() => void readAll()} className="text-xs font-semibold text-primary">
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-2 py-4 text-sm text-stone-500">You're all caught up.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((n) => (
                <li key={n._id}>
                  <button
                    type="button"
                    onClick={() => void openItem(n)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-stone-50 ${n.readAt ? 'text-stone-500' : 'font-semibold text-stone-900'}`}
                  >
                    {n.message}
                    <span className="mt-0.5 block text-xs font-normal text-stone-400">{new Date(n.createdAt).toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
