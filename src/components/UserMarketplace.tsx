import React, { useState } from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  Plus,
  Tag,
  MapPin,
  ShieldCheck,
  Sparkles,
  Filter,
  CheckCircle2,
  Truck,
  Zap,
  Camera,
  Car,
  Wrench,
  Package,
  Store,
  MessageCircle,
  Phone,
} from 'lucide-react';
import {
  Listing,
  formatPrice,
  getCategoryFulfillmentBadge,
  getListingPrimaryImage,
  getListingImages,
  BannerAd,
} from '../types';
import { HeroBannerSection } from './HeroBannerSection';
import { getCategoryIcon } from './BrandLogo';
import { handleAddToCart as dbHandleAddToCart } from '../lib/cart';

interface UserMarketplaceProps {
  listings: Listing[];
  banners?: BannerAd[];
  onViewListing: (listing: Listing) => void;
  onOpenSubmit: () => void;
  onOpenPro: () => void;
  onOrderNow?: (listing: Listing) => void;
  onAddToCart?: (listingOrId: Listing | string) => Promise<any> | any;
  onBuyNow?: (listing: Listing) => void;
}

const CATEGORIES = [
  'All',
  'Shops',
  'Local Jobs & Services',
  'Local Cab & Taxi',
  'Travelers & Tour',
  'Bike & Auto Rickshaw',
  'Mobiles & Gadgets',
  'Vehicles',
  'Property & Real Estate',
  'Electronics & Appliances',
  'Furniture & Home',
  'Fashion & Beauty',
  'Agriculture & Livestock',
];

const DIRECT_CONTACT_CATEGORIES = [
  'Local Jobs & Services',
  'Local Cab & Taxi',
  'Travelers & Tour',
  'Bike & Auto Rickshaw',
];

/**
 * Checks if the listing belongs to service / ride booking categories
 * that require direct WhatsApp & Call actions instead of standard cart checkout.
 */
const isDirectContactCategory = (item: Listing): boolean => {
  const cat = (item.category_name || (item as any).category || '').trim();
  if (!cat) return false;

  const normalized = cat.toLowerCase();
  return (
    cat === 'Local Jobs & Services' ||
    cat === 'Local Cab & Taxi' ||
    cat === 'Travelers & Tour' ||
    cat === 'Bike & Auto Rickshaw' ||
    normalized === 'local jobs & services' ||
    normalized === 'local cab & taxi' ||
    normalized === 'travelers & tour' ||
    normalized === 'bike & auto rickshaw' ||
    normalized === 'jobs & services' ||
    normalized === 'job & service' ||
    normalized === 'local job & service' ||
    normalized === 'cab & taxi'
  );
};

