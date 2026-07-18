/**
 * Jest setup for Pokecat (Expo SDK 57).
 *
 * Runs after the test framework is installed (setupFilesAfterEnv). Mocks the
 * native modules the app touches so importing them in a node environment does
 * not crash and tests run without a device.
 */

/* eslint-disable @typescript-eslint/no-var-requires */

// Testing Library custom matchers (v14 ships this entry point).
try {
  require('@testing-library/react-native/extend-expect');
} catch {
  // Matchers unavailable in this version — safe to skip.
}

// --- Reanimated 4 (+ worklets) --------------------------------------------
// Reanimated ships a Jest mock module; use it so shared values / hooks are
// no-ops on the JS thread instead of reaching for the native runtime.
jest.mock('react-native-reanimated', () => {
  try {
    return require('react-native-reanimated/mock');
  } catch {
    return {};
  }
});

// react-native-worklets underpins Reanimated 4. Stub the worklet plumbing so
// runOnUI/runOnJS just invoke synchronously in tests.
jest.mock('react-native-worklets', () => ({
  runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
  runOnUI: (fn: (...args: unknown[]) => unknown) => fn,
  createWorkletRuntime: () => ({}),
}));

// --- Gesture handler -------------------------------------------------------
try {
  require('react-native-gesture-handler/jestSetup');
} catch {
  // Fall back to a minimal stub if the setup file is unavailable.
}

// --- expo-camera -----------------------------------------------------------
jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  const CameraView = React.forwardRef(
    (props: Record<string, unknown>, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({
        takePictureAsync: async () => ({ uri: 'file:///mock/photo.jpg' }),
      }));
      return React.createElement(View, props, (props as any).children);
    }
  );
  return {
    CameraView,
    Camera: CameraView,
    useCameraPermissions: () => [
      { granted: true, status: 'granted', canAskAgain: true },
      jest.fn(async () => ({
        granted: true,
        status: 'granted',
        canAskAgain: true,
      })),
    ],
  };
});

// --- expo-location ---------------------------------------------------------
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
    canAskAgain: true,
  })),
  getForegroundPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
    canAskAgain: true,
  })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: {
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: null,
      accuracy: 5,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: 1_700_000_000_000,
  })),
  Accuracy: { Balanced: 3, High: 4 },
}));

// --- expo-haptics ----------------------------------------------------------
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// --- expo-image-picker -----------------------------------------------------
jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ uri: 'file:///mock/camera.jpg', width: 1024, height: 768 }],
  })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ uri: 'file:///mock/library.jpg', width: 1024, height: 768 }],
  })),
  requestCameraPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
  })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
  })),
  MediaTypeOptions: { Images: 'Images' },
  MediaType: { Images: 'images' },
}));

// --- expo-image-manipulator (v57 context API) ------------------------------
jest.mock('expo-image-manipulator', () => {
  const renderedResult = { uri: 'file:///mock/resized.jpg', width: 1024, height: 768 };
  const context = {
    resize: jest.fn(function (this: unknown) {
      return this;
    }),
    renderAsync: jest.fn(async () => ({
      saveAsync: jest.fn(async () => renderedResult),
    })),
  };
  return {
    ImageManipulator: {
      manipulate: jest.fn(() => context),
    },
    manipulateAsync: jest.fn(async () => renderedResult),
    SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
  };
});

// --- @maplibre/maplibre-react-native --------------------------------------
jest.mock('@maplibre/maplibre-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const passthrough = (name: string) => {
    const Component = (props: Record<string, unknown>) =>
      React.createElement(View, props, (props as any).children);
    Component.displayName = name;
    return Component;
  };
  return {
    __esModule: true,
    MapView: passthrough('MapView'),
    Camera: passthrough('Camera'),
    PointAnnotation: passthrough('PointAnnotation'),
    MarkerView: passthrough('MarkerView'),
    default: {
      MapView: passthrough('MapView'),
      Camera: passthrough('Camera'),
      PointAnnotation: passthrough('PointAnnotation'),
      MarkerView: passthrough('MarkerView'),
    },
  };
});

// --- @shopify/react-native-skia -------------------------------------------
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const { View } = require('react-native');
  const passthrough = (name: string) => {
    const Component = (props: Record<string, unknown>) =>
      React.createElement(View, props, (props as any).children);
    Component.displayName = name;
    return Component;
  };
  return {
    __esModule: true,
    Canvas: passthrough('Canvas'),
    Group: passthrough('Group'),
    Path: passthrough('Path'),
    Circle: passthrough('Circle'),
    Rect: passthrough('Rect'),
    Line: passthrough('Line'),
    Fill: passthrough('Fill'),
    ColorMatrix: passthrough('ColorMatrix'),
    Paint: passthrough('Paint'),
    useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
    useValue: (initial: unknown) => ({ value: initial }),
    Skia: {
      Path: { Make: () => ({}) },
      Matrix: () => ({}),
    },
  };
});
