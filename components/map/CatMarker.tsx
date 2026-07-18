/**
 * Cat_Marker — a teardrop map marker whose fill color is derived from the cat's
 * {@link Condition} via {@link conditionColor} (R9.4).
 *
 * Rendered inside a MapLibre `MarkerView`/`PointAnnotation` on the Map_Screen,
 * one per Cat_Record at its coordinates. Pure presentational component: it takes
 * a `condition` and paints a condition-colored teardrop (a rounded pin with a
 * downward point) with a small inner dot.
 */
import { StyleSheet, View } from 'react-native';

import { conditionColor } from '@/lib/catHelpers';
import type { Condition } from '@/lib/types';

interface CatMarkerProps {
  /** The cat's condition; determines the marker fill color. */
  condition: Condition;
}

export default function CatMarker({ condition }: CatMarkerProps) {
  const color = conditionColor(condition);

  return (
    <View style={styles.container} accessibilityRole="image">
      {/* Rounded head of the teardrop. */}
      <View style={[styles.head, { backgroundColor: color }]}>
        <View style={styles.innerDot} />
      </View>
      {/* Downward-pointing tail formed by a rotated square border trick. */}
      <View style={[styles.tail, { borderTopColor: color }]} />
    </View>
  );
}

const HEAD_SIZE = 28;
const TAIL_SIZE = 10;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: {
    width: HEAD_SIZE,
    height: HEAD_SIZE,
    borderRadius: HEAD_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(10, 13, 20, 0.9)',
    // Soft floating shadow so pins read on dark tiles.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  innerDot: {
    width: HEAD_SIZE / 3,
    height: HEAD_SIZE / 3,
    borderRadius: HEAD_SIZE / 6,
    backgroundColor: 'rgba(10, 13, 20, 0.9)',
  },
  tail: {
    width: 0,
    height: 0,
    marginTop: -3,
    borderLeftWidth: TAIL_SIZE / 2,
    borderRightWidth: TAIL_SIZE / 2,
    borderTopWidth: TAIL_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
