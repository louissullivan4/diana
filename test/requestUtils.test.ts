import { getParamValue } from '../packages/diana-core/src/core/api/requestUtils';

describe('requestUtils', () => {
    describe('getParamValue', () => {
        it('returns the string as-is when given a plain string', () => {
            expect(getParamValue('hello')).toBe('hello');
        });

        it('returns an empty string when given an empty string', () => {
            expect(getParamValue('')).toBe('');
        });

        it('returns undefined when given undefined', () => {
            expect(getParamValue(undefined)).toBeUndefined();
        });

        it('returns the first element when given an array with one item', () => {
            expect(getParamValue(['only'])).toBe('only');
        });

        it('returns the first element when given an array with multiple items', () => {
            expect(getParamValue(['first', 'second', 'third'])).toBe('first');
        });

        it('returns the first element of an array even when it is an empty string', () => {
            expect(getParamValue(['', 'second'])).toBe('');
        });

        it('returns undefined when given an empty array (first element is undefined)', () => {
            expect(getParamValue([])).toBeUndefined();
        });

        it('does not return any subsequent array elements', () => {
            const result = getParamValue(['a', 'b', 'c']);
            expect(result).not.toBe('b');
            expect(result).not.toBe('c');
        });

        it('preserves the exact string value including whitespace', () => {
            expect(getParamValue('  spaced  ')).toBe('  spaced  ');
        });

        it('preserves the exact value when the string looks numeric', () => {
            expect(getParamValue('42')).toBe('42');
        });

        it('preserves the exact first array element including whitespace', () => {
            expect(getParamValue(['  spaced  ', 'other'])).toBe('  spaced  ');
        });
    });
});
