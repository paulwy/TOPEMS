import { describe, it, expect } from "vitest";
import {
  trim,
  trimAll,
  toCamelCase,
  toSnakeCase,
  toKebabCase,
  capitalize,
  uncapitalize,
  repeat,
  padStart,
  padEnd,
  truncate,
  maskPhone,
  maskEmail,
  maskIdCard,
  randomString,
  randomNumber,
  slugify,
  stripHtml,
  escapeHtml,
  unescapeHtml,
  isEmpty,
  isNotEmpty,
  limitLength,
  formatSize,
  snakeToTitle,
  camelToTitle,
} from "../../utils/string";

describe("string utils", () => {
  describe("trim", () => {
    it("should remove leading and trailing spaces", () => {
      expect(trim("  hello  ")).toBe("hello");
    });

    it("should return empty string for all spaces", () => {
      expect(trim("   ")).toBe("");
    });
  });

  describe("trimAll", () => {
    it("should remove all spaces", () => {
      expect(trimAll("h e l l o")).toBe("hello");
    });

    it("should remove spaces from both ends and middle", () => {
      expect(trimAll("  hello world  ")).toBe("helloworld");
    });
  });

  describe("toCamelCase", () => {
    it("should convert dash to camelCase", () => {
      expect(toCamelCase("hello-world")).toBe("helloWorld");
    });

    it("should convert underscore to camelCase", () => {
      expect(toCamelCase("hello_world")).toBe("helloWorld");
    });

    it("should convert space to camelCase", () => {
      expect(toCamelCase("hello world")).toBe("helloWorld");
    });

    it("should handle multiple separators", () => {
      expect(toCamelCase("hello-world_test")).toBe("helloWorldTest");
    });
  });

  describe("toSnakeCase", () => {
    it("should convert camelCase to snake_case", () => {
      expect(toSnakeCase("helloWorld")).toBe("hello_world");
    });

    it("should handle pascal case", () => {
      expect(toSnakeCase("HelloWorld")).toBe("hello_world");
    });
  });

  describe("toKebabCase", () => {
    it("should convert camelCase to kebab-case", () => {
      expect(toKebabCase("helloWorld")).toBe("hello-world");
    });
  });

  describe("capitalize", () => {
    it("should capitalize first letter", () => {
      expect(capitalize("hello")).toBe("Hello");
    });

    it("should handle empty string", () => {
      expect(capitalize("")).toBe("");
    });
  });

  describe("isEmpty", () => {
    it("should return true for empty string", () => {
      expect(isEmpty("")).toBe(true);
    });

    it("should return false for non-empty string", () => {
      expect(isEmpty("hello")).toBe(false);
    });
  });
});