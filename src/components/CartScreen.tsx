import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Truck,
  ShoppingBag,
  Store,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  FileText,
  Lock,
  Zap,
} from 'lucide-react';
import {
  CartItem,
  Listing,
  UserProfile,
  PolicyType,
  formatPrice,
  getListingPrimaryImage,
} from '../types';
import {
  fetchUserCart,
  updateCartItemQuantity,
  removeCartItem,
  clearUserCart,
} from '../lib/cart';
import { supabase } from '../lib/supabase';
import { PolicyModal } from './PolicyModal';
import {
  calculateHaversineDistanceKm,
  calculateDynamicDeliveryFee,
  getListingVendorCoordinates,
  getUserBuyerCoordinates,
} from '../lib/deliveryCalculation';

interface CartScreenProps {
  currentUser: UserProfile;
  onExploreMarketplace: () => void;
  onProceedToCheckout: (cartItems: CartItem[], totalAmount: number, deliveryCharge: number) => void;
  onOpenPolicyModal?: (type: PolicyType) => void;
  onCartCountChange?: (count: number) => void;
}

export const CartScreen: React.FC<CartScreenProps> = ({
  currentUser,
  onExploreMarketplace,
  onProceedToCheckout,
  onOpenPolicyModal,
  onCartCountChange,
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyType, setPolicyType] = useState<PolicyType>('terms_conditions');

  // Load user cart items from Supabase
  const loadCart = async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const items = await fetchUserCart(currentUser.id);
      setCartItems(items);
      const totalQty = items.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
      onCartCountChange?.(totalQty);
    } catch (err) {
      console.warn('Failed to load cart:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, [currentUser?.id]);

  // Handle Quantity Increase (+)
  const handleIncrease = async (item: CartItem) => {
    const newQty = item.quantity + 1;
    // Optimistic UI Update
    setCartItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i))
    );
    setUpdatingId(item.id);
    try {
      await updateCartItemQuantity(item.id, newQty);
      const updatedTotal = cartItems.reduce(
        (acc, i) => acc + (i.id === item.id ? newQty : i.quantity),
        0
      );
      onCartCountChange?.(updatedTotal);
    } catch (err) {
      console.error('Error incrementing cart quantity:', err);
      // Revert if error
      loadCart();
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle Quantity Decrease (-)
  const handleDecrease = async (item: CartItem) => {
    if (item.quantity <= 1) {
      handleRemove(item.id);
      return;
    }
    const newQty = item.quantity - 1;
    // Optimistic UI Update
    setCartItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i))
    );
    setUpdatingId(item.id);
    try {
      await updateCartItemQuantity(item.id, newQty);
      const updatedTotal = cartItems.reduce(
        (acc, i) => acc + (i.id === item.id ? newQty : i.quantity),
        0
      );
      onCartCountChange?.(updatedTotal);
    } catch (err) {
      console.error('Error decrementing cart quantity:', err);
      loadCart();
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle Item Deletion / Remove
  const handleRemove = async (cartItemId: string) => {
    if (!cartItemId) return;
    setUpdatingId(cartItemId);
    try {
      // 1. Authoritative Database delete call targeting public.cart_items
      if (supabase) {
        try {
          if (currentUser?.id && currentUser.id !== 'guest_user') {
            await supabase
              .from('cart_items')
              .delete()
              .eq('user_id', currentUser.id)
              .or(`id.eq.${cartItemId},listing_id.eq.${cartItemId}`);
          } else {
            await supabase
              .from('cart_items')
              .delete()
              .or(`id.eq.${cartItemId},listing_id.eq.${cartItemId}`);
          }
        } catch (dbErr) {
          console.warn('[Cart] Database delete call warning:', dbErr);
        }
      }

      // Also ensure local storage and background state are synchronized
      await removeCartItem(cartItemId, currentUser?.id);

      // 2. Immediately after the database delete call completes, update the UI state (filters out the deleted item)
      setCartItems((prev) => {
        const remaining = prev.filter(
          (i) => i.id !== cartItemId && String(i.listing_id) !== String(cartItemId)
        );
        const updatedTotal = remaining.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
        onCartCountChange?.(updatedTotal);
        return remaining;
      });
    } catch (err) {
      console.error('Error removing cart item:', err);
      // Ensure UI state filters out deleted item to avoid lingering items
      setCartItems((prev) => {
        const remaining = prev.filter(
          (i) => i.id !== cartItemId && String(i.listing_id) !== String(cartItemId)
        );
        const updatedTotal = remaining.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
        onCartCountChange?.(updatedTotal);
        return remaining;
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const openPolicy = (type: PolicyType) => {
    if (onOpenPolicyModal) {
      onOpenPolicyModal(type);
    } else {
      setPolicyType(type);
      setPolicyModalOpen(true);
    }
  };

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => {
    const price = Number(item.listing?.price) || 0;
    const qty = Number(item.quantity) || 1;
    return acc + price * qty;
  }, 0);

  // Dynamic Distance Vector Calculation via Haversine geometric algorithm
  // Enforcing an absolute boundary floor value of 0.5 km
  const primaryListing = cartItems[0]?.listing;
  const vendorCoords = getListingVendorCoordinates(primaryListing);
  const buyerCoords = getUserBuyerCoordinates(currentUser);

  const buyerLat = currentUser?.buyer_latitude ?? buyerCoords.latitude;
  const buyerLon = currentUser?.buyer_longitude ?? buyerCoords.longitude;
  const sellerLat = primaryListing?.seller_latitude ?? vendorCoords.latitude;
  const sellerLon = primaryListing?.seller_longitude ?? vendorCoords.longitude;

  const distanceKm =
    cartItems.length > 0
      ? calculateHaversineDistanceKm(buyerLat, buyerLon, sellerLat, sellerLon)
      : 0;

  // Delivery Charges Mathematical Calculation:
  // - Base Flat Driver Service Fee: ₹20
  // - Fuel Operational Matrix Factor: ((Distance / 35 km/l Mileage) * ₹140 Petrol Rate per Litre)
  // - Product Payload Weight Multiplier: (0.1 Kg mass payload * ₹5 per Kg baseline rate)
  // - Apply final Math.round() parsing function block wrapper onto the summation
  const dynamicDeliveryCalc = calculateDynamicDeliveryFee(distanceKm, 0.1);
  const deliveryCharge = cartItems.length > 0 ? dynamicDeliveryCalc.totalDeliveryFee : 0;
  const grandTotal = subtotal + deliveryCharge;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-in fade-in duration-200">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Shopping Cart
              </h1>
              <p className="text-xs text-slate-500">
                Manage your items, check out with 100% prepaid advance security.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCart}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Refresh Cart"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Cart</span>
          </button>
          <button
            onClick={onExploreMarketplace}
            className="px-3.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="py-16 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading your cart items from Supabase...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && cartItems.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-14 text-center space-y-4 max-w-xl mx-auto shadow-xs">
          <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <ShoppingCart className="w-10 h-10 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900">Your Cart is Empty</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Looks like you haven't added any items to your cart yet. Explore verified local sellers and shops across Meghalaya!
            </p>
          </div>
          <button
            onClick={onExploreMarketplace}
            className="mt-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl text-xs sm:text-sm transition shadow-md inline-flex items-center gap-2 active:scale-98"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Explore Marketplace Now</span>
          </button>
        </div>
      )}

      {/* Cart Content: Two Column Layout */}
      {!loading && cartItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Cart Items List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
              <span>Items in Cart ({cartItems.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0)})</span>
              <span className="text-emerald-700 flex items-center gap-1 font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Prepaid Safe Order
              </span>
            </div>

            <div className="space-y-3">
              {cartItems.map((item) => {
                const listing = item.listing;
                const unitPrice = Number(listing?.price) || 0;
                const itemTotal = unitPrice * item.quantity;
                const img = getListingPrimaryImage(listing);

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition hover:border-slate-300"
                  >
                    {/* Item Image & Title info */}
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <img
                        src={img}
                        alt={listing?.title || 'Product'}
                        className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute(
                            'src',
                            'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80'
                          );
                        }}
                      />

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {listing?.category_name || 'Marketplace Item'}
                          </span>
                          {listing?.is_pro && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3" /> PRO Seller
                            </span>
                          )}
                        </div>

                        <h4
                          title={listing?.title}
                          className="text-sm font-black text-slate-900 truncate leading-snug"
                        >
                          {listing?.title || 'Listing item'}
                        </h4>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-extrabold text-emerald-700">
                            ₹{formatPrice(unitPrice)}
                          </span>
                          <span className="text-slate-400 text-[11px]">per unit</span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Selector & Item Total Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-slate-200 bg-slate-50 rounded-xl p-1 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleDecrease(item)}
                          disabled={updatingId === item.id}
                          className="w-7 h-7 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-xs transition active:scale-95 disabled:opacity-50 border border-slate-200"
                          title="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        <span className="w-8 text-center text-xs font-black text-slate-900">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleIncrease(item)}
                          disabled={updatingId === item.id}
                          className="w-7 h-7 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-xs transition active:scale-95 disabled:opacity-50 border border-slate-200"
                          title="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Item Total */}
                      <div className="text-right min-w-[70px]">
                        <div className="text-sm font-black text-slate-900">
                          ₹{formatPrice(itemTotal)}
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        disabled={updatingId === item.id}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                        title="Remove from cart"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Order Summary & Checkout Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5 lg:sticky lg:top-20">
            <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Order Summary</span>
              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                Prepaid Advance
              </span>
            </h3>

            {/* Price Calculations */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Items Subtotal</span>
                <span className="font-bold text-slate-900">₹{formatPrice(subtotal)}</span>
              </div>

              <div className="flex justify-between text-slate-600 font-medium items-center">
                <div className="flex flex-col">
                  <span className="flex items-center gap-1.5 text-slate-800 font-bold">
                    <Truck className="w-3.5 h-3.5 text-orange-500" /> Dynamic Delivery Charge
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium pl-5">
                    Haversine Vector: {distanceKm.toFixed(1)} km (Floor: 0.5 km)
                  </span>
                </div>
                <span className="font-bold text-slate-900 text-sm">₹{formatPrice(deliveryCharge)}</span>
              </div>

              {/* Dynamic Delivery Breakdown Matrix */}
              {cartItems.length > 0 && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[10px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Base Driver Service Fee:</span>
                    <span className="font-semibold text-slate-800">₹{dynamicDeliveryCalc.baseFlatDriverFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fuel Matrix (({distanceKm.toFixed(1)} km / 35) × ₹140):</span>
                    <span className="font-semibold text-slate-800">₹{dynamicDeliveryCalc.fuelOperationalFactor.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payload Multiplier (0.1 kg × ₹5):</span>
                    <span className="font-semibold text-slate-800">₹{dynamicDeliveryCalc.productPayloadMultiplier.toFixed(1)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1 flex justify-between font-bold text-slate-900">
                    <span>Total Delivery Fee (Math.round):</span>
                    <span className="text-orange-600">₹{deliveryCharge}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-slate-600 font-medium">
                <span>Platform Security & Escrow Fee</span>
                <span className="text-emerald-700 font-bold uppercase tracking-wider text-[11px]">
                  Free (₹0)
                </span>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-sm sm:text-base font-black text-slate-900">
                <span>Grand Total</span>
                <span className="text-lg font-black text-emerald-600">
                  ₹{formatPrice(grandTotal)}
                </span>
              </div>
            </div>

            {/* MANDATORY POLICY ACCEPTANCE CHECKBOX */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="cart-terms-agreement-checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-amber-400 text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-600 shrink-0"
                />
                <span className="text-[11px] text-slate-700 leading-snug">
                  I have read and agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openPolicy('terms_conditions');
                    }}
                    className="text-orange-600 font-bold underline hover:text-orange-700 inline"
                  >
                    Terms & Conditions
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openPolicy('privacy_policy');
                    }}
                    className="text-orange-600 font-bold underline hover:text-orange-700 inline"
                  >
                    Privacy Policy
                  </button>
                  . I understand that if my prepaid product order has already been marked{' '}
                  <strong className="text-slate-900">Out for Delivery</strong>, Delivery Charges are
                  non-refundable.
                </span>
              </label>

              {!termsAccepted && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800 pl-6.5">
                  <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Please agree to the policy above to enable checkout</span>
                </div>
              )}
            </div>

            {/* Checkout Action Button */}
            <button
              type="button"
              id="cart-proceed-checkout-btn"
              disabled={!termsAccepted || cartItems.length === 0}
              onClick={() => onProceedToCheckout(cartItems, grandTotal, deliveryCharge)}
              className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2 active:scale-98 disabled:cursor-not-allowed cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Proceed to 100% Prepaid Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Trust Assurance Badge */}
            <div className="text-[10px] text-slate-400 text-center space-y-1 pt-1">
              <div className="flex items-center justify-center gap-1 text-slate-600 font-semibold">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>Admin Escrow Protected Payment</span>
              </div>
              <p>Your payment is verified and held safely until delivery completion.</p>
            </div>
          </div>
        </div>
      )}

      {/* Internal Policy Modal if parent did not provide onOpenPolicyModal */}
      {!onOpenPolicyModal && (
        <PolicyModal
          isOpen={policyModalOpen}
          initialType={policyType}
          onClose={() => setPolicyModalOpen(false)}
        />
      )}
    </div>
  );
};
