import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Tag,
  ShieldCheck,
  MessageCircle,
  PhoneCall,
  CheckCircle2,
  User,
  ShoppingBag,
  Truck,
  AlertTriangle,
  CreditCard,
  QrCode,
  ChevronLeft,
  ChevronRight,
  Camera,
  Car,
  Wrench,
  Package,
  Zap,
  Store,
  ShoppingCart,
} from 'lucide-react';
import { Listing, formatPrice, getCategoryFulfillmentBadge, getListingImages } from '../types';
import { handleAddToCart as dbHandleAddToCart } from '../lib/cart';

interface ListingDetailModalProps {
  listing: Listing | null;
  onClose: () => void;
  onOrderNow?: (listing: Listing) => void;
  onAddToCart?: (listingOrId: Listing | string) => Promise<any> | any;
  onModerate?: (id: string, status: 'active' | 'rejected', isFeatured?: boolean, isPro?: boolean) => void;
  isAdmin?: boolean;
}

export function formatWhatsAppUrl(rawPhone: string | undefined, listing: Listing): string {
  const digits = (rawPhone || listing?.phone || '9876543210').replace(/\D/g, '');
  const cleanPhone = digits.length === 10 ? `91${digits}` : digits;
  const priceDisplay = formatPrice(listing?.price);
  const titleDisplay = listing?.title || 'Product Listing';
  const message = `Hello! I am inquiring about your listing: "${titleDisplay}" (₹${priceDisplay}) listed on Meri Local Bazaar. Is it still available?`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
  listing,
  onClose,
  onOrderNow,
  onAddToCart,
  onModerate,
  isAdmin = false,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isAdded, setIsAdded] = useState(false);

  // Reset selected image when listing changes
  useEffect(() => {
    setSelectedImageIndex(0);
    setIsAdded(false);
  }, [listing?.id]);

  if (!listing) return null;

  const rawPhone = listing.phone || listing.whatsapp || '9876543210';
  const cleanPhoneDigits = rawPhone.replace(/\D/g, '');
  const telUrl = `tel:${cleanPhoneDigits.length === 10 ? `+91${cleanPhoneDigits}` : rawPhone}`;
  const whatsappUrl = formatWhatsAppUrl(listing.whatsapp || listing.phone, listing);

  const fulfillmentBadge = getCategoryFulfillmentBadge(listing.category_name, listing.title);
  const images = getListingImages(listing);
  const currentImage = images[selectedImageIndex] || images[0];
  const listingPrice = Number(listing?.price) || 0;
  const isUnderMinOrder = listingPrice < 200;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col my-auto border border-slate-200"
      >
        {/* Full Image Header with Multi-Photo Carousel */}
        <div className="h-60 sm:h-76 bg-slate-900 relative shrink-0 overflow-hidden group">
          <img
            src={currentImage}
            alt={listing.title}
            className="w-full h-full object-contain sm:object-cover bg-slate-950 transition duration-300"
            onError={(e) => {
              (e.target as HTMLElement).setAttribute(
                'src',
                'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80'
              );
            }}
          />

          {/* Carousel Arrows if multiple images */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full backdrop-blur-md transition shadow-md opacity-80 group-hover:opacity-100"
                title="Previous photo"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full backdrop-blur-md transition shadow-md opacity-80 group-hover:opacity-100"
                title="Next photo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Close Button Top-Right */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition shadow-md z-10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Overlay Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[75%] z-10">
            {listing.status === 'pending' && (
              <span className="bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
                ⏳ Pending Moderation
              </span>
            )}
            {listing.is_featured && (
              <span className="bg-amber-400 text-slate-950 text-[11px] font-black px-2.5 py-1 rounded-lg shadow-sm">
                ⭐ TOP FEATURED
              </span>
            )}
            {listing.is_pro && (
              <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED PRO
              </span>
            )}
          </div>

          {/* Bottom Indicators: Photo Count & Condition */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
            {images.length > 1 ? (
              <span className="bg-black/75 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-orange-400" />
                {selectedImageIndex + 1} / {images.length} Photos
              </span>
            ) : <span />}

            {listing.condition && (
              <span className="bg-black/75 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg backdrop-blur-xs">
                {listing.condition}
              </span>
            )}
          </div>
        </div>

        {/* Thumbnail Selector Strip if multiple images */}
        {images.length > 1 && (
          <div className="bg-slate-900/90 px-3 py-2 border-b border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedImageIndex(idx)}
                className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                  selectedImageIndex === idx
                    ? 'border-orange-500 scale-105 shadow-md ring-2 ring-orange-500/40'
                    : 'border-slate-700 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}


        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">
              ₹{formatPrice(listing.price)}
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 leading-snug">
              {listing.title}
            </h3>

            <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-2 flex-wrap">
              <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg font-medium text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                {listing.location_name || 'India'}
              </span>
              <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg font-medium text-slate-700">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                {listing.category_name || 'General'}
              </span>
              {typeof listing.weight === 'number' && listing.weight > 0 && (
                <span className="flex items-center gap-1 bg-orange-50 border border-orange-200/60 px-2.5 py-1 rounded-lg font-bold text-orange-700">
                  <Package className="w-3.5 h-3.5 text-orange-500" />
                  {listing.weight >= 1000
                    ? `${(listing.weight / 1000).toFixed(listing.weight % 1000 === 0 ? 0 : 2)} kg (${listing.weight} g)`
                    : `${listing.weight} g`}
                </span>
              )}
            </div>
          </div>

          {/* Category Fulfillment Notice */}
          {fulfillmentBadge.type === 'ride' ? (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-start gap-3 text-blue-950 text-xs">
              <Car className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <strong className="block font-bold">Ride Booking / Driver Included:</strong>
                  <span className="text-[10px] font-black uppercase bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded-full">
                    Ride Service
                  </span>
                </div>
                <span className="text-slate-600 text-[11px] mt-0.5 block">
                  Verified local driver / cab / traveler service. Directly call or WhatsApp to confirm route, timings & booking fare.
                </span>
              </div>
            </div>
          ) : fulfillmentBadge.type === 'service' ? (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 flex items-start gap-3 text-purple-950 text-xs">
              <Wrench className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <strong className="block font-bold">Onsite Service / Service Visit:</strong>
                  <span className="text-[10px] font-black uppercase bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-full">
                    Onsite Visit
                  </span>
                </div>
                <span className="text-slate-600 text-[11px] mt-0.5 block">
                  Local certified expert onsite visit at your doorstep. Contact directly to schedule appointment time and site estimates.
                </span>
              </div>
            </div>
          ) : fulfillmentBadge.type === 'self_pickup' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3 text-amber-900 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Vehicle / Heavy Item — Self-Pickup Notice:</strong>
                <span>
                  Yeh item vehicle ya heavy category (Bike, Car, Auto, Vehicle, Property, etc.) mein aata hai. Iska doorstep courier available nahi hai — sirf <strong>Self-Pickup & Direct Buyer Inspection</strong> permissible hai.
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between text-emerald-900 text-xs">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>100% Prepaid Delivery:</strong> Local doorstep dispatch available across Garo Hills.
                </span>
              </div>
              <span className="text-[10px] font-black uppercase bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                Prepaid
              </span>
            </div>
          )}

          {/* Description */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Item Details & Description
            </h4>
            <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {listing.description || 'No additional description provided by the seller.'}
            </p>
          </div>

          {/* Seller Profile Summary */}
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {listing.seller_name?.charAt(0) || 'S'}
              </div>
              <div>
                <div className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider">
                  Verified Local Seller
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {listing.seller_name || 'Community Member'}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {listing.phone || 'Phone verified'}
                </div>
              </div>
            </div>
            {listing.seller_verified && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
              </span>
            )}
          </div>

          {/* Admin Moderation Actions if opened from Admin panel */}
          {isAdmin && onModerate && listing.status === 'pending' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2.5">
              <div className="text-xs font-bold text-amber-900">
                Admin Control Moderation
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onModerate(listing.id, 'active', true, true);
                    onClose();
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition"
                >
                  ✓ Approve & Feature
                </button>
                <button
                  onClick={() => {
                    onModerate(listing.id, 'active', false, false);
                    onClose();
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs transition"
                >
                  ✓ Approve Standard
                </button>
                <button
                  onClick={() => {
                    onModerate(listing.id, 'rejected', false, false);
                    onClose();
                  }}
                  className="px-3 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl text-xs transition"
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Sheet at the bottom: Add to Cart + Buy Now + WhatsApp + Call */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50/95 shrink-0 space-y-2.5">
          {/* Main Action Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Boolean(onAddToCart || dbHandleAddToCart) && (
              <button
                onClick={async () => {
                  try {
                    const handleAddToCart = onAddToCart || dbHandleAddToCart;
                    // Pass full listing object for instant offline-safe cache
                    await handleAddToCart(listing);
                    setIsAdded(true);
                    setTimeout(() => {
                      setIsAdded(false);
                    }, 2500);
                  } catch (err: any) {
                    console.error("Button click error:", err);
                  }
                }}
                className={`w-full py-3 px-3 font-bold rounded-2xl text-center text-xs sm:text-sm transition shadow-sm flex items-center justify-center gap-2 active:scale-98 cursor-pointer ${
                  isAdded
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {isAdded ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Added to Cart ✓</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 text-orange-400" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>
            )}

            {onOrderNow && (
              <button
                type="button"
                id="listing-modal-buy-now-btn"
                disabled={isUnderMinOrder}
                onClick={() => {
                  if (isUnderMinOrder) return;
                  onClose();
                  onOrderNow(listing);
                }}
                className={`w-full py-3 px-3 font-black rounded-2xl text-center text-xs sm:text-sm transition flex items-center justify-center gap-2 ${
                  isUnderMinOrder
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                    : 'bg-orange-600 hover:bg-orange-700 text-white shadow-md active:scale-98 cursor-pointer'
                } ${!onAddToCart ? 'sm:col-span-2' : ''}`}
              >
                {fulfillmentBadge.type === 'self_pickup' ? (
                  <>
                    <Store className="w-4 h-4 text-white" />
                    <span>Order (Self-Pickup)</span>
                  </>
                ) : fulfillmentBadge.type === 'ride' ? (
                  <>
                    <Car className="w-4 h-4 text-white" />
                    <span>Book Ride / Driver</span>
                  </>
                ) : fulfillmentBadge.type === 'service' ? (
                  <>
                    <Wrench className="w-4 h-4 text-white" />
                    <span>Request Service Visit</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Buy Now (Prepaid)</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Task 3: Enforce ₹200 Minimum Order Value Warning */}
          {isUnderMinOrder && onOrderNow && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-center space-y-0.5">
              <p className="text-xs font-bold text-red-600 flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>Minimum order value must be ₹200 to place an order.</span>
              </p>
              <p className="text-[11px] text-red-500 font-medium">
                Add to cart and combine with other items to reach the ₹200 threshold.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* WhatsApp Action Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-center text-xs transition shadow-xs flex items-center justify-center gap-1.5 active:scale-98"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>WhatsApp Seller</span>
            </a>

            {/* Call Seller Native Phone Dialer Button */}
            <a
              href={telUrl}
              className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-center text-xs transition shadow-xs flex items-center justify-center gap-1.5 active:scale-98"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Call Seller</span>
            </a>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-2xl text-xs border border-slate-200 transition shrink-0"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
