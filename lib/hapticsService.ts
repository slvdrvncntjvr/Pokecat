/**
 * Haptics_Service for Pokecat.
 *
 * Thin wrapper over expo-haptics (Expo SDK 57). Provides the two feedback
 * events the app uses: a medium impact when a cat is detected, and a success
 * notification for the "SPOTTED!" moment. Both calls are fire-and-forget; the
 * underlying async promises are intentionally not awaited so callers stay
 * synchronous and haptic failures never block the catch flow.
 */
import * as Haptics from 'expo-haptics';

/**
 * Produce a medium impact feedback event when a cat is detected (Catch_Button /
 * AR_Overlay `detected` transition).
 */
export function impactDetect(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/**
 * Produce a success notification feedback event when the Gotcha_Sheet is
 * presented after a Cat_Record is persisted.
 */
export function notificationSpotted(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
