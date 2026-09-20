/**
 * Dynamic Address-Based Delivery Calculation Engine
 * 
 * Implements:
 * 1. Geocoding address parsing into numerical buyer_latitude and buyer_longitude
 * 2. Haversine spherical distance vector algorithm with 0.5 km boundary floor
 * 3. Mathematical rule parameter structure:
 *    - Base Flat Driver Service Fee: ₹20
 *    - Fuel Operational Matrix Factor: ((Distance / 35 km/l Mileage) * ₹140 Petrol Rate per Litre)
 *    - Product Payload Weight Multiplier: (0.1 Kg mass payload * ₹5 per Kg baseline rate)
 *    - Math.round() parsing wrapper
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DynamicDeliveryFeeCalculation {
  baseFlatDriverFee: number;
  fuelOperationalFactor: number;
  productPayloadMultiplier: number;
  totalDeliveryFee: number;
  distanceKm: number;
}

export const DEFAULT_STORE_VENDOR_COORDINATES: Coordinates = {
  latitude: 25.5141, // Tura Super Market / Main Commercial Bazaar
  longitude: 90.2033,
};

// Regional Meghalaya District / Town reference coordinates
export const MEGHALAYA_COORDINATES: Record<string, Coordinates> = {
  'West Garo Hills': { latitude: 25.5141, longitude: 90.2033 },
  'Tura': { latitude: 25.5141, longitude: 90.2033 },
  'Rongram': { latitude: 25.5866, longitude: 90.2520 },
  'Gambegre': { latitude: 25.4333, longitude: 90.1500 },
  'Dalu': { latitude: 25.2167, longitude: 90.2167 },
  'Selsella': { latitude: 25.6833, longitude: 90.1000 },
  'Tikrikilla': { latitude: 25.9167, longitude: 90.1500 },
  'Demdema': { latitude: 25.7500, longitude: 90.0833 },
  'Batabari': { latitude: 25.7167, longitude: 90.0500 },
  'East Khasi Hills': { latitude: 25.5788, longitude: 91.8933 },
  'Shillong': { latitude: 25.5788, longitude: 91.8933 },
  'Mylliem': { latitude: 25.5000, longitude: 91.8333 },
  'Sohra': { latitude: 25.2700, longitude: 91.7300 },
  'Cherrapunji': { latitude: 25.2700, longitude: 91.7300 },
  'Mawsynram': { latitude: 25.3000, longitude: 91.5833 },
  'Pynursla': { latitude: 25.3167, longitude: 91.9000 },
  'Ri-Bhoi': { latitude: 25.9000, longitude: 91.8800 },
  'Nongpoh': { latitude: 25.9000, longitude: 91.8800 },
  'Umsning': { latitude: 25.7500, longitude: 91.9000 },
  'South West Garo Hills': { latitude: 25.4600, longitude: 89.9300 },
  'Ampati': { latitude: 25.4600, longitude: 89.9300 },
  'East Garo Hills': { latitude: 25.5976, longitude: 90.6186 },
  'Williamnagar': { latitude: 25.5976, longitude: 90.6186 },
  'North Garo Hills': { latitude: 25.9080, longitude: 90.6033 },
  'Resubelpara': { latitude: 25.9080, longitude: 90.6033 },
  'Mendipathar': { latitude: 25.9200, longitude: 90.6500 },
  'South Garo Hills': { latitude: 25.1970, longitude: 90.6385 },
  'Baghmara': { latitude: 25.1970, longitude: 90.6385 },
  'West Khasi Hills': { latitude: 25.5200, longitude: 91.2700 },
  'Nongstoin': { latitude: 25.5200, longitude: 91.2700 },
  'Eastern West Khasi Hills': { latitude: 25.5600, longitude: 91.6400 },
  'Mairang': { latitude: 25.5600, longitude: 91.6400 },
  'South West Khasi Hills': { latitude: 25.3700, longitude: 91.4600 },
  'Mawkyrwat': { latitude: 25.3700, longitude: 91.4600 },
  'West Jaintia Hills': { latitude: 25.4500, longitude: 92.2000 },
  'Jowai': { latitude: 25.4500, longitude: 92.2000 },
  'East Jaintia Hills': { latitude: 25.3500, longitude: 92.3600 },
  'Khliehriat': { latitude: 25.3500, longitude: 92.3600 },
  'Guwahati': { latitude: 26.1445, longitude: 91.7362 },
};

/**
 * Geocodes an address string into numerical latitude and longitude coordinates.
 * Queries Nominatim OpenStreetMap API with a fast timeout, falling back
 * gracefully to verified local geospatial datasets with deterministic micro-variance.
 */
