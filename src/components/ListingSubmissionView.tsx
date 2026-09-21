import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Plus,
  Trash2,
  Star,
  Layers,
  Lock,
  Sparkles,
  MapPin,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  uploadListingImageToStorage,
  dataURLtoBlob,
  LISTING_IMAGE_BUCKET,
} from '../lib/storage';
import { Listing, LocalAddressFields, UserProfile, isUserPlanActive, isMasterAdmin } from '../types';
import { LocalAddressSelector, LocalAddressState } from './LocalAddressSelector';

import { generateUuid, ensureUuid } from '../lib/uuid';

interface ListingSubmissionViewProps {
  onSuccess: (newListing: Listing) => void;
  onCancel: () => void;
  onNavigateToPro?: () => void;
  userPhone?: string;
  userName?: string;
  userId?: string;
  isProUser?: boolean;
  currentUser?: UserProfile | null;
}

interface PhotoItem {
  id: string;
  url: string;
  name: string;
  size: number;
  file?: File;
  uploadedUrl?: string;
  isUploading?: boolean;
}

const MAX_PHOTOS = 6;

const CATEGORIES = [
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
  'Commercial Equipment',
];

/**
 * Accurately parses profile plan subscription status.
 * Handles:
 * - is_pro as boolean true
 * - is_pro as integer 1 (PostgreSQL int4 / smallint)
 * - is_pro as string '1' or 'true'
 * - pro_status === 'active' | 'approved'
 * - plan_status === 'active' | 'approved'
 * - Master Admin email bypass
 */
function parseIsActivePlan(profileRow: any): boolean {
  if (!profileRow) return false;
  if (profileRow.email && profileRow.email.toLowerCase().trim() === 'silgrakmarak1309@gmail.com') {
    return true;
  }

  // 1. Thoroughly evaluate int4/number type from Supabase:
  const isUserPro =
    Number(profileRow?.is_pro) === 1 ||
    profileRow?.is_pro === true ||
    profileRow?.pro_status === 'active' ||
    String(profileRow?.pro_status || '').toLowerCase().trim() === 'approved' ||
    String(profileRow?.plan_status || '').toLowerCase().trim() === 'active' ||
    String(profileRow?.plan_status || '').toLowerCase().trim() === 'approved';

  if (isUserPro) return true;

  // String fallback ('1', 'true')
  const rawIsPro = profileRow.is_pro;
  if (rawIsPro === '1' || String(rawIsPro).toLowerCase().trim() === 'true') {
    return true;
  }

  return false;
}

