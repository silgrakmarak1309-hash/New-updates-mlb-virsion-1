import { supabase } from './supabase';
import { CartItem, Listing } from '../types';
import { dispatchAppToast, showDevicePushAlert } from './notifications';

export function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Ensures any string (e.g. 'ad_101', custom ids) produces a valid RFC 4122 UUID
 * for PostgreSQL UUID columns if required by schema.
 */
export function toValidUuid(rawId: string): string {
  if (!rawId) return '00000000-0000-4000-8000-000000000000';
  if (isUuid(rawId)) return rawId;

  // Specific mapping for ad_101, ad_102, etc.
  if (/^ad_\d+$/i.test(rawId)) {
    const num = rawId.replace(/ad_/i, '').padStart(4, '0');
    return `a0eebc99-9c0b-4ef8-bb6d-6bb9bd38${num}`;
  }

  // General deterministic mapping
  let hex = '';
  for (let i = 0; i < rawId.length; i++) {
    hex += rawId.charCodeAt(i).toString(16);
  }
  hex = hex.padEnd(32, '0').substring(0, 32);
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-4${hex.substring(13, 16)}-a${hex.substring(17, 20)}-${hex.substring(20, 32)}`;
}

const ACTIVE_CART_KEY = 'mlb_active_cart';

function getCartStorageKey(userId?: string): string {
  return userId ? `mlb_cart_${userId}` : ACTIVE_CART_KEY;
}

/**
 * Retrieve cached local cart items synchronously for instant UI updates
 */
export function getStoredLocalCart(userId?: string): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getCartStorageKey(userId);
    const raw = localStorage.getItem(key) || localStorage.getItem(ACTIVE_CART_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return [];
}

/**
 * Persist cart items locally and dispatch reactive window update event
 */
export function saveStoredLocalCart(items: CartItem[], userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify(items);
    localStorage.setItem(ACTIVE_CART_KEY, payload);
    if (userId) {
      localStorage.setItem(`mlb_cart_${userId}`, payload);
    }

    const totalQty = items.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
    window.dispatchEvent(
      new CustomEvent('mlb_cart_updated', {
        detail: { count: totalQty, items },
      })
    );
  } catch (_) {}
}

/**
 * Fetch all cart items for a given user from Supabase `cart_items` table.
 * Merges seamlessly with locally cached cart items.
 */
export async function fetchUserCart(userId?: string): Promise<CartItem[]> {
  const localItems = getStoredLocalCart(userId);
  if (!userId) return localItems;

  let dbItems: CartItem[] = [];

  if (supabase) {
    try {
      // 1. Try Supabase relation join first
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, listing:listings(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && Array.isArray(data)) {
        dbItems = data.map((item: any) => ({
          id: String(item.id || `cart_${Math.random().toString(36).substring(2, 9)}`),
          user_id: item.user_id,
          listing_id: item.listing_id,
          quantity: Math.max(1, Number(item.quantity) || 1),
          created_at: item.created_at,
          updated_at: item.updated_at,
          listing: item.listing as Listing | undefined,
        }));
      } else {
        // 2. Fallback: Flat select if join is not configured in foreign keys
        const { data: flatData, error: flatError } = await supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!flatError && flatData && flatData.length > 0) {
          const listingIds = flatData.map((d: any) => d.listing_id).filter(Boolean);
          let listingsMap: Record<string, Listing> = {};

          if (listingIds.length > 0) {
            const { data: listingsData } = await supabase
              .from('listings')
              .select('*')
              .in('id', listingIds);

            if (listingsData) {
              listingsMap = listingsData.reduce((acc: Record<string, Listing>, l: any) => {
                acc[l.id] = l as Listing;
                return acc;
              }, {});
            }
          }

          dbItems = flatData.map((item: any) => ({
            id: String(item.id || `cart_${Math.random().toString(36).substring(2, 9)}`),
            user_id: item.user_id,
            listing_id: item.listing_id,
            quantity: Math.max(1, Number(item.quantity) || 1),
            created_at: item.created_at,
            updated_at: item.updated_at,
            listing: listingsMap[item.listing_id],
          }));
        }
      }
    } catch (err) {
      console.warn('[Cart Engine] Supabase fetch fallback to local:', err);
    }
  }

  // Merge dbItems with localItems to prevent any item drops
  const mergedMap = new Map<string, CartItem>();

  localItems.forEach((li) => {
    mergedMap.set(String(li.listing_id), li);
  });

  dbItems.forEach((di) => {
    const existing = mergedMap.get(String(di.listing_id));
    if (existing) {
      // Merge listing details if missing in db
      mergedMap.set(String(di.listing_id), {
        ...di,
        listing: di.listing || existing.listing,
        quantity: Math.max(di.quantity, existing.quantity),
      });
    } else {
      mergedMap.set(String(di.listing_id), di);
    }
  });

  const finalCart = Array.from(mergedMap.values());
  saveStoredLocalCart(finalCart, userId);
  return finalCart;
}

/**
 * Add a listing to cart or increment quantity if already present.
 * Instant local persistence + live badge update + Android Status Bar push notification + Supabase upsert.
 */
export async function addToCart(
  userId?: string,
  listingOrId?: Listing | string,
  quantityToAdd: number = 1
): Promise<{ success: boolean; updatedItem?: CartItem; error?: string }> {
  try {
    if (!listingOrId) {
      return { success: false, error: 'Listing or ID is required' };
    }

    const listingId = typeof listingOrId === 'string' ? listingOrId : listingOrId.id;
    const listingObj: Listing | undefined =
      typeof listingOrId === 'object' && listingOrId !== null ? listingOrId : undefined;

    const itemTitle = listingObj?.title || 'Product Item';
    const effectiveUserId = userId || 'guest_user';
    const nowTimestamp = new Date().toISOString();

    // 1. Read existing local cart
    const currentCart = getStoredLocalCart(userId);
    const existingIndex = currentCart.findIndex(
      (item) => String(item.listing_id) === String(listingId)
    );

    let resultingItem: CartItem;
    let newCart: CartItem[];

    if (existingIndex >= 0) {
      // Item already in cart -> increment quantity
      const existing = currentCart[existingIndex];
      const newQty = (existing.quantity || 1) + Math.max(1, quantityToAdd);
      resultingItem = {
        ...existing,
        quantity: newQty,
        updated_at: nowTimestamp,
        listing: listingObj || existing.listing,
      };
      newCart = [...currentCart];
      newCart[existingIndex] = resultingItem;
    } else {
      // Fresh item added to cart
      resultingItem = {
        id: `cart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        user_id: effectiveUserId,
        listing_id: listingId,
        quantity: Math.max(1, quantityToAdd),
        created_at: nowTimestamp,
        updated_at: nowTimestamp,
        listing: listingObj,
      };
      newCart = [resultingItem, ...currentCart];
    }

    // 2. Persist locally & emit 'mlb_cart_updated' event for instant badge sync
    saveStoredLocalCart(newCart, userId);

    // 3. Trigger Global Interactive In-App Toast
    dispatchAppToast({
      title: '🛒 Added to Cart',
      message: `"${itemTitle}" added to your shopping cart. Total: ${newCart.reduce((s, i) => s + i.quantity, 0)} item(s).`,
      type: 'success',
      duration: 3500,
    });

    // 4. Trigger System Status Bar Push Alert (Android notification panel)
    showDevicePushAlert(
      '🛒 Added to Cart',
      `"${itemTitle}" has been added to your shopping cart. Tap to view cart or checkout.`,
      {
        tag: `cart_${listingId}`,
        data: { url: '/?tab=cart' },
      }
    );

    // 5. Authoritative Supabase synchronization targeting public.cart_items
    if (supabase) {
      (async () => {
        try {
          // Resolve verified user session ID
          let activeUserId = userId;
          if (!activeUserId || activeUserId === 'guest_user') {
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              if (sessionData?.session?.user?.id) {
                activeUserId = sessionData.session.user.id;
              }
            } catch (_) {}
          }
          if (!activeUserId || activeUserId === 'guest_user') {
            try {
              const stored = localStorage.getItem('mlb_active_user');
              if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed?.id) activeUserId = parsed.id;
              }
            } catch (_) {}
          }

          if (activeUserId && activeUserId !== 'guest_user') {
            const dbUserId = isUuid(activeUserId) ? activeUserId : toValidUuid(activeUserId);
            const dbListingId = isUuid(listingId) ? listingId : toValidUuid(listingId);

            // Check if cart item already exists in public.cart_items
            const { data: existingDb, error: selectErr } = await supabase
              .from('cart_items')
              .select('id, quantity')
              .eq('user_id', dbUserId)
              .eq('listing_id', dbListingId)
              .limit(1);

            if (!selectErr && existingDb && existingDb.length > 0) {
              const dbId = existingDb[0].id;
              const updatedQty = (Number(existingDb[0].quantity) || 0) + quantityToAdd;
              await supabase
                .from('cart_items')
                .update({ quantity: updatedQty })
                .eq('id', dbId);
            } else {
              // Mutation successfully inserts rows into public.cart_items
              const insertPayload = {
                user_id: dbUserId,
                listing_id: dbListingId,
                quantity: Math.max(1, quantityToAdd),
              };

              const { error: insErr } = await supabase
                .from('cart_items')
                .insert([insertPayload]);

              if (insErr) {
                console.warn('[Cart Engine] Note on cart_items insert:', insErr.message);
              }
            }
          }
        } catch (dbErr) {
          console.warn('[Cart Engine] Supabase cart synchronization note:', dbErr);
        }
      })();
    }

    return {
      success: true,
      updatedItem: resultingItem,
    };
  } catch (err: any) {
    console.error('Fatal error in addToCart:', err);
    return { success: false, error: err.message || 'Failed to add item to cart' };
  }
}

