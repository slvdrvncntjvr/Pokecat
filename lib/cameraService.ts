/**
 * Camera_Service for Pokecat.
 *
 * Wraps expo-camera (Expo SDK 57). Provides a still-capture helper for the
 * Photo_Service capture path and a pure permission-state derivation used by the
 * Camera_Screen to decide between the live feed, the request view, and the
 * "enable in Settings" view.
 */
import type { CameraView } from 'expo-camera';
import type { PermissionResponse } from 'expo-modules-core';

/** Permission states surfaced to the Camera_Screen. */
export type CamPermissionState = 'undetermined' | 'denied' | 'granted';

/**
 * Capture a still image from the live {@link CameraView} and return its
 * temporary URI. The Photo_Service resizes/persists this URI before storage.
 */
export async function captureStill(cameraRef: CameraView): Promise<string> {
  const picture = await cameraRef.takePictureAsync();
  if (picture?.uri == null) {
    throw new Error('captureStill: camera returned no image');
  }
  return picture.uri;
}

/**
 * Derive the {@link CamPermissionState} from a `useCameraPermissions()`
 * response.
 *
 * - `null` (not yet loaded) → `'undetermined'`
 * - granted → `'granted'`
 * - not granted but can ask again → `'undetermined'` (screen re-requests)
 * - denied and cannot ask again → `'denied'` (settings message)
 */
export function deriveCamPermissionState(
  permissionResponse: PermissionResponse | null
): CamPermissionState {
  if (permissionResponse == null) {
    return 'undetermined';
  }
  if (permissionResponse.granted) {
    return 'granted';
  }
  if (permissionResponse.canAskAgain) {
    return 'undetermined';
  }
  return 'denied';
}
