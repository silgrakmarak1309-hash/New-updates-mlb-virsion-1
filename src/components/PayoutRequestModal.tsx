import React, { useState } from 'react';
import {
  X,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Building,
  QrCode,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile, formatPrice } from '../types';
import { dispatchAppToast } from '../lib/notifications';

interface PayoutRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  availableBalance: number;
  userRoleLabel: 'Shopkeeper / Seller' | 'Delivery Partner';
  onSubmitPayout: (payoutData: {
    amount: number;
    upi_id: string;
    bank_name?: string;
    account_no?: string;
    ifsc_code?: string;
    user_role: string;
  }) => Promise<void> | void;
}

export const PayoutRequestModal: React.FC<PayoutRequestModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  availableBalance,
  userRoleLabel,
  onSubmitPayout,
}) => {
  const [payoutMethod, setPayoutMethod] = useState<'upi' | 'bank'>('upi');
  const [amount, setAmount] = useState<number>(availableBalance > 0 ? availableBalance : 500);
  const [upiId, setUpiId] = useState(currentUser.payout_upi_id || '');
  const [bankName, setBankName] = useState(currentUser.payout_bank_name || 'State Bank of India');
  const [accountNo, setAccountNo] = useState(currentUser.payout_account_no || '');
  const [ifscCode, setIfscCode] = useState(currentUser.payout_ifsc_code || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePresetAmount = (preset: number) => {
    if (preset === -1) {
      setAmount(Math.max(availableBalance, 100));
    } else {
      setAmount(preset);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const currentWalletBalance = Number(availableBalance) || 0;
    const requestedAmount = Number(amount);

    // CRITICAL REQUIREMENT: STRICT "INSUFFICIENT BALANCE" WITHDRAWAL VALIDATION
    if (requestedAmount > currentWalletBalance || currentWalletBalance <= 0) {
      const errorText = 'Insufficient Balance! You cannot withdraw more than your available wallet amount.';
      setErrorMsg(errorText);
      dispatchAppToast({
        title: 'Withdrawal Failed',
        message: errorText,
        type: 'error',
      });
      return;
    }

    if (amount <= 0) {
      setErrorMsg('Please enter a valid payout withdrawal amount (Min: ₹100).');
      return;
    }

    if (payoutMethod === 'upi') {
      if (!upiId.trim() || !upiId.includes('@')) {
        setErrorMsg('Please provide a valid UPI ID (e.g. yourname@oksbi or phone@paytm).');
        return;
      }
    } else {
      if (!accountNo.trim() || accountNo.length < 8) {
        setErrorMsg('Please enter a valid Bank Account Number.');
        return;
      }
      if (!ifscCode.trim() || ifscCode.length < 4) {
        setErrorMsg('Please enter a valid Bank IFSC Code (e.g. SBIN0001234).');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmitPayout({
        amount: Number(amount),
        upi_id: payoutMethod === 'upi' ? upiId.trim() : (upiId.trim() || `${accountNo.trim()}@bank`),
        bank_name: payoutMethod === 'bank' ? bankName.trim() : currentUser.payout_bank_name,
        account_no: payoutMethod === 'bank' ? accountNo.trim() : currentUser.payout_account_no,
        ifsc_code: payoutMethod === 'bank' ? ifscCode.trim().toUpperCase() : currentUser.payout_ifsc_code,
        user_role: userRoleLabel,
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit withdrawal request. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="payout_request_modal_overlay"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    >
      <div
        id="payout_request_modal_card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl border border-slate-200 text-slate-900 max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-6 relative">
          <button
            id="close_payout_modal_btn"
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 flex items-center justify-center shadow-lg font-black text-xl">
              <Wallet className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">Request Payout & Withdrawal</h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  {userRoleLabel}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Direct settlement transfer to your UPI or verified Bank account
              </p>
            </div>
          </div>

          {/* Current Real-time Available Balance Preview */}
          <div className="mt-4 p-3 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
            <span className="text-xs text-slate-300">Available Wallet Balance:</span>
            <span className="text-xl font-black text-emerald-400 font-mono">
              ₹{formatPrice(availableBalance)}
            </span>
          </div>
        </div>

        {/* Content Body */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-black text-slate-900">Withdrawal Request Submitted!</h4>
            <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
              Your payout request for{' '}
              <strong className="text-emerald-600 font-mono">₹{formatPrice(amount)}</strong> has been
              delivered to the Partner Hub admin queue. Verification & transfer will be processed
              promptly.
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 font-medium">
              Card No. 8 inside Admin Control Room has been notified with your request payload.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Amount Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Withdrawal Amount (₹) *
                </label>
                <span className="text-[11px] text-slate-500">Min: ₹100</span>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                  ₹
                </span>
                <input
                  id="payout_amount_input"
                  type="number"
                  required
                  min={100}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="Enter amount to withdraw"
                  className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-lg font-black text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Quick Amount Presets */}
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-medium">Quick Select:</span>
                {[500, 1000, 2000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handlePresetAmount(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      amount === val
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ₹{val}
                  </button>
                ))}
                {availableBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => handlePresetAmount(-1)}
                    className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-100 text-amber-900 hover:bg-amber-200 transition"
                  >
                    Max Balance (₹{formatPrice(availableBalance)})
                  </button>
                )}
              </div>
            </div>

            {/* Payout Method Toggle */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Select Destination Account *
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="tab_payout_upi"
                  onClick={() => setPayoutMethod('upi')}
                  className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                    payoutMethod === 'upi'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-black">UPI ID (Instant)</div>
                    <div className="text-[10px] opacity-75">GPay, PhonePe, Paytm</div>
                  </div>
                </button>

                <button
                  type="button"
                  id="tab_payout_bank"
                  onClick={() => setPayoutMethod('bank')}
                  className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                    payoutMethod === 'bank'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Building className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-black">Bank Transfer</div>
                    <div className="text-[10px] opacity-75">NEFT / IMPS Account</div>
                  </div>
                </button>
              </div>

              {/* UPI Form */}
              {payoutMethod === 'upi' && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Your Registered UPI ID *
                  </label>
                  <input
                    id="payout_upi_input"
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. 9876543210@paytm or yourname@oksbi"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <p className="text-[10px] text-slate-500">
                    Ensure this UPI ID is linked to your active bank account in Meghalaya.
                  </p>
                </div>
              )}

              {/* Bank Account Form */}
              {payoutMethod === 'bank' && (
                <div className="space-y-2.5 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. State Bank of India, HDFC Bank"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Account Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={accountNo}
                        onChange={(e) => setAccountNo(e.target.value)}
                        placeholder="e.g. 39482019482"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Bank IFSC Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        placeholder="e.g. SBIN0001234"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>

              <button
                id="submit_payout_request_btn"
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Submitting request...</span>
                ) : (
                  <>
                    <span>Submit Payout Request (₹{formatPrice(amount)})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
