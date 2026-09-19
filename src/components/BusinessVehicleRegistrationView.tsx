import React, { useState, useEffect } from 'react';
import {
  Store,
  Car,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  Sparkles,
  MapPin,
  Phone,
  User,
  AlertCircle,
  Eye,
  PlusCircle,
  Truck,
  FileCheck,
  CreditCard,
  QrCode,
  Building,
  Briefcase,
  Wrench,
  Award,
  Bike,
  Wallet,
  ArrowRight,
  Send,
  X,
  Copy,
  Check,
} from 'lucide-react';
import {
  ShopRegistration,
  VehicleRegistration,
  ServiceRegistration,
  UserProfile,
  Wallet as WalletType,
  PayoutRequest,
  formatPrice,
} from '../types';
import { supabase } from '../lib/supabase';
import { LocalAddressSelector, LocalAddressState } from './LocalAddressSelector';

interface BusinessVehicleRegistrationViewProps {
  currentUser: UserProfile;
  shopRegistrations: ShopRegistration[];
  vehicleRegistrations: VehicleRegistration[];
  serviceRegistrations?: ServiceRegistration[];
  wallets?: WalletType[];
  payoutRequests?: PayoutRequest[];
  onSubmitShop: (data: Omit<ShopRegistration, 'id' | 'created_at' | 'status'>) => void;
  onSubmitVehicle: (data: Omit<VehicleRegistration, 'id' | 'created_at' | 'status'>) => void;
  onSubmitService?: (data: Omit<ServiceRegistration, 'id' | 'created_at' | 'status' | 'is_approved'>) => void;
  onSubmitDeliveryPartner?: (data: {
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
    payoutUpiId: string;
    payoutBankName?: string;
    payoutAccountNo?: string;
    payoutIfscCode?: string;
    payoutQrImageUrl?: string;
  }) => Promise<void> | void;
  onRequestPayout?: (data: {
    amount: number;
    upi_id: string;
    bank_name?: string;
    account_no?: string;
    ifsc_code?: string;
    user_role: string;
  }) => Promise<void> | void;
  onNavigateToDeliveryDashboard?: () => void;
}

const SHOP_CATEGORIES = [
  'Grocery & Daily Needs',
  'Electronics & Mobile Store',
  'Clothing & Fashion Boutique',
  'Pharmacy & Healthcare',
  'Hardware & Construction',
  'Restaurant & Fast Food',
  'Automobile Repair & Spare Parts',
  'Agriculture & Nursery',
  'Services & Printing Press',
  'Other Business / Retail',
];

const VEHICLE_TYPES = [
  'Local Cab / Taxi',
  'Traveler (12-26 Seater)',
  'Auto Rickshaw',
  'Commercial Bike',
  'Pickup / Commercial Van',
];

const SERVICE_CATEGORIES = [
  'Electrician & Home Wiring',
  'Plumber & Water Pump Repair',
  'Carpenter & Woodwork',
  'AC, Refrigerator & Appliance Repair',
  'Automobile Mechanic (2-Wheeler / 4-Wheeler)',
  'Masonry, Tiles & Construction',
  'Painter & Wall Treatment',
  'Computer, Laptop & CCTV Tech',
  'House & Office Cleaning',
  'Tailoring & Garments',
  'Cook / Chef & Catering Service',
  'Professional Driver / Chauffeur',
  'Welding & Fabrication',
  'Gardener & Agriculture Labor',
  'Other Skilled Local Service',
];

const EXPERIENCE_OPTIONS = [
  'Fresher / 1 Year',
  '2-3 Years Experience',
  '4-5 Years Experience',
  '6-10 Years Experience',
  '10+ Years Expert Professional',
];

