/**
 * ==============================================================================
 * WebintoApp Direct Push Notification & Plan Expiry Service (Frontend Client)
 * ==============================================================================
 * Enables direct client-side push notification dispatch via WebintoApp REST API
 * without relying on command line terminals or edge function deployments.
 * ==============================================================================
 */

import { supabase, getEnvVar } from './supabase';
import { AppNotification } from '../types';

export interface AppToastPayload {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning' | 'wallet' | 'payout';
  duration?: number;
}

/**
 * Dispatches a real-time reactive toast alert to the global viewport
 */
export function dispatchAppToast(toast: AppToastPayload) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('mlb_app_toast', {
        detail: {
          id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          ...toast,
          duration: toast.duration || 5000,
        },
      })
    );
  }
}

/**
 * ==============================================================================
 * Native Device Status Bar Push Notification Engine (Android & Desktop)
 * ==============================================================================
 */
let swRegistration: ServiceWorkerRegistration | null = null;

export async function initPushNotifications(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;

  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('[Push Engine] Service Worker registered successfully:', swRegistration.scope);
    } catch (err) {
      console.warn('[Push Engine] Service Worker registration failed:', err);
    }
  }

  // Request browser Notification permission if not yet decided
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (_) {}
    }
  }

  return swRegistration;
}

// Auto-initialize service worker on module import in browser
if (typeof window !== 'undefined') {
  initPushNotifications().catch(() => {});
}

/**
 * FEATURE: Push visible alert directly to Android/Device System Status Bar interface
 */
export async function showDevicePushAlert(
  title: string,
  message: string,
  options?: {
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
    vibrate?: number[];
  }
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const iconUrl = options?.icon || '/app_logo.png';
  const badgeUrl = options?.badge || '/app_logo.png';
  const vibratePattern = options?.vibrate || [200, 100, 200];
  const tag = options?.tag || `mlb_${Date.now()}`;

  // 1. Device Haptic Vibration
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(vibratePattern);
    }
  } catch (_) {}

  // 2. Check & Request Notification Permission
  if ('Notification' in window) {
    let permission = Notification.permission;
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission();
      } catch (_) {}
    }

    if (permission === 'granted') {
      // 2a. Priority: Service Worker Registration (Required on Android for system drawer alerts)
      if ('serviceWorker' in navigator) {
        try {
          const reg =
            swRegistration ||
            (await navigator.serviceWorker.getRegistration()) ||
            (await navigator.serviceWorker.ready);

          if (reg && reg.showNotification) {
            await reg.showNotification(title, {
              body: message,
              icon: iconUrl,
              badge: badgeUrl,
              vibrate: vibratePattern,
              tag: tag,
              renotify: true,
              data: options?.data || { url: '/' },
            } as any);
            return true;
          }
        } catch (swErr) {
          console.warn('[Push] SW showNotification failed, trying fallback:', swErr);
        }
      }

      // 2b. Fallback: Direct window Notification constructor
      try {
        new Notification(title, {
          body: message,
          icon: iconUrl,
          badge: badgeUrl,
          tag: tag,
        });
        return true;
      } catch (notifErr) {
        console.warn('[Push] Window Notification constructor fallback failed:', notifErr);
      }
    }
  }

  return false;
}

// WebintoApp Configuration
const WEBINTOAPP_API_URL = 'https://www.webintoapp.com/api/v2/push/send';

// Fetch credentials from Vite env or fallback configuration
export const WEBINTOAPP_API_KEY =
  getEnvVar('VITE_WEBINTOAPP_API_KEY') ||
  getEnvVar('VITE_WEB_INTO_APP_API_KEY') ||
  '';

export const WEBINTOAPP_APP_ID =
  getEnvVar('VITE_WEBINTOAPP_APP_ID') ||
  getEnvVar('VITE_WEB_INTO_APP_APP_ID') ||
  '';

export interface PushNotificationResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

/**
 * FEATURE 1: Direct WebintoApp Push Notification Dispatcher
 * @param partnerUserId - Supabase User UUID or external user ID
 * @param title - Notification title
 * @param message - Notification body
 * @param extraData - Custom metadata payload
 */
