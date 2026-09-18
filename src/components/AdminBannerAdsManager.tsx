import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
  Link,
  Upload,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { BannerAd } from '../types';
import { uploadListingImageToStorage } from '../lib/storage';

interface AdminBannerAdsManagerProps {
  bannerAds: BannerAd[];
  onCreateBanner: (banner: Omit<BannerAd, 'id' | 'created_at'>) => Promise<void> | void;
  onUpdateBanner: (id: string, updates: Partial<BannerAd>) => Promise<void> | void;
  onDeleteBanner: (id: string) => Promise<void> | void;
  onToggleActive: (id: string, currentStatus: boolean) => Promise<void> | void;
}

export const AdminBannerAdsManager: React.FC<AdminBannerAdsManagerProps> = ({
  bannerAds,
  onCreateBanner,
  onUpdateBanner,
  onDeleteBanner,
  onToggleActive,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [orderIndex, setOrderIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be under 5MB.');
      return;
    }

    setUploadError(null);
    setIsSubmitting(true);
    uploadListingImageToStorage(file)
      .then((publicUrl) => {
        setImageUrl(publicUrl);
        setIsSubmitting(false);
      })
      .catch((err) => {
        console.error('Banner upload error to "Listing image":', err);
        setUploadError(`Failed to upload to "Listing image" bucket: ${err.message || err}`);
        setIsSubmitting(false);
      });
  };

  const handleEditClick = (banner: BannerAd) => {
    setEditingId(banner.id);
    setTitle(banner.title || '');
    setImageUrl(banner.image_url);
    setTargetUrl(banner.target_url || '');
    setIsActive(banner.is_active);
    setOrderIndex(banner.order_index ?? 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setImageUrl('');
    setTargetUrl('');
    setIsActive(true);
    setOrderIndex(0);
    setUploadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      setUploadError('Please provide a Banner Image URL or upload an image.');
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);

    try {
      if (editingId) {
        await onUpdateBanner(editingId, {
          title: title.trim() || undefined,
          image_url: imageUrl.trim(),
          target_url: targetUrl.trim() || undefined,
          is_active: isActive,
          order_index: Number(orderIndex) || 0,
        });
      } else {
        await onCreateBanner({
          title: title.trim() || undefined,
          image_url: imageUrl.trim(),
          target_url: targetUrl.trim() || undefined,
          is_active: isActive,
          order_index: Number(orderIndex) || 0,
        });
      }
      handleCancelEdit();
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to save banner.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sqlSchema = `-- Supabase SQL table for custom banner ads
CREATE TABLE IF NOT EXISTS public.banner_ads (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title text,
  image_url text NOT NULL,
  target_url text,
  is_active boolean DEFAULT true,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable public read for buyer hero carousel
ALTER TABLE public.banner_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read active banner ads" 
  ON public.banner_ads FOR SELECT USING (true);
CREATE POLICY "Allow all actions for admin" 
  ON public.banner_ads FOR ALL USING (true);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-3xl text-white shadow-md border border-slate-700">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h3 className="text-xl font-black">Hero Banner Ads Manager</h3>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Publish visual hero promotional banners on the User Homepage (Marketplace) with optional redirect URLs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700 text-center">
            <div className="text-xs text-slate-400">Total Banners</div>
            <div className="text-base font-black text-white">{bannerAds.length}</div>
          </div>
          <div className="px-3.5 py-1.5 bg-emerald-950/80 rounded-xl border border-emerald-700 text-center">
            <div className="text-xs text-emerald-400">Active Live</div>
            <div className="text-base font-black text-emerald-300">
              {bannerAds.filter((b) => b.is_active).length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Form: Upload & Configuration */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-orange-600" />
              <span>{editingId ? 'Edit Banner Ad' : 'Add New Banner Ad'}</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter banner image URL or upload photo, set redirect link, and activate/deactivate.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column: Form Inputs */}
            <div className="space-y-4">
              {/* Banner Title / Slogan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Banner Title / Campaign Tag (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mega Summer Festival Sale • Flat 40% Off"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Image URL Input & File Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Banner Image URL or Photo Upload *
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or paste image URL"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder:text-slate-400 font-mono text-xs"
                  />
                  <label className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {uploadError && (
                  <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{uploadError}</span>
                  </p>
                )}
              </div>

              {/* Target Website Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Target Website URL (Optional)</span>
                  <span className="text-[10px] text-slate-400 font-normal normal-case">
                    Opens external browser when clicked
                  </span>
                </label>
                <div className="relative">
                  <Link className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. https://mywebsite.com or https://wa.me/919876543210"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder:text-slate-400 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Toggles: Active Status & Order Index */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                {/* Active Toggle */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Banner Status</div>
                    <div className="text-[11px] text-slate-500">
                      {isActive ? 'Active on Homepage' : 'Disabled / Hidden'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isActive ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Priority Order Index */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Display Priority (Order)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={orderIndex}
                    onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1 bg-white rounded-lg border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Real-time Live Preview */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Live Preview (Buyer Homepage View)
              </label>
              <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner flex items-center justify-center group">
                {imageUrl.trim() ? (
                  <>
                    <img
                      src={imageUrl}
                      alt={title || 'Preview'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).setAttribute(
                          'src',
                          'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80'
                        );
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md text-amber-300 text-[10px] font-black rounded-full border border-amber-400/30 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                        <span>FEATURED</span>
                      </span>
                    </div>
                    {targetUrl && (
                      <div className="absolute top-3 right-3 pointer-events-none">
                        <span className="px-2 py-0.5 bg-orange-600 text-white text-[10px] font-black rounded-full backdrop-blur-md flex items-center gap-1">
                          <span>Visit Link</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
                      {title && (
                        <div className="text-white text-sm font-black drop-shadow line-clamp-1">
                          {title}
                        </div>
                      )}
                      {targetUrl && (
                        <div className="text-white/80 text-[10px] font-semibold drop-shadow flex items-center gap-1 mt-0.5 truncate font-mono">
                          <Link className="w-3 h-3 text-orange-400 shrink-0" />
                          <span className="truncate">{targetUrl}</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 text-slate-500">
                    <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                    <p className="text-xs font-bold text-slate-400">Banner image preview will appear here</p>
                    <p className="text-[11px] text-slate-500 mt-1">Recommended size: 1200 x 400 pixels (3:1 ratio)</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl transition shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving to banner_ads...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingId ? 'Update Banner Ad' : 'Save & Publish Banner'}</span>
                </>
              )}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Existing Banners Inventory Table/Cards */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-black text-slate-900">
              Configured Banner Ads ({bannerAds.length})
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Live banner ads currently in rotation. You can toggle active status, edit, or delete them.
            </p>
          </div>
        </div>

        {bannerAds.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
            <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-700">No Banner Ads Created Yet</div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Use the form above to add your first promotional banner ad for the buyer homepage carousel.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bannerAds.map((banner) => (
              <div
                key={banner.id}
                className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                  banner.is_active
                    ? 'border-slate-200 bg-white shadow-xs hover:shadow-md'
                    : 'border-slate-200 bg-slate-50/70 opacity-70'
                }`}
              >
                {/* Thumbnail Header */}
                <div className="relative h-32 w-full bg-slate-900 overflow-hidden">
                  <img
                    src={banner.image_url}
                    alt={banner.title || 'Banner'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).setAttribute(
                        'src',
                        'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80'
                      );
                    }}
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    {banner.is_active ? (
                      <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-full shadow flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Live Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] font-bold rounded-full shadow flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Inactive
                      </span>
                    )}
                  </div>
                  {banner.order_index !== undefined && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-full">
                      Priority: {banner.order_index}
                    </div>
                  )}
                </div>

                {/* Details Body */}
                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm line-clamp-1">
                      {banner.title || 'Untitled Banner Campaign'}
                    </h5>
                    {banner.target_url ? (
                      <a
                        href={banner.target_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-orange-600 hover:underline font-mono truncate max-w-full mt-1"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{banner.target_url}</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic block mt-1">
                        No target URL (Display only)
                      </span>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                    {/* Active Toggle Button */}
                    <button
                      type="button"
                      onClick={() => onToggleActive(banner.id, banner.is_active)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        banner.is_active
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {banner.is_active ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEditClick(banner)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                        title="Edit Banner"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this banner ad?')) {
                            onDeleteBanner(banner.id);
                          }
                        }}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                        title="Delete Banner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SQL Migration Assistant Accordion */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setShowSqlGuide(!showSqlGuide)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-bold text-slate-800">
              Supabase SQL Migration Script for banner_ads table
            </span>
          </div>
          <span className="text-xs font-semibold text-orange-600">
            {showSqlGuide ? 'Hide Script ▲' : 'View SQL Script ▼'}
          </span>
        </button>

        {showSqlGuide && (
          <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-slate-600">
                Run this in your <strong>Supabase SQL Editor</strong> to create the <code>banner_ads</code> table.
              </p>
              <button
                type="button"
                onClick={copySqlToClipboard}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition flex items-center gap-1 shadow-2xs"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto select-all">
              {sqlSchema}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
