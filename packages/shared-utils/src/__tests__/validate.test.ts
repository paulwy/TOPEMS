import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidPhone,
  isValidUrl,
  isValidUUID,
  isValidDate,
  isEmpty,
  validatePassword,
} from '../validate';

describe('validate utilities', () => {
  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should return true for valid Chinese phone numbers', () => {
      expect(isValidPhone('13812345678')).toBe(true);
      expect(isValidPhone('15912345678')).toBe(true);
      expect(isValidPhone('19912345678')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone('12345678901')).toBe(false);
      expect(isValidPhone('1381234567')).toBe(false);
      expect(isValidPhone('1234567890')).toBe(false);
      expect(isValidPhone('abcdefghijk')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=1')).toBe(true);
      expect(isValidUrl('https://sub.domain.com')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false);
      expect(isValidUUID('not-a-uuid')).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid date strings', () => {
      expect(isValidDate('2024-01-01')).toBe(true);
      expect(isValidDate('2024-12-31')).toBe(true);
      expect(isValidDate('2024-06-15T10:30:00')).toBe(true);
    });

    it('should return false for invalid date strings', () => {
      expect(isValidDate('')).toBe(false);
      expect(isValidDate('invalid')).toBe(false);
      expect(isValidDate('2024-13-01')).toBe(false);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty values', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty([])).toBe(true);
      expect(isEmpty({})).toBe(true);
    });

    it('should return false for non-empty values', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty([1, 2, 3])).toBe(false);
      expect(isEmpty({ key: 'value' })).toBe(false);
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(false)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should return valid for strong passwords', () => {
      const result = validatePassword('Password123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for weak passwords', () => {
      const shortResult = validatePassword('Pass1!');
      expect(shortResult.isValid).toBe(false);
      expect(shortResult.errors.length).toBeGreaterThan(0);

      const noUpperResult = validatePassword('password123!');
      expect(noUpperResult.isValid).toBe(false);
      expect(noUpperResult.errors.some(e => e.includes('uppercase'))).toBe(true);

      const noLowerResult = validatePassword('PASSWORD123!');
      expect(noLowerResult.isValid).toBe(false);
      expect(noLowerResult.errors.some(e => e.includes('lowercase'))).toBe(true);

      const noDigitResult = validatePassword('PasswordABC!');
      expect(noDigitResult.isValid).toBe(false);
      expect(noDigitResult.errors.some(e => e.includes('digit'))).toBe(true);

      const noSpecialResult = validatePassword('Password123');
      expect(noSpecialResult.isValid).toBe(false);
      expect(noSpecialResult.errors.some(e => e.includes('special'))).toBe(true);
    });
  });
});