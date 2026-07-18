// Feature: pokecat-rework, Property 3: Condition-to-color mapping is total and deterministic
import fc from 'fast-check';
import { conditionColor } from '../lib/catHelpers';
import type { Condition } from '../lib/types';

/**
 * Property 3: For any Condition value, conditionColor returns a defined,
 * non-empty color string, and repeated calls with the same condition return
 * the same color.
 *
 * Validates: Requirements 9.4
 */
const conditionArb: fc.Arbitrary<Condition> = fc.constantFrom(
  'healthy',
  'injured',
  'sick',
  'pregnant',
  'kitten',
  'unknown',
);

describe('conditionColor (Property 3)', () => {
  it('is total: returns a defined non-empty color string for any Condition', () => {
    fc.assert(
      fc.property(conditionArb, (condition) => {
        const color = conditionColor(condition);
        expect(color).toBeDefined();
        expect(typeof color).toBe('string');
        expect(color.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('is deterministic: repeated calls with the same condition return the same color', () => {
    fc.assert(
      fc.property(conditionArb, (condition) => {
        expect(conditionColor(condition)).toBe(conditionColor(condition));
      }),
      { numRuns: 100 },
    );
  });
});