export async function sendPushNotification(
  partnerUserId?: string,
  title: string = 'New Notification 🔔',
  message: string = 'Aapke account par ek naya notification aaya hai.',
  extraData: Record<string, any> = {}
): Promise<PushNotificationResponse> {
  console.log(`[PushNotification] Dispatching alert to ${partnerUserId || 'Broadcast'}:`, {
    title,
    message,
    extraData,
  });

  const payload: Record<string, any> = {
    api_key: WEBINTOAPP_API_KEY,
    app_id: WEBINTOAPP_APP_ID,
    title: title,
    message: message,
    data: {
      ...extraData,
      timestamp: new Date().toISOString(),
      source: 'meri_local_bazaar_client',
    },
  };

  if (partnerUserId) {
    payload.user_id = partnerUserId;
    payload.external_id = partnerUserId;
  }

  // If no API key configured yet, log safely and simulate success
  if (!WEBINTOAPP_API_KEY) {
    console.warn(
      '[PushNotification Notice] WEBINTOAPP_API_KEY not configured in env yet. Notification simulated locally:',
      { title, message, partnerUserId }
    );
    return {
      success: true,
      message: 'Simulated (Add VITE_WEBINTOAPP_API_KEY to enable live device push)',
    };
  }

  try {
    const response = await fetch(WEBINTOAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': WEBINTOAPP_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    console.log('[PushNotification API Result]', response.status, result);

    return {
      success: response.ok,
      data: result,
      message: response.ok ? 'Push notification sent successfully' : result?.message || 'Failed',
    };
  } catch (error: any) {
    console.error('[PushNotification Error]', error);
    return {
      success: false,
      error: error?.message || 'Network error while sending push notification',
    };
  }
}

/**
 * Returns role-tailored automatic alert messages for order events
 */
export function getRoleOrderAlert(
  role?: string,
  orderNumber?: string
): { title: string; message: string } {
  const normalized = (role || '').toLowerCase().trim();

  switch (normalized) {
    case 'seller':
    case 'shop':
    case 'shop_owner':
      return {
        title: '🎉 Naya Order Aaya Hai!',
        message:
          '🎉 Hurray! Aapki shop par ek naya prepaid order aaya hai. Kripya app open karke check karein.',
      };

    case 'driver':
    case 'cab':
    case 'taxi':
    case 'auto':
      return {
        title: '🚕 Nayi Booking Alert!',
        message:
          '🚕 Nayi Booking Alert! Aapke aaspas ek customer ko ride chahiye, turant accept karein.',
      };

    case 'delivery_boy':
    case 'delivery_partner':
    case 'delivery':
      return {
        title: '📦 New Delivery Assign!',
        message:
          '📦 New Delivery Assign! Aapko ek naya package deliver karne ke liye mila hai.',
      };

    case 'service_provider':
    case 'local_service':
    case 'electrician':
    case 'plumber':
    case 'mechanic':
      return {
        title: '🛠️ New Job Alert!',
        message:
          '🛠️ New Job Alert! Ek customer ne aapko service ke liye request bheji hai.',
      };

    default:
      return {
        title: 'New Order Alert! 🔔',
        message: orderNumber
          ? `Aapko order #${orderNumber} mila hai! Kripya app open karke check karein.`
          : 'Aapko ek naya order mila hai!',
      };
  }
}

/**
 * Helper to notify a partner with role-specific template
 */
export async function sendOrderAlertToPartner(
  partnerUserId?: string,
  role?: string,
  orderNumber?: string,
  extraData: Record<string, any> = {}
) {
  const alert = getRoleOrderAlert(role, orderNumber);
  return sendPushNotification(partnerUserId, alert.title, alert.message, {
    action: 'new_order',
    role,
    order_number: orderNumber,
    ...extraData,
  });
}

/**
 * FEATURE 2: 3-DAYS PLAN EXPIRY ALERT (Direct Frontend Supabase Check)
 * Scans active profiles in Supabase whose plan_expiry_date or pro_expiry is within 3 days
 * and dispatches automatic push notifications to their devices.
 */
export async function checkAndSend3DaysPlanExpiryAlerts(): Promise<{
  checked: boolean;
  totalAlerts: number;
  details: any[];
}> {
  if (!supabase) {
    console.warn('[PlanExpiryCheck] Supabase client not initialized.');
    return { checked: false, totalAlerts: 0, details: [] };
  }

  // Prevent multiple executions in the same browser session per day
  const storageKey = `mlb_expiry_checked_${new Date().toISOString().split('T')[0]}`;
  try {
    if (localStorage.getItem(storageKey)) {
      console.log('[PlanExpiryCheck] Daily plan expiry scan already completed for today.');
      return { checked: true, totalAlerts: 0, details: [] };
    }
  } catch (_) {}

  console.log('[PlanExpiryCheck] Checking for partners whose plans expire in 3 days...');

  try {
    // Current date & 3 days future ISO dates
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const threeDaysDate = new Date();
    threeDaysDate.setDate(threeDaysDate.getDate() + 3);
    const threeDaysStr = threeDaysDate.toISOString().split('T')[0];
    const threeDaysIso = threeDaysDate.toISOString();

    // Query active partner profiles expiring within the next 3 days
    const { data: expiringProfiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, email, role, plan_expiry_date, pro_expiry, is_pro')
      .or(
        `plan_expiry_date.gte.${todayStr},plan_expiry_date.lte.${threeDaysIso},pro_expiry.gte.${todayStr},pro_expiry.lte.${threeDaysStr}`
      );

    if (error) {
      console.warn('[PlanExpiryCheck Query Warning]', error.message);
    }

    const partners = expiringProfiles || [];
    console.log(`[PlanExpiryCheck] Found ${partners.length} partner(s) eligible for expiry alert.`);

    const results = [];
    const expiryTitle = '⚠️ Plan Expiry Alert!';
    const expiryMessage =
      '⚠️ Important: Aapka Meri Local Bazaar partner plan agle 3 dino mein expire hone wala hai. Kripya renew karein.';

    for (const partner of partners) {
      if (!partner.id) continue;

      const pushRes = await sendPushNotification(partner.id, expiryTitle, expiryMessage, {
        action: 'plan_expiring_soon',
        expiry_date: partner.plan_expiry_date || partner.pro_expiry,
        user_name: partner.full_name,
        role: partner.role,
      });

      results.push({
        userId: partner.id,
        name: partner.full_name,
        role: partner.role,
        expiry: partner.plan_expiry_date || partner.pro_expiry,
        pushStatus: pushRes.success ? 'sent' : 'failed',
      });
    }

    // Mark today as checked in localStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify({ checkedAt: new Date().toISOString(), count: results.length }));
    } catch (_) {}

    return {
      checked: true,
      totalAlerts: results.length,
      details: results,
    };
  } catch (err) {
    console.error('[PlanExpiryCheck Error]', err);
    return {
      checked: false,
      totalAlerts: 0,
      details: [],
    };
  }
}

/**
 * FEATURE 3: Database & Local Synchronized Notification Logger
 * Stores notification in Supabase 'notifications' table (with fallback to localStorage),
 * triggers WebintoApp push notifications, and emits local real-time reactive event.
 */
export async function recordAppNotification(
  userId?: string,
  title: string = 'New Alert',
  message: string = '',
  type: 'wallet' | 'payout' | 'order' | 'plan' | 'alert' | 'general' = 'general',
  extraData: Record<string, any> = {}
): Promise<AppNotification> {
  const newNotification: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    title,
    message,
    type,
    data: extraData,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  // 1. Trigger global interactive toast alert immediately
  dispatchAppToast({
    title,
    message,
    type: type === 'wallet' ? 'wallet' : type === 'payout' ? 'payout' : 'info',
  });

  // 2. Persist in Local Storage for instant offline-safe access
  try {
    const storageKey = 'mlb_app_notifications';
    const raw = localStorage.getItem(storageKey);
    const list: AppNotification[] = raw ? JSON.parse(raw) : [];
    list.unshift(newNotification);
    localStorage.setItem(storageKey, JSON.stringify(list.slice(0, 100)));
  } catch (_) {}

  // 3. Emit Window event for reactive UI components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('mlb_new_notification', { detail: newNotification })
    );
  }

  // 4. Send Android/Device Status Bar Push Notification & WebintoApp
  try {
    showDevicePushAlert(title, message, {
      tag: newNotification.id,
      data: extraData,
    });
  } catch (_) {}

  try {
    sendPushNotification(userId, title, message, extraData);
  } catch (_) {}

  // 5. Attempt database sync in Supabase
  if (supabase) {
    try {
      await supabase.from('notifications').insert([
        {
          id: newNotification.id,
          user_id: userId,
          title,
          message,
          type,
          data: extraData,
          is_read: false,
          created_at: newNotification.created_at,
        },
      ]);
    } catch (dbErr) {
      console.warn('[Notification DB sync note] Notifications table insert fallback:', dbErr);
    }
  }

  return newNotification;
}

