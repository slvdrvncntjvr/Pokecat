# Implementation Plan: Pokecat Rework

## Overview

This plan converts the Pokecat camera-first design into incremental TypeScript coding tasks for an Expo SDK 57 dev build. It builds bottom-up: shared types and pure helpers first (trivially testable), then the SQLite Data_Store, then side-effecting services, then the layout/navigation shell, and finally the Camera, Catch, Map, and Pokedex feature screens, wiring everything together with the leftover Expo template removed at the end.

All code must follow the Expo v57 documentation (https://docs.expo.dev/versions/v57.0.0/) per the workspace rule. Property-based tests use `fast-check` with a minimum of 100 iterations (`{ numRuns: 100 }`) and are tagged `// Feature: pokecat-rework, Property {n}: ...`. Each correctness property P1–P9 maps to exactly one property test sub-task.

## Tasks

- [x] 1. Establish shared types and testing infrastructure
  - [x] 1.1 Create `lib/types.ts`
    - Define `Condition` and `Personality` string-union types
    - Define `Cat_Record` and `Player_Record` interfaces exactly as in the design (nullable fields, boolean flags, epoch-ms timestamps)
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 1.2 Install and configure the test toolchain
    - Add dev deps `fast-check`, `jest-expo`, `@testing-library/react-native`, `@types/jest` (pin exact versions compatible with SDK 57)
    - Configure Jest in `package.json`/`jest.config.js` with `preset: "jest-expo"`, a `test` script, and `transformIgnorePatterns` for RN/Expo modules
    - Add a `jest.setup.ts` that mocks native modules (expo-camera, expo-location, expo-haptics, expo-image-picker, expo-image-manipulator, MaplLibre, Skia) so tests run without a device
    - Add a trivial smoke test and confirm the runner executes
    - _Requirements: 1.3_

- [x] 2. Implement pure helpers and their property tests
  - [x] 2.1 Implement `lib/catHelpers.ts`
    - `conditionColor(condition: Condition): string` — total switch over the union returning the design's hex colors
    - `isValidName(name: string): boolean` — true when `name.trim().length > 0`
    - `formatLocation(record: Cat_Record): string` — return `location_name` when non-null, else `"lat, lng"` from coords, else a defined placeholder
    - _Requirements: 5.3, 9.4, 12.3_

  - [x]* 2.2 Write property test for condition-to-color mapping
    - **Property 3: Condition-to-color mapping is total and deterministic**
    - Generator: `fc.constantFrom(...)` over the `Condition` union; assert defined non-empty string and repeat-call determinism
    - **Validates: Requirements 9.4**

  - [x]* 2.3 Write property test for name validation
    - **Property 2: Name validation rejects blank names**
    - Generators: whitespace-only strings (rejected) vs. strings with ≥1 non-whitespace char (accepted)
    - **Validates: Requirements 5.3**

  - [x]* 2.4 Write property test for location fallback formatting
    - **Property 4: Location display falls back to coordinates when no place name**
    - Generator: Cat_Records with/without `location_name` and with/without coords
    - **Validates: Requirements 12.3**

- [x] 3. Implement the SQLite Data_Store
  - [x] 3.1 Implement schema, mappers, and `initDatabase` in `lib/db.ts`
    - Use expo-sqlite v15 async API (`openDatabaseAsync`, `execAsync`, `runAsync`, `getAllAsync`, `getFirstAsync`) with a memoized single connection
    - Run `CREATE TABLE IF NOT EXISTS` migrations for `cats` and `player` per the design schema
    - Implement `rowToCat` (and inverse binding helper) mapping INTEGER 0/1 ↔ boolean and NULL ↔ null
    - _Requirements: 8.1, 8.2_

  - [x] 3.2 Implement `insertCat`, `getAllCats`, `getCatById`, `upsertPlayer`
    - `insertCat`: validate required NOT NULL fields (`name`, `condition`, `personality`) and throw a descriptive `Error` if missing; assign uuid v4 `id` and `caught_at` when absent; bind all fields as parameters
    - `getAllCats`: `SELECT * ... ORDER BY caught_at DESC` mapped through `rowToCat`
    - `getCatById`: single-row lookup by id, returns `Cat_Record | null`
    - `upsertPlayer`: insert-or-replace the player row
    - _Requirements: 8.3, 8.4, 8.5, 8.7_

  - [ ]* 3.3 Write unit tests for Data_Store initialization
    - After `initDatabase()`, assert `cats` and `player` tables and expected columns exist; assert running init twice is idempotent
    - Use a fresh/temp db name per test; reset between tests
    - _Requirements: 8.1, 8.2_

  - [ ]* 3.4 Write property test for insert/retrieve round-trip
    - **Property 5: Cat_Record insert/retrieve round-trip preserves all fields**
    - Generator: arbitrary valid Cat_Records incl. null `photo_uri`/`lat`/`lng`/`location_name`; assert `getCatById` returns field-equal record (booleans + nulls preserved); fresh db per run
    - **Validates: Requirements 8.5, 8.6, 6.4, 10.4, 10.5**

  - [ ]* 3.5 Write property test for getAllCats completeness and ordering
    - **Property 6: getAllCats returns every inserted record**
    - Generator: arrays of arbitrary Cat_Records; assert exact set membership (count + field values) and `caught_at` descending order
    - **Validates: Requirements 8.4**

  - [ ]* 3.6 Write property test for unique id and caught_at assignment
    - **Property 7: Inserted records get a unique id and a caught_at timestamp**
    - Generator: sequences of inserts; assert non-empty distinct ids and populated `caught_at`
    - **Validates: Requirements 8.3**

  - [ ]* 3.7 Write property test for NOT NULL rejection
    - **Property 8: Omitting a NOT NULL field is rejected with a descriptive error**
    - Generator: inputs with one of `name`/`condition`/`personality` forced null/undefined; assert `insertCat` throws and no row is added
    - **Validates: Requirements 8.7**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all foundation + Data_Store tests pass, ask the user if questions arise.

- [ ] 5. Implement side-effecting services
  - [x] 5.1 Implement `lib/tomtomService.ts`
    - Read key from `process.env.EXPO_PUBLIC_TOMTOM_API_KEY`; add a `.env` placeholder entry for the key
    - `isConfigured()` (true only for non-blank key), `getMapStyleUrl()` (TomTom night style URL, null if unconfigured), `reverseGeocode(lat, lng)` (TomTom Search API, null on failure/unconfigured)
    - _Requirements: 1.7, 1.8, 9.1, 9.2, 9.6, 10.3_

  - [ ]* 5.2 Write property test for TomTom key configuration
    - **Property 1: TomTom key configuration is correct across all key values**
    - Generator: strings incl. empty, whitespace-only, undefined, arbitrary non-blank keys; assert `isConfigured`/`getMapStyleUrl` results
    - **Validates: Requirements 1.8, 9.6**

  - [ ]* 5.3 Write unit test for configured map style URL
    - Assert `getMapStyleUrl()` returns the night/dark style URL when a key is configured
    - _Requirements: 9.2_

  - [x] 5.4 Implement `lib/hapticsService.ts`
    - `impactDetect()` → `Haptics.impactAsync(Medium)`; `notificationSpotted()` → `Haptics.notificationAsync(Success)`
    - _Requirements: 4.4, 7.2_

  - [x] 5.5 Implement `lib/locationService.ts`
    - `ensurePermission()` via `requestForegroundPermissionsAsync`; `getCurrentCoords()` returns `{lat,lng}` or null when denied/unavailable
    - _Requirements: 10.1, 10.2, 10.4_

  - [x] 5.6 Implement `lib/photoService.ts` and Camera_Service helper
    - `capturePhoto(cameraRef)`, `pickPhoto()`, `resizeAndPersist(uri)` (max width ~1024, jpeg ~0.7, persist to documentDirectory) using expo-image-picker + expo-image-manipulator v57 `manipulate` context API
    - Return `{ uri: null, error }` on any failure so the catch can proceed photo-less
    - Add `lib/cameraService.ts` with `captureStill(cameraRef)` and permission-state derivation helper
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 6. Implement root and tab navigation shell
  - [x] 6.1 Implement `app/_layout.tsx`
    - Import `react-native-reanimated` at top; wrap tree in `GestureHandlerRootView`; call `await initDatabase()` on mount and hold splash until fonts + DB init complete; apply dark theme with background `#0a0d14`
    - _Requirements: 1.5, 8.1, 8.2_

  - [x] 6.2 Implement `components/shared/TabBar.tsx`
    - Floating rounded dark-glass bar above the safe-area bottom with Camera/Map/Pokedex controls; highlight active route; navigate via `navigation.navigate(route)`
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 6.3 Implement `app/(tabs)/_layout.tsx`
    - expo-router `Tabs` with `tabBar={(props) => <TabBar {...props} />}`, `headerShown: false`, transparent `sceneStyle`; routes `index` (default Camera), `map`, `pokedex`
    - _Requirements: 2.5, 13.1_

  - [ ]* 6.4 Write unit test for TabBar controls
    - Assert TabBar renders the three navigation controls and highlights the active route
    - _Requirements: 13.1, 13.4_

- [ ] 7. Implement the Camera_Screen and AR overlay
  - [ ] 7.1 Implement the AR_Overlay reducer and `components/camera/AROverlay.tsx`
    - Extract a pure reducer `arOverlayReducer(state, event)` over states `idle`/`detected`/`catching` (detect → detected, dismiss/reset → idle, catch → catching)
    - Render a Skia `<Canvas>` at `absoluteFill` drawing corner brackets, scan ring, scan line, crosshair; drive `bracketScale`/`scanY`/`desaturate`/`flash` with Reanimated 4 shared values (via react-native-worklets) read by Skia for 60fps; fire `onFlashComplete` after desaturate+flash
    - _Requirements: 4.1, 4.2, 4.3, 4.6_

  - [ ]* 7.2 Write property test for the AR_Overlay reducer
    - **Property 9: AR_Overlay detect transition locks brackets and enters detected state**
    - Generator: arbitrary starting state + event sequences; assert detect → `detected`, dismiss/reset → `idle`
    - **Validates: Requirements 4.3**

  - [ ] 7.3 Implement `components/camera/ScanPulse.tsx` and `components/camera/CatchButton.tsx`
    - ScanPulse: Reanimated expanding ring (scale 1→2.5, opacity 1→0) fired on `detected`
    - CatchButton: center action-row control that sets AR_Overlay to `detected` (impact haptic + Scan_Pulse) and opens the Catch_Flow; flank with photo control (left) and hint control (right)
    - _Requirements: 2.3, 4.3, 4.4, 5.1_

  - [ ] 7.4 Implement `app/(tabs)/index.tsx` (Camera_Screen)
    - Render `<CameraView style={StyleSheet.absoluteFill} facing="back" ref={cameraRef} />` full-screen when granted; request camera permission on mount when undetermined; permission-request view while not granted; "enable in Settings" (`Linking.openSettings()`) when permanently denied; re-render to live feed on grant without restart
    - Overlay AR_Overlay + floating action row above the feed; fade out "Point at a stray cat" hint after 3s; call `locationService.ensurePermission()` on mount when undetermined
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 10.1_

  - [ ]* 7.5 Write unit tests for action row and permission states
    - Assert the action row presents photo/catch/hint controls; assert permission-request and settings-denied views render for the corresponding states
    - _Requirements: 2.3, 3.2, 3.3_

- [ ] 8. Implement the Catch_Flow and Gotcha_Sheet
  - [-] 8.1 Implement `components/catch/CatchFlow.tsx`
    - Bottom sheet rising from the bottom (Reanimated translateY + gesture-handler pan-to-dismiss); name input, Condition/Personality chip selectors, is-TNR/needs-rescue toggles, free-text note
    - On Confirm: block with validation message when `isValidName` is false; orchestrate photo (may be null) → `getCurrentCoords` → `reverseGeocode` (null-safe) → `insertCat` → `notificationSpotted` → trigger AR desaturate+flash then present Gotcha_Sheet
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.4, 7.1, 7.2, 10.2, 10.3, 10.4, 10.5_

  - [ ] 8.2 Implement `components/catch/GotchaSheet.tsx`
    - Full-screen "SPOTTED!" presentation with cat name and photo; fire success notification haptic on present; dismiss returns to Camera_Screen with AR_Overlay reset to `idle`
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 8.3 Write unit tests for Catch_Flow controls and Gotcha reset
    - Assert Catch_Flow renders name input + Condition/Personality controls and is-TNR/needs-rescue/note controls; assert blank-name confirm shows validation message and blocks; assert Gotcha dismiss resets to idle (mocked navigation/haptics)
    - _Requirements: 5.2, 5.3, 5.4, 7.3_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure Camera, AR overlay, and Catch flow tests pass, ask the user if questions arise.

- [ ] 10. Implement the Map_Screen
  - [ ] 10.1 Implement `components/map/CatMarker.tsx`
    - Teardrop marker whose fill comes from `conditionColor(condition)`
    - _Requirements: 9.4_

  - [ ] 10.2 Implement `app/(tabs)/map.tsx`
    - MapLibre `<MapView mapStyle={getMapStyleUrl()} />` (v10 prop) with night style; render one Cat_Marker per Cat_Record at its lat/lng; refresh cats on focus; show config message when key unconfigured; show "map unavailable" error state on style-load failure
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6_

  - [ ]* 10.3 Write unit test for marker mapping
    - Given a list of cats with coordinates, assert one Cat_Marker per cat at correct coordinates; assert unconfigured-key config message renders
    - _Requirements: 9.3, 9.6_

- [ ] 11. Implement the Pokedex_Screen and Cat_Card
  - [ ] 11.1 Implement `components/shared/CatCard.tsx`
    - Bottom-sheet card showing name, photo (placeholder when `photo_uri` null), condition, personality, note, location (`formatLocation`), formatted `caught_at`; dismiss returns to originating screen
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ] 11.2 Implement `app/(tabs)/pokedex.tsx`
    - `FlatList` grid (`numColumns={3}`) querying `getAllCats()` on focus; each cell shows photo (or placeholder) + name; empty-state message when no cats; selecting a cell presents the Cat_Card
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 11.3 Write unit tests for Pokedex grid, empty state, and Cat_Card
    - Assert grid cell shows photo + name; assert empty roster shows empty-state message; assert Cat_Card renders all fields and a placeholder when `photo_uri` is null
    - _Requirements: 11.2, 11.3, 12.1, 12.2_

