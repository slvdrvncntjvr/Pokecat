/**
 * Tab navigation shell (R2.5, R13.1).
 *
 * Uses expo-router `Tabs` with a custom {@link TabBar} injected via the
 * `tabBar` prop. Headers are hidden and the scene background is transparent so
 * the full-screen camera feed on the default Camera route shows through behind
 * the floating dark-glass Tab_Bar. Three routes are declared: `index` (default
 * Camera), `map`, and `pokedex`.
 */
import { Tabs } from 'expo-router';

import TabBar from '@/components/shared/TabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Transparent scene so the camera feed shows through behind screens.
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Camera' }} />
      <Tabs.Screen name="map" options={{ title: 'Map' }} />
      <Tabs.Screen name="pokedex" options={{ title: 'Pokedex' }} />
    </Tabs>
  );
}
