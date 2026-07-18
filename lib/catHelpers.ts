/**
 * Pure helper functions for Pokecat.
 *
 * These functions have no side effects and no native-module dependencies, so
 * they are trivially unit- and property-testable. They back the Cat_Marker
 * color, the Catch_Flow name validation, and the Cat_Card location display.
 */
import type { Cat_Record, Condition } from './types';

/**
 * Placeholder shown when a Cat_Record has neither a location_name nor
 * coordinates to display.
 */
export const UNKNOWN_LOCATION = 'Unknown location';

/**
 * Map a {@link Condition} to its marker hex color.
 *
 * Total over the `Condition` union — every case returns a defined, non-empty
 * color string — and deterministic (same input always yields the same color).
 */
export function conditionColor(condition: Condition): string {
  switch (condition) {
    case 'healthy':
      return '#3ddc84'; // green
    case 'injured':
      return '#ff5a5f'; // red
    case 'sick':
      return '#ffb020'; // amber
    case 'pregnant':
      return '#c77dff'; // purple
    case 'kitten':
      return '#4da6ff'; // blue
    case 'unknown':
      return '#8a94a6'; // grey
  }
}

/**
 * Validate a cat name. A name is valid when it contains at least one
 * non-whitespace character (i.e. it is non-empty after trimming).
 */
export function isValidName(name: string): boolean {
  return name.trim().length > 0;
}

/**
 * Format a Cat_Record's location for display.
 *
 * Returns the `location_name` when it is present and non-empty; otherwise, when
 * both `lat` and `lng` are available, returns a `"lat, lng"` string; otherwise
 * returns the {@link UNKNOWN_LOCATION} placeholder.
 */
export function formatLocation(record: Cat_Record): string {
  if (record.location_name != null && record.location_name.trim().length > 0) {
    return record.location_name;
  }
  if (record.lat != null && record.lng != null) {
    return `${record.lat.toFixed(5)}, ${record.lng.toFixed(5)}`;
  }
  return UNKNOWN_LOCATION;
}