export async function geocodeAddress(
  address: string,
  extraContext?: { district?: string; block?: string; state?: string }
): Promise<Coordinates> {
  const cleanAddr = (address || '').trim();
  const district = (extraContext?.district || '').trim();
  const block = (extraContext?.block || '').trim();
  const state = (extraContext?.state || 'Meghalaya').trim();

  // 1. Try public Nominatim OpenStreetMap geocoder API
  if (cleanAddr) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const queryParts = [cleanAddr, block, district, state, 'India'].filter(Boolean);
      const query = queryParts.join(', ');

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=1`,
        {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            return {
              latitude: Number(lat.toFixed(6)),
              longitude: Number(lon.toFixed(6)),
            };
          }
        }
      }
    } catch (_err) {
      // Graceful fallback to regional geospatial lookup
    }
  }

  // 2. Regional fallback: Match district, town, or block
  let baseCoords = DEFAULT_STORE_VENDOR_COORDINATES;
  const combinedText = `${cleanAddr} ${block} ${district}`.toLowerCase();

  for (const [name, coords] of Object.entries(MEGHALAYA_COORDINATES)) {
    if (combinedText.includes(name.toLowerCase())) {
      baseCoords = coords;
      break;
    }
  }

  // 3. Generate deterministic hash variance so different text addresses have distinct locations
  let hash = 0;
  for (let i = 0; i < cleanAddr.length; i++) {
    hash = (hash << 5) - hash + cleanAddr.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 1000) / 1000 - 0.5) * 0.03; // ~1-2km offset
  const lonOffset = ((Math.abs(hash >> 3) % 1000) / 1000 - 0.5) * 0.03;

  return {
    latitude: Number((baseCoords.latitude + latOffset).toFixed(6)),
    longitude: Number((baseCoords.longitude + lonOffset).toFixed(6)),
  };
}

/**
 * Haversine Geometric Algorithm Function
 * Parses distance limits between buyer coordinates (buyer_latitude, buyer_longitude)
 * and vendor coordinates (seller_latitude, seller_longitude).
 * Enforces an absolute boundary floor value of 0.5 km.
 */
export function calculateHaversineDistanceKm(
  buyerLat?: number | null,
  buyerLon?: number | null,
  sellerLat?: number | null,
  sellerLon?: number | null
): number {
  const bLat = Number(buyerLat);
  const bLon = Number(buyerLon);
  const sLat = Number(sellerLat);
  const sLon = Number(sellerLon);

  // If coordinates are invalid or zero, return boundary floor 0.5 km
  if (
    isNaN(bLat) ||
    isNaN(bLon) ||
    isNaN(sLat) ||
    isNaN(sLon) ||
    (bLat === 0 && bLon === 0) ||
    (sLat === 0 && sLon === 0)
  ) {
    return 0.5;
  }

  const R = 6371; // Earth's mean radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(sLat - bLat);
  const dLon = toRad(sLon - bLon);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(bLat)) *
      Math.cos(toRad(sLat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawDistance = R * c;

  // Enforce an absolute boundary floor value of 0.5 km
  const boundaryFlooredDistance = Math.max(0.5, rawDistance);
  return Number(boundaryFlooredDistance.toFixed(2));
}

/**
 * Delivery Charges Mathematical Calculation
 * Strict parameter structure:
 * - Base Flat Driver Service Fee: ₹20
 * - Fuel Operational Matrix Factor: ((Distance / 35 km/l Mileage) * ₹140 Petrol Rate per Litre)
 * - Product Payload Weight Multiplier: (0.1 Kg mass payload * ₹5 per Kg baseline rate)
 * - Apply final Math.round() parsing function block wrapper onto the summation
 */
export function calculateDynamicDeliveryFee(
  distanceKm: number,
  payloadWeightKg: number = 0.1
): DynamicDeliveryFeeCalculation {
  // Boundary floor enforcement
  const distance = Math.max(0.5, Number(distanceKm) || 0.5);

  // 1. Base Flat Driver Service Fee: ₹20
  const baseFlatDriverFee = 20;

  // 2. Fuel Operational Matrix Factor: ((Distance / 35 km/l Mileage) * ₹140 Petrol Rate per Litre)
  const fuelOperationalFactor = (distance / 35) * 140;

  // 3. Product Payload Weight Multiplier: (0.1 Kg mass payload * ₹5 per Kg baseline rate)
  const payloadMass = payloadWeightKg > 0 ? payloadWeightKg : 0.1;
  const productPayloadMultiplier = payloadMass * 5;

  // 4. Summation
  const rawSum = baseFlatDriverFee + fuelOperationalFactor + productPayloadMultiplier;

  // 5. Final Math.round() parsing wrapper
  const totalDeliveryFee = Math.round(rawSum);

  return {
    baseFlatDriverFee,
    fuelOperationalFactor: Number(fuelOperationalFactor.toFixed(2)),
    productPayloadMultiplier: Number(productPayloadMultiplier.toFixed(2)),
    totalDeliveryFee,
    distanceKm: Number(distance.toFixed(2)),
  };
}

/**
 * Resolves seller coordinates from a listing object or defaults to central vendor hub
 */
export function getListingVendorCoordinates(listing?: any): Coordinates {
  if (!listing) return DEFAULT_STORE_VENDOR_COORDINATES;

  const lat = Number(listing.seller_latitude ?? listing.latitude);
  const lon = Number(listing.seller_longitude ?? listing.longitude);

  if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
    return { latitude: lat, longitude: lon };
  }

  // Location-based fallback
  const locName = `${listing.district || ''} ${listing.location_name || ''} ${listing.village || ''}`.toLowerCase();
  for (const [name, coords] of Object.entries(MEGHALAYA_COORDINATES)) {
    if (locName.includes(name.toLowerCase())) {
      return coords;
    }
  }

  return DEFAULT_STORE_VENDOR_COORDINATES;
}

/**
 * Resolves buyer coordinates from a user profile or defaults
 */
export function getUserBuyerCoordinates(user?: any): Coordinates {
  if (!user) return DEFAULT_STORE_VENDOR_COORDINATES;

  const lat = Number(user.buyer_latitude ?? user.latitude);
  const lon = Number(user.buyer_longitude ?? user.longitude);

  if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
    return { latitude: lat, longitude: lon };
  }

  // Regional location match from user profile
  const userLoc = `${user.district || ''} ${user.permanent_address || ''} ${user.village || ''} ${user.city || ''}`.toLowerCase();
  for (const [name, coords] of Object.entries(MEGHALAYA_COORDINATES)) {
    if (userLoc.includes(name.toLowerCase())) {
      return coords;
    }
  }

  return DEFAULT_STORE_VENDOR_COORDINATES;
}
