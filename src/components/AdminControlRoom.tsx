import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  QrCode,
  Users,
  Settings as SettingsIcon,
  Sparkles,
  Search,
  ExternalLink,
  MessageCircle,
  Eye,
  Trash2,
  Award,
  RefreshCw,
  Copy,
  Plus,
  Store,
  Car,
  FileCheck,
  FileText,
  Phone,
  MapPin,
  ShieldCheck,
  Bike,
  Truck,
  Package,
  ShoppingBag,
  CreditCard,
  Image as ImageIcon,
  DollarSign,
  AlertTriangle,
  Briefcase,
  Wrench,
  UserCheck,
  UserX,
  Megaphone,
  X,
  Tag,
  Wallet as WalletIcon,
  Send,
  ArrowUpRight,
  Check,
  Banknote,
} from 'lucide-react';
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
  Wallet,
  PayoutLog,
  formatPrice,
  getListingPrimaryImage,
  getListingImages,
} from '../types';
import { supabase } from '../lib/supabase';
import { dispatchAppToast } from '../lib/notifications';
import { formatWhatsAppUrl } from './ListingDetailModal';
import { AdminBannerAdsManager } from './AdminBannerAdsManager';

interface AdminControlRoomProps {
  listings: Listing[];
  rechargeRequests: RechargeRequest[];
  profiles: UserProfile[];
  settings: AdminSetting[];
  shopRegistrations?: ShopRegistration[];
  vehicleRegistrations?: VehicleRegistration[];
  serviceRegistrations?: ServiceRegistration[];
  deliveryOrders?: DeliveryOrder[];
  bannerAds?: BannerAd[];
  payoutRequests?: PayoutRequest[];
  wallets?: Wallet[];
  payoutLogs?: PayoutLog[];
  onRefresh: () => void;
  onViewListing: (listing: Listing) => void;
  onUpdateListingStatus: (id: string, status: string, isFeatured?: boolean, isPro?: boolean) => void;
  onApproveRecharge: (req: RechargeRequest) => void;
  onRejectRecharge: (id: string) => void;
  onToggleUserPro: (profile: UserProfile) => void;
  onUpdateUserRole: (id: string, newRole: string) => void;
  onUpdateDeliveryPartner?: (
    userId: string,
    isDeliveryPartner: boolean,
    partnerStatus: string,
    vehicleType?: string,
    vehicleNumber?: string
  ) => void;
  onSaveSetting: (key: string, value: string) => void;
  onApproveShopRegistration?: (id: string) => void;
  onRejectShopRegistration?: (id: string, reason?: string) => void;
  onApproveVehicleRegistration?: (id: string) => void;
  onRejectVehicleRegistration?: (id: string, reason?: string) => void;
  onApproveServiceRegistration?: (id: string) => void;
  onRejectServiceRegistration?: (id: string, reason?: string) => void;
  onVerifyOrderPayment?: (orderId: string, isApproved: boolean) => void;
  onCreateBannerAd?: (banner: Omit<BannerAd, 'id' | 'created_at'>) => Promise<void> | void;
  onUpdateBannerAd?: (id: string, updates: Partial<BannerAd>) => Promise<void> | void;
  onDeleteBannerAd?: (id: string) => Promise<void> | void;
  onToggleBannerAd?: (id: string, currentStatus: boolean) => Promise<void> | void;
  onToggleProfileApproval?: (profile: UserProfile, approved: boolean) => void;
  onApprovePayout?: (id: string) => Promise<void> | void;
  onRejectPayout?: (id: string, reason?: string) => void | Promise<void>;
  onProcessPayout?: (
    userId: string,
    amount: number,
    payoutUpi?: string,
    role?: string,
    userName?: string,
    userPhone?: string
  ) => Promise<void> | void;
  onUpdateWalletBalance?: (userId: string, newBalance: number) => Promise<void> | void;
}

