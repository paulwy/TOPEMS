import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDateRange } from '../export';

describe('utils/export - getDateRange', () => {
  beforeEach(() => {
    // Fix time so tests are deterministic
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T10:30:00Z'));
  });

  it('returns start and end strings for "today"', () => {
    const result = getDateRange('today');
    expect(result).toHaveProperty('start');
    expect(result).toHaveProperty('end');
    expect(typeof result.start).toBe('string');
    expect(typeof result.end).toBe('string');
    // start and end should be the same day
    expect(result.start).toBe(result.end);
  });

  it('returns yesterday range for "yesterday"', () => {
    const result = getDateRange('yesterday');
    expect(result.start).toBe(result.end);
    // start should be one day before today
    const today = new Date('2026-06-15').toISOString();
    const yesterday = new Date('2026-06-14').toISOString();
    expect(getDateRange('today').start).not.toBe(result.start);
  });

  it('returns a 7-day range for "week"', () => {
    const result = getDateRange('week');
    const start = new Date(result.start);
    const end = new Date(result.end);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);
  });

  it('returns a ~30-day range for "month"', () => {
    const result = getDateRange('month');
    const start = new Date(result.start);
    const end = new Date(result.end);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    // month can be 28-31 days, but we're subtracting exactly 1 month
    expect(diffDays).toBeGreaterThanOrEqual(28);
    expect(diffDays).toBeLessThanOrEqual(31);
  });

  it('returns a ~90-day range for "quarter"', () => {
    const result = getDateRange('quarter');
    const start = new Date(result.start);
    const end = new Date(result.end);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(89);
    expect(diffDays).toBeLessThanOrEqual(92);
  });

  it('returns a ~365-day range for "year"', () => {
    const result = getDateRange('year');
    const start = new Date(result.start);
    const end = new Date(result.end);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(364);
    expect(diffDays).toBeLessThanOrEqual(366);
  });

  it('falls back to month range for "custom"', () => {
    const result = getDateRange('custom');
    const start = new Date(result.start);
    const end = new Date(result.end);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(28);
    expect(diffDays).toBeLessThanOrEqual(31);
  });

  it('falls back to month range for unknown range', () => {
    const result = getDateRange('unknown');
    const start = new Date(result.start);
    const end = new Date(result.end);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(28);
    expect(diffDays).toBeLessThanOrEqual(31);
  });

  it('end is always the current date', () => {
    const todayResult = getDateRange('today');
    const weekResult = getDateRange('week');
    const monthResult = getDateRange('month');
    // end should be the same for all (today)
    expect(weekResult.end).toBe(todayResult.end);
    expect(monthResult.end).toBe(todayResult.end);
  });
});
