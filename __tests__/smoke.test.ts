/**
 * Smoke test — confirms the Jest toolchain runs and that TypeScript sources
 * (including `lib/types.ts`) compile and import under jest-expo.
 */
import type { Cat_Record, Condition, Personality } from '../lib/types';

describe('smoke', () => {
  it('does basic arithmetic', () => {
    expect(1 + 1).toBe(2);
  });

  it('compiles and imports typed values from lib/types', () => {
    const condition: Condition = 'healthy';
    const personality: Personality = 'friendly';

    const cat: Cat_Record = {
      id: 'test-id',
      name: 'Whiskers',
      photo_uri: null,
      condition,
      personality,
      note: null,
      lat: null,
      lng: null,
      location_name: null,
      caught_at: 1_700_000_000_000,
      caught_by: null,
      sighting_count: 1,
      is_tnr: false,
      needs_rescue: false,
      last_fed: null,
    };

    expect(cat.name).toBe('Whiskers');
    expect(cat.condition).toBe('healthy');
    expect(cat.is_tnr).toBe(false);
  });
});
