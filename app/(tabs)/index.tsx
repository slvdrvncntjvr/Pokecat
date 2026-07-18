/**
 * Camera_Screen — the default (Camera) tab and the app's home surface
 * (R2.1–R2.4, R3.1–R3.4, R4.x, R10.1).
 *
 * Renders the live back-camera feed full-screen (`CameraView`) behind the
 * Skia AR_Overlay and the floating action row (Catch_Button). Camera permission
 * is requested on mount when undetermined; while not granted a permission-
 * request view is shown, and when permanently denied a "enable in Settings"
 * control opens the OS settings (`Linking.openSettings()`). Location permission
 * is ensured on mount so the Catch_Flow can record coordinates.
 *
 * AR_Overlay presentation is driven by {@link arOverlayReducer} via
 * `useReducer`. Pressing Catch fires the detect haptic, moves the overlay to
 * `detected`, and opens the Catch_Flow. A successful catch moves the overlay to
 * `catching` (desaturate + flash) and, once the flash completes, presents the
 * Gotcha_Sheet; dismissing it resets the overlay to `idle`.
 */
import {
    CameraView,
    useCameraPermissions,
} from 'expo-camera';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
    Pressable,
    Linking as RNLinking,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AROverlay, { arOverlayReducer } from '@/components/camera/AROverlay';
import CatchButton from '@/components/camera/CatchButton';
import ScanPulse from '@/components/camera/ScanPulse';
import CatchFlow from '@/components/catch/CatchFlow';
import GotchaSheet from '@/components/catch/GotchaSheet';
import { impactDetect } from '@/lib/hapticsService';
import { ensurePermission } from '@/lib/locationService';
import { capturePhoto, pickPhoto } from '@/lib/photoService';
import type { Cat_Record } from '@/lib/types';

/** How long (ms) the "Point at a stray cat" hint stays before fading. */
const HINT_VISIBLE_MS = 3000;

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [overlayState, dispatch] = useReducer(arOverlayReducer, 'idle');
  const [catchVisible, setCatchVisible] = useState(false);
  const [gotchaVisible, setGotchaVisible] = useState(false);
  const [caughtCat, setCaughtCat] = useState<Cat_Record | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Fade the no-cat hint out after it has been visible for a few seconds.
  const hintOpacity = useSharedValue(1);
  useEffect(() => {
    const timer = setTimeout(() => {
      hintOpacity.value = withTiming(0, { duration: 600 });
    }, HINT_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [hintOpacity]);

  const hintStyle = useAnimatedStyle(() => ({ opacity: hintOpacity.value }));

  // Request camera permission on mount when undetermined; ensure location too.
  useEffect(() => {
    if (permission != null && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
    void ensurePermission();
  }, [permission, requestPermission]);

  const handleCatch = useCallback(() => {
    impactDetect();
    dispatch('detect');
    setCatchVisible(true);
  }, []);

  const handlePhoto = useCallback(async () => {
    const camera = cameraRef.current;
    const result = camera ? await capturePhoto(camera) : await pickPhoto();
    if (result.uri != null) {
      setPhotoUri(result.uri);
    }
  }, []);

  const handlePickFromLibrary = useCallback(async () => {
    const result = await pickPhoto();
    if (result.uri != null) {
      setPhotoUri(result.uri);
    }
  }, []);

  const handleCaught = useCallback((cat: Cat_Record) => {
    setCaughtCat(cat);
    setCatchVisible(false);
    dispatch('catch');
  }, []);

  const handleFlashComplete = useCallback(() => {
    setGotchaVisible(true);
  }, []);

  const handleGotchaDismiss = useCallback(() => {
    setGotchaVisible(false);
    setCaughtCat(null);
    setPhotoUri(null);
    dispatch('reset');
  }, []);

  const handleCatchDismiss = useCallback(() => {
    setCatchVisible(false);
    dispatch('dismiss');
  }, []);

  // --- Permission gating ----------------------------------------------------
  // Still loading the permission response.
  if (permission == null) {
    return <View style={styles.permissionContainer} />;
  }

  // Permanently denied — cannot ask again; guide the user to Settings.
  if (!permission.granted && !permission.canAskAgain) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          Pokecat needs the camera to spot cats. Enable it in Settings.
        </Text>
        <Pressable
          style={styles.permissionButton}
          onPress={() => {
            void RNLinking.openSettings();
          }}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          <Text style={styles.permissionButtonText}>Open Settings</Text>
        </Pressable>
      </View>
    );
  }

  // Not yet granted but can still ask.
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          Pokecat uses the camera to spot and catalog stray cats.
        </Text>
        <Pressable
          style={styles.permissionButton}
          onPress={() => {
            void requestPermission();
          }}
          accessibilityRole="button"
          accessibilityLabel="Grant camera permission"
        >
          <Text style={styles.permissionButtonText}>Grant Access</Text>
        </Pressable>
      </View>
    );
  }

  // --- Granted: live feed + overlays ---------------------------------------
  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        ref={cameraRef}
      />

      <AROverlay state={overlayState} onFlashComplete={handleFlashComplete} />

      <ScanPulse active={overlayState === 'detected'} />

      <Animated.View style={[styles.hint, hintStyle]} pointerEvents="none">
        <Text style={styles.hintText}>Point at a stray cat</Text>
      </Animated.View>

      <View style={[styles.actionRow, { bottom: insets.bottom + 110 }]}>
        <CatchButton
          onCatch={handleCatch}
          onPhoto={handlePhoto}
          onHint={handlePickFromLibrary}
        />
      </View>

      <CatchFlow
        visible={catchVisible}
        photoUri={photoUri}
        onCaught={handleCaught}
        onDismiss={handleCatchDismiss}
      />

      <GotchaSheet
        cat={caughtCat}
        visible={gotchaVisible}
        onDismiss={handleGotchaDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0d14',
  },
  actionRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hint: {
    position: 'absolute',
    top: '18%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: '#f5f7fa',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(10, 13, 20, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0a0d14',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    color: '#f5f7fa',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionBody: {
    color: '#8a94a6',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: '#3ddc84',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  permissionButtonText: {
    color: '#0a0d14',
    fontSize: 16,
    fontWeight: '700',
  },
});
