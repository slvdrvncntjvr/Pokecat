/**
 * Map_Screen (R9.1–R9.6).
 *
 * Renders TomTom night-style vector tiles via MapLibre and drops one
 * {@link CatMarker} per Cat_Record at its coordinates.
 *
 * Degrades gracefully:
 *  - When no TomTom key is configured (`getMapStyleUrl()` → null), it shows a
 *    centered configuration message instead of the map (R9.6).
 *  - When the map style fails to load (`onDidFailLoadingMap`), it shows a
 *    "map unavailable" error state (R9.5).
 *
 * Cats are (re)loaded from the Data_Store on focus via `useFocusEffect` so a
 * newly caught cat appears without an app restart.
 *
 * Uses the MapLibre v10 API: `MapView` with the `mapStyle` prop, `Camera`, and
 * `MarkerView` (per the installed `@maplibre/maplibre-react-native` ~10.2).
 */
import { Camera, MapView, MarkerView } from '@maplibre/maplibre-react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import CatMarker from '@/components/map/CatMarker';
import { getAllCats } from '@/lib/db';
import { getMapStyleUrl, isConfigured } from '@/lib/tomtomService';
import type { Cat_Record } from '@/lib/types';

const BACKGROUND = '#0a0d14';

/** Fallback camera center used when there are no cats to frame (roughly global). */
const DEFAULT_CENTER: [number, number] = [0, 20];
const DEFAULT_ZOOM = 1;

export default function MapScreen() {
  const [cats, setCats] = useState<Cat_Record[]>([]);
  const [styleFailed, setStyleFailed] = useState(false);

  // Reload cats every time the screen gains focus (R9.3 focus refresh).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const rows = await getAllCats();
          if (active) {
            setCats(rows);
          }
        } catch {
          if (active) {
            setCats([]);
          }
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  // R9.6: no configured key → surface the configuration message, not the map.
  if (!isConfigured()) {
    return (
      <View style={styles.centered}>
        <Text style={styles.messageTitle}>
          TomTom API key required — set EXPO_PUBLIC_TOMTOM_API_KEY
        </Text>
      </View>
    );
  }

  const mapStyle = getMapStyleUrl();

  // R9.5: style failed to load → error state.
  if (styleFailed || mapStyle == null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.messageTitle}>Map unavailable</Text>
        <Text style={styles.messageBody}>
          The map style could not be loaded.
        </Text>
      </View>
    );
  }

  // Cats with coordinates are the only ones we can place on the map.
  const locatedCats = cats.filter(
    (cat): cat is Cat_Record & { lat: number; lng: number } =>
      cat.lat != null && cat.lng != null
  );

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        mapStyle={mapStyle}
        onDidFailLoadingMap={() => setStyleFailed(true)}
      >
        <Camera
          defaultSettings={{
            centerCoordinate: DEFAULT_CENTER,
            zoomLevel: DEFAULT_ZOOM,
          }}
        />
        {locatedCats.map((cat) => (
          <MarkerView
            key={cat.id}
            coordinate={[cat.lng, cat.lat]}
            anchor={{ x: 0.5, y: 1 }}
          >
            <CatMarker condition={cat.condition} />
          </MarkerView>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  // Leave room below for the floating Tab_Bar.
  map: {
    flex: 1,
    marginBottom: 96,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: BACKGROUND,
  },
  messageTitle: {
    color: '#f2f4f8',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  messageBody: {
    color: '#8a94a6',
    fontSize: 14,
    textAlign: 'center',
  },
});
