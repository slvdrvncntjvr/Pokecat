/**
 * Gotcha_Sheet — the full-screen "SPOTTED!" reward presented after a Cat_Record
 * is persisted (R7.1–R7.3).
 *
 * Shows the caught cat's name and photo (a placeholder when `photo_uri` is
 * null), fires the success notification haptic on present, and dismisses back
 * to the Camera_Screen (which resets the AR_Overlay to `idle`).
 */
import { useEffect } from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { notificationSpotted } from '@/lib/hapticsService';
import type { Cat_Record } from '@/lib/types';

/** Props for the {@link GotchaSheet}. */
export interface GotchaSheetProps {
  /** The caught cat to celebrate, or `null` when there is nothing to show. */
  cat: Cat_Record | null;
  /** Whether the sheet is presented. */
  visible: boolean;
  /** Called when the user dismisses the sheet. */
  onDismiss: () => void;
}

export default function GotchaSheet({
  cat,
  visible,
  onDismiss,
}: GotchaSheetProps) {
  // Fire the success haptic once each time the sheet becomes visible.
  useEffect(() => {
    if (visible) {
      notificationSpotted();
    }
  }, [visible]);

  if (!visible || cat == null) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.spotted}>SPOTTED!</Text>

      {cat.photo_uri != null ? (
        <Image
          source={{ uri: cat.photo_uri }}
          style={styles.photo}
          accessibilityLabel={`Photo of ${cat.name}`}
        />
      ) : (
        <View style={[styles.photo, styles.placeholder]}>
          <Text style={styles.placeholderGlyph}>🐱</Text>
        </View>
      )}

      <Text style={styles.name}>{cat.name}</Text>

      <TouchableOpacity
        style={styles.dismiss}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Text style={styles.dismissText}>Nice!</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0d14',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  spotted: {
    color: '#3ddc84',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 32,
  },
  photo: {
    width: 240,
    height: 240,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  placeholderGlyph: {
    fontSize: 96,
  },
  name: {
    color: '#f5f7fa',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 24,
  },
  dismiss: {
    marginTop: 40,
    backgroundColor: '#4da6ff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  dismissText: {
    color: '#0a0d14',
    fontSize: 17,
    fontWeight: '700',
  },
});
