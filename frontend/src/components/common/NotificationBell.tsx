import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useLiveRefresh } from '../../live/LiveEvents';

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; badge: string }> = {
  CRM: { label: 'CRM', icon: 'fa-user-tie', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  Surveys: { label: 'Surveys', icon: 'fa-calendar-check', badge: 'bg-teal-100 text-teal-800 border-teal-200' },
  Installation: { label: 'Installation', icon: 'fa-tools', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  Orders: { label: 'Orders', icon: 'fa-box', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  Helpdesk: { label: 'Helpdesk', icon: 'fa-headset', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  Finance: { label: 'Finance', icon: 'fa-file-invoice-dollar', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  General: { label: 'General', icon: 'fa-bell', badge: 'bg-gray-100 text-gray-800 border-gray-200' },
};

const TABS = ['All', 'CRM', 'Surveys', 'Installation', 'Orders', 'Helpdesk'];

/** Dashboard-categorized notifications for the signed-in user. */
export const NotificationBell: React.FC<{ dark?: boolean }> = ({ dark = true }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<{ unread_count: number; items: any[] }>({ unread_count: 0, items: [] });
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const load = () => api.get<any>('/notifications').then(setData).catch(() => undefined);

  useEffect(() => {
    load();
  }, []);

  useLiveRefresh('*', load);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const openItem = async (n: any) => {
    setOpen(false);
    if (!n.is_read) await api.post(`/notifications/${n.id}/read`).catch(() => undefined);
    load();
    if (n.link) navigate(n.link);
  };

  const filteredItems = activeTab === 'All'
    ? data.items
    : data.items.filter((item) => (item.category || 'General').toLowerCase() === activeTab.toLowerCase());

  const getUnreadInTab = (tab: string) => {
    if (tab === 'All') return data.unread_count;
    return data.items.filter((item) => !item.is_read && (item.category || 'General').toLowerCase() === tab.toLowerCase()).length;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`relative px-2.5 py-1.5 rounded transition-colors ${
          dark ? 'text-white/90 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
        }`}
        aria-label={`Notifications (${data.unread_count} unread)`}
      >
        <i className="fa-solid fa-bell text-sm"></i>
        {data.unread_count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-rose-600 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center animate-pulse">
            {data.unread_count > 99 ? '99+' : data.unread_count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-[480px] flex flex-col bg-white text-gray-800 border border-gray-200 rounded-xl shadow-2xl z-50 text-xs overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50/70">
            <div className="flex items-center gap-2">
              <strong className="text-gray-900 font-bold text-sm">Notifications</strong>
              {data.unread_count > 0 && (
                <span className="bg-rose-100 text-rose-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-rose-200">
                  {data.unread_count} new
                </span>
              )}
            </div>
            {data.unread_count > 0 && (
              <button
                onClick={() => api.post('/notifications/read-all').then(load)}
                className="text-xs font-semibold text-[#714B67] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Dashboard Module Filter Tabs */}
          <div className="flex items-center space-x-1 px-3 py-2 border-b bg-gray-50/40 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => {
              const unreadInTab = getUnreadInTab(tab);
              const isActive = activeTab === tab;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#714B67] text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-200/60'
                  }`}
                >
                  <span>{tab}</span>
                  {unreadInTab > 0 && (
                    <span
                      className={`text-[9px] px-1 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'
                      }`}
                    >
                      {unreadInTab}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Notification Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 max-h-80">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <i className="fa-regular fa-bell-slash text-2xl mb-2 text-gray-300 block"></i>
                <span>No notifications in {activeTab === 'All' ? 'any dashboard' : activeTab}.</span>
              </div>
            ) : (
              filteredItems.map((n) => {
                const cat = n.category || 'General';
                const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG['General'];

                return (
                  <button
                    key={n.id}
                    onClick={() => openItem(n)}
                    className={`block w-full text-left p-3.5 hover:bg-purple-50/40 transition-colors ${
                      n.is_read ? 'bg-white opacity-80' : 'bg-purple-50/70 border-l-3 border-[#714B67]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${config.badge}`}
                        >
                          <i className={`fa-solid ${config.icon} text-[9px]`}></i>
                          <span>{config.label}</span>
                        </span>
                        {!n.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {new Date(n.created_at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="font-semibold text-gray-900 leading-snug">{n.title}</div>
                    <div className="text-gray-600 text-[11px] mt-0.5 leading-relaxed line-clamp-2">
                      {n.message}
                    </div>

                    <div className="text-[10px] text-gray-400 mt-1.5 flex items-center justify-between">
                      <span>{new Date(n.created_at + 'Z').toLocaleDateString()}</span>
                      {n.link && (
                        <span className="text-[#714B67] font-semibold flex items-center gap-1">
                          <span>View Details</span>
                          <i className="fa-solid fa-arrow-right text-[9px]"></i>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
