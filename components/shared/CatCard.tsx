/**
 * Cat_Card — a bottom-sheet stat card that presents the full details of a
 * single cataloged cat (R12.1–R12.4).
 *
 * Shown when a Pokedex_Screen grid cell is selected. Displays the cat's name,
 * photo (or an emoji placeholder when `photo_uri` is null), condition,
 * personality, note, location (via {@link formatLocation}, which falls back to
 * coordinates or a placeholder), and the formatted `caught_at` timestamp.
 * Dismissing the card (backdrop tap or the dismiss control) returns to the
 * originating screen via {@link CatCardProps.onDismiss}.
 */
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { conditionColor, formatLocation } from '@/lib/catHelpers';
import type { Cat_Record } from '@/lib/types';

interface CatCardProps {
  /** The cat to display, or `null` when nothing is selected (card hidden). */
  cat: Cat_Record | null;
  /** Whether the card is visible. */
  visible: boolean;
  /** Called when the user dismisses the card (backdrop or close control). */
  onDismiss: () => void;
}

/** One labeled attribute row inside the card body. */
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function CatCard({ cat, visible, onDismiss }: CatCardProps) {
  const insets = useSafeAreaInsets();

  // Nothing to render when there is no selected cat.
  if (cat == null) {
    return null;
  }

  const caughtAtLabel = new Date(cat.caught_at).toLocaleString();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      {/* Backdrop — tapping outside the sheet dismisses it. */}
      <Pressable
        style={styles.backdrop}
        accessibilityLabel="Dismiss"
        onPress={onDismiss}
      >
        {/* Stop propagation so taps on the sheet itself don't dismiss. */}
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}
          onPress={() => {}}
        >
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {cat.photo_uri != null ? (
              <Image
                source={{ uri: cat.photo_uri }}
                style={styles.photo}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Text style={styles.photoPlaceholderEmoji}>🐱</Text>
              </View>
            )}

            <Text style={styles.name}>{cat.name}</Text>

            <View style={styles.chipsRow}>
              <View
                style={[
                  styles.conditionChip,
                  { backgroundColor: conditionColor(cat.condition) },
                ]}
              >
                <Text style={styles.conditionChipText}>{cat.condition}</Text>
              </View>
              <View style={styles.personalityChip}>
                <Text style={styles.personalityChipText}>{cat.personality}</Text>
              </View>
            </View>

            <StatRow label="Location" value={formatLocation(cat)} />
            <StatRow label="Caught" value={caughtAtLabel} />
            {cat.note != null && cat.note.trim().length > 0 ? (
              <StatRow label="Note" value={cat.note} />
            ) : null}

            <Pressable
              style={styles.dismissButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onDismiss}
            >
              <Text style={styles.dismissButtonText}>Close</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: '#12161f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
  },
  photo: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    backgroundColor: '#1b2130',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderEmoji: {
    fontSize: 72,
  },
  name: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '700',
    marginTop: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 8,
  },
  conditionChip: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 8,
  },
  conditionChipText: {
    color: '#0a0d14',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  personalityChip: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  personalityChipText: {
    color: '#e6ebf2',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
  },
  statLabel: {
    color: '#8a94a6',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    color: '#e6ebf2',
    fontSize: 16,
    marginTop: 4,
  },
  dismissButton: {
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
