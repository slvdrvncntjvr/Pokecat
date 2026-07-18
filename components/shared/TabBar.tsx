/**
 * Tab_Bar — a custom floating dark-glass bottom navigation bar overlaid on the
 * active screen (R13.1–R13.4).
 *
 * Rendered via expo-router `Tabs`' `tabBar` prop, so it receives the
 * react-navigation {@link BottomTabBarProps} (`state`, `navigation`,
 * `descriptors`). It presents three controls — Camera, Map, Pokedex — floating
 * above the safe-area bottom inset, highlights the active route (`state.index`),
 * and navigates via `navigation.navigate(route.name)`.
 */
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** A navigable control shown in the Tab_Bar. */
interface TabControl {
  /** The expo-router route name for the tab. */
  routeName: string;
  /** Human-readable label shown under the icon. */
  label: string;
  /** Emoji glyph used as a cross-platform icon (Android is the primary target). */
  icon: string;
}

/**
 * Route-name → control mapping. Order defines left-to-right layout: the default
 * Camera route is `index`, then `map`, then `pokedex`.
 */
const TAB_CONTROLS: TabControl[] = [
  { routeName: 'index', label: 'Camera', icon: '📷' },
  { routeName: 'map', label: 'Map', icon: '🗺️' },
  { routeName: 'pokedex', label: 'Pokedex', icon: '📕' },
];

const ACTIVE_COLOR = '#4da6ff';
const INACTIVE_COLOR = '#8a94a6';

export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Route name of the currently focused tab (drives active highlighting).
  const activeRouteName = state.routes[state.index]?.name;

  return (
    <View
      style={[styles.wrapper, { bottom: insets.bottom + 16 }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {TAB_CONTROLS.map((control) => {
          const isActive = control.routeName === activeRouteName;
          return (
            <Pressable
              key={control.routeName}
              accessibilityRole="button"
              accessibilityState={isActive ? { selected: true } : {}}
              accessibilityLabel={control.label}
              onPress={() => navigation.navigate(control.routeName)}
              style={styles.control}
            >
              <Text
                style={[
                  styles.icon,
                  { opacity: isActive ? 1 : 0.6 },
                ]}
              >
                {control.icon}
              </Text>
              <Text
                style={[
                  styles.label,
                  { color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR },
                ]}
              >
                {control.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    // Semi-transparent dark-glass surface matching the #0a0d14 theme.
    backgroundColor: 'rgba(10, 13, 20, 0.85)',
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    // Soft floating shadow.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  control: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  icon: {
    fontSize: 22,
    lineHeight: 26,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
});
