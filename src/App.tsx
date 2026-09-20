import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  Plus,
  Tag,
  CreditCard,
  User,
  Sparkles,
  Menu,
  X,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Store,
  Car,
  FileCheck,
  Bike,
  Truck,
  Package,
  LogIn,
  LogOut,
  Star,
  ShieldCheck,
  ShoppingCart,
  Check,
  Search,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { generateUuid, ensureUuid, isUuid } from './lib/uuid';
import { BrandLogo, BrandIcon } from './components/BrandLogo';
import {
  Listing,
  RechargeRequest,
  UserProfile,
  AdminSetting,
  ShopRegistration,
  VehicleRegistration,
  ServiceRegistration,
  DeliveryOrder,
  BannerAd,
  PayoutRequest,
  CartItem,
  Wallet,
  PayoutLog,
  isMasterAdmin,
  isUserPlanActive,
  formatPrice,
} from './types';
import { AdminControlRoom } from './components/AdminControlRoom';
import { UserMarketplace } from './components/UserMarketplace';
import { ListingSubmissionView } from './components/ListingSubmissionView';
import { MyAdsManagement } from './components/MyAdsManagement';
import { TransactionLogs } from './components/TransactionLogs';
import { AccountSecurity } from './components/AccountSecurity';
import { ProUpgradeView } from './components/ProUpgradeView';
import { ListingDetailModal } from './components/ListingDetailModal';
import { BusinessVehicleRegistrationView } from './components/BusinessVehicleRegistrationView';
import { DeliveryPartnerRegistration } from './components/DeliveryPartnerRegistration';
import { DeliveryPartnerDashboard } from './components/DeliveryPartnerDashboard';
import { BuyerOrdersManagement } from './components/BuyerOrdersManagement';
import { CartScreen } from './components/CartScreen';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { LoginScreen } from './components/LoginScreen';
import { CheckoutModal } from './components/CheckoutModal';
import { PolicyModal } from './components/PolicyModal';
import { SearchModal } from './components/SearchModal';
import { GlobalToastContainer, NotificationBell } from './components/NotificationCenter';
import GlobalNotificationManager, { playNotificationSound } from './components/GlobalNotificationManager';
import { PolicyType } from './types';
import { fetchUserCart, addToCart, clearUserCart, getStoredLocalCart } from './lib/cart';
import {
  sendPushNotification,
  sendOrderAlertToPartner,
  checkAndSend3DaysPlanExpiryAlerts,
  dispatchAppToast,
  recordAppNotification,
  showDevicePushAlert,
} from './lib/notifications';

// Resilient initial data for fast load & offline fallback
const INITIAL_LISTINGS: Listing[] = [];

const INITIAL_PROFILES: UserProfile[] = [];

const INITIAL_RECHARGES: RechargeRequest[] = [];

const INITIAL_SETTINGS: AdminSetting[] = [
  { id: 1, key: 'upi_id', value: 'merilocalbazaar@oksbi' },
  { id: 2, key: 'admin_upi_id', value: 'merilocalbazaar@oksbi' },
  {
    id: 3,
    key: 'qr_code_url',
    value: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=merilocalbazaar@oksbi',
  },
  {
    id: 4,
    key: 'app_broadcast_alert',
    value: 'Meri Local Bazaar - Verified Community Marketplace',
  },
];

const INITIAL_SHOP_REGISTRATIONS: ShopRegistration[] = [];

const INITIAL_VEHICLE_REGISTRATIONS: VehicleRegistration[] = [];
const INITIAL_SERVICE_REGISTRATIONS: ServiceRegistration[] = [];
const INITIAL_DELIVERY_ORDERS: DeliveryOrder[] = [];
const INITIAL_BANNER_ADS: BannerAd[] = [];
const INITIAL_PAYOUT_REQUESTS: PayoutRequest[] = [];
const INITIAL_WALLETS: Wallet[] = [];
const INITIAL_PAYOUT_LOGS: PayoutLog[] = [];

type AppRoute = 'user' | 'admin' | 'delivery_register' | 'delivery_dashboard';

type UserNavTab =
  | 'marketplace'
  | 'cart'
  | 'buyer_orders'
  | 'submit'
  | 'registrations'
  | 'delivery_register'
  | 'delivery_dashboard'
  | 'my_ads'
  | 'transactions'
  | 'account'
  | 'pro_upgrade';

