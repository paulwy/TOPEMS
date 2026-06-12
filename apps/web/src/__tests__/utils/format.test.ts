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
  isEmpty,
  formatFileSize,
  formatDuration,
} from "../../utils/format";

describe("formatDate", () => {
  it("should format date correctly", () => {
    const date = "2024-01-15T10:30:45";
    expect(formatDate(date)).toBe("2024-01-15 10:30:45");
    expect(formatDate(date, "YYYY-MM-DD")).toBe("2024-01-15");
    expect(formatDate(date, "HH:mm")).toBe("10:30");
  });

  it("should return original string for invalid date", () => {
    expect(formatDate("invalid-date")).toBe("invalid-date");
  });

  it("should cache formatted dates", () => {
    const date = "2024-01-15T10:30:45";
    const result1 = formatDate(date);
    const result2 = formatDate(date);
    expect(result1).toBe(result2);
  });
});

describe("formatNumber", () => {
  it("should format number with default decimals", () => {
    expect(formatNumber(1234.567)).toBe("1,234.57");
  });

  it("should format number with custom decimals", () => {
    expect(formatNumber(1234.567, 0)).toBe("1,235");
    expect(formatNumber(1234.567, 1)).toBe("1,234.6");
  });

  it("should handle string input", () => {
    expect(formatNumber("1234.56")).toBe("1,234.56");
  });

  it("should return '0' for NaN", () => {
    expect(formatNumber("invalid")).toBe("0");
    expect(formatNumber(NaN)).toBe("0");
  });
});

describe("formatCurrency", () => {
  it("should format CNY currency", () => {
    expect(formatCurrency(1234.56)).toBe("¥1,234.56");
  });

  it("should format USD currency", () => {
    expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56");
  });

  it("should return '¥0.00' for invalid input", () => {
    expect(formatCurrency("invalid")).toBe("¥0.00");
  });
});

describe("truncateText", () => {
  it("should truncate text with default length", () => {
    const text = "This is a very long text that needs to be truncated";
    expect(truncateText(text)).toHaveLength(53);
    expect(truncateText(text).endsWith("...")).toBe(true);
  });

  it("should not truncate short text", () => {
    const text = "Short text";
    expect(truncateText(text)).toBe(text);
  });

  it("should handle empty string", () => {
    expect(truncateText("")).toBe("");
    expect(truncateText(undefined as unknown as string)).toBe("");
  });
});

describe("capitalizeFirstLetter", () => {
  it("should capitalize first letter", () => {
    expect(capitalizeFirstLetter("hello")).toBe("Hello");
    expect(capitalizeFirstLetter("hello world")).toBe("Hello world");
  });

  it("should handle empty string", () => {
    expect(capitalizeFirstLetter("")).toBe("");
  });
});

describe("debounce", () => {
  it("should delay function execution", async () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 10);
    
    debouncedFn();
    debouncedFn();
    debouncedFn();
    
    expect(fn).not.toHaveBeenCalled();
    
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("throttle", () => {
  it("should limit function execution", async () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 10);
    
    throttledFn();
    throttledFn();
    throttledFn();
    
    expect(fn).toHaveBeenCalledTimes(1);
    
    await new Promise((resolve) => setTimeout(resolve, 15));
    throttledFn();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("generateId", () => {
  it("should generate unique id", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThanOrEqual(18);
  });
});

describe("deepClone", () => {
  it("should clone primitive values", () => {
    expect(deepClone(1)).toBe(1);
    expect(deepClone("test")).toBe("test");
    expect(deepClone(null)).toBe(null);
    expect(deepClone(undefined)).toBe(undefined);
  });

  it("should clone arrays", () => {
    const original = [1, 2, 3];
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
  });

  it("should clone objects", () => {
    const original = { a: 1, b: "test" };
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
  });

  it("should handle nested objects", () => {
    const original = { a: { b: { c: 1 } } };
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned.a).not.toBe(original.a);
    expect(cloned.a.b).not.toBe(original.a.b);
  });

  it("should clone Date objects", () => {
    const original = new Date("2024-01-15");
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned instanceof Date).toBe(true);
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
    expect(isEmpty("test")).toBe(false);
    expect(isEmpty([1])).toBe(false);
    expect(isEmpty({ a: 1 })).toBe(false);
    expect(isEmpty(0)).toBe(false);
    expect(isEmpty(false)).toBe(false);
  });
});

describe("formatFileSize", () => {
  it("should format file sizes correctly", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(1023)).toBe("1023 B");
    expect(formatFileSize(1024)).toBe("1.00 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.00 MB");
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.00 GB");
  });
});

describe("formatDuration", () => {
  it("should format durations correctly", () => {
    expect(formatDuration(0)).toBe("0秒");
    expect(formatDuration(45)).toBe("45秒");
    expect(formatDuration(60)).toBe("1分钟0秒");
    expect(formatDuration(125)).toBe("2分钟5秒");
    expect(formatDuration(3600)).toBe("1小时0分钟0秒");
    expect(formatDuration(3725)).toBe("1小时2分钟5秒");
  });
});