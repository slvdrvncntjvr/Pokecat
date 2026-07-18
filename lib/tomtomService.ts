/**
 * TomTom_Service for Pokecat.
 *
 * Integrates with the TomTom Map Display API (night style JSON, consumed by
 * MapLibre on the Map_Screen) and the TomTom Search API (reverse geocoding for
 * the Catch_Flow). The API key is read from the client-accessible
 * `EXPO_PUBLIC_TOMTOM_API_KEY` environment variable per the Expo SDK 57 docs
 * (env vars prefixed with `EXPO_PUBLIC_` are inlined into the client bundle).
 *
 * The service degrades gracefully: when the key is unconfigured (unset, empty,
 * or whitespace-only) `getMapStyleUrl()` and `reverseGeocode()` return `null`
 * so the map surfaces a configuration message and the catch proceeds without a
 * location name.
 */

/**
 * Read the raw TomTom API key from the environment, or `null` when it is unset
 * or blank (empty/whitespace-only). Kept private so callers go through
 * {@link isConfigured}.
 */
function getKey(): string | null {
  const raw = process.env.EXPO_PUBLIC_TOMTOM_API_KEY;
  if (raw == null || raw.trim().length === 0) {
    return null;
  }
  return raw.trim();
}

/**
 * Whether a valid (non-blank) TomTom API key is configured. Returns `true` only
 * when the key environment variable is present and contains at least one
 * non-whitespace character.
 */
export function isConfigured(): boolean {
  return getKey() != null;
}

/**
 * Return the TomTom Map Display night-style JSON URL for MapLibre, or `null`
 * when no key is configured. The night style matches the app's `#0a0d14` dark
 * theme.
 */
export function getMapStyleUrl(): string | null {
  const key = getKey();
  if (key == null) {
    return null;
  }
  return `https://api.tomtom.com/map/1/style/night.json?key=${encodeURIComponent(
    key
  )}`;
}

/**
 * Shape of the TomTom Search API reverseGeocode response (only the fields we
 * consume).
 */
interface TomTomReverseGeocodeResponse {
  addresses?: {
    address?: {
      freeformAddress?: string;
      municipality?: string;
      streetName?: string;
    };
  }[];
}

/**
 * Reverse-geocode a coordinate into a human-readable street/place name via the
 * TomTom Search API. Returns `null` when the key is unconfigured, the request
 * fails, or no usable name is present in the response so the Catch_Flow can
 * store the Cat_Record with coordinates only.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  const key = getKey();
  if (key == null) {
    return null;
  }

  try {
    const url =
      `https://api.tomtom.com/search/2/reverseGeocode/` +
      `${encodeURIComponent(lat)},${encodeURIComponent(lng)}.json` +
      `?key=${encodeURIComponent(key)}`;
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as TomTomReverseGeocodeResponse;
    const address = data.addresses?.[0]?.address;
    if (address == null) {
      return null;
    }

    const name =
      address.streetName ??
      address.freeformAddress ??
      address.municipality ??
      null;

    if (name == null || name.trim().length === 0) {
      return null;
    }
    return name;
  } catch {
    return null;
  }
}