export function App() {
  // 1. ROUTE MANAGEMENT: Support both window.location.pathname & hash routing
  const getInitialRoute = (): AppRoute => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();

    if (
      path.startsWith('/admin') ||
      hash.includes('/admin') ||
      hash.includes('admin') ||
      search.includes('route=admin') ||
      search.includes('path=/admin')
    ) {
      return 'admin';
    }

    if (
      path.startsWith('/delivery/register') ||
      hash.includes('/delivery/register') ||
      hash.includes('delivery/register') ||
      search.includes('route=delivery_register')
    ) {
      return 'delivery_register';
    }

    if (
      path.startsWith('/delivery/dashboard') ||
      path.startsWith('/delivery') ||
      hash.includes('/delivery/dashboard') ||
      hash.includes('delivery/dashboard') ||
      search.includes('route=delivery_dashboard')
    ) {
      return 'delivery_dashboard';
    }

    return 'user';
  };

  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getInitialRoute);
  const [userActiveTab, setUserActiveTab] = useState<UserNavTab>('marketplace');

  // Listen to browser navigation changes
  useEffect(() => {
    const handleLocationChange = () => {
      const detected = getInitialRoute();
      setCurrentRoute(detected);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (route: AppRoute, userTab?: UserNavTab, overrideUser?: UserProfile) => {
    let effectiveUser = overrideUser || currentUser;
    if (!effectiveUser) {
      try {
        const saved = localStorage.getItem('mlb_active_user');
        if (saved) effectiveUser = JSON.parse(saved);
      } catch (_) {}
    }

    if (route === 'admin' && !isMasterAdmin(effectiveUser)) {
      // Hardcoded Security Lock: Block non-master admin and stay on marketplace
      setCurrentRoute('user');
      setUserActiveTab('marketplace');
      try {
        window.history.pushState({}, '', '/');
      } catch (_) {
        window.location.hash = '/';
      }
      return;
    }

    setCurrentRoute(route);
    if (userTab) setUserActiveTab(userTab);

    let targetPath = '/';
    if (route === 'admin') targetPath = '/admin';
    else if (route === 'delivery_register') targetPath = '/delivery/register';
    else if (route === 'delivery_dashboard') targetPath = '/delivery/dashboard';

    if (window.location.pathname !== targetPath) {
      try {
        window.history.pushState({}, '', targetPath);
      } catch (_) {
        // Fallback for strict iframe sandbox
        window.location.hash = targetPath;
      }
    }
  };

  // 2. DATABASE STATES (Shared with Supabase)
  const [listings, setListings] = useState<Listing[]>(INITIAL_LISTINGS);
  const [profiles, setProfiles] = useState<UserProfile[]>(INITIAL_PROFILES);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>(INITIAL_RECHARGES);
  const [settings, setSettings] = useState<AdminSetting[]>(INITIAL_SETTINGS);
  const [shopRegistrations, setShopRegistrations] = useState<ShopRegistration[]>(
    INITIAL_SHOP_REGISTRATIONS
  );
  const [vehicleRegistrations, setVehicleRegistrations] = useState<VehicleRegistration[]>(
    INITIAL_VEHICLE_REGISTRATIONS
  );
  const [serviceRegistrations, setServiceRegistrations] = useState<ServiceRegistration[]>(
    INITIAL_SERVICE_REGISTRATIONS
  );
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>(INITIAL_DELIVERY_ORDERS);
  const [bannerAds, setBannerAds] = useState<BannerAd[]>(INITIAL_BANNER_ADS);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>(INITIAL_PAYOUT_REQUESTS);
  const [wallets, setWallets] = useState<Wallet[]>(INITIAL_WALLETS);
  const [payoutLogs, setPayoutLogs] = useState<PayoutLog[]>(INITIAL_PAYOUT_LOGS);

  const [loading, setLoading] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedListingForCheckout, setSelectedListingForCheckout] = useState<Listing | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active User Profile with Google Auth State (Checking persistent localStorage session)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('mlb_active_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_) {}
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTargetFeature, setAuthTargetFeature] = useState('this feature');
  const [pendingAuthAction, setPendingAuthAction] = useState<(() => void) | null>(null);

  // Policy Modal state for Terms & Conditions and Privacy Policy viewer
  const [appPolicyModalOpen, setAppPolicyModalOpen] = useState(false);
  const [appPolicyModalType, setAppPolicyModalType] = useState<PolicyType>('terms_conditions');

  // Search Modal state for Header Magnifying Glass search
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Global Keyboard Shortcut for Search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Cart States & Live Count
  const [cartCount, setCartCount] = useState<number>(() => {
    try {
      const stored = getStoredLocalCart();
      return stored.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
    } catch (_) {
      return 0;
    }
  });
  const [cartToast, setCartToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  });

  // Sync Cart Count on user change and listen for real-time cart update events
  useEffect(() => {
    const refreshCart = () => {
      fetchUserCart(currentUser?.id).then((items) => {
        const total = items.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
        setCartCount(total);
      });
    };

    refreshCart();

    const handleCartUpdated = (e: any) => {
      if (typeof e.detail?.count === 'number') {
        setCartCount(e.detail.count);
      } else {
        refreshCart();
      }
    };

    window.addEventListener('mlb_cart_updated', handleCartUpdated);
    return () => window.removeEventListener('mlb_cart_updated', handleCartUpdated);
  }, [currentUser?.id]);

  const handleAddToCart = async (listingOrId: Listing | string) => {
    const listingId = typeof listingOrId === 'string' ? listingOrId : listingOrId.id;
    const targetListing =
      typeof listingOrId === 'object' && listingOrId !== null
        ? listingOrId
        : listings.find((l) => l.id === listingId);
    const listingTitle = targetListing?.title || 'Product Item';

    try {
      // Optimistic instant cart update & local persistence + push alert
      const res = await addToCart(currentUser?.id, targetListing || listingId, 1);
      if (res.success) {
        setCartToast({
          message: `"${listingTitle}" added to cart!`,
          visible: true,
        });
        setTimeout(() => {
          setCartToast((prev) => ({ ...prev, visible: false }));
        }, 3000);
        return res;
      } else {
        dispatchAppToast({
          title: 'Cart Notice',
          message: res.error || 'Could not add item to cart.',
          type: 'warning',
        });
        return res;
      }
    } catch (err: any) {
      console.error('Error adding to cart:', err);
      return { success: false, error: err.message };
    }
  };

    const handleProceedFromCartToCheckout = (
    cartItems: CartItem[],
    totalAmount: number,
    deliveryCharge: number
  ) => {
    if (cartItems.length === 0) return;
    const firstItem = cartItems[0].listing;
    if (firstItem) {
      // Strict Check: Taxi, Cab, Travelers ya Service category check
      const cat = (firstItem.category || '').toLowerCase();
      const isTaxiOrService = cat.includes('cab') || cat.includes('taxi') || cat.includes('travel') || cat.includes('driver');

      if (isTaxiOrService) {
        // Payment screen par mat bhejo, seedha WhatsApp redirection trigger karo
        const sellerPhone = firstItem.seller_phone || firstItem.phone || '9876543210';
        const message = encodeURIComponent(
          `Hello! Mujhe aapki ride/service book karni hai:\nService: ${firstItem.title}\nPrice: ₹${firstItem.price}`
        );
        window.open(`https://wa.me{sellerPhone}?text=${message}`, '_blank');
        return; // Function ko yahi rok do taaki payment screen na khule
      }

      const summaryListing: Listing = {
        ...firstItem,
        id: cartItems.length === 1 ? firstItem.id : `cart_order_${Date.now()}`,
        title:
          cartItems.length === 1
            ? firstItem.title
            : `Cart Order (${cartItems.length} items): ${cartItems
                .map((i) => i.listing?.title || 'Item')
                .join(', ')
                .slice(0, 65)}...`,
        price: cartItems.reduce(
          (sum, i) => sum + (Number(i.listing?.price) || 0) * (Number(i.quantity) || 1),
          0
        ),
        description: `Consolidated Hyperlocal Cart Order (${cartItems.length} Items):\n${cartItems
          .map(
            (i, idx) =>
              `idx + 1. {i.listing?.title || 'Product'} (xi.quantity) - ₹{(Number(i.listing?.price) || 0) * (Number(i.quantity) || 1)}`
          )
          .join('\n')}`,
      };
      setSelectedListingForCheckout(summaryListing);
    }
  };
  

  const openAppPolicy = (type: PolicyType) => {
    setAppPolicyModalType(type);
    setAppPolicyModalOpen(true);
  };

  // Protected route action wrapper
  const handleRequireAuth = (featureName: string, action: () => void) => {
    if (currentUser) {
      action();
    } else {
      setAuthTargetFeature(featureName);
      setPendingAuthAction(() => action);
      setIsAuthModalOpen(true);
    }
  };

  // Dynamically Sync Auth User Session & Profile from Supabase
  const syncAuthUserSession = useCallback(async (sessionUser?: any) => {
    if (!supabase) return;
    try {
      let authUser = sessionUser;
      if (!authUser) {
        const { data: sessionData } = await supabase.auth.getSession();
        authUser = sessionData?.session?.user;
      }

      if (authUser && authUser.id) {
        // Query live profile by auth user ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        const metadata = authUser.user_metadata || {};
        const authFullName =
          metadata.full_name ||
          metadata.name ||
          metadata.user_name ||
          (authUser.email ? authUser.email.split('@')[0] : '');

        const authAvatar =
          metadata.avatar_url ||
          metadata.picture ||
          metadata.avatar ||
          '';

        const effectiveFullName = profile?.full_name || authFullName || 'Member';
        const effectiveAvatar = profile?.avatar_url || authAvatar || '';
        const isUserAdmin =
          authUser.email?.toLowerCase().trim() === 'silgrakmarak1309@gmail.com';

        const effectiveWalletBalance = Number(profile?.wallet_balance || 0);

        // Normalize is_pro across boolean, PostgreSQL integer (1), and string ('1', 'true')
        const rawProfileIsPro: any = (profile as any)?.is_pro;
        const normalizedIsPro =
          rawProfileIsPro === true ||
          rawProfileIsPro === 1 ||
          rawProfileIsPro === '1' ||
          String(rawProfileIsPro).toLowerCase().trim() === 'true';

        const rawPlanStatus = String(profile?.plan_status || '').toLowerCase().trim();
        const rawProStatus = String(profile?.pro_status || '').toLowerCase().trim();
        const isPlanActive =
          normalizedIsPro ||
          rawPlanStatus === 'active' ||
          rawPlanStatus === 'approved' ||
          rawProStatus === 'active' ||
          rawProStatus === 'approved' ||
          isUserAdmin;
        
        const updatedProfile: UserProfile = {
          id: authUser.id,
          email: authUser.email || profile?.email || '',
          full_name: effectiveFullName,
          avatar_url: effectiveAvatar,
          phone: profile?.phone || authUser.phone || metadata.phone || '',
          city: profile?.city || 'Meghalaya',
          state: profile?.state || 'Meghalaya',
          district: profile?.district || '',
          block: profile?.block || '',
          village: profile?.village || '',
          permanent_address: profile?.permanent_address || '',
          role: (profile?.role || (isUserAdmin ? 'admin' : 'user')) as any,
          plan_status: isPlanActive ? 'active' : (profile?.plan_status || 'inactive'),
          plan_name: profile?.plan_name || (isPlanActive ? 'PRO Monthly Plan' : undefined),
          plan_expiry_date: profile?.plan_expiry_date || profile?.pro_expiry || null,
          is_pro: isPlanActive,
          pro_status: isPlanActive ? 'active' : (profile?.pro_status || 'inactive'),
          pro_expiry: profile?.pro_expiry || (isUserAdmin ? '2030-12-31' : undefined),
          is_delivery_partner: profile?.is_delivery_partner || false,
          partner_status: profile?.partner_status || 'none',
          is_approved_by_admin: profile?.is_approved_by_admin ?? true,
          driving_license: profile?.driving_license || '',
          driving_license_no: profile?.driving_license_no || '',
          driving_license_proof_url: profile?.driving_license_proof_url || '',
          vehicle_rc_no: profile?.vehicle_rc_no || '',
          payout_upi_id: profile?.payout_upi_id || '',
          payout_bank_name: profile?.payout_bank_name || '',
          payout_account_no: profile?.payout_account_no || '',
          payout_ifsc_code: profile?.payout_ifsc_code || '',
          payout_qr_image_url: profile?.payout_qr_image_url || '',
          wallet_balance: effectiveWalletBalance,
          created_at: profile?.created_at || new Date().toISOString(),
        };

        // If profile didn't exist in Supabase DB yet, upsert it
        if (!profile) {
          try {
            await supabase.from('profiles').upsert([updatedProfile]);
          } catch (upsertErr) {
            console.warn('Profile sync upsert fallback:', upsertErr);
          }
        }

        setCurrentUser(updatedProfile);
        try {
          localStorage.setItem('mlb_active_user', JSON.stringify(updatedProfile));
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Dynamic user profile session sync:', err);
    }
  }, []);

  const handleLoginSuccess = (user: UserProfile, targetRoute?: AppRoute) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('mlb_active_user', JSON.stringify(user));
    } catch (_) {}
    setProfiles((prev) => {
      const exists = prev.some((p) => p.email === user.email || p.id === user.id);
      if (exists) {
        return prev.map((p) => (p.email === user.email || p.id === user.id ? user : p));
      }
      return [user, ...prev];
    });

    if (
      targetRoute === 'admin' ||
      currentRoute === 'admin' ||
      (typeof window !== 'undefined' && window.location.pathname.includes('/admin'))
    ) {
      navigateTo('admin', undefined, user);
    } else {
      setUserActiveTab('marketplace');
    }

    if (pendingAuthAction) {
      pendingAuthAction();
      setPendingAuthAction(null);
    }
  };

  const handleSignOut = () => {
    try {
      localStorage.removeItem('mlb_active_user');
    } catch (_) {}
    setCurrentUser(null);
    setUserActiveTab('marketplace');
    if (supabase) {
      supabase.auth.signOut().catch(() => {});
    }
  };

  // Dynamic system settings
  const upiId =
    settings.find((s) => s.key === 'upi_id' || s.key === 'admin_upi_id')?.value ||
    'merilocalbazaar@oksbi';
  const qrCodeUrl =
    settings.find((s) => s.key === 'qr_code_url' || s.key === 'admin_qr_url')?.value ||
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${upiId}`;
  const broadcastAlert =
    settings.find((s) => s.key === 'app_broadcast_alert')?.value ||
    'Welcome to Meri Local Bazaar - Verified Community Marketplace';

  // Live Supabase Data Fetcher
  const fetchData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    try {
      // 1. Listings
      const { data: listingsData } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (listingsData) {
        setListings(listingsData);
      }

      // 2. Profiles
      const { data: profilesData } = await supabase.from('profiles').select('*');
      if (profilesData) {
        setProfiles(profilesData);
        // Refresh active user wallet balance if present
        setCurrentUser((prev) => {
          if (!prev) return null;
          const fresh = profilesData.find((p) => p.id === prev.id || p.email === prev.email);
          if (fresh && typeof fresh.wallet_balance === 'number' && fresh.wallet_balance !== prev.wallet_balance) {
            const updated = { ...prev, wallet_balance: fresh.wallet_balance };
            try {
              localStorage.setItem('mlb_active_user', JSON.stringify(updated));
            } catch (_) {}
            return updated;
          }
          return prev;
        });
      }

      // 3. Recharge Requests
      const { data: rechargesData } = await supabase
        .from('recharge_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (rechargesData) {
        setRechargeRequests(rechargesData);
      }

      // 4. Settings
      const { data: settingsData } = await supabase.from('settings').select('*');
      if (settingsData && settingsData.length > 0) {
        setSettings(settingsData);
      }

      // 5. Shop Registrations
      const { data: shopsData } = await supabase
        .from('shop_registrations')
        .select('*')
        .order('created_at', { ascending: false });
      if (shopsData) {
        setShopRegistrations(shopsData);
      }

      // 6. Vehicle Registrations
      const { data: vehiclesData } = await supabase
        .from('vehicle_registrations')
        .select('*')
        .order('created_at', { ascending: false });
      if (vehiclesData) {
        setVehicleRegistrations(vehiclesData);
      }

    // 6.5. Local Services & Jobs Registrations (Taxi, Cab, Local Service, Jobs)
    const { data: servicesData } = await supabase
      .from('service_registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (servicesData) {
      if ((window as any).lastServicesCount !== undefined && servicesData.length > (window as any).lastServicesCount) {
        try {
          playNotificationSound();
        } catch (_) {}
        dispatchAppToast({
          title: '🚖 New Service/Taxi Alert',
          message: 'New ride or service booking received. Check Local Services / Cab requests.',
          type: 'info',
          duration: 6000,
        });
      }
      (window as any).lastServicesCount = servicesData.length;
      setServiceRegistrations(servicesData);
    }

    // 6.7. Realtime Withdrawal / Payout Requests Notification Sync
    const { data: latestPayoutsData } = await supabase
      .from('payout_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (latestPayoutsData) {
      if ((window as any).lastPayoutsCount !== undefined && latestPayoutsData.length > (window as any).lastPayoutsCount) {
        // Sirf Admin ko hi withdrawal ka notification milega
        if (currentUser?.email?.toLowerCase().trim() === 'silgrakmarak1309@gmail.com') {
          try {
            playNotificationSound();
          } catch (_) {}
          dispatchAppToast({
            title: '💰 Naya Withdrawal Request!',
            message: 'Ek seller ne amount withdrawal ke liye request ki hai.',
            type: 'info',
            duration: 6000,
          });
        }
      }
      (window as any).lastPayoutsCount = latestPayoutsData.length;
    }

    // 7. Delivery Orders (Riders & Store Sellers)
    const { data: deliveriesData } = await supabase
      .from('delivery_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (deliveriesData) {
      if ((window as any).lastDeliveriesCount !== undefined && deliveriesData.length > (window as any).lastDeliveriesCount) {
        const newestDelivery = deliveriesData[0]; // Sabse naya order check karne ke liye
        const isAdmin = currentUser?.email?.toLowerCase().trim() === 'silgrakmarak1309@gmail.com';
        const isMyOrder = Boolean(currentUser && newestDelivery?.user_id === currentUser.id);

        // Admin ko saare orders aur Buyer ko sirf uska apna order dikhega
        if (isAdmin || isMyOrder) {
          try {
            playNotificationSound();
          } catch (_) {}
          dispatchAppToast({
            title: isMyOrder ? '🛍️ Aapka Order Confirm Hua!' : '📦 New Delivery Order Alert',
            message: isMyOrder ? 'Aapka order successfully place ho gaya hai.' : 'New delivery order received! Driver / Seller check dashboard.',
            type: 'info',
            duration: 6000,
          });
        }
      }
      (window as any).lastDeliveriesCount = deliveriesData.length;
      setDeliveryOrders(deliveriesData);
    }
      

      // 8. Custom Banner Ads
      const { data: bannersData } = await supabase
        .from('banner_ads')
        .select('*')
        .order('order_index', { ascending: true });
      if (bannersData) {
        setBannerAds(bannersData);
      }

      // 9. Withdrawal & Payout Requests
      const { data: payoutsData } = await supabase
      .from('payout_requests')
      .select('*')
      .in('status', ['pending', 'Pending', 'PENDING'])
      .order('created_at', { ascending: false });
      
      if (payoutsData) {
        setPayoutRequests(payoutsData);
      }

      // 10. Wallets & Profiles Live Wallet Balance Sync
      try {
        const { data: walletsData } = await supabase
          .from('wallets')
          .select('*');
        if (walletsData) {
          setWallets(walletsData);
        }

        // Live Profile Wallet Balance Sync for logged-in user
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, phone, wallet_balance');

        if (profilesData && profilesData.length > 0) {
          setCurrentUser((prev) => {
            if (!prev) return null;

            // Logged-in user ki ID, email ya phone se record match karein
            const userProfile = profilesData.find((prof) =>
              prof.id === prev.id ||
              (prev.email && prof.email && prof.email.toLowerCase().trim() === prev.email.toLowerCase().trim()) ||
              (prev.phone && prof.phone && prof.phone === prev.phone)
            );

            if (userProfile && typeof userProfile.wallet_balance === 'number') {
              const newBalance = Number(userProfile.wallet_balance);

              if (prev.wallet_balance !== newBalance) {
                const updated = { ...prev, wallet_balance: newBalance };
                try {
                  localStorage.setItem('mlb_active_user', JSON.stringify(updated));
                } catch (e) {
                  console.error('Localstorage sync error:', e);
                }
                return updated;
              }
            }
            return prev;
          });
        }
      } catch (walletSyncErr) {
        console.warn('Wallet live balance sync error:', walletSyncErr);
      }
      

      // 11. Payout Logs
      const { data: payoutLogsData } = await supabase
        .from('payout_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (payoutLogsData) {
        setPayoutLogs(payoutLogsData);
      }
    } catch (err) {
      console.warn('Supabase fetch notification (using verified local state):', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAdminRegistrations = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('service_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Admin fetch error:", error.message);
      } else if (data) {
        // Direct service_registrations state update
        setServiceRegistrations(data);
      }
    } catch (err: any) {
      console.error("Fetch Exception:", err?.message || err);
    }
  };

  useEffect(() => {
    fetchData();
    // Dynamic Supabase Auth Session & User Profile Sync
    syncAuthUserSession();

    let authSubscription: { unsubscribe: () => void } | null = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          syncAuthUserSession(session.user);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          try {
            localStorage.removeItem('mlb_active_user');
          } catch (_) {}
        }
      });
      authSubscription = data?.subscription || null;
    }

    // Direct Frontend 3-Days Plan Expiry Scan & Automated Alert Dispatch
    checkAndSend3DaysPlanExpiryAlerts().catch((err) => {
      console.warn('Direct plan expiry background check non-blocking notice:', err);
    });

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [fetchData, syncAuthUserSession]);

  // User Dashboard & Panel: Instant Real-time Supabase Subscription for public.profiles (Wallet Balance Sync)
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let isMounted = true;

    // Direct fetch of latest data from public.profiles
    const fetchLatestProfileData = async () => {
      try {
        let activeUser = currentUser;
        if (!activeUser) {
          try {
            const raw = localStorage.getItem('mlb_active_user');
            if (raw) activeUser = JSON.parse(raw);
          } catch (_) {}
        }

        if (!activeUser) return;

        const targetId = activeUser.id;
        const targetEmail = activeUser.email?.trim().toLowerCase();
        const targetPhone = activeUser.phone;

        const { data: profilesList, error } = await client
          .from('profiles')
          .select('*');

        if (!error && profilesList && profilesList.length > 0 && isMounted) {
          const matched = profilesList.find((p: any) =>
            (targetId && p.id === targetId) ||
            (targetEmail && p.email && p.email.trim().toLowerCase() === targetEmail) ||
            (targetPhone && p.phone && p.phone === targetPhone)
          );

          if (matched) {
            const newBal = typeof matched.wallet_balance === 'number' ? Number(matched.wallet_balance) : 0;
            setCurrentUser((prev) => {
              if (!prev) return null;
              const isMatch =
                (targetId && prev.id === targetId) ||
                (targetEmail && prev.email && prev.email.trim().toLowerCase() === targetEmail);
              if (!isMatch) return prev;

              const updated: UserProfile = {
                ...prev,
                ...matched,
                wallet_balance: newBal,
              };
              try {
                localStorage.setItem('mlb_active_user', JSON.stringify(updated));
              } catch (_) {}
              return updated;
            });

            // Also keep global profiles state aligned
            setProfiles((prev) =>
              prev.map((p) =>
                p.id === matched.id || (matched.email && p.email?.toLowerCase() === matched.email.toLowerCase())
                  ? { ...p, ...matched, wallet_balance: newBal }
                  : p
              )
            );
          }
        }
      } catch (err) {
        console.warn('User dashboard public.profiles initial fetch error:', err);
      }
    };

    fetchLatestProfileData();

    // Supabase Realtime subscription on public.profiles (filtered strictly to this user's profile updates)
    const profileChannel = client
      .channel(`realtime-dashboard-profile-${currentUser?.id || 'active'}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: currentUser?.id ? `id=eq.${currentUser.id}` : undefined,
        },
        (payload: any) => {
          const newRow = payload?.new;
          if (newRow && isMounted) {
            const curEmail = currentUser?.email?.trim().toLowerCase();
            const curId = currentUser?.id;
            const curPhone = currentUser?.phone;

            const isMatch =
              (curId && newRow.id === curId) ||
              (curEmail && newRow.email && newRow.email.trim().toLowerCase() === curEmail) ||
              (curPhone && newRow.phone && newRow.phone === curPhone);

            if (isMatch) {
              const freshBalance = typeof newRow.wallet_balance === 'number' ? Number(newRow.wallet_balance) : undefined;
              setCurrentUser((prev) => {
                if (!prev) return null;
                const updated: UserProfile = {
                  ...prev,
                  ...newRow,
                  wallet_balance: freshBalance !== undefined ? freshBalance : prev.wallet_balance,
                };
                try {
                  localStorage.setItem('mlb_active_user', JSON.stringify(updated));
                } catch (_) {}
                return updated;
              });

              setProfiles((prev) =>
                prev.map((p) =>
                  p.id === newRow.id || (newRow.email && p.email?.toLowerCase() === newRow.email.toLowerCase())
                    ? { ...p, ...newRow }
                    : p
                )
              );
            }
          }
        }
      )
      .subscribe();

    // Supabase Realtime subscription on public.delivery_orders for instant global orders state synchronization
    const ordersChannel = client
      .channel('realtime-global-delivery-orders-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_orders' },
        (payload: any) => {
          if (!isMounted) return;
          const { eventType, new: newRow, old: oldRow } = payload;

          if (eventType === 'INSERT' && newRow) {
            setDeliveryOrders((prev) => {
              if (prev.some((o) => o.id === newRow.id || o.order_number === newRow.order_number)) {
                return prev.map((o) => (o.id === newRow.id ? { ...o, ...newRow } : o));
              }
              return [newRow, ...prev];
            });
          } else if (eventType === 'UPDATE' && newRow) {
            setDeliveryOrders((prev) =>
              prev.map((o) => (o.id === newRow.id ? { ...o, ...newRow } : o))
            );
          } else if (eventType === 'DELETE' && oldRow) {
            setDeliveryOrders((prev) => prev.filter((o) => o.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      client.removeChannel(profileChannel);
      client.removeChannel(ordersChannel);
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.phone]);

  // Admin Listing Moderation Action
  const handleUpdateListingStatus = async (
    id: string,
    status: string,
    isFeatured: boolean = false,
    isPro: boolean = false
  ) => {
    setListings((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              status,
              is_featured: isFeatured ?? l.is_featured,
              is_pro: isPro ?? l.is_pro,
            }
          : l
      )
    );

    if (supabase) {
      try {
        await supabase
          .from('listings')
          .update({ status, is_featured: isFeatured, is_pro: isPro })
          .eq('id', id);
      } catch (e) {
        console.error('Failed to update listing status:', e);
      }
    }
  };

  // Admin Approve Recharge (Monthly Plan Request)
  const handleApproveRecharge = async (req: RechargeRequest) => {
    const approvedTimestamp = new Date().toISOString();
    const expiryIso = new Date(Date.now() + 30 * 86400000).toISOString();
    const expiryDate = expiryIso.split('T')[0];

    // 1. Update recharge request status
    setRechargeRequests((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? { ...r, status: 'approved', approved_at: approvedTimestamp }
          : r
      )
    );

    const targetUserId = req.user_id;
    const targetEmail = req.user_email?.trim().toLowerCase();
    const targetPhone = req.user_phone?.trim();

    const matchesUser = (p: UserProfile) =>
      Boolean(
        (targetUserId && p.id === targetUserId) ||
        (targetEmail && p.email && p.email.trim().toLowerCase() === targetEmail) ||
        (targetPhone && p.phone && p.phone.trim() === targetPhone)
      );

    // 2. Immediately update user profiles in frontend state with active plan
    setProfiles((prev) =>
      prev.map((p) =>
        matchesUser(p)
          ? {
              ...p,
              is_pro: true,
              pro_status: 'active',
              plan_status: 'active',
              account_status: 'active',
              is_approved_by_admin: true,
              plan_name: req.plan_name || 'PRO Monthly Plan',
              pro_expiry: expiryDate,
              plan_expiry_date: expiryIso,
            }
          : p
      )
    );

    // 3. Immediately update currentUser if the approved user is currently logged in
    if (currentUser && matchesUser(currentUser)) {
      const updatedUser: UserProfile = {
        ...currentUser,
        is_pro: true,
        pro_status: 'active',
        plan_status: 'active',
        account_status: 'active',
        is_approved_by_admin: true,
        plan_name: req.plan_name || 'PRO Monthly Plan',
        pro_expiry: expiryDate,
        plan_expiry_date: expiryIso,
      };
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem('mlb_active_user', JSON.stringify(updatedUser));
      } catch (_) {}
    }

    // 4. Immediately update Supabase database tables
    if (supabase) {
      try {
        await supabase
          .from('recharge_requests')
          .update({ status: 'approved', approved_at: approvedTimestamp })
          .eq('id', req.id);
      } catch (e) {
        console.error('Failed to update recharge_requests in database:', e);
      }

      const updatePayload: any = {
        is_pro: true,
        pro_status: 'active',
        account_status: 'active',
        is_approved_by_admin: true,
        plan_name: req.plan_name || 'PRO Monthly Plan',
        pro_expiry: expiryDate,
        plan_expiry_date: expiryIso,
      };

      try {
        if (targetUserId) {
          const { error: updErr } = await supabase.from('profiles').update(updatePayload).eq('id', targetUserId);
          if (updErr) {
            await supabase.from('profiles').update({
              is_pro: true,
              pro_status: 'active',
              is_approved_by_admin: true,
              pro_expiry: expiryDate,
            }).eq('id', targetUserId);
          }
        }

        if (targetEmail) {
          const { error: updErr } = await supabase.from('profiles').update(updatePayload).ilike('email', targetEmail);
          if (updErr) {
            await supabase.from('profiles').update({
              is_pro: true,
              pro_status: 'active',
              is_approved_by_admin: true,
            }).ilike('email', targetEmail);
          }
        }

        if (targetPhone) {
          const { error: updErr } = await supabase.from('profiles').update(updatePayload).eq('phone', targetPhone);
          if (updErr) {
            await supabase.from('profiles').update({
              is_pro: true,
              pro_status: 'active',
              is_approved_by_admin: true,
            }).eq('phone', targetPhone);
          }
        }
      } catch (e) {
        console.error('Failed to approve user monthly plan in database:', e);
      }
    }
  };

  // Admin Reject Recharge
  const handleRejectRecharge = async (id: string) => {
    setRechargeRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r))
    );

    if (supabase) {
      try {
        await supabase.from('recharge_requests').update({ status: 'rejected' }).eq('id', id);
      } catch (e) {
        console.error('Failed to reject recharge:', e);
      }
    }
  };

  // Admin Toggle User PRO
  const handleToggleUserPro = async (user: UserProfile) => {
    if (!user) {
      console.error("User data nahi mila!");
      return;
    }

    // Sahi ID nikalne ka logic (user.id ya _id ya p_id)
    const targetId = user.id || (user as any)._id || (user as any).p_id;
    if (!targetId) {
      console.error("User ID missing hai!");
      return;
    }

    // 1. Naya state calculate karein (True ka False, False ka True)
    const currentApprovalState = user.is_approved_by_admin === true;
    const newApprovalState = !currentApprovalState;
    const newStatus: 'active' | 'inactive' = newApprovalState ? 'active' : 'inactive';
    const currentStatus: 'active' | 'inactive' = currentApprovalState ? 'active' : 'inactive';

    // Dates calculate karne ka logic
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const expiryIso = expiryDate.toISOString();

    // 2. Local Frontend UI State ko turant update karein
    setProfiles((prev) =>
      prev.map((p) => {
        const matchId = p.id || (p as any)._id || (p as any).p_id;
        if (matchId === targetId || (user.email && p.email && p.email.toLowerCase() === user.email.toLowerCase())) {
          return {
            ...p,
            is_pro: newApprovalState,
            pro_status: newStatus,
            plan_status: newStatus,
            account_status: newStatus,
            is_approved_by_admin: newApprovalState,
            pro_expiry: newApprovalState ? expiryIso.split('T')[0] : undefined,
            plan_expiry_date: newApprovalState ? expiryIso : null,
          };
        }
        return p;
      })
    );

    // 3. Supabase Database mein direct Boolean value (TRUE/FALSE) bhejien
    if (supabase) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            is_approved_by_admin: newApprovalState,
            is_pro: newApprovalState,
            pro_status: newStatus,
            account_status: newStatus,
            pro_expiry: newApprovalState ? expiryIso.split('T')[0] : null,
            plan_expiry_date: newApprovalState ? expiryIso : null,
          })
          .eq('id', targetId);

        if (error) {
          console.warn("Retrying toggle user approval with core fields:", error.message);
          const { error: fallbackError } = await supabase
            .from('profiles')
            .update({
              is_approved_by_admin: newApprovalState,
              is_pro: newApprovalState,
              pro_status: newStatus,
            })
            .eq('id', targetId);

          if (fallbackError) throw fallbackError;
        }
        console.log("Supabase mein status successfully update ho gaya!");

      } catch (err: any) {
        console.error('Database update fail ho gaya, purani state rollback kar rahe hain:', err);
        
        // 🔥 Sahi Fix: Yeh rollback ab sirf tabhi chalega jab actual me error aayegi
        setProfiles((prev) =>
          prev.map((p) => {
            const matchId = p.id || (p as any)._id || (p as any).p_id;
            if (matchId === targetId || (user.email && p.email && p.email.toLowerCase() === user.email.toLowerCase())) {
              return {
                ...p,
                is_approved_by_admin: currentApprovalState,
                is_pro: currentApprovalState,
                pro_status: currentStatus,
                plan_status: currentStatus,
                account_status: currentStatus,
              };
            }
            return p;
          })
        );
      } // <-- Closing brace ab yahan aayega
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    if (!userId) return;
    setProfiles((prev) =>
      prev.map((p) => {
        const matchId = p.id || (p as any)._id || (p as any).p_id;
        return matchId === userId ? { ...p, role: newRole } : p;
      })
    );
    if (supabase) {
      try {
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        if (error) throw error;
        console.log("User role successfully updated in Supabase!");
      } catch (err: any) {
        console.error("Failed to update user role in DB:", err);
      }
    }
  };

  // Admin Control Delivery Partner Function
  const handleUpdateDeliveryPartner = async (
    userId: string,
    isDeliveryPartner: boolean,
    partnerStatus: string,
    vehicleType?: string,
    vehicleNumber?: string
  ) => {
    const isApproved = partnerStatus === 'approved' || partnerStatus === 'active';
    const normalizedStatus: 'active' | 'inactive' = isApproved ? 'active' : 'inactive';

    // 1. Local UI State ko turant bina delay ke update karein
    setProfiles((prev) =>
      prev.map((p) => {
        const matchId = p.id || (p as any)._id || (p as any).p_id;
        if (matchId === userId) {
          return {
            ...p,
            role: isDeliveryPartner ? 'delivery_partner' : p.role,
            is_delivery_partner: isDeliveryPartner,
            partner_status: partnerStatus,
            is_approved_by_admin: isApproved,
            account_status: normalizedStatus,
            pro_status: normalizedStatus,
            plan_status: normalizedStatus,
            vehicle_type: vehicleType || p.vehicle_type,
            vehicle_number: vehicleNumber || p.vehicle_number,
          };
        }
        return p;
      })
    );

    // 2. Supabase Database mein direct data save karein
    if (supabase) {
      try {
        const updatePayload: Record<string, any> = {
          is_delivery_partner: isDeliveryPartner,
          partner_status: partnerStatus,
          is_approved_by_admin: isApproved,
          account_status: normalizedStatus,
          pro_status: normalizedStatus,
        };

        if (isDeliveryPartner) {
          updatePayload.role = 'delivery_partner';
        }
        if (vehicleType) updatePayload.vehicle_type = vehicleType;
        if (vehicleNumber) updatePayload.vehicle_number = vehicleNumber;

        const { error: profileError } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', userId);

        if (profileError) {
          console.warn("Retrying profile update with core fields due to schema notice:", profileError.message);
          const { error: fallbackError } = await supabase
            .from('profiles')
            .update({
              is_delivery_partner: isDeliveryPartner,
              partner_status: partnerStatus,
              is_approved_by_admin: isApproved,
              role: isDeliveryPartner ? 'delivery_partner' : undefined,
            })
            .eq('id', userId);

          if (fallbackError) throw fallbackError;
        }

        // Agar data delivery partner ka hai toh deliverables block ko sync karein
        if (isDeliveryPartner) {
          try {
            const { error: deliveryError } = await supabase
              .from('deliveries')
              .upsert({
                id: userId,
                status: partnerStatus,
                vehicle_type: vehicleType,
                vehicle_number: vehicleNumber,
                updated_at: new Date().toISOString()
              });

            if (deliveryError) console.warn("Deliveries table sync notice:", deliveryError.message);
          } catch (delErr) {
            console.warn("Deliveries table sync catch:", delErr);
          }
        }

        console.log("Delivery Partner status successfully updated in Supabase!");

      } catch (err: any) {
        console.error("Failed to update delivery partner in DB:", err);
        alert("Database error: " + (err.message || "Failed to update delivery partner"));
      }
    }
  };
      

  // Admin Toggle is_approved_by_admin for Profiles
  const handleToggleProfileApproval = async (profileOrId: UserProfile | string, approved: boolean) => {
    const targetId = typeof profileOrId === 'string' ? profileOrId : profileOrId.id;
    const targetEmail = typeof profileOrId === 'string' ? undefined : profileOrId.email;
    const targetName = typeof profileOrId === 'string'
      ? (profiles.find((p) => p.id === targetId)?.full_name || 'Partner')
      : (profileOrId.full_name || 'Partner');

    setProfiles((prev) =>
      prev.map((p) =>
        p.id === targetId || (targetEmail && p.email === targetEmail)
          ? {
              ...p,
              is_approved_by_admin: approved,
              plan_status: approved ? 'active' : p.plan_status,
              pro_status: approved ? 'active' : p.pro_status,
              is_pro: approved ? true : p.is_pro,
            }
          : p
      )
    );

    if (currentUser && (currentUser.id === targetId || (targetEmail && currentUser.email === targetEmail))) {
      const updated: UserProfile = {
        ...currentUser,
        is_approved_by_admin: approved,
        plan_status: approved ? 'active' : currentUser.plan_status,
        pro_status: approved ? 'active' : currentUser.pro_status,
        is_pro: approved ? true : currentUser.is_pro,
      };
      setCurrentUser(updated);
      try {
        localStorage.setItem('mlb_active_user', JSON.stringify(updated));
      } catch (_) {}
    }

    if (supabase) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            is_approved_by_admin: approved,
            pro_status: approved ? 'active' : 'inactive',
            account_status: approved ? 'active' : 'inactive',
            is_pro: approved,
          })
          .eq('id', targetId);

        if (error) {
          await supabase
            .from('profiles')
            .update({ is_approved_by_admin: approved })
            .eq('id', targetId);
        }
      } catch (e) {
        try {
          await supabase
            .from('profiles')
            .update({ is_approved_by_admin: approved })
            .eq('id', targetId);
        } catch (err) {
          console.warn('Supabase toggle profile approval sync:', err);
        }
      }
    }

    dispatchAppToast({
      title: approved ? 'Partner Approved' : 'Partner Rejected / Suspended',
      message: approved
        ? `${targetName} has been approved (is_approved_by_admin: TRUE).`
        : `${targetName} has been rejected / suspended (is_approved_by_admin: FALSE).`,
      type: approved ? 'success' : 'info',
    });
  };

  // Admin Save Settings
  const handleSaveSetting = async (key: string, value: string) => {
    setSettings((prev) => {
      const exists = prev.some((s) => s.key === key);
      if (exists) {
        return prev.map((s) => (s.key === key ? { ...s, value } : s));
      }
      return [...prev, { id: Date.now(), key, value }];
    });

    if (supabase) {
      try {
        await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
      } catch (e) {
        console.error('Failed to save setting:', e);
      }
    }
  };

  // Custom Banner Ads Handlers
  const handleCreateBannerAd = async (banner: Omit<BannerAd, 'id' | 'created_at'>) => {
    const newBanner: BannerAd = {
      ...banner,
      id: `banner_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      created_at: new Date().toISOString(),
    };

    setBannerAds((prev) => [...prev, newBanner]);

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('banner_ads')
          .insert([newBanner])
          .select()
          .single();
        if (data) {
          setBannerAds((prev) => prev.map((b) => (b.id === newBanner.id ? data : b)));
        }
      } catch (e) {
        console.warn('Supabase banner_ads insert (fallback local mode):', e);
      }
    }
  };

  const handleUpdateBannerAd = async (id: string, updates: Partial<BannerAd>) => {
    setBannerAds((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );

    if (supabase) {
      try {
        await supabase.from('banner_ads').update(updates).eq('id', id);
      } catch (e) {
        console.warn('Supabase banner_ads update (fallback local mode):', e);
      }
    }
  };

  const handleDeleteBannerAd = async (id: string) => {
    setBannerAds((prev) => prev.filter((b) => b.id !== id));

    if (supabase) {
      try {
        await supabase.from('banner_ads').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase banner_ads delete (fallback local mode):', e);
      }
    }
  };

  const handleToggleBannerAd = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setBannerAds((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_active: newStatus } : b))
    );

    if (supabase) {
      try {
        await supabase.from('banner_ads').update({ is_active: newStatus }).eq('id', id);
      } catch (e) {
        console.warn('Supabase banner_ads toggle (fallback local mode):', e);
      }
    }
  };

  // User Actions
  const handleListingSubmitted = (newListing: Listing) => {
    setListings((prev) => [newListing, ...prev]);
    setUserActiveTab('my_ads');
  };

  const handleDeleteListing = async (id: string) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
    if (supabase) {
      try {
        await supabase.from('listings').delete().eq('id', id);
      } catch (e) {
        console.error('Failed to delete listing:', e);
      }
    }
  };

  const handleToggleListingStatus = async (id: string, newStatus: string) => {
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );
    if (supabase) {
      try {
        await supabase.from('listings').update({ status: newStatus }).eq('id', id);
      } catch (e) {
        console.error('Failed to toggle status:', e);
      }
    }
  };

  const handleSubmitRecharge = async (
    reqData: Omit<RechargeRequest, 'id' | 'created_at' | 'status'>
  ) => {
    const newReq: RechargeRequest = {
      id: `rec_${Date.now()}`,
      user_id: currentUser?.id || reqData.user_id,
      ...reqData,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    setRechargeRequests((prev) => [newReq, ...prev]);

    if (supabase) {
      await supabase.from('recharge_requests').insert([newReq]);
    }
  };

  // User & Admin Shop & Vehicle Registration Handlers
  const handleShopSubmitted = async (newShop: ShopRegistration) => {
    setShopRegistrations((prev) => [newShop, ...prev]);
    if (supabase) {
      try {
        await supabase.from('shop_registrations').insert([newShop]);
      } catch (e) {
        console.error('Shop registration Supabase sync:', e);
      }
    }
  };

  const handleVehicleSubmitted = async (newVeh: VehicleRegistration) => {
    setVehicleRegistrations((prev) => [newVeh, ...prev]);
    if (supabase) {
      try {
        await supabase.from('vehicle_registrations').insert([newVeh]);
      } catch (e) {
        console.error('Vehicle registration Supabase sync:', e);
      }
    }
  };

  const handleSubmitShop = async (
    data: Omit<ShopRegistration, 'id' | 'created_at' | 'status'>
  ) => {
    const newShop: ShopRegistration = {
      id: `shop_${Date.now()}`,
      ...data,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    handleShopSubmitted(newShop);

    // Sync all shop fields directly to the user profile in Supabase & local state
    const targetUserId = currentUser?.id || data.user_id;
    if (targetUserId) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === targetUserId
            ? {
                ...p,
                state: data.state || p.state,
                district: data.district || p.district,
                block: data.block || p.block,
                village: data.village || p.village,
                shop_name: data.shop_name,
                shop_category: data.category,
                shop_address: data.shop_address,
                shop_id_proof_type: data.shop_id_proof_type,
                shop_id_no: data.shop_id_no,
                owner_name: data.owner_name,
                owner_id_type: data.owner_id_type,
                owner_id_no: data.owner_id_no,
                owner_id_proof_url: data.owner_id_proof_url,
                city_locality: data.city_locality,
                shop_banner_url: data.shop_banner_url,
                description: data.description,
                opening_hours: data.opening_hours,
                payout_upi_id: data.payout_upi_id || p.payout_upi_id,
                payout_bank_name: data.payout_bank_name || p.payout_bank_name,
                payout_account_no: data.payout_account_no || p.payout_account_no,
                payout_ifsc_code: data.payout_ifsc_code || p.payout_ifsc_code,
                payout_qr_image_url: data.payout_qr_image_url || p.payout_qr_image_url,
                is_approved_by_admin: false,
              }
            : p
        )
      );

      if (supabase) {
        try {
          await supabase
            .from('profiles')
            .update({
              state: data.state,
              district: data.district,
              block: data.block,
              village: data.village,
              shop_name: data.shop_name,
              shop_category: data.category,
              shop_address: data.shop_address,
              shop_id_proof_type: data.shop_id_proof_type,
              shop_id_no: data.shop_id_no,
              owner_name: data.owner_name,
              owner_id_type: data.owner_id_type,
              owner_id_no: data.owner_id_no,
              owner_id_proof_url: data.owner_id_proof_url,
              city_locality: data.city_locality,
              shop_banner_url: data.shop_banner_url,
              description: data.description,
              opening_hours: data.opening_hours,
              payout_upi_id: data.payout_upi_id,
              payout_bank_name: data.payout_bank_name,
              payout_account_no: data.payout_account_no,
              payout_ifsc_code: data.payout_ifsc_code,
              payout_qr_image_url: data.payout_qr_image_url,
              is_approved_by_admin: false,
            })
            .eq('id', targetUserId);
        } catch (e) {
          console.warn('Supabase profile shop fields sync:', e);
        }
      }
    }
  };

  const handleSubmitVehicle = async (
    data: Omit<VehicleRegistration, 'id' | 'created_at' | 'status'>
  ) => {
    const newVeh: VehicleRegistration = {
      id: `veh_${Date.now()}`,
      ...data,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    handleVehicleSubmitted(newVeh);

    // Sync all vehicle fields directly to the user profile in Supabase & local state
    const targetUserId = currentUser?.id || data.user_id;
    if (targetUserId) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === targetUserId
            ? {
                ...p,
                state: data.state || p.state,
                district: data.district || p.district,
                block: data.block || p.block,
                village: data.village || p.village,
                vehicle_type: data.vehicle_type,
                vehicle_number: data.vehicle_reg_no,
                driving_license: data.driving_license_no,
                driving_license_no: data.driving_license_no,
                driving_license_proof_url: data.driving_license_proof_url,
                vehicle_model: data.vehicle_model,
                vehicle_rc_no: data.vehicle_rc_no,
                vehicle_photo_url: data.vehicle_photo_url,
                operational_route: data.operational_route,
                daily_rate_or_fare: data.daily_rate_or_fare,
                payout_upi_id: data.payout_upi_id || p.payout_upi_id,
                payout_bank_name: data.payout_bank_name || p.payout_bank_name,
                payout_account_no: data.payout_account_no || p.payout_account_no,
                payout_ifsc_code: data.payout_ifsc_code || p.payout_ifsc_code,
                payout_qr_image_url: data.payout_qr_image_url || p.payout_qr_image_url,
                is_approved_by_admin: false,
              }
            : p
        )
      );

      if (supabase) {
        try {
          await supabase
            .from('profiles')
            .update({
              state: data.state,
              district: data.district,
              block: data.block,
              village: data.village,
              vehicle_type: data.vehicle_type,
              vehicle_number: data.vehicle_reg_no,
              driving_license: data.driving_license_no,
              driving_license_no: data.driving_license_no,
              driving_license_proof_url: data.driving_license_proof_url,
              vehicle_model: data.vehicle_model,
              vehicle_rc_no: data.vehicle_rc_no,
              vehicle_photo_url: data.vehicle_photo_url,
              operational_route: data.operational_route,
              daily_rate_or_fare: data.daily_rate_or_fare,
              payout_upi_id: data.payout_upi_id,
              payout_bank_name: data.payout_bank_name,
              payout_account_no: data.payout_account_no,
              payout_ifsc_code: data.payout_ifsc_code,
              payout_qr_image_url: data.payout_qr_image_url,
              is_approved_by_admin: false,
            })
            .eq('id', targetUserId);
        } catch (e) {
          console.warn('Supabase profile vehicle fields sync:', e);
        }
      }
    }
  };

  const handleApproveShopRegistration = async (id: string) => {
    const verifiedTimestamp = new Date().toISOString();
    const expiryIso = new Date(Date.now() + 30 * 86400000).toISOString();
    const expiryDate = expiryIso.split('T')[0];

    const shop = shopRegistrations.find((s) => s.id === id);

    setShopRegistrations((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'approved', verified_at: verifiedTimestamp } : s))
    );

    if (shop) {
      const targetUserId = shop.user_id;
      const targetPhone = shop.user_phone;
      const matchesOwner = (p: UserProfile) =>
        Boolean(
          (targetUserId && p.id === targetUserId) ||
          (targetPhone && p.phone && p.phone.trim() === targetPhone.trim())
        );

      setProfiles((prev) =>
        prev.map((p) =>
          matchesOwner(p)
            ? {
                ...p,
                is_pro: true,
                pro_status: 'active',
                plan_status: 'active',
                account_status: 'active',
                is_approved_by_admin: true,
                shop_name: shop.shop_name,
                shop_category: shop.category,
                role: p.role === 'admin' ? 'admin' : 'seller',
                pro_expiry: expiryDate,
                plan_expiry_date: expiryIso,
              }
            : p
        )
      );

      if (currentUser && matchesOwner(currentUser)) {
        const updatedUser: UserProfile = {
          ...currentUser,
          is_pro: true,
          pro_status: 'active',
          plan_status: 'active',
          account_status: 'active',
          is_approved_by_admin: true,
          shop_name: shop.shop_name,
          shop_category: shop.category,
          role: currentUser.role === 'admin' ? 'admin' : 'seller',
          pro_expiry: expiryDate,
          plan_expiry_date: expiryIso,
        };
        setCurrentUser(updatedUser);
        try {
          localStorage.setItem('mlb_active_user', JSON.stringify(updatedUser));
        } catch (_) {}
      }
    }

    if (supabase) {
      try {
        await supabase
          .from('shop_registrations')
          .update({ status: 'approved', verified_at: verifiedTimestamp })
          .eq('id', id);

        if (shop?.user_id) {
          try {
            const { error: updErr } = await supabase
              .from('profiles')
              .update({
                is_pro: true,
                pro_status: 'active',
                account_status: 'active',
                is_approved_by_admin: true,
                shop_name: shop.shop_name,
                shop_category: shop.category,
              })
              .eq('id', shop.user_id);

            if (updErr) {
              await supabase
                .from('profiles')
                .update({
                  is_pro: true,
                  pro_status: 'active',
                  is_approved_by_admin: true,
                  shop_name: shop.shop_name,
                })
                .eq('id', shop.user_id);
            }
          } catch (_) {}
        }
      } catch (e) {
        console.error('Approve shop registration:', e);
      }
    }
  };

  const handleRejectShopRegistration = async (id: string, reason?: string) => {
    const shop = shopRegistrations.find((s) => s.id === id);
    setShopRegistrations((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'rejected', rejection_reason: reason } : s))
    );

    if (shop) {
      const targetUserId = shop.user_id;
      const targetPhone = shop.user_phone;
      const matchesOwner = (p: UserProfile) =>
        Boolean(
          (targetUserId && p.id === targetUserId) ||
          (targetPhone && p.phone && p.phone.trim() === targetPhone.trim())
        );

      setProfiles((prev) =>
        prev.map((p) =>
          matchesOwner(p)
            ? {
                ...p,
                is_approved_by_admin: false,
              }
            : p
        )
      );

      if (currentUser && matchesOwner(currentUser)) {
        const updatedUser: UserProfile = {
          ...currentUser,
          is_approved_by_admin: false,
        };
        setCurrentUser(updatedUser);
        try {
          localStorage.setItem('mlb_active_user', JSON.stringify(updatedUser));
        } catch (_) {}
      }
    }

    if (supabase) {
      try {
        await supabase
          .from('shop_registrations')
          .update({ status: 'rejected', rejection_reason: reason })
          .eq('id', id);

        if (shop?.user_id) {
          await supabase
            .from('profiles')
            .update({ is_approved_by_admin: false })
            .eq('id', shop.user_id);
        }
      } catch (e) {
        console.error('Reject shop registration:', e);
      }
    }

    dispatchAppToast({
      title: 'Shop Rejected / Suspended',
      message: `Shop "${shop?.shop_name || 'Store'}" rejected (is_approved_by_admin: FALSE).`,
      type: 'info',
    });
  };

  const handleApproveVehicleRegistration = async (id: string) => {
    const verifiedTimestamp = new Date().toISOString();
    const expiryIso = new Date(Date.now() + 30 * 86400000).toISOString();
    const expiryDate = expiryIso.split('T')[0];

    const veh = vehicleRegistrations.find((v) => v.id === id);

    setVehicleRegistrations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'approved', verified_at: verifiedTimestamp } : v))
    );

    if (veh) {
      const targetUserId = veh.user_id;
      const targetPhone = veh.driver_phone;
      const matchesDriver = (p: UserProfile) =>
        Boolean(
          (targetUserId && p.id === targetUserId) ||
          (targetPhone && p.phone && p.phone.trim() === targetPhone.trim())
        );

      setProfiles((prev) =>
        prev.map((p) =>
          matchesDriver(p)
            ? {
                ...p,
                is_pro: true,
                pro_status: 'active',
                plan_status: 'active',
                account_status: 'active',
                is_approved_by_admin: true,
                vehicle_type: veh.vehicle_type,
                vehicle_number: veh.vehicle_reg_no,
                pro_expiry: expiryDate,
                plan_expiry_date: expiryIso,
              }
            : p
        )
      );

      if (currentUser && matchesDriver(currentUser)) {
        const updatedUser: UserProfile = {
          ...currentUser,
          is_pro: true,
          pro_status: 'active',
          plan_status: 'active',
          account_status: 'active',
          is_approved_by_admin: true,
          vehicle_type: veh.vehicle_type,
          vehicle_number: veh.vehicle_reg_no,
          pro_expiry: expiryDate,
          plan_expiry_date: expiryIso,
        };
        setCurrentUser(updatedUser);
        try {
          localStorage.setItem('mlb_active_user', JSON.stringify(updatedUser));
        } catch (_) {}
      }
    }

    if (supabase) {
      try {
        await supabase
          .from('vehicle_registrations')
          .update({ status: 'approved', verified_at: verifiedTimestamp })
          .eq('id', id);

        if (veh?.user_id) {
          try {
            const { error: updErr } = await supabase
              .from('profiles')
              .update({
                is_pro: true,
                pro_status: 'active',
                account_status: 'active',
                is_approved_by_admin: true,
                vehicle_type: veh.vehicle_type,
                vehicle_number: veh.vehicle_reg_no,
              })
              .eq('id', veh.user_id);

            if (updErr) {
              await supabase
                .from('profiles')
                .update({
                  is_pro: true,
                  pro_status: 'active',
                  is_approved_by_admin: true,
                })
                .eq('id', veh.user_id);
            }
          } catch (_) {}
        }
      } catch (e) {
        console.error('Approve vehicle registration:', e);
      }
    }
  };

  const handleRejectVehicleRegistration = async (id: string, reason?: string) => {
    const veh = vehicleRegistrations.find((v) => v.id === id);
    setVehicleRegistrations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'rejected', rejection_reason: reason } : v))
    );

    if (veh) {
      const targetUserId = veh.user_id;
      const targetPhone = veh.driver_phone;
      const matchesDriver = (p: UserProfile) =>
        Boolean(
          (targetUserId && p.id === targetUserId) ||
          (targetPhone && p.phone && p.phone.trim() === targetPhone.trim())
        );

      setProfiles((prev) =>
        prev.map((p) =>
          matchesDriver(p)
            ? {
                ...p,
                is_approved_by_admin: false,
              }
            : p
        )
      );

      if (currentUser && matchesDriver(currentUser)) {
        const updatedUser: UserProfile = {
          ...currentUser,
          is_approved_by_admin: false,
        };
        setCurrentUser(updatedUser);
        try {
          localStorage.setItem('mlb_active_user', JSON.stringify(updatedUser));
        } catch (_) {}
      }
    }

    if (supabase) {
      try {
        await supabase
          .from('vehicle_registrations')
          .update({ status: 'rejected', rejection_reason: reason })
          .eq('id', id);

        if (veh?.user_id) {
          await supabase
            .from('profiles')
            .update({ is_approved_by_admin: false })
            .eq('id', veh.user_id);
        }
      } catch (e) {
        console.error('Reject vehicle registration:', e);
      }
    }

    dispatchAppToast({
      title: 'Vehicle / Driver Rejected / Suspended',
      message: `Driver "${veh?.driver_name || 'Driver'}" rejected (is_approved_by_admin: FALSE).`,
      type: 'info',
    });
  };

  // Local Services & Jobs Handlers
  const handleSubmitServiceRegistration = async (
    data: Omit<ServiceRegistration, 'id' | 'created_at' | 'status' | 'is_approved'>
  ) => {
    const validId = generateUuid();
    const validUserId = ensureUuid(data.user_id || currentUser?.id);
    const newService: ServiceRegistration = {
      id: validId,
      ...data,
      user_id: validUserId,
      is_approved: false,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    setServiceRegistrations((prev) => [newService, ...prev]);

    if (supabase) {
      try {
        const { error: regError } = await supabase.from('service_registrations').insert([
          {
            id: validId,
            user_id: validUserId,
            full_name: data.full_name || data.user_name || 'Service Partner',
            phone: data.phone || data.whatsapp || '',
            category: data.category || 'Local Service',
            service_type: data.service_type || 'service',
            vehicle_type: (data as any).vehicle_type || null,
            vehicle_number: (data as any).vehicle_number || null,
            driving_license_no: (data as any).driving_license_no || null,
            driving_license_proof_url: (data as any).driving_license_proof_url || null,
            payout_upi: (data as any).payout_upi || data.payout_upi_id || null,
            payout_upi_id: data.payout_upi_id || (data as any).payout_upi || null,
            service_address: data.service_address || null,
            city_locality: data.city_locality || null,
            state: data.state || 'Meghalaya',
            district: data.district || 'West Garo Hills',
            block: data.block || 'Rongram',
            village: data.village || '',
            bio_skills: data.bio_skills || null,
            hourly_or_daily_rate: data.hourly_or_daily_rate || null,
            experience: data.experience || null,
            status: 'pending',
            is_approved: false,
            created_at: newService.created_at,
          },
        ]);
        if (regError) {
          console.warn('service_registrations Supabase notice:', regError.message);
        } else {
          fetchAdminRegistrations();
        }
      } catch (e: any) {
        console.warn('Service registration Supabase sync notice:', e);
      }
    }
  };

  const handleApproveServiceRegistration = async (id: string) => {
    const verifiedTimestamp = new Date().toISOString();
    const expiryIso = new Date(Date.now() + 30 * 86400000).toISOString();
    const expiryDate = expiryIso.split('T')[0];

    const srv = serviceRegistrations.find((s) => s.id === id);

    setServiceRegistrations((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, is_approved: true, status: 'approved', verified_at: verifiedTimestamp }
          : s
      )
    );

    if (srv) {
      const targetUserId = srv.user_id;
      const targetPhone = srv.phone;
      const matchesProvider = (p: UserProfile) =>
        Boolean(
          (targetUserId && p.id === targetUserId) ||
          (targetPhone && p.phone && p.phone.trim() === targetPhone.trim())
        );

      setProfiles((prev) =>
        prev.map((p) =>
          matchesProvider(p)
            ? {
                ...p,
                is_pro: true,
                pro_status: 'active',
                plan_status: 'active',
                account_status: 'active',
                is_approved_by_admin: true,
                pro_expiry: expiryDate,
                plan_expiry_date: expiryIso,
              }
            : p
        )
      );

      if (currentUser && matchesProvider(currentUser)) {
        const updatedUser: UserProfile = {
          ...currentUser,
          is_pro: true,
          pro_status: 'active',
          plan_status: 'active',
          account_status: 'active',
          is_approved_by_admin: true,
          pro_expiry: expiryDate,
          plan_expiry_date: expiryIso,
        };
        setCurrentUser(updatedUser);
        try {
          localStorage.setItem('mlb_active_user', JSON.stringify(updatedUser));
        } catch (_) {}
      }
    }

    if (supabase) {
      try {
        await supabase
          .from('service_registrations')
          .update({ is_approved: true, status: 'approved', verified_at: verifiedTimestamp })
          .eq('id', id);

        if (srv?.user_id) {
          try {
            const { error: updErr } = await supabase
              .from('profiles')
              .update({
                is_pro: true,
                pro_status: 'active',
                account_status: 'active',
                is_approved_by_admin: true,
              })
              .eq('id', srv.user_id);

            if (updErr) {
              await supabase
                .from('profiles')
                .update({
                  is_pro: true,
                  pro_status: 'active',
                  is_approved_by_admin: true,
                })
                .eq('id', srv.user_id);
            }
          } catch (_) {}
        }
      } catch (e) {
        console.error('Approve service registration:', e);
      }
    }
  };

  const handleRejectServiceRegistration = async (id: string, reason?: string) => {
    setServiceRegistrations((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, is_approved: false, status: 'rejected', rejection_reason: reason }
          : s
      )
    );
    if (supabase) {
      try {
        await supabase
          .from('service_registrations')
          .update({ is_approved: false, status: 'rejected', rejection_reason: reason })
          .eq('id', id);
      } catch (e) {
        console.error('Reject service registration:', e);
      }
    }
  };

  // Withdrawal & Payout Handlers
  const handleProcessPayout = async (
    userId: string,
    amount: number,
    payoutUpi?: string,
    role?: string,
    userName?: string,
    userPhone?: string
  ) => {
    const validUserId = ensureUuid(userId);
    const targetProfile = profiles.find((p) => p.id === userId || p.id === validUserId);
    const currentBalance = targetProfile && typeof targetProfile.wallet_balance === 'number'
      ? Number(targetProfile.wallet_balance)
      : (wallets.find((w) => w.user_id === userId || w.user_id === validUserId)?.balance || 0);

    const newBalance = Math.max(0, currentBalance - amount);
    const updatedTimestamp = new Date().toISOString();
    const txnId = `TXN-${Date.now().toString().slice(-8)}`;
    const validLogId = generateUuid();

    const newLog: PayoutLog = {
      id: validLogId,
      user_id: validUserId,
      amount,
      status: 'paid',
      payout_upi: payoutUpi || '',
      transaction_id: txnId,
      created_at: updatedTimestamp,
      user_name: userName || 'Partner',
      user_phone: userPhone || '',
      role: role || 'Partner',
    };

    // 1. Standardize profiles state (authoritative source)
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === userId || p.id === validUserId
          ? { ...p, wallet_balance: newBalance }
          : p
      )
    );

    // Update currentUser if matching
    if (currentUser && (currentUser.id === userId || currentUser.id === validUserId)) {
      setCurrentUser((prev) => (prev ? { ...prev, wallet_balance: newBalance } : null));
    }

    // 2. Standardize wallets state
    setWallets((prev) => {
      const exists = prev.some((w) => w.user_id === userId || w.user_id === validUserId);
      if (exists) {
        return prev.map((w) =>
          w.user_id === userId || w.user_id === validUserId
            ? { ...w, balance: newBalance, updated_at: updatedTimestamp }
            : w
        );
      }
      return [
        ...prev,
        {
          id: generateUuid(),
          user_id: validUserId,
          balance: newBalance,
          updated_at: updatedTimestamp,
        },
      ];
    });

    // 3. Update Payout Logs state
    setPayoutLogs((prev) => [newLog, ...prev]);

    // 4. Update pending payout requests for this user if any
    setPayoutRequests((prev) =>
      prev.map((pr) =>
        (pr.user_id === userId || pr.user_id === validUserId) && pr.status === 'pending'
          ? { ...pr, status: 'completed', completed_at: updatedTimestamp }
          : pr
      )
    );

    // 5. Authoritative Supabase Database Synchronization
    if (supabase) {
      try {
        // Sync public.profiles.wallet_balance
        await supabase
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', validUserId);

        // Sync wallets table
        await supabase
          .from('wallets')
          .upsert(
            { user_id: validUserId, balance: newBalance, updated_at: updatedTimestamp },
            { onConflict: 'user_id' }
          );

        // Record payout log
        await supabase.from('payout_logs').insert([
          {
            id: validLogId,
            user_id: validUserId,
            amount,
            status: 'paid',
            payout_upi: payoutUpi || '',
            transaction_id: txnId,
            created_at: updatedTimestamp,
          },
        ]);

        // Complete pending requests
        await supabase
          .from('payout_requests')
          .update({ status: 'completed', completed_at: updatedTimestamp })
          .eq('user_id', validUserId)
          .eq('status', 'pending');
      } catch (err) {
        console.warn('Supabase process payout sync:', err);
      }
    }

    // 6. Record in-app notification & dispatch global toast
    recordAppNotification(
      validUserId,
      '💸 Payout Sent by Admin',
      `Payout of ₹${formatPrice(amount)} has been sent. Your updated wallet balance is ₹${formatPrice(newBalance)}.`,
      'payout',
      { amount, newBalance }
    );
    dispatchAppToast({
      title: 'Payout Processed',
      message: `₹${formatPrice(amount)} sent to ${userName || 'Partner'}. New Balance: ₹${formatPrice(newBalance)}.`,
      type: 'success',
    });
  };

  const handleUpdateWalletBalance = async (userId: string, newBalance: number) => {
    const updatedTimestamp = new Date().toISOString();
    const matchedProfile = profiles.find(
      (p) =>
        p.id === userId ||
        p.phone === userId ||
        p.email === userId ||
        (userId.includes('silgrak') && p.email?.includes('silgrak'))
    );
    const activePartnerId = matchedProfile?.id || (isUuid(userId) ? userId : undefined);
    const validUserId = activePartnerId || ensureUuid(userId);

    // 1. Update profiles state (Authoritative source)
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === userId || p.id === validUserId || (matchedProfile && p.id === matchedProfile.id)
          ? { ...p, wallet_balance: newBalance }
          : p
      )
    );

    // Update currentUser if matching
    if (
      currentUser &&
      (currentUser.id === userId ||
        currentUser.id === validUserId ||
        (matchedProfile && currentUser.id === matchedProfile.id) ||
        (matchedProfile?.email && currentUser.email === matchedProfile.email))
    ) {
      const updatedUser = { ...currentUser, wallet_balance: newBalance };
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem('mlb_active_user', JSON.stringify(updatedUser));
      } catch (_) {}
    }

    // 2. Update wallets state
    setWallets((prev) => {
      const exists = prev.some((w) => w.user_id === userId || w.user_id === validUserId);
      if (exists) {
        return prev.map((w) =>
          w.user_id === userId || w.user_id === validUserId
            ? { ...w, balance: newBalance, updated_at: updatedTimestamp }
            : w
        );
      }
      return [
        ...prev,
        {
          id: generateUuid(),
          user_id: validUserId,
          balance: newBalance,
          updated_at: updatedTimestamp,
        },
      ];
    });

    // 3. Authoritative Supabase Database Synchronization targeting public.profiles.wallet_balance
    if (supabase) {
      try {
        if (activePartnerId) {
          await supabase
            .from('profiles')
            .update({ wallet_balance: Number(newBalance) })
            .eq('id', activePartnerId);
        }

        if (matchedProfile?.email) {
          await supabase
            .from('profiles')
            .update({ wallet_balance: Number(newBalance) })
            .eq('email', matchedProfile.email);
        }

            await supabase
      .from('wallets')
      .upsert(
        { user_id: validUserId, balance: newBalance, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    // Refresh profiles from Supabase so the new balance is immediately visible
    const { data: freshProfiles } = await supabase.from('profiles').select('*');
    if (freshProfiles && freshProfiles.length > 0) {
      setProfiles(freshProfiles);
      
      // CRITICAL FIX: Login user ka active cache balance bhi sync karein
      setCurrentUser((prev: any) => {
        if (!prev) return null;
        const currentUserId = prev.id || prev.p_id;
        const myFreshData = freshProfiles.find((p) => p.id === currentUserId || p.email === prev.email);
        if (myFreshData) {
          const updated = { ...prev, wallet_balance: Number(myFreshData.wallet_balance) };
          try {
            localStorage.setItem('mlb_active_user', JSON.stringify(updated));
          } catch (_) {}
          return updated;
        }
        return prev;
      });
    }
        
      } catch (err) {
        console.warn('Supabase wallet update:', err);
      }
    }

    // 4. Record in-app notification & dispatch global toast
    recordAppNotification(
      validUserId,
      '💰 Wallet Balance Updated',
      `Admin has updated your wallet balance to ₹${formatPrice(newBalance)}.`,
      'wallet',
      { newBalance }
    );
    dispatchAppToast({
      title: 'Wallet Balance Updated',
      message: `Wallet balance set to ₹${formatPrice(newBalance)}.`,
      type: 'success',
    });
  };

  const handleApprovePayout = async (id: string) => {
    const targetReq = payoutRequests.find((p) => p.id === id);
    const completedTimestamp = new Date().toISOString();
    const txnId = `TXN-${Date.now().toString().slice(-8)}`;

    if (targetReq) {
      const userId = targetReq.user_id;
      const validUserId = ensureUuid(userId);
      const amount = Number(targetReq.amount) || 0;

      // Find current balance from profiles
      const targetProfile = profiles.find((p) => p.id === userId || p.id === validUserId);
      const currentBal = targetProfile && typeof targetProfile.wallet_balance === 'number'
        ? Number(targetProfile.wallet_balance)
        : (wallets.find((w) => w.user_id === userId || w.user_id === validUserId)?.balance || 0);

      const newBal = Math.max(0, currentBal - amount);

      // 1. Update profiles state
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === userId || p.id === validUserId
            ? { ...p, wallet_balance: newBal }
            : p
        )
      );

      if (currentUser && (currentUser.id === userId || currentUser.id === validUserId)) {
        setCurrentUser((prev) => (prev ? { ...prev, wallet_balance: newBal } : null));
      }

      // 2. Update wallets state
      setWallets((prev) => {
        const exists = prev.some((w) => w.user_id === userId || w.user_id === validUserId);
        if (exists) {
          return prev.map((w) =>
            w.user_id === userId || w.user_id === validUserId
              ? { ...w, balance: newBal, updated_at: completedTimestamp }
              : w
          );
        }
        return [
          ...prev,
          {
            id: generateUuid(),
            user_id: validUserId,
            balance: newBal,
            updated_at: completedTimestamp,
          },
        ];
      });

      // 3. Add payout log
      const newLog: PayoutLog = {
        id: generateUuid(),
        user_id: validUserId,
        amount,
        status: 'paid',
        payout_upi: targetReq.upi_id || '',
        transaction_id: txnId,
        created_at: completedTimestamp,
        user_name: targetReq.user_name || 'Partner',
        user_phone: targetReq.user_phone || '',
        role: targetReq.user_role || 'Partner',
      };
      setPayoutLogs((prev) => [newLog, ...prev]);

      // 4. Sync with Supabase (profiles.wallet_balance & wallets.balance)
      if (supabase) {
        try {
          await supabase
            .from('profiles')
            .update({ wallet_balance: newBal })
            .eq('id', validUserId);

          await supabase
            .from('wallets')
            .upsert(
              { user_id: validUserId, balance: newBal, updated_at: completedTimestamp },
              { onConflict: 'user_id' }
            );

          await supabase.from('payout_logs').insert([
            {
              id: newLog.id,
              user_id: validUserId,
              amount,
              status: 'paid',
              payout_upi: targetReq.upi_id || '',
              transaction_id: txnId,
              created_at: completedTimestamp,
            },
          ]);
        } catch (err) {
          console.warn('Supabase approve payout balance update:', err);
        }
      }

      // 5. Notify user
      recordAppNotification(
        validUserId,
        '✅ Payout Request Approved',
        `Your withdrawal request of ₹${formatPrice(amount)} has been approved and paid. Updated balance: ₹${formatPrice(newBal)}.`,
        'payout',
        { amount, newBal }
      );
      dispatchAppToast({
        title: 'Payout Approved',
        message: `Approved ₹${formatPrice(amount)} for ${targetReq.user_name || 'Partner'}.`,
        type: 'success',
      });
    }

    setPayoutRequests((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: 'completed', completed_at: completedTimestamp } : p
      )
    );
    if (supabase) {
      try {
        await supabase
          .from('payout_requests')
          .update({ status: 'completed', completed_at: completedTimestamp })
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase update payout status:', err);
      }
    }
  };

  const handleRejectPayout = async (id: string, reason?: string) => {
    const targetReq = payoutRequests.find((p) => p.id === id);
    setPayoutRequests((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'rejected',
              admin_notes: reason || 'Details could not be verified.',
            }
          : p
      )
    );
    if (supabase) {
      try {
        await supabase
          .from('payout_requests')
          .update({
            status: 'rejected',
            admin_notes: reason || 'Details could not be verified.',
          })
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase update payout rejection:', err);
      }
    }

    if (targetReq) {
      recordAppNotification(
        ensureUuid(targetReq.user_id),
        '⚠️ Payout Request Rejected',
        `Your withdrawal request of ₹${formatPrice(targetReq.amount)} was rejected. Reason: ${reason || 'Details could not be verified.'}`,
        'payout',
        { amount: targetReq.amount, reason }
      );
      dispatchAppToast({
        title: 'Payout Request Rejected',
        message: `Withdrawal request of ₹${formatPrice(targetReq.amount)} marked rejected.`,
        type: 'warning',
      });
    }
  };

  const handleRequestPayout = async (payoutData: {
    amount: number;
    upi_id: string;
    bank_name?: string;
    account_no?: string;
    ifsc_code?: string;
    user_role: string;
  }) => {
    const matchedProfile = profiles.find((p) => p.id === currentUser?.id || (currentUser?.email && p.email === currentUser.email));
    const currentWalletBalance = typeof currentUser?.wallet_balance === 'number'
      ? Number(currentUser.wallet_balance)
      : (matchedProfile && typeof matchedProfile.wallet_balance === 'number'
          ? Number(matchedProfile.wallet_balance)
          : (wallets.find((w) => w.user_id === currentUser?.id || w.user_id === ensureUuid(currentUser?.id))?.balance || 0));
    const requestedAmount = Number(payoutData.amount);

    // CRITICAL REQUIREMENT: STRICT "INSUFFICIENT BALANCE" WITHDRAWAL VALIDATION
    if (requestedAmount > currentWalletBalance || currentWalletBalance <= 0) {
      const errorText = 'Insufficient Balance! You cannot withdraw more than your available wallet amount.';
      dispatchAppToast({
        title: 'Withdrawal Failed',
        message: errorText,
        type: 'error',
      });
      throw new Error(errorText);
    }

    const validPayoutId = generateUuid();
    const validUserId = ensureUuid(currentUser?.id);

    const newPayout: PayoutRequest = {
      id: validPayoutId,
      user_id: validUserId,
      driver_id: validUserId,
      user_name: currentUser?.full_name || 'Partner',
      driver_name: currentUser?.full_name || 'Partner',
      user_phone: currentUser?.phone || '9862012345',
      driver_phone: currentUser?.phone || '9862012345',
      user_role: payoutData.user_role,
      amount: payoutData.amount,
      upi_id: payoutData.upi_id,
      payout_upi_id: payoutData.upi_id,
      bank_name: payoutData.bank_name,
      account_no: payoutData.account_no,
      ifsc_code: payoutData.ifsc_code,
      status: 'pending',
      created_at: new Date().toISOString(),
      admin_notes: `Payout withdrawal request by ${payoutData.user_role}`,
    };

    setPayoutRequests((prev) => [newPayout, ...prev]);

    if (supabase) {
      try {
        const { error } = await supabase.from('payout_requests').insert([
          {
            id: validPayoutId,
            user_id: validUserId,
            user_name: newPayout.user_name,
            user_phone: newPayout.user_phone,
            user_role: newPayout.user_role,
            amount: newPayout.amount,
            upi_id: newPayout.upi_id,
            payout_upi_id: newPayout.upi_id,
            bank_name: newPayout.bank_name || null,
            account_no: newPayout.account_no || null,
            ifsc_code: newPayout.ifsc_code || null,
            status: 'pending',
            created_at: newPayout.created_at,
            admin_notes: newPayout.admin_notes,
          },
        ]);
        if (error) {
          console.warn('Supabase payout_requests insert notice:', error.message);
        }
      } catch (err) {
        console.warn('Supabase insert payout request:', err);
      }
    }

    dispatchAppToast({
      title: 'Withdrawal Request Submitted',
      message: `Your request for ₹${formatPrice(requestedAmount)} is sent for verification.`,
      type: 'info',
    });
  };

  const handleUpdatePermanentAddress = async (newAddress: string) => {
    if (!currentUser) return;
    const updatedUser: UserProfile = {
      ...currentUser,
      permanent_address: newAddress,
    };
    setCurrentUser(updatedUser);
    setProfiles((prev) =>
      prev.map((p) => (p.id === currentUser.id ? { ...p, permanent_address: newAddress } : p))
    );
    try {
      localStorage.setItem('mlb_active_user', JSON.stringify(updatedUser));
    } catch (_) {}

    if (supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ permanent_address: newAddress })
          .eq('id', currentUser.id);
      } catch (err) {
        console.warn('Supabase permanent address update:', err);
      }
    }
  };

  // Delivery Partner Handlers
  const handleRegisterDeliveryPartner = async (data: {
    fullName: string;
    phone: string;
    vehicleType: 'Bike' | 'Scooty' | 'Auto' | 'Commercial Auto';
    vehicleNumber: string;
    state?: string;
    district?: string;
    block?: string;
    village?: string;
    drivingLicenseNo?: string;
    drivingLicenseProofUrl?: string;
    vehicleRcNo?: string;
    payoutUpiId?: string;
    payoutBankName?: string;
    payoutAccountNo?: string;
    payoutIfscCode?: string;
    payoutQrImageUrl?: string;
  }) => {
    try {
      // 1. Dynamic current user details fetch
      let targetUserId = currentUser?.id;
      let targetEmail = currentUser?.email || '';

      if (supabase) {
        try {
          const { data: authData, error: authError } = await supabase.auth.getUser();
          if (authError) {
            console.warn('Auth user lookup notice:', authError.message);
          }
          if (authData?.user) {
            targetUserId = authData.user.id;
            if (authData.user.email) targetEmail = authData.user.email;
          }
        } catch (e) {
          console.warn('Supabase auth user check:', e);
        }
      }

      if (!targetUserId) {
        alert("Error: Logged in user nahi mila! Please sign in first.");
        return;
      }

      const updatedProfile: UserProfile = {
        ...currentUser,
        id: targetUserId,
        email: targetEmail || currentUser?.email || '',
        full_name: data.fullName || currentUser?.full_name || 'Delivery Partner',
        phone: data.phone || currentUser?.phone || '',
        state: data.state || currentUser?.state || 'Meghalaya',
        district: data.district || currentUser?.district || 'West Garo Hills',
        block: data.block || currentUser?.block || 'Rongram',
        village: data.village || currentUser?.village || '',
        is_delivery_partner: true,
        vehicle_type: data.vehicleType,
        vehicle_number: data.vehicleNumber,
        driving_license: data.drivingLicenseNo || currentUser?.driving_license || '',
        driving_license_no: data.drivingLicenseNo || currentUser?.driving_license_no || '',
        driving_license_proof_url: data.drivingLicenseProofUrl || currentUser?.driving_license_proof_url || '',
        vehicle_rc_no: data.vehicleRcNo || currentUser?.vehicle_rc_no || '',
        payout_upi_id: data.payoutUpiId || currentUser?.payout_upi_id || '',
        payout_bank_name: data.payoutBankName || currentUser?.payout_bank_name || '',
        payout_account_no: data.payoutAccountNo || currentUser?.payout_account_no || '',
        payout_ifsc_code: data.payoutIfscCode || currentUser?.payout_ifsc_code || '',
        payout_qr_image_url: data.payoutQrImageUrl || currentUser?.payout_qr_image_url || '',
        partner_status: 'pending',
        is_pro: currentUser?.is_pro ?? false,
        role: currentUser?.role === 'user' || !currentUser?.role ? 'delivery_partner' : currentUser.role,
      };

      setCurrentUser(updatedProfile);
      try {
        localStorage.setItem('mlb_active_user', JSON.stringify(updatedProfile));
      } catch (_) {}

      setProfiles((prev) => {
        const exists = prev.some((p) => p.id === targetUserId || (targetEmail && p.email === targetEmail));
        if (exists) {
          return prev.map((p) =>
            p.id === targetUserId || (targetEmail && p.email === targetEmail)
              ? updatedProfile
              : p
          );
        }
        return [updatedProfile, ...prev];
      });

      // Maintain service_registrations in local state
      const validUserId = ensureUuid(targetUserId);
      const validRegId = generateUuid();

      const newServiceReg: ServiceRegistration = {
        id: validRegId,
        user_id: validUserId,
        user_name: data.fullName || currentUser?.full_name || 'Delivery Partner',
        full_name: data.fullName || currentUser?.full_name || 'Delivery Partner',
        phone: data.phone || currentUser?.phone || '',
        whatsapp: data.phone || currentUser?.phone || '',
        category: 'Delivery Partner',
        service_type: 'driver',
        vehicle_type: data.vehicleType || 'Bike',
        vehicle_number: data.vehicleNumber || 'N/A',
        payout_upi: data.payoutUpiId || '',
        payout_upi_id: data.payoutUpiId || '',
        driving_license_no: data.drivingLicenseNo || '',
        driving_license_proof_url: data.drivingLicenseProofUrl || '',
        vehicle_rc_no: data.vehicleRcNo || '',
        experience: `Delivery Rider / Driver (${data.vehicleType || 'Bike'})`,
        identity_proof_url:
          data.drivingLicenseProofUrl ||
          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
        aadhaar_or_voter_no: data.drivingLicenseNo || data.vehicleRcNo || '',
        service_address: `${data.village ? data.village + ', ' : ''}${data.block ? data.block + ', ' : ''}${data.district || 'West Garo Hills'}, ${data.state || 'Meghalaya'}`,
        city_locality: `${data.village ? data.village + ', ' : ''}${data.district || 'West Garo Hills'}`,
        state: data.state || currentUser?.state || 'Meghalaya',
        district: data.district || currentUser?.district || 'West Garo Hills',
        block: data.block || currentUser?.block || 'Rongram',
        village: data.village || currentUser?.village || '',
        bio_skills: `Vehicle: ${data.vehicleType} (${data.vehicleNumber}), DL: ${data.drivingLicenseNo || 'N/A'}`,
        hourly_or_daily_rate: 'Per Delivery / Commission',
        is_approved: false,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      setServiceRegistrations((prev) => [
        newServiceReg,
        ...prev.filter((s) => s.user_id !== targetUserId && s.user_id !== validUserId && s.id !== newServiceReg.id),
      ]);

      // Also register in vehicle_registrations for local state compatibility
      const newVehReg: VehicleRegistration = {
        id: generateUuid(),
        user_id: validUserId,
        driver_name: data.fullName || currentUser?.full_name || 'Delivery Partner',
        driver_phone: data.phone || currentUser?.phone || 'N/A',
        vehicle_type: data.vehicleType || 'Bike',
        vehicle_model: data.vehicleType || 'Bike',
        vehicle_number: data.vehicleNumber || 'N/A',
        driving_license_no: data.drivingLicenseNo || '',
        driving_license_proof_url: data.drivingLicenseProofUrl || '',
        operational_route: `${data.village ? data.village + ', ' : ''}${data.district || 'West Garo Hills'}`,
        payout_upi_id: data.payoutUpiId || '',
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      setVehicleRegistrations((prev) => [
        newVehReg,
        ...prev.filter((v) => v.user_id !== targetUserId && v.user_id !== validUserId && v.id !== newVehReg.id),
      ]);

      if (supabase) {
        // 2. Profiles table update karein
        const { error: profileError } = await supabase.from('profiles').upsert([
          {
            id: validUserId,
            email: targetEmail,
            full_name: data.fullName,
            name: data.fullName,
            phone: data.phone,
            state: data.state,
            district: data.district,
            block: data.block,
            village: data.village,
            is_delivery_partner: true,
            vehicle_type: data.vehicleType,
            vehicle_number: data.vehicleNumber,
            driving_license: data.drivingLicenseNo,
            driving_license_no: data.drivingLicenseNo,
            driving_license_proof_url: data.drivingLicenseProofUrl,
            vehicle_rc_no: data.vehicleRcNo,
            payout_upi_id: data.payoutUpiId,
            payout_bank_name: data.payoutBankName,
            payout_account_no: data.payoutAccountNo,
            payout_ifsc_code: data.payoutIfscCode,
            payout_qr_image_url: data.payoutQrImageUrl,
            partner_status: 'pending',
            role: currentUser?.role === 'user' || !currentUser?.role ? 'delivery_partner' : currentUser.role,
          },
        ]);

        if (profileError) {
          console.warn('Profile upsert notice:', profileError.message);
        }

        // 3. Main Fix: service_registrations table me submit karein
        const { error: regError } = await supabase
          .from('service_registrations')
          .insert([
            {
              id: validRegId,
              user_id: validUserId,
              full_name: data.fullName,
              phone: data.phone,
              service_type: 'driver',
              category: 'Delivery Partner',
              vehicle_number: data.vehicleNumber,
              vehicle_type: data.vehicleType,
              payout_upi: data.payoutUpiId,
              payout_upi_id: data.payoutUpiId,
              driving_license_no: data.drivingLicenseNo,
              driving_license_proof_url: data.drivingLicenseProofUrl,
              vehicle_rc_no: data.vehicleRcNo,
              experience: `Delivery Rider / Driver (${data.vehicleType})`,
              service_address: `${data.village ? data.village + ', ' : ''}${data.block ? data.block + ', ' : ''}${data.district || 'West Garo Hills'}, ${data.state || 'Meghalaya'}`,
              city_locality: `${data.village ? data.village + ', ' : ''}${data.district || 'West Garo Hills'}`,
              state: data.state || 'Meghalaya',
              district: data.district || 'West Garo Hills',
              block: data.block || 'Rongram',
              village: data.village || '',
              status: 'pending',
              is_approved: false,
            },
          ]);

        if (regError) {
          console.warn('service_registrations Supabase note:', regError.message);
        } else {
          fetchAdminRegistrations();
        }

        try {
          await supabase.from('vehicle_registrations').upsert([newVehReg]);
        } catch (_) {}
      }
    } catch (err: any) {
      alert("Unexpected Error: " + (err?.message || err));
      console.error("Registration Exception:", err);
    }
  };

  const handleAcceptDeliveryOrder = async (orderId: string) => {
    if (!currentUser) return;
    const acceptedTime = new Date().toISOString();
    const partnerId = currentUser.id;
    const partnerName = currentUser.full_name || 'Delivery Partner';
    const partnerPhone = currentUser.phone || '9876543210';

    setDeliveryOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'out_for_delivery',
              delivery_partner_id: partnerId,
              delivery_partner_name: partnerName,
              delivery_partner_phone: partnerPhone,
              accepted_at: acceptedTime,
            }
          : o
      )
    );

    if (supabase) {
      try {
        await supabase
          .from('delivery_orders')
          .update({
            status: 'out_for_delivery',
            delivery_partner_id: partnerId,
            delivery_partner_name: partnerName,
            delivery_partner_phone: partnerPhone,
            accepted_at: acceptedTime,
          })
          .eq('id', orderId);
      } catch (e) {
        console.error('Accept delivery order in Supabase:', e);
      }
    }
  };

  const handleUpdateDeliveryOrderStatus = async (
    orderId: string,
    newStatus: 'out_for_delivery' | 'delivered_by_boy' | 'delivered' | 'success'
  ) => {
    const isDriverMarked = newStatus === 'delivered_by_boy';
    const isCompleted = newStatus === 'success' || newStatus === 'delivered';
    const deliveredTime = (isDriverMarked || isCompleted) ? new Date().toISOString() : undefined;

    setDeliveryOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: newStatus,
              delivery_boy_marked_done: isDriverMarked ? true : o.delivery_boy_marked_done,
              buyer_confirmed: isCompleted ? true : o.buyer_confirmed,
              delivered_at: deliveredTime || o.delivered_at,
            }
          : o
      )
    );

    if (supabase) {
      try {
        const updatePayload: Record<string, any> = {
          status: newStatus,
        };
        if (isDriverMarked) {
          updatePayload.delivery_boy_marked_done = true;
          updatePayload.delivered_at = deliveredTime;
        }
        if (isCompleted) {
          updatePayload.buyer_confirmed = true;
          updatePayload.delivered_at = deliveredTime || new Date().toISOString();
        }

        await supabase
          .from('delivery_orders')
          .update(updatePayload)
          .eq('id', orderId);
      } catch (e) {
        console.error('Update delivery order status in Supabase:', e);
      }
    }
  };

  const handleConfirmDeliverySuccess = async (orderId: string) => {
    const successTime = new Date().toISOString();
    setDeliveryOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'success',
              buyer_confirmed: true,
              delivered_at: o.delivered_at || successTime,
            }
          : o
      )
    );

    if (supabase) {
      try {
        await supabase
          .from('delivery_orders')
          .update({
            status: 'success',
            buyer_confirmed: true,
          })
          .eq('id', orderId);
      } catch (e) {
        console.error('Confirm delivery success in Supabase:', e);
      }
    }
  };

  const handleCancelOrder = async (
    orderId: string,
    reason: string,
    refundAmount: number,
    deliveryChargeRefund: number
  ) => {
    const cancelledTime = new Date().toISOString();
    setDeliveryOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'cancelled',
              cancelled_at: cancelledTime,
              cancellation_reason: reason,
              refund_amount: refundAmount,
              delivery_charge_refund: deliveryChargeRefund,
              cancelled_by: 'buyer',
            }
          : o
      )
    );

    if (supabase) {
      try {
        await supabase
          .from('delivery_orders')
          .update({
            status: 'cancelled',
            cancelled_at: cancelledTime,
            cancellation_reason: reason,
            refund_amount: refundAmount,
            delivery_charge_refund: deliveryChargeRefund,
            cancelled_by: 'buyer',
          })
          .eq('id', orderId);
      } catch (e) {
        console.error('Cancel order sync in Supabase:', e);
      }
    }
  };

  const handleCreateSampleDeliveryOrder = async (
    orderData: Omit<DeliveryOrder, 'id' | 'created_at'>
  ) => {
    const newOrder: DeliveryOrder = {
      id: `ord_${Date.now()}`,
      ...orderData,
      created_at: new Date().toISOString(),
    };

    setDeliveryOrders((prev) => [newOrder, ...prev]);

    if (supabase) {
      try {
        await supabase.from('delivery_orders').insert([newOrder]);
      } catch (e) {
        console.error('Insert delivery order in Supabase:', e);
      }
    }
  };

  // Order Placement & Payment Verification Handlers
  const handleOrderPlaced = async (newOrder: DeliveryOrder) => {
    setDeliveryOrders((prev) => [newOrder, ...prev]);
    if (currentUser?.id) {
      clearUserCart(currentUser.id);
      setCartCount(0);
    }
    if (supabase) {
      try {
        await supabase.from('delivery_orders').insert([newOrder]);
      } catch (e) {
        console.error('Supabase order insert sync:', e);
      }
    }

    // Direct WebintoApp Push Notification dispatch for partner
    try {
      const partnerRole = newOrder.delivery_partner_id ? 'delivery_partner' : 'seller';
      const targetPartnerId = newOrder.delivery_partner_id || (newOrder as any).seller_id;
      await sendOrderAlertToPartner(targetPartnerId, partnerRole, newOrder.order_number, {
        order_number: newOrder.order_number,
        item_description: newOrder.item_description,
        total_paid: newOrder.total_paid || newOrder.total_fare,
        customer_name: newOrder.customer_name,
      });
    } catch (pushErr) {
      console.warn('handleOrderPlaced push notification notice:', pushErr);
    }

    setSelectedListingForCheckout(null);
    setUserActiveTab('buyer_orders');
  };

  const handleVerifyOrderPayment = async (orderId: string, isApproved: boolean) => {
    const newPayStatus = isApproved ? 'verified' : 'rejected';
    const newStatus = isApproved ? 'pending' : 'rejected';
    setDeliveryOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              payment_status: newPayStatus,
              status: newStatus,
            }
          : o
      )
    );

    if (supabase) {
      try {
        await supabase
          .from('delivery_orders')
          .update({
            payment_status: newPayStatus,
            status: newStatus,
          })
          .eq('id', orderId);
      } catch (e) {
        console.error('Verify order payment Supabase sync:', e);
      }
    }
  };

  // =========================================================================
  // ROOT LEVEL AUTHENTICATION GATE (SECURITY FIRST)
  // If user is not logged in, display the clean, distraction-free Login Screen
  // User cannot access Marketplace listings, categories, or dashboards until login
  // =========================================================================
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        onNavigateToAdmin={() => navigateTo('admin')}
        isAdminRoute={currentRoute === 'admin'}
      />
    );
  }

  // =========================================================================
  // ROUTE 3: ISOLATED DELIVERY PARTNER REGISTRATION ('/delivery/register')
  // =========================================================================
  if (currentRoute === 'delivery_register') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
        <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow font-black text-xl">
                  <Bike className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg text-white">Delivery Fleet Onboarding</span>
                    <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
                      /delivery/register
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Join Garo Hills Local Logistics & Earn 80% per Delivery
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => navigateTo('delivery_dashboard')}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-1.5"
                >
                  <Package className="w-3.5 h-3.5" />
                  Delivery Dashboard
                </button>
                <button
                  onClick={() => navigateTo('user', 'marketplace')}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  User Marketplace
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <DeliveryPartnerRegistration
            currentUser={currentUser}
            onSubmit={handleRegisterDeliveryPartner}
            onNavigateToDashboard={() => navigateTo('delivery_dashboard')}
            onNavigateHome={() => navigateTo('user', 'marketplace')}
          />
        </main>
      </div>
    );
  }

  // =========================================================================
  // ROUTE 4: ISOLATED DELIVERY ORDERS DASHBOARD ('/delivery/dashboard')
  // =========================================================================
  if (currentRoute === 'delivery_dashboard') {
    return (
      <DeliveryPartnerDashboard
        currentUser={currentUser}
        orders={deliveryOrders}
        onAcceptOrder={handleAcceptDeliveryOrder}
        onUpdateOrderStatus={handleUpdateDeliveryOrderStatus}
        onCreateSampleOrder={handleCreateSampleDeliveryOrder}
        onNavigateToRegister={() => navigateTo('delivery_register')}
        onNavigateHome={() => navigateTo('user', 'marketplace')}
        onRefresh={fetchData}
        onUpdatePartnerProfile={handleRegisterDeliveryPartner}
      />
    );
  }

  // =========================================================================
  // ROUTE 2: ISOLATED ADMIN CONTROL DASHBOARD ('/admin') - STRICT SECURITY LOCK
  // =========================================================================
  if (currentRoute === 'admin') {
    // HARDCODE ADMIN EMAIL IN ROUTE GUARD:
    // If the authenticated user's email is NOT exactly equal to 'silgrakmarak1309@gmail.com',
    // completely block the page from rendering and immediately redirect them back to the main user marketplace website ('/').
    if (!isMasterAdmin(currentUser)) {
      navigateTo('user', 'marketplace');
      return null;
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Admin Isolation Header */}
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <BrandIcon size="md" variant="orange" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg text-white">Partner Hub</span>
                    <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
                      Admin Control Room
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Live Supabase Management & Moderation Room
                  </div>
                </div>
              </div>

              {/* Exit to User Marketplace */}
              <div className="flex items-center gap-3">
                <NotificationBell currentUser={currentUser} />
                <button
                  onClick={() => navigateTo('user', 'marketplace')}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Exit to User Marketplace (/)
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Admin Workspace Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <AdminControlRoom
            listings={listings}
            rechargeRequests={rechargeRequests}
            profiles={profiles}
            settings={settings}
            shopRegistrations={shopRegistrations}
            vehicleRegistrations={vehicleRegistrations}
            serviceRegistrations={serviceRegistrations}
            deliveryOrders={deliveryOrders}
            bannerAds={bannerAds}
            payoutRequests={payoutRequests}
            wallets={wallets}
            payoutLogs={payoutLogs}
            onProcessPayout={handleProcessPayout}
            onRefresh={fetchData}
            onViewListing={(item) => setSelectedListing(item)}
            onUpdateListingStatus={handleUpdateListingStatus}
            onApproveRecharge={handleApproveRecharge}
            onRejectRecharge={handleRejectRecharge}
            onToggleUserPro={handleToggleUserPro}
            onUpdateUserRole={handleUpdateUserRole}
            onUpdateDeliveryPartner={handleUpdateDeliveryPartner}
            onSaveSetting={handleSaveSetting}
            onApproveShopRegistration={handleApproveShopRegistration}
            onRejectShopRegistration={handleRejectShopRegistration}
            onApproveVehicleRegistration={handleApproveVehicleRegistration}
            onRejectVehicleRegistration={handleRejectVehicleRegistration}
            onApproveServiceRegistration={handleApproveServiceRegistration}
            onRejectServiceRegistration={handleRejectServiceRegistration}
            onVerifyOrderPayment={handleVerifyOrderPayment}
            onCreateBannerAd={handleCreateBannerAd}
            onUpdateBannerAd={handleUpdateBannerAd}
            onDeleteBannerAd={handleDeleteBannerAd}
            onToggleBannerAd={handleToggleBannerAd}
            onToggleProfileApproval={handleToggleProfileApproval}
            onApprovePayout={handleApprovePayout}
            onRejectPayout={handleRejectPayout}
            onUpdateWalletBalance={handleUpdateWalletBalance}
          />
        </main>

        {/* Detail Modal with Moderation */}
        <ListingDetailModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onModerate={handleUpdateListingStatus}
          isAdmin={true}
        />

        {/* Global In-App Notifications Toast */}
        <GlobalToastContainer />
      </div>
    );
  }

  // =========================================================================
  // ROUTE 1: EXCLUSIVE USER PANEL ('/') - NO ADMIN CONTROLS VISIBLE
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* Top Banner Alert */}
      <div className="bg-slate-950 text-slate-300 text-xs py-1.5 px-4 text-center border-b border-slate-800 flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="font-semibold text-white">Notice:</span>
        <span className="truncate">{broadcastAlert}</span>
      </div>

      {/* User Header Navigation (Admin controls strictly excluded) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Brand & Header Search Trigger Button */}
            <div className="flex items-center gap-2.5">
              <BrandLogo
                size="md"
                variant="light"
                onClick={() => setUserActiveTab('marketplace')}
              />
              {/* Header Search Trigger with Red Accent */}
              <button
                type="button"
                id="header_search_trigger_btn"
                onClick={() => setIsSearchModalOpen(true)}
                title="Search Listings, Shops, Vehicles & Services (Ctrl + K)"
                className="group flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 active:scale-95 text-white rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer border border-red-500/50"
              >
                <Search className="w-4 h-4 text-white group-hover:scale-110 transition-transform shrink-0" />
                <span className="hidden sm:inline text-xs font-black tracking-wide">Search</span>
              </button>
            </div>

            {/* User Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              <button
                onClick={() => setUserActiveTab('marketplace')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  userActiveTab === 'marketplace'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                Marketplace
              </button>

              {/* Cart Navigation Item */}
              <button
                onClick={() => handleRequireAuth('Cart', () => setUserActiveTab('cart'))}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 relative ${
                  userActiveTab === 'cart'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ShoppingCart className="w-4 h-4 text-orange-500" />
                <span>Cart</span>
                {cartCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-orange-600 text-white text-[10px] font-black rounded-full min-w-[18px] text-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* My Orders / Delivery Tracking */}
              <button
                onClick={() => handleRequireAuth('My Orders', () => setUserActiveTab('buyer_orders'))}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 relative ${
                  userActiveTab === 'buyer_orders'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Package className="w-4 h-4 text-orange-600" />
                <span>My Orders</span>
                {deliveryOrders.filter((o) => o.status === 'delivered_by_boy').length > 0 && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  const isUserPro =
                    Number(currentUser?.is_pro) === 1 ||
                    currentUser?.is_pro === true ||
                    currentUser?.pro_status === 'active' ||
                    isUserPlanActive(currentUser);
                  handleRequireAuth('Submit Listing', () => setUserActiveTab('submit'));
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  userActiveTab === 'submit'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Plus className="w-4 h-4" />
                Submit Listing
              </button>

              {/* Shop & Fleet Registration */}
              <button
                onClick={() => handleRequireAuth('Shop & Vehicle Registration', () => setUserActiveTab('registrations'))}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  userActiveTab === 'registrations'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Store className="w-4 h-4" />
                Shop & Vehicle Reg
              </button>

              {/* Delivery Partner Standalone Portal Link */}
              <button
                onClick={() => handleRequireAuth('Driver App Portal', () => navigateTo('delivery_dashboard'))}
                className="px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow hover:from-emerald-500 hover:to-teal-600 border border-emerald-500/40"
              >
                <Truck className="w-4 h-4 text-emerald-200" />
                Driver App Portal
              </button>

              <button
                onClick={() => handleRequireAuth('My Ads', () => setUserActiveTab('my_ads'))}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  userActiveTab === 'my_ads'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Tag className="w-4 h-4" />
                My Ads
              </button>

              <button
                onClick={() => handleRequireAuth('Transaction Logs', () => setUserActiveTab('transactions'))}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  userActiveTab === 'transactions'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Transactions
              </button>

              <button
                onClick={() => handleRequireAuth('My Account', () => setUserActiveTab('account'))}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  userActiveTab === 'account'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <User className="w-4 h-4" />
                My Account
              </button>

              <button
                onClick={() => handleRequireAuth('PRO Plans', () => setUserActiveTab('pro_upgrade'))}
                className={`ml-1 px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs ${
                  userActiveTab === 'pro_upgrade'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 fill-current text-amber-700" />
                PRO Plans
              </button>

              {/* Partner Hub Navigation Button - STRICTLY ONLY for silgrakmarak1309@gmail.com */}
              {isMasterAdmin(currentUser) && (
                <button
                  onClick={() => navigateTo('admin')}
                  className="ml-1 px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs bg-slate-900 text-orange-400 hover:bg-slate-800 hover:text-orange-300 border border-orange-500/40 cursor-pointer"
                  title="Open Partner Hub"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-orange-500" />
                  Partner Hub
                </button>
              )}
            </nav>

            {/* User Profile Badge, Cart Icon & Mobile Menu Button */}
            <div className="flex items-center gap-2">
              {/* Quick Header Cart Icon Button (Mobile & Desktop) */}
              <button
                onClick={() => handleRequireAuth('Cart', () => setUserActiveTab('cart'))}
                title="View Shopping Cart"
                className={`relative p-2 rounded-xl border transition flex items-center justify-center ${
                  userActiveTab === 'cart'
                    ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200 shadow-xs'
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 bg-orange-600 text-white text-[10px] font-black rounded-full min-w-[18px] text-center shadow-xs border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Notification Bell Center */}
              <NotificationBell currentUser={currentUser} />

              {currentUser ? (
                <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
                  <div
                    onClick={() => setUserActiveTab('account')}
                    className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition"
                  >
                    {currentUser.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt={currentUser.full_name || 'User'}
                        className="w-8 h-8 rounded-full object-cover border border-orange-300"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                        {currentUser.full_name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="text-left text-xs">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        {currentUser.full_name?.split(' ')[0] || 'Member'}
                        {currentUser.is_pro && (
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        )}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                        {currentUser.is_pro ? 'PRO' : 'Google Logged'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    title="Sign Out"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAuthTargetFeature('sign in');
                    setIsAuthModalOpen(true);
                  }}
                  className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 shadow-xs transition hover:border-slate-400"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile User Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-1 animate-in slide-in-from-top-2 duration-200">
            {currentUser ? (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl mb-2 border border-slate-200">
                <div className="flex items-center gap-2.5">
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.full_name || 'User'}
                      className="w-8 h-8 rounded-full object-cover border border-orange-300"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                      {currentUser.full_name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-800">{currentUser.full_name}</div>
                    <div className="text-[10px] text-slate-500">{currentUser.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthTargetFeature('sign in');
                  setIsAuthModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full mb-2 p-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center gap-2 shadow-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continue with Google
              </button>
            )}

            <button
              onClick={() => {
                setIsSearchModalOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full p-2.5 rounded-xl text-xs font-black text-left flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xs"
            >
              <Search className="w-4 h-4 text-white" />
              <span>Search Listings, Vehicles & Services</span>
            </button>

            <button
              onClick={() => {
                setUserActiveTab('marketplace');
                setMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2 ${
                userActiveTab === 'marketplace' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Marketplace
            </button>

            <button
              onClick={() => {
                handleRequireAuth('Cart', () => setUserActiveTab('cart'));
                setMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between ${
                userActiveTab === 'cart' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-orange-500" />
                <span>My Shopping Cart</span>
              </div>
              {cartCount > 0 && (
                <span className="px-2 py-0.5 bg-orange-600 text-white text-[10px] font-black rounded-full">
                  {cartCount} items
                </span>
              )}
            </button>

            <button
              onClick={() => {
                handleRequireAuth('My Orders', () => setUserActiveTab('buyer_orders'));
                setMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between ${
                userActiveTab === 'buyer_orders' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-600" />
                <span>My Orders & Tracking</span>
              </div>
              {deliveryOrders.filter((o) => o.status === 'delivered_by_boy').length > 0 && (
                <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full animate-pulse">
                  Arrived
                </span>
              )}
            </button>

            <button
              onClick={() => {
                const isUserPro =
                  Number(currentUser?.is_pro) === 1 ||
                  currentUser?.is_pro === true ||
                  currentUser?.pro_status === 'active' ||
                  isUserPlanActive(currentUser);
                handleRequireAuth('Submit Listing', () => setUserActiveTab('submit'));
                setMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2 ${
                userActiveTab === 'submit' ? 'bg-orange-600 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Plus className="w-4 h-4" />
              Submit Listing
            </button>

            <button
              onClick={() => {
                handleRequireAuth('Shop & Vehicle Registration', () => setUserActiveTab('registrations'));
                setMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2 ${
                userActiveTab === 'registrations' ? 'bg-orange-600 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Store className="w-4 h-4" />
              Shop & Vehicle Registration
            </button>

            <button
              onClick={() => {
                handleRequireAuth('Driver App Portal', () => navigateTo('delivery_dashboard'));
                setMobileMenuOpen(false);
              }}
              className="w-full p-2.5 rounded-xl text-xs font-black text-left flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow"
            >
              <Truck className="w-4 h-4 text-emerald-200" />
              Driver App Portal (Standalone View)
            </button>

            <button
              onClick={() => {
                handleRequireAuth('My Ads', () => setUserActiveTab('my_ads'));
                setMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2 ${
                userActiveTab === 'my_ads' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Tag className="w-4 h-4" />
              My Ads Status
            </button>

            <button
              onClick={() => {
                handleRequireAuth('Transaction Logs', () => setUserActiveTab('transactions'));
                setMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2 ${
                userActiveTab === 'transactions' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Transaction Logs
            </button>

            <button
              onClick={() => {
                handleRequireAuth('My Account', () => setUserActiveTab('account'));
                setMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2 ${
                userActiveTab === 'account' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <User className="w-4 h-4" />
              My Account
            </button>

            <button
              onClick={() => {
                handleRequireAuth('PRO Plans', () => setUserActiveTab('pro_upgrade'));
                setMobileMenuOpen(false);
              }}
              className="w-full p-2.5 rounded-xl text-xs font-black text-left flex items-center gap-2 bg-amber-100 text-amber-900"
            >
              <Sparkles className="w-4 h-4 text-amber-700" />
              PRO Plans
            </button>

            {/* Partner Hub Direct Link (Mobile - STRICTLY ONLY for silgrakmarak1309@gmail.com) */}
            {isMasterAdmin(currentUser) && (
              <button
                onClick={() => {
                  navigateTo('admin');
                  setMobileMenuOpen(false);
                }}
                className="w-full p-2.5 rounded-xl text-xs font-black text-left flex items-center gap-2 bg-slate-900 text-orange-400 border border-orange-500/40 shadow-xs cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-orange-500" />
                Partner Hub
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main User Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* VIEW 1: USER BAZAAR MARKETPLACE (DEFAULT AT '/') */}
        {userActiveTab === 'marketplace' && (
          <div className="space-y-6">
            {/* Urgent Driver Arrived Banner */}
            {deliveryOrders.filter((o) => o.status === 'delivered_by_boy').length > 0 && (
              <div className="p-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl text-white shadow-lg flex items-center justify-between gap-3 flex-wrap animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5 text-white animate-bounce" />
                  </div>
                  <div>
                    <div className="text-sm font-black">
                      Delivery Driver Arrived! ({deliveryOrders.filter((o) => o.status === 'delivered_by_boy').length} Order Awaiting Confirmation)
                    </div>
                    <div className="text-xs text-amber-100">
                      Your driver has marked your parcel as delivered. Inspect your item and confirm receipt.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setUserActiveTab('buyer_orders')}
                  className="px-4 py-2 bg-white text-orange-900 hover:bg-orange-50 rounded-xl text-xs font-black shadow transition cursor-pointer"
                >
                  Confirm Delivery Success →
                </button>
              </div>
            )}

            <UserMarketplace
              listings={listings}
              banners={bannerAds}
              onViewListing={(item) => setSelectedListing(item)}
              onOpenSubmit={() => {
                const isUserPro =
                  Number(currentUser?.is_pro) === 1 ||
                  currentUser?.is_pro === true ||
                  currentUser?.pro_status === 'active' ||
                  isUserPlanActive(currentUser);
                handleRequireAuth('Submit Listing', () => setUserActiveTab('submit'));
              }}
              onOpenPro={() => handleRequireAuth('PRO Plans', () => setUserActiveTab('pro_upgrade'))}
              onOrderNow={(item) => setSelectedListingForCheckout(item)}
              onAddToCart={(item) => handleAddToCart(item)}
            />
          </div>
        )}

        {/* VIEW 1.2: SHOPPING CART SCREEN */}
        {currentUser && userActiveTab === 'cart' && (
          <CartScreen
            currentUser={currentUser}
            onExploreMarketplace={() => setUserActiveTab('marketplace')}
            onProceedToCheckout={handleProceedFromCartToCheckout}
            onOpenPolicyModal={openAppPolicy}
          />
        )}

        {/* VIEW 1.5: BUYER ORDERS MANAGEMENT & LIVE CONFIRMATION */}
        {currentUser && userActiveTab === 'buyer_orders' && (
          <BuyerOrdersManagement
            currentUser={currentUser}
            orders={deliveryOrders}
            onConfirmDeliverySuccess={handleConfirmDeliverySuccess}
            onCancelOrder={handleCancelOrder}
            onExploreMarketplace={() => setUserActiveTab('marketplace')}
            onOpenPolicyModal={() => openAppPolicy('terms_conditions')}
          />
        )}

        {/* AUTH GUARD FOR PROTECTED ROUTES */}
        {!currentUser && userActiveTab !== 'marketplace' && (
          <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-orange-500 text-white font-black text-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-orange-500/20">
              M
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Sign in to Continue
            </h2>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Please sign in with your Google account (Gmail ID) to access{' '}
              <span className="font-bold text-slate-700">
                {userActiveTab === 'pro_upgrade'
                  ? 'PRO Membership Plans'
                  : userActiveTab === 'buyer_orders'
                  ? 'My Orders & Live Delivery Tracking'
                  : userActiveTab === 'submit'
                  ? 'Submit Listing'
                  : userActiveTab === 'delivery_dashboard'
                  ? 'Driver App Portal'
                  : userActiveTab === 'registrations'
                  ? 'Shop & Vehicle Registration'
                  : userActiveTab === 'my_ads'
                  ? 'My Ads Management'
                  : 'this feature'}
              </span>
              .
            </p>

            <button
              onClick={() => {
                setAuthTargetFeature(userActiveTab.replace('_', ' '));
                setIsAuthModalOpen(true);
              }}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-2xl text-slate-800 text-sm font-bold flex items-center justify-center gap-3 transition shadow-xs hover:border-slate-400"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              onClick={() => setUserActiveTab('marketplace')}
              className="mt-4 text-xs font-bold text-slate-500 hover:text-slate-800 transition block mx-auto"
            >
              ← Back to Marketplace
            </button>
          </div>
        )}

        {/* VIEW 2: SUBMIT LISTING */}
        {currentUser && userActiveTab === 'submit' && (
          <ListingSubmissionView
            onSuccess={handleListingSubmitted}
            onCancel={() => setUserActiveTab('marketplace')}
            onNavigateToPro={() => setUserActiveTab('pro_upgrade')}
            userPhone={currentUser.phone}
            userName={currentUser.full_name}
            userId={currentUser.id}
            isProUser={
              Number(currentUser?.is_pro) === 1 ||
              currentUser?.is_pro === true ||
              currentUser?.pro_status === 'active' ||
              isUserPlanActive(currentUser)
            }
            currentUser={currentUser}
          />
        )}

        {/* VIEW 2.5: SHOP, VEHICLE, DELIVERY & LOCAL SERVICES REGISTRATION */}
        {currentUser && userActiveTab === 'registrations' && (
          <BusinessVehicleRegistrationView
            currentUser={currentUser}
            shopRegistrations={shopRegistrations}
            vehicleRegistrations={vehicleRegistrations}
            serviceRegistrations={serviceRegistrations}
            wallets={wallets}
            payoutRequests={payoutRequests}
            onSubmitShop={handleSubmitShop}
            onSubmitVehicle={handleSubmitVehicle}
            onSubmitService={handleSubmitServiceRegistration}
            onSubmitDeliveryPartner={handleRegisterDeliveryPartner}
            onRequestPayout={handleRequestPayout}
            onNavigateToDeliveryDashboard={() => setUserActiveTab('delivery_dashboard')}
          />
        )}

        {/* VIEW 2.7: DELIVERY PARTNER ONBOARDING */}
        {currentUser && userActiveTab === 'delivery_register' && (
          <DeliveryPartnerRegistration
            currentUser={currentUser}
            onSubmit={handleRegisterDeliveryPartner}
            onNavigateToDashboard={() => setUserActiveTab('delivery_dashboard')}
            onNavigateHome={() => setUserActiveTab('marketplace')}
          />
        )}

        {/* VIEW 2.8: ISOLATED DELIVERY ORDERS DASHBOARD */}
        {currentUser && userActiveTab === 'delivery_dashboard' && (
          <DeliveryPartnerDashboard
            currentUser={currentUser}
            orders={deliveryOrders}
            payoutRequests={payoutRequests}
            onAcceptOrder={handleAcceptDeliveryOrder}
            onUpdateOrderStatus={handleUpdateDeliveryOrderStatus}
            onCreateSampleOrder={handleCreateSampleDeliveryOrder}
            onNavigateToRegister={() => setUserActiveTab('delivery_register')}
            onNavigateHome={() => setUserActiveTab('marketplace')}
            onRefresh={fetchData}
            onRequestPayout={handleRequestPayout}
            onUpdatePartnerProfile={handleRegisterDeliveryPartner}
          />
        )}

        {/* VIEW 3: MY ADS MANAGEMENT */}
        {currentUser && userActiveTab === 'my_ads' && (
          <MyAdsManagement
            myListings={listings}
            currentUser={currentUser}
            orders={deliveryOrders}
            payoutRequests={payoutRequests}
            onOpenSubmitModal={() => {
              const isUserPro =
                Number(currentUser?.is_pro) === 1 ||
                currentUser?.is_pro === true ||
                currentUser?.pro_status === 'active' ||
                isUserPlanActive(currentUser);
              setUserActiveTab('submit');
            }}
            onViewListing={(item) => setSelectedListing(item)}
            onDeleteListing={handleDeleteListing}
            onToggleListingStatus={handleToggleListingStatus}
            onRequestPayout={handleRequestPayout}
          />
        )}

        {/* VIEW 4: TRANSACTION LOGS */}
        {currentUser && userActiveTab === 'transactions' && (
          <TransactionLogs
            recharges={rechargeRequests}
            onNewRechargeClick={() => setUserActiveTab('pro_upgrade')}
          />
        )}

        {/* VIEW 5: MY ACCOUNT */}
        {currentUser && userActiveTab === 'account' && (
          <AccountSecurity
            currentUser={currentUser}
            onUpgradeClick={() => setUserActiveTab('pro_upgrade')}
            onSignOut={handleSignOut}
            onNavigateToAdmin={() => navigateTo('admin')}
            onUpdateDeliveryPartner={handleUpdateDeliveryPartner}
            onUpdatePermanentAddress={handleUpdatePermanentAddress}
          />
        )}

        {/* VIEW 6: PRO MEMBERSHIP PLANS */}
        {currentUser && userActiveTab === 'pro_upgrade' && (
          <ProUpgradeView
            upiId={upiId}
            qrCodeUrl={qrCodeUrl}
            userEmail={currentUser.email}
            userName={currentUser.full_name || 'Member'}
            userPhone={currentUser.phone || '9876543210'}
            onSubmitRecharge={handleSubmitRecharge}
            onSuccessReturn={() => setUserActiveTab('marketplace')}
          />
        )}
      </main>

      {/* Universal Search Modal Overlay */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        listings={listings}
        onSelectListing={(listing) => {
          setSelectedListing(listing);
          setUserActiveTab('marketplace');
        }}
      />

      {/* Listing Detail Modal with Direct WhatsApp Protocol & Add to Cart */}
      <ListingDetailModal
        listing={selectedListing}
        onClose={() => setSelectedListing(null)}
        onOrderNow={(item) => setSelectedListingForCheckout(item)}
        onAddToCart={(item) => handleAddToCart(item)}
        isAdmin={false}
      />

      {/* Cart Toast Notification */}
      {cartToast.visible && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <div>
            <div className="text-xs font-bold">{cartToast.message}</div>
            <button
              onClick={() => {
                setCartToast((prev) => ({ ...prev, visible: false }));
                setUserActiveTab('cart');
              }}
              className="text-[11px] font-extrabold text-orange-400 hover:text-orange-300 underline"
            >
              View Cart →
            </button>
          </div>
        </div>
      )}

      {/* 100% Prepaid Online Advance Payment Checkout Modal */}
      {selectedListingForCheckout && (
        <CheckoutModal
          listing={selectedListingForCheckout}
          currentUser={currentUser}
          adminUpiId={upiId}
          adminQrUrl={qrCodeUrl}
          onClose={() => setSelectedListingForCheckout(null)}
          onOrderPlaced={handleOrderPlaced}
        />
      )}

      {/* Google Authentication Modal */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        featureName={authTargetFeature}
      />

      {/* User Footer with Quick Admin Switch */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} Meri Local Bazaar. All rights reserved.</div>
          <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => openAppPolicy('terms_conditions')}
              className="text-slate-600 hover:text-orange-600 hover:underline transition cursor-pointer font-medium"
            >
              Terms & Conditions
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => openAppPolicy('privacy_policy')}
              className="text-slate-600 hover:text-orange-600 hover:underline transition cursor-pointer font-medium"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <span>Verified Local Sellers</span>
            <span>•</span>
            <span>WhatsApp Direct Inquiry</span>
            <span>•</span>
            <span>Secure Database</span>
            {isMasterAdmin(currentUser) && (
              <>
                <span>•</span>
                <button
                  onClick={() => navigateTo('admin')}
                  className="text-orange-600 hover:text-orange-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-orange-600" />
                  Partner Hub
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* Centralized Policy Viewer Modal */}
      <PolicyModal
        isOpen={appPolicyModalOpen}
        initialType={appPolicyModalType}
        onClose={() => setAppPolicyModalOpen(false)}
      />

      {/* Global In-App Notifications Toast & Push Listener */}
      <GlobalToastContainer />
      <GlobalNotificationManager userRole={currentUser?.role} currentUser={currentUser} />
    </div>
  );
}

export default App;