/**
 * Direct helper function for product listing buttons: handleAddToCart(listingOrId, quantity)
 */
export async function handleAddToCart(
  listingOrId: Listing | string,
  quantityToAdd: number = 1
): Promise<{ success: boolean; updatedItem?: CartItem; error?: string }> {
  let userId: string | undefined;
  try {
    const rawUser = localStorage.getItem('mlb_current_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      userId = u?.id;
    }
  } catch (_) {}

  return addToCart(userId, listingOrId, quantityToAdd);
}

/**
 * Update the quantity of an item in the cart.
 * If newQuantity <= 0, the item is removed.
 */
export async function updateCartItemQuantity(
  cartItemId: string,
  newQuantity: number
): Promise<{ success: boolean; error?: string }> {
  if (!cartItemId) return { success: false, error: 'Cart item ID is required' };

  try {
    if (newQuantity <= 0) {
      return removeCartItem(cartItemId);
    }

    // 1. Update local storage
    const currentCart = getStoredLocalCart();
    const updatedCart = currentCart.map((i) =>
      i.id === cartItemId || String(i.listing_id) === String(cartItemId)
        ? { ...i, quantity: newQuantity, updated_at: new Date().toISOString() }
        : i
    );
    saveStoredLocalCart(updatedCart);

    // 2. Update Supabase in background
    if (supabase) {
      Promise.resolve(
        supabase
          .from('cart_items')
          .update({
            quantity: newQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cartItemId)
      ).catch(() => {});
    }

    return { success: true };
  } catch (err: any) {
    console.error('Fatal error updating cart quantity:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Remove an item completely from the cart.
 */
export async function removeCartItem(
  cartItemId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!cartItemId) return { success: false, error: 'Cart item ID is required' };

  try {
    // 1. Authoritative Database delete call targeting public.cart_items
    if (supabase) {
      try {
        let activeUid = userId;
        if (!activeUid || activeUid === 'guest_user') {
          try {
            const stored = localStorage.getItem('mlb_active_user');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed?.id) activeUid = parsed.id;
            }
          } catch (_) {}
        }

        if (activeUid && activeUid !== 'guest_user') {
          const dbUserId = isUuid(activeUid) ? activeUid : toValidUuid(activeUid);
          await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', dbUserId)
            .or(`id.eq.${cartItemId},listing_id.eq.${cartItemId}`);
        } else {
          await supabase
            .from('cart_items')
            .delete()
            .or(`id.eq.${cartItemId},listing_id.eq.${cartItemId}`);
        }
      } catch (dbErr) {
        console.warn('[Cart Engine] Supabase delete note:', dbErr);
      }
    }

    // 2. Remove from local storage for active user and global fallback
    const currentCart = getStoredLocalCart(userId);
    const filteredCart = currentCart.filter(
      (i) => i.id !== cartItemId && String(i.listing_id) !== String(cartItemId)
    );
    saveStoredLocalCart(filteredCart, userId);

    if (userId) {
      const fallbackCart = getStoredLocalCart();
      const filteredFallback = fallbackCart.filter(
        (i) => i.id !== cartItemId && String(i.listing_id) !== String(cartItemId)
      );
      saveStoredLocalCart(filteredFallback);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Fatal error removing cart item:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Clear all cart items for a user (e.g. after successful checkout).
 */
export async function clearUserCart(userId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    saveStoredLocalCart([], userId);

    if (supabase && userId && userId !== 'guest_user') {
      Promise.resolve(supabase.from('cart_items').delete().eq('user_id', userId)).catch(() => {});
    }

    return { success: true };
  } catch (err: any) {
    console.error('Fatal error clearing cart:', err);
    return { success: false, error: err.message };
  }
}
