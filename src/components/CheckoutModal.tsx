import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  QrCode,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Store,
  Upload,
  CreditCard,
  Lock,
  Info,
  ArrowRight,
  Sparkles,
  FileText,
  ExternalLink,
  MapPin,
  Navigation,
} from 'lucide-react';
import {
  Listing,
  UserProfile,
  DeliveryOrder,
  PolicyType,
  calculateDeliveryFare,
  isHeavyItemCategory,
  isVehicleCategory,
  formatPrice,
  getListingPrimaryImage,
} from '../types';
import { uploadListingImageToStorage } from '../lib/storage';
import { supabase } from '../lib/supabase';
import {
  geocodeAddress,
  calculateHaversineDistanceKm,
  calculateDynamicDeliveryFee,
  getListingVendorCoordinates,
  getUserBuyerCoordinates,
} from '../lib/deliveryCalculation';
import { UpiIntentButtons } from './UpiIntentButtons';
import { PolicyModal } from './PolicyModal';
import { LocalAddressSelector, LocalAddressState } from './LocalAddressSelector';
import { formatFullAddress } from '../lib/meghalayaLocations';
import { sendPushNotification, sendOrderAlertToPartner } from '../lib/notifications';

interface CheckoutModalProps {
  listing: Listing;
  currentUser: UserProfile;
  adminUpiId?: string;
  adminQrUrl?: string;
  onClose: () => void;
  onSubmitOrder?: (orderData: Omit<DeliveryOrder, 'id' | 'created_at'>) => Promise<void> | void;
  onOrderPlaced?: (newOrder: DeliveryOrder) => Promise<void> | void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  listing,
  currentUser,
  adminUpiId = 'merilocalbazaar@oksbi',
  adminQrUrl,
  onClose,
  onSubmitOrder,
  onOrderPlaced,
}) => {
  const isVehicle = isVehicleCategory(listing.category_name, listing.title);
  const isHeavy = isHeavyItemCategory(listing.category_name, listing.title) || listing.is_heavy_item || isVehicle;

  // Fulfillment: Forced to 'self_pickup' if vehicle or heavy, otherwise user can select 'home_delivery' or 'self_pickup'
  const [fulfillmentType, setFulfillmentType] = useState<'home_delivery' | 'self_pickup'>(
    isHeavy ? 'self_pickup' : 'home_delivery'
  );

  // Buyer information
  const [buyerName, setBuyerName] = useState(currentUser?.full_name || '');
  const [buyerPhone, setBuyerPhone] = useState(currentUser?.phone || '');
  const [buyerEmail, setBuyerEmail] = useState(currentUser?.email || '');
  
  // Local Location Fields (State, District, Block, Village/Locality)
  const [locationState, setLocationState] = useState<LocalAddressState>({
    state: currentUser?.state || '',
    district: currentUser?.district || '',
    block: currentUser?.block || '',
    village: currentUser?.village || '',
  });

  const [deliveryAddress, setDeliveryAddress] = useState(
    currentUser?.permanent_address || currentUser?.city || ''
  );
  const [landmarkNotes, setLandmarkNotes] = useState('');

  // Mandatory Policy Acceptance Checkbox (CRITICAL: Default must be unchecked = false)
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [selectedPolicyType, setSelectedPolicyType] = useState<PolicyType>('terms_conditions');

  // Delivery estimation for home delivery
  const [weightKg, setWeightKg] = useState<number>(() => {
    const rawWeight = Number(listing?.weight);
    if (Number.isFinite(rawWeight) && rawWeight > 0) {
      return Number((rawWeight / 1000).toFixed(2));
    }
    return 1;
  });
  const [distanceKm, setDistanceKm] = useState<number>(5);
  const [terrain, setTerrain] = useState<'Plain' | 'Hill (5km/L)'>('Hill (5km/L)');

  // Geocoded Coordinates & Permanent Address Saving State
  const [buyerLatitude, setBuyerLatitude] = useState<number | undefined>(() => {
    const lat = Number(currentUser?.buyer_latitude);
    return Number.isFinite(lat) && lat !== 0 ? lat : undefined;
  });
  const [buyerLongitude, setBuyerLongitude] = useState<number | undefined>(() => {
    const lon = Number(currentUser?.buyer_longitude);
    return Number.isFinite(lon) && lon !== 0 ? lon : undefined;
  });
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressSavedSuccess, setAddressSavedSuccess] = useState(false);
  const [geocodingNotice, setGeocodingNotice] = useState<string | null>(null);

  // Vendor coordinates from listing
  const vendorCoords = getListingVendorCoordinates(listing);
  const sellerLat = vendorCoords.latitude;
  const sellerLng = vendorCoords.longitude;

  // Initialize and synchronise coordinates on mount or when address/listing changes
  useEffect(() => {
    const sLat = Number(sellerLat);
    const sLng = Number(sellerLng);

    if (currentUser?.buyer_latitude && currentUser?.buyer_longitude) {
      const bLat = Number(currentUser.buyer_latitude);
      const bLng = Number(currentUser.buyer_longitude);

      setBuyerLatitude(bLat);
      setBuyerLongitude(bLng);

      const calculatedDist = calculateHaversineDistanceKm(bLat, bLng, sLat, sLng);
      
      if (!isNaN(calculatedDist)) {
        setDistanceKm(calculatedDist);
      }
      
    } else if (deliveryAddress) {
      geocodeAddress(deliveryAddress, {
        district: locationState?.district || currentUser?.district,
        block: locationState?.block || currentUser?.block,
        state: locationState?.state || currentUser?.state || 'India',
      })
      .then((coords) => {
        if (coords && coords.latitude && coords.longitude) {
          const cLat = Number(coords.latitude);
          const cLng = Number(coords.longitude);

          setBuyerLatitude(cLat);
          setBuyerLongitude(cLng);

          const calculatedDist = calculateHaversineDistanceKm(cLat, cLng, sLat, sLng);
          
          if (!isNaN(calculatedDist)) {
            setDistanceKm(calculatedDist);
          }
        }
      })
      .catch((error) => {
        console.error("Geocoding error:", error);
      });
    }
  }, [currentUser?.id, listing?.id, deliveryAddress, locationState, sellerLat, sellerLng]);

  // Permanent delivery address submission handler with geocoding and Supabase profile mutation
  const handleSavePermanentAddress = async (explicitAddress?: string) => {
    const addrToSave = (explicitAddress !== undefined ? explicitAddress : deliveryAddress).trim();
    if (!addrToSave) {
      setErrorMsg('Please enter a delivery address first.');
      return null;
    }
    if (!currentUser?.id) {
      setErrorMsg('Please sign in to update your permanent delivery address.');
      return null;
    }

    setIsSavingAddress(true);
    setGeocodingNotice('Geocoding address coordinates...');
    try {
      // 1. Trigger geocoding operation to parse address into numerical buyer_latitude & buyer_longitude
      const parsedCoords = await geocodeAddress(addrToSave, {
        district: locationState.district,
        block: locationState.block,
        state: locationState.state,
      });

      const validLat = Number.isFinite(parsedCoords?.latitude) ? parsedCoords.latitude : 25.5141;
      const validLon = Number.isFinite(parsedCoords?.longitude) ? parsedCoords.longitude : 90.2033;

      setBuyerLatitude(validLat);
      setBuyerLongitude(validLon);

      // Recompute dynamic distance with 0.5 km boundary floor
      const newDistance = calculateHaversineDistanceKm(
        validLat,
        validLon,
        vendorCoords.latitude,
        vendorCoords.longitude
      );
      setDistanceKm(Number.isFinite(newDistance) && newDistance > 0 ? newDistance : 0.5);

      // 2. Execute Supabase mutation query to update the corresponding active profile entry in the database
      if (supabase && currentUser.id !== 'guest_user') {
        const { error: supError } = await supabase
          .from('profiles')
          .update({
            permanent_address: addrToSave,
            buyer_latitude: validLat,
            buyer_longitude: validLon,
            state: locationState.state,
            district: locationState.district,
            block: locationState.block,
            village: locationState.village,
          })
          .eq('id', currentUser.id);

        if (supError) {
          console.warn('[CheckoutModal] Supabase permanent address update warning:', supError);
        }
      }

      // 3. Update in-memory user and localStorage cache
      currentUser.permanent_address = addrToSave;
      currentUser.buyer_latitude = validLat;
      currentUser.buyer_longitude = validLon;
      currentUser.state = locationState.state;
      currentUser.district = locationState.district;
      currentUser.block = locationState.block;
      currentUser.village = locationState.village;

      try {
        localStorage.setItem('mlb_active_user', JSON.stringify(currentUser));
      } catch (_) {}

      setAddressSavedSuccess(true);
      setGeocodingNotice(
        `Geocoded: Lat ${validLat.toFixed(4)}, Lon ${validLon.toFixed(4)}`
      );
      setTimeout(() => {
        setAddressSavedSuccess(false);
        setGeocodingNotice(null);
      }, 4000);

      return { latitude: validLat, longitude: validLon };
    } catch (err: any) {
      console.error('[CheckoutModal] Failed to geocode and save address:', err);
      setGeocodingNotice('Geocoding fallback applied');
      return null;
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Advance Payment Verification Inputs
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderSubmittedSuccess, setOrderSubmittedSuccess] = useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] = useState('');

  useEffect(() => {
    if (isHeavy) {
      setFulfillmentType('self_pickup');
    }
  }, [isHeavy]);

  // Pricing calculations: Dynamic Delivery Calculation
  // - Base Flat Driver Service Fee: ₹20
  // - Fuel Operational Matrix Factor: ((Distance / 35 km/l Mileage) * ₹140 Petrol Rate per Litre)
  // - Product Payload Weight Multiplier: (0.1 Kg mass payload * ₹5 per Kg baseline rate)
  // - Apply final Math.round() parsing function block wrapper onto the summation
  const safeDistanceKm = Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : 0.5;
  const safeWeightKg = Number.isFinite(weightKg) && weightKg > 0 ? weightKg : 0.1;
  const dynamicDeliveryCalc = calculateDynamicDeliveryFee(safeDistanceKm, safeWeightKg);
  const rawPrice = Number(listing?.price);
  const productPrice = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0;
  const rawDeliveryFee = Number(dynamicDeliveryCalc?.totalDeliveryFee);
  const deliveryFee =
    fulfillmentType === 'home_delivery' && !isHeavy
      ? (Number.isFinite(rawDeliveryFee) ? rawDeliveryFee : 0)
      : 0;

  const totalAmountToPay = productPrice + deliveryFee;

  // Dynamic QR code for the exact amount
  const qrImageSource =
    adminQrUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(
      adminUpiId
    )}%26pn=MeriLocalBazaar%26am=${totalAmountToPay}%26cu=INR%26tn=${encodeURIComponent(
      `Order ${(listing?.title || 'Item').substring(0, 15)}`
    )}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(adminUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert('File size exceeds 8MB. Please select a compressed image.');
        return;
      }
      // Instant preview
      setScreenshotUrl(URL.createObjectURL(file));
      // Direct upload to Supabase Storage "Listing image"
      uploadListingImageToStorage(file)
        .then((publicUrl) => {
          setScreenshotUrl(publicUrl);
        })
        .catch((err) => {
          console.warn('Storage upload notice for receipt:', err);
          // Fallback to dataURL
          const reader = new FileReader();
          reader.onloadend = () => {
            setScreenshotUrl(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
    }
  };

  const handleOpenPolicy = (type: PolicyType) => {
    setSelectedPolicyType(type);
    setPolicyModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Verify Authenticated User
    if (!currentUser || !currentUser.id) {
      setErrorMsg('Please sign in with your account to place a prepaid order.');
      return;
    }

    // 2. Verify Checkbox Consent is True
    if (!termsAccepted) {
      setErrorMsg(
        'Payment karne ke liye Terms & Conditions aur Privacy Policy accept karna zaroori hai.'
      );
      return;
    }

    // 3. Verify Product Order Details
    if (!buyerName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!buyerPhone.trim() || buyerPhone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit calling & WhatsApp phone number.');
      return;
    }
    if (fulfillmentType === 'home_delivery') {
      if (!locationState.district || !locationState.district.trim()) {
        setErrorMsg('Please select your District.');
        return;
      }
      if (!locationState.block || !locationState.block.trim()) {
        setErrorMsg('Please select or enter your C&RD Block.');
        return;
      }
      if (!locationState.village || !locationState.village.trim()) {
        setErrorMsg('Please enter your Village / Locality name.');
        return;
      }
      if (!deliveryAddress.trim()) {
        setErrorMsg('Please enter your complete doorstep delivery address (House / Landmark / Street).');
        return;
      }
    }
    if (!utrNumber.trim() || utrNumber.trim().length < 6) {
      setErrorMsg('Please enter the 12-digit UPI / Bank Transaction ID (UTR) number from your payment app.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Ensure address is geocoded and active profile entry is updated in Supabase
      if (fulfillmentType === 'home_delivery' && deliveryAddress.trim()) {
        await handleSavePermanentAddress(deliveryAddress.trim());
      }

      const generatedOrderNo = `MLB-${Math.floor(100000 + Math.random() * 900000)}`;

      const formattedDeliveryAddr =
        fulfillmentType === 'home_delivery'
          ? `${deliveryAddress.trim()}, Village/Locality: ${locationState.village.trim()}, Block: ${locationState.block.trim()}, District: ${locationState.district.trim()}, State: ${locationState.state.trim()}${
              landmarkNotes ? ` (Landmark: ${landmarkNotes})` : ''
            }`
          : `SELF PICKUP: ${listing.location_name || 'Seller Shop/Location'}`;

      // 4. Save required Terms & Conditions + Privacy Policy acceptance record
      const orderData: Omit<DeliveryOrder, 'id' | 'created_at'> = {
        order_number: generatedOrderNo,
        customer_name: buyerName.trim(),
        customer_phone: buyerPhone.trim(),
        customer_email: buyerEmail.trim(),
        buyer_id: currentUser.id,
        state: locationState.state,
        district: locationState.district,
        block: locationState.block,
        village: locationState.village,
        pickup_address: listing.location_name || 'Seller Shop, Tura Bazaar',
        delivery_address: formattedDeliveryAddr,
        item_description: `${listing.title} [₹${formatPrice(productPrice)}]`,
        listing_id: listing.id,
        listing_title: listing.title,
        listing_image: getListingPrimaryImage(listing),
        product_price: productPrice,
        delivery_fee: deliveryFee,
        total_fare: deliveryFee,
        total_paid: totalAmountToPay,
        weight_kg: safeWeightKg,
        distance_km: safeDistanceKm,
        terrain_type: terrain,
        app_commission: Math.round(deliveryFee * 0.2),
        partner_earning: Math.round(deliveryFee * 0.8),
        payment_method: 'online_upi',
        payment_status: 'pending_verification',
        transaction_id: utrNumber.trim(),
        payment_screenshot_url: screenshotUrl || undefined,
        is_heavy_item: isHeavy,
        fulfillment_type: fulfillmentType,
        buyer_latitude: Number.isFinite(buyerLatitude) ? buyerLatitude : undefined,
        buyer_longitude: Number.isFinite(buyerLongitude) ? buyerLongitude : undefined,
        seller_latitude: Number.isFinite(vendorCoords.latitude) ? vendorCoords.latitude : 25.5141,
        seller_longitude: Number.isFinite(vendorCoords.longitude) ? vendorCoords.longitude : 90.2033,
        seller_name: listing.seller_name || 'Verified Vendor',
        seller_phone: listing.phone || listing.whatsapp || '9876543210',
        status: 'pending',
        terms_accepted: true,
        privacy_accepted: true,
        policy_accepted_at: new Date().toISOString(),
      };

      const fullOrder: DeliveryOrder = {
        id: `ord_${Date.now()}`,
        ...orderData,
        created_at: new Date().toISOString(),
      };

      // 5. Initiate Order Placement / Handlers
      if (onOrderPlaced) {
        await onOrderPlaced(fullOrder);
      }
      if (onSubmitOrder) {
        await onSubmitOrder(orderData);
      }

      // 6. Direct WebintoApp Push Notification dispatch for Instant Order Alert
      try {
        const partnerId = listing.seller_id;
        const sellerRole = listing.category_name?.toLowerCase().includes('cab') || listing.category_name?.toLowerCase().includes('taxi')
          ? 'driver'
          : listing.category_name?.toLowerCase().includes('job') || listing.category_name?.toLowerCase().includes('service')
          ? 'service_provider'
          : 'seller';

        await sendOrderAlertToPartner(partnerId, sellerRole, generatedOrderNo, {
          listing_title: listing.title,
          total_paid: totalAmountToPay,
          customer_name: buyerName.trim(),
          customer_phone: buyerPhone.trim(),
        });
      } catch (notifyErr) {
        console.warn('Direct push notification dispatch non-blocking notice:', notifyErr);
      }

      setCreatedOrderNumber(generatedOrderNo);
      setOrderSubmittedSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place advance order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[94vh] flex flex-col my-auto border border-slate-200"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  100% Online Advance Payment Checkout
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Prepaid Only
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Secure Admin Escrow • No Cash on Delivery
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {orderSubmittedSuccess ? (
          /* Order Submitted Success View */
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="bg-amber-100 text-amber-900 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                Status: Pending Verification
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Payment Verification Request Submitted!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Order <span className="font-mono font-bold text-slate-900">#{createdOrderNumber}</span> has been logged with UTR{' '}
                <span className="font-mono font-bold text-slate-900">{utrNumber}</span>.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 max-w-md mx-auto text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Item:</span>
                <span className="font-bold text-slate-900">{listing.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Advance Paid:</span>
                <span className="font-bold text-emerald-600 font-mono">₹{formatPrice(totalAmountToPay)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Fulfillment:</span>
                <span className="font-bold text-slate-900">
                  {fulfillmentType === 'self_pickup' ? 'Store Self-Pickup' : 'Home Delivery'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Next Step:</span>
                <span className="font-semibold text-amber-700">Admin Payment Verification in progress</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-800 text-left flex items-start gap-2.5 max-w-md mx-auto">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p>
                Jab tak Admin aapke UTR number aur screenshot ko verify nahi karta, tab tak order status <strong>'Pending Verification'</strong> rahega. Approval ke baad seller dispatch karega.
              </p>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-sm transition shadow"
            >
              Close & View My Orders
            </button>
          </div>
        ) : (
          /* Checkout Form */
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Product Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 flex items-center gap-4">
              <img
                src={getListingPrimaryImage(listing)}
                alt={listing.title}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-slate-200 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                  {listing.category_name || 'Marketplace Item'}
                </span>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate mt-1">
                  {listing.title}
                </h4>
                <div className="text-base sm:text-lg font-black text-emerald-600">
                  ₹{formatPrice(productPrice)}
                </div>
              </div>
            </div>

            {/* PART 4: VEHICLE / HEAVY ITEM ALERT OR FULFILLMENT SELECTOR */}
            {isHeavy ? (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    {isVehicle
                      ? 'Automobile & Vehicle Category — Doorstep Courier Disabled'
                      : 'Heavy Item / Property Notice — Courier Disabled'}
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  {isVehicle
                    ? "Yeh listing ek automobile/vehicle category ('Bike & Auto Rickshaw', 'Local Cab & Taxi', 'Travelers & Tour') mein aati hai. Hamare local delivery partners bike/car transport nahi karte hain, isliye Doorstep Delivery disabled hai. Is listing ke liye sirf 'Self Pickup / Store Visit' permissible hai."
                    : "Yeh ek bulky/heavy item hai. Iski doorstep courier delivery available nahi hai. Sirf 'Self Pickup / Store Visit' mode permissible hai."}
                </p>
                <div className="pt-2 flex items-center justify-between text-xs font-bold text-amber-900 border-t border-amber-200">
                  <span>Permitted Fulfillment:</span>
                  <span className="bg-amber-200 text-amber-900 px-2.5 py-1 rounded-lg">
                    🏬 Self Pickup / Store Visit Only (₹0 Delivery Fee)
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Select Delivery Mode *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('home_delivery')}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 ${
                      fulfillmentType === 'home_delivery'
                        ? 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <Truck
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        fulfillmentType === 'home_delivery' ? 'text-orange-600' : 'text-slate-400'
                      }`}
                    />
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900">
                        Doorstep Delivery
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Local bike/auto partner will deliver
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentType('self_pickup')}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 ${
                      fulfillmentType === 'self_pickup'
                        ? 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <Store
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        fulfillmentType === 'self_pickup' ? 'text-orange-600' : 'text-slate-400'
                      }`}
                    />
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900">
                        Self Pickup / Store Visit
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Collect directly (₹0 delivery fee)
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Buyer Contact & Delivery Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>1. Buyer Information & Address</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Silgrak Marak"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Calling & WhatsApp Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
              </div>

              {fulfillmentType === 'home_delivery' && !isHeavy && (
                <div className="space-y-3 pt-1">
                  {/* Local Location (State, District, Block, Village) Selector */}
                  <LocalAddressSelector
                    idPrefix="checkout_delivery"
                    values={locationState}
                    onChange={(field, val) =>
                      setLocationState((prev) => ({ ...prev, [field]: val }))
                    }
                    theme="light"
                    compact={true}
                    required={true}
                  />

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        House No. / Street / Landmark Details *
                      </label>
                      {currentUser?.permanent_address && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          Autofilled
                        </span>
                      )}
                    </div>
                    <textarea
                      required
                      rows={2}
                      placeholder="House/Plot No., Street Name, Near Landmark / School / Market"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    />

                    {/* Geocoding and Permanent Address Save Action */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleSavePermanentAddress()}
                        disabled={isSavingAddress || !deliveryAddress.trim()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        title="Save address and geocode coordinates to your permanent profile in Supabase"
                      >
                        {isSavingAddress ? (
                          <>
                            <div className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                            <span>Geocoding & Saving...</span>
                          </>
                        ) : addressSavedSuccess ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Permanent Address Saved!</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="w-3.5 h-3.5 text-orange-600" />
                            <span>Save as Permanent Address</span>
                          </>
                        )}
                      </button>

                      {geocodingNotice && (
                        <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {geocodingNotice}
                        </span>
                      )}
                    </div>

                    {Number.isFinite(buyerLatitude) &&
                      Number.isFinite(buyerLongitude) &&
                      buyerLatitude !== 0 &&
                      buyerLongitude !== 0 && (
                        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-mono">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>
                            Buyer Geocode: Lat {Number(buyerLatitude).toFixed(4)}, Lon{' '}
                            {Number(buyerLongitude).toFixed(4)}
                          </span>
                        </div>
                      )}
                  </div>

                  {/* Dynamic Distance Vector & Fare Matrix Breakdown */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-orange-500" /> Dynamic Haversine Vector
                      </span>
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {safeDistanceKm.toFixed(1)} km (Floor: 0.5 km)
                      </span>
                    </div>

                    <div className="text-[10px] space-y-1 text-slate-500 pt-1 border-t border-slate-200">
                      <div className="flex justify-between">
                        <span>Base Flat Driver Service Fee:</span>
                        <span className="font-semibold text-slate-700">₹{dynamicDeliveryCalc.baseFlatDriverFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fuel Factor (({safeDistanceKm.toFixed(1)} km / 35 km/l) × ₹140):</span>
                        <span className="font-semibold text-slate-700">₹{(dynamicDeliveryCalc.fuelOperationalFactor ?? 0).toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payload Multiplier (0.1 kg × ₹5/kg):</span>
                        <span className="font-semibold text-slate-700">₹{(dynamicDeliveryCalc.productPayloadMultiplier ?? 0).toFixed(1)}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-1 flex justify-between font-bold text-slate-800">
                        <span>Delivery Charge (Math.round):</span>
                        <span className="text-orange-600 text-xs">₹{dynamicDeliveryCalc.totalDeliveryFee}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PART 1: ONLY ONLINE ADVANCE PAYMENT (ADMIN QR CODE & BILL SUMMARY) */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-5 sm:p-6 space-y-5 border border-slate-700">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-orange-400" />
                  <h4 className="text-sm font-black tracking-tight">
                    2. Advance Payment via Admin Official QR
                  </h4>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                  <Lock className="w-3.5 h-3.5" /> 100% Escrow Protected
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Product Price:</span>
                  <span className="font-mono font-bold text-white">₹{formatPrice(productPrice)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Delivery Charge:</span>
                  <span className="font-mono font-bold text-white">
                    {deliveryFee > 0 ? `₹${formatPrice(deliveryFee)}` : '₹0 (Free / Self-Pickup)'}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-white/10">
                  <span className="text-orange-400">Total Advance Payable:</span>
                  <span className="font-mono text-emerald-400 text-base">₹{formatPrice(totalAmountToPay)}</span>
                </div>
              </div>

              {/* QR Code and UPI ID Block */}
              <div className="flex flex-col sm:flex-row items-center gap-5 bg-white text-slate-900 p-4 rounded-2xl">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 shrink-0">
                  <img
                    src={qrImageSource}
                    alt="Admin UPI QR Code"
                    className="w-36 h-36 sm:w-40 sm:h-40 object-contain rounded-lg"
                  />
                  <div className="text-[10px] text-center font-bold text-slate-500 mt-1">
                    Scan with any UPI App
                  </div>
                </div>

                <div className="space-y-3 flex-1 w-full">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                      Official Admin UPI ID
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="px-3 py-2 bg-slate-100 rounded-xl font-mono text-xs sm:text-sm font-bold text-slate-900 border border-slate-200 flex-1 truncate select-all">
                        {adminUpiId}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
                      >
                        {copiedUpi ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy UPI
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1 text-amber-800">
                      <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Payment Protocol Notice
                    </div>
                    <p className="leading-snug text-slate-600">
                      GPay, PhonePe, ya Paytm se <strong className="text-slate-900">₹{formatPrice(totalAmountToPay)}</strong> transfer karein aur niche UTR number enter karein.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Quick Action UPI Intent Buttons */}
              <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10">
                <UpiIntentButtons
                  upiId={adminUpiId}
                  payeeName="Meri Local Bazaar"
                  amount={totalAmountToPay}
                  transactionNote={`Meri Local Bazaar Order #${listing.id ? listing.id.slice(0, 6) : 'Pay'}`}
                  theme="dark"
                />
              </div>

              {/* Transaction ID & Screenshot Upload */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                    Transaction ID / UTR Number * (Mandatory)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 423985712093 (12-digit UTR)"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Payment app ki receipt screen se 12-digit UTR/Ref No. copy karke yahan daalein.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                    Payment Screenshot (Recommended)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition flex items-center gap-2">
                      <Upload className="w-4 h-4 text-orange-400" />
                      <span>{screenshotUrl ? 'Change Screenshot' : 'Upload Receipt'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {screenshotUrl && (
                      <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                        <img
                          src={screenshotUrl}
                          alt="Receipt Preview"
                          className="w-8 h-8 rounded-lg object-cover border border-white/20"
                        />
                        <span className="text-[11px] text-emerald-300 font-semibold">
                          ✓ Receipt Attached
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Security Alert Guarantee */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 space-y-0.5">
                <div className="font-black text-emerald-950">
                  100% Prepaid Escrow Guarantee
                </div>
                <p className="text-emerald-800 leading-relaxed">
                  Aapka payment Admin ke escrow account mein safe rehta hai. Delivery ya pickup complete hone par hi seller ko payout release kiya jata hai.
                </p>
              </div>
            </div>

            {/* MANDATORY TERMS & PRIVACY CONSENT CHECKBOX (UNCHECKED BY DEFAULT) */}
            <div
              id="buyer_checkout_policy_consent"
              className={`p-4 rounded-2xl border-2 transition-all duration-200 space-y-3 ${
                termsAccepted
                  ? 'bg-orange-50/70 border-orange-300'
                  : 'bg-slate-50 border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  id="checkout_terms_checkbox"
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 text-orange-600 rounded-lg border-2 border-slate-400 focus:ring-2 focus:ring-orange-500 cursor-pointer shrink-0 accent-orange-600"
                />
                <label
                  htmlFor="checkout_terms_checkbox"
                  className="text-xs text-slate-800 leading-relaxed select-none cursor-pointer space-y-2 block"
                >
                  <div className="font-semibold text-slate-900">
                    "Main{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPolicy('terms_conditions');
                      }}
                      className="text-orange-600 font-black hover:underline cursor-pointer inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-orange-100/70"
                    >
                      <span>Terms & Conditions</span>
                      <ExternalLink className="w-3 h-3 inline" />
                    </button>{' '}
                    aur{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPolicy('privacy_policy');
                      }}
                      className="text-orange-600 font-black hover:underline cursor-pointer inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-orange-100/70"
                    >
                      <span>Privacy Policy</span>
                      <ExternalLink className="w-3 h-3 inline" />
                    </button>{' '}
                    ko padhkar aur samajhkar accept karta/karti hoon. Mujhe poori tarah samajh hai ki delivery ke waqt mujhe product ki expiry date, packaging aur condition achhi tarah check karni hogi. Ek baar delivery accept/confirm karne ke baad product expiry ya condition par koi complaint, refund ya support help nahi di jayegi. Agar order 'Out for Delivery' hone ke baad cancel hota hai toh Delivery Charges ka refund ₹0 hoga."
                  </div>

                  <div className="text-[11px] text-slate-500 font-normal italic border-t border-slate-200/80 pt-1.5 leading-relaxed">
                    "I have read and agree to the Terms & Conditions and Privacy Policy. I acknowledge that I must thoroughly inspect product expiry dates and packaging integrity at the exact time of delivery. Once delivery is confirmed, no subsequent complaints, refunds, or support requests regarding product expiry or condition will be entertained."
                  </div>
                </label>
              </div>

              {!termsAccepted && (
                <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200/80 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    Payment & Order submit karne ke liye upar diye gaye checkbox ko accept karna mandatory hai.
                  </span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in duration-150">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs sm:text-sm transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="checkout_pay_now_btn"
                type="submit"
                disabled={!termsAccepted || isSubmitting}
                className={`flex-[2] py-3.5 px-6 font-black rounded-2xl text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-2 ${
                  termsAccepted && !isSubmitting
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white cursor-pointer active:scale-98 shadow-orange-600/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                }`}
              >
                {isSubmitting ? (
                  <span>Submitting Order...</span>
                ) : (
                  <>
                    <span>Submit & Pay ₹{formatPrice(totalAmountToPay)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Centralized Supabase Policy Viewer Modal */}
      <PolicyModal
        isOpen={policyModalOpen}
        initialType={selectedPolicyType}
        onClose={() => setPolicyModalOpen(false)}
        showAcceptButton={!termsAccepted}
        onAccept={() => setTermsAccepted(true)}
      />
    </div>
  );
};
