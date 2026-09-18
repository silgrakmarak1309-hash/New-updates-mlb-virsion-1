import React, { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Wallet,
  ArrowDownLeft,
  Package,
  AlertTriangle,
  Info,
  X,
  ExternalLink,
} from 'lucide-react';
import { AppNotification } from '../types';
import { fetchUserNotifications, markNotificationAsRead, AppToastPayload } from '../lib/notifications';

interface ToastItem extends AppToastPayload {
  id: string;
}

/**
 * Global reactive interactive toast notification listener and display
 */
export function GlobalToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastItem>;
      if (customEvent.detail) {
        const item = customEvent.detail;
        setToasts((prev) => [item, ...prev.slice(0, 4)]);

        // Auto remove
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== item.id));
        }, item.duration || 5000);
      }
    };

    window.addEventListener('mlb_app_toast', handleToastEvent);
    return () => window.removeEventListener('mlb_app_toast', handleToastEvent);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3">
      {toasts.map((toast) => {
        const isWallet = toast.type === 'wallet';
        const isPayout = toast.type === 'payout';
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        let borderClasses = 'border-slate-800 bg-slate-900 text-white';
        let icon = <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />;

        if (isWallet) {
          borderClasses = 'border-amber-500 bg-slate-950 text-white shadow-amber-500/20';
          icon = <Wallet className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />;
        } else if (isPayout) {
          borderClasses = 'border-emerald-500 bg-slate-950 text-white shadow-emerald-500/20';
          icon = <ArrowDownLeft className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />;
        } else if (isError) {
          borderClasses = 'border-rose-500 bg-rose-950/95 text-white shadow-rose-500/30';
          icon = <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />;
        } else if (isSuccess) {
          borderClasses = 'border-emerald-500 bg-slate-950 text-white shadow-emerald-500/20';
          icon = <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border-2 shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${borderClasses}`}
          >
            {icon}
            <div className="flex-1 min-w-0 pr-1">
              <div className="text-xs font-black tracking-wide uppercase">{toast.title}</div>
              <p className="text-xs text-slate-200 mt-0.5 leading-relaxed font-medium">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

interface NotificationBellProps {
  userId?: string;
  currentUser?: { id?: string } | null;
  variant?: 'light' | 'dark';
}

/**
 * Interactive Notification Bell with unread counter and dropdown drawer
 */
export function NotificationBell({ userId, currentUser, variant = 'light' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const effectiveUserId = userId || currentUser?.id;

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const items = await fetchUserNotifications(effectiveUserId);
      setNotifications(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    const handleNewNotif = (e: Event) => {
      const customEvent = e as CustomEvent<AppNotification>;
      if (customEvent.detail) {
        const item = customEvent.detail;
        if (!item.user_id || item.user_id === effectiveUserId) {
          setNotifications((prev) => [item, ...prev.filter((n) => n.id !== item.id)]);
        }
      }
    };

    const handleReadNotif = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail?.id) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === customEvent.detail.id ? { ...n, is_read: true } : n))
        );
      }
    };

    window.addEventListener('mlb_new_notification', handleNewNotif);
    window.addEventListener('mlb_notification_read', handleReadNotif);

    return () => {
      window.removeEventListener('mlb_new_notification', handleNewNotif);
      window.removeEventListener('mlb_notification_read', handleReadNotif);
    };
  }, [effectiveUserId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    notifications.forEach((n) => {
      if (!n.is_read) markNotificationAsRead(n.id);
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case 'wallet':
        return <Wallet className="w-4 h-4 text-amber-500" />;
      case 'payout':
        return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
      case 'order':
        return <Package className="w-4 h-4 text-orange-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        title="Notifications & Wallet Alerts"
        className={`relative p-2 rounded-xl border transition flex items-center justify-center cursor-pointer ${
          variant === 'dark'
            ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700'
            : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200 shadow-xs'
        }`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-black rounded-full min-w-[18px] text-center shadow-xs border-2 border-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-slate-900 animate-in fade-in zoom-in-95">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-orange-400" />
                <span className="font-bold text-xs">Notifications & Alerts</span>
                {unreadCount > 0 && (
                  <span className="bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 transition"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                  <Bell className="w-8 h-8 text-slate-300 mx-auto mb-1 stroke-1" />
                  <div>No notifications yet</div>
                  <div className="text-[10px]">You're all caught up with your wallet and orders!</div>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!item.is_read) markNotificationAsRead(item.id);
                    }}
                    className={`p-3.5 flex items-start gap-3 transition cursor-pointer hover:bg-slate-50 ${
                      !item.is_read ? 'bg-orange-50/40 font-semibold' : 'bg-white'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-normal">
                        {item.message}
                      </p>
                    </div>
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-2" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
