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

export const UserMarketplace: React.FC<UserMarketplaceProps> = ({
  listings,
  banners = [],
  onViewListing,
  onOpenSubmit,
  onOpenPro,
  onOrderNow,
  onAddToCart,
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

    const matchesCategory =
      selectedCategory === 'All' ||
      item.category_name?.toLowerCase() === selectedCategory.toLowerCase() ||
      (selectedCategory === 'Local Jobs & Services' &&
        (item.category_name?.toLowerCase() === 'jobs & services' ||
          item.category_name?.toLowerCase() === 'job & service' ||
          item.category_name?.toLowerCase() === 'local job & service')) ||
      (selectedCategory === 'Shops' &&
        (item.category_name?.toLowerCase() === 'shop' ||
          item.category_name?.toLowerCase() === 'local shops' ||
          item.category_name?.toLowerCase() === 'local shop'));

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

                          const ProductCard = ({
  item,
  onAddToCart,
  dbHandleAddToCart,
  onBuyNow,
}) => {
  const isServiceCategory =
    item.category === 'Local Jobs & Services' ||
    item.category === 'Local Cab & Taxi' ||
    item.category === 'Travelers & Tour' ||
    item.category === 'Bike & Auto Rickshaw';

  return (
    <div>
      {isServiceCategory ? (
        // 4 service/ride categories ke liye sirf WhatsApp Booking
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();

            const sellerPhone =
              item.seller_phone || item.phone;

            if (!sellerPhone) {
              alert('Seller ka WhatsApp number available nahi hai.');
              return;
            }

            const cleanPhone = String(sellerPhone).replace(
              /[^\d]/g,
              ''
            );

            const message = encodeURIComponent(
              `Hello! Mujhe aapki service/ride book karni hai:\nCategory: ${item.category}\nItem: ${item.title}`
            );

            window.open(
              `https://wa.me/${cleanPhone}?text=${message}`,
              '_blank'
            );
          }}
          className="w-full mt-2 py-2 px-1.5 font-bold rounded-xl bg-green-600 text-white"
        >
          Book Ride / Service via WhatsApp
        </button>
      ) : (
        // Normal products ke liye Add to Cart + Buy Now
        <div className="mt-2 grid grid-cols-2 gap-1 pt-1">
          {(onAddToCart || dbHandleAddToCart) && (
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();

                try {
                  const handleAddToCart =
                    onAddToCart || dbHandleAddToCart;

                  await handleAddToCart(item);
                } catch (error) {
                  console.error(
                    'Error adding to cart:',
                    error
                  );
                }
              }}
              className="w-full bg-blue-600 text-white py-2 px-1.5 font-bold rounded-xl"
            >
              Add to Cart
            </button>
          )}

          {onBuyNow && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBuyNow(item);
              }}
              className="w-full bg-orange-600 text-white py-2 px-1.5 font-bold rounded-xl"
            >
              Buy Now
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductCard;