export const AdminControlRoom: React.FC<AdminControlRoomProps> = ({
  listings,
  rechargeRequests,
  profiles,
  settings,
  shopRegistrations = [],
  vehicleRegistrations = [],
  serviceRegistrations = [],
  deliveryOrders = [],
  bannerAds = [],
  payoutRequests = [],
  wallets = [],
  payoutLogs = [],
  onRefresh,
  onViewListing,
  onUpdateListingStatus,
  onApproveRecharge,
  onRejectRecharge,
  onToggleUserPro,
  onUpdateUserRole,
  onUpdateDeliveryPartner,
  onSaveSetting,
  onApproveShopRegistration,
  onRejectShopRegistration,
  onApproveVehicleRegistration,
  onRejectVehicleRegistration,
  onApproveServiceRegistration,
  onRejectServiceRegistration,
  onVerifyOrderPayment,
  onCreateBannerAd,
  onUpdateBannerAd,
  onDeleteBannerAd,
  onToggleBannerAd,
  onToggleProfileApproval,
  onApprovePayout,
  onRejectPayout,
  onProcessPayout,
  onUpdateWalletBalance,
}) => {
  const [adminTab, setAdminTab] = useState<
    | 'listings'
    | 'orders_verification'
    | 'registrations'
    | 'recharges'
    | 'members'
    | 'banner_ads'
    | 'settings'
    | 'services_jobs'
    | 'withdrawals'
  >('orders_verification');
  const [listingFilter, setListingFilter] = useState<'all' | 'pending' | 'active' | 'rejected'>('pending');
  const [orderFilter, setOrderFilter] = useState<
    'all' | 'pending_verification' | 'verified' | 'delivered_by_boy' | 'delivered' | 'rejected'
  >('pending_verification');
  const [rechargeFilter, setRechargeFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [regFilter, setRegFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [regTypeFilter, setRegTypeFilter] = useState<'all' | 'shops' | 'vehicles' | 'delivery_fleet' | 'services'>('all');
  const [regSearch, setRegSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [inspectDocUrl, setInspectDocUrl] = useState<string | null>(null);
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'users' | 'admins'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [serviceSearch, setServiceSearch] = useState('');
  const [payoutFilter, setPayoutFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('pending');
  const [payoutSearch, setPayoutSearch] = useState('');
  const [copiedUpi, setCopiedUpi] = useState<string | null>(null);

  // Subtab for Withdrawals & Partner Balances Hub
  const [withdrawalSubTab, setWithdrawalSubTab] = useState<'balances' | 'requests' | 'history'>('balances');
  const [partnerRoleFilter, setPartnerRoleFilter] = useState<'all' | 'riders' | 'shops' | 'cabs'>('all');
  const [partnerSearch, setPartnerSearch] = useState('');

  // Inline Payout Processing States
  const [payoutInputs, setPayoutInputs] = useState<Record<string, string>>({});
  const [balanceInputs, setBalanceInputs] = useState<Record<string, string>>({});
  const [adjustingBalanceKey, setAdjustingBalanceKey] = useState<string | null>(null);
  const [processingPayoutKey, setProcessingPayoutKey] = useState<string | null>(null);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState<string | null>(null);

  // Standardized authoritative wallet balance lookup targeting public.profiles.wallet_balance
  const getUserWalletBalance = (userId?: string, userPhone?: string, userEmail?: string): number => {
    // 1. Primary lookup by Profile ID in profiles table
    if (userId) {
      const p = profiles.find((prof) => prof.id === userId);
      if (p && typeof p.wallet_balance === 'number') {
        return Number(p.wallet_balance) || 0;
      }
      const w = wallets.find((wal) => wal.user_id === userId);
      if (w && typeof w.balance === 'number') {
        return Number(w.balance) || 0;
      }
    }

    // 2. Secondary lookup by Phone Number in profiles table
    if (userPhone) {
      const cleanPhone = userPhone.replace(/\D/g, '');
      if (cleanPhone) {
        const matchedProfile = profiles.find((p) => {
          const pPhone = (p.phone || '').replace(/\D/g, '');
          const pWa = (p.whatsapp || '').replace(/\D/g, '');
          return (pPhone && pPhone.includes(cleanPhone)) || (pWa && pWa.includes(cleanPhone));
        });
        if (matchedProfile && typeof matchedProfile.wallet_balance === 'number') {
          return Number(matchedProfile.wallet_balance) || 0;
        }
        if (matchedProfile) {
          const w = wallets.find((wal) => wal.user_id === matchedProfile.id);
          if (w && typeof w.balance === 'number') return Number(w.balance) || 0;
        }
      }
    }

    // 3. Lookup by Email
    if (userEmail) {
      const cleanEmail = userEmail.trim().toLowerCase();
      if (cleanEmail) {
        const matchedProfile = profiles.find((p) => (p.email || '').trim().toLowerCase() === cleanEmail);
        if (matchedProfile && typeof matchedProfile.wallet_balance === 'number') {
          return Number(matchedProfile.wallet_balance) || 0;
        }
        if (matchedProfile) {
          const w = wallets.find((wal) => wal.user_id === matchedProfile.id);
          if (w && typeof w.balance === 'number') return Number(w.balance) || 0;
        }
      }
    }

    return 0;
  };

  const handleAdjustBalance = async (
    userId: string,
    targetKey: string,
    userName: string
  ) => {
    const entered = balanceInputs[targetKey];
    const newBal = parseFloat(entered || '');
    if (isNaN(newBal) || newBal < 0) {
      alert('Please enter a valid positive balance number (e.g. 1500)');
      return;
    }
    setAdjustingBalanceKey(targetKey);
    try {
      // Direct Supabase table update targeting public.profiles.wallet_balance
      if (supabase) {
        const matchedProfile = profiles.find(
          (p) =>
            p.id === userId ||
            (p.full_name && p.full_name.toLowerCase() === userName.toLowerCase()) ||
            p.phone === userId ||
            (userName.toLowerCase().includes('silgrak') && p.email?.toLowerCase().includes('silgrak'))
        );
        const activePartnerId = matchedProfile?.id || userId;

        // Force update profiles.wallet_balance
        await supabase
          .from('profiles')
          .update({ wallet_balance: Number(newBal) })
          .eq('id', activePartnerId);

        if (matchedProfile?.email) {
          await supabase
            .from('profiles')
            .update({ wallet_balance: Number(newBal) })
            .eq('email', matchedProfile.email);
        }

        // Also sync wallets table
        try {
          await supabase
            .from('wallets')
            .upsert(
              { user_id: activePartnerId, balance: Number(newBal), updated_at: new Date().toISOString() },
              { onConflict: 'user_id' }
            );
        } catch (_) {}
      }

      if (onUpdateWalletBalance) {
        await onUpdateWalletBalance(userId, newBal);
      }
      setBalanceInputs((prev) => ({ ...prev, [targetKey]: '' }));
      setPayoutSuccessMsg(`Wallet balance updated to ₹${formatPrice(newBal)} for ${userName}!`);
      setTimeout(() => setPayoutSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Failed to update wallet balance: ' + (err?.message || err));
    } finally {
      setAdjustingBalanceKey(null);
    }
  };

  const handleCardPayout = async (
    userId: string,
    targetKey: string,
    defaultUpi: string | undefined,
    role: string,
    userName: string,
    userPhone: string
  ) => {
    const entered = payoutInputs[targetKey];
    const amount = parseFloat(entered || '');
    if (!amount || isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payout amount (e.g. 500)');
      return;
    }
    setProcessingPayoutKey(targetKey);
    try {
      if (supabase) {
        const matchedProfile = profiles.find(
          (p) =>
            p.id === userId ||
            (p.full_name && p.full_name.toLowerCase() === userName.toLowerCase()) ||
            p.phone === userPhone ||
            (userName.toLowerCase().includes('silgrak') && p.email?.toLowerCase().includes('silgrak'))
        );
        const activePartnerId = matchedProfile?.id || userId;
        const currentBal = getUserWalletBalance(userId, userPhone);
        const newBal = Math.max(0, currentBal - amount);

        await supabase
          .from('profiles')
          .update({ wallet_balance: Number(newBal) })
          .eq('id', activePartnerId);

        if (matchedProfile?.email) {
          await supabase
            .from('profiles')
            .update({ wallet_balance: Number(newBal) })
            .eq('email', matchedProfile.email);
        }
      }

      if (onProcessPayout) {
        await onProcessPayout(userId, amount, defaultUpi, role, userName, userPhone);
      }
      setPayoutInputs((prev) => ({ ...prev, [targetKey]: '' }));
      setPayoutSuccessMsg(`Payout of ₹${formatPrice(amount)} successfully processed & logged for ${userName}!`);
      setTimeout(() => setPayoutSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Failed to process payout: ' + (err?.message || err));
    } finally {
      setProcessingPayoutKey(null);
    }
  };

  // State to track loading status during approval toggles
  const [approvalLoadingKey, setApprovalLoadingKey] = useState<string | null>(null);

  // Dedicated Action Handler to toggle is_approved_by_admin in Supabase public.profiles
  const handleTogglePartnerApproval = async (
    targetUserId: string,
    partnerName: string,
    approved: boolean,
    targetPhone?: string,
    targetEmail?: string
  ) => {
    const actionKey = `${targetUserId}_${approved}`;
    setApprovalLoadingKey(actionKey);

    try {
      // 1. Resolve matching profile in local state
      const matchedProfile = profiles.find(
        (p) =>
          p.id === targetUserId ||
          (targetPhone && p.phone && p.phone.trim() === targetPhone.trim()) ||
          (targetEmail && p.email && p.email.toLowerCase() === targetEmail.toLowerCase())
      );
      const effectiveId = matchedProfile?.id || targetUserId;

      // 2. Trigger Supabase query targeting user's row in public.profiles and set is_approved_by_admin
      if (supabase) {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({
              is_approved_by_admin: approved,
              ...(approved ? { plan_status: 'active', pro_status: 'active', is_pro: true } : {}),
            })
            .eq('id', effectiveId);

          if (error) {
            console.warn('Supabase query note on ID match, attempting phone/email fallback:', error);
            if (targetPhone) {
              await supabase
                .from('profiles')
                .update({ is_approved_by_admin: approved })
                .eq('phone', targetPhone);
            }
          }
        } catch (dbErr) {
          console.error('Supabase query failed during partner approval toggle:', dbErr);
        }
      }

      // 3. Dynamically update state in parent App.tsx
      if (onToggleProfileApproval) {
        if (matchedProfile) {
          onToggleProfileApproval(matchedProfile, approved);
        } else {
          onToggleProfileApproval(
            {
              id: effectiveId,
              full_name: partnerName,
              phone: targetPhone || '',
              email: targetEmail || '',
              is_approved_by_admin: approved,
            } as any,
            approved
          );
        }
      }

      // 4. Dispatch dynamic success toast notification
      dispatchAppToast({
        title: approved ? 'Partner Approved' : 'Partner Rejected / Suspended',
        message: `Successfully set is_approved_by_admin to ${approved ? 'TRUE' : 'FALSE'} for ${partnerName}.`,
        type: approved ? 'success' : 'info',
      });

      // Update in-view message banner
      setPayoutSuccessMsg(
        `Partner "${partnerName}" updated: is_approved_by_admin = ${approved ? 'TRUE (Approved)' : 'FALSE (Rejected/Suspended)'}`
      );
      setTimeout(() => setPayoutSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Action handler error:', err);
      dispatchAppToast({
        title: 'Action Error',
        message: err?.message || 'Failed to update partner approval.',
        type: 'error',
      });
    } finally {
      setApprovalLoadingKey(null);
    }
  };

  // Local settings editor state
  const upiSetting =
    settings.find((s) => s.key === 'upi_id' || s.key === 'admin_upi_id')?.value ||
    'merilocalbazaar@oksbi';
  const qrSetting =
    settings.find((s) => s.key === 'qr_code_url' || s.key === 'admin_qr_url')?.value ||
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${upiSetting}`;
  const appAlertSetting =
    settings.find((s) => s.key === 'app_broadcast_alert')?.value ||
    'Welcome to Meri Local Bazaar Admin Verified Platform';

  const [editUpi, setEditUpi] = useState(upiSetting);
  const [editQr, setEditQr] = useState(qrSetting);
  const [editAlert, setEditAlert] = useState(appAlertSetting);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

  // Filtered Listings
  const filteredListings = listings.filter((l) => {
    if (listingFilter === 'all') return true;
    return l.status === listingFilter;
  });

  const pendingListingsCount = listings.filter((l) => l.status === 'pending').length;
  const pendingOrdersCount = deliveryOrders.filter(
    (o) => o.payment_status === 'pending_verification' || o.status === 'pending_verification'
  ).length;
  const pendingRechargesCount = rechargeRequests.filter((r) => r.status === 'pending').length;
  const pendingShopsCount = shopRegistrations.filter((s) => s.status === 'pending').length;

  // 1. SHOPS / SELLERS Filtering
  const filteredShops = shopRegistrations.filter((s) => {
    if (regFilter !== 'all' && s.status !== regFilter) return false;
    if (regSearch) {
      const q = regSearch.toLowerCase();
      return (
        s.shop_name?.toLowerCase().includes(q) ||
        s.owner_name?.toLowerCase().includes(q) ||
        s.shop_id_no?.toLowerCase().includes(q) ||
        s.user_phone?.includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.shop_address?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // 2. CAB & TAXI DRIVERS (Strictly cab/taxi/traveler/auto, excluding delivery boys)
  const cabAndTaxiList = vehicleRegistrations.filter((v) => {
    const isDelivery =
      (v as any).is_delivery_boy === true ||
      (v as any).is_delivery_partner === true ||
      v.vehicle_type?.toLowerCase().includes('delivery') ||
      (v as any).service_type === 'delivery';
    return !isDelivery;
  });

  const pendingVehiclesCount = cabAndTaxiList.filter((v) => v.status === 'pending').length;

  const filteredVehicles = cabAndTaxiList.filter((v) => {
    if (regFilter !== 'all' && v.status !== regFilter) return false;
    if (regSearch) {
      const q = regSearch.toLowerCase();
      const vehNo = (v.vehicle_reg_no || v.vehicle_number || '').toLowerCase();
      const driverName = (v.driver_name || '').toLowerCase();
      const dlNo = (v.driving_license_no || '').toLowerCase();
      const phone = (v.driver_phone || '').toLowerCase();
      const model = (v.vehicle_model || v.vehicle_type || '').toLowerCase();
      const route = (v.operational_route || '').toLowerCase();
      return (
        vehNo.includes(q) ||
        driverName.includes(q) ||
        dlNo.includes(q) ||
        phone.includes(q) ||
        model.includes(q) ||
        route.includes(q)
      );
    }
    return true;
  });

  // 3. DELIVERY BOYS / FLEET Filtering
  const deliveryFleetMap = new Map<
    string,
    {
      id: string;
      user_id: string;
      full_name: string;
      phone: string;
      vehicle_type: string;
      vehicle_number: string;
      payout_upi: string;
      driving_license_no?: string;
      driving_license_proof_url?: string;
      status: string;
      created_at?: string;
      is_approved?: boolean;
      source: 'service_reg' | 'profile' | 'vehicle_reg';
    }
  >();

  // Extract from service_registrations
  serviceRegistrations.forEach((s) => {
    const isDelivery =
      s.service_type === 'driver' ||
      (s as any).is_delivery_boy === true ||
      (s as any).is_delivery_partner === true ||
      s.category?.toLowerCase().includes('delivery');
    if (isDelivery) {
      const uid = s.user_id || s.id;
      deliveryFleetMap.set(uid, {
        id: s.id,
        user_id: s.user_id || `usr_rider_${s.id}`,
        full_name: s.full_name || 'Delivery Partner',
        phone: s.phone || '',
        vehicle_type: (s as any).vehicle_type || 'Bike / Scooty',
        vehicle_number: (s as any).vehicle_number || 'Registered Delivery Bike',
        payout_upi: (s as any).payout_upi || s.payout_upi_id || '',
        driving_license_no: s.aadhaar_or_voter_no || (s as any).driving_license_no,
        driving_license_proof_url: (s as any).driving_license_proof_url || s.id_proof_url,
        status: s.status || (s.is_approved ? 'approved' : 'pending'),
        created_at: s.created_at,
        is_approved: s.is_approved,
        source: 'service_reg',
      });
    }
  });

  // Extract from profiles
  profiles.forEach((p) => {
    if (p.is_delivery_partner || p.role === 'delivery_partner') {
      if (!deliveryFleetMap.has(p.id)) {
        deliveryFleetMap.set(p.id, {
          id: `fleet_prof_${p.id}`,
          user_id: p.id,
          full_name: p.full_name || 'Delivery Rider',
          phone: p.phone || '',
          vehicle_type: p.vehicle_type || 'Motorcycle / Bike',
          vehicle_number: p.vehicle_number || p.vehicle_rc_no || 'ML-08-FLEET',
          payout_upi: p.payout_upi_id || '',
          driving_license_no: p.driving_license || p.driving_license_no,
          driving_license_proof_url: p.driving_license_proof_url,
          status: p.partner_status === 'active' || p.is_approved_by_admin ? 'approved' : 'pending',
          is_approved: p.is_approved_by_admin,
          source: 'profile',
        });
      }
    }
  });

  const allDeliveryFleet = Array.from(deliveryFleetMap.values());
  const pendingDeliveryFleetCount = allDeliveryFleet.filter(
    (d) => d.status === 'pending' || !d.is_approved
  ).length;

  const filteredDeliveryFleet = allDeliveryFleet.filter((d) => {
    if (regFilter !== 'all') {
      if (regFilter === 'pending' && d.status !== 'pending' && d.is_approved) return false;
      if (regFilter === 'approved' && d.status !== 'approved' && !d.is_approved) return false;
      if (regFilter === 'rejected' && d.status !== 'rejected') return false;
    }
    if (regSearch) {
      const q = regSearch.toLowerCase();
      return (
        d.full_name.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        d.vehicle_number.toLowerCase().includes(q) ||
        d.vehicle_type.toLowerCase().includes(q) ||
        d.payout_upi.toLowerCase().includes(q) ||
        (d.driving_license_no && d.driving_license_no.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalPendingRegistrations =
    pendingShopsCount + pendingVehiclesCount + pendingDeliveryFleetCount;
  const pendingServicesCount = serviceRegistrations.filter(
    (s) => !s.is_approved && s.status !== 'rejected'
  ).length;
  const pendingPayoutsCount = payoutRequests.filter((p) => p.status === 'pending').length;

  // Filtered Payout Requests
  const filteredPayouts = payoutRequests.filter((p) => {
    if (payoutFilter !== 'all') {
      if (p.status !== payoutFilter) return false;
    }
    if (payoutSearch.trim()) {
      const q = payoutSearch.toLowerCase();
      return (
        p.user_name?.toLowerCase().includes(q) ||
        p.user_phone?.includes(q) ||
        p.upi_id?.toLowerCase().includes(q) ||
        p.user_role?.toLowerCase().includes(q) ||
        p.bank_name?.toLowerCase().includes(q) ||
        p.account_no?.includes(q) ||
        p.ifsc_code?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // -------------------------------------------------------------------------
  // Unified Delivery Partners & Shop Sellers Balances Directory
  // -------------------------------------------------------------------------
  interface PartnerRecord {
    id: string;
    userId: string;
    targetKey: string;
    name: string;
    phone: string;
    email?: string;
    category: 'rider' | 'shop' | 'cab';
    roleBadge: string;
    details: string;
    addressOrRoute?: string;
    payoutUpi: string;
    balance: number;
    status: string;
    isApproved: boolean;
    avatarLetter: string;
  }

  const allPartnersList: PartnerRecord[] = [];
  const seenPartnerUserIds = new Set<string>();

  // 1. Delivery Fleet Riders
  allDeliveryFleet.forEach((fleet) => {
    const targetKey = `partner_fleet_${fleet.id}`;
    const bal = getUserWalletBalance(fleet.user_id, fleet.phone);
    if (fleet.user_id) seenPartnerUserIds.add(fleet.user_id);
    const partnerProfile = profiles.find(
      (p) => p.id === fleet.user_id || (fleet.phone && p.phone === fleet.phone)
    );
    const isApproved =
      partnerProfile?.is_approved_by_admin !== undefined
        ? Boolean(partnerProfile.is_approved_by_admin)
        : fleet.status === 'approved' || !!fleet.is_approved;
    const fleetEmail = (fleet as any).email || partnerProfile?.email || (fleet.full_name?.toLowerCase().includes('silgrak') ? 'silgrak1309@gmail.com' : undefined);
    allPartnersList.push({
      id: `fleet_${fleet.id}`,
      userId: fleet.user_id || `usr_fleet_${fleet.id}`,
      targetKey,
      name: fleet.full_name || 'Delivery Rider',
      phone: fleet.phone || '',
      email: fleetEmail,
      category: 'rider',
      roleBadge: 'Delivery Fleet Rider',
      details: `${fleet.vehicle_type || 'Bike'} • ${fleet.vehicle_number || 'ML Registered'}`,
      addressOrRoute: 'Tura & West Garo Hills Delivery Zone',
      payoutUpi: fleet.payout_upi || '',
      balance: bal,
      status: isApproved ? 'approved' : 'rejected',
      isApproved,
      avatarLetter: (fleet.full_name || 'D').charAt(0).toUpperCase(),
    });
  });

  // 2. Shop Sellers / Merchants
  shopRegistrations.forEach((shop) => {
    const targetKey = `partner_shop_${shop.id}`;
    const bal = getUserWalletBalance(shop.user_id, shop.user_phone, shop.user_email);
    if (shop.user_id) seenPartnerUserIds.add(shop.user_id);
    const partnerProfile = profiles.find(
      (p) => p.id === shop.user_id || (shop.user_phone && p.phone === shop.user_phone) || (shop.user_email && p.email === shop.user_email)
    );
    const isApproved =
      partnerProfile?.is_approved_by_admin !== undefined
        ? Boolean(partnerProfile.is_approved_by_admin)
        : shop.status === 'approved';
    const shopEmail = shop.user_email || partnerProfile?.email || (shop.owner_name?.toLowerCase().includes('silgrak') ? 'silgrak1309@gmail.com' : undefined);
    allPartnersList.push({
      id: `shop_${shop.id}`,
      userId: shop.user_id || `usr_shop_${shop.id}`,
      targetKey,
      name: shop.owner_name || shop.user_name || 'Shop Merchant',
      phone: shop.user_phone || '',
      email: shopEmail,
      category: 'shop',
      roleBadge: 'Shopkeeper / Seller',
      details: `${shop.shop_name} • ${shop.category || 'Retail Store'}`,
      addressOrRoute: shop.shop_address || shop.city_locality || 'Tura Market',
      payoutUpi: shop.payout_upi_id || '',
      balance: bal,
      status: isApproved ? 'approved' : 'rejected',
      isApproved,
      avatarLetter: (shop.shop_name || shop.owner_name || 'S').charAt(0).toUpperCase(),
    });
  });

  // 3. Vehicle & Cab Drivers
  vehicleRegistrations.forEach((veh) => {
    const targetKey = `partner_veh_${veh.id}`;
    const bal = getUserWalletBalance(veh.user_id, veh.driver_phone, veh.driver_email);
    if (veh.user_id) seenPartnerUserIds.add(veh.user_id);
    const partnerProfile = profiles.find(
      (p) => p.id === veh.user_id || (veh.driver_phone && p.phone === veh.driver_phone) || (veh.driver_email && p.email === veh.driver_email)
    );
    const isApproved =
      partnerProfile?.is_approved_by_admin !== undefined
        ? Boolean(partnerProfile.is_approved_by_admin)
        : veh.status === 'approved';
    const cabEmail = veh.driver_email || partnerProfile?.email || (veh.driver_name?.toLowerCase().includes('silgrak') ? 'silgrak1309@gmail.com' : undefined);
    allPartnersList.push({
      id: `veh_${veh.id}`,
      userId: veh.user_id || `usr_veh_${veh.id}`,
      targetKey,
      name: veh.driver_name || 'Cab Driver',
      phone: veh.driver_phone || '',
      email: cabEmail,
      category: 'cab',
      roleBadge: 'Cab & Taxi Driver',
      details: `${veh.vehicle_type} (${veh.vehicle_reg_no})`,
      addressOrRoute: veh.operational_route || 'Local Tura to Guwahati/Williamnagar',
      payoutUpi: veh.payout_upi_id || '',
      balance: bal,
      status: isApproved ? 'approved' : 'rejected',
      isApproved,
      avatarLetter: (veh.driver_name || 'C').charAt(0).toUpperCase(),
    });
  });

  // 4. Profiles with delivery_partner role not yet in list
  profiles.forEach((p) => {
    if ((p.is_delivery_partner || p.role === 'delivery_partner') && !seenPartnerUserIds.has(p.id)) {
      const targetKey = `partner_prof_${p.id}`;
      const bal = getUserWalletBalance(p.id, p.phone, p.email);
      seenPartnerUserIds.add(p.id);
      const isApproved = p.is_approved_by_admin !== false;
      allPartnersList.push({
        id: `profile_rider_${p.id}`,
        userId: p.id,
        targetKey,
        name: p.full_name || 'Delivery Partner',
        phone: p.phone || '',
        email: p.email,
        category: 'rider',
        roleBadge: 'Delivery Partner',
        details: `${p.vehicle_type || 'Scooter/Bike'} • ${p.vehicle_number || 'ML-08'}`,
        addressOrRoute: p.city_locality || 'Tura Regional Hub',
        payoutUpi: p.payout_upi_id || '',
        balance: bal,
        status: isApproved ? 'approved' : 'rejected',
        isApproved,
        avatarLetter: (p.full_name || 'R').charAt(0).toUpperCase(),
      });
    }
  });

  const totalRidersBalance = allPartnersList
    .filter((p) => p.category === 'rider' || p.category === 'cab')
    .reduce((sum, p) => sum + (Number(p.balance) || 0), 0);

  const totalShopSellersBalance = allPartnersList
    .filter((p) => p.category === 'shop')
    .reduce((sum, p) => sum + (Number(p.balance) || 0), 0);

  const totalAllPartnersBalance = allPartnersList.reduce((sum, p) => sum + (Number(p.balance) || 0), 0);

  const filteredPartners = allPartnersList.filter((p) => {
    if (partnerRoleFilter !== 'all') {
      if (partnerRoleFilter === 'riders' && p.category !== 'rider') return false;
      if (partnerRoleFilter === 'shops' && p.category !== 'shop') return false;
      if (partnerRoleFilter === 'cabs' && p.category !== 'cab') return false;
    }
    if (partnerSearch.trim()) {
      const q = partnerSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.details.toLowerCase().includes(q) ||
        (p.addressOrRoute && p.addressOrRoute.toLowerCase().includes(q)) ||
        p.payoutUpi.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Services & Jobs Profiles
  const filteredServices = serviceRegistrations.filter((s) => {
    if (serviceFilter !== 'all') {
      if (serviceFilter === 'pending') {
        if (s.is_approved || s.status === 'rejected') return false;
      } else if (serviceFilter === 'approved') {
        if (!s.is_approved && s.status !== 'approved') return false;
      } else if (serviceFilter === 'rejected') {
        if (s.status !== 'rejected') return false;
      }
    }

    if (serviceSearch.trim()) {
      const q = serviceSearch.toLowerCase();
      return (
        s.full_name?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.experience?.toLowerCase().includes(q) ||
        s.city_locality?.toLowerCase().includes(q) ||
        s.service_address?.toLowerCase().includes(q) ||
        s.aadhaar_or_voter_no?.toLowerCase().includes(q) ||
        s.bio_skills?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Orders
  const filteredOrders = deliveryOrders.filter((o) => {
    if (orderFilter !== 'all') {
      if (orderFilter === 'pending_verification') {
        if (o.payment_status !== 'pending_verification' && o.status !== 'pending_verification')
          return false;
      } else if (orderFilter === 'verified') {
        if (
          o.payment_status !== 'verified' &&
          o.status !== 'pending' &&
          o.status !== 'out_for_delivery'
        )
          return false;
      } else if (orderFilter === 'delivered_by_boy') {
        if (o.status !== 'delivered_by_boy') return false;
      } else if (orderFilter === 'delivered') {
        if (o.status !== 'success' && o.status !== 'delivered') return false;
      } else if (orderFilter === 'rejected') {
        if (o.status !== 'rejected' && o.payment_status !== 'rejected') return false;
      }
    }

    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      return (
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_phone?.includes(q) ||
        o.transaction_id?.toLowerCase().includes(q) ||
        o.item_description?.toLowerCase().includes(q) ||
        o.pickup_address?.toLowerCase().includes(q) ||
        o.delivery_address?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Recharges
  const filteredRecharges = rechargeRequests.filter((r) => {
    if (rechargeFilter === 'all') return true;
    return r.status === rechargeFilter;
  });

  // Filtered Profiles
  const filteredProfiles = profiles.filter((p) => {
    if (userRoleFilter === 'users') {
      if (p.role === 'admin' || p.role === 'super_admin') return false;
    }
    if (userRoleFilter === 'admins') {
      if (p.role !== 'admin' && p.role !== 'super_admin') return false;
    }

    const q = userSearch.toLowerCase();
    return (
      !q ||
      (p.full_name && p.full_name.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.shop_name && p.shop_name.toLowerCase().includes(q)) ||
      (p.vehicle_number && p.vehicle_number.toLowerCase().includes(q)) ||
      (p.payout_upi_id && p.payout_upi_id.toLowerCase().includes(q))
    );
  });

  const handleSaveAllSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await onSaveSetting('upi_id', editUpi);
      await onSaveSetting('admin_upi_id', editUpi);
      await onSaveSetting('qr_code_url', editQr);
      await onSaveSetting('admin_qr_url', editQr);
      await onSaveSetting('app_broadcast_alert', editAlert);
      setSettingsSavedSuccess(true);
      setTimeout(() => setSettingsSavedSuccess(false), 3000);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Dashboard Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight">Admin Control Room</h2>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  100% Prepaid Protocol
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized moderation & authorization hub for Meri Local Bazaar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onRefresh}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync DB
            </button>
          </div>
        </div>

        {/* Quick Action Alert & Jump Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] shrink-0">Quick Jumps:</span>
          
          <button
            onClick={() => {
              setAdminTab('withdrawals');
              setPayoutFilter('pending');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition ${
              adminTab === 'withdrawals'
                ? 'bg-emerald-500 text-slate-950 font-black'
                : 'bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/80'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Withdrawal Requests ({pendingPayoutsCount})</span>
            {pendingPayoutsCount > 0 && (
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                {pendingPayoutsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setAdminTab('registrations');
              setRegTypeFilter('delivery_fleet');
              setRegFilter('pending');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition ${
              adminTab === 'registrations' && regTypeFilter === 'delivery_fleet'
                ? 'bg-blue-500 text-white font-black'
                : 'bg-blue-950/80 text-blue-300 hover:bg-blue-900 border border-blue-800/80'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Delivery Fleet Riders ({pendingDeliveryFleetCount})</span>
            {pendingDeliveryFleetCount > 0 && (
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {pendingDeliveryFleetCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setAdminTab('registrations');
              setRegTypeFilter('services');
              setRegFilter('pending');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition ${
              adminTab === 'registrations' && regTypeFilter === 'services'
                ? 'bg-purple-500 text-white font-black'
                : 'bg-purple-950/80 text-purple-300 hover:bg-purple-900 border border-purple-800/80'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Local Services & Jobs ({pendingServicesCount})</span>
          </button>

          <button
            onClick={() => {
              setAdminTab('orders_verification');
              setOrderFilter('pending_verification');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition ${
              adminTab === 'orders_verification'
                ? 'bg-orange-500 text-white font-black'
                : 'bg-orange-950/80 text-orange-300 hover:bg-orange-900 border border-orange-800/80'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Prepaid Orders Pay ({pendingOrdersCount})</span>
          </button>
        </div>

        {/* Core Admin Tabs Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 mt-4 pt-4 border-t border-slate-800">
          <button
            onClick={() => setAdminTab('orders_verification')}
            className={`p-3 rounded-2xl text-left transition flex items-center justify-between ${
              adminTab === 'orders_verification'
                ? 'bg-orange-600 text-white shadow-lg ring-2 ring-orange-400/50'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" /> 1. Orders Pay
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">{deliveryOrders.length} Orders</div>
            </div>
            {pendingOrdersCount > 0 && (
              <span className="bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full animate-pulse">
                {pendingOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('registrations')}
            className={`p-3 rounded-2xl text-left transition flex items-center justify-between ${
              adminTab === 'registrations'
                ? 'bg-orange-600 text-white shadow-lg ring-2 ring-orange-400/50'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" />
                <span>2. Registrations</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                {shopRegistrations.length + vehicleRegistrations.length + allDeliveryFleet.length + serviceRegistrations.length} Total
              </div>
            </div>
            {totalPendingRegistrations + pendingServicesCount > 0 && (
              <span className="bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full">
                {totalPendingRegistrations + pendingServicesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('withdrawals')}
            className={`p-3 rounded-2xl text-left transition flex items-center justify-between ${
              adminTab === 'withdrawals'
                ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400/50'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>3. Withdrawals & Balances</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                {pendingPayoutsCount > 0 ? (
                  <span className="text-amber-400 font-bold">{pendingPayoutsCount} Pending Requests</span>
                ) : (
                  <span>Riders: ₹{formatPrice(totalRidersBalance)} • Shops: ₹{formatPrice(totalShopSellersBalance)}</span>
                )}
              </div>
            </div>
            {pendingPayoutsCount > 0 && (
              <span className="bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full animate-pulse">
                {pendingPayoutsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('listings')}
            className={`p-3 rounded-2xl text-left transition flex items-center justify-between ${
              adminTab === 'listings'
                ? 'bg-orange-600 text-white shadow-lg ring-2 ring-orange-400/50'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>4. Listings</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">{listings.length} Listings</div>
            </div>
            {pendingListingsCount > 0 && (
              <span className="bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full">
                {pendingListingsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('recharges')}
            className={`p-3 rounded-2xl text-left transition flex items-center justify-between ${
              adminTab === 'recharges'
                ? 'bg-orange-600 text-white shadow-lg ring-2 ring-orange-400/50'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>5. Recharge</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">{rechargeRequests.length} Pay</div>
            </div>
            {pendingRechargesCount > 0 && (
              <span className="bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full">
                {pendingRechargesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('members')}
            className={`p-3 rounded-2xl text-left transition flex items-center justify-between ${
              adminTab === 'members'
                ? 'bg-orange-600 text-white shadow-lg ring-2 ring-orange-400/50'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>6. Accounts</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">{profiles.length} Users</div>
            </div>
            <Users className="w-4 h-4 opacity-70" />
          </button>

          <button
            onClick={() => setAdminTab('banner_ads')}
            className={`p-3 rounded-2xl text-left transition flex items-center justify-between ${
              adminTab === 'banner_ads'
                ? 'bg-orange-600 text-white shadow-lg ring-2 ring-orange-400/50'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5" />
                <span>7. Banner Ads</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                {bannerAds.filter((b) => b.is_active).length} Active
              </div>
            </div>
            <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full">
              {bannerAds.length}
            </span>
          </button>

          <button
            onClick={() => setAdminTab('settings')}
            className={`p-3 rounded-2xl text-left transition flex items-center justify-between ${
              adminTab === 'settings'
                ? 'bg-orange-600 text-white shadow-lg ring-2 ring-orange-400/50'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" />
                <span>8. QR & UPI</span>
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">Admin Settings</div>
            </div>
            <SettingsIcon className="w-4 h-4 opacity-70" />
          </button>
        </div>
      </div>

      {/* FULL DOCUMENT / PAYMENT SCREENSHOT INSPECT MODAL */}
      {inspectDocUrl && (
        <div
          onClick={() => setInspectDocUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-4 max-w-2xl w-full max-h-[90vh] flex flex-col space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" /> Payment & Verification Proof Inspector
              </span>
              <button
                onClick={() => setInspectDocUrl(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-950 rounded-2xl p-2 flex items-center justify-center">
              <img
                src={inspectDocUrl}
                alt="Document proof inspection"
                className="max-h-[70vh] object-contain rounded-xl"
              />
            </div>
            <div className="text-center">
              <a
                href={inspectDocUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-orange-600 hover:underline inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open original image in new tab
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 0: ORDER & ADVANCE PAYMENT VERIFICATION PANEL (NEW PART 1 & 3) */}
      {/* ========================================================================= */}
      {adminTab === 'orders_verification' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-600" />
                Customer Order Advance Payment Verification
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect Buyer Transaction ID (UTR) and Payment Screenshot before verifying orders for Delivery Partner dispatch.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
              {(
                [
                  { id: 'pending_verification', label: 'Pending Verif' },
                  { id: 'verified', label: 'Active / In-Transit' },
                  { id: 'delivered_by_boy', label: 'Delivered by Driver' },
                  { id: 'delivered', label: 'Delivered Successfully' },
                  { id: 'rejected', label: 'Rejected' },
                  { id: 'all', label: 'All Orders' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setOrderFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    orderFilter === f.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by Order No (ORD-...), Customer Name, Phone, Transaction ID / UTR, Address..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-600">No orders found</div>
              <p className="text-xs text-slate-400 mt-0.5">
                {orderFilter === 'pending_verification'
                  ? 'All customer prepaid advance payments have been verified!'
                  : 'Try selecting a different filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((ord) => {
                const isPendingVerif =
                  ord.payment_status === 'pending_verification' || ord.status === 'pending_verification';

                return (
                  <div
                    key={ord.id}
                    className={`border rounded-2xl p-4 sm:p-5 transition shadow-xs ${
                      isPendingVerif
                        ? 'bg-amber-50/50 border-amber-300/80 ring-2 ring-amber-400/20'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Order & Customer Details */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded-md">
                            {ord.order_number}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                              ord.payment_status === 'verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.payment_status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800 animate-pulse'
                            }`}
                          >
                            Payment: {ord.payment_status || 'pending_verification'}
                          </span>

                          {ord.status === 'success' || (ord.status === 'delivered' && ord.buyer_confirmed) ? (
                            <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3" /> Delivered Successfully
                            </span>
                          ) : ord.status === 'delivered_by_boy' ? (
                            <span className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Delivered by Driver (Awaiting Buyer Confirmation)
                            </span>
                          ) : ord.status === 'out_for_delivery' ? (
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Truck className="w-3 h-3" /> Out for Delivery
                            </span>
                          ) : (
                            <span className="bg-slate-800 text-slate-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Status: {ord.status}
                            </span>
                          )}

                          {ord.fulfillment_type === 'self_pickup' && (
                            <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Self-Pickup
                            </span>
                          )}
                        </div>

                        <div className="font-bold text-slate-900 text-base">
                          {ord.item_description}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-600 pt-1">
                          <div>
                            <span className="font-bold text-slate-800">Customer:</span>{' '}
                            <span>{ord.customer_name}</span> ({ord.customer_phone})
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">Delivery Fare:</span>{' '}
                            <span className="font-mono font-black text-emerald-600">₹{ord.total_fare}</span>{' '}
                            <span className="text-[10px] text-slate-400">
                              (Rider: ₹{ord.partner_earning} / App: ₹{ord.app_commission})
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">Route:</span>{' '}
                            <span className="truncate">{ord.pickup_address} ➔ {ord.delivery_address}</span>
                          </div>
                        </div>

                        {/* Transaction ID & Screenshot */}
                        <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700">Bank UTR / Trans ID:</span>
                            <span className="font-mono font-black text-orange-600 bg-white px-2 py-0.5 rounded border border-slate-200 select-all">
                              {ord.transaction_id || 'Not provided'}
                            </span>
                          </div>

                          {ord.payment_screenshot_url && (
                            <button
                              onClick={() => setInspectDocUrl(ord.payment_screenshot_url || null)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 transition flex items-center gap-1.5 shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-orange-600" />
                              Inspect Payment Screenshot
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right: Verification Buttons */}
                      <div className="flex lg:flex-col items-center justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        {isPendingVerif ? (
                          <>
                            <button
                              onClick={() => onVerifyOrderPayment?.(ord.id, true)}
                              className="flex-1 lg:w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              ✓ Approve & Verify
                            </button>
                            <button
                              onClick={() => onVerifyOrderPayment?.(ord.id, false)}
                              className="flex-1 lg:w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              <XCircle className="w-4 h-4" />
                              ✕ Reject Payment
                            </button>
                          </>
                        ) : (
                          <div className="text-right">
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-xl">
                              ✓ Verified by Admin
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: LISTINGS MODERATION */}
      {/* ========================================================================= */}
      {adminTab === 'listings' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">Marketplace Classifieds Listings</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and approve community posts before they appear on the public feed.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['pending', 'active', 'rejected', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setListingFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                    listingFilter === f
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredListings.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">No requests found</div>
              <p className="text-xs text-slate-400">
                No marketplace post listings match the selected status filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredListings.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-white">
                    <img
                      src={getListingPrimaryImage(item)}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    {getListingImages(item).length > 1 && (
                      <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] font-bold px-1 rounded">
                        {getListingImages(item).length}p
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                        {item.title}
                      </h4>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          item.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.is_featured && (
                        <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded shadow-2xs">
                          ⭐ FEATURED
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-black text-emerald-600">₹{formatPrice(item.price)}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      <span>Seller: {item.seller_name || 'Anonymous'}</span>
                      <span>•</span>
                      <span>{item.location_name || 'Meghalaya'}</span>
                      <span>•</span>
                      <span>Cat: {item.category_name}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onViewListing(item)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition"
                  >
                    View Details
                  </button>
                  {item.status === 'pending' && (
                    <>
                      <button
                        onClick={() => onUpdateListingStatus(item.id, 'active')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => onUpdateListingStatus(item.id, 'rejected')}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition"
                      >
                        ✕ Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SHOPS, CAB/TAXI & DELIVERY FLEET VERIFICATION REQUESTS */}
      {/* ========================================================================= */}
      {adminTab === 'registrations' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header & Sub-Tab Navigation */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-orange-600" />
                <span>Business & Fleet Verification Requests</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Strictly separated directory for Shop Owners, Cab/Taxi Drivers, and Delivery Fleet Riders with Live Wallet & Payout Desk.
              </p>
            </div>

            {/* 3 Distinct Category Tabs + All */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 bg-slate-100 p-1.5 rounded-2xl flex-wrap">
                <button
                  onClick={() => setRegTypeFilter('shops')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    regTypeFilter === 'shops'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>1. Shops ({filteredShops.length})</span>
                  {pendingShopsCount > 0 && (
                    <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                      {pendingShopsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setRegTypeFilter('vehicles')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    regTypeFilter === 'vehicles'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>2. Cab & Taxi ({filteredVehicles.length})</span>
                  {pendingVehiclesCount > 0 && (
                    <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                      {pendingVehiclesCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setRegTypeFilter('delivery_fleet')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    regTypeFilter === 'delivery_fleet'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>3. Delivery Fleet ({filteredDeliveryFleet.length})</span>
                  {pendingDeliveryFleetCount > 0 && (
                    <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                      {pendingDeliveryFleetCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setRegTypeFilter('services')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    regTypeFilter === 'services'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>4. Local Services & Jobs ({filteredServices.length})</span>
                  {pendingServicesCount > 0 && (
                    <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                      {pendingServicesCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setRegTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    regTypeFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({filteredShops.length + filteredVehicles.length + filteredDeliveryFleet.length + filteredServices.length})
                </button>
              </div>
            </div>
          </div>

          {/* Status Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setRegFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition ${
                    regFilter === st
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={regSearch}
                onChange={(e) => setRegSearch(e.target.value)}
                placeholder="Search by name, phone, license, UPI..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Notification Alert for Payout Actions */}
          {payoutSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{payoutSuccessMsg}</span>
              </div>
              <button onClick={() => setPayoutSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 1: SHOPS / SELLERS FLOW */}
          {/* ========================================================================= */}
          {(regTypeFilter === 'all' || regTypeFilter === 'shops') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-orange-100">
                <div className="flex items-center gap-2 text-sm font-black text-orange-950">
                  <Store className="w-4 h-4 text-orange-600" />
                  <span>1. Shops & Sellers Directory ({filteredShops.length})</span>
                </div>
                <span className="text-[11px] font-semibold text-orange-800 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                  Trade License / GSTIN Verified
                </span>
              </div>

              {filteredShops.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No shops found matching the current criteria.
                </div>
              ) : (
                filteredShops.map((shop) => {
                  const targetKey = `shop_${shop.id}`;
                  const balance = getUserWalletBalance(shop.user_id);
                  const isProcessing = processingPayoutKey === targetKey;
                  const shopProfile = profiles.find(
                    (p) => p.id === shop.user_id || (shop.user_phone && p.phone === shop.user_phone)
                  );
                  const isShopApproved =
                    shopProfile?.is_approved_by_admin !== undefined
                      ? Boolean(shopProfile.is_approved_by_admin)
                      : shop.status === 'approved';

                  return (
                    <div
                      key={shop.id}
                      className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:border-slate-300 transition shadow-2xs"
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-700 shrink-0">
                          <Store className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-base">{shop.shop_name}</span>
                            <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {shop.category || 'General Store'}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                shop.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : shop.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {shop.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-600 pt-0.5">
                            <div>
                              <strong className="text-slate-800">Trade Lic / GSTIN ({shop.shop_id_proof_type || 'License'}):</strong>{' '}
                              <span className="font-mono text-orange-700 font-bold">{shop.shop_id_no || 'N/A'}</span>
                            </div>
                            <div>
                              <strong className="text-slate-800">Owner ({shop.owner_id_type || 'Govt ID'}):</strong>{' '}
                              <span>{shop.owner_name}</span> ({shop.user_phone})
                            </div>
                            <div>
                              <strong className="text-slate-800">Address:</strong>{' '}
                              <span>{shop.shop_address || 'Meghalaya'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-slate-800">Payout UPI:</strong>{' '}
                              <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 select-all">
                                {shop.payout_upi_id || 'Not set'}
                              </span>
                              {shop.payout_upi_id && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(shop.payout_upi_id || '');
                                    setCopiedUpi(shop.payout_upi_id || '');
                                    setTimeout(() => setCopiedUpi(null), 2000);
                                  }}
                                  className="text-slate-400 hover:text-emerald-700"
                                  title="Copy UPI"
                                >
                                  {copiedUpi === shop.payout_upi_id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                            <div>
                              <strong className="text-slate-800">Wallet Balance:</strong>{' '}
                              <span className="font-mono font-black text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                                ₹{formatPrice(balance)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Action & Payout Desk */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-200">
                        {/* Inline Payout Field */}
                        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-xs font-bold text-slate-500 pl-1.5">₹</span>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={payoutInputs[targetKey] || ''}
                            onChange={(e) =>
                              setPayoutInputs((prev) => ({ ...prev, [targetKey]: e.target.value }))
                            }
                            className="w-20 text-xs font-mono font-bold bg-transparent text-slate-900 focus:outline-none"
                          />
                          <button
                            disabled={isProcessing}
                            onClick={() =>
                              handleCardPayout(
                                shop.user_id,
                                targetKey,
                                shop.payout_upi_id,
                                'seller',
                                shop.owner_name || shop.shop_name,
                                shop.user_phone
                              )
                            }
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                          >
                            <Send className="w-3 h-3" />
                            {isProcessing ? 'Paying...' : 'Payout'}
                          </button>
                        </div>

                        {shop.owner_id_proof_url && (
                          <button
                            onClick={() => setInspectDocUrl(shop.owner_id_proof_url || null)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-orange-600" />
                            Doc Proof
                          </button>
                        )}

                        {/* Two Action Buttons: "Approve Partner" and "Reject/Suspend" */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={approvalLoadingKey === `${shop.user_id}_true`}
                            onClick={() => {
                              handleTogglePartnerApproval(
                                shop.user_id,
                                shop.shop_name || shop.owner_name || 'Shop Partner',
                                true,
                                shop.user_phone,
                                shop.user_email
                              );
                              if (onApproveShopRegistration) {
                                onApproveShopRegistration(shop.id);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                              isShopApproved
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/50'
                                : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300'
                            } disabled:opacity-50`}
                            title="Approve Partner: Sets is_approved_by_admin = TRUE in Supabase public.profiles"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve Partner</span>
                          </button>

                          <button
                            type="button"
                            disabled={approvalLoadingKey === `${shop.user_id}_false`}
                            onClick={() => {
                              handleTogglePartnerApproval(
                                shop.user_id,
                                shop.shop_name || shop.owner_name || 'Shop Partner',
                                false,
                                shop.user_phone,
                                shop.user_email
                              );
                              if (onRejectShopRegistration) {
                                onRejectShopRegistration(shop.id, 'Declined by Admin');
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                              !isShopApproved
                                ? 'bg-rose-600 text-white ring-2 ring-rose-400/50'
                                : 'bg-rose-50 hover:bg-rose-600 text-rose-800 hover:text-white border border-rose-300'
                            } disabled:opacity-50`}
                            title="Reject / Suspend: Sets is_approved_by_admin = FALSE in Supabase public.profiles"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject/Suspend</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: CAB & TAXI DRIVERS FLOW */}
          {/* ========================================================================= */}
          {(regTypeFilter === 'all' || regTypeFilter === 'vehicles') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-1 border-b border-blue-100">
                <div className="flex items-center gap-2 text-sm font-black text-blue-950">
                  <Car className="w-4 h-4 text-blue-600" />
                  <span>2. Cab & Taxi Drivers Directory ({filteredVehicles.length})</span>
                </div>
                <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  DL & Taxi Route Verified
                </span>
              </div>

              {filteredVehicles.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No cab or taxi driver records found matching criteria.
                </div>
              ) : (
                filteredVehicles.map((veh) => {
                  const targetKey = `veh_${veh.id}`;
                  const balance = getUserWalletBalance(veh.user_id);
                  const isProcessing = processingPayoutKey === targetKey;
                  const vehProfile = profiles.find(
                    (p) => p.id === veh.user_id || (veh.driver_phone && p.phone === veh.driver_phone)
                  );
                  const isVehApproved =
                    vehProfile?.is_approved_by_admin !== undefined
                      ? Boolean(vehProfile.is_approved_by_admin)
                      : veh.status === 'approved';

                  return (
                    <div
                      key={veh.id}
                      className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:border-slate-300 transition shadow-2xs"
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                          <Car className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-base">
                              {veh.vehicle_model || 'Commercial Vehicle'} (
                              {veh.vehicle_reg_no || veh.vehicle_number || 'Registered RC'})
                            </span>
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {veh.vehicle_type || 'Local Taxi'}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                veh.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : veh.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {veh.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-600 pt-0.5">
                            <div>
                              <strong className="text-slate-800">Driver:</strong> <span>{veh.driver_name}</span> (
                              {veh.driver_phone})
                            </div>
                            <div>
                              <strong className="text-slate-800">Driving License:</strong>{' '}
                              <span className="font-mono text-blue-700 font-bold">
                                {veh.driving_license_no || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <strong className="text-slate-800">Operational Route:</strong>{' '}
                              <span>{veh.operational_route || 'All Meghalaya'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-slate-800">Payout UPI:</strong>{' '}
                              <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 select-all">
                                {veh.payout_upi_id || 'Not set'}
                              </span>
                              {veh.payout_upi_id && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(veh.payout_upi_id || '');
                                    setCopiedUpi(veh.payout_upi_id || '');
                                    setTimeout(() => setCopiedUpi(null), 2000);
                                  }}
                                  className="text-slate-400 hover:text-emerald-700"
                                  title="Copy UPI"
                                >
                                  {copiedUpi === veh.payout_upi_id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                            <div>
                              <strong className="text-slate-800">Wallet Balance:</strong>{' '}
                              <span className="font-mono font-black text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                                ₹{formatPrice(balance)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Action & Payout Desk */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-200">
                        {/* Inline Payout Field */}
                        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-xs font-bold text-slate-500 pl-1.5">₹</span>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={payoutInputs[targetKey] || ''}
                            onChange={(e) =>
                              setPayoutInputs((prev) => ({ ...prev, [targetKey]: e.target.value }))
                            }
                            className="w-20 text-xs font-mono font-bold bg-transparent text-slate-900 focus:outline-none"
                          />
                          <button
                            disabled={isProcessing}
                            onClick={() =>
                              handleCardPayout(
                                veh.user_id,
                                targetKey,
                                veh.payout_upi_id,
                                'driver',
                                veh.driver_name,
                                veh.driver_phone
                              )
                            }
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                          >
                            <Send className="w-3 h-3" />
                            {isProcessing ? 'Paying...' : 'Payout'}
                          </button>
                        </div>

                        {veh.driving_license_proof_url && (
                          <button
                            onClick={() => setInspectDocUrl(veh.driving_license_proof_url || null)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            DL Proof
                          </button>
                        )}

                        {/* Two Action Buttons: "Approve Partner" and "Reject/Suspend" */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={approvalLoadingKey === `${veh.user_id}_true`}
                            onClick={() => {
                              handleTogglePartnerApproval(
                                veh.user_id,
                                veh.driver_name || 'Cab Driver Partner',
                                true,
                                veh.driver_phone,
                                veh.driver_email
                              );
                              if (onApproveVehicleRegistration) {
                                onApproveVehicleRegistration(veh.id);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                              isVehApproved
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/50'
                                : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300'
                            } disabled:opacity-50`}
                            title="Approve Partner: Sets is_approved_by_admin = TRUE in Supabase public.profiles"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve Partner</span>
                          </button>

                          <button
                            type="button"
                            disabled={approvalLoadingKey === `${veh.user_id}_false`}
                            onClick={() => {
                              handleTogglePartnerApproval(
                                veh.user_id,
                                veh.driver_name || 'Cab Driver Partner',
                                false,
                                veh.driver_phone,
                                veh.driver_email
                              );
                              if (onRejectVehicleRegistration) {
                                onRejectVehicleRegistration(veh.id, 'Declined by Admin');
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                              !isVehApproved
                                ? 'bg-rose-600 text-white ring-2 ring-rose-400/50'
                                : 'bg-rose-50 hover:bg-rose-600 text-rose-800 hover:text-white border border-rose-300'
                            } disabled:opacity-50`}
                            title="Reject / Suspend: Sets is_approved_by_admin = FALSE in Supabase public.profiles"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject/Suspend</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: DELIVERY BOYS / FLEET FLOW */}
          {/* ========================================================================= */}
          {(regTypeFilter === 'all' || regTypeFilter === 'delivery_fleet') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-1 border-b border-emerald-100">
                <div className="flex items-center gap-2 text-sm font-black text-emerald-950">
                  <Bike className="w-4 h-4 text-emerald-600" />
                  <span>3. Delivery Fleet Riders Directory ({filteredDeliveryFleet.length})</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Delivery Fleet & Payout Active
                </span>
              </div>

              {filteredDeliveryFleet.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No delivery fleet riders found matching criteria.
                </div>
              ) : (
                filteredDeliveryFleet.map((fleet) => {
                  const targetKey = `fleet_${fleet.id}`;
                  const balance = getUserWalletBalance(fleet.user_id);
                  const isProcessing = processingPayoutKey === targetKey;
                  const fleetProfile = profiles.find(
                    (p) => p.id === fleet.user_id || (fleet.phone && p.phone === fleet.phone)
                  );
                  const isFleetApproved =
                    fleetProfile?.is_approved_by_admin !== undefined
                      ? Boolean(fleetProfile.is_approved_by_admin)
                      : fleet.status === 'approved' || !!fleet.is_approved;

                  return (
                    <div
                      key={fleet.id}
                      className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:border-slate-300 transition shadow-2xs"
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                          <Bike className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-base">{fleet.full_name}</span>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Bike className="w-3 h-3" />
                              {fleet.vehicle_type || 'Bike / Scooty'}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                fleet.status === 'approved' || fleet.is_approved
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : fleet.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {fleet.status || 'pending'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-600 pt-0.5">
                            <div>
                              <strong className="text-slate-800">Phone:</strong>{' '}
                              <span className="font-semibold text-slate-900">{fleet.phone || 'N/A'}</span>
                            </div>
                            <div>
                              <strong className="text-slate-800">Vehicle / Bike No:</strong>{' '}
                              <span className="font-mono text-emerald-700 font-bold">{fleet.vehicle_number}</span>
                            </div>
                            <div>
                              <strong className="text-slate-800">DL / Govt ID:</strong>{' '}
                              <span className="font-mono text-slate-700">
                                {fleet.driving_license_no || 'Document On File'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-slate-800">Payout UPI:</strong>{' '}
                              <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 select-all">
                                {fleet.payout_upi || 'Not set'}
                              </span>
                              {fleet.payout_upi && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(fleet.payout_upi);
                                    setCopiedUpi(fleet.payout_upi);
                                    setTimeout(() => setCopiedUpi(null), 2000);
                                  }}
                                  className="text-slate-400 hover:text-emerald-700"
                                  title="Copy UPI"
                                >
                                  {copiedUpi === fleet.payout_upi ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                            <div>
                              <strong className="text-slate-800">Wallet Balance:</strong>{' '}
                              <span className="font-mono font-black text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                                ₹{formatPrice(balance)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Action & Payout Desk */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-200">
                        {/* Inline Payout Field */}
                        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-xs font-bold text-slate-500 pl-1.5">₹</span>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={payoutInputs[targetKey] || ''}
                            onChange={(e) =>
                              setPayoutInputs((prev) => ({ ...prev, [targetKey]: e.target.value }))
                            }
                            className="w-20 text-xs font-mono font-bold bg-transparent text-slate-900 focus:outline-none"
                          />
                          <button
                            disabled={isProcessing}
                            onClick={() =>
                              handleCardPayout(
                                fleet.user_id,
                                targetKey,
                                fleet.payout_upi,
                                'delivery_partner',
                                fleet.full_name,
                                fleet.phone
                              )
                            }
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                          >
                            <Send className="w-3 h-3" />
                            {isProcessing ? 'Paying...' : 'Payout'}
                          </button>
                        </div>

                        {fleet.driving_license_proof_url && (
                          <button
                            onClick={() => setInspectDocUrl(fleet.driving_license_proof_url || null)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            ID Proof
                          </button>
                        )}

                        {/* Two Action Buttons: "Approve Partner" and "Reject/Suspend" */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={approvalLoadingKey === `${fleet.user_id}_true`}
                            onClick={() => {
                              handleTogglePartnerApproval(
                                fleet.user_id,
                                fleet.full_name || 'Delivery Partner',
                                true,
                                fleet.phone
                              );
                              if (onUpdateDeliveryPartner) {
                                onUpdateDeliveryPartner(
                                  fleet.user_id,
                                  true,
                                  'active',
                                  fleet.vehicle_type,
                                  fleet.vehicle_number
                                );
                              }
                              if (fleet.source === 'service_reg' && onApproveServiceRegistration) {
                                onApproveServiceRegistration(fleet.id);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                              isFleetApproved
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/50'
                                : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300'
                            } disabled:opacity-50`}
                            title="Approve Partner: Sets is_approved_by_admin = TRUE in Supabase public.profiles"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve Partner</span>
                          </button>

                          <button
                            type="button"
                            disabled={approvalLoadingKey === `${fleet.user_id}_false`}
                            onClick={() => {
                              handleTogglePartnerApproval(
                                fleet.user_id,
                                fleet.full_name || 'Delivery Partner',
                                false,
                                fleet.phone
                              );
                              if (onUpdateDeliveryPartner) {
                                onUpdateDeliveryPartner(
                                  fleet.user_id,
                                  false,
                                  'rejected',
                                  fleet.vehicle_type,
                                  fleet.vehicle_number
                                );
                              }
                              if (fleet.source === 'service_reg' && onRejectServiceRegistration) {
                                onRejectServiceRegistration(fleet.id, 'Admin verification declined');
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                              !isFleetApproved
                                ? 'bg-rose-600 text-white ring-2 ring-rose-400/50'
                                : 'bg-rose-50 hover:bg-rose-600 text-rose-800 hover:text-white border border-rose-300'
                            } disabled:opacity-50`}
                            title="Reject / Suspend: Sets is_approved_by_admin = FALSE in Supabase public.profiles"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject/Suspend</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 4: LOCAL SERVICES & SKILLED JOB REQUESTS FLOW */}
          {/* ========================================================================= */}
          {(regTypeFilter === 'all' || regTypeFilter === 'services') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-purple-100">
                <div className="flex items-center gap-2 text-sm font-black text-purple-950">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                  <span>4. Local Services & Skilled Job Requests ({filteredServices.length})</span>
                </div>
                <span className="text-[11px] font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  Electrician, Plumber, Mechanic, Driver & Skilled Techs
                </span>
              </div>

              {filteredServices.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No local service or skilled job profiles found matching the current criteria.
                </div>
              ) : (
                filteredServices.map((srv) => {
                  const isApproved = srv.is_approved || srv.status === 'approved';
                  const isRejected = srv.status === 'rejected';
                  const balance = getUserWalletBalance(srv.user_id);
                  const targetKey = `srv_${srv.id}`;
                  const isProcessing = processingPayoutKey === targetKey;
                  const upiId = srv.payout_upi || srv.payout_upi_id || '';

                  return (
                    <div
                      key={srv.id}
                      className={`p-4 rounded-2xl border transition flex flex-col xl:flex-row xl:items-center justify-between gap-4 ${
                        isApproved
                          ? 'bg-purple-50/20 border-purple-200/80'
                          : isRejected
                          ? 'bg-red-50/20 border-red-200/80'
                          : 'bg-white border-slate-200 hover:border-purple-300 shadow-2xs'
                      }`}
                    >
                      {/* Left Info Column */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                          <Wrench className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-base">{srv.full_name}</span>
                            <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Wrench className="w-3 h-3" />
                              {srv.category}
                            </span>
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {srv.experience} Exp
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                isApproved
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isRejected
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-600 pt-0.5">
                            <div>
                              <strong className="text-slate-800">Phone:</strong>{' '}
                              <span className="font-semibold text-slate-900">{srv.phone}</span>
                            </div>
                            <div>
                              <strong className="text-slate-800">Rate / Fees:</strong>{' '}
                              <span className="text-purple-700 font-bold">{srv.hourly_or_daily_rate || '₹500 / Visit'}</span>
                            </div>
                            <div>
                              <strong className="text-slate-800">Location:</strong>{' '}
                              <span className="text-slate-700">
                                {srv.city_locality || `${srv.village || ''}, ${srv.block || ''}, ${srv.district || 'Meghalaya'}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-slate-800">Payout UPI:</strong>{' '}
                              <span className="font-mono text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 select-all">
                                {upiId || 'Not set'}
                              </span>
                              {upiId && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(upiId);
                                    setCopiedUpi(upiId);
                                    setTimeout(() => setCopiedUpi(null), 2000);
                                  }}
                                  className="text-slate-400 hover:text-purple-700"
                                  title="Copy UPI"
                                >
                                  {copiedUpi === upiId ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                            <div>
                              <strong className="text-slate-800">Wallet Balance:</strong>{' '}
                              <span className="font-mono font-black text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                                ₹{formatPrice(balance)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Action & Payout Desk */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-200">
                        {/* Inline Payout Field */}
                        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-xs font-bold text-slate-500 pl-1.5">₹</span>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={payoutInputs[targetKey] || ''}
                            onChange={(e) =>
                              setPayoutInputs((prev) => ({ ...prev, [targetKey]: e.target.value }))
                            }
                            className="w-20 text-xs font-mono font-bold bg-transparent text-slate-900 focus:outline-none"
                          />
                          <button
                            disabled={isProcessing}
                            onClick={() =>
                              handleCardPayout(
                                srv.user_id,
                                targetKey,
                                upiId,
                                'service_provider',
                                srv.full_name,
                                srv.phone
                              )
                            }
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                          >
                            <Send className="w-3 h-3" />
                            {isProcessing ? 'Paying...' : 'Payout'}
                          </button>
                        </div>

                        {srv.identity_proof_url && (
                          <button
                            onClick={() => setInspectDocUrl(srv.identity_proof_url || null)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-purple-600" />
                            ID Proof
                          </button>
                        )}

                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${srv.phone}`}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          {(() => {
                            const rawPhone = (srv.whatsapp || srv.phone || '').replace(/\D/g, '');
                            const formattedPhone = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;
                            return (
                              <a
                                href={`https://wa.me/${formattedPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center gap-1"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            );
                          })()}
                        </div>

                        {!isApproved ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onApproveServiceRegistration?.(srv.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = window.prompt(
                                  'Please enter reason for rejection (optional):',
                                  'Identity proof document unclear or details could not be verified.'
                                );
                                if (reason !== null) {
                                  onRejectServiceRegistration?.(srv.id, reason);
                                }
                              }}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onApproveServiceRegistration?.(srv.id)}
                              className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold"
                            >
                              ✓ Approved
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RECHARGE REQUESTS */}
      {/* ========================================================================= */}
      {adminTab === 'recharges' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">VIP PRO Membership Upgrades</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify customer UTR payments for VIP badge & featured ad boosts.
              </p>
            </div>

            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setRechargeFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                    rechargeFilter === f
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredRecharges.map((req) => (
              <div
                key={req.id}
                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">{req.user_name}</span>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      ({req.user_phone})
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-3">
                    <span>Plan: <strong>{req.plan_name}</strong></span>
                    <span>•</span>
                    <span className="text-emerald-600 font-bold font-mono">₹{req.amount}</span>
                    <span>•</span>
                    <span>UTR: <strong className="font-mono text-orange-600 select-all">{req.utr}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {req.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => onApproveRecharge(req)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept & Activate PRO
                      </button>
                      <button
                        onClick={() => onRejectRecharge(req.id)}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject Request
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onApproveRecharge(req)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                          req.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700'
                        }`}
                      >
                        {req.status === 'approved' ? '✓ PRO Active' : 'Activate PRO'}
                      </button>
                      <button
                        onClick={() => onRejectRecharge(req.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                          req.status === 'rejected'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700'
                        }`}
                      >
                        {req.status === 'rejected' ? '✕ Rejected' : 'Set Rejected'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: USERS & SELLERS ACCOUNTS DIRECTORY */}
      {/* ========================================================================= */}
      {adminTab === 'members' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                <Users className="w-3.5 h-3.5 text-orange-600" /> User Accounts & Balances
              </div>
              <h3 className="text-xl font-black text-slate-900">
                Community Members & Merchants Directory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect registered users, shop sellers, live wallet balances, UPI payout destinations, and adjust user balances or roles.
              </p>
            </div>

            <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl flex-wrap">
              {(
                [
                  { id: 'all', label: `All Accounts (${profiles.length})` },
                  { id: 'users', label: 'Members & Sellers' },
                  { id: 'admins', label: 'Admins' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setUserRoleFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    userRoleFilter === f.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, phone, shop, UPI, email..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="text-xs font-bold text-slate-500">
              Showing {filteredProfiles.length} of {profiles.length} accounts
            </div>
          </div>

          <div className="space-y-4">
            {filteredProfiles.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No accounts match your current filter or search.
              </div>
            ) : (
              filteredProfiles.map((p) => {
                const targetKey = `user_bal_${p.id}`;
                const userBalance = getUserWalletBalance(p.id, p.phone);
                const isAdjusting = adjustingBalanceKey === targetKey;
                const isApproved = !!p.is_approved_by_admin;

                return (
                  <div
                    key={p.id}
                    className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:border-slate-300 transition shadow-2xs"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-base">
                          {p.full_name || 'Anonymous Member'}
                        </span>
                        {p.is_pro && (
                          <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                            <ShieldCheck className="w-3 h-3" /> PRO Member
                          </span>
                        )}
                        {p.shop_name && (
                          <span className="bg-orange-100 text-orange-900 border border-orange-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Store className="w-3 h-3 text-orange-700" /> Shop: {p.shop_name}
                          </span>
                        )}
                        <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          Role: {p.role || 'User'}
                        </span>

                        {/* is_approved_by_admin Badge */}
                        {isApproved ? (
                          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Admin Approved
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending Admin Approval
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5 pt-1">
                        <div>
                          <strong className="text-slate-800">Phone:</strong>{' '}
                          <span className="font-mono font-semibold text-slate-900">{p.phone || 'N/A'}</span>
                        </div>
                        <div>
                          <strong className="text-slate-800">Email:</strong> {p.email || 'N/A'}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-slate-800">Payout UPI:</strong>{' '}
                          <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 select-all">
                            {p.payout_upi_id || 'Not registered'}
                          </span>
                          {p.payout_upi_id && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(p.payout_upi_id || '');
                                setCopiedUpi(p.payout_upi_id || '');
                                setTimeout(() => setCopiedUpi(null), 2000);
                              }}
                              className="text-slate-400 hover:text-emerald-700 cursor-pointer"
                              title="Copy UPI"
                            >
                              {copiedUpi === p.payout_upi_id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Prominent Live Wallet Balance */}
                        <div className="flex items-center gap-1.5 sm:col-span-2 lg:col-span-3 pt-1 border-t border-slate-200/60">
                          <WalletIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                          <strong className="text-slate-900 font-bold">Wallet Balance:</strong>
                          <span className="font-mono font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-lg text-sm shadow-2xs">
                            ₹{formatPrice(userBalance)}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-1">
                            (Live available for instant withdrawal)
                          </span>
                        </div>

                        {p.shop_name && (
                          <div className="sm:col-span-2">
                            <strong className="text-slate-800">Shop:</strong> {p.shop_name} • {p.shop_category || 'General'} • {p.shop_address || p.city_locality || 'Tura'}
                          </div>
                        )}
                        {p.payout_bank_name && (
                          <div className="sm:col-span-2">
                            <strong className="text-slate-800">Bank:</strong> {p.payout_bank_name} • <strong>A/C:</strong>{' '}
                            {p.payout_account_no} • <strong>IFSC:</strong> {p.payout_ifsc_code}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Controls & Wallet Balance Adjustment Desk */}
                    <div className="flex flex-col sm:flex-row xl:flex-col items-stretch sm:items-center xl:items-end gap-2.5 shrink-0 pt-3 xl:pt-0 border-t xl:border-t-0 border-slate-200">
                      {/* Set / Adjust Balance Tool */}
                      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-xs font-bold text-slate-500 pl-1.5">₹</span>
                        <input
                          type="number"
                          placeholder="New Balance"
                          value={balanceInputs[targetKey] || ''}
                          onChange={(e) =>
                            setBalanceInputs((prev) => ({ ...prev, [targetKey]: e.target.value }))
                          }
                          className="w-24 text-xs font-mono font-bold bg-transparent text-slate-900 focus:outline-none"
                        />
                        <button
                          disabled={isAdjusting}
                          onClick={() =>
                            handleAdjustBalance(p.id, targetKey, p.full_name || 'Member')
                          }
                          className="px-2.5 py-1 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Set wallet balance directly in database"
                        >
                          <Banknote className="w-3 h-3 text-amber-400" />
                          {isAdjusting ? 'Saving...' : 'Set Balance'}
                        </button>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Two Action Buttons: "Approve Partner" and "Reject/Suspend" */}
                        <button
                          type="button"
                          disabled={approvalLoadingKey === `${p.id}_true`}
                          onClick={() =>
                            handleTogglePartnerApproval(
                              p.id,
                              p.full_name || 'Member',
                              true,
                              p.phone,
                              p.email
                            )
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs cursor-pointer ${
                            isApproved
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/50'
                              : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300'
                          } disabled:opacity-50`}
                          title="Approve Partner: Sets is_approved_by_admin = TRUE in Supabase public.profiles"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve Partner</span>
                        </button>

                        <button
                          type="button"
                          disabled={approvalLoadingKey === `${p.id}_false`}
                          onClick={() =>
                            handleTogglePartnerApproval(
                              p.id,
                              p.full_name || 'Member',
                              false,
                              p.phone,
                              p.email
                            )
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs cursor-pointer ${
                            !isApproved
                              ? 'bg-rose-600 text-white ring-2 ring-rose-400/50'
                              : 'bg-rose-50 hover:bg-rose-600 text-rose-800 hover:text-white border border-rose-300'
                          } disabled:opacity-50`}
                          title="Reject / Suspend: Sets is_approved_by_admin = FALSE in Supabase public.profiles"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject/Suspend</span>
                        </button>

                        <button
                          onClick={() => onToggleUserPro(p)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            p.is_pro
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-white hover:bg-slate-100 border border-slate-300 text-slate-700'
                          }`}
                        >
                          {p.is_pro ? 'Remove PRO' : 'Grant PRO'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ADMIN CONFIGURATION & QR */}
      {/* ========================================================================= */}
      {adminTab === 'settings' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900">Admin Payment & QR Configuration</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Set the centralized Admin UPI ID and Dynamic QR Code used for customer advance checkout payments & PRO recharges.
            </p>
          </div>

          <form onSubmit={handleSaveAllSettings} className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Central Admin UPI ID *
              </label>
              <input
                type="text"
                required
                value={editUpi}
                onChange={(e) => setEditUpi(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Dynamic UPI Payment QR Code Image URL *
              </label>
              <input
                type="text"
                required
                value={editQr}
                onChange={(e) => setEditQr(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            {/* QR Preview */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4">
              <img
                src={
                  editQr ||
                  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${editUpi}`
                }
                alt="QR Preview"
                className="w-24 h-24 bg-white p-2 rounded-xl border border-slate-200 object-contain"
              />
              <div>
                <div className="text-xs font-bold text-slate-800">Live QR Preview</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Payable to: <span className="font-mono text-orange-600 font-bold">{editUpi}</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-sm transition shadow-sm flex items-center gap-2"
              >
                <SettingsIcon className="w-4 h-4" />
                {savingSettings ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>

          {/* Banner Ads Management Section inside Settings */}
          <div className="pt-8 border-t border-slate-200">
            <AdminBannerAdsManager
              bannerAds={bannerAds}
              onCreateBanner={onCreateBannerAd || (async () => {})}
              onUpdateBanner={onUpdateBannerAd || (async () => {})}
              onDeleteBanner={onDeleteBannerAd || (async () => {})}
              onToggleActive={onToggleBannerAd || (async () => {})}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: DEDICATED BANNER ADS MANAGEMENT */}
      {/* ========================================================================= */}
      {adminTab === 'banner_ads' && (
        <AdminBannerAdsManager
          bannerAds={bannerAds}
          onCreateBanner={onCreateBannerAd || (async () => {})}
          onUpdateBanner={onUpdateBannerAd || (async () => {})}
          onDeleteBanner={onDeleteBannerAd || (async () => {})}
          onToggleActive={onToggleBannerAd || (async () => {})}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 7: LOCAL SERVICES & JOBS VERIFICATION PANEL */}
      {/* ========================================================================= */}
      {adminTab === 'services_jobs' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                <Briefcase className="w-3.5 h-3.5 text-orange-600" /> Admin Verification Panel
              </div>
              <h3 className="text-xl font-black text-slate-900">Local Services & Jobs Verification</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review submitted profiles from technicians, skilled workers, mechanics, and job applicants. Verify identity proof before granting official approval.
              </p>
            </div>

            {/* Quick Status Stats */}
            <div className="flex items-center gap-2">
              <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                <div className="text-[10px] font-bold text-amber-700 uppercase">Pending</div>
                <div className="text-base font-black text-amber-900">{pendingServicesCount}</div>
              </div>
              <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Approved</div>
                <div className="text-base font-black text-emerald-900">
                  {serviceRegistrations.filter((s) => s.is_approved || s.status === 'approved').length}
                </div>
              </div>
              <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <div className="text-[10px] font-bold text-slate-600 uppercase">Total</div>
                <div className="text-base font-black text-slate-900">{serviceRegistrations.length}</div>
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
              <button
                onClick={() => setServiceFilter('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  serviceFilter === 'pending'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Pending Verification ({pendingServicesCount})
              </button>
              <button
                onClick={() => setServiceFilter('approved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  serviceFilter === 'approved'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approved Profiles
              </button>
              <button
                onClick={() => setServiceFilter('rejected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  serviceFilter === 'rejected'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                Rejected
              </button>
              <button
                onClick={() => setServiceFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  serviceFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Submissions ({serviceRegistrations.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, phone, category..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
              {serviceSearch && (
                <button
                  onClick={() => setServiceSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* List of Submissions */}
          {filteredServices.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Briefcase className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-700">No profile submission requests found</p>
              <p className="text-xs text-slate-500">
                {serviceFilter === 'pending'
                  ? 'All local services and job applicants have been reviewed.'
                  : 'Try clearing your search query or switching tabs.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredServices.map((item) => {
                const isApproved = item.is_approved || item.status === 'approved';
                const isRejected = item.status === 'rejected';

                return (
                  <div
                    key={item.id}
                    className={`p-5 sm:p-6 rounded-3xl border transition shadow-2xs ${
                      isApproved
                        ? 'bg-emerald-50/20 border-emerald-200'
                        : isRejected
                        ? 'bg-red-50/20 border-red-200'
                        : 'bg-white border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                      {/* Profile Primary Info */}
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base sm:text-lg font-black text-slate-900">
                            {item.full_name}
                          </h4>

                          {/* Category Badge */}
                          <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200 flex items-center gap-1">
                            <Wrench className="w-3 h-3 text-orange-600" />
                            {item.category}
                          </span>

                          {/* Experience Badge */}
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 flex items-center gap-1">
                            <Award className="w-3 h-3 text-blue-600" />
                            {item.experience} Experience
                          </span>

                          {/* Status Badge */}
                          {isApproved ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Approved Profile
                            </span>
                          ) : isRejected ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-black border border-red-200 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              Rejected
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-300 flex items-center gap-1 animate-pulse">
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              Pending Verification
                            </span>
                          )}
                        </div>

                        {/* Detail Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                          <div>
                            <span className="text-slate-400 font-medium block">Phone / Contact:</span>
                            <span className="font-bold text-slate-800 font-mono">{item.phone}</span>
                          </div>

                          <div>
                            <span className="text-slate-400 font-medium block">Category / Trade:</span>
                            <span className="font-bold text-slate-800">{item.category}</span>
                          </div>

                          <div>
                            <span className="text-slate-400 font-medium block">Total Experience:</span>
                            <span className="font-bold text-slate-800">{item.experience}</span>
                          </div>

                          {item.city_locality && (
                            <div>
                              <span className="text-slate-400 font-medium block">Locality / City:</span>
                              <span className="font-bold text-slate-800 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {item.city_locality}
                              </span>
                            </div>
                          )}

                          {item.service_address && (
                            <div>
                              <span className="text-slate-400 font-medium block">Service Address:</span>
                              <span className="font-bold text-slate-800">{item.service_address}</span>
                            </div>
                          )}

                          {item.hourly_or_daily_rate && (
                            <div>
                              <span className="text-slate-400 font-medium block">Expected Rate:</span>
                              <span className="font-bold text-emerald-700">{item.hourly_or_daily_rate}</span>
                            </div>
                          )}

                          {item.aadhaar_or_voter_no && (
                            <div>
                              <span className="text-slate-400 font-medium block">ID Proof Number:</span>
                              <span className="font-mono font-bold text-slate-800">{item.aadhaar_or_voter_no}</span>
                            </div>
                          )}

                          {item.payout_upi_id && (
                            <div>
                              <span className="text-slate-400 font-medium block">Payout UPI:</span>
                              <span className="font-mono font-bold text-orange-600">{item.payout_upi_id}</span>
                            </div>
                          )}

                          <div>
                            <span className="text-slate-400 font-medium block">Submitted Date:</span>
                            <span className="font-medium text-slate-600">
                              {new Date(item.created_at).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Bio / Skills Description */}
                        {item.bio_skills && (
                          <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                            <span className="font-bold text-slate-700 block mb-0.5">Skills & Profile Bio:</span>
                            <p className="leading-relaxed">{item.bio_skills}</p>
                          </div>
                        )}

                        {/* IDENTITY PROOF DOCUMENT IMAGE FROM SUPABASE STORAGE */}
                        <div className="pt-2">
                          <span className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                            <FileCheck className="w-4 h-4 text-emerald-600" /> Identity Proof Document Image:
                          </span>

                          {item.identity_proof_url ? (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                              <img
                                src={item.identity_proof_url}
                                alt={`Identity Proof - ${item.full_name}`}
                                onClick={() => setInspectDocUrl(item.identity_proof_url || null)}
                                className="w-20 h-16 object-cover rounded-xl border border-slate-300 shadow-xs cursor-pointer hover:opacity-90 transition"
                              />

                              <div className="space-y-1">
                                <a
                                  href={item.identity_proof_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-black text-orange-600 hover:text-orange-700 underline inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  View Identity Proof Document Image (Supabase Storage)
                                </a>
                                <p className="text-[11px] text-slate-500">
                                  Click the text link or image preview to view the full resolution document in a new tab.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                              No identity proof document URL uploaded for this profile.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Control Panel */}
                      <div className="flex lg:flex-col items-center justify-end gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200 shrink-0">
                        {/* Direct Contact Links */}
                        <div className="flex items-center gap-1.5 w-full">
                          <a
                            href={`tel:${item.phone}`}
                            className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call
                          </a>
                          {(() => {
                            const rawPhone = (item.whatsapp || item.phone || '').replace(/\D/g, '');
                            const formattedPhone = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;
                            const waText = encodeURIComponent(
                              `Hello ${item.full_name}, regarding your Local Services & Jobs profile verification on Meri Local Bazaar:`
                            );
                            return (
                              <a
                                href={`https://wa.me/${formattedPhone}?text=${waText}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                              >
                                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                              </a>
                            );
                          })()}
                        </div>

                        {/* Approve Profile Button */}
                        <button
                          type="button"
                          onClick={() => onApproveServiceRegistration?.(item.id)}
                          className={`w-full px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {isApproved ? 'Approved (Click to Re-verify)' : 'Approve Profile'}
                        </button>

                        {/* Reject Profile Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const reason = window.prompt(
                              'Please enter reason for rejection (optional):',
                              'Identity proof document unclear or details could not be verified.'
                            );
                            if (reason !== null) {
                              onRejectServiceRegistration?.(item.id, reason);
                            }
                          }}
                          className={`w-full px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            isRejected
                              ? 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
                              : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                          {isRejected ? 'Rejected (Click to Update)' : 'Reject Profile'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PARTNER WALLET BALANCES & WITHDRAWAL SETTLEMENT HUB */}
      {/* ========================================================================= */}
      {adminTab === 'withdrawals' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Settlement & Partner Balances Hub
              </div>
              <h3 className="text-xl font-black text-slate-900">3. Delivery Partner & Shop Seller Balances & Withdrawals</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Meghalaya ke sabhi Delivery Riders aur Shopkeeper Merchants ka live balance dekhein, balance change/adjust karein, ya withdrawal requests settle karein.
              </p>
            </div>

            {/* Status Statistics */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-center min-w-[105px]">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Riders Balance</div>
                <div className="text-base font-black text-emerald-900">₹{formatPrice(totalRidersBalance)}</div>
              </div>
              <div className="px-3.5 py-2 bg-orange-50 border border-orange-200 rounded-2xl text-center min-w-[105px]">
                <div className="text-[10px] font-bold text-orange-700 uppercase">Shops Balance</div>
                <div className="text-base font-black text-orange-900">₹{formatPrice(totalShopSellersBalance)}</div>
              </div>
              <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-center min-w-[85px]">
                <div className="text-[10px] font-bold text-amber-700 uppercase">Pending Requests</div>
                <div className="text-base font-black text-amber-900">{pendingPayoutsCount}</div>
              </div>
              <div className="px-3.5 py-2 bg-slate-900 text-white rounded-2xl text-center min-w-[110px]">
                <div className="text-[10px] font-bold text-slate-300 uppercase">Total Partner Funds</div>
                <div className="text-base font-black text-emerald-400">₹{formatPrice(totalAllPartnersBalance)}</div>
              </div>
            </div>
          </div>

          {/* Subtabs Selector */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setWithdrawalSubTab('balances')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 ${
                withdrawalSubTab === 'balances'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <WalletIcon className="w-4 h-4 text-emerald-200" />
              <span>💰 Partner Wallet Balances ({allPartnersList.length})</span>
              <span className="bg-emerald-700/80 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                Riders & Shops
              </span>
            </button>

            <button
              type="button"
              onClick={() => setWithdrawalSubTab('requests')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 ${
                withdrawalSubTab === 'requests'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>📥 Withdrawal Requests ({payoutRequests.length})</span>
              {pendingPayoutsCount > 0 && (
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                  {pendingPayoutsCount} Pending
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setWithdrawalSubTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 ${
                withdrawalSubTab === 'history'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>📜 Settlement History & Logs ({payoutLogs.length})</span>
            </button>
          </div>

          {/* Success Banner */}
          {payoutSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-2.5 text-emerald-900 text-xs font-bold animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{payoutSuccessMsg}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUBTAB 1: LIVE PARTNER WALLET BALANCES DIRECTORY */}
          {/* ========================================================================= */}
          {withdrawalSubTab === 'balances' && (
            <div className="space-y-5">
              {/* Partner Category Filters & Search */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setPartnerRoleFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      partnerRoleFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Partners ({allPartnersList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPartnerRoleFilter('riders')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      partnerRoleFilter === 'riders'
                        ? 'bg-white text-emerald-700 shadow-sm font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Bike className="w-3.5 h-3.5 text-emerald-600" />
                    🛵 Delivery Fleet ({allPartnersList.filter((p) => p.category === 'rider').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPartnerRoleFilter('shops')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      partnerRoleFilter === 'shops'
                        ? 'bg-white text-orange-700 shadow-sm font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5 text-orange-600" />
                    🏪 Shop Sellers ({allPartnersList.filter((p) => p.category === 'shop').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPartnerRoleFilter('cabs')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      partnerRoleFilter === 'cabs'
                        ? 'bg-white text-sky-700 shadow-sm font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5 text-sky-600" />
                    🚖 Cab Drivers ({allPartnersList.filter((p) => p.category === 'cab').length})
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search rider, shop, phone, UPI..."
                    value={partnerSearch}
                    onChange={(e) => setPartnerSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {partnerSearch && (
                    <button
                      onClick={() => setPartnerSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Partner Cards Grid */}
              {filteredPartners.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-2">
                  <WalletIcon className="w-10 h-10 text-slate-300 mx-auto" />
                  <div className="text-sm font-bold text-slate-700">No Partners Found</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    No delivery partners or shop sellers match your search or filter.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPartners.map((partner) => {
                    const isRider = partner.category === 'rider';
                    const isShop = partner.category === 'shop';
                    const isCab = partner.category === 'cab';

                    const rawPhone = (partner.phone || '').replace(/\D/g, '');
                    const formattedPhone = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;

                    const isAdjusting = adjustingBalanceKey === partner.targetKey;
                    const isProcessing = processingPayoutKey === partner.targetKey;

                    return (
                      <div
                        key={partner.id}
                        className="bg-white border border-slate-200 rounded-3xl p-5 hover:border-slate-300 transition shadow-xs flex flex-col gap-4"
                      >
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                          {/* Partner Profile Info */}
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-xs ${
                                isRider
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : isShop
                                  ? 'bg-orange-100 text-orange-800 border border-orange-300'
                                  : 'bg-sky-100 text-sky-800 border border-sky-300'
                              }`}
                            >
                              {isRider ? (
                                <Bike className="w-6 h-6" />
                              ) : isShop ? (
                                <Store className="w-6 h-6" />
                              ) : (
                                <Car className="w-6 h-6" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base font-black text-slate-900">{partner.name}</h4>
                                <span
                                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                    isRider
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : isShop
                                      ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                      : 'bg-sky-100 text-sky-800 border border-sky-200'
                                  }`}
                                >
                                  {partner.roleBadge}
                                </span>

                                {partner.isApproved ? (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active Verified
                                  </span>
                                ) : (
                                  <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <XCircle className="w-3 h-3 text-rose-600" /> Rejected / Suspended
                                  </span>
                                )}
                              </div>

                              {/* Registered Email / Gmail ID prominently displayed under the user's name */}
                              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Email:</span>
                                <span className="font-mono text-slate-800 font-semibold text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 select-all">
                                  {partner.email ||
                                    profiles.find((p) => p.id === partner.userId || (partner.phone && p.phone === partner.phone) || (p.full_name && p.full_name.toLowerCase() === partner.name.toLowerCase()))?.email ||
                                    (partner.name.toLowerCase().includes('silgrak') ? 'silgrak1309@gmail.com' : 'No email registered')}
                                </span>
                              </div>

                            <div className="text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                              <div>
                                <strong className="text-slate-800">
                                  {isShop ? 'Shop / Store:' : isRider ? 'Fleet / Vehicle:' : 'Vehicle:'}
                                </strong>{' '}
                                <span className="text-slate-900 font-semibold">{partner.details}</span>
                              </div>

                              {partner.addressOrRoute && (
                                <div className="truncate">
                                  <strong className="text-slate-800">Area:</strong> {partner.addressOrRoute}
                                </div>
                              )}

                              <div className="flex items-center gap-2">
                                <strong className="text-slate-800">Phone:</strong>
                                <span className="font-mono font-bold text-slate-900">{partner.phone || 'N/A'}</span>
                                {partner.phone && (
                                  <a
                                    href={`https://wa.me/${formattedPhone}?text=Hello%20${encodeURIComponent(
                                      partner.name
                                    )},%20Meri%20Local%20Bazaar%20Admin%20here.`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
                                    title="WhatsApp Chat"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <strong className="text-slate-800">Payout UPI:</strong>
                                <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 select-all">
                                  {partner.payoutUpi || 'Not registered'}
                                </span>
                                {partner.payoutUpi && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(partner.payoutUpi);
                                      setCopiedUpi(partner.payoutUpi);
                                      setTimeout(() => setCopiedUpi(null), 2000);
                                    }}
                                    className="text-slate-400 hover:text-emerald-700 cursor-pointer"
                                    title="Copy UPI"
                                  >
                                    {copiedUpi === partner.payoutUpi ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Middle: Prominent Wallet Balance Card */}
                        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-2 border-emerald-500/30 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[190px] text-center shadow-xs">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                            <WalletIcon className="w-3.5 h-3.5 text-emerald-600" />
                            Current Wallet Balance
                          </div>
                          <div className="text-2xl font-black text-emerald-700 mt-0.5">
                            ₹{formatPrice(partner.balance)}
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 mt-1 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                            Available for Payout
                          </div>
                        </div>

                        {/* Right: Actions (Adjust Balance + Direct Payout) */}
                        <div className="flex flex-col gap-2 min-w-[240px]">
                          {/* Set/Adjust Balance Box */}
                          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 space-y-1.5">
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                              <span>Set / Adjust Balance</span>
                              <span className="text-slate-400 font-normal">Change wallet</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                placeholder={`e.g. ${partner.balance + 500}`}
                                value={balanceInputs[partner.targetKey] || ''}
                                onChange={(e) =>
                                  setBalanceInputs((prev) => ({
                                    ...prev,
                                    [partner.targetKey]: e.target.value,
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                              />
                              <button
                                type="button"
                                disabled={isAdjusting}
                                onClick={() =>
                                  handleAdjustBalance(partner.userId, partner.targetKey, partner.name)
                                }
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition shrink-0 cursor-pointer disabled:opacity-50"
                              >
                                {isAdjusting ? 'Saving...' : 'Set Bal'}
                              </button>
                            </div>
                          </div>

                          {/* Instant Payout Box */}
                          <div className="bg-emerald-50/60 p-2.5 rounded-2xl border border-emerald-200/80 space-y-1.5">
                            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center justify-between">
                              <span>Instant Direct Payout</span>
                              <span className="text-emerald-600 font-bold">Transfer & Deduct</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                placeholder="Amount ₹"
                                value={payoutInputs[partner.targetKey] || ''}
                                onChange={(e) =>
                                  setPayoutInputs((prev) => ({
                                    ...prev,
                                    [partner.targetKey]: e.target.value,
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                              />
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() =>
                                  handleCardPayout(
                                    partner.userId,
                                    partner.targetKey,
                                    partner.payoutUpi,
                                    partner.roleBadge,
                                    partner.name,
                                    partner.phone
                                  )
                                }
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              >
                                {isProcessing ? 'Paying...' : 'Send ₹'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dedicated Partner Approval Action Bar: "Approve Partner" & "Reject/Suspend" */}
                      <div className="w-full pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                            Partner Verification:
                          </span>
                          {partner.isApproved ? (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Approved (is_approved_by_admin: TRUE)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-rose-700 bg-rose-50 border border-rose-300 px-2.5 py-0.5 rounded-lg">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              Rejected / Suspended (is_approved_by_admin: FALSE)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={approvalLoadingKey === `${partner.userId}_true`}
                            onClick={() =>
                              handleTogglePartnerApproval(
                                partner.userId,
                                partner.name,
                                true,
                                partner.phone,
                                partner.email
                              )
                            }
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                              partner.isApproved
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/50'
                                : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300'
                            } disabled:opacity-50`}
                            title="Set is_approved_by_admin = TRUE in Supabase public.profiles"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve Partner</span>
                          </button>

                          <button
                            type="button"
                            disabled={approvalLoadingKey === `${partner.userId}_false`}
                            onClick={() =>
                              handleTogglePartnerApproval(
                                partner.userId,
                                partner.name,
                                false,
                                partner.phone,
                                partner.email
                              )
                            }
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                              !partner.isApproved
                                ? 'bg-rose-600 text-white ring-2 ring-rose-400/50'
                                : 'bg-rose-50 hover:bg-rose-600 text-rose-800 hover:text-white border border-rose-300'
                            } disabled:opacity-50`}
                            title="Set is_approved_by_admin = FALSE in Supabase public.profiles"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject/Suspend</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUBTAB 2: WITHDRAWAL REQUESTS */}
          {/* ========================================================================= */}
          {withdrawalSubTab === 'requests' && (
            <div className="space-y-6">
              {/* Filters & Search Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {/* Status Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
                  <button
                    onClick={() => setPayoutFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                      payoutFilter === 'pending'
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Pending ({pendingPayoutsCount})
                  </button>
              <button
                onClick={() => setPayoutFilter('completed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  payoutFilter === 'completed'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed
              </button>
              <button
                onClick={() => setPayoutFilter('rejected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  payoutFilter === 'rejected'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                Rejected
              </button>
              <button
                onClick={() => setPayoutFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  payoutFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Requests ({payoutRequests.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search rider, phone, UPI..."
                value={payoutSearch}
                onChange={(e) => setPayoutSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
              {payoutSearch && (
                <button
                  onClick={() => setPayoutSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* List of Payout Requests */}
          {filteredPayouts.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-2">
              <DollarSign className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">No Payout Requests Found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {payoutSearch
                  ? 'No withdrawal requests match your search filter.'
                  : `There are currently no ${payoutFilter !== 'all' ? payoutFilter : ''} payout requests in the database.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayouts.map((req) => {
                const isPending = req.status === 'pending';
                const isCompleted = req.status === 'completed';
                const isRejected = req.status === 'rejected';

                const rawPhone = (req.user_phone || '').replace(/\D/g, '');
                const formattedPhone = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;

                return (
                  <div
                    key={req.id}
                    className={`p-5 rounded-3xl border transition ${
                      isPending
                        ? 'bg-amber-50/40 border-amber-200 shadow-sm'
                        : isCompleted
                        ? 'bg-emerald-50/20 border-emerald-200'
                        : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      {/* Left: Driver / Merchant Info & Amount */}
                      <div className="space-y-3 flex-1">
                        <div className="flex items-start justify-between sm:justify-start sm:items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm">
                            {req.user_name ? req.user_name.charAt(0).toUpperCase() : 'U'}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-base font-black text-slate-900">{req.user_name || 'Driver / Merchant'}</h4>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                                {req.user_role || 'Delivery Partner'}
                              </span>

                              {/* Status Badge */}
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  isPending
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                    : isCompleted
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-red-100 text-red-800 border border-red-300'
                                }`}
                              >
                                {req.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                              <span className="flex items-center gap-1 font-medium text-slate-700">
                                <Phone className="w-3 h-3 text-slate-400" /> {req.user_phone}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {new Date(req.created_at).toLocaleString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span className="flex items-center gap-1 bg-emerald-100/80 text-emerald-800 font-bold px-2.5 py-0.5 rounded-lg text-xs border border-emerald-200">
                                <WalletIcon className="w-3.5 h-3.5 text-emerald-600" /> Current Wallet: ₹{formatPrice(getUserWalletBalance(req.user_id, req.user_phone))}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Amount & Destination Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {/* Requested Amount Card */}
                          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Withdrawal Amount
                              </div>
                              <div className="text-xl font-black text-emerald-600">
                                ₹{formatPrice(req.amount)}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                              Direct Payout
                            </span>
                          </div>

                          {/* Bank / UPI Destination Card */}
                          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Payout UPI ID
                              </span>
                              {req.upi_id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(req.upi_id);
                                    setCopiedUpi(req.id);
                                    setTimeout(() => setCopiedUpi(null), 2000);
                                  }}
                                  className="text-[10px] font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  {copiedUpi === req.id ? 'Copied!' : 'Copy UPI'}
                                </button>
                              )}
                            </div>

                            <div className="font-mono text-xs font-bold text-slate-900 truncate">
                              {req.upi_id || 'No UPI Specified'}
                            </div>

                            {req.bank_name && (
                              <div className="text-[11px] text-slate-600 pt-0.5 border-t border-slate-100 flex items-center gap-1">
                                <span className="font-semibold text-slate-700">{req.bank_name}</span>
                                {req.account_no && <span className="text-slate-400">• A/C: {req.account_no}</span>}
                                {req.ifsc_code && <span className="text-slate-400">• IFSC: {req.ifsc_code}</span>}
                              </div>
                            )}
                          </div>
                        </div>

                        {req.admin_notes && (
                          <div className="text-xs text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                            <span className="font-bold text-slate-800">Admin Note:</span> {req.admin_notes}
                          </div>
                        )}
                      </div>

                      {/* Right: Direct Actions */}
                      <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 justify-center">
                        {/* Instant UPI Payment Trigger */}
                        {req.upi_id && isPending && (
                          <a
                            href={`upi://pay?pa=${req.upi_id}&pn=${encodeURIComponent(
                              req.user_name || 'Partner'
                            )}&am=${req.amount}&cu=INR`}
                            className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <QrCode className="w-3.5 h-3.5 text-amber-400" /> Open UPI App & Pay
                          </a>
                        )}

                        {/* WhatsApp & Call Contact Controls */}
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${req.user_phone}`}
                            className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call
                          </a>

                          <a
                            href={`https://wa.me/${formattedPhone}?text=${encodeURIComponent(
                              `Hello ${req.user_name}, regarding your withdrawal payout request of ₹${formatPrice(
                                req.amount
                              )} on Meri Local Bazaar:`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        </div>

                        {/* Direct Action Buttons: Approve Payout & Reject Payout */}
                        {isPending ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onApprovePayout?.(req.id)}
                              className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98 cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Approve Payout
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const reason = window.prompt(
                                  'Please enter reason for rejecting this payout (optional):',
                                  'Incorrect UPI details or account verification required.'
                                );
                                if (reason !== null) {
                                  onRejectPayout?.(req.id, reason);
                                }
                              }}
                              className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" /> Reject Payout
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onApprovePayout?.(req.id)}
                              className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-slate-100 hover:bg-emerald-50 text-slate-600'
                              }`}
                            >
                              {isCompleted ? '✓ Settled' : 'Set Approved'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onRejectPayout?.(req.id, 'Re-flagged by admin')}
                              className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                                isRejected
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : 'bg-slate-100 hover:bg-red-50 text-slate-600'
                              }`}
                            >
                              {isRejected ? '✕ Rejected' : 'Set Rejected'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

          {/* ========================================================================= */}
          {/* SUBTAB 3: SETTLEMENT HISTORY & LOGS */}
          {/* ========================================================================= */}
          {withdrawalSubTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Past Completed Payouts ({payoutLogs.length})
                </h4>
                <span className="text-xs font-bold text-slate-500">
                  Total Settled: ₹{formatPrice(payoutLogs.reduce((sum, l) => sum + (Number(l.amount) || 0), 0))}
                </span>
              </div>

              {payoutLogs.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="text-xs font-bold text-slate-600">No Payout Logs Yet</div>
                  <p className="text-[11px] text-slate-400">
                    When you settle a withdrawal or send a direct payout, records will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payoutLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{log.user_name || 'Partner'}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {log.role || 'Partner'}
                          </span>
                          <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {log.status || 'PAID'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                          {log.user_phone && <span>Phone: {log.user_phone}</span>}
                          {log.payout_upi && <span>UPI: <strong className="font-mono text-slate-700">{log.payout_upi}</strong></span>}
                          {log.transaction_id && <span>UTR: <strong className="font-mono text-slate-700">{log.transaction_id}</strong></span>}
                          <span>
                            {new Date(log.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-black text-emerald-700">
                          ₹{formatPrice(log.amount)}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 justify-end">
                          <Check className="w-3 h-3" /> Transferred
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
