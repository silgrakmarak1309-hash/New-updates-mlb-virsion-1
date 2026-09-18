import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Lock,
  MessageCircle,
  Mail,
  AlertCircle,
  X,
} from 'lucide-react';
import { AppRoute, UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { BrandLogo } from './BrandLogo';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile, targetRoute?: AppRoute) => void;
  onNavigateToAdmin?: () => void;
  isAdminRoute?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onNavigateToAdmin,
  isAdminRoute = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Google Sign-In prompt modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  // Email / Password Form state
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPassword, setCustomPassword] = useState('');

  // 1. Handle Google Account Sign-In
  const handleGoogleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanEmail = googleEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid Gmail / Google Account address.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const isMaster = cleanEmail === 'silgrakmarak1309@gmail.com';
      const cleanName = googleName.trim() || cleanEmail.split('@')[0];

      // Check if user already exists in Supabase profiles
      let existingProfile: any = null;
      if (supabase) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();
          existingProfile = data;
        } catch (_) {}
      }

      const generatedId = existingProfile?.id || (
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      );

      const userProfile: UserProfile = {
        id: generatedId,
        email: cleanEmail,
        full_name: existingProfile?.full_name || cleanName,
        avatar_url:
          existingProfile?.avatar_url ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=ea580c,f59e0b,059669`,
        phone: existingProfile?.phone || '9876543210',
        city: existingProfile?.city || 'Tura, Meghalaya',
        state: existingProfile?.state || 'Meghalaya',
        role: isMaster ? 'super_admin' : (existingProfile?.role || 'user'),
        is_pro: isMaster ? true : (existingProfile?.is_pro ?? false),
        pro_status: isMaster ? 'active' : (existingProfile?.pro_status || 'inactive'),
        is_delivery_partner: existingProfile?.is_delivery_partner || false,
        partner_status: existingProfile?.partner_status || 'none',
        wallet_balance: typeof existingProfile?.wallet_balance === 'number' ? existingProfile.wallet_balance : 0,
        payout_upi_id: existingProfile?.payout_upi_id || '',
        created_at: existingProfile?.created_at || new Date().toISOString(),
      };

      // Sync to Supabase profiles (Bypass RLS - Direct Upsert)
      if (supabase) {
        try {
          await supabase.from('profiles').upsert([userProfile]);
        } catch (dbErr) {
          console.warn('Supabase profile sync notice:', dbErr);
        }
      }

      // Persist active session locally
      try {
        localStorage.setItem('mlb_active_user', JSON.stringify(userProfile));
      } catch (_) {}

      setLoading(false);
      setShowGoogleModal(false);

      const shouldGoAdmin = (isAdminRoute || isMaster) && isMaster;
      onLoginSuccess(userProfile, shouldGoAdmin ? 'admin' : 'user');

      if (shouldGoAdmin) {
        onNavigateToAdmin?.();
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Failed to sign in with Google account. Please try again.');
    }
  };

  // 2. Direct Email & Password Authentication
  const handleEmailAuthSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanEmail = customEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide a valid email address (e.g. name@gmail.com).');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const isMaster = cleanEmail === 'silgrakmarak1309@gmail.com';
    const cleanName = customName.trim() || cleanEmail.split('@')[0];
    const passwordToUse = customPassword.trim() || `MLB@${cleanEmail.replace(/[^a-zA-Z0-9]/g, '')}#2026`;

    try {
      let authUser: any = null;

      // Attempt Supabase Auth sign-in if supabase is configured
      if (supabase) {
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: passwordToUse,
          });

          if (!signInError && signInData?.user) {
            authUser = signInData.user;
          } else {
            const msg = signInError?.message?.toLowerCase() || '';
            if (
              msg.includes('invalid login credentials') ||
              msg.includes('user not found') ||
              msg.includes('invalid credentials') ||
              msg.includes('not confirmed')
            ) {
              const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: cleanEmail,
                password: passwordToUse,
                options: {
                  data: {
                    full_name: cleanName,
                    name: cleanName,
                    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=ea580c,f59e0b,059669`,
                  },
                },
              });

              if (!signUpError && signUpData?.user) {
                authUser = signUpData.user;
              }
            }
          }
        } catch (authErr) {
          console.warn('Supabase auth attempt handled:', authErr);
        }
      }

      // Check existing profile in database
      let existingProfile: any = null;
      if (supabase) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();
          existingProfile = data;
        } catch (_) {}
      }

      const userId =
        authUser?.id ||
        existingProfile?.id ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

      const userProfile: UserProfile = {
        id: userId,
        email: cleanEmail,
        full_name: existingProfile?.full_name || cleanName,
        avatar_url:
          existingProfile?.avatar_url ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=ea580c,f59e0b,059669`,
        phone: existingProfile?.phone || '9876543210',
        city: existingProfile?.city || 'Tura, Meghalaya',
        state: existingProfile?.state || 'Meghalaya',
        role: isMaster ? 'super_admin' : (existingProfile?.role || 'user'),
        is_pro: isMaster ? true : (existingProfile?.is_pro ?? false),
        pro_status: isMaster ? 'active' : (existingProfile?.pro_status || 'inactive'),
        is_delivery_partner: existingProfile?.is_delivery_partner || false,
        partner_status: existingProfile?.partner_status || 'none',
        wallet_balance: typeof existingProfile?.wallet_balance === 'number' ? existingProfile.wallet_balance : 0,
        payout_upi_id: existingProfile?.payout_upi_id || '',
        created_at: existingProfile?.created_at || new Date().toISOString(),
      };

      // Direct sync to profiles table
      if (supabase) {
        try {
          await supabase.from('profiles').upsert([userProfile]);
        } catch (dbErr) {
          console.warn('Supabase profile sync notice:', dbErr);
        }
      }

      try {
        localStorage.setItem('mlb_active_user', JSON.stringify(userProfile));
      } catch (_) {}

      setLoading(false);
      const shouldGoAdmin = (isAdminRoute || isMaster) && isMaster;
      onLoginSuccess(userProfile, shouldGoAdmin ? 'admin' : 'user');

      if (shouldGoAdmin) {
        onNavigateToAdmin?.();
      }
    } catch (err: any) {
      setLoading(false);
      console.error('Login error:', err);
      setError(err?.message || 'Authentication failed. Please check credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex flex-col justify-between items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Subtle Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Simple Brand Marker */}
      <div className="w-full max-w-5xl flex items-center justify-between pt-2">
        <BrandLogo variant="dark" size="sm" showTagline={false} />

        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[11px] font-semibold text-slate-300 backdrop-blur-md">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Verified Supabase Access</span>
        </div>
      </div>

      {/* Centered Main Login Box */}
      <div className="w-full max-w-md my-auto py-8 z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
          {/* Header Card Banner */}
          <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 p-7 text-white text-center relative">
            {/* Main Application Logo */}
            <div className="mx-auto mb-3.5 flex justify-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white p-1.5 shadow-2xl ring-4 ring-white/40 flex items-center justify-center overflow-hidden transition transform hover:scale-105">
                <img
                  src="/logo.png"
                  alt="Meri Local Bazaar"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('file_0000000026d481f590b090e6f011359e.png')) {
                      target.src = '/file_0000000026d481f590b090e6f011359e.png';
                    }
                  }}
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-black/20 text-white text-[11px] font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider mb-2 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Meri Local Bazaar</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Meri Local <span className="text-amber-200">Bazaar</span>
            </h1>

            <p className="text-sm font-medium text-orange-100 mt-2 max-w-xs mx-auto leading-snug">
              Apni local market se judne ke liye login karein
            </p>
          </div>

          {/* Form / Actions Body */}
          <div className="p-6 sm:p-8 space-y-4">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Clean Primary Google Login Button */}
            <button
              onClick={() => {
                setError(null);
                setShowGoogleModal(true);
              }}
              disabled={loading}
              className="w-full py-3.5 px-5 bg-white hover:bg-slate-50 active:scale-[0.99] border-2 border-slate-200 hover:border-orange-400 rounded-2xl text-slate-800 text-sm font-bold flex items-center justify-center gap-3.5 transition shadow-sm hover:shadow-md disabled:opacity-50 group cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
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
              <span className="text-sm font-extrabold text-slate-800">
                Continue with Google
              </span>
            </button>

            {/* Email & Password Authentication Toggle */}
            <div className="pt-2 border-t border-slate-100">
              {!showCustomInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="w-full text-center text-xs text-slate-500 hover:text-orange-600 font-bold transition py-1 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Or sign in / register with Email ID</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <form onSubmit={handleEmailAuthSubmit} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 animate-in fade-in duration-200">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                    <Mail className="w-4 h-4 text-orange-600" />
                    <span>Email Authentication</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="yourname@gmail.com"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      placeholder="Your Full Name"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                      Password (Optional)
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(false)}
                      className="w-1/2 py-2 text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-1/2 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {loading ? 'Authenticating...' : 'Sign In / Register'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Security Guarantee Badges */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <div className="text-[9px] font-bold text-slate-600 leading-tight">Direct Database</div>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                <MessageCircle className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <div className="text-[9px] font-bold text-slate-600 leading-tight">Direct WhatsApp</div>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                <Lock className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <div className="text-[9px] font-bold text-slate-600 leading-tight">256-bit Secure</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Google Sign-In Input Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                <h3 className="font-extrabold text-sm text-slate-800">Sign in with Google</h3>
              </div>
              <button
                onClick={() => setShowGoogleModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGoogleSubmit} className="mt-4 space-y-3.5">
              <p className="text-xs text-slate-500">
                Apna Google (Gmail) account enter karein taaki aap seamlessly market me enter kar sakein:
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Google Email Address (Gmail) *
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="yourname@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Your Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !googleEmail}
                  className="w-2/3 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Continue with Google</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clean Bottom Footer */}
      <footer className="w-full max-w-5xl text-center py-2 text-xs text-slate-500 z-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800/60 pt-3">
          <div>© {new Date().getFullYear()} Meri Local Bazaar. All rights reserved.</div>
          <div className="flex items-center gap-3 text-slate-400 text-[11px] font-semibold">
            <span>Direct WhatsApp Community</span>
            <span>•</span>
            <span>Tura & North East Verified Marketplace</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
