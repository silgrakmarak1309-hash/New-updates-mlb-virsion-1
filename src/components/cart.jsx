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
  RefreshCw,
  AlertCircle,
  Lock,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PolicyModal } from './PolicyModal';
import {
  calculateHaversineDistanceKm,
  calculateDynamicDeliveryFee,
  getListingVendorCoordinates,
  getUserBuyerCoordinates,
} from '../lib/deliveryCalculation';

/**
 * Complete Cart Page Component (cart.jsx)
 * Supports:
 * - Supabase `cart_items` fetching with joined `listings`
 * - Increment (+) and Decrement (-) quantity with live Supabase update
 * - Remove item from cart
 * - Calculation of Subtotal, Delivery Charges, and Grand Total
 * - Mandatory Policy Acceptance Checkbox (terms_conditions & privacy_policy)
 * - "Proceed to Checkout" button
 */
export default function CartPage({
  currentUser,
  onExploreMarketplace,
  onProceedToCheckout,
  onOpenPolicyModal,
}) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyType, setPolicyType] = useState('terms_conditions');

  // Fetch cart items joined with listings
  const loadCart = async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, listing:listings(*)')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching cart_items with join:', error);
        // Fallback: fetch flat and listings separately
        const { data: flatItems } = await supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', currentUser.id);

        if (flatItems && flatItems.length > 0) {
          const listingIds = flatItems.map((i) => i.listing_id);
          const { data: listingsData } = await supabase
            .from('listings')
            .select('*')
            .in('id', listingIds);

          const listMap = (listingsData || []).reduce((acc, curr) => {
            acc[curr.id] = curr;
            return acc;
          }, {});

          const combined = flatItems.map((item) => ({
            ...item,
            listing: listMap[item.listing_id] || {},
          }));
          setCartItems(combined);
        } else {
          setCartItems([]);
        }
      } else {
        setCartItems(data || []);
      }
    } catch (err) {
      console.error('Fatal loadCart error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, [currentUser?.id]);

  // Handle Quantity Increase (+)
  const handleIncrease = async (item) => {
    const newQty = (Number(item.quantity) || 1) + 1;
    setCartItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i))
    );
    setUpdatingId(item.id);
    try {
      await supabase
        .from('cart_items')
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq('id', item.id);
    } catch (err) {
      console.error('Failed to increase quantity:', err);
      loadCart();
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle Quantity Decrease (-)
  const handleDecrease = async (item) => {
    const currentQty = Number(item.quantity) || 1;
    if (currentQty <= 1) {
      handleRemove(item.id);
      return;
    }
    const newQty = currentQty - 1;
    setCartItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i))
    );
    setUpdatingId(item.id);
    try {
      await supabase
        .from('cart_items')
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq('id', item.id);
    } catch (err) {
      console.error('Failed to decrease quantity:', err);
      loadCart();
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle Remove Item
  const handleRemove = async (cartItemId) => {
    if (!cartItemId) return;
    setUpdatingId(cartItemId);
    try {
      // 1. Authoritative Database delete call targeting public.cart_items
      if (supabase) {
        if (currentUser?.id) {
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
      }

      // 2. Immediately after database delete call completes, update UI state (filters out the deleted item)
      setCartItems((prev) =>
        prev.filter((i) => i.id !== cartItemId && String(i.listing_id) !== String(cartItemId))
      );
    } catch (err) {
      console.error('Failed to delete cart item:', err);
      // Ensure UI state filters out deleted item to avoid lingering items
      setCartItems((prev) =>
        prev.filter((i) => i.id !== cartItemId && String(i.listing_id) !== String(cartItemId))
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // Price calculations
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
  const deliveryCharges = cartItems.length > 0 ? dynamicDeliveryCalc.totalDeliveryFee : 0;
  const grandTotal = subtotal + deliveryCharges;

  const openPolicy = (type) => {
    if (onOpenPolicyModal) {
      onOpenPolicyModal(type);
    } else {
      setPolicyType(type);
      setPolicyModalOpen(true);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              My Shopping Cart
            </h1>
            <p className="text-xs text-slate-500">
              100% Prepaid Hyperlocal Cart & Order Checkout
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCart}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          {onExploreMarketplace && (
            <button
              onClick={onExploreMarketplace}
              className="px-3.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Continue Shopping</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Fetching cart from Supabase...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && cartItems.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-14 text-center space-y-4 max-w-xl mx-auto shadow-xs">
          <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mx-auto">
            <ShoppingCart className="w-10 h-10 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900">Your Cart is Empty</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add products from the marketplace to check out securely.
            </p>
          </div>
          {onExploreMarketplace && (
            <button
              onClick={onExploreMarketplace}
              className="mt-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl text-xs sm:text-sm transition shadow-md inline-flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explore Marketplace</span>
            </button>
          )}
        </div>
      )}

      {/* Cart Items & Summary */}
      {!loading && cartItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Cart List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
              <span>Items ({cartItems.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0)})</span>
              <span className="text-emerald-700 flex items-center gap-1 font-semibold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Prepaid Safe
              </span>
            </div>

            <div className="space-y-3">
              {cartItems.map((item) => {
                const listing = item.listing || {};
                const unitPrice = Number(listing.price) || 0;
                const itemTotal = unitPrice * (Number(item.quantity) || 1);
                const img =
                  listing.images_json ||
                  'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80';

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <img
                        src={img}
                        alt={listing.title || 'Product'}
                        className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200"
                      />

                      <div className="space-y-1 min-w-0 flex-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {listing.category_name || 'Item'}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 truncate">
                          {listing.title || 'Product Item'}
                        </h4>
                        <div className="text-xs font-extrabold text-emerald-700">
                          ₹{unitPrice.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-slate-200 bg-slate-50 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => handleDecrease(item)}
                          disabled={updatingId === item.id}
                          className="w-7 h-7 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-xs"
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
                          className="w-7 h-7 rounded-lg bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Total */}
                      <div className="text-right min-w-[70px]">
                        <div className="text-sm font-black text-slate-900">
                          ₹{itemTotal.toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        disabled={updatingId === item.id}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5 lg:sticky lg:top-20">
            <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Order Summary</span>
              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                100% Prepaid
              </span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Product Subtotal</span>
                <span className="font-bold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600 items-center">
                <div className="flex flex-col">
                  <span className="flex items-center gap-1.5 text-slate-800 font-bold">
                    <Truck className="w-3.5 h-3.5 text-orange-500" /> Dynamic Delivery Charge
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium pl-5">
                    Haversine Vector: {distanceKm.toFixed(1)} km (Floor: 0.5 km)
                  </span>
                </div>
                <span className="font-bold text-slate-900 text-sm">₹{deliveryCharges.toLocaleString('en-IN')}</span>
              </div>

              {/* Dynamic Delivery Breakdown Matrix */}
              {cartItems.length > 0 && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[10px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Base Flat Driver Fee:</span>
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
                    <span className="text-orange-600">₹{deliveryCharges}</span>
                  </div>
                </div>
              )}
              <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-sm font-black text-slate-900">
                <span>Grand Total</span>
                <span className="text-lg font-black text-emerald-600">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* MANDATORY POLICY CHECKBOX */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
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

            {/* Proceed to Checkout Button */}
            <button
              type="button"
              disabled={!termsAccepted || cartItems.length === 0 || subtotal < 200}
              onClick={() => onProceedToCheckout && onProceedToCheckout(cartItems, grandTotal, deliveryCharges)}
              className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2 active:scale-98 disabled:cursor-not-allowed"
            >
              <Zap className="w-4 h-4" />
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Minimum Order Value Warning */}
            {subtotal < 200 && cartItems.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-center space-y-1">
                <p className="text-xs font-bold text-red-600 flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Minimum order value must be ₹200 to place an order.</span>
                </p>
                <p className="text-[11px] text-red-500 font-medium">
                  Current items subtotal: ₹{subtotal.toLocaleString('en-IN')} (Add ₹{(200 - subtotal).toLocaleString('en-IN')} more to checkout)
                </p>
              </div>
            )}

            <div className="text-[10px] text-slate-400 text-center space-y-1 pt-1">
              <div className="flex items-center justify-center gap-1 text-slate-600 font-semibold">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>Escrow Protected Payment</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Policy Modal */}
      {!onOpenPolicyModal && (
        <PolicyModal
          isOpen={policyModalOpen}
          initialType={policyType}
          onClose={() => setPolicyModalOpen(false)}
        />
      )}
    </div>
  );
}
