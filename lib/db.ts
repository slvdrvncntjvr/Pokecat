/**
 * SQLite Data_Store for Pokecat.
 *
 * Uses the expo-sqlite v15 async API (`openDatabaseAsync`, `execAsync`,
 * `runAsync`, `getAllAsync`, `getFirstAsync`) per the Expo SDK 57 docs. A single
 * database connection is memoized at module scope. Boolean flags on
 * `Cat_Record` are stored as INTEGER 0/1 and mapped back to JS booleans at the
 * query boundary; nullable fields map to/from SQL NULL.
 */
import * as SQLite from 'expo-sqlite';
import { v4 as uuidv4 } from 'uuid';

import type { Cat_Record, Condition, Personality, Player_Record } from './types';

/**
 * Shape of a raw row read from the `cats` table. Booleans are INTEGER 0/1 and
 * nullable columns are `null`.
 */
interface CatRow {
  id: string;
  name: string;
  photo_uri: string | null;
  condition: string;
  personality: string;
  note: string | null;
  lat: number | null;
  lng: number | null;
  location_name: string | null;
  caught_at: number;
  caught_by: string | null;
  sighting_count: number;
  is_tnr: number;
  needs_rescue: number;
  last_fed: number | null;
}

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS cats (
  id             TEXT PRIMARY KEY NOT NULL,
  name           TEXT NOT NULL,
  photo_uri      TEXT,
  condition      TEXT NOT NULL,
  personality    TEXT NOT NULL,
  note           TEXT,
  lat            REAL,
  lng            REAL,
  location_name  TEXT,
  caught_at      INTEGER NOT NULL,
  caught_by      TEXT,
  sighting_count INTEGER NOT NULL DEFAULT 1,
  is_tnr         INTEGER NOT NULL DEFAULT 0,
  needs_rescue   INTEGER NOT NULL DEFAULT 0,
  last_fed       INTEGER
);

CREATE TABLE IF NOT EXISTS player (
  id        TEXT PRIMARY KEY NOT NULL,
  name      TEXT NOT NULL,
  joined_at INTEGER NOT NULL
);
`;

/** Default database file name. Overridable for tests via {@link _setDbNameForTests}. */
let dbName = 'pokecat.db';

/** Memoized connection promise so the db is opened + migrated exactly once. */
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Override the database file name and reset the memoized connection. Intended
 * for tests that need a fresh, isolated database. Not used by app code.
 */
export function _setDbNameForTests(name: string): void {
  dbName = name;
  dbPromise = null;
}

/**
 * Open (once) and return the memoized database connection, running the
 * `CREATE TABLE IF NOT EXISTS` migrations on first open.
 */
function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise == null) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(dbName);
      await db.execAsync(CREATE_TABLES_SQL);
      return db;
    })();
  }
  return dbPromise;
}

/**
 * Initialize the Data_Store: open the connection and run migrations. Idempotent
 * thanks to `IF NOT EXISTS` and the memoized connection.
 */
export async function initDatabase(): Promise<void> {
  await getDb();
}

/**
 * Convert a `0`/`1` (or nullish) INTEGER column into a JS boolean.
 */
function intToBool(value: number | null | undefined): boolean {
  return value === 1;
}

/**
 * Convert a JS boolean into the `0`/`1` INTEGER used for storage.
 */
function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * Map a raw {@link CatRow} into a typed {@link Cat_Record}, converting INTEGER
 * 0/1 flags to booleans and preserving NULLs as `null`.
 */
function rowToCat(row: CatRow): Cat_Record {
  return {
    id: row.id,
    name: row.name,
    photo_uri: row.photo_uri ?? null,
    condition: row.condition as Condition,
    personality: row.personality as Personality,
    note: row.note ?? null,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    location_name: row.location_name ?? null,
    caught_at: row.caught_at,
    caught_by: row.caught_by ?? null,
    sighting_count: row.sighting_count,
    is_tnr: intToBool(row.is_tnr),
    needs_rescue: intToBool(row.needs_rescue),
    last_fed: row.last_fed ?? null,
  };
}

/** Input accepted by {@link insertCat}: a Cat_Record with optional id/caught_at. */
export type InsertCatInput = Omit<Cat_Record, 'id' | 'caught_at'> &
  Partial<Pick<Cat_Record, 'id' | 'caught_at'>>;

/**
 * Insert a new cat. Validates required NOT NULL fields (`name`, `condition`,
 * `personality`) and throws a descriptive `Error` before touching the database
 * if any are missing. Assigns a uuid v4 `id` and `caught_at = Date.now()` when
 * absent, and defaults `sighting_count`/`is_tnr`/`needs_rescue`. Returns the
 * fully persisted {@link Cat_Record}.
 */
export async function insertCat(input: InsertCatInput): Promise<Cat_Record> {
  if (input.name == null || input.name.trim().length === 0) {
    throw new Error("insertCat: 'name' is required");
  }
  if (input.condition == null) {
    throw new Error("insertCat: 'condition' is required");
  }
  if (input.personality == null) {
    throw new Error("insertCat: 'personality' is required");
  }

  const cat: Cat_Record = {
    id: input.id ?? uuidv4(),
    name: input.name,
    photo_uri: input.photo_uri ?? null,
    condition: input.condition,
    personality: input.personality,
    note: input.note ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    location_name: input.location_name ?? null,
    caught_at: input.caught_at ?? Date.now(),
    caught_by: input.caught_by ?? null,
    sighting_count: input.sighting_count ?? 1,
    is_tnr: input.is_tnr ?? false,
    needs_rescue: input.needs_rescue ?? false,
    last_fed: input.last_fed ?? null,
  };

  const db = await getDb();
  await db.runAsync(
    `INSERT INTO cats (
      id, name, photo_uri, condition, personality, note, lat, lng,
      location_name, caught_at, caught_by, sighting_count, is_tnr,
      needs_rescue, last_fed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cat.id,
      cat.name,
      cat.photo_uri,
      cat.condition,
      cat.personality,
      cat.note,
      cat.lat,
      cat.lng,
      cat.location_name,
      cat.caught_at,
      cat.caught_by,
      cat.sighting_count,
      boolToInt(cat.is_tnr),
      boolToInt(cat.needs_rescue),
      cat.last_fed,
    ]
  );

  return cat;
}

/**
 * Return every stored cat, ordered by `caught_at` descending (newest first).
 */
export async function getAllCats(): Promise<Cat_Record[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CatRow>(
    'SELECT * FROM cats ORDER BY caught_at DESC'
  );
  return rows.map(rowToCat);
}

/**
 * Look up a single cat by id, or `null` when no matching row exists.
 */
export async function getCatById(id: string): Promise<Cat_Record | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<CatRow>(
    'SELECT * FROM cats WHERE id = ?',
    [id]
  );
  return row == null ? null : rowToCat(row);
}

/**
 * Insert or replace the player row and return the persisted record.
 */
export async function upsertPlayer(player: Player_Record): Promise<Player_Record> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO player (id, name, joined_at) VALUES (?, ?, ?)',
    [player.id, player.name, player.joined_at]
  );
  return player;
}
