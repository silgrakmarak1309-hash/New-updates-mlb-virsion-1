export type AppRoute = 'user' | 'admin' | 'delivery_register' | 'delivery_dashboard';

export interface LocalAddressFields {
  state?: string;
  district?: string;
  block?: string;
  village?: string;
}

export interface Listing extends LocalAddressFields {
  id: string;
  title: string;
  category_id?: string;
  category_name?: string;
  category?: string;
  location_id?: string;
  location_name?: string;
  state_name?: string;
  price: number;
  condition?: string;
  description?: string;
  phone?: string;
  seller_phone?: string;
  whatsapp?: string;
  images_json?: string;
  image_urls?: string[];
  is_featured?: boolean;
  is_pro?: boolean;
  is_heavy_item?: boolean;
  weight?: number;
  status: 'pending' | 'active' | 'rejected' | string;
  seller_id?: string;
  seller_name?: string;
  seller_verified?: boolean;
  seller_latitude?: number;
  seller_longitude?: number;
  views_count?: number;
  created_at?: string | number;
}

export interface UserProfile extends LocalAddressFields {
  id: string;
  full_name?: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  avatar_url?: string;
  google_id?: string;
  city?: string;
  permanent_address?: string;
  buyer_latitude?: number;
  buyer_longitude?: number;
  role: 'customer' | 'seller' | 'delivery_partner' | 'admin' | 'super_admin' | 'user' | string;
  account_status?: 'active' | 'inactive';
  plan_status?: 'active' | 'inactive' | 'pending' | 'expired' | string;
  plan_name?: string;
  plan_expiry_date?: string | null;
  is_pro: boolean;
  pro_status?: 'active' | 'inactive' | string;
  pro_expiry?: string | number;
  hardware_locked?: boolean;
  is_delivery_partner?: boolean;
  is_seller?: boolean;
  is_approved_by_admin?: boolean;
  vehicle_type?: 'Bike' | 'Scooty' | 'Auto' | 'Commercial Auto' | string;
  vehicle_number?: string;
  driving_license?: string;
  driving_license_no?: string;
  driving_license_url?: string;
  driving_license_proof_url?: string;
  identity_url?: string;
  aadhaar_url?: string;
  aadhaar_number?: string;
  aadhaar_proof_url?: string;
  vehicle_model?: string;
  vehicle_rc_no?: string;
  vehicle_photo_url?: string;
  operational_route?: string;
  daily_rate_or_fare?: string;
  partner_status?: 'pending' | 'approved' | 'rejected' | string;
  shop_name?: string;
  shop_category?: string;
  shop_address?: string;
  shop_id_proof_type?: string;
  shop_id_no?: string;
  owner_name?: string;
  owner_id_type?: string;
  owner_id_no?: string;
  owner_id_proof_url?: string;
  city_locality?: string;
  shop_banner_url?: string;
  description?: string;
  opening_hours?: string;
  wallet_balance?: number;
  payout_upi_id?: string;
  payout_bank_name?: string;
  payout_account_no?: string;
  payout_ifsc_code?: string;
  payout_qr_image_url?: string;
  created_at?: string | number;
}

