import { describe, it, expect, beforeEach } from "vitest";
import {
  formatDate,
  formatNumber,
  formatCurrency,
  truncateText,
  capitalizeFirstLetter,
  debounce,
  throttle,
  generateId,
  deepClone,
  clearCloneCache,
  isEmpty,
  formatFileSize,
  formatDuration,
} from "../../utils/format";

describe("format utils", () => {
  beforeEach(() => {
    clearCloneCache();
  });

  describe("formatDate", () => {
    it("should format date with default format", () => {
      const result = formatDate("2024-01-15T10:30:00");
      expect(result).toContain("2024");
      expect(result).toContain("01");
      expect(result).toContain("15");
    });

    it("should format date with custom format", () => {
      const result = formatDate("2024-01-15T10:30:00", "YYYY-MM-DD");
      expect(result).toBe("2024-01-15");
    });

    it("should handle invalid date string", () => {
      const result = formatDate("invalid-date", "YYYY-MM-DD");
      expect(result).toBe("invalid-date");
    });

    it("should format different time components", () => {
      const result = formatDate("2024-01-15T10:30:45", "HH:mm:ss");
      expect(result).toBe("10:30:45");
    });

    it("should use cache for repeated calls", () => {
      const date = "2024-01-15T10:30:00";
      const result1 = formatDate(date);
      const result2 = formatDate(date);
      expect(result1).toBe(result2);
    });
  });

  describe("formatNumber", () => {
    it("should format number with default 2 decimals", () => {
      expect(formatNumber(1234.56)).toBe("1,234.56");
    });

    it("should format number with 0 decimals", () => {
      expect(formatNumber(1234.56, 0)).toBe("1,235");
    });

    it("should format number with 4 decimals", () => {
      expect(formatNumber(1234.56789, 4)).toBe("1,234.5679");
    });

    it("should handle string input", () => {
      expect(formatNumber("1234.56")).toBe("1,234.56");
    });

    it("should return 0 for invalid input", () => {
      expect(formatNumber("invalid")).toBe("0");
      expect(formatNumber(NaN)).toBe("0");
    });
  });

  describe("formatCurrency", () => {
    it("should format CNY by default", () => {
      expect(formatCurrency(1234.56)).toBe("¥1,234.56");
    });

    it("should format USD", () => {
      expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56");
    });

    it("should format EUR", () => {
      expect(formatCurrency(1234.56, "EUR")).toBe("€1,234.56");
    });

    it("should format GBP", () => {
      expect(formatCurrency(1234.56, "GBP")).toBe("£1,234.56");
    });

    it("should return ¥0.00 for invalid input", () => {
      expect(formatCurrency("invalid")).toBe("¥0.00");
    });
  });

  describe("truncateText", () => {
    it("should not truncate short text", () => {
      expect(truncateText("short")).toBe("short");
    });

    it("should truncate long text with default suffix", () => {
      const longText = "a".repeat(60);
      const result = truncateText(longText);
      expect(result).toHaveLength(53); // 50 + "..."
      expect(result.endsWith("...")).toBe(true);
    });

    it("should truncate with custom suffix", () => {
      const longText = "a".repeat(60);
      const result = truncateText(longText, 50, ">>>");
      expect(result).toBe("a".repeat(50) + ">>>");
    });

    it("should handle empty string", () => {
      expect(truncateText("")).toBe("");
      expect(truncateText("", 10)).toBe("");
    });

    it("should handle text at exactly maxLength", () => {
      const text = "abcde";
      expect(truncateText(text, 5)).toBe("abcde");
    });
  });

  describe("capitalizeFirstLetter", () => {
    it("should capitalize first letter", () => {
      expect(capitalizeFirstLetter("hello")).toBe("Hello");
    });

    it("should handle single character", () => {
      expect(capitalizeFirstLetter("a")).toBe("A");
    });

    it("should handle empty string", () => {
      expect(capitalizeFirstLetter("")).toBe("");
    });

    it("should handle already capitalized", () => {
      expect(capitalizeFirstLetter("Hello")).toBe("Hello");
    });
  });

  describe("debounce", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("should delay function execution", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn();
      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should only call once for multiple rapid calls", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("throttle", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("should call function immediately on first call", () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 1000);

      throttledFn();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should not call again within limit", () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 1000);

      throttledFn();
      throttledFn();

      vi.advanceTimersByTime(500);
      throttledFn();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should call again after limit", () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 1000);

      throttledFn();
      vi.advanceTimersByTime(1000);
      throttledFn();
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("generateId", () => {
    it("should generate unique ids", () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it("should generate string ids", () => {
      const id = generateId();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe("deepClone", () => {
    it("should clone primitive values", () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone("string")).toBe("string");
      expect(deepClone(true)).toBe(true);
    });

    it("should clone arrays", () => {
      const original = [1, 2, 3];
      const clone = deepClone(original);
      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
    });

    it("should clone objects", () => {
      const original = { a: 1, b: { c: 2 } };
      const clone = deepClone(original);
      expect(clone).toEqual(original);
      expect(clone).not.toBe(original);
      expect(clone.b).not.toBe(original.b);
    });

    it("should handle circular references with cache", () => {
      const original: any = { a: 1 };
      original.self = original;
      const clone = deepClone(original);
      expect(clone.a).toBe(1);
      expect(clone.self).toBe(clone);
    });

    it("should clone Date objects", () => {
      const date = new Date("2024-01-15");
      const clone = deepClone(date);
      expect(clone).toEqual(date);
      expect(clone).not.toBe(date);
    });

    it("should clone RegExp objects", () => {
      const regex = /test/gi;
      const clone = deepClone(regex);
      expect(clone).toEqual(regex);
      expect(clone).not.toBe(regex);
    });
  });

  describe("isEmpty", () => {
    it("should return true for null/undefined", () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });

    it("should return true for empty string", () => {
      expect(isEmpty("")).toBe(true);
      expect(isEmpty("   ")).toBe(true);
    });

    it("should return true for empty array", () => {
      expect(isEmpty([])).toBe(true);
    });

    it("should return true for empty object", () => {
      expect(isEmpty({})).toBe(true);
    });

    it("should return false for non-empty values", () => {
      expect(isEmpty("text")).toBe(false);
      expect(isEmpty([1])).toBe(false);
      expect(isEmpty({ a: 1 })).toBe(false);
    });
  });

  describe("formatFileSize", () => {
    it("should format bytes", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("should format KB", () => {
      expect(formatFileSize(1024)).toBe("1.00 KB");
      expect(formatFileSize(1536)).toBe("1.50 KB");
    });

    it("should format MB", () => {
      expect(formatFileSize(1048576)).toBe("1.00 MB");
      expect(formatFileSize(1572864)).toBe("1.50 MB");
    });

    it("should format GB", () => {
      expect(formatFileSize(1073741824)).toBe("1.00 GB");
    });

    it("should format TB", () => {
      expect(formatFileSize(1099511627776)).toBe("1.00 TB");
    });
  });

  describe("formatDuration", () => {
    it("should format seconds only", () => {
      expect(formatDuration(30)).toBe("30秒");
      expect(formatDuration(5)).toBe("5秒");
    });

    it("should format minutes and seconds", () => {
      expect(formatDuration(90)).toBe("1分钟30秒");
      expect(formatDuration(125)).toBe("2分钟5秒");
    });

    it("should format hours, minutes, and seconds", () => {
      expect(formatDuration(3665)).toBe("1小时1分钟5秒");
      expect(formatDuration(7325)).toBe("2小时2分钟5秒");
    });

    it("should handle zero", () => {
      expect(formatDuration(0)).toBe("0秒");
    });
  });
});
