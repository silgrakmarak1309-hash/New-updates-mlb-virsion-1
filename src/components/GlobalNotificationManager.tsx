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
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
      }
    } catch (_) {}

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
    const isSeller =
      normalizedRole === 'seller' ||
      normalizedRole === 'vendor' ||
      normalizedRole === 'merchant' ||
      Boolean(currentUser?.is_seller);

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

    // Helper to test if order row belongs to current user as seller
    const checkIsMySellerOrder = (row: any) => {
      if (!currentUser || !row) return false;
      const curId = currentUser.id;
      const curPhone = currentUser.phone?.trim();
      const curName = currentUser.full_name?.trim().toLowerCase();
      return Boolean(
        (curId && row.seller_id === curId) ||
        (curPhone && row.seller_phone && row.seller_phone.includes(curPhone)) ||
        (curName && row.seller_name && row.seller_name.trim().toLowerCase() === curName)
      );
    };

    // Helper to test if order row belongs to current user as buyer
    const checkIsMyBuyerOrder = (row: any) => {
      if (!currentUser || !row) return false;
      const curId = currentUser.id;
      const curPhone = currentUser.phone?.trim();
      return Boolean(
        (curId && (row.buyer_id === curId || row.user_id === curId)) ||
        (curPhone && row.customer_phone && row.customer_phone.includes(curPhone))
      );
    };

    // Helper to test if order row belongs to current user as delivery driver
    const checkIsMyDriverOrder = (row: any) => {
      if (!currentUser || !row) return false;
      const curId = currentUser.id;
      return Boolean(curId && row.delivery_partner_id === curId);
    };

    // ==========================================
    // 📦 1. NEW & UPDATED ORDER REAL-TIME LISTENER
    // ==========================================
    const orderChannel = client
      .channel('live-orders-and-deliveries-alert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload: any) => {
          const newRow = payload?.new;
          if (!newRow) return;
          const orderId = newRow.id || newRow.order_id || 'ORD-New';
          const price = newRow.total_price || newRow.amount || newRow.total_amount || '';
          const isSellerTarget = checkIsMySellerOrder(newRow) || (isSeller && !newRow.seller_id);

          if (isSellerTarget) {
            sendPushAlert(
              '🛒 Naya Store Order Aaya Hai!',
              `Order #${orderId} • ₹${price}\nCustomer: ${newRow.customer_name || 'Buyer'}\nKripya order pack karein.`,
              'order'
            );
          } else if (isAdmin || isDeliveryPartner) {
            sendPushAlert(
              '📦 Naya Order Aaya Hai!',
              `Order ID: #${orderId}${price ? `\nTotal Amount: ₹${price}` : ''}\nKripya dashboard check karein.`,
              'order'
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'delivery_orders' },
        (payload: any) => {
          const newRow = payload?.new;
          if (!newRow) return;
          const orderId = newRow.order_number || newRow.id || 'New';
          const fare = newRow.total_paid || newRow.total_fare || newRow.delivery_fare || '';
          const isSellerTarget = checkIsMySellerOrder(newRow);

          // 1. Seller Notification
          if (isSellerTarget) {
            sendPushAlert(
              '🛒 Naya Order Aaya Hai Aapki Shop Par!',
              `Order #${orderId} • ₹${fare}\nProduct: ${newRow.item_description || 'Store item'}\nCustomer: ${newRow.customer_name || 'Buyer'}`,
              'order'
            );
            return;
          }

          // 2. Delivery Partner / Admin Notification
          if (isAdmin || isDeliveryPartner) {
            const isSelfPickup = newRow.fulfillment_type === 'self_pickup';
            if (!isSelfPickup) {
              const driverEarning = newRow.partner_earning ? ` (Driver Payout: ₹${newRow.partner_earning})` : '';
              sendPushAlert(
                '🚨 Nayi Delivery Request Aayi Hai!',
                `Order #${orderId}${driverEarning}\nDrop: ${newRow.delivery_address || 'Tura, Meghalaya'}\nAvailable in Delivery Dashboard.`,
                'order'
              );
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'delivery_orders' },
        (payload: any) => {
          const newRow = payload?.new;
          const oldRow = payload?.old;
          if (!newRow) return;

          const orderId = newRow.order_number || newRow.id || 'Order';
          const newStatus = newRow.status;
          const oldStatus = oldRow?.status;

          // Only alert if status actually changed
          if (oldStatus && oldStatus === newStatus) return;

          const isSellerTarget = checkIsMySellerOrder(newRow);
          const isBuyerTarget = checkIsMyBuyerOrder(newRow);
          const isDriverTarget = checkIsMyDriverOrder(newRow);

          if (newStatus === 'out_for_delivery') {
            if (isBuyerTarget) {
              sendPushAlert(
                '🚚 Order Out For Delivery!',
                `Order #${orderId} lekar driver nikal chuka hai. Rider: ${newRow.delivery_partner_name || 'Driver'}`,
                'order'
              );
            } else if (isSellerTarget) {
              sendPushAlert(
                '🚚 Delivery Partner ne Pick Kiya!',
                `Order #${orderId} delivery partner ne pick kar liya hai aur transit mein hai.`,
                'order'
              );
            }
          } else if (newStatus === 'delivered_by_boy') {
            if (isBuyerTarget) {
              sendPushAlert(
                '📍 Delivery Partner Reached Drop Location!',
                `Driver ne order #${orderId} deliver mark kiya hai. Kripya My Orders mein Confirm karein.`,
                'order'
              );
            } else if (isSellerTarget) {
              sendPushAlert(
                '📦 Order Delivered to Customer Location!',
                `Order #${orderId} customer ko handover kar diya gaya hai.`,
                'order'
              );
            }
          } else if (newStatus === 'delivered' || newStatus === 'success') {
            if (isSellerTarget) {
              sendPushAlert(
                '💰 Order Completed & Funds Settled!',
                `Order #${orderId} confirm ho gaya hai! Earnings wallet mein transfer kar di gayi hain.`,
                'order'
              );
            } else if (isDriverTarget) {
              sendPushAlert(
                '🎉 Delivery Confirmed by Customer!',
                `Order #${orderId} successfully completed! ₹${newRow.partner_earning || 0} payout wallet balance mein add ho gaya.`,
                'order'
              );
            }
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
