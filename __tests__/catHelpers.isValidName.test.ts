// Feature: pokecat-rework, Property 2: Name validation rejects blank names
import fc from 'fast-check';
import { isValidName } from '../lib/catHelpers';

/**
 * Property 2: For any string composed entirely of whitespace (including the
 * empty string), isValidName returns false; for any string containing at least
 * one non-whitespace character, isValidName returns true.
 *
 * Validates: Requirements 5.3
 */

// Whitespace characters that JS `String.prototype.trim` removes.
const whitespaceChars = [' ', '\t', '\n', '\r', '\f', '\v', '\u00a0'];

// Whitespace-only strings, including the empty string.
const whitespaceOnlyArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...whitespaceChars))
  .map((chars) => chars.join(''));

// A single non-whitespace character (printable ASCII from '!' to '~').
const nonWhitespaceCharArb: fc.Arbitrary<string> = fc
  .integer({ min: 33, max: 126 })
  .map((code) => String.fromCharCode(code));

// Arbitrary whitespace padding placed around a non-whitespace core.
const paddingArb: fc.Arbitrary<string> = whitespaceOnlyArb;

// Strings guaranteed to contain at least one non-whitespace character.
const nonBlankArb: fc.Arbitrary<string> = fc
  .tuple(paddingArb, nonWhitespaceCharArb, fc.string(), paddingArb)
  .map(([left, core, rest, right]) => left + core + rest + right);

describe('isValidName (Property 2)', () => {
  it('rejects whitespace-only strings (including empty)', () => {
    fc.assert(
      fc.property(whitespaceOnlyArb, (name) => {
        expect(isValidName(name)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('accepts strings containing at least one non-whitespace character', () => {
    fc.assert(
      fc.property(nonBlankArb, (name) => {
        expect(isValidName(name)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
