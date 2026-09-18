import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Megaphone,
} from 'lucide-react';
import { BannerAd } from '../types';

interface HeroBannerSectionProps {
  banners: BannerAd[];
}

export const HeroBannerSection: React.FC<HeroBannerSectionProps> = ({ banners }) => {
  const activeBanners = banners.filter((b) => b.is_active);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Reset index if banners change
  useEffect(() => {
    if (currentIndex >= activeBanners.length && activeBanners.length > 0) {
      setCurrentIndex(0);
    }
  }, [activeBanners.length, currentIndex]);

  // Auto-slide effect every 5 seconds
  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [activeBanners.length, isPaused]);

  if (activeBanners.length === 0) {
    return null;
  }

  const currentBanner = activeBanners[currentIndex] || activeBanners[0];

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const handleBannerClick = (banner: BannerAd) => {
    if (banner.target_url && banner.target_url.trim()) {
      let url = banner.target_url.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
        url = `https://${url}`;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Swiped left -> Next
      handleNext();
    } else if (distance < -minSwipeDistance) {
      // Swiped right -> Prev
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div
      className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 bg-slate-900 group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Banner Container */}
      <div
        onClick={() => handleBannerClick(currentBanner)}
        className={`relative w-full h-36 sm:h-48 md:h-56 lg:h-64 overflow-hidden select-none ${
          currentBanner.target_url ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        <img
          src={currentBanner.image_url}
          alt={currentBanner.title || 'Promotional Banner'}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-102"
          onError={(e) => {
            (e.target as HTMLElement).setAttribute(
              'src',
              'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format&fit=crop&q=80'
            );
          }}
        />

        {/* Gradient Overlay for Text Readability & Style */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 sm:top-3.5 left-2.5 sm:left-3.5 flex items-center gap-2 pointer-events-none">
          <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-amber-300 text-[10px] sm:text-xs font-black rounded-full border border-amber-400/30 flex items-center gap-1 shadow-xs">
            <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>FEATURED</span>
          </span>
          {activeBanners.length > 1 && (
            <span className="px-2 py-0.5 bg-black/50 backdrop-blur-md text-slate-300 text-[10px] font-bold rounded-full">
              {currentIndex + 1} / {activeBanners.length}
            </span>
          )}
        </div>

        {/* Target URL Badge if clickable */}
        {currentBanner.target_url && (
          <div className="absolute top-2.5 sm:top-3.5 right-2.5 sm:right-3.5 pointer-events-none">
            <span className="px-2.5 py-1 bg-orange-600/90 hover:bg-orange-600 text-white text-[10px] sm:text-xs font-black rounded-full backdrop-blur-md flex items-center gap-1 shadow-md transition">
              <span>Visit Link</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        )}

        {/* Bottom Title & Action Info */}
        <div className="absolute bottom-2.5 sm:bottom-4 left-3 sm:left-5 right-3 sm:right-5 flex items-end justify-between gap-3 pointer-events-none">
          <div className="max-w-[80%]">
            {currentBanner.title && (
              <h3 className="text-white text-sm sm:text-lg md:text-xl font-black drop-shadow-md leading-tight line-clamp-2">
                {currentBanner.title}
              </h3>
            )}
            {currentBanner.target_url && (
              <p className="text-white/80 text-[11px] sm:text-xs font-semibold drop-shadow flex items-center gap-1 mt-0.5 truncate">
                <Megaphone className="w-3 h-3 text-orange-400 shrink-0" />
                <span className="truncate">Click to explore details</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Arrows (shown if > 1 banner) */}
      {activeBanners.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Banner"
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center transition border border-white/20 shadow-md opacity-80 hover:opacity-100 hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Banner"
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center transition border border-white/20 shadow-md opacity-80 hover:opacity-100 hover:scale-105 active:scale-95"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {activeBanners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx
                    ? 'w-6 bg-orange-500 shadow'
                    : 'w-1.5 bg-white/60 hover:bg-white'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
