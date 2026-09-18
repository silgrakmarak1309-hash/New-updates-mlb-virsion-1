import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Check,
  QrCode,
  ShieldCheck,
  Copy,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Zap,
  Crown,
  Star,
  Flame,
  MessageCircle,
  Search,
  BadgeCheck,
  Headphones,
  TrendingUp,
  Info,
  Upload,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { ProPlan, RechargeRequest } from '../types';
import { UpiIntentButtons } from './UpiIntentButtons';

interface ProUpgradeViewProps {
  upiId: string;
  qrCodeUrl: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  onSubmitRecharge: (req: Omit<RechargeRequest, 'id' | 'created_at' | 'status'>) => Promise<void>;
  onSuccessReturn: () => void;
}

export const SUBSCRIPTION_PLANS: ProPlan[] = [
  {
    id: 'pro_1_month',
    name: '1 Month Plan',
    price: 199,
    monthlyPrice: 199,
    durationMonths: 1,
    durationDays: 30,
    durationLabel: '1 Month (30 Days)',
    billingSubtext: 'Billed monthly',
    tag: 'Flexible',
    boosts: '5 Featured Listings',
    features: [
      'Premium Verification Badge on Listings',
      'Direct WhatsApp Inquiry Button for buyers',
      'Higher visibility in Local Search results',
      'Priority support for ad approvals',
      '30 Days Active Validity',
    ],
  },
  {
    id: 'pro_3_months',
    name: '3 Month Plan',
    price: 507,
    monthlyPrice: 169,
    durationMonths: 3,
    durationDays: 90,
    durationLabel: '3 Months (90 Days)',
    billingSubtext: '₹507 billed every 3 months',
    tag: 'Save 15%',
    isPopular: true,
    boosts: '18 Featured Listings',
    features: [
      'Premium Verification Badge on Listings',
      'Direct WhatsApp Inquiry Button for buyers',
      'Higher visibility in Local Search results',
      'Priority support for ad approvals',
      '90 Days Extended Validity',
      'Auto-Bump refresh every 10 days',
    ],
  },
  {
    id: 'pro_6_months',
    name: '6 Month Plan',
    price: 894,
    monthlyPrice: 149,
    durationMonths: 6,
    durationDays: 180,
    durationLabel: '6 Months (180 Days)',
    billingSubtext: '₹894 billed every 6 months',
    tag: 'Save 25%',
    boosts: '45 Featured Listings',
    features: [
      'Premium Verification Badge on Listings',
      'Direct WhatsApp Inquiry Button for buyers',
      'Higher visibility in Local Search results',
      'Priority support for ad approvals',
      '180 Days Extended Validity',
      'VIP Verified Business Seller tag',
      'Direct Phone Call CTA on Listings',
    ],
  },
  {
    id: 'pro_1_year',
    name: '1 Year Plan',
    price: 1440,
    monthlyPrice: 120,
    durationMonths: 12,
    durationDays: 365,
    durationLabel: '1 Year (365 Days)',
    billingSubtext: '₹1,440 billed annually',
    tag: 'Save 40%',
    isBestValue: true,
    badge: 'MOST POPULAR / BEST VALUE',
    boosts: 'Unlimited Featured Listings',
    features: [
      'Premium Verification Badge on Listings',
      'Direct WhatsApp Inquiry Button for buyers',
      'Higher visibility in Local Search results',
      'Priority support for ad approvals',
      '365 Days Full Year Access',
      'Unlimited Ad Submissions & Renewals',
      'Top Sticky Homepage Banner Placement',
      'Instant 5-Minute Fast-Track Approvals',
    ],
  },
];

