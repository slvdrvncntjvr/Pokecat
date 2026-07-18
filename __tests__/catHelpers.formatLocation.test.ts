// Feature: pokecat-rework, Property 4: Location display falls back to coordinates when no place name
import fc from 'fast-check';
import { formatLocation, UNKNOWN_LOCATION } from '../lib/catHelpers';
import type { Cat_Record, Condition, Personality } from '../lib/types';

/**
 * Property 4: For any Cat_Record, formatLocation returns the location_name when
 * it is non-null/non-empty; otherwise it returns a "lat, lng" string built from
 * the stored coordinates; when both location_name and coordinates are null it
 * returns a defined placeholder.
 *
 * Validates: Requirements 12.3
 */

const conditionArb: fc.Arbitrary<Condition> = fc.constantFrom(
  'healthy',
  'injured',
  'sick',
  'pregnant',
  'kitten',
  'unknown',
);

const personalityArb: fc.Arbitrary<Personality> = fc.constantFrom(
  'friendly',
  'shy',
  'aggressive',
  'curious',
  'aloof',
);

// A location_name that is non-null and contains at least one non-whitespace char.
const nonBlankNameArb: fc.Arbitrary<string> = fc
  .string()
  .filter((s) => s.trim().length > 0);

// A location_name that is treated as "absent": either null or blank/whitespace.
const absentNameArb: fc.Arbitrary<string | null> = fc.oneof(
  fc.constant(null),
  fc
    .array(fc.constantFrom(' ', '\t', '\n', '\r'))
    .map((chars) => chars.join('')),
);

/** Build a Cat_Record from the location-relevant fields, filling the rest. */
function makeCat(
  overrides: Pick<Cat_Record, 'location_name' | 'lat' | 'lng'>,
): Cat_Record {
  return {
    id: 'id',
    name: 'Whiskers',
    photo_uri: null,
    condition: 'unknown',
    personality: 'aloof',
    note: null,
    caught_at: 1_700_000_000_000,
    caught_by: null,
    sighting_count: 1,
    is_tnr: false,
    needs_rescue: false,
    last_fed: null,
    ...overrides,
  };
}

const coordArb: fc.Arbitrary<number> = fc.double({
  noNaN: true,
  min: -180,
  max: 180,
});

// Records with a usable location_name.
const withNameArb: fc.Arbitrary<Cat_Record> = fc
  .tuple(nonBlankNameArb, fc.option(coordArb, { nil: null }), fc.option(coordArb, { nil: null }))
  .map(([location_name, lat, lng]) => makeCat({ location_name, lat, lng }));

// Records with no usable name but with both coordinates present.
const withCoordsArb: fc.Arbitrary<Cat_Record> = fc
  .tuple(absentNameArb, coordArb, coordArb)
  .map(([location_name, lat, lng]) => makeCat({ location_name, lat, lng }));

// Records with no usable name and missing at least one coordinate.
const withNeitherArb: fc.Arbitrary<Cat_Record> = fc
  .tuple(
    absentNameArb,
    fc.oneof(fc.constant(null), coordArb),
    fc.oneof(fc.constant(null), coordArb),
  )
  .filter(([, lat, lng]) => lat == null || lng == null)
  .map(([location_name, lat, lng]) => makeCat({ location_name, lat, lng }));

describe('formatLocation (Property 4)', () => {
  it('returns location_name when it is present and non-empty', () => {
    fc.assert(
      fc.property(withNameArb, (record) => {
        expect(formatLocation(record)).toBe(record.location_name);
      }),
      { numRuns: 100 },
    );
  });

  it('falls back to a "lat, lng" string when no name but coords present', () => {
    fc.assert(
      fc.property(withCoordsArb, (record) => {
        const result = formatLocation(record);
        expect(result).toContain(String(record.lat));
        expect(result).toContain(String(record.lng));
        expect(result).toBe(`${record.lat}, ${record.lng}`);
      }),
      { numRuns: 100 },
    );
  });

  it('returns the placeholder when neither name nor full coords exist', () => {
    fc.assert(
      fc.property(withNeitherArb, (record) => {
        expect(formatLocation(record)).toBe(UNKNOWN_LOCATION);
      }),
      { numRuns: 100 },
    );
  });
});
