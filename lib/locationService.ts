/**
 * Location_Service for Pokecat.
 *
 * Thin wrapper over expo-location (Expo SDK 57). Provides foreground permission
 * handling and a single current-coordinate read for the Catch_Flow. Both
 * functions degrade gracefully: coordinate reads return `null` when permission
 * is denied or the fix is unavailable so the catch can proceed without
 * location.
 */
import * as Location from 'expo-location';

/** Permission states surfaced to the Camera_Screen / Catch_Flow. */
export type LocPermissionState = 'undetermined' | 'denied' | 'granted';

/**
 * Request (or read) foreground location permission and return its state.
 * Falls back to `'undetermined'` if the platform reports an unexpected status.
 */
export async function ensurePermission(): Promise<LocPermissionState> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  switch (status) {
    case 'granted':
      return 'granted';
    case 'denied':
      return 'denied';
    default:
      return 'undetermined';
  }
}

/**
 * Return the device's current coordinates as `{ lat, lng }`, or `null` when
 * permission is denied or a fix cannot be obtained. Never throws — any failure
 * resolves to `null` so the Catch_Flow can store the Cat_Record without coords.
 */
export async function getCurrentCoords(): Promise<{
  lat: number;
  lng: number;
} | null> {
  try {
    const permission = await ensurePermission();
    if (permission !== 'granted') {
      return null;
    }

    const position = await Location.getCurrentPositionAsync({});
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
  } catch {
    return null;
  }
}