export const ListingSubmissionView: React.FC<ListingSubmissionViewProps> = ({
  onSuccess,
  onCancel,
  onNavigateToPro,
  userPhone = '9876543210',
  userName = 'Seller',
  userId = 'usr_seller',
  isProUser = false,
  currentUser,
}) => {
  // Real-time live database plan verification
  const [dbPlanVerified, setDbPlanVerified] = useState<boolean | null>(null);
  const [isVerifyingPlan, setIsVerifyingPlan] = useState(false);

  // Live database plan verification against profiles table
  useEffect(() => {
    let isMounted = true;
    const effectiveUid = userId || currentUser?.id;
    const effectiveEmail = currentUser?.email;

    async function verifyPlanWithDb() {
      if (!supabase) return;
      if (!effectiveUid && !effectiveEmail) return;

      try {
        setIsVerifyingPlan(true);
        let query = supabase
          .from('profiles')
          .select('id, email, is_pro, pro_status, plan_status, account_status, is_approved_by_admin');

        if (effectiveUid) {
          query = query.eq('id', effectiveUid);
        } else if (effectiveEmail) {
          query = query.ilike('email', effectiveEmail.trim());
        }

        const { data, error } = await query.maybeSingle();

        if (isMounted && data) {
          const isActive = parseIsActivePlan(data);
          setDbPlanVerified(isActive);
        }
      } catch (err) {
        console.warn('Live monthly plan check notice:', err);
      } finally {
        if (isMounted) setIsVerifyingPlan(false);
      }
    }

    verifyPlanWithDb();

    // Subscribe to realtime changes on this user's profile so if admin activates plan, user is unblocked immediately
    if (supabase && effectiveUid) {
      const client = supabase;
      const channel = client
        .channel(`profile-plan-check-${effectiveUid}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${effectiveUid}` },
          (payload: any) => {
            const updated = payload.new;
            if (updated && isMounted) {
              const isActive = parseIsActivePlan(updated);
              setDbPlanVerified(isActive);
            }
          }
        )
        .subscribe();

      return () => {
        isMounted = false;
        client.removeChannel(channel);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [userId, currentUser?.id, currentUser?.email]);

  // Unified active plan status for all listing categories:
  // (Seller, Cab & Taxi, Travelers & Tour, Local Service provider, Shop owner, etc.)
  const hasActiveMonthlyPlan = useMemo(() => {
    // 1. Thoroughly evaluate int4/number type, boolean, and pro_status from Supabase:
    const isUserPro =
      Number(currentUser?.is_pro) === 1 ||
      currentUser?.is_pro === true ||
      currentUser?.pro_status === 'active' ||
      currentUser?.plan_status === 'active' ||
      Number(isProUser) === 1 ||
      isProUser === true ||
      isMasterAdmin(currentUser) ||
      isUserPlanActive(currentUser);

    // If active seller, restriction modal layout remains strictly false
    if (isUserPro) return true;
    if (dbPlanVerified === true) return true;
    if (dbPlanVerified !== null) return dbPlanVerified;
    return false;
  }, [currentUser, dbPlanVerified, isProUser]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Mobiles & Gadgets');
  const [location, setLocation] = useState('Tura, Meghalaya');
  const [locationState, setLocationState] = useState<LocalAddressState>({
    state: 'Meghalaya',
    district: 'West Garo Hills',
    block: 'Rongram',
    village: '',
  });
  const [price, setPrice] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [weightUnit, setWeightUnit] = useState<'g' | 'kg'>('g');
  const [condition, setCondition] = useState('Used - Like New');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState(userPhone);
  const [whatsapp, setWhatsapp] = useState(userPhone);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processMultipleFiles(Array.from(files));
    }
    // Reset file input so same file can be re-selected if needed
    if (e.target) {
      e.target.value = '';
    }
  };

  const processMultipleFiles = (fileList: File[]) => {
    setError(null);

    // Filter valid image files
    const validFiles: File[] = [];
    for (const file of fileList) {
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" is not a valid image. Only PNG, JPG, JPEG, WEBP allowed.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" exceeds 5MB limit. Please choose a smaller photo.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Check maximum photos limit (up to 6)
    const availableSlots = MAX_PHOTOS - photos.length;
    if (availableSlots <= 0) {
      setError(`You have already uploaded the maximum ${MAX_PHOTOS} photos.`);
      return;
    }

    const filesToAdd = validFiles.slice(0, availableSlots);
    if (validFiles.length > availableSlots) {
      setError(`Only ${availableSlots} more photo(s) added (Maximum limit: ${MAX_PHOTOS}).`);
    }

    // Create photo items with immediate preview and trigger Supabase Storage upload
    const newItems: PhotoItem[] = filesToAdd.map((file, idx) => ({
      id: `photo_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      url: URL.createObjectURL(file), // instant local preview
      name: file.name,
      size: file.size,
      file,
      isUploading: true,
    }));

    setPhotos((prev) => {
      const updated = [...prev, ...newItems];
      return updated.slice(0, MAX_PHOTOS);
    });

    // Upload directly to Supabase storage bucket "Listing image"
    newItems.forEach(async (item) => {
      if (!item.file) return;
      try {
        const publicUrl = await uploadListingImageToStorage(item.file);
        setPhotos((current) =>
          current.map((p) =>
            p.id === item.id
              ? { ...p, url: publicUrl, uploadedUrl: publicUrl, isUploading: false }
              : p
          )
        );
      } catch (err: any) {
        console.warn(`Supabase Storage upload warning for ${item.name}:`, err);
        // Keep local preview, will retry upload during final submit
        setPhotos((current) =>
          current.map((p) =>
            p.id === item.id ? { ...p, isUploading: false } : p
          )
        );
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processMultipleFiles(Array.from(files));
    }
  };

  const removePhoto = (indexToRemove: number) => {
    setPhotos((prev) => {
      const updated = prev.filter((_, index) => index !== indexToRemove);
      if (activePhotoIndex >= updated.length) {
        setActivePhotoIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const setAsCoverPhoto = (indexToPromote: number) => {
    if (indexToPromote === 0 || indexToPromote >= photos.length) return;
    setPhotos((prev) => {
      const target = prev[indexToPromote];
      const rest = prev.filter((_, idx) => idx !== indexToPromote);
      return [target, ...rest];
    });
    setActivePhotoIndex(0);
  };

  const handleSubmitListing = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      // UNIFIED ACTIVE PLAN RESTRICTION FOR ALL CATEGORIES:
      // (Sellers, Cab & Taxi, Travelers & Tour, Local Services, Shop owners, etc.)
      // Only users with an active monthly subscription plan (plan_status === 'active' or is_pro === true) can post.
      if (!hasActiveMonthlyPlan) {
        setError(
          'Posting Restricted! Free users can only act as Buyers to browse and purchase items. Please upgrade to a PRO Plan to post listings.'
        );
        return;
      }

      const trimmedTitle = (title || '').trim();
      const parsedPrice = parseFloat(price);
      if (!trimmedTitle || isNaN(parsedPrice) || parsedPrice <= 0) {
        setError('Please provide a valid listing title and price.');
        return;
      }

      setSubmitting(true);
      setError(null);

      // 1. Strict FormData extraction for 'weight_value' and 'weight_unit' with state fallback
      let rawWeightValue: any = weightValue;
      let rawWeightUnit: any = weightUnit;

      try {
        if (e?.currentTarget && typeof (e.currentTarget as any).elements !== 'undefined') {
          const formData = new FormData(e.currentTarget);
          const formWeightVal = formData.get('weight_value');
          const formWeightUnit = formData.get('weight_unit');

          if (formWeightVal !== null && formWeightVal !== undefined && String(formWeightVal).trim() !== '') {
            rawWeightValue = formWeightVal;
          }
          if (formWeightUnit !== null && formWeightUnit !== undefined && String(formWeightUnit).trim() !== '') {
            rawWeightUnit = formWeightUnit;
          }
        }
      } catch (formErr) {
        console.warn('FormData extraction non-blocking notice, falling back to state:', formErr);
      }

      // 2. Strict fallback checking so undefined/null/malformed states gracefully default to valid number pattern
      const safeWeightUnit = (
        typeof rawWeightUnit === 'string' && rawWeightUnit.toLowerCase().trim() === 'kg'
          ? 'kg'
          : 'g'
      ) as 'g' | 'kg';

      let numericWeightVal = 0;
      if (rawWeightValue !== null && rawWeightValue !== undefined) {
        const cleanedWeightStr = String(rawWeightValue).replace(/[^0-9.]/g, '').trim();
        const parsedNum = parseFloat(cleanedWeightStr);
        if (!isNaN(parsedNum) && Number.isFinite(parsedNum) && parsedNum > 0) {
          numericWeightVal = parsedNum;
        }
      }

      // Normalization rule: If unit is "kg", multiply input value by 1000 to convert into grams
      let consolidatedWeightInGrams: number = 0;
      if (numericWeightVal > 0) {
        consolidatedWeightInGrams =
          safeWeightUnit === 'kg'
            ? Math.round(numericWeightVal * 1000)
            : Math.round(numericWeightVal);
      }

      // Upload any pending or un-uploaded photos directly to Supabase Storage bucket "Listing image"
      const uploadedPublicUrls: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];

        // 1. If already uploaded to Supabase Storage and returned a public HTTP URL
        if (photo.uploadedUrl && photo.uploadedUrl.startsWith('http')) {
          uploadedPublicUrls.push(photo.uploadedUrl);
        }
        // 2. If photo.url is already an external web URL (and not a local blob: URL)
        else if (photo.url && photo.url.startsWith('http') && !photo.url.startsWith('blob:')) {
          uploadedPublicUrls.push(photo.url);
        }
        // 3. If we have the raw File object, upload directly to "Listing image"
        else if (photo.file) {
          try {
            const publicUrl = await uploadListingImageToStorage(photo.file);
            uploadedPublicUrls.push(publicUrl);
          } catch (uploadErr: any) {
            console.error(`Failed to upload ${photo.name} to "${LISTING_IMAGE_BUCKET}":`, uploadErr);
            setError(`Image upload failed for "${photo.name}": ${uploadErr?.message || uploadErr}`);
            setSubmitting(false);
            return;
          }
        }
        // 4. If photo is a dataURL, convert to blob and upload directly to "Listing image"
        else if (photo.url && photo.url.startsWith('data:')) {
          try {
            const blob = dataURLtoBlob(photo.url);
            const publicUrl = await uploadListingImageToStorage(blob, photo.name);
            uploadedPublicUrls.push(publicUrl);
          } catch (uploadErr: any) {
            console.error(`Failed to upload base64 image to "${LISTING_IMAGE_BUCKET}":`, uploadErr);
          }
        }
      }

      // Default fallback image if no photo was uploaded
      const finalImageUrls: string[] =
        uploadedPublicUrls.length > 0
          ? uploadedPublicUrls
          : [
              'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80',
            ];

      const finalImagesJson = JSON.stringify(finalImageUrls);

      const finalLocationName =
        location.trim() ||
        `${locationState.village ? locationState.village + ', ' : ''}${locationState.block}, ${locationState.district}`;

      const finalListingId = generateUuid();
      const finalSellerId = ensureUuid(userId);

      // 3. Validate that the weight numeric object maps perfectly to the database table insert parameter array payload
      const safeNumericWeight =
        Number.isFinite(consolidatedWeightInGrams) && consolidatedWeightInGrams > 0
          ? Number(consolidatedWeightInGrams)
          : null;

      const isHeavyItem = (safeNumericWeight || 0) >= 10000; // >= 10kg

      const listingPayload: Listing = {
        id: finalListingId,
        title: trimmedTitle,
        category_name: category,
        location_name: finalLocationName,
        state_name: locationState.state || 'Meghalaya',
        district: locationState.district,
        block: locationState.block,
        village: locationState.village,
        price: parsedPrice,
        weight: safeNumericWeight ? safeNumericWeight : undefined,
        is_heavy_item: isHeavyItem,
        condition,
        description: (description || '').trim(),
        phone: (phone || '').trim(),
        whatsapp: (whatsapp || '').trim() || (phone || '').trim(),
        images_json: finalImagesJson,
        image_urls: finalImageUrls,
        is_featured: Boolean(isProUser),
        is_pro: Boolean(isProUser),
        status: 'pending', // Strict moderation requirement
        seller_id: finalSellerId,
        seller_name: userName,
        seller_verified: true,
        views_count: 1,
        created_at: new Date().toISOString(),
      };

      // Database insert parameter payload mapping
      const dbInsertPayload: Record<string, any> = {
        id: finalListingId,
        title: trimmedTitle,
        category_name: category,
        location_name: finalLocationName,
        state_name: locationState.state || 'Meghalaya',
        district: locationState.district,
        block: locationState.block,
        village: locationState.village,
        price: parsedPrice,
        weight: safeNumericWeight,
        is_heavy_item: isHeavyItem,
        condition,
        description: (description || '').trim(),
        phone: (phone || '').trim(),
        whatsapp: (whatsapp || '').trim() || (phone || '').trim(),
        images_json: finalImagesJson,
        image_urls: finalImageUrls,
        is_featured: Boolean(isProUser),
        is_pro: Boolean(isProUser),
        status: 'pending',
        seller_id: finalSellerId,
        seller_name: userName,
        seller_verified: true,
        views_count: 1,
        created_at: new Date().toISOString(),
      };

      try {
        if (supabase) {
          let { error: dbError } = await supabase.from('listings').insert([dbInsertPayload]);
          // Schema fallback if column "weight" is absent in target remote database
          if (dbError && dbError.message && dbError.message.toLowerCase().includes('weight')) {
            console.warn('Retrying listing insert without optional weight column:', dbError.message);
            const { weight, ...fallbackPayload } = dbInsertPayload;
            const retryRes = await supabase.from('listings').insert([fallbackPayload]);
            dbError = retryRes.error;
          }
          if (dbError) {
            console.warn('Supabase listing insert notice:', dbError.message);
          }
        }
      } catch (dbErr: any) {
        console.error('Supabase listing insert execution handled error:', dbErr);
      }

      try {
        onSuccess(listingPayload);
      } catch (onSuccessErr: any) {
        console.error('onSuccess callback invocation handled error:', onSuccessErr);
      }
    } catch (criticalErr: any) {
      console.error('Structured error boundary caught handleSubmitListing error:', criticalErr);
      setError(
        criticalErr?.message || 'An unexpected error occurred while processing listing submission. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = handleSubmitListing;

  const activePhoto = photos[activePhotoIndex] || photos[0];

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* UNIFIED MONTHLY PLAN RESTRICTION OVERLAY FOR ALL CATEGORIES */}
      {/* INITIAL PLAN VERIFICATION SPINNER */}
      {isVerifyingPlan && dbPlanVerified === null && !hasActiveMonthlyPlan ? (
        <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
          <div className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-white space-y-4 flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Verifying Seller Status</h3>
              <p className="text-xs text-slate-400">Syncing active plan status with Supabase...</p>
            </div>
          </div>
        </div>
      ) : !hasActiveMonthlyPlan ? (
        <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl text-white relative overflow-hidden space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
              <Lock className="w-8 h-8 text-slate-950" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 fill-amber-400" /> PRO Membership Required
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Posting Restricted!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                Posting Restricted! Free users can only act as Buyers to browse and purchase items. Please upgrade to a PRO Plan to post listings.
              </p>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-left text-xs space-y-2 text-slate-300">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Post unlimited ads with verified seller badge</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Direct WhatsApp inquiries & top marketplace ranking</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              {onNavigateToPro && (
                <button
                  type="button"
                  onClick={onNavigateToPro}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  View PRO Plans
                </button>
              )}
              <button
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer"
              >
                Back to Marketplace
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="bg-slate-900 text-white p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
                Moderated Submission
              </span>
              {hasActiveMonthlyPlan && (
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Active Seller Verified
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-white mt-1">Submit Listing Request</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload up to 6 clear photos. All submissions are verified by Admin Control Room before going live.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmitListing} className="p-6 sm:p-8 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Multi-Photo Upload System (Up to 6 Photos) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Product Photos ({photos.length}/{MAX_PHOTOS}) *
            </label>
            <span className="text-[11px] font-medium text-slate-500">
              PNG, JPG, WEBP (Max 5MB each)
            </span>
          </div>

          {/* Hidden File Input with multiple attribute */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/jpg, image/webp"
            multiple
            className="hidden"
          />

          {photos.length > 0 ? (
            <div className="space-y-3">
              {/* Main Active Photo Preview */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-orange-500 bg-slate-900 h-64 flex items-center justify-center group shadow-inner">
                <img
                  src={activePhoto?.url}
                  alt={activePhoto?.name || 'Preview'}
                  className="w-full h-full object-contain"
                />

                {/* Primary Cover Photo Badge */}
                {activePhotoIndex === 0 && (
                  <div className="absolute top-3 left-3 bg-orange-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md">
                    <Star className="w-3.5 h-3.5 fill-white" /> Primary Cover Photo
                  </div>
                )}

                {/* Storage Bucket Upload Indicator */}
                {activePhoto?.isUploading && (
                  <div className="absolute top-3 right-3 bg-slate-900/90 text-orange-400 text-[11px] font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-md border border-orange-500/40">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                    <span>Uploading to &quot;Listing image&quot;...</span>
                  </div>
                )}

                {/* Controls Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2.5">
                  {photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-white text-slate-900 rounded-xl text-xs font-bold shadow hover:bg-slate-100 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add More ({MAX_PHOTOS - photos.length} left)
                    </button>
                  )}
                  {activePhotoIndex !== 0 && (
                    <button
                      type="button"
                      onClick={() => setAsCoverPhoto(activePhotoIndex)}
                      className="px-3.5 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-bold shadow hover:bg-amber-600 flex items-center gap-1"
                    >
                      <Star className="w-3.5 h-3.5" /> Make Cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(activePhotoIndex)}
                    className="p-2 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow"
                    title="Remove this photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Photo info tag */}
                <div className="absolute bottom-2 left-2 bg-black/75 text-white text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1.5">
                  <span>Photo {activePhotoIndex + 1} of {photos.length}</span>
                  <span className="text-slate-400">•</span>
                  <span className="truncate max-w-[150px]">{activePhoto?.name}</span>
                </div>
              </div>

              {/* Thumbnails Strip */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id || index}
                    onClick={() => setActivePhotoIndex(index)}
                    className={`relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer shrink-0 border-2 transition-all ${
                      activePhotoIndex === index
                        ? 'border-orange-500 scale-105 shadow-md ring-2 ring-orange-400/30'
                        : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                    {photo.isUploading && (
                      <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                      </div>
                    )}
                    {index === 0 && (
                      <div className="absolute top-0.5 left-0.5 bg-orange-600 text-white rounded-full p-0.5">
                        <Star className="w-2.5 h-2.5 fill-white" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(index);
                      }}
                      className="absolute top-0.5 right-0.5 bg-red-600/90 text-white rounded-full p-0.5 hover:bg-red-700"
                      title="Remove"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}

                {/* Add Photo Button if under max */}
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-orange-300 hover:border-orange-500 bg-orange-50 hover:bg-orange-100/70 text-orange-600 flex flex-col items-center justify-center shrink-0 transition"
                    title={`Add more photos (${MAX_PHOTOS - photos.length} remaining)`}
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[9px] font-bold">Add</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-300 hover:border-orange-400 bg-slate-50'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Click to browse up to 6 photos or drag & drop here
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Select multiple photos simultaneously from your device (PNG, JPG, WEBP, Max 5MB each)
              </p>
            </div>
          )}
        </div>

        {/* Ad Title */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Listing Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Royal Enfield Classic 350 (2022 Single Owner)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none"
          />
        </div>

        {/* Category & Price Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="text-slate-900 font-semibold">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Price (₹ INR) *
            </label>
            <input
              type="number"
              required
              min="1"
              placeholder="e.g. 145000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Flexible Weight Input Selector supporting Gram (g) and Kilogram (kg) */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Package / Item Weight (Optional)
          </label>
          <div className="flex rounded-xl border border-slate-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition">
            <input
              id="listing-weight-input"
              name="weight_value"
              type="number"
              step="any"
              min="0"
              placeholder={weightUnit === 'kg' ? 'e.g. 1.5' : 'e.g. 500'}
              value={weightValue}
              onChange={(e) => setWeightValue(e.target.value)}
              className="w-full px-4 py-2.5 bg-transparent text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal text-sm focus:outline-none"
            />
            <div className="border-l border-slate-200 bg-slate-50 flex items-center shrink-0">
              <select
                id="listing-weight-unit-select"
                name="weight_unit"
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value as 'g' | 'kg')}
                className="h-full px-3 py-2.5 bg-transparent text-slate-900 font-bold text-xs sm:text-sm focus:outline-none cursor-pointer border-none"
              >
                <option value="g">Gram (g)</option>
                <option value="kg">Kilogram (kg)</option>
              </select>
            </div>
          </div>
          {weightValue && parseFloat(weightValue) > 0 && (
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Normalized for delivery calculations:{' '}
              <span className="font-bold text-orange-600">
                {weightUnit === 'kg'
                  ? `${Math.round(parseFloat(weightValue) * 1000)} g (${parseFloat(weightValue)} kg)`
                  : `${Math.round(parseFloat(weightValue))} g (${(parseFloat(weightValue) / 1000).toFixed(2)} kg)`}
              </span>
            </p>
          )}
        </div>

        {/* Location & Condition */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Town / Market Center *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tura Market, Hawakhana"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Item Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none"
            >
              <option value="Brand New" className="text-slate-900 font-semibold">Brand New / Sealed Box</option>
              <option value="Used - Like New" className="text-slate-900 font-semibold">Used - Like New</option>
              <option value="Used - Good" className="text-slate-900 font-semibold">Used - Good</option>
              <option value="Used - Fair" className="text-slate-900 font-semibold">Used - Fair Condition</option>
            </select>
          </div>
        </div>

        {/* Local Address Selector for Meghalaya */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-orange-600" /> Item Location Hierarchy (State, District, Block & Village) *
          </h3>
          <LocalAddressSelector
            idPrefix="ad_post"
            values={locationState}
            onChange={(field, val) =>
              setLocationState((prev) => ({ ...prev, [field]: val }))
            }
            theme="light"
            required={true}
          />
        </div>

        {/* Contact WhatsApp Protocol */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Contact Phone *
            </label>
            <input
              type="tel"
              required
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              WhatsApp Inquiry Number *
            </label>
            <input
              type="tel"
              required
              placeholder="10-digit WhatsApp number"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
            Full Description & Specs
          </label>
          <textarea
            rows={4}
            placeholder="Detailed description, purchase year, inclusions, bills/warranty, and reason for selling..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none"
          />
        </div>

        {/* Action Controls */}
        <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50"
          >
            {submitting ? 'Submitting to Moderation Queue...' : `Submit Listing (${photos.length} Photo${photos.length === 1 ? '' : 's'})`}
          </button>
        </div>
      </form>
    </div>
  );
};
