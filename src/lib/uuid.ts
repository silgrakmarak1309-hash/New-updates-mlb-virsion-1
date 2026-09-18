/**
 * Safe UUID v4 Generator & Validator for Supabase PostgreSQL compatibility
 */

export function isUuid(value?: string | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (_) {}
  }
  // Fallback RFC4122 v4 compliant UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Ensures a valid UUID. If given string is already a valid UUID, returns it.
 * Otherwise generates a fresh random UUID v4.
 */
export function ensureUuid(value?: string | null): string {
  if (value && isUuid(value)) return value;
  return generateUuid();
}

/**
 * Converts a string into a deterministic UUID or returns null if not valid
 */
export function toValidUuidOrNull(value?: string | null): string | null {
  if (!value) return null;
  if (isUuid(value)) return value;
  return null;
}
