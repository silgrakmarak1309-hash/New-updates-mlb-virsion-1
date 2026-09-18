import React from 'react';
import {
  Store,
  Bike,
  Car,
  Bus,
  Briefcase,
  Wrench,
  Megaphone,
  QrCode,
  Smartphone,
  Home,
  Tv,
  Armchair,
  Sparkles,
  Wheat,
  Tag,
} from 'lucide-react';

export const APP_LOGO_SRC = '/logo.png';
export const APP_LOGO_FALLBACK = '/file_0000000026d481f590b090e6f011359e.png';

interface BrandIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  variant?: 'tricolor' | 'orange' | 'white' | 'monochrome' | 'app_badge';
}

/**
 * High-definition Image Asset representation of the official Meri Local Bazaar Logo
 */
export const BrandIcon: React.FC<BrandIconProps> = ({
  size = 'md',
  className = '',
}) => {
  const pixelDimensions: Record<string, number> = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 72,
  };

  const dim = typeof size === 'number' ? size : pixelDimensions[size] || 40;

  return (
    <div
      style={{ width: `${dim}px`, height: `${dim}px` }}
      className={`relative shrink-0 select-none flex items-center justify-center overflow-hidden rounded-2xl shadow-sm ${className}`}
    >
      <img
        src={APP_LOGO_SRC}
        alt="Meri Local Bazaar Logo"
        referrerPolicy="no-referrer"
        onError={(e) => {
          // Fallback if main path fails
          const target = e.currentTarget;
          if (!target.src.includes('file_0000000026d481f590b090e6f011359e.png')) {
            target.src = APP_LOGO_FALLBACK;
          }
        }}
        className="w-full h-full object-cover rounded-2xl"
      />
    </div>
  );
};

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark' | 'glass';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Full Brand Lockup with BrandIcon + Styled Typography
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'light',
  showTagline = true,
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <BrandIcon size={size} variant={variant === 'dark' ? 'tricolor' : 'tricolor'} />
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`font-black tracking-tight ${
              size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg sm:text-xl'
            } ${variant === 'dark' ? 'text-white' : 'text-slate-900'}`}
          >
            Meri Local <span className="text-orange-600">Bazaar</span>
          </span>
          <span
            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase ${
              variant === 'dark'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-slate-900 text-white'
            }`}
          >
            LOCAL
          </span>
        </div>
        {showTagline && (
          <div
            className={`text-[10px] font-medium tracking-tight mt-1 ${
              variant === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Direct WhatsApp Community Marketplace
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Maps Category names to official Lucide vector icons
 */
export const getCategoryIcon = (categoryName?: string, className: string = 'w-4 h-4') => {
  const norm = (categoryName || '').toLowerCase().trim();

  // 1. Retail / Shops
  if (norm.includes('shop') || norm.includes('store') || norm.includes('retail') || norm.includes('grocery')) {
    return <Store className={className} />;
  }

  // 2. Bike & Auto Rickshaw
  if (norm.includes('bike') || norm.includes('auto') || norm.includes('rickshaw') || norm.includes('scooter') || norm.includes('two wheeler')) {
    return <Bike className={className} />;
  }

  // 3. Local Cab & Taxi
  if (norm.includes('cab') || norm.includes('taxi') || norm.includes('car')) {
    return <Car className={className} />;
  }

  // 4. Travelers & Tour
  if (norm.includes('traveler') || norm.includes('tour') || norm.includes('bus') || norm.includes('trip') || norm.includes('tempo')) {
    return <Bus className={className} />;
  }

  // 5. Local Jobs & Services
  if (norm.includes('job') || norm.includes('service') || norm.includes('plumber') || norm.includes('electrician') || norm.includes('mechanic') || norm.includes('repair')) {
    return <Briefcase className={className} />;
  }

  // 6. Mobiles & Gadgets
  if (norm.includes('mobile') || norm.includes('phone') || norm.includes('gadget') || norm.includes('tablet')) {
    return <Smartphone className={className} />;
  }

  // 7. General Vehicles
  if (norm.includes('vehicle')) {
    return <Car className={className} />;
  }

  // 8. Property & Real Estate
  if (norm.includes('property') || norm.includes('real estate') || norm.includes('house') || norm.includes('land') || norm.includes('plot')) {
    return <Home className={className} />;
  }

  // 9. Electronics & Appliances
  if (norm.includes('electronic') || norm.includes('appliance') || norm.includes('tv') || norm.includes('fridge')) {
    return <Tv className={className} />;
  }

  // 10. Furniture & Home
  if (norm.includes('furniture') || norm.includes('home') || norm.includes('decor')) {
    return <Armchair className={className} />;
  }

  // 11. Fashion & Beauty
  if (norm.includes('fashion') || norm.includes('beauty') || norm.includes('clothes') || norm.includes('wear')) {
    return <Sparkles className={className} />;
  }

  // 12. Agriculture & Livestock
  if (norm.includes('agri') || norm.includes('farm') || norm.includes('livestock') || norm.includes('plant') || norm.includes('crop')) {
    return <Wheat className={className} />;
  }

  // 13. Banner Ads
  if (norm.includes('banner') || norm.includes('ad') || norm.includes('promote')) {
    return <Megaphone className={className} />;
  }

  // 14. QR & UPI
  if (norm.includes('qr') || norm.includes('upi') || norm.includes('pay')) {
    return <QrCode className={className} />;
  }

  // Default fallback
  return <Tag className={className} />;
};
