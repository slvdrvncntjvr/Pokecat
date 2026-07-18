/**
 * Catch_Flow — a bottom sheet that rises from the bottom of the Camera_Screen
 * to collect a cat's details, then orchestrates the catch (R5.1–R5.5, R6.4,
 * R7.1, R7.2, R10.2–R10.5).
 *
 * The sheet slides up via a Reanimated `translateY` animation and can be
 * dismissed by a downward pan gesture (react-native-gesture-handler). It
 * collects a name, Condition/Personality chip selections, is-TNR/needs-rescue
 * toggles, and a free-text note.
 *
 * On Confirm it validates the name (blocking with a message when blank), then
 * orchestrates: capture photo (may be null) → read coordinates (may be null) →
 * reverse geocode (null-safe) → persist via `insertCat` → success haptic →
 * `onCaught(cat)` so the Camera_Screen can run the desaturate+flash and present
 * the Gotcha_Sheet.
 */
import type { CameraView } from 'expo-camera';
import { useEffect, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { isValidName } from '@/lib/catHelpers';
import { insertCat } from '@/lib/db';
import { notificationSpotted } from '@/lib/hapticsService';
import { getCurrentCoords } from '@/lib/locationService';
import { capturePhoto } from '@/lib/photoService';
import { reverseGeocode } from '@/lib/tomtomService';
import type { Cat_Record, Condition, Personality } from '@/lib/types';

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.85);
/** Downward drag distance (px) past which releasing dismisses the sheet. */
const DISMISS_THRESHOLD = 120;

/** All selectable Condition chips (total over the Condition union). */
const CONDITIONS: Condition[] = [
  'healthy',
  'injured',
  'sick',
  'pregnant',
  'kitten',
  'unknown',
];

/** All selectable Personality chips (total over the Personality union). */
const PERSONALITIES: Personality[] = [
  'friendly',
  'shy',
  'aggressive',
  'curious',
  'aloof',
];

/** Props for the {@link CatchFlow} bottom sheet. */
export interface CatchFlowProps {
  /** Whether the sheet is presented. */
  visible: boolean;
  /** Ref to the live CameraView used to capture the catch photo. */
  cameraRef: React.RefObject<CameraView | null>;
  /** Called with the persisted Cat_Record after a successful catch. */
  onCaught: (cat: Cat_Record) => void;
  /** Called when the sheet is dismissed without catching. */
  onDismiss: () => void;
}

export default function CatchFlow({
  visible,
  cameraRef,
  onCaught,
  onDismiss,
}: CatchFlowProps) {
  const [name, setName] = useState('');
  const [condition, setCondition] = useState<Condition>('unknown');
  const [personality, setPersonality] = useState<Personality>('friendly');
  const [note, setNote] = useState('');
  const [isTnr, setIsTnr] = useState(false);
  const [needsRescue, setNeedsRescue] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Off-screen (below) when hidden; springs to 0 (fully visible) when shown.
  const translateY = useSharedValue(SHEET_HEIGHT);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : SHEET_HEIGHT, {
      duration: 260,
    });
  }, [visible, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Downward pan-to-dismiss. Only tracks downward drags; releasing past the
  // threshold animates the sheet away and invokes onDismiss on the JS thread.
  const panGesture = Gesture.Pan()
    .onChange((event) => {
      const next = translateY.value + event.changeY;
      translateY.value = next < 0 ? 0 : next;
    })
    .onEnd(() => {
      if (translateY.value > DISMISS_THRESHOLD) {
        translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 });
        runOnJS(onDismiss)();
      } else {
        translateY.value = withSpring(0);
      }
    });

  const handleConfirm = async () => {
    if (submitting) {
      return;
    }
    if (!isValidName(name)) {
      setNameError('Please enter a name for this cat.');
      return;
    }
    setNameError(null);
    setSubmitting(true);

    try {
      // Photo — may be null; the catch proceeds photo-less on failure.
      const camera = cameraRef.current;
      const photo = camera ? await capturePhoto(camera) : { uri: null };

      // Coordinates — null when permission denied / unavailable.
      const coords = await getCurrentCoords();

      // Reverse geocode — null-safe; only attempted when coords exist.
      const locationName = coords
        ? await reverseGeocode(coords.lat, coords.lng)
        : null;

      const cat = await insertCat({
        name: name.trim(),
        photo_uri: photo.uri,
        condition,
        personality,
        note: note.trim().length > 0 ? note.trim() : null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        location_name: locationName,
        caught_by: null,
        sighting_count: 1,
        is_tnr: isTnr,
        needs_rescue: needsRescue,
        last_fed: null,
      });

      notificationSpotted();
      resetForm();
      onCaught(cat);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCondition('unknown');
    setPersonality('friendly');
    setNote('');
    setIsTnr(false);
    setNeedsRescue(false);
    setNameError(null);
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.backdrop} pointerEvents="box-none">
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handle} />
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>New Cat</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Give this cat a name"
              placeholderTextColor="#5b6472"
              accessibilityLabel="Cat name"
            />
            {nameError != null && (
              <Text style={styles.error}>{nameError}</Text>
            )}

            <Text style={styles.label}>Condition</Text>
            <View style={styles.chipRow}>
              {CONDITIONS.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.chip,
                    condition === item && styles.chipSelected,
                  ]}
                  onPress={() => setCondition(item)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: condition === item }}
                  accessibilityLabel={`Condition ${item}`}
                >
                  <Text
                    style={[
                      styles.chipText,
                      condition === item && styles.chipTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Personality</Text>
            <View style={styles.chipRow}>
              {PERSONALITIES.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.chip,
                    personality === item && styles.chipSelected,
                  ]}
                  onPress={() => setPersonality(item)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: personality === item }}
                  accessibilityLabel={`Personality ${item}`}
                >
                  <Text
                    style={[
                      styles.chipText,
                      personality === item && styles.chipTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>TNR (ear-tipped)</Text>
              <Switch
                value={isTnr}
                onValueChange={setIsTnr}
                accessibilityLabel="Is TNR"
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Needs rescue</Text>
              <Switch
                value={needsRescue}
                onValueChange={setNeedsRescue}
                accessibilityLabel="Needs rescue"
              />
            </View>

            <Text style={styles.label}>Note</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              value={note}
              onChangeText={setNote}
              placeholder="Anything worth remembering?"
              placeholderTextColor="#5b6472"
              multiline
              accessibilityLabel="Note"
            />

            <TouchableOpacity
              style={[styles.confirm, submitting && styles.confirmDisabled]}
              onPress={handleConfirm}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Confirm catch"
            >
              <Text style={styles.confirmText}>
                {submitting ? 'Catching…' : 'Confirm'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: '#0a0d14',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginTop: 10,
    marginBottom: 6,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    color: '#f5f7fa',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    color: '#8a94a6',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f5f7fa',
    fontSize: 16,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    color: '#ff5a5f',
    fontSize: 13,
    marginTop: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chipSelected: {
    backgroundColor: '#4da6ff',
    borderColor: '#4da6ff',
  },
  chipText: {
    color: '#c7ced9',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: '#0a0d14',
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  toggleLabel: {
    color: '#f5f7fa',
    fontSize: 16,
  },
  confirm: {
    marginTop: 28,
    backgroundColor: '#3ddc84',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    color: '#0a0d14',
    fontSize: 17,
    fontWeight: '700',
  },
});
