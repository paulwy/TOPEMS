import { describe, it, expect } from "vitest";
import { getWeekday, isToday, isYesterday, isTomorrow, getWeekStart, getWeekEnd } from "../../utils/date";

describe("date utils", () => {
  describe("getWeekday", () => {
    it("should return weekday for a given date", () => {
      const date = new Date("2024-01-15"); // Monday
      expect(getWeekday(date)).toBe(1);
    });

    it("should return weekday for today when no date provided", () => {
      const result = getWeekday();
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(6);
    });

    it("should return 0 for Sunday", () => {
      const date = new Date("2024-01-14"); // Sunday
      expect(getWeekday(date)).toBe(0);
    });
  });

  describe("isToday", () => {
    it("should return true for today", () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it("should return true for today string", () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isToday(today)).toBe(true);
    });

    it("should return false for yesterday", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it("should return false for tomorrow", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe("isYesterday", () => {
    it("should return true for yesterday", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isYesterday(yesterday)).toBe(true);
    });

    it("should return false for today", () => {
      const today = new Date();
      expect(isYesterday(today)).toBe(false);
    });

    it("should return false for two days ago", () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      expect(isYesterday(twoDaysAgo)).toBe(false);
    });
  });

  describe("isTomorrow", () => {
    it("should return true for tomorrow", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isTomorrow(tomorrow)).toBe(true);
    });

    it("should return false for today", () => {
      const today = new Date();
      expect(isTomorrow(today)).toBe(false);
    });

    it("should return false for day after tomorrow", () => {
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      expect(isTomorrow(dayAfterTomorrow)).toBe(false);
    });
  });

  describe("getWeekStart", () => {
    it("should return Monday for Wednesday", () => {
      const wednesday = new Date("2024-01-17");
      const result = getWeekStart(wednesday);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(15);
    });

    it("should return Monday for Sunday", () => {
      const sunday = new Date("2024-01-14");
      const result = getWeekStart(sunday);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(8); // Previous Monday
    });

    it("should set time to 00:00:00", () => {
      const date = new Date("2024-01-15T10:30:00");
      const result = getWeekStart(date);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });

  describe("getWeekEnd", () => {
    it("should return Sunday for Wednesday", () => {
      const wednesday = new Date("2024-01-17");
      const result = getWeekEnd(wednesday);
      expect(result.getDay()).toBe(0); // Sunday
      expect(result.getDate()).toBe(21);
    });

    it("should set time to 23:59:59.999", () => {
      const date = new Date("2024-01-15T10:30:00");
      const result = getWeekEnd(date);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
    });
  });
});