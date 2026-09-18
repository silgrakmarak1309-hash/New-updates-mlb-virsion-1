import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe environment variable getter supporting Vite (import.meta.env) and Node/Vercel (process.env)
export function getEnvVar(key: string, fallback: string = ''): string {
  try {
    // 1. Check Vite import.meta.env
    const metaAny = import.meta as any;
    if (
      typeof metaAny !== 'undefined' &&
      metaAny?.env &&
      typeof metaAny.env[key] === 'string' &&
      metaAny.env[key]
    ) {
      return metaAny.env[key];
    }
  } catch (_) {
    // Ignore in non-Vite runtimes
  }

  try {
    // 2. Check Node/Vercel process.env
    if (
      typeof process !== 'undefined' &&
      process.env &&
      typeof process.env[key] === 'string' &&
      process.env[key]
    ) {
      return process.env[key]!;
    }
  } catch (_) {
    // Ignore in browser environments without process shim
  }

  return fallback;
}

export function cleanString(val: string | undefined): string {
  if (!val) return '';
  let cleaned = val.trim();
  // Strip quotes if they were passed literally in the env string
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

export function normalizeSupabaseUrl(
  rawUrl: string | undefined,
  defaultUrl: string = 'https://qljyucqxgpzfehqwggbv.supabase.co'
): string {
  const cleaned = cleanString(rawUrl);
  if (!cleaned) return defaultUrl;

  let candidate = cleaned;
  // If only a project reference ID was provided (e.g. qljyucqxgpzfehqwggbv)
  if (!candidate.startsWith('http://') && !candidate.startsWith('https://')) {
    if (/^[a-zA-Z0-9_-]+$/.test(candidate)) {
      candidate = `https://${candidate}.supabase.co`;
    } else {
      candidate = `https://${candidate}`;
    }
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.origin;
    }
  } catch (e) {
    console.warn('URL parsing failed for:', candidate, e);
  }

  return defaultUrl;
}

export const SUPABASE_URL = 'https://qljyucqxgpzfehqwggbv.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_suwaB7Frskcl5QBa004Xig_3umP58N9';

export interface SupabaseInitState {
  client: SupabaseClient | null;
  error: string | null;
  isConfigured: boolean;
}

export function initSupabase(): SupabaseInitState {
  try {
    const validUrl = 'https://qljyucqxgpzfehqwggbv.supabase.co';
    const validKey = 'sb_publishable_suwaB7Frskcl5QBa004Xig_3umP58N9';

    const client = createClient(validUrl, validKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    return {
      client,
      error: null,
      isConfigured: true,
    };
  } catch (err: any) {
    console.error('Supabase Initialization Exception:', err);
    return {
      client: null,
      error: err?.message || 'Failed to initialize Supabase client safely.',
      isConfigured: false,
    };
  }
}

// Export singleton instance safely
export const supabaseState = initSupabase();
export const supabase = supabaseState.client;