export interface Delivery {
  id: string;
  order_id: string;
  seller_id: string;
  delivery_partner_id: string;
  status: 'pending' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface DeliveryOrder extends LocalAddressFields {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  buyer_id?: string;
  buyer_confirmed?: boolean;
  buyer_confirmed_at?: string;
  delivery_boy_marked_done?: boolean;
  delivery_boy_marked_done_at?: string;
  pickup_address: string;
  delivery_address: string;
  item_description: string;
  listing_id?: string;
  listing_title?: string;
  listing_image?: string;
  product_price?: number;
  delivery_fee?: number;
  total_fare: number;
  total_paid?: number;
  weight_kg: number;
  distance_km: number;
  terrain_type: 'Plain' | 'Hill (5km/L)' | string;
  app_commission: number; // 20%
  partner_earning: number; // 80%
  payment_method?: 'online_upi' | 'advance_qr' | string;
  payment_status?: 'pending_verification' | 'approved' | 'verified' | 'rejected' | string;
  transaction_id?: string; // UTR Number
  payment_screenshot_url?: string;
  is_heavy_item?: boolean;
  fulfillment_type?: 'home_delivery' | 'self_pickup' | string;
  seller_id?: string;
  seller_name?: string;
  seller_phone?: string;
  seller_upi?: string;
  buyer_latitude?: number;
  buyer_longitude?: number;
  seller_latitude?: number;
  seller_longitude?: number;
  status:
    | 'pending'
    | 'pending_verification'
    | 'verified'
    | 'payment_verified'
    | 'out_for_delivery'
    | 'delivered_by_boy'
    | 'success'
    | 'delivered'
    | 'ready_for_pickup'
    | 'picked_up'
    | 'rejected'
    | 'cancelled'
    | string;
  delivery_partner_id?: string;
  delivery_partner_name?: string;
  delivery_partner_phone?: string;
  created_at: string;
  payment_verified_at?: string;
  accepted_at?: string;
  delivered_at?: string;
  rejection_reason?: string;
  terms_accepted?: boolean;
  privacy_accepted?: boolean;
  policy_accepted_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  refund_amount?: number;
  delivery_charge_refund?: number;
  cancelled_by?: 'buyer' | 'seller' | 'admin' | string;
}

export type PolicyType = 'terms_conditions' | 'privacy_policy';

export interface AppPolicy {
  id: string;
  policy_type: PolicyType;
  content: string;
  updated_at?: string;
}

export interface PayoutRequest {
  id: string;
  user_id?: string;
  user_name: string;
  user_phone: string;
  user_role: string;
  amount: number;
  upi_id: string;
  bank_name?: string;
  account_no?: string;
  ifsc_code?: string;
  qr_code_url?: string;
  status: 'pending' | 'completed' | 'rejected' | string;
  created_at: string;
  completed_at?: string;
  admin_notes?: string;
  driver_id?: string;
  driver_name?: string;
  driver_phone?: string;
  payout_upi_id?: string;
}

export const HEAVY_CATEGORIES = [
  'Cars & Vehicles',
  'Vehicles',
  'Bikes & Scooters',
  'Commercial Vehicles',
  'Vehicle Rental & Taxi',
  'Property & Real Estate',
  'Furniture & Home',
  'Large Home Appliances',
  'Heavy Machinery & Tools',
];

export type FulfillmentBadgeType = 'delivery' | 'ride' | 'service' | 'self_pickup';

export interface FulfillmentBadgeInfo {
  type: FulfillmentBadgeType;
  label: string;
  badgeLabel: string;
  iconType: 'truck' | 'car' | 'wrench' | 'package';
  badgeClass: string;
}

export function getCategoryFulfillmentBadge(categoryName?: string, title?: string): FulfillmentBadgeInfo {
  const cat = (categoryName || '').toLowerCase().trim();
  const t = (title || '').toLowerCase().trim();
  const combined = `${cat} ${t}`;

  // 1. Commercial Transport / Ride Services & Bookings
  // Categories: 'Local Cab & Taxi', 'Travelers & Tour', 'Bike & Auto Rickshaw' commercial rides, 'Vehicle Rental & Taxi'
  const isRideBooking =
    cat.includes('local cab') ||
    cat.includes('cab & taxi') ||
    cat.includes('traveler') ||
    cat.includes('tour') ||
    cat.includes('vehicle rental') ||
    combined.includes('cab service') ||
    combined.includes('taxi service') ||
    combined.includes('traveler') ||
    combined.includes('tour package') ||
    combined.includes('tour & wedding') ||
    combined.includes('ride service') ||
    combined.includes('ride booking') ||
    combined.includes('driver included') ||
    combined.includes('24x7 ac cab') ||
    combined.includes('airport transfer') ||
    (cat.includes('bike & auto') && (combined.includes('service') || combined.includes('booking') || combined.includes('ride') || combined.includes('fare') || combined.includes('cab')));

  if (isRideBooking) {
    return {
      type: 'ride',
      label: 'Ride Booking',
      badgeLabel: 'Ride Booking',
      iconType: 'car',
      badgeClass: 'bg-blue-950/85 text-blue-300 border border-blue-400/30 shadow-2xs',
    };
  }

  // 2. Second-Hand Vehicle Sales / Personal Vehicles for Sale (e.g., 'Vehicles', 'Cars & Vehicles', 'Bikes & Scooters', Royal Enfield Hunter 350, used cars/bikes)
  // Buyers collect the vehicle physically -> Force 'Self-Pickup'
  const isVehicleSale =
    cat === 'vehicles' ||
    cat.includes('cars & vehicles') ||
    cat.includes('bikes & scooters') ||
    cat.includes('commercial vehicles') ||
    combined.includes('royal enfield') ||
    combined.includes('hunter 350') ||
    combined.includes('hunter') ||
    combined.includes('enfield') ||
    combined.includes('bullet') ||
    combined.includes('scooter') ||
    combined.includes('motorcycle') ||
    combined.includes('second hand') ||
    combined.includes('used car') ||
    combined.includes('used bike') ||
    combined.includes('bike for sale') ||
    combined.includes('car for sale') ||
    (cat.includes('bike & auto') && !isRideBooking) ||
    (cat.includes('bike') && !isRideBooking) ||
    (cat.includes('auto rickshaw') && !isRideBooking);

  if (isVehicleSale) {
    return {
      type: 'self_pickup',
      label: 'Self-Pickup',
      badgeLabel: 'Self-Pickup',
      iconType: 'package',
      badgeClass: 'bg-slate-900/90 text-amber-300 border border-amber-500/40 shadow-2xs',
    };
  }

  // 3. Bulky Real Estate & Property that cannot be couriered -> "Self-Pickup"
  const isBulkyRealEstate =
    cat.includes('property') ||
    cat.includes('real estate') ||
    cat.includes('heavy machinery') ||
    cat.includes('machinery') ||
    combined.includes('land') ||
    combined.includes('plot') ||
    combined.includes('building');

  if (isBulkyRealEstate) {
    return {
      type: 'self_pickup',
      label: 'Self-Pickup',
      badgeLabel: 'Self-Pickup',
      iconType: 'package',
      badgeClass: 'bg-amber-950/85 text-amber-200 border border-amber-400/30 shadow-2xs',
    };
  }

  // 4. Local Jobs & Services -> "Onsite Service" or "Service Visit"
  const isService =
    cat.includes('service') ||
    cat.includes('job') ||
    combined.includes('electrician') ||
    combined.includes('plumber') ||
    combined.includes('carpenter') ||
    combined.includes('wiring') ||
    combined.includes('repair') ||
    combined.includes('mechanic') ||
    combined.includes('cleaning service') ||
    combined.includes('technician') ||
    combined.includes('onsite service') ||
    combined.includes('service visit');

  if (isService) {
    return {
      type: 'service',
      label: 'Onsite Service',
      badgeLabel: 'Onsite Service',
      iconType: 'wrench',
      badgeClass: 'bg-purple-950/85 text-purple-300 border border-purple-400/30 shadow-2xs',
    };
  }

  // 5. Default: Physical shippable items ('Shops', 'Mobiles & Gadgets', Electronics, Fashion, Grocery) -> Green "Delivery Available"
  return {
    type: 'delivery',
    label: 'Delivery Available',
    badgeLabel: 'Delivery Available',
    iconType: 'truck',
    badgeClass: 'bg-emerald-950/85 text-emerald-300 border border-emerald-400/30 shadow-2xs',
  };
}

export function isVehicleCategory(categoryName?: string, title?: string): boolean {
  if (!categoryName && !title) return false;
  const lower = `${categoryName || ''} ${title || ''}`.toLowerCase();
  return (
    lower.includes('bike & auto') ||
    lower.includes('auto rickshaw') ||
    lower.includes('cab & taxi') ||
    lower.includes('local cab') ||
    lower.includes('traveler') ||
    lower.includes('tour') ||
    lower.includes('vehicle') ||
    lower.includes('car') ||
    lower.includes('bike') ||
    lower.includes('scooter') ||
    lower.includes('motorcycle') ||
    lower.includes('bullet') ||
    lower.includes('taxi') ||
    lower.includes('tempo')
  );
}

export function isHeavyItemCategory(categoryName?: string, title?: string): boolean {
  if (!categoryName && !title) return false;
  const lower = `${categoryName || ''} ${title || ''}`.toLowerCase();
  return (
    isVehicleCategory(categoryName, title) ||
    lower.includes('property') ||
    lower.includes('land') ||
    lower.includes('plot') ||
    lower.includes('building') ||
    lower.includes('heavy machinery')
  );
}

export function calculateDeliveryFare(
  weightKg: number,
  distanceKm: number,
  terrain: 'Plain' | 'Hill (5km/L)'
): {
  totalFare: number;
  appCommission: number;
  partnerEarning: number;
} {
  const wt = Math.max(0, weightKg);
  const km = Math.max(0, distanceKm);
  let totalFare = 0;

  if (terrain === 'Hill (5km/L)') {
    // Hill (5km/L): Total = 30 + (wt * 10) + (km * 25)
    totalFare = 30 + wt * 10 + km * 25;
  } else {
    // Plain: Total = 20 + (wt * 5) + (km * 12)
    totalFare = 20 + wt * 5 + km * 12;
  }

  // Exactly 10% App Commission & 90% Partner Net Earning
  const appCommission = Math.round(totalFare * 0.10 * 100) / 100; // 10%
  const partnerEarning = Math.round((totalFare - appCommission) * 100) / 100; // 90%

  return {
    totalFare,
    appCommission,
    partnerEarning,
  };
}

export interface RechargeRequest {
  id: string;
  user_id?: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  plan_name: string;
  amount: number;
  utr: string;
  screenshot_url?: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  is_top_pro: boolean;
  listing_id?: string;
  listing_title?: string;
  created_at: string | number;
  approved_at?: string | number;
  admin_notes?: string;
}

export interface BannerAd {
  id: string;
  title?: string;
  image_url: string;
  target_url?: string;
  is_active: boolean;
  order_index?: number;
  created_at?: string | number;
}

export interface AdminSetting {
  id?: number | string;
  key: string;
  value: string;
  description?: string;
  updated_at?: string | number;
}

export interface ProPlan {
  id: string;
  name: string;
  price: number; // Total billed price (e.g., 199, 507, 894, 1440)
  monthlyPrice: number; // Per-month calculated equivalent (e.g., 199, 169, 149, 120)
  durationMonths: number;
  durationDays: number;
  durationLabel: string;
  billingSubtext: string;
  tag: string;
  boosts?: string;
  isBestValue?: boolean;
  isPopular?: boolean;
  isTopPro?: boolean;
  badge?: string;
  features: string[];
}

export interface ShopRegistration extends LocalAddressFields {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  user_email?: string;
  shop_name: string;
  category: string;
  shop_id_proof_type: 'Trade License' | 'GSTIN' | 'Local Council Reg' | 'Shop Act / Other' | string;
  shop_id_no: string;
  owner_name: string;
  owner_id_type: 'Aadhaar Card' | 'Voter ID' | 'PAN Card' | 'Passport' | string;
  owner_id_no: string;
  owner_id_proof_url?: string;
  shop_address: string;
  city_locality: string;
  shop_banner_url?: string;
  description?: string;
  opening_hours?: string;
  payout_upi_id?: string;
  payout_bank_name?: string;
  payout_account_no?: string;
  payout_ifsc_code?: string;
  payout_qr_image_url?: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  rejection_reason?: string;
  created_at: string;
  verified_at?: string;
}

export interface VehicleRegistration extends LocalAddressFields {
  id: string;
  user_id: string;
  driver_name: string;
  driver_phone: string;
  driver_whatsapp?: string;
  driver_email?: string;
  vehicle_type: 'Local Cab / Taxi' | 'Traveler (12-26 Seater)' | 'Auto Rickshaw' | 'Commercial Bike' | 'Pickup / Commercial Van' | string;
  vehicle_reg_no?: string;
  vehicle_number?: string;
  vehicle_model: string;
  vehicle_year?: string;
  driving_license_no: string;
  driving_license_proof_url?: string;
  vehicle_rc_no?: string;
  vehicle_rc_proof_url?: string;
  vehicle_photo_url?: string;
  operational_route: string;
  daily_rate_or_fare?: string;
  payout_upi_id?: string;
  payout_bank_name?: string;
  payout_account_no?: string;
  payout_ifsc_code?: string;
  payout_qr_image_url?: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  rejection_reason?: string;
  created_at: string;
  verified_at?: string;
}

export interface ServiceRegistration extends LocalAddressFields {
  id: string;
  user_id: string;
  user_name?: string;
  full_name: string;
  phone: string;
  whatsapp?: string;
  category: string;
  service_type?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  payout_upi?: string;
  driving_license_no?: string;
  driving_license_proof_url?: string;
  vehicle_rc_no?: string;
  experience: string;
  identity_proof_url?: string;
  id_proof_url?: string;
  aadhaar_or_voter_no?: string;
  service_address?: string;
  city_locality?: string;
  payout_upi_id?: string;
  bio_skills?: string;
  hourly_or_daily_rate?: string;
  estimated_rate?: string;
  is_approved: boolean;
  status: 'pending' | 'approved' | 'rejected' | string;
  rejection_reason?: string;
  created_at: string;
  verified_at?: string;
}

export function formatPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined) return '0';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
}

