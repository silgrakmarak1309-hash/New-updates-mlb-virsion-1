import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  X,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  KeyRound,
  Mail,
  User,
} from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  targetFeatureName?: string;
  featureName?: string;
  isStandaloneScreen?: boolean;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  targetFeatureName,
  featureName,
  isStandaloneScreen = false,
}) => {
  const effectiveFeatureName = featureName || targetFeatureName || 'this feature';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

  if (!isOpen && !isStandaloneScreen) return null;

  // 1. Google OAuth / Fast Sign-In Provider
  const handleGoogleOAuthSignIn = async () => {
    // If Supabase OAuth is ready, initiate it; otherwise show email input directly
    if (supabase) {
      try {
        setLoading(true);
        const currentOrigin =
          typeof window !== 'undefined' && window.location?.origin
            ? window.location.origin
            : window.location.href.split('#')[0].split('?')[0];

        const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: currentOrigin,
          },
        });

        if (!oauthError && data?.url) {
          window.location.href = data.url;
          return;
        }
      } catch (_) {}
    }
    // Fallback: prompt for user's Google email
    setShowManualForm(true);
    setLoading(false);
  };

  // 2. Direct Supabase Auth (Email / Password / Auto-Registration)
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase client is not available.');
      return;
    }

    const cleanEmail = customEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address (e.g. yourname@gmail.com).');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const cleanName = customName.trim() || cleanEmail.split('@')[0];
    const passwordToUse = customPassword.trim() || `MLB@${cleanEmail.replace(/[^a-zA-Z0-9]/g, '')}#2026`;

    try {
      // 1. Attempt Sign In first with Supabase Auth
      let authUser: any = null;

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: passwordToUse,
      });

      if (!signInError && signInData?.user) {
        authUser = signInData.user;
      } else {
        // 2. If login failed because user doesn't exist yet, sign up in Supabase Auth
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
              emailRedirectTo: window.location.origin,
            },
          });

          if (signUpError) {
            throw signUpError;
          }

          if (signUpData?.user) {
            authUser = signUpData.user;
          }
        } else if (signInError) {
          throw signInError;
        }
      }

      if (!authUser) {
        setSuccessMsg('Confirmation email sent! Please check your inbox or try signing in.');
        setLoading(false);
        return;
      }

      // 3. Sync verified Supabase user profile to the 'profiles' database table
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const isUserAdmin = cleanEmail === 'silgrakmarak1309@gmail.com';

      const userProfile: UserProfile = {
        id: authUser.id, // TRUE SUPABASE AUTH UUID
        email: authUser.email || cleanEmail,
        full_name: existingProfile?.full_name || cleanName,
        avatar_url:
          existingProfile?.avatar_url ||
          authUser.user_metadata?.avatar_url ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=ea580c,f59e0b,059669`,
        phone: existingProfile?.phone || authUser.phone || '9876543210',
        city: existingProfile?.city || 'Tura, Meghalaya',
        state: existingProfile?.state || 'Meghalaya',
        role: (existingProfile?.role || (isUserAdmin ? 'admin' : 'user')) as any,
        is_pro: existingProfile?.is_pro ?? isUserAdmin,
        pro_status: existingProfile?.pro_status || (isUserAdmin ? 'active' : 'inactive'),
        is_delivery_partner: existingProfile?.is_delivery_partner || false,
        partner_status: existingProfile?.partner_status || 'none',
        wallet_balance: typeof existingProfile?.wallet_balance === 'number' ? existingProfile.wallet_balance : 0,
        payout_upi_id: existingProfile?.payout_upi_id || '',
        created_at: existingProfile?.created_at || new Date().toISOString(),
      };

      await supabase.from('profiles').upsert([userProfile]);

      try {
        localStorage.setItem('mlb_active_user', JSON.stringify(userProfile));
      } catch (_) {}

      onLoginSuccess(userProfile);
      onClose();
    } catch (err: any) {
      console.error('Supabase Auth error:', err);
      setError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Support Google ID Token authentication if invoked
  const handleGoogleIdToken = async (idToken: string) => {
    if (!supabase || !idToken) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: tokenError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (tokenError) throw tokenError;
      if (data?.user) {
        // Supabase session updated
        onClose();
      }
    } catch (err: any) {
      console.error('Supabase ID Token Error:', err);
      setError(err?.message || 'Google ID Token Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-w-md w-full relative animate-in zoom-in-95 duration-200">
      {/* Top Banner Gradient */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 p-6 text-white text-center relative">
        {!isStandaloneScreen && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="w-14 h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-3">
          <ShoppingBag className="w-8 h-8 text-orange-600" />
        </div>

        <div className="inline-flex items-center gap-1.5 bg-black/20 text-white text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider mb-1.5 backdrop-blur-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
          <span>Verified Supabase Auth</span>
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight">
          Meri Local <span className="text-amber-200">Bazaar</span>
        </h2>
        <p className="text-xs text-orange-100 mt-1">
          Sign in to access <strong>{effectiveFeatureName}</strong>
        </p>
      </div>

      {/* Body Content */}
      <div className="p-6 sm:p-7 space-y-4">
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Benefits Checklist */}
        <div className="bg-orange-50/60 rounded-2xl p-3.5 border border-orange-200/80 space-y-2 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Post and manage your Free & PRO bazaar listings</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Direct WhatsApp buyer leads & seller notifications</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Access Driver App & PRO Membership portals</span>
          </div>
        </div>

        {/* PRIMARY GOOGLE OAUTH LOGIN BUTTON */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleGoogleOAuthSignIn}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 rounded-2xl font-black text-sm border-2 border-slate-300 hover:border-slate-400 shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
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
            )}
            <span className="group-hover:text-orange-600 transition-colors">
              {loading ? 'Connecting with Supabase...' : 'Continue with Google (Gmail)'}
            </span>
          </button>

          {/* Quick Switch / Alternate Email & Password Supabase Login */}
          <div className="pt-2 text-center">
            {!showManualForm ? (
              <button
                type="button"
                onClick={() => setShowManualForm(true)}
                className="text-xs text-slate-600 hover:text-orange-600 font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <span>Or sign in / register with Email ID</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <form onSubmit={handleEmailAuthSubmit} className="space-y-3 pt-2 text-left bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-in fade-in duration-200">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <Mail className="w-4 h-4 text-orange-600" />
                  <span>Direct Supabase Auth Signup / Login</span>
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                    Your Name (for profile)
                  </label>
                  <input
                    type="text"
                    placeholder="Your Full Name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                    Password (Optional - auto-generated if blank)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowManualForm(false)}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Authenticating...' : 'Sign In / Register in Supabase'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Security & Privacy note */}
        <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5 border-t border-slate-100 pt-3">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Real-time Sync with Supabase Auth Dashboard</span>
        </div>
      </div>
    </div>
  );

  if (isStandaloneScreen) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      {content}
    </div>
  );
};