- [ ] 12. Cleanup and final wiring
  - [ ] 12.1 Remove leftover Expo template files
    - Delete `app/(tabs)/two.tsx`, `components/EditScreenInfo.tsx`, and any other unused default-template files/components; remove dangling imports and update references so the app compiles cleanly
    - _Requirements: 2.5_

  - [ ] 12.2 Final integration wiring
    - Ensure `_layout` → `(tabs)/_layout` → screens → components → services are all connected end-to-end; confirm a caught cat flows from Catch_Flow into the Data_Store and appears on Map_Screen and Pokedex_Screen via focus refresh; run `getDiagnostics` and resolve type/lint issues
    - _Requirements: 2.5, 8.4, 9.3, 11.1_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all automated tests pass and diagnostics are clean, ask the user if questions arise.
  - Manual verification guidance (not automated): build a Dev Build and run on device via `expo run:android`, confirm the camera feed, catch flow, map tiles, and pokedex render; confirm `expo start` bundles without config errors. These build/config criteria (R1.1–R1.4, R1.6) are verified manually.

## Notes

- Tasks marked with `*` are optional test-writing sub-tasks and can be skipped for a faster MVP; unmarked tasks are required core functionality.
- Each task references specific requirement sub-clauses for traceability.
- Property tests P1–P9 each map to exactly one sub-task, use `fast-check` with `{ numRuns: 100 }`, and carry the `// Feature: pokecat-rework, Property {n}: ...` tag.
- Data_Store property/unit tests reset a fresh SQLite database per run so state does not leak between iterations.
- Checkpoints ensure incremental validation at natural integration boundaries.