export function getListingImages(listing?: Listing | null): string[] {
  if (!listing) {
    return ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80'];
  }

  // Check image_urls text[] array first
  if (Array.isArray(listing.image_urls) && listing.image_urls.length > 0) {
    const valid = listing.image_urls.filter((u) => typeof u === 'string' && u.trim().length > 0);
    if (valid.length > 0) return valid;
  }

  if (!listing.images_json) {
    return ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80'];
  }

  const raw = listing.images_json.trim();
  if (!raw) {
    return ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80'];
  }

  // Try parsing as JSON array
  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => (typeof item === 'string' ? item : item?.url || '')).filter(Boolean);
      }
    } catch (e) {
      // Fall through if not valid JSON
    }
  }

  // Check comma-separated URLs
  if (raw.includes(',')) {
    const list = raw.split(',').map((u) => u.trim()).filter(Boolean);
    if (list.length > 0) return list;
  }

  return [raw];
}

export function getListingPrimaryImage(listing?: Listing | null): string {
  const images = getListingImages(listing);
  return images[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80';
}

export function getWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
}

export const MASTER_ADMIN_EMAIL = 'silgrakmarak1309@gmail.com';
export const MASTER_ADMIN_EMAILS = ['silgrakmarak1309@gmail.com'];

export interface CartItem {
  id: string;
  user_id: string;
  listing_id: string;
  quantity: number;
  created_at?: string;
  updated_at?: string;
  // Joined or enriched listing data
  listing?: Listing;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  updated_at?: string;
}

