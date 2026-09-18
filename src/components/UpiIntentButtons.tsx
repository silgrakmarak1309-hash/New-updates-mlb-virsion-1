import React, { useState } from 'react';
import { ExternalLink, Zap, Check, Copy, ArrowUpRight } from 'lucide-react';

interface UpiIntentButtonsProps {
  upiId: string;
  payeeName?: string;
  amount: number | string;
  transactionNote?: string;
  theme?: 'dark' | 'light';
  className?: string;
}

export const UpiIntentButtons: React.FC<UpiIntentButtonsProps> = ({
  upiId,
  payeeName = 'Meri Local Bazaar',
  amount,
  transactionNote = 'Meri Local Bazaar Payment',
  theme = 'light',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [activeApp, setActiveApp] = useState<string | null>(null);

  const numericAmount =
    typeof amount === 'string'
      ? parseFloat(amount.replace(/[^0-9.]/g, '')) || 0
      : amount;
  const formattedAmount = numericAmount.toFixed(2);

  // Clean UPI ID string
  const cleanUpiId = (upiId || 'merilocalbazaar@oksbi').trim();

  // Standard UPI URI query parameters
  const upiQuery = `pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${encodeURIComponent(formattedAmount)}&cu=INR&tn=${encodeURIComponent(
    transactionNote
  )}`;

  // ============================================================================
  // ANDROID INTENT STRINGS (Forces WebIntoApp & Android WebViews to launch apps)
  // Format: intent://pay?{params}#Intent;scheme=upi;package={pkg};end;
  // ============================================================================
  const gpayAndroidIntent = `intent://pay?${upiQuery}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end;`;
  const phonepeAndroidIntent = `intent://pay?${upiQuery}#Intent;scheme=upi;package=com.phonepe.app;end;`;
  const paytmAndroidIntent = `intent://pay?${upiQuery}#Intent;scheme=upi;package=net.one97.paytm;end;`;
  const anyUpiAndroidIntent = `intent://pay?${upiQuery}#Intent;scheme=upi;end;`;

  // Standard fallback protocols
  const standardUpiUrl = `upi://pay?${upiQuery}`;
  const gpayDirectUrl = `gpay://upi/pay?${upiQuery}`;
  const phonepeDirectUrl = `phonepe://pay?${upiQuery}`;
  const paytmDirectUrl = `paytmmp://pay?${upiQuery}`;

  const apps = [
    {
      id: 'gpay',
      name: 'Google Pay',
      shortName: 'GPay',
      androidIntent: gpayAndroidIntent,
      directUrl: gpayDirectUrl,
      fallbackUrl: standardUpiUrl,
      accentColor: 'from-blue-500 to-indigo-600',
      dotColor: 'bg-blue-500',
      tag: 'Instant',
    },
    {
      id: 'phonepe',
      name: 'PhonePe',
      shortName: 'PhonePe',
      androidIntent: phonepeAndroidIntent,
      directUrl: phonepeDirectUrl,
      fallbackUrl: standardUpiUrl,
      accentColor: 'from-purple-600 to-indigo-700',
      dotColor: 'bg-purple-500',
      tag: 'Fast',
    },
    {
      id: 'paytm',
      name: 'Paytm',
      shortName: 'Paytm',
      androidIntent: paytmAndroidIntent,
      directUrl: paytmDirectUrl,
      fallbackUrl: standardUpiUrl,
      accentColor: 'from-sky-500 to-blue-600',
      dotColor: 'bg-sky-400',
      tag: 'Direct',
    },
  ];

  /**
   * Executes deep linking for Android WebViews (WebIntoApp) & Mobile Browsers
   */
  const triggerPayment = (androidIntent: string, directUrl: string, fallbackUrl: string, appId: string) => {
    setActiveApp(appId);
    setTimeout(() => setActiveApp(null), 3000);

    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent || '');

    // 1. On Android (including WebIntoApp APK wrapper), use standard Android Intent syntax
    const targetUrl = isAndroid ? androidIntent : directUrl;

    try {
      // Primary trigger: anchor simulation (most compatible with Android WebViews)
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // Direct window location fallback
      try {
        window.location.href = targetUrl;
      } catch {
        window.location.href = fallbackUrl;
      }
    }

    // Safety fallback: if intent is not caught after 800ms, try standard upi://
    setTimeout(() => {
      try {
        window.location.href = fallbackUrl;
      } catch {
        // Ignored
      }
    }, 850);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(cleanUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isDark = theme === 'dark';

  return (
    <div className={`w-full space-y-3.5 ${className}`}>
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
          <span
            className={`text-xs font-black uppercase tracking-wider ${
              isDark ? 'text-orange-400' : 'text-orange-600'
            }`}
          >
            1-Tap UPI App Pay (₹{formattedAmount})
          </span>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isDark
              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
              : 'bg-orange-100 text-orange-700 border border-orange-200'
          }`}
        >
          Auto ₹{formattedAmount}
        </span>
      </div>

      {/* 3 Main Quick Action Buttons for GPay, PhonePe, Paytm */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
        {apps.map((app) => (
          <button
            key={app.id}
            id={`btn-upi-intent-${app.id}`}
            type="button"
            onClick={() =>
              triggerPayment(app.androidIntent, app.directUrl, app.fallbackUrl, app.id)
            }
            className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 shadow-sm active:scale-95 group text-center min-h-[58px] select-none cursor-pointer focus:outline-none ${
              activeApp === app.id
                ? 'ring-2 ring-orange-500 ring-offset-2'
                : ''
            } ${
              isDark
                ? 'bg-slate-800/95 hover:bg-slate-800 border-slate-700 hover:border-orange-500/60 text-white shadow-black/20'
                : 'bg-white hover:bg-orange-50/90 border-orange-200/90 hover:border-orange-400 text-slate-900 shadow-orange-500/10'
            }`}
            title={`Pay ₹${formattedAmount} via ${app.name}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-2 h-2 rounded-full ${app.dotColor}`} />
              <span className="text-xs sm:text-sm font-extrabold tracking-tight group-hover:text-orange-600 transition-colors">
                {app.shortName}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 group-hover:text-orange-500 transition-colors">
              <span>₹{formattedAmount}</span>
              <ArrowUpRight className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
            </div>
          </button>
        ))}
      </div>

      {/* Alternative Options: Any Installed UPI App & Copy UPI ID */}
      <div className="flex items-center gap-2 pt-1">
        {/* Open Any UPI App / System Chooser */}
        <button
          type="button"
          id="btn-upi-any-app"
          onClick={() =>
            triggerPayment(
              anyUpiAndroidIntent,
              standardUpiUrl,
              standardUpiUrl,
              'any'
            )
          }
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
            isDark
              ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-orange-600'
          }`}
        >
          <ExternalLink className="w-3 h-3 text-orange-500" />
          <span>Other UPI Apps (BHIM / CRED / etc.)</span>
        </button>

        {/* Copy UPI ID button */}
        <button
          type="button"
          id="btn-copy-upi-quick"
          onClick={handleCopyUpi}
          className={`flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
            copied
              ? 'bg-emerald-500 text-white border-emerald-500'
              : isDark
              ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-300'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
          }`}
          title="Copy UPI ID"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-white" />
              <span className="text-[11px]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span className="text-[11px]">Copy ID</span>
            </>
          )}
        </button>
      </div>

      {/* Informative Guidance */}
      <p
        className={`text-[11px] leading-relaxed text-center ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        Clicking any app above automatically hands over payment of{' '}
        <strong
          className={isDark ? 'text-orange-300 font-bold' : 'text-orange-700 font-bold'}
        >
          ₹{formattedAmount}
        </strong>{' '}
        to your Android system payment gateway.
      </p>
    </div>
  );
};
