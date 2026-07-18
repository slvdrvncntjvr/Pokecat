/**
 * Scan_Pulse — a Reanimated-driven expanding "ping" ring fired on the
 * AR_Overlay `detected` transition (R4.3).
 *
 * When `active` becomes `true`, a shared value animates the ring's `scale`
 * outward (1 → 2.5) while its `opacity` fades (1 → 0), giving a single radar-
 * style pulse. The animation runs on the UI thread via react-native-worklets.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

/** Props for the {@link ScanPulse} ring. */
export interface ScanPulseProps {
  /** When `true`, plays a single expand-and-fade pulse. */
  active: boolean;
  /** Diameter (px) of the ring at rest. Defaults to 120. */
  size?: number;
}

/** Duration (ms) of a single pulse. */
const PULSE_DURATION = 700;

export default function ScanPulse({ active, size = 120 }: ScanPulseProps) {
  // 0 → 1 progress drives both scale and opacity for one pulse.
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      progress.value = 0;
      progress.value = withTiming(1, { duration: PULSE_DURATION });
    } else {
      progress.value = 0;
    }
  }, [active, progress]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 1 + progress.value * 1.5 }],
  }));

  if (!active) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: size / 2 },
          ringStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    borderWidth: 3,
    borderColor: '#4da6ff',
  },
});
