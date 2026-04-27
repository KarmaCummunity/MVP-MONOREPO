import { parsePostMetadata } from '../parsePostMetadata';

describe('parsePostMetadata', () => {
    it('returns null for null/undefined', () => {
        expect(parsePostMetadata(null)).toBeNull();
        expect(parsePostMetadata(undefined)).toBeNull();
    });

    it('parses JSON string to object', () => {
        expect(parsePostMetadata('{"a":1}')).toEqual({ a: 1 });
    });

    it('returns object as-is', () => {
        const o = { x: 'y' };
        expect(parsePostMetadata(o)).toBe(o);
    });

    it('returns null on invalid JSON string', () => {
        expect(parsePostMetadata('{not json')).toBeNull();
    });
});
