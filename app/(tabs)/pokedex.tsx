/**
 * Pokedex_Screen — a grid roster of every cataloged cat (R11.1–R11.4).
 *
 * On focus it queries the Data_Store via {@link getAllCats} and renders a
 * three-column `FlatList` grid. Each cell shows the cat's photo (or an emoji
 * placeholder when `photo_uri` is null) and its name. When the roster is empty
 * an empty-state message prompts the user to catch a cat. Selecting a cell
 * presents the {@link CatCard} bottom sheet for that cat.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CatCard from '@/components/shared/CatCard';
import { getAllCats } from '@/lib/db';
import type { Cat_Record } from '@/lib/types';

/** Number of grid columns in the roster (R11.1). */
const NUM_COLUMNS = 3;

/** Extra bottom padding so content clears the floating tab bar. */
const TAB_BAR_CLEARANCE = 96;

export default function PokedexScreen() {
  const insets = useSafeAreaInsets();
  const [cats, setCats] = useState<Cat_Record[]>([]);
  const [selectedCat, setSelectedCat] = useState<Cat_Record | null>(null);

  // Reload the roster whenever the screen gains focus so a newly caught cat
  // appears without an app restart (R11.1).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getAllCats()
        .then((rows) => {
          if (!cancelled) setCats(rows);
        })
        .catch((e) => {
          console.error('Failed to load cats', e);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const renderItem = useCallback(
    ({ item }: { item: Cat_Record }) => (
      <Pressable
        style={styles.cell}
        accessibilityRole="button"
        accessibilityLabel={item.name}
        onPress={() => setSelectedCat(item)}
      >
        {item.photo_uri != null ? (
          <Image
            source={{ uri: item.photo_uri }}
            style={styles.cellPhoto}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cellPhoto, styles.cellPlaceholder]}>
            <Text style={styles.cellPlaceholderEmoji}>🐱</Text>
          </View>
        )}
        <Text style={styles.cellName} numberOfLines={1}>
          {item.name}
        </Text>
      </Pressable>
    ),
    []
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.heading}>Pokedex</Text>

      {cats.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🐾</Text>
          <Text style={styles.emptyText}>
            No cats yet — point your camera at a stray to catch one
          </Text>
        </View>
      ) : (
        <FlatList
          data={cats}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          renderItem={renderItem}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <CatCard
        cat={selectedCat}
        visible={selectedCat != null}
        onDismiss={() => setSelectedCat(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0d14',
    paddingHorizontal: 12,
  },
  heading: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    marginLeft: 4,
  },
  row: {
    justifyContent: 'flex-start',
  },
  cell: {
    flex: 1 / NUM_COLUMNS,
    padding: 6,
  },
  cellPhoto: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#1b2130',
  },
  cellPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellPlaceholderEmoji: {
    fontSize: 40,
  },
  cellName: {
    color: '#e6ebf2',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyText: {
    color: '#8a94a6',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});
