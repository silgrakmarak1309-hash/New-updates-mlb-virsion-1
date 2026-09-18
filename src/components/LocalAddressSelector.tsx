import React, { useEffect } from 'react';
import { MapPin, Building2, Home, Landmark } from 'lucide-react';
import {
  MEGHALAYA_STATE,
  MEGHALAYA_DISTRICTS,
  ALL_STATES,
  getBlocksForDistrict,
} from '../lib/meghalayaLocations';

export interface LocalAddressState {
  state: string;
  district: string;
  block: string;
  village: string;
}

interface LocalAddressSelectorProps {
  values: LocalAddressState;
  onChange: (field: keyof LocalAddressState, value: string) => void;
  errors?: Partial<Record<keyof LocalAddressState, string>>;
  required?: boolean;
  compact?: boolean;
  disabled?: boolean;
  theme?: 'dark' | 'light' | 'emerald' | 'amber' | 'blue';
  idPrefix?: string;
}

export const LocalAddressSelector: React.FC<LocalAddressSelectorProps> = ({
  values,
  onChange,
  errors = {},
  required = true,
  compact = false,
  disabled = false,
  theme = 'light',
  idPrefix = 'loc',
}) => {
  const isMeghalaya = !values.state || values.state.toLowerCase() === 'meghalaya';
  const availableBlocks = getBlocksForDistrict(values.district);

  // Auto-set default state to Meghalaya if empty
  useEffect(() => {
    if (!values.state) {
      onChange('state', MEGHALAYA_STATE);
    }
  }, [values.state, onChange]);

  // When district changes, if block isn't valid, reset or pick first block if appropriate
  const handleDistrictChange = (newDistrict: string) => {
    onChange('district', newDistrict);
    const blocks = getBlocksForDistrict(newDistrict);
    if (blocks.length > 0 && (!values.block || !blocks.includes(values.block))) {
      onChange('block', blocks[0]);
    }
  };

  const isDark = theme === 'dark';
  const inputBgClass = isDark
    ? 'bg-slate-900/90 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20'
    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:ring-emerald-600/15';

  const labelClass = isDark
    ? 'text-xs font-semibold text-slate-300'
    : 'text-xs font-semibold text-slate-700';

  const cardBorderClass = isDark
    ? 'bg-slate-800/40 border-slate-700/70'
    : 'bg-slate-50/70 border-slate-200/80';

  return (
    <div
      id={`${idPrefix}_address_container`}
      className={`rounded-xl border ${cardBorderClass} p-3 sm:p-4 space-y-3.5 transition-all`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className={`text-xs sm:text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Local Location Details
            </h4>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              State, District, Block & Village / Area
            </p>
          </div>
        </div>
        {required && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            Required
          </span>
        )}
      </div>

      <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'} gap-3`}>
        {/* 1. STATE */}
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}_state`} className={`flex items-center gap-1.5 ${labelClass}`}>
            <Landmark className="w-3.5 h-3.5 text-emerald-500" />
            <span>State</span>
            {required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <select
              id={`${idPrefix}_state`}
              value={values.state || MEGHALAYA_STATE}
              disabled={disabled}
              onChange={(e) => {
                const newState = e.target.value;
                onChange('state', newState);
                if (newState.toLowerCase() === 'meghalaya' && !values.district) {
                  onChange('district', 'West Garo Hills');
                  onChange('block', 'Rongram');
                }
              }}
              className={`w-full rounded-lg border px-3 py-2 text-xs sm:text-sm transition shadow-2xs font-medium ${inputBgClass} ${
                errors.state ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
              }`}
            >
              {ALL_STATES.map((st) => (
                <option key={st} value={st} className={isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}>
                  {st}
                </option>
              ))}
            </select>
          </div>
          {errors.state && <p className="text-[10px] text-red-500 font-medium">{errors.state}</p>}
        </div>

        {/* 2. DISTRICT */}
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}_district`} className={`flex items-center gap-1.5 ${labelClass}`}>
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
            <span>District</span>
            {required && <span className="text-red-500">*</span>}
          </label>
          {isMeghalaya ? (
            <select
              id={`${idPrefix}_district`}
              value={values.district || ''}
              disabled={disabled}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-xs sm:text-sm transition shadow-2xs font-medium ${inputBgClass} ${
                errors.district ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
              }`}
            >
              <option value="" disabled className={isDark ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-400'}>
                Select District
              </option>
              {MEGHALAYA_DISTRICTS.map((d) => (
                <option key={d.name} value={d.name} className={isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}>
                  {d.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`${idPrefix}_district_text`}
              type="text"
              placeholder="Enter District Name"
              value={values.district || ''}
              disabled={disabled}
              onChange={(e) => onChange('district', e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-xs sm:text-sm transition shadow-2xs ${inputBgClass} ${
                errors.district ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
              }`}
            />
          )}
          {errors.district && <p className="text-[10px] text-red-500 font-medium">{errors.district}</p>}
        </div>

        {/* 3. BLOCK */}
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}_block`} className={`flex items-center gap-1.5 ${labelClass}`}>
            <Building2 className="w-3.5 h-3.5 text-purple-500" />
            <span>C&RD Block</span>
            {required && <span className="text-red-500">*</span>}
          </label>
          {isMeghalaya && values.district ? (
            <div className="space-y-1">
              <select
                id={`${idPrefix}_block`}
                value={values.block || ''}
                disabled={disabled}
                onChange={(e) => onChange('block', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-xs sm:text-sm transition shadow-2xs font-medium ${inputBgClass} ${
                  errors.block ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
                }`}
              >
                <option value="" disabled className={isDark ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-400'}>
                  Select Block
                </option>
                {availableBlocks.map((b) => (
                  <option key={b} value={b} className={isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}>
                    {b}
                  </option>
                ))}
                <option value="Other Block" className={isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}>
                  Other Block / Town
                </option>
              </select>
              {values.block === 'Other Block' && (
                <input
                  id={`${idPrefix}_block_other`}
                  type="text"
                  placeholder="Specify Block Name"
                  disabled={disabled}
                  onChange={(e) => onChange('block', e.target.value)}
                  className={`w-full mt-1 rounded-lg border px-3 py-1.5 text-xs transition shadow-2xs ${inputBgClass}`}
                />
              )}
            </div>
          ) : (
            <input
              id={`${idPrefix}_block_text`}
              type="text"
              placeholder="e.g., Rongram, Mylliem, etc."
              value={values.block || ''}
              disabled={disabled}
              onChange={(e) => onChange('block', e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-xs sm:text-sm transition shadow-2xs ${inputBgClass} ${
                errors.block ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
              }`}
            />
          )}
          {errors.block && <p className="text-[10px] text-red-500 font-medium">{errors.block}</p>}
        </div>

        {/* 4. VILLAGE / LOCALITY */}
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}_village`} className={`flex items-center gap-1.5 ${labelClass}`}>
            <Home className="w-3.5 h-3.5 text-amber-500" />
            <span>Village / Area / Locality</span>
            {required && <span className="text-red-500">*</span>}
          </label>
          <input
            id={`${idPrefix}_village`}
            type="text"
            placeholder="e.g. Asanang, Hawakhana, Laitumkhrah"
            value={values.village || ''}
            disabled={disabled}
            onChange={(e) => onChange('village', e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-xs sm:text-sm transition shadow-2xs ${inputBgClass} ${
              errors.village ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
            }`}
          />
          {errors.village && <p className="text-[10px] text-red-500 font-medium">{errors.village}</p>}
        </div>
      </div>
    </div>
  );
};
