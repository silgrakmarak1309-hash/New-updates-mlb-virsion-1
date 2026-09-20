import React, { useState, useEffect } from 'react';
import {
  Bike,
  Package,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  Phone,
  MessageCircle,
  Truck,
  Fuel,
  Calculator,
  RefreshCw,
  Plus,
  AlertCircle,
  ExternalLink,
  DollarSign,
  Navigation,
  Power,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Info,
  Layers,
  CreditCard,
  QrCode,
  Building,
  Bell,
  X,
  Radio,
} from 'lucide-react';
import {
  DeliveryOrder,
  UserProfile,
  PayoutRequest,
  calculateDeliveryFare,
  formatPrice,
  isHeavyItemCategory,
} from '../types';
import { DeliveryPartnerRegistration } from './DeliveryPartnerRegistration';
import { PayoutRequestModal } from './PayoutRequestModal';
import { supabase } from '../lib/supabase';
import { playNotificationSound } from './GlobalNotificationManager';

const getWhatsAppUrl = (phone: string, message: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
};

interface DeliveryPartnerDashboardProps {
  currentUser: UserProfile;
  orders: DeliveryOrder[];
  payoutRequests?: PayoutRequest[];
  onAcceptOrder: (orderId: string) => Promise<void> | void;
  onUpdateOrderStatus: (
    orderId: string,
    newStatus: 'out_for_delivery' | 'delivered_by_boy' | 'delivered' | 'success'
  ) => Promise<void> | void;
  onCreateSampleOrder?: (order: Omit<DeliveryOrder, 'id' | 'created_at'>) => Promise<void> | void;
  onNavigateToRegister: () => void;
  onNavigateHome: () => void;
  onRefresh: () => void;
  onRequestPayout?: (payoutData: {
    amount: number;
    upi_id: string;
    bank_name?: string;
    account_no?: string;
    ifsc_code?: string;
    user_role: string;
  }) => Promise<void> | void;
  onUpdatePartnerProfile?: (data: {
    fullName: string;
    phone: string;
    vehicleType: 'Bike' | 'Scooty' | 'Auto' | 'Commercial Auto';
    vehicleNumber: string;
  }) => Promise<void> | void;
}

