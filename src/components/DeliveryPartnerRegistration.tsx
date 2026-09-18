import React, { useState, useEffect } from 'react';
import {
  Bike,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Fuel,
  TrendingUp,
  MapPin,
  FileText,
  AlertCircle,
  Phone,
  User,
  Calculator,
  QrCode,
  CreditCard,
  Building,
  Upload,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { UserProfile, calculateDeliveryFare, formatPrice, LocalAddressFields } from '../types';
import { LocalAddressSelector, LocalAddressState } from './LocalAddressSelector';

interface DeliveryPartnerRegistrationProps {
  currentUser: UserProfile;
  onSubmit?: (data: {
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
  onSuccess?: () => void;
  onCancel?: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateHome?: () => void;
}

export const DeliveryPartnerRegistration: React.FC<DeliveryPartnerRegistrationProps> = ({
  currentUser,
  onSubmit,
  onSuccess,
  onCancel,
  onNavigateToDashboard,
  onNavigateHome,
}) => {
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [vehicleType, setVehicleType] = useState<'Bike' | 'Scooty' | 'Auto' | 'Commercial Auto'>(
    (currentUser?.vehicle_type as any) || 'Bike'
  );
  const [vehicleNumber, setVehicleNumber] = useState(currentUser?.vehicle_number || '');
  const [drivingLicenseNo, setDrivingLicenseNo] = useState(
    currentUser?.driving_license_no || currentUser?.driving_license || ''
  );
  const [dlProofUrl, setDlProofUrl] = useState(currentUser?.driving_license_proof_url || '');
  const [vehicleRcNo, setVehicleRcNo] = useState(currentUser?.vehicle_rc_no || '');

  // Local Location Details (State, District, Block, Village/Locality)
  const [locationState, setLocationState] = useState<LocalAddressState>({
    state: currentUser?.state || 'Meghalaya',
    district: currentUser?.district || 'West Garo Hills',
    block: currentUser?.block || 'Rongram',
    village: currentUser?.village || '',
  });

  // Payout Details State
  const [payoutUpiId, setPayoutUpiId] = useState(currentUser?.payout_upi_id || '');
  const [payoutBankName, setPayoutBankName] = useState(currentUser?.payout_bank_name || '');
  const [payoutAccountNo, setPayoutAccountNo] = useState(currentUser?.payout_account_no || '');
  const [payoutIfscCode, setPayoutIfscCode] = useState(currentUser?.payout_ifsc_code || '');
  const [payoutQrImageUrl, setPayoutQrImageUrl] = useState(currentUser?.payout_qr_image_url || '');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Sync state if currentUser is loaded or updated
  useEffect(() => {
    if (currentUser?.full_name && !fullName) {
      setFullName(currentUser.full_name);
    }
    if (currentUser?.phone && !phone) {
      setPhone(currentUser.phone);
    }
    if (currentUser?.vehicle_type) {
      setVehicleType(currentUser.vehicle_type as any);
    }
    if (currentUser?.vehicle_number && !vehicleNumber) {
      setVehicleNumber(currentUser.vehicle_number);
    }
    if ((currentUser?.driving_license_no || currentUser?.driving_license) && !drivingLicenseNo) {
      setDrivingLicenseNo(currentUser.driving_license_no || currentUser.driving_license || '');
    }
    if (currentUser?.driving_license_proof_url && !dlProofUrl) {
      setDlProofUrl(currentUser.driving_license_proof_url);
    }
    if (currentUser?.vehicle_rc_no && !vehicleRcNo) {
      setVehicleRcNo(currentUser.vehicle_rc_no);
    }
    if (currentUser?.payout_upi_id && !payoutUpiId) {
      setPayoutUpiId(currentUser.payout_upi_id);
    }
    if (currentUser?.payout_bank_name && !payoutBankName) {
      setPayoutBankName(currentUser.payout_bank_name);
    }
    if (currentUser?.payout_account_no && !payoutAccountNo) {
      setPayoutAccountNo(currentUser.payout_account_no);
    }
    if (currentUser?.payout_ifsc_code && !payoutIfscCode) {
      setPayoutIfscCode(currentUser.payout_ifsc_code);
    }
  }, [currentUser]);

  // Live Calculator Demo values
  const [sampleWeight, setSampleWeight] = useState(5);
  const [sampleDistance, setSampleDistance] = useState(8);
  const [sampleTerrain, setSampleTerrain] = useState<'Plain' | 'Hill (5km/L)'>('Hill (5km/L)');

  const fareEstimate = calculateDeliveryFare(sampleWeight, sampleDistance, sampleTerrain);

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('QR code image size exceeds 5MB. Please choose a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPayoutQrImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Driving License image exceeds 5MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setDlProofUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 3) {
      errs.fullName = 'Please enter your full legal name (minimum 3 characters)';
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      errs.phone = 'Please enter a valid 10-digit mobile number';
    }

    if (!vehicleType) {
      errs.vehicleType = 'Please select your vehicle type';
    }

    const cleanVehicleNo = vehicleNumber.trim().toUpperCase();
    if (!cleanVehicleNo || cleanVehicleNo.length < 5) {
      errs.vehicleNumber = 'Please enter a valid vehicle registration plate number (e.g., ML-08-A-4592)';
    }

    if (!locationState.district || !locationState.district.trim()) {
      errs.district = 'Please select your District';
    }
    if (!locationState.block || !locationState.block.trim()) {
      errs.block = 'Please select or enter your Block';
    }
    if (!locationState.village || !locationState.village.trim()) {
      errs.village = 'Please enter your Village / Locality name';
    }

    if (!payoutUpiId.trim() || !payoutUpiId.includes('@')) {
      errs.payoutUpiId = 'Please enter a valid UPI ID for receiving delivery earnings (e.g., 9876543210@paytm)';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const regData = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        vehicleType,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        state: locationState.state,
        district: locationState.district,
        block: locationState.block,
        village: locationState.village,
        drivingLicenseNo: drivingLicenseNo.trim().toUpperCase() || undefined,
        drivingLicenseProofUrl: dlProofUrl || undefined,
        vehicleRcNo: vehicleRcNo.trim().toUpperCase() || undefined,
        payoutUpiId: payoutUpiId.trim(),
        payoutBankName: payoutBankName.trim() || undefined,
        payoutAccountNo: payoutAccountNo.trim() || undefined,
        payoutIfscCode: payoutIfscCode.trim().toUpperCase() || undefined,
        payoutQrImageUrl: payoutQrImageUrl || undefined,
      };

      if (onSubmit) {
        await onSubmit(regData);
      }
      if (onSuccess) {
        onSuccess();
      }
      setSubmittedSuccess(true);
    } catch (err) {
      console.error(err);
      setErrors({ form: 'Failed to submit registration. Please check your connection and try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already registered and approved/pending
  const isAlreadyRegistered = currentUser?.is_delivery_partner && currentUser?.partner_status;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-emerald-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-extrabold uppercase tracking-wider">
              <Bike className="w-3.5 h-3.5" /> Meri Local Delivery Partner
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Delivery Partner Registration
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Earn reliable daily income delivering parcels, groceries, and shop orders in your local town with transparent 90% partner payouts and fuel allowances.
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={onNavigateToDashboard}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40"
            >
              Partner Order Dashboard <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onNavigateHome}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold text-center transition"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </div>

      {/* PART 1 & 2: SECURITY PREPAID ALERT NOTE (CRISP WHITE TEXT CONTRAST) */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 border border-orange-400/60 rounded-3xl p-5 sm:p-6 shadow-lg shadow-orange-950/15 flex items-start gap-4 text-white">
        <div className="w-10 h-10 rounded-2xl bg-white/20 text-white border border-white/30 flex items-center justify-center shrink-0 shadow-xs">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-black text-white tracking-tight" style={{ color: '#FFFFFF' }}>
              100% Prepaid Protocol Security Alert
            </h3>
            <span className="bg-white text-orange-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
              No Cash on Delivery
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed" style={{ color: '#FFFFFF' }}>
            "Yeh ek 100% Prepaid App hai. Customer se delivery ke waqt koi cash ya online paisa alag se nahi lena hai. Aapka delivery charge order complete hote hi aapke app wallet mein aa jayega."
          </p>
        </div>
      </div>

      {/* Already registered banner if applicable */}
      {isAlreadyRegistered && !submittedSuccess && (
        <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          currentUser?.partner_status === 'approved'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : currentUser?.partner_status === 'rejected'
            ? 'bg-red-50 border-red-200 text-red-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-start gap-3">
            {currentUser?.partner_status === 'approved' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
            ) : currentUser?.partner_status === 'rejected' ? (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            ) : (
              <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
            )}
            <div>
              <div className="text-sm font-bold">
                Application Status:{' '}
                <span className="uppercase font-black">
                  {currentUser?.partner_status || 'Pending'}
                </span>
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                Registered Vehicle: <strong>{currentUser?.vehicle_type || 'Bike'}</strong> ({currentUser?.vehicle_number || 'N/A'})
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToDashboard}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shrink-0"
          >
            Open Order Dashboard
          </button>
        </div>
      )}

      {/* Success Notification View */}
      {submittedSuccess ? (
        <div className="bg-white rounded-3xl border border-emerald-200 p-8 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Application Submitted for Review!</h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            Thank you, <strong>{fullName}</strong>. Your delivery partner profile with vehicle <strong>{vehicleType} ({vehicleNumber})</strong> and payout UPI <strong>{payoutUpiId}</strong> is now set to <strong>Pending Admin Review</strong>.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onNavigateToDashboard}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md"
            >
              View Order Dashboard <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onNavigateHome}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Return to Marketplace
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Registration Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900">Rider / Driver Information</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Fill in your legal details to register your vehicle for local delivery dispatch.
              </p>
            </div>

            {errors.form && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errors.form}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" /> Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Silgrak Marak"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                    errors.fullName ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                  }`}
                />
                {errors.fullName && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.fullName}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> WhatsApp / Phone Number *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full pl-12 pr-3.5 py-2.5 bg-white border rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                      errors.phone ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                    }`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>

              {/* Vehicle Type Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5 flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5 text-slate-500" /> Vehicle Type *
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as any)}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                    errors.vehicleType ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                  }`}
                >
                  <option value="Bike" className="text-slate-900 font-semibold">Bike (Motorcycle)</option>
                  <option value="Scooty" className="text-slate-900 font-semibold">Scooty</option>
                  <option value="Auto" className="text-slate-900 font-semibold">Auto Rickshaw</option>
                  <option value="Commercial Auto" className="text-slate-900 font-semibold">Commercial Auto (Cargo / Goods)</option>
                </select>
                {errors.vehicleType && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.vehicleType}</p>
                )}
              </div>

              {/* Vehicle Plate Number */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" /> Vehicle Plate Number (RC) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ML-08-A-4592"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-mono font-bold uppercase text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                    errors.vehicleNumber ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                  }`}
                />
                {errors.vehicleNumber && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.vehicleNumber}</p>
                )}
              </div>

              {/* Driving License Number & Document */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-500" /> Driving License Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ML08 20230012345"
                    value={drivingLicenseNo}
                    onChange={(e) => setDrivingLicenseNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" /> Vehicle RC Book / Chassis No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RC-98234-ML08"
                    value={vehicleRcNo}
                    onChange={(e) => setVehicleRcNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Driving License Photo Upload */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" /> Driving License Photo / Document Proof
                  </span>
                  {dlProofUrl && (
                    <span className="text-[10px] font-bold text-emerald-600">✓ License Attached</span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleDlUpload}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200"
                />
                {dlProofUrl && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={dlProofUrl}
                      alt="DL Preview"
                      className="w-20 h-14 object-cover rounded-xl border border-slate-200 bg-white"
                    />
                    <span className="text-[11px] text-slate-600">
                      Driving license photo attached for official admin verification.
                    </span>
                  </div>
                )}
              </div>

              {/* Driver Local Location (State, District, Block, Village) */}
              <LocalAddressSelector
                idPrefix="driver_reg"
                values={locationState}
                onChange={(field, val) => {
                  setLocationState((prev) => ({ ...prev, [field]: val }));
                  if (errors[field]) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next[field];
                      return next;
                    });
                  }
                }}
                errors={errors}
                theme="light"
                required={true}
              />

              {/* PART 2: PAYOUT & EARNINGS DETAILS (PAISA PANE KA ACCOUNT) */}
              <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-3xl p-5 sm:p-6 space-y-4 pt-4">
                <div className="flex items-center gap-2 border-b border-emerald-200 pb-2">
                  <CreditCard className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <h3 className="text-sm font-black text-emerald-950">
                      Payout & Earnings Details (Paisa Pane Ka Account) *
                    </h3>
                    <p className="text-[11px] text-emerald-800">
                      Har completed delivery ka 80% partner share is account / UPI mein direct bheja jayega.
                    </p>
                  </div>
                </div>

                {/* UPI ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" /> Driver Payout UPI ID * (Mandatory)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. yourname@oksbi or 9876543210@paytm"
                    value={payoutUpiId}
                    onChange={(e) => setPayoutUpiId(e.target.value)}
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                      errors.payoutUpiId ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                    }`}
                  />
                  {errors.payoutUpiId && (
                    <p className="text-[11px] text-red-500 mt-1">{errors.payoutUpiId}</p>
                  )}
                </div>

                {/* Bank Account Number & IFSC */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 uppercase mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. State Bank of India"
                      value={payoutBankName}
                      onChange={(e) => setPayoutBankName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 uppercase mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 30219845123"
                      value={payoutAccountNo}
                      onChange={(e) => setPayoutAccountNo(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-800 uppercase mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SBIN0000198"
                      value={payoutIfscCode}
                      onChange={(e) => setPayoutIfscCode(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* QR Code Image Upload with Preview */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" /> Driver Payout QR Code (Optional)
                    </span>
                    {payoutQrImageUrl && (
                      <span className="text-[10px] font-bold text-emerald-600">✓ QR Attached</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrUpload}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200"
                  />
                  {payoutQrImageUrl && (
                    <div className="mt-2 flex items-center gap-3">
                      <img
                        src={payoutQrImageUrl}
                        alt="Payout QR Preview"
                        className="w-20 h-20 object-contain rounded-xl border border-slate-200 bg-white p-1"
                      />
                      <span className="text-[11px] text-slate-600">
                        Aapka QR code admin verification aur instant payout ke liye save hoga.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Terms acknowledgement */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="terms_agree"
                    required
                    defaultChecked
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="terms_agree" className="text-[11px] text-slate-700 font-medium leading-tight">
                    I confirm that I possess a valid Driving License, active Vehicle RC, and agree to the <strong className="text-slate-900">90% Partner / 10% App Commission</strong> rate per delivery ticket. Customer se koi alag se cash nahi lena hai.
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>Saving Registration Profile...</>
                ) : (
                  <>
                    <span>Submit Delivery Partner Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Calculator & Fuel Information */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Earnings Calculator */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold tracking-tight">Fare Calculator Formula</h3>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Live Preview
                </span>
              </div>

              {/* Sliders for Interactive calculation */}
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Parcel Weight:</span>
                    <span className="font-bold text-white font-mono">{sampleWeight} KG</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    value={sampleWeight}
                    onChange={(e) => setSampleWeight(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Trip Distance:</span>
                    <span className="font-bold text-white font-mono">{sampleDistance} KM</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    value={sampleDistance}
                    onChange={(e) => setSampleDistance(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Terrain Fuel Profile:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSampleTerrain('Hill (5km/L)')}
                      className={`py-2 px-3 rounded-xl font-bold text-xs transition border ${
                        sampleTerrain === 'Hill (5km/L)'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      ⛰️ Hill (5km/L)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSampleTerrain('Plain')}
                      className={`py-2 px-3 rounded-xl font-bold text-xs transition border ${
                        sampleTerrain === 'Plain'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      🛣️ Plain Road
                    </button>
                  </div>
                </div>
              </div>

              {/* Calculated Results */}
              <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60 space-y-3">
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span>Customer Total Fare:</span>
                  <span className="font-mono text-sm font-bold text-white">₹{formatPrice(fareEstimate.totalFare)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-emerald-300 font-bold">Partner Net Earning (90%):</span>
                  <span className="font-mono text-base font-black text-emerald-400">
                    ₹{formatPrice(fareEstimate.partnerEarning)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>Platform Commission (10%):</span>
                  <span className="font-mono">₹{formatPrice(fareEstimate.appCommission)}</span>
                </div>
              </div>
            </div>

            {/* Partner Benefits Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Why Partner with Meri Local Bazaar?
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>100% Guaranteed Advance Payment:</strong> Har order prepaid rehta hai, cash collection ka jhanjhat nahi.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Direct UPI Wallet Withdrawals:</strong> Kisi bhi time apna kamaya hua delivery fare withdraw karein.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Hill Mileage Compensation:</strong> Garo Hills hilly terrain ke hisaab se higher fuel allowance added hai.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
