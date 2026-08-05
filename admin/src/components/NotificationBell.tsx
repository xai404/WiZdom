import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, Users } from 'lucide-react';
import { fetchMyNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notifications';
import { useInterval } from '../hooks/useInterval';
import { relativeTime } from './students/JourneyTab';
import type { AppNotification } from '../types';

const POLL_MS = 15000;

interface NotificationBellProps {
  // TopBar is light chrome, hence 'dark' icon color by default there — kept
  // as a prop in case this is ever placed on a dark-background surface.
  variant?: 'light' | 'dark';
}

const NotificationBell = ({ variant = 'light' }: NotificationBellProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = () => {
    fetchMyNotifications()
      .then((res) => {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      })
      .catch(() => {});
  };

  useInterval(() => {
    if (!document.hidden) load();
  }, POLL_MS);

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) load();
  };

  const handleItemClick = async (n: AppNotification) => {
    setOpen(false);
    if (!n.read) {
      markNotificationRead(n._id).catch(() => {});
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.student) navigate('/students', { state: { id: n.student._id } });
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await markAllNotificationsRead().catch(() => {});
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className={`relative rounded-lg p-2 transition-colors ${
          variant === 'light' ? 'text-brand-100 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100'
        }`}
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-(--shadow-panel)"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">Notifications</p>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    <CheckCheck size={13} />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
                    <Bell size={22} />
                    <p className="text-sm">Nothing tagged to your team yet.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n._id}
                      onClick={() => handleItemClick(n)}
                      className={`flex w-full flex-col gap-0.5 border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 ${
                        n.read ? '' : 'bg-brand-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                          <Users size={12} />
                          {n.department}
                        </span>
                        <span className="shrink-0 text-[10px] text-slate-400">{relativeTime(n.createdAt)}</span>
                      </div>
                      {n.student && <p className="text-xs font-medium text-slate-700">{n.student.name}</p>}
                      <p className="truncate text-xs text-slate-500">{n.body}</p>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
