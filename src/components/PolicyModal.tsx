import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  ShieldCheck,
  Lock,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { PolicyType } from '../types';
import { fetchAppPolicy } from '../lib/policies';

interface PolicyModalProps {
  isOpen: boolean;
  initialType?: PolicyType;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  initialType = 'terms_conditions',
  onClose,
  onAccept,
  showAcceptButton = false,
}) => {
  const [activeTab, setActiveTab] = useState<PolicyType>(initialType);
  const [content, setContent] = useState<string>('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialType);
    }
  }, [isOpen, initialType]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadPolicy = async () => {
      setLoading(true);
      try {
        const policyData = await fetchAppPolicy(activeTab);
        if (isMounted) {
          setContent(policyData.content);
          setUpdatedAt(policyData.updatedAt || null);
        }
      } catch (e) {
        console.error('Error fetching policy:', e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPolicy();
    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col my-auto border border-slate-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              {activeTab === 'terms_conditions' ? (
                <FileText className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                {activeTab === 'terms_conditions'
                  ? 'Terms & Conditions'
                  : 'Privacy Policy'}
              </h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-orange-400" />
                Source: Supabase app_policies • Last Updated:{' '}
                {updatedAt
                  ? new Date(updatedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Latest'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('terms_conditions')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'terms_conditions'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms & Conditions</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy_policy')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'privacy_policy'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>
        </div>

        {/* Highlight Callout Box: Out for Delivery Rule & Mandatory Delivery Inspection */}
        {activeTab === 'terms_conditions' && (
          <div className="mx-4 sm:mx-6 mt-4 space-y-2.5 shrink-0">
            <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-950 space-y-1">
                <div className="font-black text-rose-900 uppercase tracking-wide">
                  Strict Legal Clause: Mandatory Expiry & Packaging Inspection on Handover
                </div>
                <p className="text-rose-800 leading-relaxed font-medium">
                  Buyer must thoroughly check the product's <strong>expiry date, packaging integrity, and condition</strong> at the exact time of delivery before confirming. <strong>Once delivery is confirmed/accepted, no subsequent complaints, refunds, or support requests regarding product expiry or condition will be entertained, and no help will be provided after that point.</strong>
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 space-y-0.5">
                <div className="font-bold text-amber-900">
                  Out for Delivery Cancellation Rule
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Prepaid order "Out for Delivery" hone ke baad cancel karne par <strong>Delivery Charges ka refund ₹0 hoga</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Policy Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-800 text-xs sm:text-sm leading-relaxed">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">Loading official policy document...</span>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-slate-700 space-y-3 font-normal whitespace-pre-wrap">
              {content}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Centralized Policy • Meri Local Bazaar</span>
          </div>

          <div className="flex items-center gap-2">
            {showAcceptButton && onAccept && (
              <button
                type="button"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>I Understand & Agree</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
