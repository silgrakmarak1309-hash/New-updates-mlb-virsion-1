import React, { useState, useEffect } from 'react';
import {
  Plus,
  Eye,
  MessageCircle,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Tag,
  MapPin,
  Camera,
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Building,
} from 'lucide-react';
import { Listing, UserProfile, DeliveryOrder, PayoutRequest, formatPrice, getListingPrimaryImage, getListingImages } from '../types';
import { formatWhatsAppUrl } from './ListingDetailModal';
import { PayoutRequestModal } from './PayoutRequestModal';
import { supabase } from '../lib/supabase';

interface MyAdsManagementProps {
  myListings: Listing[];
  currentUser?: UserProfile;
  orders?: DeliveryOrder[];
  payoutRequests?: PayoutRequest[];
  onOpenSubmitModal: () => void;
  onViewListing: (listing: Listing) => void;
  onDeleteListing: (id: string) => void;
  onToggleListingStatus: (id: string, currentStatus: string) => void;
  onRequestPayout?: (payoutData: {
    amount: number;
    upi_id: string;
    bank_name?: string;
    account_no?: string;
    ifsc_code?: string;
    user_role: string;
  }) => Promise<void> | void;
}

export const MyAdsManagement: React.FC<MyAdsManagementProps> = ({
  myListings,
  currentUser,
  orders = [],
  payoutRequests = [],
  onOpenSubmitModal,
  onViewListing,
  onDeleteListing,
  onToggleListingStatus,
  onRequestPayout,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'rejected'>('all');
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  const filtered = myListings.filter((l) => {
    if (filter === 'all') return true;
    return l.status === filter;
  });

  // Calculate real-time earnings and wallet statistics
  const userPayouts = payoutRequests.filter(
    (p) =>
      (currentUser && (p.driver_id === currentUser.id || p.driver_phone === currentUser.phone || p.user_id === currentUser.id || p.user_phone === currentUser.phone)) ||
      (currentUser && (p.driver_name === currentUser.full_name || p.user_name === currentUser.full_name))
  );

  const pendingPayoutAmount = userPayouts
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const completedPayoutAmount = userPayouts
    .filter((p) => p.status === 'approved' || p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Active listings inventory value
  const totalListingsValue = myListings
    .filter((l) => l.status === 'active')
    .reduce((sum, l) => sum + (l.price || 0), 0);

  // Real-time sales earnings from fulfilled orders
  const myCompletedSales = (orders || []).filter(
    (o) =>
      currentUser &&
      (o.seller_phone === currentUser.phone || o.seller_name === currentUser.full_name) &&
      (o.status === 'success' || o.status === 'delivered')
  );
  const totalSalesRevenue = myCompletedSales.reduce((sum, o) => sum + (o.product_price || o.total_paid || o.total_fare || 0), 0);

  // Authoritative wallet balance synchronized with public.profiles.wallet_balance
  const [profileWalletBalance, setProfileWalletBalance] = useState<number | null>(() => {
    if (typeof currentUser?.wallet_balance === 'number') {
      return currentUser.wallet_balance;
    }
    return 0;
  });

  // Keep local state in sync when currentUser prop updates
  useEffect(() => {
    if (typeof currentUser?.wallet_balance === 'number') {
      setProfileWalletBalance(currentUser.wallet_balance);
    }
  }, [currentUser?.wallet_balance]);

  useEffect(() => {
    let isMounted = true;
    async function syncSellerWalletBalance() {
      if (!supabase || !currentUser) return;
      try {
        const targetEmail = currentUser?.email?.toLowerCase().trim();
        const targetUserId = currentUser?.id;
        const targetPhone = currentUser?.phone;

        // Query profiles table directly for authoritative balance
        const { data: profilesList, error: profErr } = await supabase
          .from('profiles')
          .select('id, email, phone, wallet_balance');

        if (profilesList && profilesList.length > 0 && isMounted) {
          const matched = profilesList.find((p: any) =>
            (targetUserId && p.id === targetUserId) ||
            (targetEmail && p.email && p.email.toLowerCase().trim() === targetEmail) ||
            (targetPhone && p.phone && p.phone === targetPhone)
          );

          if (matched && typeof matched.wallet_balance === 'number') {
            setProfileWalletBalance(Number(matched.wallet_balance));
            return;
          }
        }
      } catch (err) {
        console.warn('Seller wallet direct sync notice:', err);
      }
    }

    syncSellerWalletBalance();

    // // Add Supabase Realtime subscription on public.profiles
    const channel = supabase
      .channel(`seller-wallet-realtime-${currentUser?.id || 'active'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload: any) => {
          const newRow = payload?.new;
          if (newRow && isMounted && currentUser) {
            const isMatch =
              newRow.id === currentUser.id ||
              (currentUser.email && newRow.email && newRow.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) ||
              (currentUser.phone && newRow.phone && newRow.phone === currentUser.phone);

            if (isMatch && newRow.wallet_balance !== undefined && newRow.wallet_balance !== null) {
              // Strict typeof condition hatakar directly data handle karein
              setProfileWalletBalance(Number(newRow.wallet_balance));
            }
          }
        }
      )
      .subscribe();

    const intervalId = setInterval(syncSellerWalletBalance, 3000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.phone]);

  const currentBaseBalance = Number(profileWalletBalance ?? currentUser?.wallet_balance ?? 0);

  const availableWalletBalance = Math.max(
    0,
    currentBaseBalance - pendingPayoutAmount
  );

  return (
    <div className="space-y-6">
      {/* 1. VISUALLY PROMINENT SELLER WALLET BALANCE CARD */}
      <div
        id="seller_wallet_balance_card"
        className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-orange-500/40 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden"
      >
        {/* Decorative Background Accent */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Balance and Shop Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-orange-500/20 text-orange-400 border border-orange-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Seller Earnings Wallet
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                {currentUser?.shop_name || 'Verified Merchant Store'}
              </span>
            </div>

            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Available Wallet Balance
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight mt-1 flex items-baseline gap-2">
                <span className="text-orange-400">₹</span>
                <span>{formatPrice(availableWalletBalance)}</span>
                <span className="text-xs text-emerald-400 font-sans font-bold bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                  100% Guaranteed Settlement
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Active Ads Catalog</div>
                <div className="text-sm font-black text-white mt-0.5">
                  ₹{formatPrice(totalListingsValue)}
                </div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Pending Payouts</div>
                <div className="text-sm font-black text-amber-400 mt-0.5">
                  ₹{formatPrice(pendingPayoutAmount)}
                </div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 col-span-2 sm:col-span-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Withdrawn</div>
                <div className="text-sm font-black text-emerald-400 mt-0.5">
                  ₹{formatPrice(completedPayoutAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Interactive Request Payout / Withdraw Action */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              id="seller_request_payout_btn"
              onClick={() => setIsPayoutModalOpen(true)}
              className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-slate-950" />
              <span>Request Payout / Withdraw</span>
              <ArrowUpRight className="w-4 h-4 text-slate-950" />
            </button>

            <button
              onClick={onOpenSubmitModal}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post New Product Ad</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN ADS LISTINGS SECTION */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">My Ads Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track and manage your submitted listings, moderation status, and incoming WhatsApp inquiries.
            </p>
          </div>

          <button
            onClick={onOpenSubmitModal}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Submit Listing Request
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'active', 'pending', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                filter === status
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status} ({myListings.filter((l) => (status === 'all' ? true : l.status === status)).length})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Tag className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No {filter} listings found</p>
            <p className="text-xs text-slate-400 mt-1">Submit your product listing to advertise locally.</p>
            <button
              onClick={onOpenSubmitModal}
              className="mt-4 px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl hover:bg-orange-700 transition"
            >
              Submit First Listing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="border border-slate-200 rounded-2xl p-4 bg-white hover:border-slate-300 transition flex flex-col justify-between space-y-3"
              >
                <div className="flex gap-3.5">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                    <img
                      src={getListingPrimaryImage(item)}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    {getListingImages(item).length > 1 && (
                      <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                        <Camera className="w-2.5 h-2.5 text-orange-400" />
                        {getListingImages(item).length}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-emerald-600 font-black text-base">
                        ₹{formatPrice(item.price)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          item.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-800 text-sm truncate mt-0.5">{item.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {item.location_name}
                      </span>
                      <span>•</span>
                      <span>{item.category_name}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewListing(item)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>

                    <a
                      href={formatWhatsAppUrl(item.whatsapp || item.phone, item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        onToggleListingStatus(
                          item.id,
                          item.status === 'active' ? 'rejected' : 'active'
                        )
                      }
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      {item.status === 'active' ? 'Pause Ad' : 'Activate'}
                    </button>
                    <button
                      onClick={() => onDeleteListing(item.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete Ad"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout Modal */}
      {currentUser && (
        <PayoutRequestModal
          isOpen={isPayoutModalOpen}
          onClose={() => setIsPayoutModalOpen(false)}
          currentUser={currentUser}
          availableBalance={availableWalletBalance}
          userRoleLabel="Shopkeeper / Seller"
          onSubmitPayout={async (payoutData) => {
            if (onRequestPayout) {
              await onRequestPayout(payoutData);
            }
          }}
        />
      )}
    </div>
  );
};
