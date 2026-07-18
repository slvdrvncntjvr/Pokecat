/**
 * Photo_Service for Pokecat.
 *
 * Captures a cat photo from the live camera or the media library, then resizes
 * and persists it before storage. Uses expo-image-picker and the expo-image-
 * manipulator v57 contextual API (`ImageManipulator.manipulate(uri)` →
 * chainable transforms → `renderAsync()` → `ImageRef.saveAsync()`).
 *
 * Every path degrades gracefully: on any failure the functions resolve to
 * `{ uri: null, error }` so the Catch_Flow can proceed without a photo.
 */
import { CameraView } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** Result of a photo operation. `uri` is `null` when no photo was produced. */
export interface PhotoResult {
  uri: string | null;
  error?: string;
}

/** Max width (px) for stored photos; height scales to preserve aspect ratio. */
const MAX_WIDTH = 1024;
/** JPEG compression quality for stored photos (0..1). */
const JPEG_COMPRESS = 0.7;

/**
 * Normalize an unknown thrown value into a message string.
 */
function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Resize an image to {@link MAX_WIDTH} and persist it as a compressed JPEG using
 * the expo-image-manipulator v57 context API. Returns the saved file URI, or
 * `{ uri: null, error }` on any failure.
 */
export async function resizeAndPersist(uri: string): Promise<PhotoResult> {
  try {
    const context = ImageManipulator.manipulate(uri).resize({ width: MAX_WIDTH });
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: JPEG_COMPRESS,
    });
    return { uri: saved.uri };
  } catch (error) {
    return { uri: null, error: toMessage(error) };
  }
}

/**
 * Capture a still from the live {@link CameraView} and resize/persist it.
 * Returns `{ uri: null, error }` if capture yields no URI or any step fails so
 * the catch can proceed photo-less.
 */
export async function capturePhoto(cameraRef: CameraView): Promise<PhotoResult> {
  try {
    const picture = await cameraRef.takePictureAsync();
    if (picture?.uri == null) {
      return { uri: null, error: 'Camera returned no image' };
    }
    return resizeAndPersist(picture.uri);
  } catch (error) {
    return { uri: null, error: toMessage(error) };
  }
}

/**
 * Pick an image from the device library and resize/persist it. Returns
 * `{ uri: null }` when the user cancels, and `{ uri: null, error }` on failure.
 */
export async function pickPhoto(): Promise<PhotoResult> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || result.assets.length === 0) {
      return { uri: null };
    }
    return resizeAndPersist(result.assets[0].uri);
  } catch (error) {
    return { uri: null, error: toMessage(error) };
  }
}
