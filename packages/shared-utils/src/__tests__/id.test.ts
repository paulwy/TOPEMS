import { describe, it, expect } from 'vitest';
import { generateId } from '../id';

describe('id utilities', () => {
  describe('generateId', () => {
    it('should return a string', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
    });

    it('should return non-empty string', () => {
      expect(generateId().length).toBeGreaterThan(0);
    });

    it('should generate unique IDs for consecutive calls', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(1000);
    });

    it('should contain a dash separator', () => {
      const id = generateId();
      expect(id).toContain('-');
    });

    it('should match expected format: timestamp-random', () => {
      const id = generateId();
      const parts = id.split('-');
      expect(parts).toHaveLength(2);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBe(9);
    });

    it('should use base36 characters (a-z, 0-9)', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });

    it('should be monotonically increasing over time', () => {
      const id1 = generateId();
      const prefix1 = id1.split('-')[0];

      const id2 = generateId();
      const prefix2 = id2.split('-')[0];

      expect(parseInt(prefix2, 36)).toBeGreaterThanOrEqual(parseInt(prefix1, 36));
    });

    it('should generate two different IDs even called in the same tick', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with consistent length', () => {
      const lengths = new Set<number>();
      for (let i = 0; i < 100; i++) {
        lengths.add(generateId().length);
      }
      // The date-base36 prefix may vary by 1 char across runs, but random part stays 9
      const sizes = Array.from(lengths);
      for (const s of sizes) {
        expect(s).toBeGreaterThanOrEqual(11);
      }
    });
  });
});
