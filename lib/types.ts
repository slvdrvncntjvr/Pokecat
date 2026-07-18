/**
 * Shared domain types for Pokecat.
 *
 * These types back the SQLite Data_Store (`lib/db.ts`). SQLite has no native
 * boolean type, so boolean flags are stored as INTEGER 0/1 and mapped to/from
 * JS `boolean` at the query boundary. Timestamps are epoch milliseconds.
 */

/**
 * Categorical health/status value for a cat.
 * Drives the Cat_Marker color on the Map_Screen.
 */
export type Condition =
  | 'healthy'
  | 'injured'
  | 'sick'
  | 'pregnant'
  | 'kitten'
  | 'unknown';

/**
 * Categorical temperament tag assigned to a cat during the Catch_Flow.
 */
export type Personality =
  | 'friendly'
  | 'shy'
  | 'aggressive'
  | 'curious'
  | 'aloof';

/**
 * A stored row in the `cats` table representing one cataloged cat.
 *
 * NOT NULL fields: `id`, `name`, `condition`, `personality`, `caught_at`,
 * `sighting_count`, `is_tnr`, `needs_rescue`. All other fields are nullable.
 */
export interface Cat_Record {
  /** uuid v4, TEXT PRIMARY KEY, NOT NULL. */
  id: string;
  /** NOT NULL. */
  name: string;
  /** Nullable — catch may proceed without a photo. */
  photo_uri: string | null;
  /** NOT NULL. */
  condition: Condition;
  /** NOT NULL. */
  personality: Personality;
  /** Nullable free-text note. */
  note: string | null;
  /** Nullable — null when location permission is denied. */
  lat: number | null;
  /** Nullable — null when location permission is denied. */
  lng: number | null;
  /** Nullable — null when denied or reverse geocode failed. */
  location_name: string | null;
  /** NOT NULL, epoch ms. */
  caught_at: number;
  /** Player id/name, nullable. */
  caught_by: string | null;
  /** NOT NULL, default 1. */
  sighting_count: number;
  /** Stored as INTEGER 0/1, NOT NULL default 0. */
  is_tnr: boolean;
  /** Stored as INTEGER 0/1, NOT NULL default 0. */
  needs_rescue: boolean;
  /** Nullable epoch ms. */
  last_fed: number | null;
}

/**
 * The stored row in the `player` table representing the current user.
 */
export interface Player_Record {
  /** TEXT PRIMARY KEY, NOT NULL. */
  id: string;
  /** NOT NULL. */
  name: string;
  /** NOT NULL, epoch ms. */
  joined_at: number;
}
