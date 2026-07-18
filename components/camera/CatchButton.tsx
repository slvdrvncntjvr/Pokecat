/**
 * Catch_Button — the floating action row overlaid on the Camera_Screen
 * (R2.3, R4.3, R4.4, R5.1).
 *
 * A horizontal row with three controls: a photo control on the left, the large
 * center Catch control, and a hint control on the right. Pressing Catch is what
 * arms the AR_Overlay `detected` transition and opens the Catch_Flow; the
 * screen wires the concrete behavior via the callback props.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

/** Props for the {@link CatchButton} action row. */
export interface CatchButtonProps {
  /** Called when the center Catch control is pressed. */
  onCatch: () => void;
  /** Called when the left photo control is pressed. */
  onPhoto: () => void;
  /** Called when the right hint control is pressed. */
  onHint: () => void;
}

export default function CatchButton({
  onCatch,
  onPhoto,
  onHint,
}: CatchButtonProps) {
  return (
    <View style={styles.row} pointerEvents="box-none">
      <Pressable
        style={styles.sideButton}
        onPress={onPhoto}
        accessibilityRole="button"
        accessibilityLabel="Add photo"
      >
        <Text style={styles.sideGlyph}>🖼️</Text>
      </Pressable>

      <Pressable
        style={styles.catchButton}
        onPress={onCatch}
        accessibilityRole="button"
        accessibilityLabel="Catch cat"
      >
        <View style={styles.catchInner} />
      </Pressable>

      <Pressable
        style={styles.sideButton}
        onPress={onHint}
        accessibilityRole="button"
        accessibilityLabel="Hint"
      >
        <Text style={styles.sideGlyph}>❓</Text>
      </Pressable>
    </View>
  );
}

const CATCH_SIZE = 84;
const SIDE_SIZE = 56;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
  },
  catchButton: {
    width: CATCH_SIZE,
    height: CATCH_SIZE,
    borderRadius: CATCH_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 4,
    borderColor: '#f5f7fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catchInner: {
    width: CATCH_SIZE - 24,
    height: CATCH_SIZE - 24,
    borderRadius: (CATCH_SIZE - 24) / 2,
    backgroundColor: '#3ddc84',
  },
  sideButton: {
    width: SIDE_SIZE,
    height: SIDE_SIZE,
    borderRadius: SIDE_SIZE / 2,
    backgroundColor: 'rgba(10, 13, 20, 0.7)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideGlyph: {
    fontSize: 22,
  },
});
