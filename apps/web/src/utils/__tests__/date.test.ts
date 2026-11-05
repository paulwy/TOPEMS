import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getWeekday,
  isToday,
  isYesterday,
  isTomorrow,
  getWeekStart,
  getWeekEnd,
  formatDate,
  formatDateTime,
  parseDate,
} from '@/utils/date';

describe('时区解析与本地渲染（Asia/Shanghai）', () => {
  it('带 Z 的 RFC3339 解析为同一瞬间并渲染本地时间', () => {
    expect(formatDateTime('2026-11-02T06:08:54.035752Z')).toBe('2026-11-02 14:08:54');
    expect(parseDate('2026-11-02T06:08:54.035752Z')?.getTime()).toBe(
      new Date('2026-11-02T06:08:54.035752Z').getTime()
    );
  });

  it('带 +08:00 偏移的 RFC3339 渲染为同一本地时间', () => {
    expect(formatDateTime('2026-11-02T14:08:54.035752+08:00')).toBe('2026-11-02 14:08:54');
  });

  it('纯日期字符串仅用于日期格式', () => {
    expect(formatDate('2026-11-02', 'YYYY-MM-DD')).toBe('2026-11-02');
  });

  it('旧的无时区空格格式按本地时间解析，显示不变', () => {
    expect(formatDateTime('2026-11-02 14:08:54')).toBe('2026-11-02 14:08:54');
  });
});

describe('getWeekday', () => {
  it('should return 0 for Sunday', () => {
    // 2024-06-16 is a Sunday
    const date = new Date('2024-06-16T00:00:00Z');
    expect(getWeekday(date)).toBe(0);
  });

  it('should return 1 for Monday', () => {
    // 2024-06-17 is a Monday
    const date = new Date('2024-06-17T00:00:00Z');
    expect(getWeekday(date)).toBe(1);
  });

  it('should use current date when no argument provided', () => {
    const result = getWeekday();
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(6);
  });
});

describe('isToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true for today as Date object', () => {
    expect(isToday(new Date('2024-06-15T12:00:00Z'))).toBe(true);
  });

  it('should return true for today as date-only string', () => {
    expect(isToday('2024-06-15')).toBe(true);
  });

  it('should return false for yesterday', () => {
    expect(isToday(new Date('2024-06-14T12:00:00Z'))).toBe(false);
  });

  it('should return false for tomorrow', () => {
    expect(isToday(new Date('2024-06-16T12:00:00Z'))).toBe(false);
  });
});

describe('isYesterday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true for yesterday', () => {
    expect(isYesterday(new Date('2024-06-14T12:00:00Z'))).toBe(true);
  });

  it('should return true for yesterday as date-only string', () => {
    expect(isYesterday('2024-06-14')).toBe(true);
  });

  it('should return false for today', () => {
    expect(isYesterday(new Date('2024-06-15T12:00:00Z'))).toBe(false);
  });

  it('should return false for the day before yesterday', () => {
    expect(isYesterday(new Date('2024-06-13T12:00:00Z'))).toBe(false);
  });
});

describe('isTomorrow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true for tomorrow', () => {
    expect(isTomorrow(new Date('2024-06-16T12:00:00Z'))).toBe(true);
  });

  it('should return true for tomorrow as date-only string', () => {
    expect(isTomorrow('2024-06-16')).toBe(true);
  });

  it('should return false for today', () => {
    expect(isTomorrow(new Date('2024-06-15T12:00:00Z'))).toBe(false);
  });
});

describe('getWeekStart', () => {
  it('should return Monday for a Wednesday', () => {
    // 2024-06-12 is Wednesday; week start is 2024-06-10 (Monday)
    const date = new Date('2024-06-12T12:00:00Z');
    const result = getWeekStart(date);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });

  it('should return Monday for a Sunday', () => {
    // 2024-06-16 is Sunday; week start is 2024-06-10 (Monday)
    const date = new Date('2024-06-16T12:00:00Z');
    const result = getWeekStart(date);
    expect(result.getDay()).toBe(1);
  });

  it('should use current date when no argument provided', () => {
    const result = getWeekStart();
    expect(result.getDay()).toBe(1); // Always Monday
  });
});

describe('getWeekEnd', () => {
  it('should return Sunday for a Wednesday', () => {
    // 2024-06-12 is Wednesday; week end is 2024-06-16 (Sunday)
    const date = new Date('2024-06-12T12:00:00Z');
    const result = getWeekEnd(date);
    expect(result.getDay()).toBe(0); // Sunday
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
  });

  it('should return Sunday close to 6 days after week start', () => {
    const date = new Date('2024-06-12T12:00:00Z');
    const start = getWeekStart(date);
    const end = getWeekEnd(date);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    // ~6.999 due to end at 23:59:59.999 vs start at 00:00:00.000
    expect(diffDays).toBeGreaterThan(6.9);
    expect(diffDays).toBeLessThan(7.1);
  });
});