export const BusinessVehicleRegistrationView: React.FC<BusinessVehicleRegistrationViewProps> = ({
  currentUser,
  shopRegistrations,
  vehicleRegistrations,
  serviceRegistrations = [],
  wallets = [],
  payoutRequests = [],
  onSubmitShop,
  onSubmitVehicle,
  onSubmitService,
  onSubmitDeliveryPartner,
  onRequestPayout,
  onNavigateToDeliveryDashboard,
}) => {
  const [activeTab, setActiveTab] = useState<
    'shop' | 'vehicle' | 'delivery_boy' | 'services_jobs' | 'my_status'
  >('shop');
  const [submittedSuccess, setSubmittedSuccess] = useState<string | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutUpi, setPayoutUpi] = useState(currentUser?.payout_upi_id || '');
  const [payoutBankName, setPayoutBankName] = useState(currentUser?.payout_bank_name || '');
  const [payoutAccountNo, setPayoutAccountNo] = useState(currentUser?.payout_account_no || '');
  const [payoutIfsc, setPayoutIfsc] = useState(currentUser?.payout_ifsc_code || '');
  const [copiedUpi, setCopiedUpi] = useState<string | null>(null);

  // 1. Shop Form State
  const [shopName, setShopName] = useState('');
  const [shopCategory, setShopCategory] = useState(SHOP_CATEGORIES[0]);
  const [shopIdType, setShopIdType] = useState('Trade License');
  const [shopIdNo, setShopIdNo] = useState('');
  const [ownerName, setOwnerName] = useState(currentUser?.full_name || '');
  const [ownerIdType, setOwnerIdType] = useState('Aadhaar Card');
  const [ownerIdNo, setOwnerIdNo] = useState('');
  const [ownerIdProofUrl, setOwnerIdProofUrl] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [cityLocality, setCityLocality] = useState(currentUser?.city || 'Tura, Meghalaya');
  const [shopLocation, setShopLocation] = useState<LocalAddressState>({
    state: currentUser?.state || 'Meghalaya',
    district: currentUser?.district || 'West Garo Hills',
    block: currentUser?.block || 'Rongram',
    village: currentUser?.village || '',
  });
  const [userPhone, setUserPhone] = useState(currentUser?.phone || '');
  const [shopBannerUrl, setShopBannerUrl] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [openingHours, setOpeningHours] = useState('9:00 AM - 8:00 PM');
  const [shopPayoutUpi, setShopPayoutUpi] = useState(currentUser?.payout_upi_id || '');
  const [shopBankName, setShopBankName] = useState(currentUser?.payout_bank_name || '');
  const [shopAccountNo, setShopAccountNo] = useState(currentUser?.payout_account_no || '');
  const [shopIfscCode, setShopIfscCode] = useState(currentUser?.payout_ifsc_code || '');
  const [shopQrUrl, setShopQrUrl] = useState(currentUser?.payout_qr_image_url || '');

  // 2. Cab / Taxi Vehicle Form State
  const [driverName, setDriverName] = useState(currentUser?.full_name || '');
  const [driverPhone, setDriverPhone] = useState(currentUser?.phone || '');
  const [driverWhatsapp, setDriverWhatsapp] = useState(currentUser?.phone || '');
  const [vehLocation, setVehLocation] = useState<LocalAddressState>({
    state: currentUser?.state || 'Meghalaya',
    district: currentUser?.district || 'West Garo Hills',
    block: currentUser?.block || 'Rongram',
    village: currentUser?.village || '',
  });
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES[0]);
  const [vehicleRegNo, setVehicleRegNo] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('2023');
  const [drivingLicenseNo, setDrivingLicenseNo] = useState('');
  const [dlProofUrl, setDlProofUrl] = useState('');
  const [vehicleRcNo, setVehicleRcNo] = useState('');
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('');
  const [operationalRoute, setOperationalRoute] = useState('Tura to Guwahati / Local Tura');
  const [dailyRate, setDailyRate] = useState('');
  const [vehPayoutUpi, setVehPayoutUpi] = useState(currentUser?.payout_upi_id || '');
  const [vehBankName, setVehBankName] = useState(currentUser?.payout_bank_name || '');
  const [vehAccountNo, setVehAccountNo] = useState(currentUser?.payout_account_no || '');
  const [vehIfscCode, setVehIfscCode] = useState(currentUser?.payout_ifsc_code || '');
  const [vehQrUrl, setVehQrUrl] = useState(currentUser?.payout_qr_image_url || '');

  // 3. Delivery Boy / Rider Form State
  const [dbFullName, setDbFullName] = useState(currentUser?.full_name || '');
  const [dbPhone, setDbPhone] = useState(currentUser?.phone || '');
  const [dbVehicleType, setDbVehicleType] = useState<'Bike' | 'Scooty' | 'Auto' | 'Commercial Auto'>('Bike');
  const [dbVehicleNumber, setDbVehicleNumber] = useState(currentUser?.vehicle_number || '');
  const [dbDlNo, setDbDlNo] = useState(currentUser?.driving_license_no || currentUser?.driving_license || '');
  const [dbDlProofUrl, setDbDlProofUrl] = useState(currentUser?.driving_license_proof_url || '');
  const [dbRcNo, setDbRcNo] = useState(currentUser?.vehicle_rc_no || '');
  const [dbLocation, setDbLocation] = useState<LocalAddressState>({
    state: currentUser?.state || 'Meghalaya',
    district: currentUser?.district || 'West Garo Hills',
    block: currentUser?.block || 'Rongram',
    village: currentUser?.village || '',
  });
  const [dbPayoutUpi, setDbPayoutUpi] = useState(currentUser?.payout_upi_id || '');
  const [dbBankName, setDbBankName] = useState(currentUser?.payout_bank_name || '');
  const [dbAccountNo, setDbAccountNo] = useState(currentUser?.payout_account_no || '');
  const [dbIfscCode, setDbIfscCode] = useState(currentUser?.payout_ifsc_code || '');
  const [dbQrUrl, setDbQrUrl] = useState(currentUser?.payout_qr_image_url || '');

  // 4. Local Services & Jobs State
  const [srvFullName, setSrvFullName] = useState(currentUser?.full_name || '');
  const [srvPhone, setSrvPhone] = useState(currentUser?.phone || '');
  const [srvWhatsapp, setSrvWhatsapp] = useState(currentUser?.phone || '');
  const [srvLocation, setSrvLocation] = useState<LocalAddressState>({
    state: currentUser?.state || 'Meghalaya',
    district: currentUser?.district || 'West Garo Hills',
    block: currentUser?.block || 'Rongram',
    village: currentUser?.village || '',
  });
  const [srvCategory, setSrvCategory] = useState(SERVICE_CATEGORIES[0]);
  const [srvExperience, setSrvExperience] = useState(EXPERIENCE_OPTIONS[1]);
  const [srvIdProofUrl, setSrvIdProofUrl] = useState('');
  const [srvIdNo, setSrvIdNo] = useState('');
  const [srvAddress, setSrvAddress] = useState('');
  const [srvLocality, setSrvLocality] = useState(currentUser?.city || 'Tura, Meghalaya');
  const [srvRate, setSrvRate] = useState('₹500 / Visit');
  const [srvPayoutUpi, setSrvPayoutUpi] = useState(currentUser?.payout_upi_id || '');
  const [srvBio, setSrvBio] = useState('');

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser?.full_name) {
      if (!ownerName) setOwnerName(currentUser.full_name);
      if (!driverName) setDriverName(currentUser.full_name);
      if (!dbFullName) setDbFullName(currentUser.full_name);
      if (!srvFullName) setSrvFullName(currentUser.full_name);
    }
    if (currentUser?.phone) {
      if (!userPhone) setUserPhone(currentUser.phone);
      if (!driverPhone) setDriverPhone(currentUser.phone);
      if (!driverWhatsapp) setDriverWhatsapp(currentUser.phone);
      if (!dbPhone) setDbPhone(currentUser.phone);
      if (!srvPhone) setSrvPhone(currentUser.phone);
      if (!srvWhatsapp) setSrvWhatsapp(currentUser.phone);
    }
    if (currentUser?.payout_upi_id) {
      if (!shopPayoutUpi) setShopPayoutUpi(currentUser.payout_upi_id);
      if (!vehPayoutUpi) setVehPayoutUpi(currentUser.payout_upi_id);
      if (!dbPayoutUpi) setDbPayoutUpi(currentUser.payout_upi_id);
      if (!srvPayoutUpi) setSrvPayoutUpi(currentUser.payout_upi_id);
      if (!payoutUpi) setPayoutUpi(currentUser.payout_upi_id);
    }
  }, [currentUser]);

  // User's own registrations
  const myShops = shopRegistrations.filter(
    (s) => s.user_id === currentUser?.id || s.user_phone === currentUser?.phone
  );
  const myVehicles = vehicleRegistrations.filter(
    (v) => v.user_id === currentUser?.id || v.driver_phone === currentUser?.phone
  );
  const myServices = serviceRegistrations.filter(
    (s) => s.user_id === currentUser?.id || s.phone === currentUser?.phone
  );
  const myDeliveryPartnerActive = currentUser?.is_delivery_partner || false;

  // Active User Wallet Balance - Real-time Supabase Synchronized
  const myWallet = wallets.find((w) => w.user_id === currentUser?.id);
  const [profileBalance, setProfileBalance] = useState<number>(() => {
    return typeof currentUser?.wallet_balance === 'number'
      ? Number(currentUser.wallet_balance)
      : (myWallet ? Number(myWallet.balance) || 0 : (currentUser?.id === 'usr_me1' ? 2300 : 0));
  });

  useEffect(() => {
    if (typeof currentUser?.wallet_balance === 'number') {
      setProfileBalance(Number(currentUser.wallet_balance));
    }
  }, [currentUser?.wallet_balance]);

  useEffect(() => {
    if (!supabase || !currentUser) return;
    const client = supabase;
    let isMounted = true;

    const fetchLiveBalance = async () => {
      try {
        const { data } = await client
          .from('profiles')
          .select('id, email, phone, wallet_balance');

        if (data && data.length > 0 && isMounted) {
          const matched = data.find((p: any) =>
            (currentUser.id && p.id === currentUser.id) ||
            (currentUser.email && p.email && p.email.toLowerCase() === currentUser.email.toLowerCase()) ||
            (currentUser.phone && p.phone && p.phone === currentUser.phone)
          );
          if (matched && typeof matched.wallet_balance === 'number') {
            setProfileBalance(Number(matched.wallet_balance));
          }
        }
      } catch (err) {
        console.warn('Registration view profile balance fetch error:', err);
      }
    };

    fetchLiveBalance();

    const channel = client
      .channel(`biz-wallet-realtime-${currentUser.id || 'current'}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: currentUser.id ? `id=eq.${currentUser.id}` : undefined,
        },
        (payload: any) => {
          const newRow = payload?.new;
          if (newRow && isMounted) {
            const isMatch =
              newRow.id === currentUser.id ||
              (currentUser.email && newRow.email && newRow.email.toLowerCase() === currentUser.email.toLowerCase()) ||
              (currentUser.phone && newRow.phone && newRow.phone === currentUser.phone);

            if (isMatch && typeof newRow.wallet_balance === 'number') {
              setProfileBalance(Number(newRow.wallet_balance));
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      client.removeChannel(channel);
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.phone]);

  const myWalletBalance = profileBalance;
  const myPayouts = payoutRequests.filter(
    (p) => p.user_id === currentUser?.id || p.driver_id === currentUser?.id
  );

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. Submit Shop Form
  const handleSubmitShopForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !shopIdNo.trim() || !ownerIdNo.trim() || !userPhone.trim()) {
      alert('Please fill in Shop Name, Shop ID / License No, Owner ID No, and Contact Phone.');
      return;
    }
    if (!shopPayoutUpi.trim() || !shopPayoutUpi.includes('@')) {
      alert('Please enter a valid Shop Payout UPI ID (e.g. yourshop@oksbi).');
      return;
    }

    onSubmitShop({
      user_id: currentUser?.id || 'usr_anonymous',
      user_name: ownerName || currentUser?.full_name || 'Shop Owner',
      user_phone: userPhone,
      user_email: currentUser?.email,
      shop_name: shopName,
      category: shopCategory,
      state: shopLocation.state,
      district: shopLocation.district,
      block: shopLocation.block,
      village: shopLocation.village,
      shop_id_proof_type: shopIdType,
      shop_id_no: shopIdNo,
      owner_name: ownerName,
      owner_id_type: ownerIdType,
      owner_id_no: ownerIdNo,
      owner_id_proof_url:
        ownerIdProofUrl ||
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
      shop_address: shopAddress,
      city_locality: cityLocality || `${shopLocation.village}, ${shopLocation.block}, ${shopLocation.district}`,
      shop_banner_url:
        shopBannerUrl ||
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
      description: shopDescription,
      opening_hours: openingHours,
      payout_upi_id: shopPayoutUpi.trim(),
      payout_bank_name: shopBankName.trim() || undefined,
      payout_account_no: shopAccountNo.trim() || undefined,
      payout_ifsc_code: shopIfscCode.trim().toUpperCase() || undefined,
      payout_qr_image_url: shopQrUrl || undefined,
    });

    setSubmittedSuccess('Shop registration request submitted! Admin will verify and approve.');
    setActiveTab('my_status');
    setTimeout(() => setSubmittedSuccess(null), 5000);
  };

  // 2. Submit Cab & Taxi Form
  const handleSubmitVehicleForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleRegNo.trim() || !drivingLicenseNo.trim() || !driverPhone.trim() || !vehicleModel.trim()) {
      alert('Please fill in Vehicle Registration No, Driving License No, Vehicle Model, and Driver Phone.');
      return;
    }
    if (!vehPayoutUpi.trim() || !vehPayoutUpi.includes('@')) {
      alert('Please enter a valid Driver Payout UPI ID (e.g. driver@oksbi).');
      return;
    }

    onSubmitVehicle({
      user_id: currentUser?.id || 'usr_anonymous',
      driver_name: driverName || currentUser?.full_name || 'Driver / Owner',
      driver_phone: driverPhone,
      driver_whatsapp: driverWhatsapp || driverPhone,
      driver_email: currentUser?.email,
      state: vehLocation.state,
      district: vehLocation.district,
      block: vehLocation.block,
      village: vehLocation.village,
      vehicle_type: vehicleType,
      vehicle_reg_no: vehicleRegNo.toUpperCase(),
      vehicle_model: vehicleModel,
      vehicle_year: vehicleYear,
      driving_license_no: drivingLicenseNo.toUpperCase(),
      driving_license_proof_url:
        dlProofUrl ||
        'https://images.unsplash.com/photo-1633265486064-086b219458ec?w=600&auto=format&fit=crop&q=80',
      vehicle_rc_no: vehicleRcNo.toUpperCase(),
      vehicle_photo_url:
        vehiclePhotoUrl ||
        'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&auto=format&fit=crop&q=80',
      operational_route: operationalRoute,
      daily_rate_or_fare: dailyRate,
      payout_upi_id: vehPayoutUpi.trim(),
      payout_bank_name: vehBankName.trim() || undefined,
      payout_account_no: vehAccountNo.trim() || undefined,
      payout_ifsc_code: vehIfscCode.trim().toUpperCase() || undefined,
      payout_qr_image_url: vehQrUrl || undefined,
    });

    setSubmittedSuccess('Cab & Taxi registration request submitted! Admin will verify license & RC for approval.');
    setActiveTab('my_status');
    setTimeout(() => setSubmittedSuccess(null), 5000);
  };

  // 3. Submit Delivery Boy / Rider Form
  const handleSubmitDeliveryBoyForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbFullName.trim() || !dbPhone.trim() || !dbVehicleNumber.trim()) {
      alert('Please fill in Full Name, Phone, and Vehicle Number (Bike/Scooty/Auto).');
      return;
    }
    if (!dbPayoutUpi.trim() || !dbPayoutUpi.includes('@')) {
      alert('Please enter a valid Payout UPI ID (e.g. rider@oksbi) to receive delivery payouts.');
      return;
    }

    if (onSubmitDeliveryPartner) {
      await onSubmitDeliveryPartner({
        fullName: dbFullName.trim(),
        phone: dbPhone.trim(),
        vehicleType: dbVehicleType,
        vehicleNumber: dbVehicleNumber.trim().toUpperCase(),
        state: dbLocation.state,
        district: dbLocation.district,
        block: dbLocation.block,
        village: dbLocation.village,
        drivingLicenseNo: dbDlNo.trim().toUpperCase() || undefined,
        drivingLicenseProofUrl: dbDlProofUrl || undefined,
        vehicleRcNo: dbRcNo.trim().toUpperCase() || undefined,
        payoutUpiId: dbPayoutUpi.trim(),
        payoutBankName: dbBankName.trim() || undefined,
        payoutAccountNo: dbAccountNo.trim() || undefined,
        payoutIfscCode: dbIfscCode.trim().toUpperCase() || undefined,
        payoutQrImageUrl: dbQrUrl || undefined,
      });
    }

    setSubmittedSuccess('Delivery Partner registration submitted successfully! Admin will verify and activate your rider dashboard.');
    setActiveTab('my_status');
    setTimeout(() => setSubmittedSuccess(null), 5000);
  };

  // 4. Submit Local Services & Skilled Jobs Form
  const handleSubmitServiceForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvFullName.trim() || !srvPhone.trim() || !srvCategory.trim()) {
      alert('Please fill in Full Name, Phone, and Category.');
      return;
    }

    if (onSubmitService) {
      onSubmitService({
        user_id: currentUser?.id || 'usr_anonymous',
        full_name: srvFullName.trim(),
        phone: srvPhone.trim(),
        whatsapp: srvWhatsapp.trim() || srvPhone.trim(),
        category: srvCategory,
        experience: srvExperience,
        state: srvLocation.state,
        district: srvLocation.district,
        block: srvLocation.block,
        village: srvLocation.village,
        identity_proof_url:
          srvIdProofUrl ||
          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
        aadhaar_or_voter_no: srvIdNo.trim() || undefined,
        service_address: srvAddress.trim() || undefined,
        city_locality: srvLocality.trim() || `${srvLocation.village}, ${srvLocation.block}, ${srvLocation.district}`,
        payout_upi_id: srvPayoutUpi.trim() || undefined,
        bio_skills: srvBio.trim() || undefined,
        hourly_or_daily_rate: srvRate.trim() || undefined,
      });
    }

    setSubmittedSuccess('Local Services & Jobs profile submitted! Admin will verify identity proof.');
    setActiveTab('my_status');
    setTimeout(() => setSubmittedSuccess(null), 5000);
  };

  // Handle Request Payout Submission
  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payoutAmount);
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid withdrawal amount.');
      return;
    }
    if (amountNum > myWalletBalance) {
      alert(`Withdrawal amount cannot exceed your available balance of ₹${formatPrice(myWalletBalance)}`);
      return;
    }
    if (!payoutUpi.trim() || !payoutUpi.includes('@')) {
      alert('Please enter a valid Payout UPI ID.');
      return;
    }

    if (onRequestPayout) {
      await onRequestPayout({
        amount: amountNum,
        upi_id: payoutUpi.trim(),
        bank_name: payoutBankName.trim() || undefined,
        account_no: payoutAccountNo.trim() || undefined,
        ifsc_code: payoutIfsc.trim().toUpperCase() || undefined,
        user_role: currentUser?.role || 'Partner',
      });
    }

    setShowPayoutModal(false);
    setPayoutAmount('');
    setSubmittedSuccess(`Withdrawal request of ₹${formatPrice(amountNum)} submitted to Admin!`);
    setTimeout(() => setSubmittedSuccess(null), 5000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold mb-3 border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" /> Official Business & Fleet Verification Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Partner Registration & Verification
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
              Register your local shop, taxi, cab, tempo traveler, delivery bike fleet, or skilled services. Instant verification and direct UPI payouts!
            </p>
          </div>

          {/* Quick Tab Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700/60 self-start md:self-center">
            <button
              onClick={() => setActiveTab('shop')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'shop'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Store className="w-4 h-4" /> 1. Shop / Seller
            </button>
            <button
              onClick={() => setActiveTab('vehicle')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'vehicle'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Car className="w-4 h-4" /> 2. Cab & Taxi
            </button>
            <button
              onClick={() => setActiveTab('delivery_boy')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'delivery_boy'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Bike className="w-4 h-4" /> 3. Delivery Boy
            </button>
            <button
              onClick={() => setActiveTab('services_jobs')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'services_jobs'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" /> 4. Local Services & Jobs
            </button>
            <button
              onClick={() => setActiveTab('my_status')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'my_status'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileCheck className="w-4 h-4" /> 5. Status & Wallet
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {submittedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-5 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{submittedSuccess}</span>
          </div>
          <button onClick={() => setSubmittedSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SHOP / SELLER REGISTRATION */}
      {/* ========================================================================= */}
      {activeTab === 'shop' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Store className="w-5 h-5 text-orange-600" />
              1. Local Shop & Seller Registration Form
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Verify your physical shop or business in Meghalaya to get a verified badge and sell online.
            </p>
          </div>

          <form onSubmit={handleSubmitShopForm} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Shop Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Shop / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sangma Grocery & Supermarket"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Shop Category */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Business Category *
                </label>
                <select
                  value={shopCategory}
                  onChange={(e) => setShopCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                >
                  {SHOP_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shop ID Proof Type & Number */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Shop ID Type *
                </label>
                <select
                  value={shopIdType}
                  onChange={(e) => setShopIdType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="Trade License">Trade License (Municipal / District)</option>
                  <option value="GSTIN Registration">GSTIN Registration</option>
                  <option value="Shop & Establishment Act">Shop & Establishment Act</option>
                  <option value="FSSAI Food License">FSSAI Food License</option>
                  <option value="Udyam / MSME Certificate">Udyam / MSME Certificate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Shop License / Reg Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TR-2024-88492"
                  value={shopIdNo}
                  onChange={(e) => setShopIdNo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Owner Name & Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Shop Owner Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Silgrik M. Sangma"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Owner Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9862012345"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Owner Personal ID */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Owner ID Type *
                </label>
                <select
                  value={ownerIdType}
                  onChange={(e) => setOwnerIdType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="Voter ID Card">Voter ID Card</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Driving License">Driving License</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Owner ID Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 8492 1029 3847"
                  value={ownerIdNo}
                  onChange={(e) => setOwnerIdNo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>

            {/* Shop Local Location (State, District, Block, Village) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-600" /> Shop Location Hierarchy (Meghalaya District & Block) *
              </h3>
              <LocalAddressSelector
                idPrefix="shop_reg"
                values={shopLocation}
                onChange={(field, val) =>
                  setShopLocation((prev) => ({ ...prev, [field]: val }))
                }
                theme="light"
                required={true}
              />
            </div>

            {/* Shop Address Details */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Shop Detailed Address / Landmark *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Main Super Market, Ringrey Road, Near SBI Branch"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            {/* Settlement UPI ID */}
            <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-3">
              <h3 className="text-xs font-extrabold text-orange-950 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-orange-600" /> Shop Payout & Settlement UPI ID *
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Payout UPI ID (Instant Bank Settlement) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. myshop@oksbi"
                    value={shopPayoutUpi}
                    onChange={(e) => setShopPayoutUpi(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Bank Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. State Bank of India"
                    value={shopBankName}
                    onChange={(e) => setShopBankName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* ID Proof Upload */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-orange-600" /> Trade License / Owner ID Photo *
                </span>
                {ownerIdProofUrl && (
                  <span className="text-[10px] text-emerald-600 font-bold">Uploaded ✓</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, setOwnerIdProofUrl)}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
              />
              {ownerIdProofUrl && (
                <img
                  src={ownerIdProofUrl}
                  alt="Proof Preview"
                  className="w-full h-32 object-cover rounded-xl border border-slate-200"
                />
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Submit Shop for Admin Verification
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CAB, TAXI & TRAVELER REGISTRATION */}
      {/* ========================================================================= */}
      {activeTab === 'vehicle' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              2. Cab, Taxi & Tempo Traveler Registration Form
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Register commercial passenger vehicles for local & outstation routes across Meghalaya with 0% commission.
            </p>
          </div>

          <form onSubmit={handleSubmitVehicleForm} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Vehicle Type */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Vehicle Category *
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Model */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Vehicle Model Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maruti Suzuki Swift Dzire / Force Traveller"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Vehicle Registration (RC) Number */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Vehicle RC / Number Plate *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ML-08-C-1234"
                  value={vehicleRegNo}
                  onChange={(e) => setVehicleRegNo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Driving License Number */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Driving License (DL) Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ML08 20180004921"
                  value={drivingLicenseNo}
                  onChange={(e) => setDrivingLicenseNo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Driver Name & Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Driver / Owner Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tengrik Sangma"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Driver Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9862012345"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Operational Route */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Primary Route / Operation Area *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tura to Guwahati / Tura to Shillong / Local Tura"
                  value={operationalRoute}
                  onChange={(e) => setOperationalRoute(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Daily Fare / Estimated Rate */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Typical Fare / Daily Rate
                </label>
                <input
                  type="text"
                  placeholder="e.g. ₹500/seat or ₹3,500 Full Reserve"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Vehicle Location Hierarchy */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Driver Base Location (Meghalaya District & Block) *
              </h3>
              <LocalAddressSelector
                idPrefix="veh_reg"
                values={vehLocation}
                onChange={(field, val) =>
                  setVehLocation((prev) => ({ ...prev, [field]: val }))
                }
                theme="light"
                required={true}
              />
            </div>

            {/* Driver Settlement UPI ID */}
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3">
              <h3 className="text-xs font-extrabold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-blue-600" /> Driver Payout & Settlement UPI ID *
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Driver Payout UPI ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. driver@oksbi"
                    value={vehPayoutUpi}
                    onChange={(e) => setVehPayoutUpi(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Bank Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Meghalaya Rural Bank"
                    value={vehBankName}
                    onChange={(e) => setVehBankName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* DL Proof Photo Upload */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" /> Driving License (DL) / Commercial Permit Photo *
                </span>
                {dlProofUrl && (
                  <span className="text-[10px] text-emerald-600 font-bold">Uploaded ✓</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, setDlProofUrl)}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
              />
              {dlProofUrl && (
                <img
                  src={dlProofUrl}
                  alt="DL Proof Preview"
                  className="w-full h-32 object-cover rounded-xl border border-slate-200"
                />
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Submit Vehicle for Admin Verification
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DELIVERY BOY / RIDER REGISTRATION */}
      {/* ========================================================================= */}
      {activeTab === 'delivery_boy' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Bike className="w-5 h-5 text-emerald-600" />
              3. Delivery Boy / Rider Fleet Registration Form
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Join the Meri Local Bazaar delivery fleet with your bike, scooty, or auto. Earn per-delivery and withdraw earnings instantly via UPI!
            </p>
          </div>

          <form onSubmit={handleSubmitDeliveryBoyForm} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Rider Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sengbat R. Marak"
                  value={dbFullName}
                  onChange={(e) => setDbFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Mobile Number (Calling & WhatsApp) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9862012345"
                  value={dbPhone}
                  onChange={(e) => setDbPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Delivery Vehicle Type *
                </label>
                <select
                  value={dbVehicleType}
                  onChange={(e) => setDbVehicleType(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="Bike">Motorcycle / Bike</option>
                  <option value="Scooty">Scooter / Scooty</option>
                  <option value="Auto">Passenger Auto</option>
                  <option value="Commercial Auto">Commercial Cargo Auto</option>
                </select>
              </div>

              {/* Vehicle Number */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Vehicle Number Plate *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ML-08-A-5678"
                  value={dbVehicleNumber}
                  onChange={(e) => setDbVehicleNumber(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Driving License Number */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Driving License (DL) Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. ML08 20210009876"
                  value={dbDlNo}
                  onChange={(e) => setDbDlNo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Vehicle RC Number */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Vehicle RC Book / Smart Card No
                </label>
                <input
                  type="text"
                  placeholder="e.g. RC-ML08-88492"
                  value={dbRcNo}
                  onChange={(e) => setDbRcNo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Local Location Hierarchy */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Operating Location (Meghalaya District & Block) *
              </h3>
              <LocalAddressSelector
                idPrefix="db_reg"
                values={dbLocation}
                onChange={(field, val) =>
                  setDbLocation((prev) => ({ ...prev, [field]: val }))
                }
                theme="light"
                required={true}
              />
            </div>

            {/* Settlement UPI ID */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
              <h3 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-600" /> Delivery Payout UPI ID (Required for Instant Earnings) *
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Your Personal Payout UPI ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. sengbat@oksbi or 9862012345@paytm"
                    value={dbPayoutUpi}
                    onChange={(e) => setDbPayoutUpi(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Har delivery ka payment seedhe isi UPI ID me settle hoga.</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Bank Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. State Bank of India / HDFC"
                    value={dbBankName}
                    onChange={(e) => setDbBankName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* DL / ID Proof Upload */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" /> Driving License / Aadhaar Photo Upload
                </span>
                {dbDlProofUrl && (
                  <span className="text-[10px] text-emerald-600 font-bold">Uploaded ✓</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, setDbDlProofUrl)}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200"
              />
              {dbDlProofUrl && (
                <img
                  src={dbDlProofUrl}
                  alt="DL Proof Preview"
                  className="w-full h-32 object-cover rounded-xl border border-slate-200"
                />
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Submit Delivery Boy Registration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LOCAL SERVICES & SKILLED JOB REQUESTS */}
      {/* ========================================================================= */}
      {activeTab === 'services_jobs' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-600" />
              4. Local Services & Skilled Jobs Provider Registration
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Join as a verified electrician, plumber, mechanic, technician, driver, or skilled worker on Meri Local Bazaar.
            </p>
          </div>

          <form onSubmit={handleSubmitServiceForm} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sangma"
                  value={srvFullName}
                  onChange={(e) => setSrvFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Service Category */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Service / Skill Category *
                </label>
                <select
                  value={srvCategory}
                  onChange={(e) => setSrvCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                >
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Primary Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={srvPhone}
                  onChange={(e) => setSrvPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* WhatsApp Number */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  WhatsApp Contact Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={srvWhatsapp}
                  onChange={(e) => setSrvWhatsapp(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Experience */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Years of Experience *
                </label>
                <select
                  value={srvExperience}
                  onChange={(e) => setSrvExperience(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                >
                  {EXPERIENCE_OPTIONS.map((exp) => (
                    <option key={exp} value={exp}>
                      {exp}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expected Rate / Fees */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Estimated Rate / Visiting Charge
                </label>
                <input
                  type="text"
                  placeholder="e.g. ₹350 / Visit or ₹500 / Day"
                  value={srvRate}
                  onChange={(e) => setSrvRate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* City / Locality */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Town / Service Hub *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tura, Meghalaya"
                  value={srvLocality}
                  onChange={(e) => setSrvLocality(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Service Address */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Workshop / Residence Address Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Ringrey Bridge, Main Road"
                  value={srvAddress}
                  onChange={(e) => setSrvAddress(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Aadhaar / Voter ID Number */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Aadhaar / Voter ID Number (For Verification)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5489 1234 5678"
                  value={srvIdNo}
                  onChange={(e) => setSrvIdNo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Payout UPI */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Personal Payout UPI ID (For Direct Payments)
                </label>
                <input
                  type="text"
                  placeholder="e.g. rahul@oksbi"
                  value={srvPayoutUpi}
                  onChange={(e) => setSrvPayoutUpi(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>

            {/* Service Location Hierarchy */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-600" /> Service Location Hierarchy (Meghalaya District & Block) *
              </h3>
              <LocalAddressSelector
                idPrefix="service_reg"
                values={srvLocation}
                onChange={(field, val) =>
                  setSrvLocation((prev) => ({ ...prev, [field]: val }))
                }
                theme="light"
                required={true}
              />
            </div>

            {/* Bio / Skills Description */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Skills, Qualifications & Bio
              </label>
              <textarea
                rows={3}
                placeholder="Describe your expertise, past projects, tools you own, and availability..."
                value={srvBio}
                onChange={(e) => setSrvBio(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            {/* Identity Proof Upload */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-600" /> Identity Proof Document Photo (Aadhaar / Voter ID / Trade Card) *
                </span>
                {srvIdProofUrl && (
                  <span className="text-[10px] text-emerald-600 font-bold">Uploaded ✓</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, setSrvIdProofUrl)}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
              />
              {srvIdProofUrl && (
                <img
                  src={srvIdProofUrl}
                  alt="Identity Proof Preview"
                  className="w-full h-32 object-cover rounded-xl border border-slate-200"
                />
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Submit Profile for Admin Verification
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MY SUBMISSIONS STATUS & WITHDRAWABLE WALLET */}
      {/* ========================================================================= */}
      {activeTab === 'my_status' && (
        <div className="space-y-6">
          {/* Wallet Balance & Instant Payout Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 inline-flex items-center gap-1.5 mb-2">
                  <Wallet className="w-3.5 h-3.5" /> Partner Earnings Wallet
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Total Withdrawable Balance
                </h3>
                <div className="text-3xl sm:text-4xl font-black text-emerald-400 mt-2 font-mono">
                  ₹{formatPrice(myWalletBalance)}
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Settled directly to your UPI ID (<span className="text-emerald-300 font-mono font-bold">{currentUser?.payout_upi_id || 'Not configured'}</span>)
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  onClick={() => setShowPayoutModal(true)}
                  disabled={myWalletBalance <= 0}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black rounded-2xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Send className="w-4 h-4" /> Request Payout / Withdraw
                </button>
                {myDeliveryPartnerActive && onNavigateToDeliveryDashboard && (
                  <button
                    onClick={onNavigateToDeliveryDashboard}
                    className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl transition border border-white/20 flex items-center justify-center gap-1.5"
                  >
                    <Bike className="w-4 h-4 text-emerald-400" /> Open Delivery Dashboard
                  </button>
                )}
              </div>
            </div>

            {/* Payout Requests History for Current User */}
            {myPayouts.length > 0 && (
              <div className="pt-4 border-t border-slate-700/80 space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Recent Withdrawal Requests ({myPayouts.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {myPayouts.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">₹{formatPrice(p.amount)}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.upi_id}</div>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          p.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : p.status === 'rejected'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submissions Status Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              My Registered Businesses, Fleet & Profiles Status
            </h2>
            <p className="text-xs text-slate-500">
              Track the live admin approval status of all your submitted shops, taxis, delivery boy profiles, and skilled jobs.
            </p>

            {myShops.length === 0 && myVehicles.length === 0 && myServices.length === 0 && !myDeliveryPartnerActive ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl">
                <Store className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">No applications submitted yet</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Use the registration tabs above to submit your shop, cab/taxi, delivery boy profile, or local service.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Shop Submissions */}
                {myShops.map((shop) => (
                  <div
                    key={shop.id}
                    className="p-4 border rounded-2xl bg-orange-50/30 border-orange-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{shop.shop_name}</span>
                        <span className="text-[10px] font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                          1. Shop / Seller
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {shop.category} • License: {shop.shop_id_no} • Payout UPI: {shop.payout_upi_id || 'N/A'}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                        shop.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : shop.status === 'rejected'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {shop.status}
                    </span>
                  </div>
                ))}

                {/* 2. Vehicle Submissions */}
                {myVehicles.map((veh) => (
                  <div
                    key={veh.id}
                    className="p-4 border rounded-2xl bg-blue-50/30 border-blue-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {veh.vehicle_model} ({veh.vehicle_reg_no})
                        </span>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          2. Cab & Taxi
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Route: {veh.operational_route} • DL: {veh.driving_license_no} • Payout UPI: {veh.payout_upi_id || 'N/A'}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                        veh.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : veh.status === 'rejected'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {veh.status}
                    </span>
                  </div>
                ))}

                {/* 3. Delivery Partner Profile */}
                {myDeliveryPartnerActive && (
                  <div className="p-4 border rounded-2xl bg-emerald-50/30 border-emerald-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {currentUser.full_name || 'Delivery Partner'} ({currentUser.vehicle_type || 'Bike'} - {currentUser.vehicle_number || 'Registered'})
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          3. Delivery Boy Fleet
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Status: {currentUser.partner_status || 'Active'} • Payout UPI: {currentUser.payout_upi_id || 'Configured'}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                        currentUser.partner_status === 'active' || currentUser.is_approved_by_admin
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : currentUser.partner_status === 'rejected'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {currentUser.partner_status || 'Pending'}
                    </span>
                  </div>
                )}

                {/* 4. Service Registrations */}
                {myServices.map((srv) => {
                  const isApproved = srv.is_approved || srv.status === 'approved';
                  const isRejected = srv.status === 'rejected';

                  return (
                    <div
                      key={srv.id}
                      className="p-4 border rounded-2xl bg-purple-50/30 border-purple-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{srv.full_name}</span>
                          <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                            4. Local Services & Jobs
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {srv.category} • Experience: {srv.experience} • Locality: {srv.city_locality || 'Local'} • Payout UPI: {srv.payout_upi || srv.payout_upi_id || 'N/A'}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : isRejected
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: REQUEST PAYOUT / WITHDRAWAL */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">Request Wallet Withdrawal</h3>
              </div>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-emerald-800 font-bold">Withdrawable Balance:</span>
                <div className="text-lg font-black text-emerald-700 font-mono">
                  ₹{formatPrice(myWalletBalance)}
                </div>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-1 rounded-lg">
                Direct UPI Transfer
              </span>
            </div>

            <form onSubmit={handlePayoutSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Withdrawal Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={myWalletBalance}
                  placeholder={`Max ₹${myWalletBalance}`}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination UPI ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. yourname@oksbi"
                  value={payoutUpi}
                  onChange={(e) => setPayoutUpi(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="SBI / HDFC"
                    value={payoutBankName}
                    onChange={(e) => setPayoutBankName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Account No</label>
                  <input
                    type="text"
                    placeholder="A/C No"
                    value={payoutAccountNo}
                    onChange={(e) => setPayoutAccountNo(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" /> Submit Withdrawal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