export const UserMarketplace: React.FC<UserMarketplaceProps> = ({
  listings,
  banners = [],
  onViewListing,
  onOpenSubmit,
  onOpenPro,
  onOrderNow,
  onAddToCart,
  onBuyNow,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});

  // Filter to show active listings (and pending only if by current user)
  const activeListings = listings.filter((item) => {
    const isVisible = item.status === 'active' || item.status === 'pending';
    if (!isVisible) return false;

    const matchesSearch =
      searchQuery.trim() === '' ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const itemCategory = (item.category_name || (item as any).category || '').toLowerCase();
    const targetCategory = selectedCategory.toLowerCase();

    const matchesCategory =
      selectedCategory === 'All' ||
      itemCategory === targetCategory ||
      (selectedCategory === 'Local Jobs & Services' &&
        (itemCategory === 'jobs & services' ||
          itemCategory === 'job & service' ||
          itemCategory === 'local job & service')) ||
      (selectedCategory === 'Shops' &&
        (itemCategory === 'shop' ||
          itemCategory === 'local shops' ||
          itemCategory === 'local shop'));

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Responsive Hero Banner Ads Section */}
      <HeroBannerSection banners={banners} />

      {/* Category Filter Pills (Directly below Slider) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs border border-slate-200/90 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase tracking-wider pl-1 pr-2 shrink-0 border-r border-slate-200">
          <Filter className="w-3.5 h-3.5 text-orange-600" />
          <span className="hidden sm:inline">Explore:</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl sm:rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                selectedCategory === cat
                  ? 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-500/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat !== 'All' && getCategoryIcon(cat, 'w-3.5 h-3.5 shrink-0')}
              <span>{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 100% Prepaid Protocol Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white p-4 sm:p-5 rounded-3xl border border-emerald-800/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">100% Safe Online Advance Payment</span>
              <span className="bg-emerald-500 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                Admin Verified
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              No cash handling at delivery. All orders processed safely via Admin QR & instant UPI verification.
            </p>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <span>Marketplace Listings</span>
            <span className="text-xs font-semibold text-slate-500">
              ({activeListings.length} active)
            </span>
          </h3>
        </div>

        {activeListings.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200 shadow-xs">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm sm:text-base font-bold text-slate-700">No listings found</h4>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search keywords or resetting your category filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="mt-3 px-3.5 py-1.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {activeListings.map((item) => {
              const isDirectContact = isDirectContactCategory(item);

              return (
                <div
                  key={item.id}
                  onClick={() => onViewListing(item)}
                  className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition duration-200 flex flex-col justify-between group cursor-pointer active:scale-[0.98]"
                >
                  {/* Strict Compact Image Box (Clickable Trigger) */}
                  <div className="h-28 sm:h-36 md:h-40 w-full bg-slate-100 relative overflow-hidden shrink-0">
                    <img
                      src={getListingPrimaryImage(item)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).setAttribute(
                          'src',
                          'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80'
                        );
                      }}
                    />

                    {/* Overlaid Badges */}
                    <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1 max-w-[90%]">
                      {item.is_featured && (
                        <span className="bg-amber-400 text-slate-950 text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs leading-none">
                          FEATURED
                        </span>
                      )}
                      {item.is_pro && (
                        <span className="bg-emerald-600 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5 leading-none">
                          <ShieldCheck className="w-2.5 h-2.5" /> PRO
                        </span>
                      )}
                    </div>

                    {/* Multi-Photo Count Indicator */}
                    {getListingImages(item).length > 1 && (
                      <span className="absolute top-1.5 right-1.5 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs flex items-center gap-1 leading-none shadow-xs">
                        <Camera className="w-2.5 h-2.5 text-orange-400" />
                        {getListingImages(item).length}
                      </span>
                    )}

                    {/* Fulfillment & Category Badge */}
                    {(() => {
                      const badge = getCategoryFulfillmentBadge(item.category_name, item.title);
                      if (badge.type === 'ride') {
                        return (
                          <span className="absolute bottom-1.5 right-1.5 bg-blue-950/85 text-blue-300 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs leading-none flex items-center gap-0.5 shadow-2xs">
                            <Car className="w-2.5 h-2.5" /> Ride Booking
                          </span>
                        );
                      }
                      if (badge.type === 'service') {
                        return (
                          <span className="absolute bottom-1.5 right-1.5 bg-purple-950/85 text-purple-300 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs leading-none flex items-center gap-0.5 shadow-2xs">
                            <Wrench className="w-2.5 h-2.5" /> Onsite Service
                          </span>
                        );
                      }
                      if (badge.type === 'self_pickup') {
                        return (
                          <span className="absolute bottom-1.5 right-1.5 bg-slate-900/90 text-amber-300 border border-amber-500/40 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs leading-none flex items-center gap-0.5 shadow-2xs">
                            <Store className="w-2.5 h-2.5 text-orange-400" /> Self-Pickup
                          </span>
                        );
                      }
                      return (
                        <span className="absolute bottom-1.5 right-1.5 bg-emerald-950/85 text-emerald-300 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs leading-none flex items-center gap-0.5 shadow-2xs">
                          <Truck className="w-2.5 h-2.5" /> Delivery Available
                        </span>
                      );
                    })()}
                  </div>

                  {/* Typography & Info Container */}
                  <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between space-y-1">
                    <div>
                      {/* Price */}
                      <div className="text-sm sm:text-base font-black text-emerald-600 truncate leading-tight">
                        ₹{formatPrice(item.price)}
                      </div>

                      {/* Single-Line Truncated Title */}
                      <h4
                        title={item.title}
                        className="font-bold text-slate-800 text-xs sm:text-sm truncate group-hover:text-orange-600 transition leading-snug"
                      >
                        {item.title}
                      </h4>

                      {/* Location */}
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 truncate pt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{item.location_name || 'Meghalaya'}</span>
                      </div>
                    </div>

                    {/* Conditional Action Buttons based on category */}
                    {isDirectContact ? (
                      /* Requirement 2: For 'Local Jobs & Services', 'Local Cab & Taxi', 'Travelers & Tour', and 'Bike & Auto Rickshaw'
                         Display two side-by-side buttons: WhatsApp and Direct Call */
                      <div className="mt-2 grid grid-cols-2 gap-1.5 pt-1">
                        {/* WhatsApp Action Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rawPhone =
                              item.seller_phone ||
                              item.phone ||
                              item.whatsapp ||
                              (item as any).contact_number ||
                              '';
                            const cleanPhone = String(rawPhone).replace(/[^\d]/g, '');

                            if (!cleanPhone) {
                              alert('Seller contact number is not available.');
                              return;
                            }

                            // If 10-digit Indian phone number without country code, prefix 91 for WhatsApp
                            const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                            const categoryName = item.category_name || (item as any).category || 'Service';
                            const encodedMessage = encodeURIComponent(
                              `Hello! I am inquiring about your ${categoryName}: "${item.title}". Please share more details.`
                            );
                            window.open(`https://wa.me/${waPhone}?text=${encodedMessage}`, '_blank');
                          }}
                          className="w-full py-1.5 px-1.5 font-bold rounded-xl text-[10px] sm:text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1 active:scale-95 shadow-xs cursor-pointer"
                          title="Contact on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current shrink-0" />
                          <span>WhatsApp</span>
                        </button>

                        {/* Direct Call Action Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rawPhone =
                              item.seller_phone ||
                              item.phone ||
                              item.whatsapp ||
                              (item as any).contact_number ||
                              '';
                            const cleanPhone = String(rawPhone).replace(/[^\d]/g, '');

                            if (!cleanPhone) {
                              alert('Seller phone number is not available.');
                              return;
                            }

                            window.location.href = `tel:${cleanPhone}`;
                          }}
                          className="w-full py-1.5 px-1.5 font-bold rounded-xl text-[10px] sm:text-[11px] bg-slate-900 hover:bg-slate-800 text-white transition flex items-center justify-center gap-1 active:scale-95 shadow-xs cursor-pointer"
                          title="Direct Call to Seller"
                        >
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>Direct Call</span>
                        </button>
                      </div>
                    ) : (
                      /* Requirement 3: For all other categories: Keep original Add to Cart and Buy Now buttons */
                      <div className="mt-2 grid grid-cols-2 gap-1.5 pt-1">
                        {Boolean(onAddToCart || dbHandleAddToCart) && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const handleAddToCart = onAddToCart || dbHandleAddToCart;
                                // Pass full item so local cart has instant details
                                await handleAddToCart(item);
                                setAddedItems((prev) => ({ ...prev, [item.id]: true }));
                                setTimeout(() => {
                                  setAddedItems((prev) => ({ ...prev, [item.id]: false }));
                                }, 2000);
                              } catch (err: any) {
                                console.error('Button click error:', err);
                              }
                            }}
                            className={`w-full py-1.5 px-1.5 font-bold rounded-xl text-[10px] sm:text-[11px] transition flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-xs ${
                              addedItems[item.id]
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-orange-600 hover:bg-orange-700 text-white'
                            }`}
                            title="Add item to Cart"
                          >
                            {addedItems[item.id] ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-white" />
                                <span>Added ✓</span>
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-3 h-3 text-white" />
                                <span>Add to Cart</span>
                              </>
                            )}
                          </button>
                        )}

                        {(onOrderNow || onBuyNow) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const buyHandler = onOrderNow || onBuyNow;
                              if (buyHandler) buyHandler(item);
                            }}
                            className={`w-full py-1.5 px-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[10px] sm:text-[11px] font-black transition flex items-center justify-center gap-1 active:scale-95 shadow-xs cursor-pointer ${
                              !onAddToCart && !dbHandleAddToCart ? 'col-span-2' : ''
                            }`}
                            title="Instant Buy Now with 100% Prepaid"
                          >
                            <Zap className="w-3 h-3 text-amber-300" />
                            <span>Buy Now</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserMarketplace;
