import { describe, it, expect } from 'vitest';
import {
  truncateText,
  capitalizeFirstLetter,
  toSnakeCase,
  toCamelCase,
} from '../string';

describe('string utilities', () => {
  describe('truncateText', () => {
    it('should return original text if shorter than maxLength', () => {
      expect(truncateText('hello', 10)).toBe('hello');
      expect(truncateText('hello', 5)).toBe('hello');
    });

    it('should truncate text with default suffix', () => {
      expect(truncateText('hello world', 8)).toBe('hello wo...');
    });

    it('should truncate text with custom suffix', () => {
      expect(truncateText('hello world', 8, '>>')).toBe('hello wo>>');
    });

    it('should handle edge cases', () => {
      expect(truncateText('', 10)).toBe('');
      expect(truncateText('hello', 0)).toBe('...');
      expect(truncateText('hello', 1)).toBe('h...');
    });
  });

  describe('capitalizeFirstLetter', () => {
    it('should capitalize first letter', () => {
      expect(capitalizeFirstLetter('hello')).toBe('Hello');
      expect(capitalizeFirstLetter('world')).toBe('World');
    });

    it('should handle empty string', () => {
      expect(capitalizeFirstLetter('')).toBe('');
    });

    it('should handle single character', () => {
      expect(capitalizeFirstLetter('a')).toBe('A');
    });

    it('should not change already capitalized', () => {
      expect(capitalizeFirstLetter('Hello')).toBe('Hello');
    });
  });

  describe('toSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(toSnakeCase('helloWorld')).toBe('hello_world');
      expect(toSnakeCase('camelCase')).toBe('camel_case');
    });

    it('should convert PascalCase to snake_case', () => {
      expect(toSnakeCase('HelloWorld')).toBe('hello_world');
    });

    it('should handle spaces and hyphens', () => {
      expect(toSnakeCase('hello world')).toBe('hello_world');
      expect(toSnakeCase('hello-world')).toBe('hello_world');
    });

    it('should handle mixed cases', () => {
      expect(toSnakeCase('hello-World fooBar')).toBe('hello_world_foo_bar');
    });
  });

  describe('toCamelCase', () => {
    it('should convert snake_case to camelCase', () => {
      expect(toCamelCase('hello_world')).toBe('helloWorld');
      expect(toCamelCase('foo_bar_baz')).toBe('fooBarBaz');
    });

    it('should convert kebab-case to camelCase', () => {
      expect(toCamelCase('hello-world')).toBe('helloWorld');
    });

    it('should handle mixed separators', () => {
      expect(toCamelCase('hello_world-foo')).toBe('helloWorldFoo');
    });

    it('should handle already camelCase', () => {
      expect(toCamelCase('helloWorld')).toBe('helloWorld');
    });
  });
});