import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useLiveRefresh } from '../../live/LiveEvents';

/** Unread notifications for the signed-in user; refreshes live on any hand-off event. */
export const NotificationBell: React.FC<{ dark?: boolean }> = ({ dark = true }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<{ unread_count: number; items: any[] }>({ unread_count: 0, items: [] });
  const [open, setOpen] = useState(false);

  const load = () => api.get<any>('/notifications').then(setData).catch(() => undefined);
  useEffect(() => {
    load();
  }, []);
  useLiveRefresh('*', load);

  const openItem = async (n: any) => {
    setOpen(false);
    if (!n.is_read) await api.post(`/notifications/${n.id}/read`).catch(() => undefined);
    load();
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative px-2 py-1 rounded ${dark ? 'text-white/90 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'}`}
        aria-label={`Notifications (${data.unread_count} unread)`}
      >
        <i className="fa-solid fa-bell"></i>
        {data.unread_count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-rose-600 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {data.unread_count > 99 ? '99+' : data.unread_count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white text-gray-800 border border-gray-200 rounded-lg shadow-xl z-50 text-xs">
          <div className="flex justify-between items-center px-3 py-2 border-b">
            <strong>Notifications</strong>
            {data.unread_count > 0 && (
              <button onClick={() => api.post('/notifications/read-all').then(load)} className="text-odoo-primary underline">
                Mark all read
              </button>
            )}
          </div>
          {data.items.length === 0 ? (
            <div className="p-4 text-center text-gray-400">No notifications yet.</div>
          ) : (
            data.items.map((n) => (
              <button key={n.id} onClick={() => openItem(n)} className={`block w-full text-left px-3 py-2 border-b hover:bg-gray-50 ${n.is_read ? '' : 'bg-purple-50/60'}`}>
                <div className="font-semibold">{n.title}</div>
                <div className="text-gray-600">{n.message}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{new Date(n.created_at + 'Z').toLocaleString()}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
