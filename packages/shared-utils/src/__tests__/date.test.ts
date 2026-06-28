import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  formatDateTime,
  parseDate,
  isSameDay,
  getDaysBetween,
  formatRelativeTime,
} from '../date';

describe('date utilities', () => {
  describe('formatDate', () => {
    it('should format date with default YYYY-MM-DD format', () => {
      const date = new Date('2024-06-15T10:30:00');
      expect(formatDate(date)).toBe('2024-06-15');
    });

    it('should format date with custom format', () => {
      const date = new Date('2024-06-15T10:30:45');
      expect(formatDate(date, 'YYYY/MM/DD')).toBe('2024/06/15');
      expect(formatDate(date, 'DD-MM-YYYY')).toBe('15-06-2024');
      expect(formatDate(date, 'YYYY-MM-DD HH:mm:ss')).toBe('2024-06-15 10:30:45');
    });

    it('should handle string input', () => {
      expect(formatDate('2024-06-15')).toBe('2024-06-15');
    });
  });

  describe('formatDateTime', () => {
    it('should format datetime with default format', () => {
      const date = new Date('2024-06-15T10:30:45');
      expect(formatDateTime(date)).toBe('2024-06-15 10:30:45');
    });
  });

  describe('parseDate', () => {
    it('should parse valid date string', () => {
      const result = parseDate('2024-06-15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(5); // June is month 5 (0-indexed)
      expect(result?.getDate()).toBe(15);
    });

    it('should return null for invalid date string', () => {
      expect(parseDate('invalid')).toBeNull();
      expect(parseDate('')).toBeNull();
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date('2024-06-15T10:00:00');
      const date2 = new Date('2024-06-15T22:30:00');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date('2024-06-15');
      const date2 = new Date('2024-06-16');
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('getDaysBetween', () => {
    it('should return correct number of days between dates', () => {
      const start = new Date('2024-06-01');
      const end = new Date('2024-06-10');
      expect(getDaysBetween(start, end)).toBe(9);
    });

    it('should return 0 for same day', () => {
      const date = new Date('2024-06-15');
      expect(getDaysBetween(date, date)).toBe(0);
    });

    it('should handle reversed dates', () => {
      const start = new Date('2024-06-10');
      const end = new Date('2024-06-01');
      expect(getDaysBetween(start, end)).toBe(9);
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "刚刚" for recent time', () => {
      const now = new Date('2024-06-15T11:59:55');
      expect(formatRelativeTime(now.toISOString())).toBe('刚刚');
    });

    it('should return minutes ago', () => {
      const thirtyMinutesAgo = new Date('2024-06-15T11:30:00');
      expect(formatRelativeTime(thirtyMinutesAgo.toISOString())).toBe('30分钟前');
    });

    it('should return hours ago', () => {
      const threeHoursAgo = new Date('2024-06-15T09:00:00');
      expect(formatRelativeTime(threeHoursAgo.toISOString())).toBe('3小时前');
    });

    it('should return days ago', () => {
      const threeDaysAgo = new Date('2024-06-12T12:00:00');
      expect(formatRelativeTime(threeDaysAgo.toISOString())).toBe('3天前');
    });

    it('should return weeks ago', () => {
      const twoWeeksAgo = new Date('2024-06-01T12:00:00');
      expect(formatRelativeTime(twoWeeksAgo.toISOString())).toBe('2周前');
    });

    it('should return months ago', () => {
      const twoMonthsAgo = new Date('2024-04-15T12:00:00');
      expect(formatRelativeTime(twoMonthsAgo.toISOString())).toBe('2个月前');
    });

    it('should return years ago', () => {
      const twoYearsAgo = new Date('2022-06-15T12:00:00');
      expect(formatRelativeTime(twoYearsAgo.toISOString())).toBe('2年前');
    });

    it('should return original string for invalid date', () => {
      expect(formatRelativeTime('invalid')).toBe('invalid');
    });
  });
});