/**
 * AR_Overlay — the Skia targeting overlay drawn over the live camera feed
 * (R4.1, R4.2, R4.3, R4.6).
 *
 * A full-screen Skia `<Canvas>` renders four corner brackets, a scan ring, a
 * sweeping scan line, and a center crosshair. Animation clocks are driven by
 * Reanimated 4 shared values (`useSharedValue` + `withRepeat`/`withTiming`, run
 * on the UI thread via react-native-worklets) and read by Skia through
 * `useDerivedValue` so the canvas repaints at the display refresh rate without
 * JS-thread round-trips.
 *
 * The overlay's presentation is a pure state machine over `idle`/`detected`/
 * `catching`; {@link arOverlayReducer} owns those transitions so they are
 * trivially unit/property testable, and the component renders the current
 * `state` prop.
 */
import {
    Canvas,
    Circle,
    Fill,
    Group,
    Line,
    Path,
    Skia,
    vec,
} from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

/** Presentation states for the AR_Overlay. */
export type AROverlayState = 'idle' | 'detected' | 'catching';

/**
 * Events accepted by {@link arOverlayReducer}.
 *
 * - `detect` — a cat was targeted; lock the brackets and enter `detected`.
 * - `catch` — the catch was confirmed; enter `catching` (desaturate + flash).
 * - `reset` / `dismiss` — return to the neutral `idle` state from anywhere.
 */
export type AROverlayEvent = 'detect' | 'catch' | 'reset' | 'dismiss';

/**
 * Pure reducer for the AR_Overlay state machine.
 *
 * Transitions:
 * - `detect`  → `detected` (from any state)
 * - `catch`   → `catching` (from any state)
 * - `reset` / `dismiss` → `idle` (from any state)
 *
 * Any unrecognized event leaves the state unchanged. The reducer is total and
 * deterministic so it can be exercised directly by tests without native
 * modules.
 */
export function arOverlayReducer(
  state: AROverlayState,
  event: AROverlayEvent
): AROverlayState {
  switch (event) {
    case 'detect':
      return 'detected';
    case 'catch':
      return 'catching';
    case 'reset':
    case 'dismiss':
      return 'idle';
    default:
      return state;
  }
}

/** Props for the {@link AROverlay} component. */
export interface AROverlayProps {
  /** Current presentation state driving the animation behavior. */
  state: AROverlayState;
  /** Fired ~400ms after entering `catching` (after the white flash completes). */
  onFlashComplete?: () => void;
}

/** Duration (ms) of the catch flash before {@link AROverlayProps.onFlashComplete}. */
const FLASH_DURATION = 400;
/** Stroke/accent color for the targeting geometry. */
const ACCENT = '#4da6ff';

export default function AROverlay({ state, onFlashComplete }: AROverlayProps) {
  const { width, height } = useWindowDimensions();

  // Centered targeting box geometry.
  const boxSize = Math.min(width, height) * 0.6;
  const cx = width / 2;
  const cy = height / 2;
  const left = cx - boxSize / 2;
  const top = cy - boxSize / 2;
  const right = cx + boxSize / 2;
  const bottom = cy + boxSize / 2;
  const bracketLen = boxSize * 0.18;
  const ringRadius = boxSize * 0.42;
  const crosshair = 14;

  // --- Reanimated 4 animation clocks (UI thread) ---------------------------
  // Brackets breathe between 0.95 and 1.0 while idle; scanY sweeps top→bottom.
  const bracketScale = useSharedValue(1);
  const scanProgress = useSharedValue(0);
  const flash = useSharedValue(0);

  // Idle "breathing" + scan-sweep loops. Locked (fixed scale) when detected.
  useEffect(() => {
    if (state === 'idle') {
      bracketScale.value = withRepeat(
        withTiming(0.95, { duration: 1200 }),
        -1,
        true
      );
      scanProgress.value = withRepeat(
        withTiming(1, { duration: 2000 }),
        -1,
        false
      );
    } else {
      // Lock brackets and freeze the scan line when a cat is detected/caught.
      bracketScale.value = withTiming(1, { duration: 150 });
    }
  }, [state, bracketScale, scanProgress]);

  // Catch flash: pulse a white overlay to full then back, firing the callback.
  useEffect(() => {
    if (state === 'catching') {
      flash.value = withTiming(1, { duration: FLASH_DURATION / 2 }, () => {
        flash.value = withTiming(0, { duration: FLASH_DURATION / 2 });
      });
      const timer = setTimeout(() => {
        onFlashComplete?.();
      }, FLASH_DURATION);
      return () => clearTimeout(timer);
    }
    flash.value = 0;
    return undefined;
  }, [state, flash, onFlashComplete]);

  // --- Skia-derived values -------------------------------------------------
  // Corner-bracket transform: scale about the box center.
  const bracketTransform = useDerivedValue(() => [
    { translateX: cx },
    { translateY: cy },
    { scale: bracketScale.value },
    { translateX: -cx },
    { translateY: -cy },
  ]);

  // Scan-line vertical position sweeping between top and bottom of the box.
  const scanP1 = useDerivedValue(() =>
    vec(left, top + (bottom - top) * scanProgress.value)
  );
  const scanP2 = useDerivedValue(() =>
    vec(right, top + (bottom - top) * scanProgress.value)
  );

  // White flash overlay opacity.
  const flashOpacity = useDerivedValue(() => flash.value);

  // --- Corner-bracket path (four L-shaped corners) -------------------------
  const bracketPath = Skia.Path.Make();
  // Top-left
  bracketPath.moveTo(left, top + bracketLen);
  bracketPath.lineTo(left, top);
  bracketPath.lineTo(left + bracketLen, top);
  // Top-right
  bracketPath.moveTo(right - bracketLen, top);
  bracketPath.lineTo(right, top);
  bracketPath.lineTo(right, top + bracketLen);
  // Bottom-right
  bracketPath.moveTo(right, bottom - bracketLen);
  bracketPath.lineTo(right, bottom);
  bracketPath.lineTo(right - bracketLen, bottom);
  // Bottom-left
  bracketPath.moveTo(left + bracketLen, bottom);
  bracketPath.lineTo(left, bottom);
  bracketPath.lineTo(left, bottom - bracketLen);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Scan ring */}
      <Circle
        cx={cx}
        cy={cy}
        r={ringRadius}
        style="stroke"
        strokeWidth={2}
        color={ACCENT}
        opacity={0.35}
      />

      {/* Corner brackets (scaled about center) */}
      <Group transform={bracketTransform}>
        <Path
          path={bracketPath}
          style="stroke"
          strokeWidth={4}
          strokeCap="round"
          strokeJoin="round"
          color={ACCENT}
        />
      </Group>

      {/* Scan line sweeping top→bottom */}
      <Line p1={scanP1} p2={scanP2} strokeWidth={2} color={ACCENT} opacity={0.6} />

      {/* Center crosshair */}
      <Line
        p1={vec(cx - crosshair, cy)}
        p2={vec(cx + crosshair, cy)}
        strokeWidth={2}
        color={ACCENT}
      />
      <Line
        p1={vec(cx, cy - crosshair)}
        p2={vec(cx, cy + crosshair)}
        strokeWidth={2}
        color={ACCENT}
      />

      {/* Catch white-flash overlay */}
      <Fill color="white" opacity={flashOpacity} />
    </Canvas>
  );
}
