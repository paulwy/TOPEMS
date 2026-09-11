import { describe, it, expect } from 'vitest';

import { DAY_MS, seconds, minutes, hours, days } from '../time';

describe('time constants', () => {
  describe('DAY_MS', () => {
    it('should be 24 hours in milliseconds', () => {
      expect(DAY_MS).toBe(24 * 60 * 60 * 1000);
      expect(DAY_MS).toBe(86_400_000);
    });
  });

  describe('seconds', () => {
    it('should convert seconds to milliseconds', () => {
      expect(seconds(1)).toBe(1000);
      expect(seconds(5)).toBe(5000);
      expect(seconds(0)).toBe(0);
    });

    it('should handle negative values', () => {
      expect(seconds(-1)).toBe(-1000);
    });
  });

  describe('minutes', () => {
    it('should convert minutes to milliseconds', () => {
      expect(minutes(1)).toBe(60_000);
      expect(minutes(5)).toBe(300_000);
      expect(minutes(0)).toBe(0);
    });
  });

  describe('hours', () => {
    it('should convert hours to milliseconds', () => {
      expect(hours(1)).toBe(3_600_000);
      expect(hours(24)).toBe(DAY_MS);
      expect(hours(0)).toBe(0);
    });
  });

  describe('days', () => {
    it('should convert days to milliseconds', () => {
      expect(days(1)).toBe(DAY_MS);
      expect(days(7)).toBe(7 * DAY_MS);
      expect(days(0)).toBe(0);
    });
  });
});