/**
 * Fetches user notifications from Supabase and merges with local persistence
 */
export async function fetchUserNotifications(userId?: string): Promise<AppNotification[]> {
  let dbList: AppNotification[] = [];

  if (supabase && userId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(40);

      if (!error && data) {
        dbList = data as AppNotification[];
      }
    } catch (_) {}
  }

  // Fallback / merge with localStorage
  try {
    const raw = localStorage.getItem('mlb_app_notifications');
    const localList: AppNotification[] = raw ? JSON.parse(raw) : [];
    const mergedMap = new Map<string, AppNotification>();
    
    [...dbList, ...localList].forEach((item) => {
      if (!item.user_id || item.user_id === userId) {
        if (!mergedMap.has(item.id)) {
          mergedMap.set(item.id, item);
        }
      }
    });

    return Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (_) {
    return dbList;
  }
}

/**
 * Marks notification as read in database and local cache
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    const raw = localStorage.getItem('mlb_app_notifications');
    if (raw) {
      const list: AppNotification[] = JSON.parse(raw);
      const updated = list.map((n) => (n.id === id ? { ...n, is_read: true } : n));
      localStorage.setItem('mlb_app_notifications', JSON.stringify(updated));
    }
  } catch (_) {}

  if (supabase) {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mlb_notification_read', { detail: { id } }));
  }
}

