/**
 * Jest configuration for Pokecat (Expo SDK 57).
 *
 * Uses the `jest-expo` preset (babel-preset-expo via babel-jest). The
 * `transformIgnorePatterns` follow the standard jest-expo prefix-match form so
 * `expo`, `expo-*`, and `@expo/*` packages are transformed, plus the extra
 * RN/native packages this app depends on. `jest.setup.ts` mocks native modules
 * so tests run in a node environment without a device.
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      '.pnpm' +
      '|(jest-)?react-native' +
      '|@react-native' +
      '|@react-native-community' +
      '|expo' +
      '|@expo' +
      '|@expo-google-fonts' +
      '|react-navigation' +
      '|@react-navigation' +
      '|@shopify/react-native-skia' +
      '|@maplibre/maplibre-react-native' +
      '|react-native-reanimated' +
      '|react-native-worklets' +
      '|react-native-gesture-handler' +
      '|react-native-safe-area-context' +
      '|react-native-screens' +
      '|expo-router' +
      '|uuid' +
      '))',
    // Reanimated's babel plugin must not be transformed (reentrant plugin).
    '/node_modules/react-native-reanimated/plugin/',
    // The RN babel preset is part of the transformer itself.
    '/node_modules/@react-native/babel-preset/',
  ],
};
