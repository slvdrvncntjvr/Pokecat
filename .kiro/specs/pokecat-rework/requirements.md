# Requirements Document

## Introduction

Pokecat is an Expo React Native app that reimagines Pokémon-GO-style catching for cataloging stray cats. This rework transforms the app from the default Expo template into a camera-first experience: opening the app immediately shows the live back camera with an AR-style scanning overlay, a floating bottom navigation, and a catch flow that captures, names, tags, and records each cat with GPS location. A map view renders cat sightings over TomTom vector tiles, and a Pokédex view displays the caught-cat roster.

This document targets the ACTUAL installed stack (Expo SDK 57, React Native 0.86.0, React 19.2.3, Reanimated 4.5.0 + react-native-worklets 0.10.0, Skia ~2.0.0, MapLibre ~10.2.0), not the SDK 52 / Reanimated 3 versions mentioned in the original plan text. Per the workspace rule, implementation must follow the Expo v57 documentation (https://docs.expo.dev/versions/v57.0.0/). The app requires an Expo Dev Build (not Expo Go) because it uses MapLibre and native expo-camera capabilities.

## Glossary

- **Pokecat**: The overall React Native application described by this specification.
- **Camera_Screen**: The default/home screen showing the live back-camera feed with the AR overlay and floating controls.
- **Camera_Service**: The subsystem wrapping expo-camera CameraView that manages permission state, back-camera preview, and still capture.
- **AR_Overlay**: The Skia-rendered GPU canvas drawn over the camera feed, including corner brackets, scan ring, scan line, and crosshair.
- **Scan_Pulse**: The Reanimated ring-pulse animation triggered when a cat is detected (manual tap).
- **Catch_Flow**: The bottom-sheet workflow that collects a cat's name and tags and triggers the catch.
- **Gotcha_Sheet**: The full-screen "SPOTTED!" moment presented after a successful catch.
- **Catch_Button**: The center action control that triggers the catch sequence.
- **Photo_Service**: The subsystem wrapping expo-image-picker/expo-image-manipulator that captures and resizes a cat photo before storage.
- **Location_Service**: The subsystem wrapping expo-location that provides foreground GPS coordinates for a catch.
- **Haptics_Service**: The subsystem wrapping expo-haptics that produces impact and notification feedback.
- **Data_Store**: The expo-sqlite database layer holding the `cats` and `player` tables and their queries.
- **Map_Screen**: The screen that renders TomTom vector tiles via MapLibre with condition-colored cat pins.
- **TomTom_Service**: The integration with the TomTom Map Display API (tile style JSON) and Search API (reverse geocoding).
- **Cat_Marker**: The custom condition-colored teardrop marker rendered for each cat on the Map_Screen.
- **Pokedex_Screen**: The roster grid screen listing all caught cats.
- **Cat_Card**: The bottom-sheet stat card that displays a single cat's details.
- **Tab_Bar**: The custom floating dark-glass bottom navigation bar overlaid on the Camera_Screen.
- **Cat_Record**: A stored row in the `cats` table representing one cataloged cat.
- **Player_Record**: The stored row in the `player` table representing the current user.
- **Condition**: A categorical health/status value for a cat used to color the Cat_Marker.
- **Personality**: A categorical temperament tag assigned to a cat during the Catch_Flow.
- **Dev_Build**: An Expo Development Build installed on a physical device or emulator, required because MapLibre and expo-camera are not supported in Expo Go.

## Requirements

### Requirement 1: Dev Build and Permission Prerequisites

**User Story:** As a developer, I want the app to run as an Expo Dev Build with the correct native permissions declared, so that camera, location, and map features function on a physical device.

#### Acceptance Criteria

1. THE Pokecat SHALL declare camera and location permissions for iOS and Android in the app configuration.
2. THE Pokecat SHALL register the expo-camera, expo-location, expo-sqlite, expo-image-picker, and MapLibre config plugins in the app configuration.
3. WHEN the project is bundled with `expo start`, THE Pokecat SHALL complete bundling without configuration errors.
4. IF the app is launched in Expo Go, THEN THE Pokecat SHALL be documented as unsupported and SHALL require a Dev Build for MapLibre and expo-camera features.
5. THE Pokecat SHALL use the dark user-interface style with background color `#0a0d14` as the default theme.
6. THE Pokecat SHALL target Android as the primary Dev Build platform and SHALL be buildable on a device via `expo run:android`.
7. THE Pokecat SHALL read the TomTom API key from an environment variable and SHALL provide a `.env` placeholder entry for the key.
8. IF the TomTom API key environment variable is unset or empty, THEN THE Pokecat SHALL treat the key as unconfigured and SHALL surface the configuration message defined in Requirement 9.

### Requirement 2: Camera-First Home Screen

**User Story:** As a user, I want the live back camera to appear immediately when I open the app, so that catching a cat feels instant.

#### Acceptance Criteria

1. WHEN the Camera_Screen mounts and camera permission is granted, THE Camera_Service SHALL display the live back-camera feed as the full-screen background.
2. THE Camera_Screen SHALL render the Tab_Bar and the floating action row as overlays above the camera feed.
3. THE floating action row SHALL present a photo control, a center Catch_Button, and a hint control.
4. WHEN the Camera_Screen has been visible for 3 seconds, THE Camera_Screen SHALL fade out the hint text "Point at a stray cat".
5. THE Camera_Screen SHALL be configured as the default route of the tab navigator.

### Requirement 3: Camera Permission Handling

**User Story:** As a user, I want a clear permission prompt and fallback, so that I understand why the camera is needed and how to enable it.

#### Acceptance Criteria

1. WHEN the Camera_Screen mounts and camera permission status is undetermined, THE Camera_Service SHALL request camera permission from the operating system.
2. WHILE camera permission is not granted, THE Camera_Screen SHALL display a permission-request view explaining that camera access is required and offering a control to grant access.
3. IF the user denies camera permission, THEN THE Camera_Screen SHALL display a message directing the user to enable camera access in device settings.
4. WHEN camera permission transitions from not-granted to granted, THE Camera_Service SHALL display the live back-camera feed without requiring an app restart.

### Requirement 4: AR Overlay States

**User Story:** As a user, I want an animated AR scanning overlay, so that pointing the camera at a cat feels like a targeting experience.

#### Acceptance Criteria

1. WHILE the AR_Overlay is in the idle state, THE AR_Overlay SHALL animate the corner brackets breathing between scale 0.95 and 1.0 and SHALL sweep the scan line from top to bottom on a repeating loop.
2. THE AR_Overlay SHALL render at a target frame rate of 60 frames per second on the UI thread.
3. WHEN the user taps to indicate a detected cat, THE AR_Overlay SHALL snap the corner brackets to the locked position and SHALL trigger the Scan_Pulse ring expanding outward.
4. WHEN a cat is detected, THE Haptics_Service SHALL produce an impact feedback event.
5. WHILE the AR_Overlay is in the no-cat state, THE AR_Overlay SHALL pulse the hint text prompting the user to scan.
6. WHEN the catch sequence is triggered, THE AR_Overlay SHALL desaturate the screen and SHALL produce a flash transition before the Gotcha_Sheet is presented.

### Requirement 5: Catch Flow (Name and Tag)

**User Story:** As a user, I want to name and tag a cat when I catch it, so that each cataloged cat has meaningful details.

#### Acceptance Criteria

1. WHEN the user activates the Catch_Button, THE Catch_Flow SHALL present a bottom sheet that rises from the bottom of the screen.
2. THE Catch_Flow SHALL provide an input for the cat name and controls for selecting Condition and Personality tags.
3. IF the user attempts to complete a catch without a non-empty name, THEN THE Catch_Flow SHALL prevent completion and SHALL display a validation message requesting a name.
4. THE Catch_Flow SHALL provide controls for the optional tags is-TNR, needs-rescue, and a free-text note.
5. WHEN the user confirms the catch with a valid name and a selected Condition and Personality, THE Catch_Flow SHALL persist a Cat_Record and SHALL present the Gotcha_Sheet.

### Requirement 6: Photo Capture and Resize

**User Story:** As a user, I want a photo of the cat captured and stored efficiently, so that my roster shows real pictures without wasting storage.

#### Acceptance Criteria

1. WHEN the user activates the photo control, THE Photo_Service SHALL capture a still image from the back camera or select an image via the image picker.
2. WHEN an image is captured or selected, THE Photo_Service SHALL resize the image before storage.
3. WHEN an image is resized, THE Photo_Service SHALL persist the resulting image to device storage and SHALL provide the resulting photo URI to the Catch_Flow.
4. IF image capture or resizing fails, THEN THE Photo_Service SHALL return a descriptive error and THE Catch_Flow SHALL allow the catch to proceed without a photo.

### Requirement 7: SPOTTED Moment with Haptics

**User Story:** As a user, I want a rewarding "SPOTTED!" moment after catching a cat, so that catching feels satisfying.

#### Acceptance Criteria

1. WHEN a Cat_Record is successfully persisted, THE Gotcha_Sheet SHALL rise into a full-screen presentation displaying the cat's name and photo.
2. WHEN the Gotcha_Sheet is presented, THE Haptics_Service SHALL produce a success notification feedback event.
3. WHEN the user dismisses the Gotcha_Sheet, THE Pokecat SHALL return the user to the Camera_Screen with the AR_Overlay in the idle state.

### Requirement 8: SQLite Data Layer

**User Story:** As a user, I want my caught cats and profile stored on the device, so that my catalog persists across app launches.

#### Acceptance Criteria

1. WHEN the Data_Store initializes, THE Data_Store SHALL create the `cats` table with columns id, name, photo_uri, condition, personality, note, lat, lng, location_name, caught_at, caught_by, sighting_count, is_tnr, needs_rescue, and last_fed if the table does not already exist.
2. WHEN the Data_Store initializes, THE Data_Store SHALL create the `player` table with columns id, name, and joined_at if the table does not already exist.
3. WHEN a Cat_Record is created, THE Data_Store SHALL assign a unique text identifier and SHALL store the caught_at timestamp.
4. THE Data_Store SHALL provide a query that returns all Cat_Records for the Pokedex_Screen and the Map_Screen.
5. THE Data_Store SHALL provide a query that returns a single Cat_Record by its identifier for the Cat_Card.
6. WHEN a Cat_Record is inserted and then retrieved by its identifier, THE Data_Store SHALL return a record whose stored field values equal the inserted field values (round-trip property).
7. IF a Cat_Record insertion omits a required field defined as NOT NULL, THEN THE Data_Store SHALL reject the insertion and SHALL return a descriptive error.

### Requirement 9: Map with TomTom Tiles

**User Story:** As a user, I want a map that shows where I caught cats, so that I can see my sightings geographically.

#### Acceptance Criteria

1. WHEN the Map_Screen mounts, THE TomTom_Service SHALL load the TomTom Map Display style and THE Map_Screen SHALL render the resulting vector tiles via MapLibre.
2. WHILE the app is in the dark theme, THE Map_Screen SHALL render the TomTom night map style.
3. WHEN Cat_Records are available, THE Map_Screen SHALL render one Cat_Marker for each Cat_Record at the record's latitude and longitude.
4. THE Cat_Marker SHALL be colored according to the associated cat's Condition value.
5. IF the TomTom style fails to load, THEN THE Map_Screen SHALL display an error state indicating that the map is unavailable.
6. WHERE a valid TomTom API key is not configured, THE TomTom_Service SHALL surface a configuration message indicating that a key is required.

### Requirement 10: Location Capture and Reverse Geocoding

**User Story:** As a user, I want each cat pinned to where I found it with a readable place name, so that sightings are located accurately.

#### Acceptance Criteria

1. WHEN the Camera_Screen mounts and location permission status is undetermined, THE Location_Service SHALL request foreground location permission from the operating system.
2. WHEN a catch is confirmed and location permission is granted, THE Location_Service SHALL provide the current latitude and longitude to the Catch_Flow.
3. WHEN a catch is confirmed and coordinates are available, THE TomTom_Service SHALL reverse-geocode the coordinates into a location name via the TomTom Search API and THE Catch_Flow SHALL store the resulting location_name with the Cat_Record.
4. IF location permission is denied, THEN THE Catch_Flow SHALL allow the catch to proceed and THE Data_Store SHALL store the Cat_Record without a location_name.
5. IF reverse geocoding fails, THEN THE Catch_Flow SHALL store the Cat_Record with its coordinates and without a location_name.

### Requirement 11: Pokedex Roster Grid

**User Story:** As a user, I want a grid view of all cats I've caught, so that I can browse my collection.

#### Acceptance Criteria

1. WHEN the Pokedex_Screen mounts, THE Pokedex_Screen SHALL query all Cat_Records from the Data_Store and SHALL render them as a grid.
2. THE Pokedex_Screen SHALL display each cat's photo and name in its grid cell.
3. WHILE no Cat_Records exist, THE Pokedex_Screen SHALL display an empty-state message prompting the user to catch a cat.
4. WHEN the user selects a grid cell, THE Pokedex_Screen SHALL present the Cat_Card for the selected Cat_Record.

### Requirement 12: Cat Detail Card

**User Story:** As a user, I want to view a cat's full details, so that I can review its condition, personality, and location.

#### Acceptance Criteria

1. WHEN the Cat_Card is presented for a Cat_Record, THE Cat_Card SHALL display the cat's name, photo, Condition, Personality, note, location_name, and caught_at timestamp.
2. WHERE a Cat_Record has no photo_uri, THE Cat_Card SHALL display a placeholder image in place of the photo.
3. WHERE a Cat_Record has no location_name, THE Cat_Card SHALL display the stored latitude and longitude instead of a place name.
4. WHEN the user dismisses the Cat_Card, THE Pokecat SHALL return the user to the originating screen.

### Requirement 13: Floating Tab Navigation

**User Story:** As a user, I want floating navigation that stays out of the way of the camera, so that the camera remains the focus.

#### Acceptance Criteria

1. THE Tab_Bar SHALL present navigation controls for the Camera_Screen, the Map_Screen, and the Pokedex_Screen.
2. THE Tab_Bar SHALL be rendered as a dark-glass overlay floating above the active screen content.
3. WHEN the user selects a Tab_Bar control, THE Pokecat SHALL navigate to the corresponding screen.
4. THE Tab_Bar SHALL visually indicate which screen is currently active.