export const DeliveryPartnerDashboard: React.FC<DeliveryPartnerDashboardProps> = ({
  currentUser,
  orders,
  payoutRequests = [],
  onAcceptOrder,
  onUpdateOrderStatus,
  onCreateSampleOrder,
  onNavigateToRegister,
  onNavigateHome,
  onRefresh,
  onRequestPayout,
  onUpdatePartnerProfile,
}) => {
  // Driver Status state (Online vs Offline)
  const [isDriverOnline, setIsDriverOnline] = useState<boolean>(true);
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'available' | 'active' | 'completed'>('all');
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [overrideViewOrders, setOverrideViewOrders] = useState<boolean>(false);

  // Real-time Notification State Hooks & Incoming Order Alert Banner
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    timestamp: string;
    orderNumber?: string;
    type: 'new_request' | 'status_update' | 'payout';
    isRead: boolean;
  }>>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState<boolean>(false);
  const [activeNewOrderBanner, setActiveNewOrderBanner] = useState<DeliveryOrder | null>(null);

  // New Shipment Creation state (for quick local order dispatch testing)
  const [newCustName, setNewCustName] = useState('Dilseng Sangma');
  const [newCustPhone, setNewCustPhone] = useState('9862012345');
  const [newPickup, setNewPickup] = useState('Supermarket, Chandmari, Tura');
  const [newDropoff, setNewDropoff] = useState('Rongram Bazaar, West Garo Hills');
  const [newItemDesc, setNewItemDesc] = useState('Fresh Organic Produce Box & Groceries');
  const [newWeight, setNewWeight] = useState(6);
  const [newDistance, setNewDistance] = useState(14);
  const [newTerrain, setNewTerrain] = useState<'Plain' | 'Hill (5km/L)'>('Hill (5km/L)');

  const isApproved = currentUser.is_delivery_partner && currentUser.partner_status === 'approved';
  const isPending = currentUser.is_delivery_partner && currentUser.partner_status === 'pending';
  const isRejected = currentUser.is_delivery_partner && currentUser.partner_status === 'rejected';
  const notRegistered = !currentUser.is_delivery_partner;

  // Filtered Orders - PART 4: Heavy Products and Unverified Orders are strictly excluded from Driver dispatch
  const availableOrders = orders.filter((o) => {
    const isPendingOrder = o.status === 'pending';
    const isPaymentVerified = o.payment_status === 'verified' || !o.payment_status;
    const isNotSelfPickup = o.fulfillment_type !== 'self_pickup';
    const isNotHeavy = !isHeavyItemCategory(undefined, o.item_description);
    return isPendingOrder && isPaymentVerified && isNotSelfPickup && isNotHeavy;
  });

  const myActiveOrders = orders.filter(
    (o) => o.delivery_partner_id === currentUser.id && o.status === 'out_for_delivery'
  );
  const myAwaitingBuyerConfirmationOrders = orders.filter(
    (o) => o.delivery_partner_id === currentUser.id && o.status === 'delivered_by_boy'
  );
  const myCompletedOrders = orders.filter(
    (o) =>
      o.delivery_partner_id === currentUser.id &&
      (o.status === 'success' || o.status === 'delivered')
  );

  // Summary Metrics
  const totalPartnerEarnedToday = myCompletedOrders.reduce((sum, o) => sum + (o.partner_earning || 0), 0);
  const totalAppCommissionToday = myCompletedOrders.reduce((sum, o) => sum + (o.app_commission || 0), 0);
  const totalKmDriven = myCompletedOrders.reduce((sum, o) => sum + (o.distance_km || 0), 0);

  // Real-time payout calculations
  const userPayouts = (payoutRequests || []).filter(
    (p) =>
      p.driver_id === currentUser.id ||
      p.driver_phone === currentUser.phone ||
      p.driver_name === currentUser.full_name
  );
  const pendingPayoutAmount = userPayouts
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const completedPayoutAmount = userPayouts
    .filter((p) => p.status === 'approved' || p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Real-time authoritative driver wallet balance synchronized with public.profiles.wallet_balance
  const [profileWalletBalance, setProfileWalletBalance] = useState<number>(() => {
    return typeof currentUser.wallet_balance === 'number' ? currentUser.wallet_balance : 0;
  });

  // Sync state if currentUser prop changes
  useEffect(() => {
    if (typeof currentUser.wallet_balance === 'number') {
      setProfileWalletBalance(currentUser.wallet_balance);
    }
  }, [currentUser.wallet_balance]);

  // Fetch latest balance directly from public.profiles and subscribe to Supabase Realtime
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let isMounted = true;

    async function fetchLatestDriverBalance() {
      try {
        const targetId = currentUser.id;
        const targetEmail = currentUser.email;

        const { data } = await client
          .from('profiles')
          .select('id, email, phone, wallet_balance');

        if (data && data.length > 0 && isMounted) {
          const matched = data.find((p: any) =>
            (targetId && p.id === targetId) ||
            (targetEmail && p.email && p.email.toLowerCase() === targetEmail.toLowerCase()) ||
            (currentUser.phone && p.phone && p.phone === currentUser.phone)
          );

          if (matched && typeof matched.wallet_balance === 'number') {
            setProfileWalletBalance(Number(matched.wallet_balance));
          }
        }
      } catch (err) {
        console.warn('Driver dashboard profile fetch notice:', err);
      }
    }

    fetchLatestDriverBalance();

    // Supabase Realtime subscription on public.profiles (filtered strictly to this driver's profile updates)
    const channel = client
      .channel(`driver-wallet-sync-${currentUser.id || 'current'}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: currentUser.id ? `id=eq.${currentUser.id}` : undefined,
        },
        (payload: any) => {
          const newRow = payload?.new;
          if (newRow && isMounted) {
            const isMatch =
              newRow.id === currentUser.id ||
              (currentUser.email && newRow.email && newRow.email.toLowerCase() === currentUser.email.toLowerCase()) ||
              (currentUser.phone && newRow.phone && newRow.phone === currentUser.phone);

            if (isMatch && typeof newRow.wallet_balance === 'number') {
              setProfileWalletBalance(Number(newRow.wallet_balance));
            }
          }
        }
      )
      .subscribe();

    // Supabase Realtime subscription on public.delivery_orders for instant incoming delivery requests & status updates
    const deliveryOrdersChannel = client
      .channel(`driver-delivery-orders-sync-${currentUser.id || 'driver'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_orders' },
        (payload: any) => {
          if (!isMounted) return;
          const { eventType, new: newRow, old: oldRow } = payload;

          if (eventType === 'INSERT' && newRow) {
            // Check if this is an eligible available delivery request
            const isPendingOrder = newRow.status === 'pending';
            const isPaymentVerified = newRow.payment_status === 'verified' || !newRow.payment_status;
            const isNotSelfPickup = newRow.fulfillment_type !== 'self_pickup';
            const isNotHeavy = !isHeavyItemCategory(undefined, newRow.item_description);

            if (isPendingOrder && isPaymentVerified && isNotSelfPickup && isNotHeavy) {
              try {
                playNotificationSound();
              } catch (_) {}

              const notifItem = {
                id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                title: '🚨 Nayi Delivery Request Aayi Hai!',
                message: `Order #${newRow.order_number || 'New'} (${newRow.distance_km || 5} km) • Driver Earning: ₹${newRow.partner_earning || Math.round((newRow.delivery_fare || 40) * 0.8)}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                orderNumber: newRow.order_number,
                type: 'new_request' as const,
                isRead: false,
              };

              setNotifications((prev) => [notifItem, ...prev.slice(0, 19)]);
              setUnreadCount((prev) => prev + 1);
              setActiveNewOrderBanner(newRow);

              // Auto-refresh full orders collection
              onRefresh();
            }
          } else if (eventType === 'UPDATE' && newRow) {
            // Check if this updated order belongs to this driver
            if (newRow.delivery_partner_id === currentUser.id) {
              if (newRow.status === 'success' || newRow.status === 'delivered') {
                try {
                  playNotificationSound();
                } catch (_) {}

                const notifItem = {
                  id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  title: '🎉 Delivery Confirmed by Buyer!',
                  message: `Order #${newRow.order_number} confirmed! Payout ₹${newRow.partner_earning || 0} added to driver wallet balance.`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  orderNumber: newRow.order_number,
                  type: 'payout' as const,
                  isRead: false,
                };

                setNotifications((prev) => [notifItem, ...prev.slice(0, 19)]);
                setUnreadCount((prev) => prev + 1);
              }
            }
            onRefresh();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      client.removeChannel(channel);
      client.removeChannel(deliveryOrdersChannel);
    };
  }, [currentUser.id, currentUser.email, currentUser.phone]);

  const currentBaseBalance = profileWalletBalance;
  const availableDriverWalletBalance = Math.max(
    0,
    currentBaseBalance - pendingPayoutAmount
  );

  const handleCreateNewShipment = (e: React.FormEvent) => {
    e.preventDefault();
    const calculated = calculateDeliveryFare(newWeight, newDistance, newTerrain);
    const orderData: Omit<DeliveryOrder, 'id' | 'created_at'> = {
      order_number: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customer_name: newCustName,
      customer_phone: newCustPhone,
      pickup_address: newPickup,
      delivery_address: newDropoff,
      item_description: newItemDesc,
      weight_kg: newWeight,
      distance_km: newDistance,
      terrain_type: newTerrain,
      total_fare: calculated.totalFare,
      app_commission: calculated.appCommission,
      partner_earning: calculated.partnerEarning,
      status: 'pending',
      payment_status: 'verified',
    };

    onCreateSampleOrder?.(orderData);
    setShowNewOrderModal(false);
    setActionSuccessMsg(`New shipment ${orderData.order_number} created and dispatched to pool!`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleAcceptWithFeedback = async (orderId: string, orderNumber: string) => {
    if (!isDriverOnline) {
      alert('Please switch your status to ONLINE from the top bar before accepting orders.');
      return;
    }
    await onAcceptOrder(orderId);
    setActionSuccessMsg(`Accepted order ${orderNumber}! Navigate to pickup location.`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const handleMarkDelivered = async (orderId: string, orderNumber: string, payout: number) => {
    await onUpdateOrderStatus(orderId, 'delivered_by_boy');
    setActionSuccessMsg(
      `Order ${orderNumber} marked delivered! Status updated to 'delivered_by_boy' (Awaiting Buyer Confirmation).`
    );
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  const handleRequestWithdrawal = () => {
    if (totalPartnerEarnedToday <= 0) {
      alert('Wallet balance is currently ₹0. Complete delivered orders to withdraw.');
      return;
    }
    const upi = currentUser.payout_upi_id || 'your registered UPI ID';
    setActionSuccessMsg(`Payout request for ₹${totalPartnerEarnedToday} submitted to Admin! Settlement transfer will occur to ${upi} within 2 hours.`);
    setShowPayoutModal(false);
    setTimeout(() => setActionSuccessMsg(null), 6000);
  };

  // Quick Demo Auto-Approval for instant testing if in pending state
  const handleQuickDemoApprove = async () => {
    if (onUpdatePartnerProfile) {
      await onUpdatePartnerProfile({
        fullName: currentUser.full_name || 'Delivery Partner',
        phone: currentUser.phone || '9876543210',
        vehicleType: (currentUser.vehicle_type as any) || 'Bike',
        vehicleNumber: currentUser.vehicle_number || 'ML-08-A-4592',
      });
    }
    // Also simulate status locally
    currentUser.is_delivery_partner = true;
    currentUser.partner_status = 'approved';
    onRefresh();
  };

  // =========================================================================
  // CONDITION 1: USER IS NOT REGISTERED -> SHOW REGISTRATION FORM
  // =========================================================================
  if (notRegistered && !overrideViewOrders) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
        <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-slate-950 flex items-center justify-center shadow font-black text-xl">
                  <Bike className="w-6 h-6 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg text-white">Delivery Fleet Onboarding</span>
                    <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
                      Driver Registration Required
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Register your vehicle to unlock the independent Delivery Partner Dashboard
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOverrideViewOrders(true)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  <Package className="w-3.5 h-3.5" />
                  Preview Orders Pool
                </button>
                <button
                  onClick={onNavigateHome}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Return to Marketplace
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <DeliveryPartnerRegistration
            currentUser={currentUser}
            onSubmit={onUpdatePartnerProfile}
            onSuccess={() => {
              onRefresh();
            }}
            onCancel={onNavigateHome}
            onNavigateToDashboard={() => setOverrideViewOrders(true)}
            onNavigateHome={onNavigateHome}
          />
        </main>
      </div>
    );
  }

  // =========================================================================
  // CONDITION 2: PARTNER STATUS IS PENDING OR REJECTED
  // =========================================================================
  if ((isPending || isRejected) && !overrideViewOrders) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <Truck className="w-6 h-6 text-orange-400" />
                <span className="font-bold text-lg text-white">Delivery Partner Verification Portal</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOverrideViewOrders(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Package className="w-3.5 h-3.5" />
                  Open Order Dashboard
                </button>
                <button
                  onClick={onNavigateHome}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Return Home
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">
                {isPending ? 'Verification Pending by Admin' : 'Application Needs Revision'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                {isPending
                  ? `Your application for ${currentUser.vehicle_type || 'Vehicle'} (${currentUser.vehicle_number || 'ML-08'}) is under review. Our local compliance team is verifying your Driving License & Payout UPI details.`
                  : 'Your application was rejected by Admin. Please re-check your RC and Driving License photo.'}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setOverrideViewOrders(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg"
              >
                <Package className="w-4 h-4" />
                Open Partner Order Dashboard
              </button>
              <button
                onClick={handleQuickDemoApprove}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                Instant Demo Approval (Test Full Dispatch)
              </button>
              <button
                onClick={onRefresh}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // CONDITION 3: APPROVED DELIVERY PARTNER (OR DEMO/PREVIEW MODE) -> FULL DRIVER DASHBOARD
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Pending / Preview Banner if not approved */}
      {!isApproved && (
        <div className="bg-amber-600/90 text-white px-4 py-2 text-xs font-bold flex items-center justify-between gap-3 border-b border-amber-500">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              Partner Account Status: <strong>{currentUser.partner_status?.toUpperCase() || 'PREVIEW MODE'}</strong> (Under Admin Review). Showing active delivery dispatches.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleQuickDemoApprove}
              className="px-2.5 py-1 bg-white text-amber-900 rounded-lg text-[11px] font-black hover:bg-amber-50 transition"
            >
              1-Click Demo Approve
            </button>
            <button
              onClick={() => setOverrideViewOrders(false)}
              className="px-2.5 py-1 bg-amber-800 hover:bg-amber-700 text-white rounded-lg text-[11px] transition"
            >
              View Application Status
            </button>
          </div>
        </div>
      )}
      {/* 1. TOP BAR */}
      <header className="bg-slate-900 border-b border-emerald-950/80 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 gap-3">
            {/* Left: Driver Fleet Brand & Identity */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center shadow-lg font-black text-xl shrink-0">
                <Truck className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-base sm:text-lg text-white tracking-tight">
                    Meri Local <span className="text-emerald-400">Logistics</span>
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Verified Partner
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="text-white font-bold">{currentUser.full_name || 'Driver'}</span>
                  <span>•</span>
                  <span className="text-amber-400 font-mono font-bold bg-slate-800 px-1.5 py-0.2 rounded">
                    {currentUser.vehicle_type || 'Bike'} ({currentUser.vehicle_number || 'ML08-A-4592'})
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Online/Offline Switch & Actions */}
            <div className="flex items-center gap-2.5">
              {/* Interactive Driver Duty Switch */}
              <div
                onClick={() => setIsDriverOnline(!isDriverOnline)}
                className={`cursor-pointer px-3.5 py-1.5 rounded-2xl border transition-all flex items-center gap-2 select-none shadow-md ${
                  isDriverOnline
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isDriverOnline ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : 'bg-slate-500'
                    }`}
                  />
                  {isDriverOnline && (
                    <span className="absolute w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-black uppercase tracking-wider">
                    {isDriverOnline ? 'ONLINE' : 'OFFLINE'}
                  </div>
                  <div className="text-[9px] opacity-80 hidden sm:block">
                    {isDriverOnline ? 'Receiving Shipments' : 'Duty Paused'}
                  </div>
                </div>
              </div>

              {/* Driver Wallet / Payout Button */}
              <button
                onClick={() => setShowPayoutModal(true)}
                className="px-3 py-1.5 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/60 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">My Payout Wallet</span>
              </button>

              {/* Real-time Order Notification Bell & Badge */}
              <div className="relative">
                <button
                  id="driver_notifications_bell_btn"
                  onClick={() => {
                    setShowNotificationsDrawer(!showNotificationsDrawer);
                    if (!showNotificationsDrawer) {
                      setUnreadCount(0);
                    }
                  }}
                  className={`p-2 rounded-xl text-xs font-bold transition flex items-center justify-center relative border ${
                    unreadCount > 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title="Live Order Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-black text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shadow-md animate-bounce">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Drawer */}
                {showNotificationsDrawer && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-xs text-white uppercase tracking-wider">
                          Real-time Order Feed
                        </span>
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                          LIVE
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {notifications.length > 0 && (
                          <button
                            onClick={() => {
                              setNotifications([]);
                              setUnreadCount(0);
                            }}
                            className="text-[10px] text-slate-400 hover:text-white"
                          >
                            Clear All
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotificationsDrawer(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1.5">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs space-y-1">
                          <Radio className="w-6 h-6 text-slate-600 mx-auto animate-pulse" />
                          <p className="font-semibold text-slate-300">Listening for live requests...</p>
                          <p className="text-[10px] text-slate-500">
                            New orders and dispatch updates will appear here automatically via Supabase Realtime.
                          </p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-xl border text-xs transition ${
                              n.type === 'new_request'
                                ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                                : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
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

              {/* Quick Dispatch Demo Order Button */}
              <button
                onClick={() => setShowNewOrderModal(true)}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                title="Create a test delivery order"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dispatch Order</span>
              </button>

              {/* Exit to User Marketplace */}
              <button
                onClick={onNavigateHome}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Marketplace</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Driver App Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Real-time Incoming Order Alert Banner */}
        {activeNewOrderBanner && (
          <div className="p-4 bg-gradient-to-r from-amber-950/95 via-orange-950/90 to-amber-950/95 border-2 border-amber-400 rounded-3xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg font-black animate-bounce">
                <Bike className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    New Live Order Available
                  </span>
                  <span className="text-white font-mono font-black text-sm">
                    {activeNewOrderBanner.order_number}
                  </span>
                  <span className="text-emerald-400 font-mono font-bold text-xs bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                    Earning: ₹{activeNewOrderBanner.partner_earning || Math.round((activeNewOrderBanner.delivery_fee || 40) * 0.8)}
                  </span>
                </div>
                <p className="text-xs text-slate-200">
                  <strong>Pickup:</strong> {activeNewOrderBanner.pickup_address || 'Chandmari, Tura'} → <strong>Drop:</strong> {activeNewOrderBanner.delivery_address || 'Tura'}
                </p>
                <p className="text-[11px] text-amber-300/90">
                  Item: {activeNewOrderBanner.item_description || 'Package'} • Distance: {activeNewOrderBanner.distance_km || 5} km
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={() => {
                  onAcceptOrder(activeNewOrderBanner.id);
                  setActiveNewOrderBanner(null);
                  setActionSuccessMsg(`Accepted order #${activeNewOrderBanner.order_number}! Order moved to Active Deliveries.`);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>Accept Delivery</span>
              </button>
              <button
                onClick={() => setActiveNewOrderBanner(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        {/* Action Success Notification Toast */}
        {actionSuccessMsg && (
          <div className="p-4 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl flex items-center justify-between gap-3 text-emerald-200 text-xs shadow-lg animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button
              onClick={() => setActionSuccessMsg(null)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* 100% PREPAID PROTOCOL SECURITY ALERT BANNER */}
        <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 border-2 border-amber-400/80 rounded-3xl p-5 shadow-lg flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md font-black">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-amber-300 uppercase tracking-wide">
                100% Prepaid Protocol Security Directive
              </h3>
              <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                Zero Cash on Delivery
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-amber-100 leading-relaxed">
              "Yeh ek 100% Prepaid App hai. Customer se delivery ke waqt koi cash ya online paisa alag se nahi lena hai. Aapka delivery charge order complete hote hi aapke app wallet mein aa jayega."
            </p>
          </div>
        </div>

        {/* Offline Warning Banner */}
        {!isDriverOnline && (
          <div className="p-4 bg-amber-950/60 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-3 text-amber-200 text-xs shadow">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>You are currently OFFLINE:</strong> You will not receive nearby order notifications until you toggle ONLINE above.
              </span>
            </div>
            <button
              onClick={() => setIsDriverOnline(true)}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black shrink-0 transition"
            >
              Go Online Now
            </button>
          </div>
        )}

        {/* 1. VISUALLY PROMINENT DRIVER WALLET BALANCE CARD */}
        <div
          id="driver_wallet_balance_card"
          className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  Delivery Partner Earnings Wallet
                </span>
                <span className="text-[10px] font-bold text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                  {currentUser.vehicle_type || 'Commercial Vehicle'} • {currentUser.vehicle_number || 'Verified Fleet'}
                </span>
              </div>

              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Available Wallet Balance (80% Guaranteed Driver Cut)
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight mt-1 flex items-baseline gap-2">
                  <span className="text-emerald-400">₹</span>
                  <span>{formatPrice(availableDriverWalletBalance)}</span>
                  <span className="text-xs text-emerald-400 font-sans font-bold bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                    Direct Settlement
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-2.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Today's Trips Earning</div>
                  <div className="text-sm font-black text-emerald-400 mt-0.5">
                    ₹{formatPrice(totalPartnerEarnedToday)}
                  </div>
                </div>
                <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-2.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Pending Payouts</div>
                  <div className="text-sm font-black text-amber-400 mt-0.5">
                    ₹{formatPrice(pendingPayoutAmount)}
                  </div>
                </div>
                <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-2.5 col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Total Withdrawn</div>
                  <div className="text-sm font-black text-teal-400 mt-0.5">
                    ₹{formatPrice(completedPayoutAmount)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <button
                id="driver_request_payout_btn"
                onClick={() => setShowPayoutModal(true)}
                className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-slate-950" />
                <span>Request Payout / Withdraw</span>
                <ChevronRight className="w-4 h-4 text-slate-950" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. EARNINGS & FLEET METRICS SUMMARY BAR */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Metric 1: Today's Net Payout */}
          <div className="bg-slate-900/90 border border-emerald-900/60 rounded-3xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-400">
              <DollarSign className="w-16 h-16" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
              Today's Payout (80%)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-2">
              ₹{formatPrice(totalPartnerEarnedToday)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Direct Driver Revenue
            </p>
          </div>

          {/* Metric 2: Completed Deliveries */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              Fulfilled Trips
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-2">
              {myCompletedOrders.length} <span className="text-xs text-slate-400 font-normal">Orders</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
              100% Completion Rate
            </p>
          </div>

          {/* Metric 3: App Platform Fee (20%) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              Platform Fee (20%)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-2">
              ₹{formatPrice(totalAppCommissionToday)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Bazaar Maintenance & Support
            </p>
          </div>

          {/* Metric 4: Distance & Hill Fuel (5km/L) */}
          <div className="bg-slate-900/90 border border-orange-900/40 rounded-3xl p-5 shadow-lg">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-400 bg-orange-950/80 px-2 py-0.5 rounded border border-orange-900/50">
              Fuel & Terrain Metric
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-2">
              {totalKmDriven} <span className="text-xs text-slate-400 font-normal">KM Logged</span>
            </div>
            <p className="text-[11px] text-orange-300/80 mt-1 flex items-center gap-1">
              <Fuel className="w-3.5 h-3.5 text-orange-400" />
              5km/L Hill Fuel Tariff Applied
            </p>
          </div>
        </section>

        {/* 3. ACTIVE IN-TRANSIT ORDERS SECTION */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
                Active In-Transit Deliveries ({myActiveOrders.length})
              </h2>
            </div>
            {myActiveOrders.length > 0 && (
              <span className="text-xs text-emerald-400 font-bold">
                Action Required: Deliver & Collect Payout
              </span>
            )}
          </div>

          {myActiveOrders.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 text-center text-slate-400 space-y-2">
              <Package className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-semibold">No active in-transit deliveries right now.</p>
              <p className="text-[11px] text-slate-500">
                Accept incoming orders from the "Available Requests" queue below to start a trip.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myActiveOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-900 border-2 border-orange-500/60 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 relative overflow-hidden"
                >
                  {/* Top Status Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-white text-sm">
                        {order.order_number}
                      </span>
                      <span className="bg-orange-500/20 text-orange-400 border border-orange-500/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                        <Truck className="w-3 h-3" /> Out for Delivery
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-400">Your Earning (80%)</div>
                      <div className="text-base font-black text-emerald-400 font-mono">
                        ₹{order.partner_earning}
                      </div>
                    </div>
                  </div>

                  {/* Route & Cargo details */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3 h-3" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Pickup:</span>
                        <p className="text-white font-semibold">{order.pickup_address}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Navigation className="w-3 h-3" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Destination:</span>
                        <p className="text-white font-semibold">{order.delivery_address}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-slate-400">Cargo: </span>
                        <span className="text-slate-200 font-semibold">{order.item_description}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-slate-300">
                        <span>{order.weight_kg} kg</span>
                        <span>•</span>
                        <span>{order.distance_km} km ({order.terrain_type})</span>
                      </div>
                    </div>
                  </div>

                  {/* Buyer Contact Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold text-center transition flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" /> Call Buyer ({order.customer_name})
                    </a>

                    <a
                      href={getWhatsAppUrl(
                        order.customer_phone,
                        `Hello ${order.customer_name}, I am your Meri Local Bazaar delivery partner with ${currentUser.vehicle_type} (${currentUser.vehicle_number}) for order ${order.order_number}. I am on my way to your address.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded-xl text-xs font-bold text-center transition flex items-center justify-center gap-1.5 border border-emerald-700/60"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp
                    </a>
                  </div>

                  {/* Mark Delivered Action */}
                  <button
                    onClick={() => handleMarkDelivered(order.id, order.order_number, order.partner_earning)}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Delivered (Submit for Buyer Confirmation)
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3.5. AWAITING BUYER CONFIRMATION SECTION */}
        {myAwaitingBuyerConfirmationOrders.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
                  Awaiting Buyer Confirmation ({myAwaitingBuyerConfirmationOrders.length})
                </h2>
              </div>
              <span className="text-xs text-amber-400 font-bold">
                Driver Marked Done • Waiting for Buyer Confirmation
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myAwaitingBuyerConfirmationOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-white text-sm">
                        {order.order_number}
                      </span>
                      <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Awaiting Buyer Confirmation
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-400">Pending Payout</div>
                      <div className="text-base font-black text-amber-400 font-mono">
                        ₹{order.partner_earning}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-2xl text-xs text-amber-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-300">
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      You marked this delivery done!
                    </div>
                    <p className="text-[11px] text-amber-300/80 leading-relaxed">
                      Status updated to <code className="bg-slate-950 px-1.5 py-0.5 rounded font-mono text-amber-400">delivered_by_boy</code> in Supabase. Payout of ₹{order.partner_earning} will be credited once the buyer clicks "Confirm Delivery Success".
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>Buyer: <strong>{order.customer_name}</strong></span>
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold border border-slate-700 inline-flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3 text-emerald-400" /> Call Buyer
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. AVAILABLE DELIVERY REQUESTS (NEARBY ORDERS QUEUE) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Package className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
                Available Nearby Requests ({availableOrders.length})
              </h2>
              {isDriverOnline ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Real-time Radar Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Duty Paused (Offline)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onRefresh}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-1 border border-slate-700"
              >
                <RefreshCw className="w-3 h-3" /> Refresh Feed
              </button>
            </div>
          </div>

          {availableOrders.length === 0 ? (
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 text-center text-slate-400 space-y-3">
              <Bike className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No pending delivery requests in your zone.</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All customer orders have been dispatched or accepted. You can click "Dispatch Order" above to create a test delivery ticket.
              </p>
              <button
                onClick={() => setShowNewOrderModal(true)}
                className="mt-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Dispatch Test Shipment
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableOrders.map((order) => {
                const isHill = order.terrain_type === 'Hill (5km/L)';
                return (
                  <div
                    key={order.id}
                    className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <span className="font-mono font-black text-white text-xs bg-slate-800 px-2 py-1 rounded-md">
                          {order.order_number}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Created {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Driver Cut (80%)</span>
                        <div className="text-lg font-black text-emerald-400 font-mono">
                          ₹{order.partner_earning}
                        </div>
                      </div>
                    </div>

                    {/* Route */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Pickup Address:</span>
                        <p className="text-slate-200 font-medium truncate">{order.pickup_address}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Delivery Address:</span>
                        <p className="text-slate-200 font-medium truncate">{order.delivery_address}</p>
                      </div>
                      <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                        <span className="truncate max-w-[140px] font-semibold text-slate-300">{order.item_description}</span>
                        <span className="font-mono text-amber-400 shrink-0">
                          {order.distance_km}km • {order.weight_kg}kg
                        </span>
                      </div>
                    </div>

                    {/* Accept Order Action */}
                    <button
                      onClick={() => handleAcceptWithFeedback(order.id, order.order_number)}
                      disabled={!isDriverOnline}
                      className={`w-full py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md ${
                        isDriverOnline
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Accept Order & Claim ₹{order.partner_earning}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* DRIVER PAYOUT WALLET MODAL */}
      <PayoutRequestModal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        currentUser={currentUser}
        availableBalance={availableDriverWalletBalance}
        userRoleLabel="Delivery Partner"
        onSubmitPayout={async (payoutData) => {
          if (onRequestPayout) {
            await onRequestPayout(payoutData);
          }
        }}
      />

      {/* DISPATCH TEST ORDER MODAL */}
      {showNewOrderModal && (
        <div
          onClick={() => setShowNewOrderModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-400" />
                <h3 className="font-black text-base text-white">Dispatch New Test Shipment</h3>
              </div>
              <button
                onClick={() => setShowNewOrderModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewShipment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Customer Name & Phone</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                    placeholder="Customer Name"
                  />
                  <input
                    type="tel"
                    required
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                    placeholder="Phone"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Pickup Address</label>
                <input
                  type="text"
                  required
                  value={newPickup}
                  onChange={(e) => setNewPickup(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  placeholder="e.g. Supermarket, Chandmari, Tura"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Delivery Destination</label>
                <input
                  type="text"
                  required
                  value={newDropoff}
                  onChange={(e) => setNewDropoff(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  placeholder="e.g. Rongram Bazaar, West Garo Hills"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Cargo Item Description</label>
                <input
                  type="text"
                  required
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
                  placeholder="e.g. Fresh Organic Garo Vegetables"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Weight (KG)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newWeight}
                    onChange={(e) => setNewWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Distance (KM)</label>
                  <input
                    type="number"
                    min="1"
                    max="150"
                    value={newDistance}
                    onChange={(e) => setNewDistance(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Terrain</label>
                  <select
                    value={newTerrain}
                    onChange={(e) => setNewTerrain(e.target.value as any)}
                    className="w-full px-2 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="Hill (5km/L)">Hill (5km/L)</option>
                    <option value="Plain">Plain</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl"
                >
                  Dispatch to Driver Feed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