export interface PayoutLog {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'paid';
  payout_upi?: string;
  transaction_id?: string;
  created_at?: string;
  user_name?: string;
  user_phone?: string;
  role?: string;
}

export interface AppNotification {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type?: 'wallet' | 'payout' | 'order' | 'plan' | 'alert' | 'general' | string;
  data?: Record<string, any>;
  is_read?: boolean;
  created_at: string;
}

export function isMasterAdmin(user?: UserProfile | null): boolean {
  if (!user || !user.email) return false;
  return user.email.toLowerCase().trim() === 'silgrakmarak1309@gmail.com';
}

/**
 * Checks if a user has an active monthly subscription plan.
 * Master Admin has active privileges by default.
 * Regular users must have is_pro (true, 1, '1', 'true'), pro_status === 'active', or plan_status === 'active'.
 */
export function isUserPlanActive(user?: UserProfile | null): boolean {
  if (!user) return false;
  if (isMasterAdmin(user)) return true;

  // 1. is_pro check: Handles boolean true, PostgreSQL int4 1, string '1', and string 'true'
  const rawIsPro: any = (user as any).is_pro;
  if (
    rawIsPro === true ||
    rawIsPro === 1 ||
    rawIsPro === '1' ||
    String(rawIsPro).toLowerCase().trim() === 'true'
  ) {
    return true;
  }

  // 2. Direct plan_status check
  const rawPlanStatus = String((user as any).plan_status || '').toLowerCase().trim();
  if (rawPlanStatus === 'active' || rawPlanStatus === 'approved') {
    return true;
  }

  // 3. Pro status check
  const rawProStatus = String((user as any).pro_status || '').toLowerCase().trim();
  if (rawProStatus === 'active' || rawProStatus === 'approved') {
    return true;
  }

  return false;
}


