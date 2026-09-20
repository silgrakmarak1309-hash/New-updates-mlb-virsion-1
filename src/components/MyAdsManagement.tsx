import React, { useState, useEffect } from 'react';
import {
  Plus,
  Eye,
  MessageCircle,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Tag,
  MapPin,
  Camera,
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Building,
  Package,
  Bell,
  Phone,
  Truck,
  ShoppingBag,
  X,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { Listing, UserProfile, DeliveryOrder, PayoutRequest, formatPrice, getListingPrimaryImage, getListingImages } from '../types';
import { formatWhatsAppUrl } from './ListingDetailModal';
import { PayoutRequestModal } from './PayoutRequestModal';
import { supabase } from '../lib/supabase';
import { playNotificationSound } from './GlobalNotificationManager';
import { dispatchAppToast } from '../lib/notifications';

interface MyAdsManagementProps {
  myListings: Listing[];
  currentUser?: UserProfile;
  orders?: DeliveryOrder[];
  payoutRequests?: PayoutRequest[];
  onOpenSubmitModal: () => void;
  onViewListing: (listing: Listing) => void;
  onDeleteListing: (id: string) => void;
  onToggleListingStatus: (id: string, currentStatus: string) => void;
  onRequestPayout?: (payoutData: {
    amount: number;
    upi_id: string;
    bank_name?: string;
    account_no?: string;
    ifsc_code?: string;
    user_role: string;
  }) => Promise<void> | void;
}

export const MyAdsManagement: React.FC<MyAdsManagementProps> = ({
  myListings,
  currentUser,
  orders = [],
  payoutRequests = [],
  onOpenSubmitModal,
  onViewListing,
  onDeleteListing,
  onToggleListingStatus,
  onRequestPayout,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'rejected'>('all');
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  // Main Dashboard Navigation View: Listings vs Customer Orders
  const [activeMainTab, setActiveMainTab] = useState<'listings' | 'orders'>('listings');
  const [orderSubFilter, setOrderSubFilter] = useState<'all' | 'pending' | 'in_transit' | 'completed'>('all');

  // Real-time Order Notification States
  const [sellerNotifications, setSellerNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    timestamp: string;
    orderNumber?: string;
    type: 'new_order' | 'status_update';
    isRead: boolean;
  }>>([]);
  const [unreadOrdersCount, setUnreadOrdersCount] = useState<number>(0);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState<boolean>(false);
  const [activeNewOrderBanner, setActiveNewOrderBanner] = useState<DeliveryOrder | null>(null);

  const filtered = myListings.filter((l) => {
    if (filter === 'all') return true;
    return l.status === filter;
  });

  // Role-based helper to verify if an incoming order belongs to this vendor/seller
  const isMySellerOrder = (o: DeliveryOrder) => {
    if (!currentUser) return false;
    const curId = currentUser.id;
    const curPhone = currentUser.phone ? currentUser.phone.replace(/\D/g, '') : '';
    const curName = currentUser.full_name?.trim().toLowerCase();
    const orderPhone = o.seller_phone ? o.seller_phone.replace(/\D/g, '') : '';
    const orderName = o.seller_name?.trim().toLowerCase();

    return Boolean(
      (curId && o.seller_id === curId) ||
      (curPhone && orderPhone && (orderPhone.includes(curPhone) || curPhone.includes(orderPhone))) ||
      (curName && orderName && (orderName === curName || orderName.includes(curName) || curName.includes(orderName)))
    );
  };

  // Real-time calculated seller orders
  const mySellerOrders = (orders || []).filter(isMySellerOrder);
  const pendingOrders = mySellerOrders.filter((o) => o.status === 'pending');
  const inTransitOrders = mySellerOrders.filter((o) => o.status === 'out_for_delivery' || o.status === 'delivered_by_boy');
  const completedOrders = mySellerOrders.filter((o) => o.status === 'success' || o.status === 'delivered');

  // Calculate real-time earnings and wallet statistics
  const userPayouts = payoutRequests.filter(
    (p) =>
      (currentUser && (p.driver_id === currentUser.id || p.driver_phone === currentUser.phone || p.user_id === currentUser.id || p.user_phone === currentUser.phone)) ||
      (currentUser && (p.driver_name === currentUser.full_name || p.user_name === currentUser.full_name))
  );

  const pendingPayoutAmount = userPayouts
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const completedPayoutAmount = userPayouts
    .filter((p) => p.status === 'approved' || p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Active listings inventory value
  const totalListingsValue = myListings
    .filter((l) => l.status === 'active')
    .reduce((sum, l) => sum + (l.price || 0), 0);

  // Real-time sales earnings from fulfilled orders
  const totalSalesRevenue = completedOrders.reduce((sum, o) => sum + (o.product_price || o.total_paid || o.total_fare || 0), 0);

  // Authoritative wallet balance synchronized with public.profiles.wallet_balance
  const [profileWalletBalance, setProfileWalletBalance] = useState<number | null>(() => {
    if (typeof currentUser?.wallet_balance === 'number') {
      return currentUser.wallet_balance;
    }
    return 0;
  });

  // Keep local state in sync when currentUser prop updates
  useEffect(() => {
    if (typeof currentUser?.wallet_balance === 'number') {
      setProfileWalletBalance(currentUser.wallet_balance);
    }
  }, [currentUser?.wallet_balance]);

  useEffect(() => {
    if (!supabase || !currentUser) return;
    const client = supabase;
    let isMounted = true;
    async function syncSellerWalletBalance() {
      try {
        const targetEmail = currentUser?.email?.toLowerCase().trim();
        const targetUserId = currentUser?.id;
        const targetPhone = currentUser?.phone;

        // Query profiles table directly for authoritative balance
        const { data: profilesList } = await client
          .from('profiles')
          .select('id, email, phone, wallet_balance');

        if (profilesList && profilesList.length > 0 && isMounted) {
          const matched = profilesList.find((p: any) =>
            (targetUserId && p.id === targetUserId) ||
            (targetEmail && p.email && p.email.toLowerCase().trim() === targetEmail) ||
            (targetPhone && p.phone && p.phone === targetPhone)
          );

          if (matched && typeof matched.wallet_balance === 'number') {
            setProfileWalletBalance(Number(matched.wallet_balance));
            return;
          }
        }
      } catch (err) {
        console.warn('Seller wallet direct sync notice:', err);
      }
    }

    syncSellerWalletBalance();

    // Add Supabase Realtime subscription on public.profiles (filtered strictly to this seller's profile updates)
    const channel = client
      .channel(`seller-wallet-realtime-${currentUser?.id || 'active'}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: currentUser?.id ? `id=eq.${currentUser.id}` : undefined,
        },
        (payload: any) => {
          const newRow = payload?.new;
          if (newRow && isMounted && currentUser) {
            const isMatch =
              newRow.id === currentUser.id ||
              (currentUser.email && newRow.email && newRow.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) ||
              (currentUser.phone && newRow.phone && newRow.phone === currentUser.phone);

            if (isMatch && newRow.wallet_balance !== undefined && newRow.wallet_balance !== null) {
              setProfileWalletBalance(Number(newRow.wallet_balance));
            }
          }
        }
      )
      .subscribe();

    // Add Supabase Realtime subscription on public.delivery_orders for instant seller order notifications
    const ordersChannel = client
      .channel(`seller-orders-sync-${currentUser?.id || 'seller'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_orders' },
        (payload: any) => {
          if (!isMounted) return;
          const { eventType, new: newRow } = payload;

          if (eventType === 'INSERT' && newRow) {
            if (isMySellerOrder(newRow)) {
              try {
                playNotificationSound();
              } catch (_) {}

              dispatchAppToast({
                type: 'info',
                title: '🛒 Naya Store Order Aaya!',
                message: `Order #${newRow.order_number || 'New'} (${newRow.customer_name || 'Buyer'}) • ₹${newRow.product_price || newRow.total_paid || 0}`,
              });

              const notifItem = {
                id: `s_notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                title: '🛒 Naya Customer Order Aaya Hai!',
                message: `Order #${newRow.order_number || 'New'} • Amount: ₹${newRow.product_price || newRow.total_paid || 0} • Buyer: ${newRow.customer_name || 'Customer'}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                orderNumber: newRow.order_number,
                type: 'new_order' as const,
                isRead: false,
              };

              setSellerNotifications((prev) => [notifItem, ...prev.slice(0, 19)]);
              setUnreadOrdersCount((prev) => prev + 1);
              setActiveNewOrderBanner(newRow);
            }
          } else if (eventType === 'UPDATE' && newRow) {
            if (isMySellerOrder(newRow)) {
              const notifItem = {
                id: `s_notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                title: newRow.status === 'out_for_delivery'
                  ? '🚚 Order Out For Delivery'
                  : newRow.status === 'delivered_by_boy'
                  ? '📍 Driver Reached Delivery Location'
                  : newRow.status === 'success' || newRow.status === 'delivered'
                  ? '💰 Delivery Confirmed & Settled'
                  : '📦 Order Status Updated',
                message: `Order #${newRow.order_number}: Status is now "${newRow.status.replace(/_/g, ' ')}"`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                orderNumber: newRow.order_number,
                type: 'status_update' as const,
                isRead: false,
              };

              setSellerNotifications((prev) => [notifItem, ...prev.slice(0, 19)]);
              setUnreadOrdersCount((prev) => prev + 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      client.removeChannel(channel);
      client.removeChannel(ordersChannel);
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.phone]);

  const currentBaseBalance = Number(profileWalletBalance ?? currentUser?.wallet_balance ?? 0);

  const availableWalletBalance = Math.max(
    0,
    currentBaseBalance - pendingPayoutAmount
  );

  const filteredSellerOrders = mySellerOrders.filter((o) => {
    if (orderSubFilter === 'pending') return o.status === 'pending';
    if (orderSubFilter === 'in_transit') return o.status === 'out_for_delivery' || o.status === 'delivered_by_boy';
    if (orderSubFilter === 'completed') return o.status === 'success' || o.status === 'delivered';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Real-time Incoming Customer Order Alert Banner */}
      {activeNewOrderBanner && (
        <div className="p-4 bg-gradient-to-r from-orange-950/95 via-amber-950/95 to-orange-950/95 border-2 border-orange-500 rounded-3xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-3 duration-300">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg font-black animate-bounce">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-orange-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Naya Order Alert!
                </span>
                <span className="text-white font-mono font-black text-sm">
                  #{activeNewOrderBanner.order_number}
                </span>
                <span className="text-emerald-400 font-mono font-bold text-xs bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                  ₹{activeNewOrderBanner.product_price || activeNewOrderBanner.total_paid || 0}
                </span>
              </div>
              <p className="text-xs text-slate-200">
                Customer: <strong>{activeNewOrderBanner.customer_name || 'Buyer'}</strong> • {activeNewOrderBanner.item_description || 'Product item'}
              </p>
              <p className="text-[11px] text-orange-300/90">
                {activeNewOrderBanner.fulfillment_type === 'self_pickup' ? '🏬 Self Pickup by Customer' : `🏠 Home Delivery to: ${activeNewOrderBanner.delivery_address || 'Address'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={() => {
                setActiveMainTab('orders');
                setActiveNewOrderBanner(null);
              }}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Package className="w-4 h-4 text-slate-950" />
              <span>View Order Details</span>
            </button>
            <button
              onClick={() => setActiveNewOrderBanner(null)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. VISUALLY PROMINENT SELLER WALLET BALANCE CARD */}
      <div
        id="seller_wallet_balance_card"
        className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-orange-500/40 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
      >
        {/* Decorative Background Accent */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Balance and Shop Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-orange-500/20 text-orange-400 border border-orange-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Seller Earnings Wallet
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                {currentUser?.shop_name || 'Verified Merchant Store'}
              </span>

              {/* Real-time Order Notification Bell for Sellers */}
              <div className="relative inline-block ml-auto sm:ml-2">
                <button
                  id="seller_notifications_bell_btn"
                  onClick={() => {
                    setShowNotificationsDrawer(!showNotificationsDrawer);
                    if (!showNotificationsDrawer) {
                      setUnreadOrdersCount(0);
                    }
                  }}
                  className={`p-2 rounded-xl text-xs font-bold transition flex items-center justify-center relative border ${
                    unreadOrdersCount > 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title="Real-time Order Alerts"
                >
                  <Bell className="w-4 h-4" />
                  {unreadOrdersCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-black text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shadow-md animate-bounce">
                      {unreadOrdersCount > 9 ? '9+' : unreadOrdersCount}
                    </span>
                  )}
                </button>

                {/* Seller Notifications Dropdown Drawer */}
                {showNotificationsDrawer && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-left">
                    <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-orange-400" />
                        <span className="font-bold text-xs text-white uppercase tracking-wider">
                          Live Store Alerts
                        </span>
                        <span className="bg-orange-500/20 text-orange-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-orange-500/30">
                          REALTIME
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {sellerNotifications.length > 0 && (
                          <button
                            onClick={() => {
                              setSellerNotifications([]);
                              setUnreadOrdersCount(0);
                            }}
                            className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotificationsDrawer(false)}
                          className="text-slate-400 hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1.5">
                      {sellerNotifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs space-y-1">
                          <Radio className="w-6 h-6 text-slate-600 mx-auto animate-pulse" />
                          <p className="font-semibold text-slate-300">Listening for store orders...</p>
                          <p className="text-[10px] text-slate-500">
                            Whenever a customer buys from your listings, notifications will trigger here immediately.
                          </p>
                        </div>
                      ) : (
                        sellerNotifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-xl border text-xs transition ${
                              n.type === 'new_order'
                                ? 'bg-orange-950/40 border-orange-500/40 text-orange-200'
                                : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold text-[11px]">
                              <span>{n.title}</span>
                              <span className="text-[9px] text-slate-400">{n.timestamp}</span>
                            </div>
                            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                              {n.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Available Wallet Balance
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight mt-1 flex items-baseline gap-2 flex-wrap">
                <span className="text-orange-400">₹</span>
                <span>{formatPrice(availableWalletBalance)}</span>
                <span className="text-xs text-emerald-400 font-sans font-bold bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                  100% Guaranteed Settlement
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Store Orders</div>
                <div className="text-sm font-black text-white mt-0.5 flex items-center gap-1.5">
                  <span>{mySellerOrders.length}</span>
                  {pendingOrders.length > 0 && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/70 px-1.5 py-0.2 rounded border border-amber-800/50">
                      {pendingOrders.length} new
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Settled Sales</div>
                <div className="text-sm font-black text-emerald-400 mt-0.5">
                  ₹{formatPrice(totalSalesRevenue)}
                </div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Pending Payouts</div>
                <div className="text-sm font-black text-amber-400 mt-0.5">
                  ₹{formatPrice(pendingPayoutAmount)}
                </div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Active Catalog</div>
                <div className="text-sm font-black text-slate-200 mt-0.5">
                  ₹{formatPrice(totalListingsValue)}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Interactive Request Payout / Withdraw Action */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              id="seller_request_payout_btn"
              onClick={() => setIsPayoutModalOpen(true)}
              className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-slate-950" />
              <span>Request Payout / Withdraw</span>
              <ArrowUpRight className="w-4 h-4 text-slate-950" />
            </button>

            <button
              onClick={onOpenSubmitModal}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post New Product Ad</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. PRIMARY NAVIGATION TABS (Store Products vs Incoming Customer Orders) */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3 flex-wrap">
        <button
          id="seller_nav_listings_tab"
          onClick={() => setActiveMainTab('listings')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'listings'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>My Product Listings ({myListings.length})</span>
        </button>

        <button
          id="seller_nav_orders_tab"
          onClick={() => {
            setActiveMainTab('orders');
            setUnreadOrdersCount(0);
          }}
          className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition flex items-center gap-2 relative cursor-pointer ${
            activeMainTab === 'orders'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Customer Orders ({mySellerOrders.length})</span>
          {pendingOrders.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">
              {pendingOrders.length} PENDING
            </span>
          )}
          {unreadOrdersCount > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>
      </div>

      {/* 3. CONDITIONAL TAB VIEW: INCOMING CUSTOMER ORDERS DASHBOARD */}
      {activeMainTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">Incoming Customer Orders</h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Real-time Order Sync Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time stream of all orders placed by buyers on your store catalog.
              </p>
            </div>

            {/* Sub Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  { id: 'all', label: `All (${mySellerOrders.length})` },
                  { id: 'pending', label: `Pending Dispatch (${pendingOrders.length})` },
                  { id: 'in_transit', label: `In Transit (${inTransitOrders.length})` },
                  { id: 'completed', label: `Completed (${completedOrders.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setOrderSubFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    orderSubFilter === tab.id
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredSellerOrders.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <Package className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No {orderSubFilter} orders right now</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                When a buyer in your town places an order on your products, it will appear here instantly with sound alerts.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredSellerOrders.map((order) => {
                const isPending = order.status === 'pending';
                const isInTransit = order.status === 'out_for_delivery' || order.status === 'delivered_by_boy';
                const isCompleted = order.status === 'success' || order.status === 'delivered';

                return (
                  <div
                    key={order.id}
                    className="border border-slate-200 hover:border-orange-300 transition rounded-2xl p-5 bg-white shadow-sm space-y-4 flex flex-col justify-between"
                  >
                    {/* Card Top: Order Number & Status */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            #{order.order_number}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {order.created_at ? new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                          isPending
                            ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                            : isInTransit
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Order Details & Pricing */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{order.item_description || 'Store Item'}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            Fulfillment: <strong>{order.fulfillment_type === 'self_pickup' ? '🏬 Self Pickup by Buyer' : '🚚 Home Delivery via Meri Local Fleet'}</strong>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-slate-400 font-semibold">Store Amount</div>
                          <div className="text-base font-black text-emerald-600 font-mono">
                            ₹{order.product_price || order.total_paid || 0}
                          </div>
                        </div>
                      </div>

                      {/* Customer Information Block */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-semibold">Customer:</span>
                          <span className="font-bold text-slate-900">{order.customer_name || 'Buyer'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-semibold">Destination:</span>
                          <span className="text-slate-700 text-right max-w-[200px] truncate">{order.delivery_address || 'Tura Town'}</span>
                        </div>
                        {order.delivery_partner_name && (
                          <div className="flex items-center justify-between text-blue-700 font-medium">
                            <span>Delivery Partner:</span>
                            <span>{order.delivery_partner_name} ({order.delivery_partner_phone || 'Assigned'})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons: Customer Contact */}
                    <div className="flex items-center gap-2 pt-1">
                      {order.customer_phone && (
                        <>
                          <a
                            href={`tel:${order.customer_phone}`}
                            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold text-center transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Call Buyer</span>
                          </a>

                          <a
                            href={`https://wa.me/91${order.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Hello ${order.customer_name || 'Buyer'}, this is regarding your Meri Local order #${order.order_number} for "${order.item_description || 'Product'}". We have received your order and are preparing it.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold text-center transition flex items-center justify-center gap-1.5 border border-emerald-200 cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. CONDITIONAL TAB VIEW: PRODUCT LISTINGS MANAGEMENT */}
      {activeMainTab === 'listings' && (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">My Ads Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track and manage your submitted listings, moderation status, and incoming WhatsApp inquiries.
            </p>
          </div>

          <button
            onClick={onOpenSubmitModal}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Submit Listing Request
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'active', 'pending', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                filter === status
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status} ({myListings.filter((l) => (status === 'all' ? true : l.status === status)).length})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Tag className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No {filter} listings found</p>
            <p className="text-xs text-slate-400 mt-1">Submit your product listing to advertise locally.</p>
            <button
              onClick={onOpenSubmitModal}
              className="mt-4 px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-700 transition"
            >
              Submit First Listing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="border border-slate-200 rounded-2xl p-4 bg-white hover:border-slate-300 transition flex flex-col justify-between space-y-3"
              >
                <div className="flex gap-3.5">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                    <img
                      src={getListingPrimaryImage(item)}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    {getListingImages(item).length > 1 && (
                      <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                        <Camera className="w-2.5 h-2.5 text-orange-400" />
                        {getListingImages(item).length}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-emerald-600 font-black text-base">
                        ₹{formatPrice(item.price)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          item.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-800 text-sm truncate mt-0.5">{item.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {item.location_name}
                      </span>
                      <span>•</span>
                      <span>{item.category_name}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewListing(item)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>

                    <a
                      href={formatWhatsAppUrl(item.whatsapp || item.phone, item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        onToggleListingStatus(
                          item.id,
                          item.status === 'active' ? 'rejected' : 'active'
                        )
                      }
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      {item.status === 'active' ? 'Pause Ad' : 'Activate'}
                    </button>
                    <button
                      onClick={() => onDeleteListing(item.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete Ad"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Payout Modal */}
      {currentUser && (
        <PayoutRequestModal
          isOpen={isPayoutModalOpen}
          onClose={() => setIsPayoutModalOpen(false)}
          currentUser={currentUser}
          availableBalance={availableWalletBalance}
          userRoleLabel="Shopkeeper / Seller"
          onSubmitPayout={async (payoutData) => {
            if (onRequestPayout) {
              await onRequestPayout(payoutData);
            }
          }}
        />
      )}
    </div>
  );
};