export const ProUpgradeView: React.FC<ProUpgradeViewProps> = ({
  upiId,
  qrCodeUrl,
  userEmail,
  userName,
  userPhone,
  onSubmitRecharge,
  onSuccessReturn,
}) => {
  // Default to 1 Year Plan (Best Value)
  const [selectedPlan, setSelectedPlan] = useState<ProPlan>(SUBSCRIPTION_PLANS[3]);
  const [utr, setUtr] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkoutRef = useRef<HTMLDivElement | null>(null);

  const handleSelectPlan = (plan: ProPlan) => {
    setSelectedPlan(plan);
    setError(null);
    // Smooth scroll with requestAnimationFrame to prevent layout thrashing
    requestAnimationFrame(() => {
      if (checkoutRef.current) {
        checkoutRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Payment receipt image size must be under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setReceiptUrl(event.target?.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utr.trim() || utr.trim().length < 6) {
      setError('Please enter a valid 12-digit UPI UTR transaction reference number.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmitRecharge({
        user_name: userName,
        user_email: userEmail,
        user_phone: userPhone,
        plan_name: `${selectedPlan.name} (₹${selectedPlan.price})`,
        amount: selectedPlan.price,
        utr: utr.trim(),
        is_top_pro: !!selectedPlan.isBestValue,
      });

      setSubmittedSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit payment record. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedSuccess) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-5 animate-in zoom-in-95 duration-200">
        <div className="w-18 h-18 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div>
          <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
            Submission Received
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            Payment Logged for Verification
          </h2>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2 text-left">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Selected Plan:</span>
            <strong className="text-orange-600 font-bold">{selectedPlan.name} ({selectedPlan.durationLabel})</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Amount Paid:</span>
            <strong className="text-emerald-700 font-black text-sm">₹{selectedPlan.price}</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Submitted UTR:</span>
            <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
              {utr}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Registered Phone:</span>
            <span className="font-bold text-slate-800">{userPhone}</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          Our team is verifying your payment reference with the banking gateway. Your PRO status and Gold Verified Badge will activate automatically upon admin verification.
        </p>

        <div className="pt-2">
          <button
            onClick={onSuccessReturn}
            className="w-full sm:w-auto px-8 py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-2xl text-xs font-black transition shadow-lg flex items-center justify-center gap-2 mx-auto"
          >
            <ArrowRight className="w-4 h-4" />
            Return to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header Banner */}
      <div className="text-center space-y-3 relative">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 text-orange-800 border border-orange-300/80 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow-xs">
          <Crown className="w-4 h-4 text-amber-600" />
          <span>Meri Local Bazaar PRO Membership</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
          Supercharge Your Sales & Grow Faster
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Upgrade your local shop or seller account. Verified PRO sellers get up to <strong>10x more WhatsApp inquiries</strong>, top search ranking, and instant buyer trust.
        </p>

        {/* Value Callout Ribbon */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2 text-xs font-bold text-slate-700">
          <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200/80">
            <BadgeCheck className="w-4 h-4 text-orange-600" />
            <span>Gold Verification Badge</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/80">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>Direct WhatsApp Leads</span>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/80">
            <Search className="w-4 h-4 text-amber-600" />
            <span>Top Search Ranking</span>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200/80">
            <Headphones className="w-4 h-4 text-blue-600" />
            <span>Priority Approval Queue</span>
          </div>
        </div>
      </div>

      {/* 4-TIER SUBSCRIPTION PRICING CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 items-stretch">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isSelected = selectedPlan.id === plan.id;
          const isBestValue = !!plan.isBestValue;
          const isPopular = !!plan.isPopular;

          return (
            <div
              key={plan.id}
              onClick={() => handleSelectPlan(plan)}
              className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between relative transition-colors duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-white border-2 border-orange-500 shadow-xl ring-2 ring-orange-500/30'
                  : isBestValue
                  ? 'bg-gradient-to-b from-amber-50/80 to-white border-2 border-amber-400 shadow-md hover:border-orange-400 hover:shadow-lg'
                  : 'bg-white border border-slate-200 hover:border-orange-300 hover:shadow-md'
              }`}
            >
              {/* Highlight Badges */}
              {isBestValue && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-black text-[10px] sm:text-[11px] px-3.5 py-1 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                  <Crown className="w-3.5 h-3.5 fill-slate-950" />
                  <span>MOST POPULAR / BEST VALUE</span>
                </div>
              )}

              {isPopular && !isBestValue && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-600 text-white font-black text-[10px] px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                  <Flame className="w-3 h-3" />
                  <span>POPULAR CHOICE</span>
                </div>
              )}

              {/* Card Header & Pricing */}
              <div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <h3 className="font-black text-slate-900 text-lg sm:text-xl">
                    {plan.name}
                  </h3>
                  <span
                    className={`text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                      isBestValue
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : isPopular
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {plan.tag}
                  </span>
                </div>

                {/* Monthly Equivalent Price */}
                <div className="mt-4 pt-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-slate-950 font-mono tracking-tight">
                      ₹{plan.monthlyPrice}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">/ month</span>
                  </div>

                  {/* Billed Subtext */}
                  <div className="text-xs font-bold text-orange-600 mt-1">
                    {plan.billingSubtext}
                  </div>
                </div>

                {/* Highlight Boosts Capacity */}
                {plan.boosts && (
                  <div className="mt-3.5 p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                    <span>{plan.boosts}</span>
                  </div>
                )}

                {/* Common & Tier Specific Feature List */}
                <div className="mt-5 space-y-2.5 pt-4 border-t border-slate-100">
                  <div className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    Included Benefits:
                  </div>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className={idx < 4 ? 'font-semibold text-slate-900' : 'text-slate-600'}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-7 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPlan(plan);
                  }}
                  className={`w-full py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-orange-500/25 ring-2 ring-orange-500/30'
                      : isBestValue
                      ? 'bg-slate-950 hover:bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-orange-600 hover:text-white text-slate-800'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Selected (Proceed to Pay)</span>
                    </>
                  ) : (
                    <>
                      <span>Choose {plan.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CHECKOUT & UPI PAYMENT VERIFICATION PANEL */}
      <div
        ref={checkoutRef}
        className="bg-white rounded-3xl border-2 border-orange-200/80 shadow-xl p-6 sm:p-8 lg:p-10 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-100/60 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          {/* Left: Dynamic QR Code & Payment Instructions */}
          <div className="flex-1 w-full space-y-5">
            <div>
              <span className="bg-orange-100 text-orange-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Step 1: Scan & Pay
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
                <QrCode className="w-6 h-6 text-orange-600" />
                <span>Instant UPI Payment</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Scan the dynamic QR code with Google Pay, PhonePe, Paytm, BHIM, or any banking app.
              </p>
            </div>

            {/* Selected Plan Summary Banner */}
            <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-200/80 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-black text-orange-600 tracking-wider">
                  Active Selected Plan
                </span>
                <div className="text-base sm:text-lg font-black text-slate-900">
                  {selectedPlan.name} ({selectedPlan.durationLabel})
                </div>
                <div className="text-xs text-slate-600 font-semibold">{selectedPlan.billingSubtext}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Total to Pay</div>
                <div className="text-2xl sm:text-3xl font-black text-slate-950 font-mono">
                  ₹{selectedPlan.price}
                </div>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
              <div className="relative group shrink-0">
                <img
                  src={
                    qrCodeUrl ||
                    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=upi://pay?pa=${upiId}&am=${selectedPlan.price}&pn=MeriLocalBazaar&cu=INR`
                  }
                  alt="UPI Payment QR Code"
                  className="w-40 h-40 bg-white p-2.5 rounded-2xl border-2 border-slate-200 object-contain shadow-sm shrink-0"
                />
                <div className="absolute inset-0 bg-orange-600/10 rounded-2xl pointer-events-none" />
              </div>

              <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
                <div>
                  <div className="text-xs font-bold text-slate-500">Official Merchant UPI ID:</div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 flex-wrap">
                    <span className="font-mono text-sm font-black bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 shadow-2xs">
                      {upiId}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="p-2 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-[11px] text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <p>• Amount auto-configured: <strong className="text-slate-900">₹{selectedPlan.price}</strong></p>
                  <p>• Works with all UPI apps (Google Pay, PhonePe, Paytm, CRED)</p>
                </div>
              </div>
            </div>

            {/* Quick Action Intent Buttons for GPay, PhonePe, Paytm */}
            <div className="p-4 bg-orange-50/70 rounded-3xl border border-orange-200 shadow-sm">
              <UpiIntentButtons
                upiId={upiId}
                payeeName="Meri Local Bazaar"
                amount={selectedPlan.price}
                transactionNote={`Meri Local Bazaar - ${selectedPlan.name} Upgrade`}
                theme="light"
              />
            </div>
          </div>

          {/* Right: Step 2 Form (12-Digit UTR Submission & Photo Upload) */}
          <div className="flex-1 w-full bg-slate-50 p-6 sm:p-7 rounded-3xl border border-slate-200 space-y-5">
            <div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Step 2: Submit Verification
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-1">
                Enter 12-Digit UPI Transaction ID (UTR)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                After paying ₹{selectedPlan.price}, copy the 12-digit UPI reference ID from your banking app receipt.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-2xl flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  12-Digit UTR / Transaction Ref Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 423589124578"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none shadow-2xs"
                />
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Can be found in payment receipt under "UPI Ref No" or "UTR".
                </p>
              </div>

              {/* Optional Payment Screenshot Upload Container */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  Payment Screenshot / Receipt (Optional)
                </label>
                {receiptUrl ? (
                  <div className="relative inline-block border-2 border-emerald-400 rounded-2xl p-1 bg-white shadow-sm">
                    <img
                      src={receiptUrl}
                      alt="Payment Receipt"
                      className="w-24 h-24 object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setReceiptUrl('')}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md hover:bg-rose-700 transition"
                      title="Remove receipt"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 hover:border-orange-400 bg-white hover:bg-orange-50/40 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-orange-500 transition mb-1" />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-orange-600">
                      Upload Payment Screenshot
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG up to 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* User Identity Snapshot */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant:</span>
                  <strong className="text-slate-900">{userName || 'Member'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Registered Phone:</span>
                  <span className="font-mono font-bold text-slate-900">{userPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="text-slate-700 truncate max-w-[200px]">{userEmail}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-[0.99] text-white rounded-2xl font-black text-sm shadow-lg shadow-orange-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <span>Submitting to Admin Queue...</span>
                ) : (
                  <>
                    <span>Confirm & Submit ₹{selectedPlan.price} Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 text-center pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Manual 2-Factor verification ensures 100% genuine seller badges</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
