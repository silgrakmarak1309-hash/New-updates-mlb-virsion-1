import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { dispatchAppToast, showDevicePushAlert, recordAppNotification } from '../lib/notifications';
import { UserProfile } from '../types';

interface GlobalNotificationManagerProps {
  userRole?: string;
  currentUser?: UserProfile | null;
}

/**
 * Bulletproof audio chime generator using Web Audio API + MP3 fallback.
 * Fixes the broken 'https://mixkit.co' HTML link issue.
 */
export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;
      // Dual-tone harmonic chime (880Hz -> 1320Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1320, now + 0.12);
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);
      return;
    }
  } catch (err) {
    console.warn('[AudioContext chime notice]', err);
  }

  // Backup MP3 sound
  try {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});
  } catch (_) {}
};

export default function GlobalNotificationManager({
  userRole,
  currentUser,
}: GlobalNotificationManagerProps) {
  useEffect(() => {
    // 1. Safe Web Notification Permission Check
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }

    // Role calculations (Supports both lowercase and uppercase variations)
    const normalizedRole = (userRole || currentUser?.role || '').toLowerCase().trim();
    const userEmail = (currentUser?.email || '').toLowerCase().trim();
    const isAdmin =
      normalizedRole === 'admin' ||
      normalizedRole === 'super_admin' ||
      userEmail === 'silgrakmarak1309@gmail.com';
    const isDeliveryPartner =
      normalizedRole === 'delivery_partner' ||
      normalizedRole === 'delivery_boy' ||
      normalizedRole === 'driver' ||
      Boolean(currentUser?.is_delivery_partner);

    const sendPushAlert = (title: string, message: string, type: 'order' | 'payout' | 'general' = 'general') => {
      // 1. Play sound
      playNotificationSound();

      // 2. Browser native push notification
      showDevicePushAlert(title, message, {
        tag: `notif_${Date.now()}`,
        data: { url: '/' },
      });

      // 3. In-App Toast Banner (always visible inside the app)
      dispatchAppToast({
        title,
        message,
        type: type === 'payout' ? 'payout' : 'info',
        duration: 6000,
      });

      // 4. Save in user's in-app notification center if logged in
      if (currentUser?.id) {
        recordAppNotification(currentUser.id, title, message, type);
      }
    };

    if (!supabase) return;
    const client = supabase;

    // ==========================================
    // 📦 1. NEW ORDER LISTENER ('orders' & 'delivery_orders')
    // ==========================================
    const orderChannel = client
      .channel('live-orders-alert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload: any) => {
          if (isAdmin || isDeliveryPartner) {
            const orderId = payload?.new?.id || payload?.new?.order_id || 'ORD-New';
            const price = payload?.new?.total_price || payload?.new?.amount || payload?.new?.total_amount || '';
            const priceText = price ? `\nTotal Amount: ₹${price}` : '';
            sendPushAlert(
              '📦 Naya Order Aaya Hai!',
              `Order ID: #${orderId}${priceText}\nKripya dashboard check karein.`,
              'order'
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'delivery_orders' },
        (payload: any) => {
          if (isAdmin || isDeliveryPartner) {
            const orderId = payload?.new?.id || payload?.new?.order_number || 'New';
            const fare = payload?.new?.delivery_fare || payload?.new?.total_fare || payload?.new?.total_paid || '';
            const fareText = fare ? `\nFare: ₹${fare}` : '';
            sendPushAlert(
              '📦 Nayi Delivery Order Booking!',
              `Delivery ID: #${orderId}${fareText}\nCheck Delivery Dashboard.`,
              'order'
            );
          }
        }
      )
      .subscribe();

    // ==========================================
    // 💰 2. WITHDRAWAL / PAYOUT REQUEST LISTENER
    // ==========================================
    const payoutChannel = client
      .channel('live-payouts-alert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payout_requests' },
        (payload: any) => {
          // Sirf Admin ko withdrawal notification milna chahiye
          if (isAdmin) {
            const reqUserId = payload?.new?.user_id || 'Partner';
            const amount = payload?.new?.amount || '0';
            const upi = payload?.new?.upi_id ? ` (UPI: ${payload.new.upi_id})` : '';
            sendPushAlert(
              '💰 Naya Withdrawal Request!',
              `User: ${reqUserId}\nAmount: ₹${amount}${upi}`,
              'payout'
            );
          }
        }
      )
      .subscribe();

    // Cleanup channels when component unmounts
    return () => {
      client.removeChannel(orderChannel);
      client.removeChannel(payoutChannel);
    };
  }, [userRole, currentUser?.id, currentUser?.email, currentUser?.role]);

  return null;
}
