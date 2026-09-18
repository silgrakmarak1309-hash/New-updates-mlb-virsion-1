import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  MapPin,
  Tag,
  Sparkles,
  ShieldCheck,
  Store,
  Bike,
  Car,
  Smartphone,
  Wrench,
  Package,
  TrendingUp,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Listing, formatPrice, getListingPrimaryImage } from '../types';
import { getCategoryIcon } from './BrandLogo';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  listings: Listing[];
  onSelectListing: (listing: Listing) => void;
  initialQuery?: string;
}

const POPULAR_SEARCH_TAGS = [
  { label: 'Smartphones & Gadgets', category: 'Mobiles & Gadgets' },
  { label: 'Local Shops & Groceries', category: 'Shops' },
  { label: 'Electrician & Plumbing', category: 'Local Jobs & Services' },
  { label: 'Auto & Taxi Ride', category: 'Local Cab & Taxi' },
  { label: 'Bikes & Scooties', category: 'Vehicles' },
  { label: 'Properties & Rooms', category: 'Property & Real Estate' },
];

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  listings,
  onSelectListing,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialQuery]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter listings based on search query and category
  const filteredListings = listings.filter((item) => {
    const isAvailable = item.status === 'active' || item.status === 'pending';
    if (!isAvailable) return false;

    const matchesCategory =
      selectedCategory === 'All' ||
      item.category_name?.toLowerCase() === selectedCategory.toLowerCase();

    if (!matchesCategory) return false;

    if (!query.trim()) return true;

    const q = query.toLowerCase().trim();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.category_name?.toLowerCase().includes(q) ||
      item.location_name?.toLowerCase().includes(q) ||
      item.district?.toLowerCase().includes(q) ||
      item.block?.toLowerCase().includes(q) ||
      item.village?.toLowerCase().includes(q) ||
      item.seller_name?.toLowerCase().includes(q) ||
      item.phone?.includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-start bg-slate-950/80 backdrop-blur-md animate-fade-in">
      {/* Search Header Container */}
      <div className="w-full bg-white shadow-lg border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            {/* Search Input Box */}
            <div className="relative flex-1 flex items-center">
              <div className="absolute left-3.5 flex items-center justify-center pointer-events-none">
                <Search className="w-5 h-5 text-orange-600" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search verified phones, vehicles, shops, services across Meghalaya..."
                className="w-full pl-11 pr-10 py-3 sm:py-3.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border-2 border-orange-500/40 focus:border-orange-600 rounded-2xl text-slate-900 placeholder:text-slate-400 font-semibold text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-orange-500/15 transition-all shadow-inner"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="px-3.5 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold rounded-2xl text-xs sm:text-sm transition flex items-center gap-1.5 shrink-0"
            >
              <span>Esc</span>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Category / Popular Tags row */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-slate-600 font-extrabold uppercase tracking-wider text-[10px] shrink-0 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-orange-600" /> Popular:
            </span>
            {POPULAR_SEARCH_TAGS.map((tag) => (
              <button
                key={tag.label}
                onClick={() => {
                  setQuery(tag.category);
                  inputRef.current?.focus();
                }}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 border border-slate-200 text-slate-600 font-bold whitespace-nowrap transition"
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Dropdown / Modal Content Area */}
      <div
        className="flex-1 overflow-y-auto max-w-4xl w-full mx-auto p-4 sm:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-800">
                {query ? `Search Results for "${query}"` : 'Recent & Recommended Verified Listings'}
              </span>
              <span className="bg-orange-100 text-orange-800 text-xs font-black px-2 py-0.5 rounded-full">
                {filteredListings.length} found
              </span>
            </div>
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-xs text-orange-600 hover:text-orange-700 font-bold"
              >
                Clear Filter
              </button>
            )}
          </div>

          {/* Listings List */}
          {filteredListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {filteredListings.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectListing(item);
                    onClose();
                  }}
                  className="group p-3 rounded-2xl border border-slate-200 hover:border-orange-500 hover:shadow-md bg-white hover:bg-orange-50/20 transition-all cursor-pointer flex gap-3 items-center"
                >
                  {/* Thumbnail Image */}
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative border border-slate-200">
                    <img
                      src={getListingPrimaryImage(item)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {item.is_pro && (
                      <span className="absolute top-1 left-1 bg-amber-400 text-slate-950 text-[8px] font-black px-1 rounded shadow-xs">
                        PRO
                      </span>
                    )}
                  </div>

                  {/* Info Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 truncate flex items-center gap-1">
                        {getCategoryIcon(item.category_name, 'w-2.5 h-2.5 shrink-0')}
                        {item.category_name}
                      </span>
                      {item.seller_verified && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 flex items-center gap-0.5 shrink-0">
                          <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> Verified
                        </span>
                      )}
                    </div>

                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                      {item.title}
                    </h4>

                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs sm:text-sm font-black text-slate-950">
                        {formatPrice(item.price)}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-0.5 truncate max-w-[120px]">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {item.location_name || item.district || 'Meghalaya'}
                      </span>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-600 group-hover:translate-x-0.5 transition shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-2 animate-bounce" />
              <p className="font-extrabold text-sm text-slate-700">
                Koi listing nahi mili for &quot;{query}&quot;
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Kripya spelling check karein ya category filter ko &quot;All&quot; karke search karein.
              </p>
              <button
                onClick={() => setQuery('')}
                className="mt-3 px-4 py-1.5 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-500 transition shadow-xs"
              >
                Reset Search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
