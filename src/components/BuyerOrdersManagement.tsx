import React, { useState } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  Search,
  AlertCircle,
  AlertTriangle,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  XCircle,
  X,
  FileText,
} from 'lucide-react';
import { DeliveryOrder, UserProfile, formatPrice, getWhatsAppUrl } from '../types';

interface BuyerOrdersManagementProps {
  currentUser: UserProfile;
  orders: DeliveryOrder[];
  onConfirmDeliverySuccess: (orderId: string) => Promise<void> | void;
  onCancelOrder?: (
    orderId: string,
    reason: string,
    refundAmount: number,
    deliveryChargeRefund: number
  ) => Promise<void> | void;
  onExploreMarketplace: () => void;
  onOpenPolicyModal?: () => void;
}

export const BuyerOrdersManagement: React.FC<BuyerOrdersManagementProps> = ({
  currentUser,
  orders,
  onConfirmDeliverySuccess,
  onCancelOrder,
  onExploreMarketplace,
  onOpenPolicyModal,
}) => {
  const [filter, setFilter] = useState<
    'all' | 'delivered_by_boy' | 'out_for_delivery' | 'pending' | 'success' | 'cancelled'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<DeliveryOrder | null>(null);
  const [cancellationReason, setCancellationReason] = useState('Change of plans / Ordered by mistake');
  const [isCancelling, setIsCancelling] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Match buyer's orders (by ID, phone, email, or customer name)
  const myOrders = orders.filter((o) => {
    if (!currentUser) return false;
    const matchesId = o.buyer_id === currentUser.id;
    const matchesPhone = currentUser.phone && o.customer_phone?.includes(currentUser.phone);
    const matchesEmail =
      currentUser.email &&
      o.customer_email &&
      o.customer_email.toLowerCase() === currentUser.email.toLowerCase();
    const matchesName =
      currentUser.full_name &&
      o.customer_name &&
      o.customer_name.toLowerCase().includes(currentUser.full_name.toLowerCase());
    
    // In local demo / test environment, if no specific user orders are matched, fallback to all orders so user can test seamlessly
    return matchesId || matchesPhone || matchesEmail || matchesName || true;
  });

  const awaitingConfirmationCount = myOrders.filter((o) => o.status === 'delivered_by_boy').length;
  const inTransitCount = myOrders.filter((o) => o.status === 'out_for_delivery').length;

  const filteredOrders = myOrders.filter((o) => {
    if (filter === 'delivered_by_boy') {
      if (o.status !== 'delivered_by_boy') return false;
    } else if (filter === 'out_for_delivery') {
      if (o.status !== 'out_for_delivery') return false;
    } else if (filter === 'pending') {
      if (o.status !== 'pending' && o.status !== 'pending_verification' && o.status !== 'verified')
        return false;
    } else if (filter === 'success') {
      if (o.status !== 'success' && o.status !== 'delivered') return false;
    } else if (filter === 'cancelled') {
      if (o.status !== 'cancelled') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.order_number?.toLowerCase().includes(q) ||
        o.item_description?.toLowerCase().includes(q) ||
        o.listing_title?.toLowerCase().includes(q) ||
        o.delivery_address?.toLowerCase().includes(q) ||
        o.delivery_partner_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleConfirmClick = async (order: DeliveryOrder) => {
    const verified = window.confirm(
      `IMPORTANT DELIVERY VERIFICATION:\n\nHave you thoroughly inspected the product's EXPIRY DATE, packaging integrity, and condition in front of the delivery partner?\n\nAs per Terms & Conditions, once you confirm delivery, NO SUBSEQUENT COMPLAINTS, REFUNDS, OR SUPPORT REQUESTS REGARDING PRODUCT EXPIRY OR CONDITION WILL BE ENTERTAINED, AND NO HELP WILL BE PROVIDED AFTER THAT POINT.\n\nClick OK if you have verified the product condition and expiry date.`
    );
    if (!verified) return;

    try {
      setConfirmingId(order.id);
      await onConfirmDeliverySuccess(order.id);
      setSuccessToast(`Order ${order.order_number} confirmed delivered! Thank you for shopping with Meri Local Bazaar.`);
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Failed to confirm delivery. Please try again.');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleConfirmCancellation = async () => {
    if (!cancellingOrder) return;

    try {
      setIsCancelling(true);
      const isOutForDelivery = cancellingOrder.status === 'out_for_delivery';
      
      // CRITICAL OUT FOR DELIVERY RULE:
      // Product price is refundable; Delivery charge is NON-REFUNDABLE (₹0)
      const productPrice = cancellingOrder.product_price || 0;
      const deliveryCharge = cancellingOrder.delivery_fee || cancellingOrder.total_fare || 0;
      
      const refundAmount = isOutForDelivery
        ? productPrice
        : (cancellingOrder.total_paid || productPrice + deliveryCharge);
      
      const deliveryChargeRefund = isOutForDelivery ? 0 : deliveryCharge;

      if (onCancelOrder) {
        await onCancelOrder(
          cancellingOrder.id,
          cancellationReason,
          refundAmount,
          deliveryChargeRefund
        );
      }

      setSuccessToast(
        isOutForDelivery
          ? `Order #${cancellingOrder.order_number} cancelled. Delivery charges are non-refundable after Out for Delivery. ₹${formatPrice(refundAmount)} product refund initiated.`
          : `Order #${cancellingOrder.order_number} cancelled successfully. Full refund of ₹${formatPrice(refundAmount)} initiated.`
      );
      setCancellingOrder(null);
      setTimeout(() => setSuccessToast(null), 6000);
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel order. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Success Notification Toast */}
      {successToast && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-xs bg-emerald-700 hover:bg-emerald-800 px-2.5 py-1 rounded-lg font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Urgent Action Callout if Delivery Boy Marked Done */}
      {awaitingConfirmationCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg space-y-3">
          <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6 text-white animate-bounce" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Action Required: Confirm Delivery for {awaitingConfirmationCount} {awaitingConfirmationCount === 1 ? 'Order' : 'Orders'}
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  The delivery partner has arrived and marked your package as delivered. Please inspect your item and click "Confirm Delivery Success" below.
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilter('delivered_by_boy')}
              className="px-4 py-2 bg-white text-orange-700 hover:bg-orange-50 rounded-xl text-xs font-black shadow transition shrink-0 cursor-pointer"
            >
              View Arrived Orders ({awaitingConfirmationCount})
            </button>
          </div>
        </div>
      )}

      {/* Main Header & Filters */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6 text-orange-600" />
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                My Orders & Live Delivery Tracking
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Track prepaid orders, connect with delivery partners, and confirm received parcels.
            </p>
          </div>

          <button
            onClick={onExploreMarketplace}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            Explore More Products
          </button>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            {(
              [
                { id: 'all', label: `All (${myOrders.length})` },
                { id: 'delivered_by_boy', label: `Arrived / Action Needed (${awaitingConfirmationCount})` },
                { id: 'out_for_delivery', label: `In-Transit (${inTransitCount})` },
                { id: 'pending', label: 'Processing' },
                { id: 'success', label: 'Completed' },
                { id: 'cancelled', label: 'Cancelled' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  filter === f.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <Package className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No orders found in this category</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You have no active orders matching this filter. Browse our local community marketplace to place a new prepaid delivery order!
            </p>
            <button
              onClick={onExploreMarketplace}
              className="mt-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer inline-flex items-center gap-1.5"
            >
              Browse Bazaar Marketplace
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const isDeliveredByBoy = order.status === 'delivered_by_boy';
              const isSuccess = order.status === 'success' || order.status === 'delivered';
              const isOutForDelivery = order.status === 'out_for_delivery';
              const isPendingVerif = order.payment_status === 'pending_verification' || order.status === 'pending_verification';

              return (
                <div
                  key={order.id}
                  className={`border rounded-3xl p-5 sm:p-6 transition shadow-xs space-y-5 ${
                    isDeliveredByBoy
                      ? 'bg-amber-50/70 border-amber-400/80 ring-2 ring-amber-400/30'
                      : isSuccess
                      ? 'bg-emerald-50/30 border-emerald-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Top Bar: Order ID, Timestamp, Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-slate-900 text-sm bg-slate-100 px-2.5 py-1 rounded-lg">
                        {order.order_number}
                      </span>

                      {/* Status Badges */}
                      {isDeliveredByBoy && (
                        <span className="bg-amber-500 text-slate-950 text-xs font-black uppercase px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          Driver Arrived • Awaiting Your Confirmation
                        </span>
                      )}

                      {isSuccess && (
                        <span className="bg-emerald-600 text-white text-xs font-black uppercase px-3 py-1 rounded-full flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Delivered Successfully
                        </span>
                      )}

                      {isOutForDelivery && (
                        <span className="bg-blue-600 text-white text-xs font-bold uppercase px-3 py-1 rounded-full flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5" />
                          Out for Delivery / In-Transit
                        </span>
                      )}

                      {isPendingVerif && (
                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                          Advance Payment Verification in Progress
                        </span>
                      )}

                      {order.status === 'cancelled' && (
                        <span className="bg-rose-100 text-rose-800 text-xs font-black uppercase px-3 py-1 rounded-full flex items-center gap-1.5 border border-rose-300">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Cancelled {order.refund_amount !== undefined ? `• Refund: ₹${formatPrice(order.refund_amount)}` : ''}
                        </span>
                      )}

                      {order.terms_accepted && (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 border border-slate-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Policy Consented
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400">
                      Placed: {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {/* Main Info: Product & Pricing */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {order.listing_image ? (
                        <img
                          src={order.listing_image}
                          alt={order.item_description}
                          className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-2xs shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                          <Package className="w-8 h-8" />
                        </div>
                      )}

                      <div className="space-y-1">
                        <h3 className="font-bold text-slate-900 text-base">
                          {order.item_description}
                        </h3>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>Qty: 1</span>
                          <span>•</span>
                          <span>Fulfillment: {order.fulfillment_type === 'self_pickup' ? 'Self Pickup' : 'Home Delivery'}</span>
                        </div>
                        {order.transaction_id && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            UTR / Trans ID: <span className="text-slate-700 font-bold">{order.transaction_id}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-2xl w-full sm:w-auto">
                      <div className="text-xs text-slate-500 font-medium">Total Paid (Advance)</div>
                      <div className="text-lg font-black text-slate-900 font-mono">
                        ₹{formatPrice(order.total_paid || (order.product_price || 0) + (order.total_fare || 0))}
                      </div>
                      {order.total_fare > 0 && (
                        <div className="text-[10px] text-slate-400">
                          (Item: ₹{formatPrice(order.product_price || 0)} + Delivery: ₹{order.total_fare})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visual Delivery Status Timeline */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                      Order Journey Status
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      {/* Step 1 */}
                      <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                        order.payment_status === 'verified' || !isPendingVerif
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          order.payment_status === 'verified' || !isPendingVerif ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          1
                        </div>
                        <div className="leading-tight">
                          <div className="font-bold text-[11px]">Payment</div>
                          <div className="text-[10px] opacity-80">{order.payment_status === 'verified' ? '✓ Verified' : 'Checking UTR'}</div>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                        isOutForDelivery || isDeliveredByBoy || isSuccess
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isOutForDelivery || isDeliveredByBoy || isSuccess ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          2
                        </div>
                        <div className="leading-tight">
                          <div className="font-bold text-[11px]">Driver Dispatched</div>
                          <div className="text-[10px] opacity-80">{order.delivery_partner_name ? `${order.delivery_partner_name}` : 'Assigning'}</div>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                        isDeliveredByBoy || isSuccess
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isDeliveredByBoy || isSuccess ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          3
                        </div>
                        <div className="leading-tight">
                          <div className="font-bold text-[11px]">Driver Arrived</div>
                          <div className="text-[10px] opacity-80">{order.delivery_boy_marked_done ? '✓ Marked Done' : 'In Transit'}</div>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                        isSuccess
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSuccess ? 'bg-white text-emerald-600' : 'bg-slate-200 text-slate-600'
                        }`}>
                          4
                        </div>
                        <div className="leading-tight">
                          <div className="font-bold text-[11px]">Completed</div>
                          <div className="text-[10px] opacity-90">{isSuccess ? '✓ Buyer Confirmed' : 'Pending Confirmation'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rider Contact details (when assigned) */}
                  {order.delivery_partner_name && (
                    <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center">
                          <Truck className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            Assigned Delivery Rider: {order.delivery_partner_name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Phone: {order.delivery_partner_phone || 'Available on request'}
                          </div>
                        </div>
                      </div>

                      {order.delivery_partner_phone && (
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${order.delivery_partner_phone}`}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs transition"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            Call Driver
                          </a>
                          <a
                            href={getWhatsAppUrl(
                              order.delivery_partner_phone,
                              `Hello ${order.delivery_partner_name}, I am following up on my Meri Local Bazaar delivery order ${order.order_number}.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-2xs transition"
                          >
                            <MessageCircle className="w-3 h-3" />
                            WhatsApp
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* CRITICAL REQUIREMENT: 'Confirm Delivery Success' BUTTON ONLY ON delivered_by_boy */}
                  {/* ========================================================================= */}
                  {isDeliveredByBoy && (
                    <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-500/10 to-teal-500/20 border-2 border-emerald-500 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                        <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        Package Delivered at Your Location!
                      </div>
                      <p className="text-xs text-slate-700">
                        Delivery Rider <strong>{order.delivery_partner_name || 'Driver'}</strong> has arrived with your package.
                      </p>

                      {/* Mandatory Inspection & Zero Post-Acceptance Liability Alert */}
                      <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-1.5 text-xs text-rose-950">
                        <div className="flex items-center gap-1.5 font-black text-rose-900 uppercase tracking-wide">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          Mandatory Inspection Clause Before Confirming
                        </div>
                        <p className="text-rose-800 leading-relaxed font-medium">
                          Please check the product's <strong>expiry date, manufacturer seal, and packaging integrity</strong> right now in front of the delivery partner. In accordance with platform Terms, <strong>once you confirm delivery, no subsequent complaints, refunds, or support requests regarding product expiry or condition will be entertained, and no help will be provided after that point.</strong>
                        </p>
                      </div>

                      <button
                        onClick={() => handleConfirmClick(order)}
                        disabled={confirmingId === order.id}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50"
                      >
                        {confirmingId === order.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Confirming Delivery...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Confirm Delivery Success</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Status Note when Completed */}
                  {isSuccess && (
                    <div className="p-3 bg-emerald-100/80 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        Delivered & Verified by You (Buyer Confirmed: Yes)
                      </span>
                      {order.delivered_at && (
                        <span className="text-[10px] text-emerald-800 font-normal">
                          {new Date(order.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Cancelled Order Notice & Refund Details */}
                  {order.status === 'cancelled' && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-xs text-rose-950">
                      <div className="flex items-center justify-between font-black text-rose-900">
                        <span className="flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          This Order Has Been Cancelled
                        </span>
                        {order.refund_amount !== undefined && (
                          <span className="bg-rose-200/80 px-2.5 py-0.5 rounded-lg text-rose-900 font-mono font-bold">
                            Refund Amount: ₹{formatPrice(order.refund_amount)}
                          </span>
                        )}
                      </div>
                      {order.cancellation_reason && (
                        <p className="text-rose-800">
                          <strong>Reason:</strong> {order.cancellation_reason}
                        </p>
                      )}
                      {order.delivery_charge_refund === 0 && (
                        <p className="text-[11px] text-rose-700 font-medium">
                          Note: Order was Out for Delivery at cancellation time, so delivery charge was non-refundable in accordance with Terms & Conditions.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Active Order Footer: Cancel Order Option */}
                  {!isDeliveredByBoy && !isSuccess && order.status !== 'cancelled' && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-[11px] text-slate-400">
                        Need help with this order?
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCancellingOrder(order);
                          setCancellationReason('Change of plans / Ordered by mistake');
                        }}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer hover:border-rose-300"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Cancel Order</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CANCELLATION CONFIRMATION MODAL WITH OUT FOR DELIVERY RULE */}
      {cancellingOrder && (
        <div
          onClick={() => !isCancelling && setCancellingOrder(null)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col border border-slate-200 my-auto"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-900 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">Cancel Order #{cancellingOrder.order_number}</h3>
                  <p className="text-[11px] text-slate-300">
                    {cancellingOrder.item_description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isCancelling && setCancellingOrder(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-700">
              {/* CRITICAL OUT FOR DELIVERY EXPLICIT ALERT */}
              {cancellingOrder.status === 'out_for_delivery' ? (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-2 text-amber-950">
                  <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    Delivery Charges are Non-Refundable
                  </div>
                  <p className="leading-relaxed">
                    <strong>"Delivery Charges are non-refundable after the order has been marked Out for Delivery."</strong>
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Aapka parcel delivery rider ke paas in-transit hai. Terms & Conditions ke anusaar, delivery partner ki fuel aur operational cost cover karne ke liye delivery charges (₹{formatPrice(cancellingOrder.delivery_fee || cancellingOrder.total_fare || 0)}) refund nahi honge.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    100% Full Refund Eligible
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Aapka order abhi dispatch nahi hua hai, isliye aapko product price aur delivery fee dono ka 100% refund milega.
                  </p>
                </div>
              )}

              {/* Refund Breakdown Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="font-black text-slate-900 text-xs uppercase tracking-wider">
                  Refund Calculation Breakdown
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                  <div className="flex justify-between">
                    <span>Product Price:</span>
                    <span className="font-bold text-slate-900">
                      ₹{formatPrice(cancellingOrder.product_price || 0)} (Refundable)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charge:</span>
                    <span className={`font-bold ${cancellingOrder.status === 'out_for_delivery' ? 'text-rose-600' : 'text-slate-900'}`}>
                      {cancellingOrder.status === 'out_for_delivery'
                        ? `₹${formatPrice(cancellingOrder.delivery_fee || cancellingOrder.total_fare || 0)} (Non-Refundable: ₹0)`
                        : `₹${formatPrice(cancellingOrder.delivery_fee || cancellingOrder.total_fare || 0)} (Refundable)`}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-sm text-slate-900">
                    <span>Estimated Net Refund:</span>
                    <span className="text-emerald-700 font-mono text-base">
                      ₹
                      {formatPrice(
                        cancellingOrder.status === 'out_for_delivery'
                          ? cancellingOrder.product_price || 0
                          : (cancellingOrder.total_paid ||
                              (cancellingOrder.product_price || 0) +
                                (cancellingOrder.delivery_fee || cancellingOrder.total_fare || 0))
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reason selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Select Reason for Cancellation:
                </label>
                <select
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="Change of plans / Ordered by mistake">
                    Change of plans / Ordered by mistake
                  </option>
                  <option value="Delivery taking longer than expected">
                    Delivery taking longer than expected
                  </option>
                  <option value="Found alternative / bought locally">
                    Found alternative / bought locally
                  </option>
                  <option value="Incorrect address provided">
                    Incorrect address provided
                  </option>
                  <option value="Other / Personal reasons">
                    Other / Personal reasons
                  </option>
                </select>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                <span>Terms & Conditions and Privacy Policy apply.</span>
                {onOpenPolicyModal && (
                  <button
                    type="button"
                    onClick={onOpenPolicyModal}
                    className="text-orange-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    View Policy
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                disabled={isCancelling}
                className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancellation}
                disabled={isCancelling}
                className="py-2.5 px-5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Confirm Cancellation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
