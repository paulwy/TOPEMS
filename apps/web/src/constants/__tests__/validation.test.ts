import { describe, it, expect } from 'vitest';

import {
  PHONE_REGEX,
  EMAIL_REGEX,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  URL_MAX_LENGTH,
} from '../validation';

describe('validation constants', () => {
  describe('PHONE_REGEX', () => {
    it('should match valid mainland China mobile numbers', () => {
      expect(PHONE_REGEX.test('13800138000')).toBe(true);
      expect(PHONE_REGEX.test('15912345678')).toBe(true);
      expect(PHONE_REGEX.test('19900001111')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(PHONE_REGEX.test('12345678901')).toBe(false); // starts with 12
      expect(PHONE_REGEX.test('1380013800')).toBe(false); // too short
      expect(PHONE_REGEX.test('138001380000')).toBe(false); // too long
      expect(PHONE_REGEX.test('')).toBe(false);
      expect(PHONE_REGEX.test('abc')).toBe(false);
    });
  });

  describe('EMAIL_REGEX', () => {
    it('should match valid email addresses', () => {
      expect(EMAIL_REGEX.test('user@example.com')).toBe(true);
      expect(EMAIL_REGEX.test('test.name@domain.co.uk')).toBe(true);
      expect(EMAIL_REGEX.test('a@b.io')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(EMAIL_REGEX.test('plainaddress')).toBe(false);
      expect(EMAIL_REGEX.test('missing@dot')).toBe(false);
      expect(EMAIL_REGEX.test('@nouser.com')).toBe(false);
      expect(EMAIL_REGEX.test('user@.com')).toBe(false);
      expect(EMAIL_REGEX.test('')).toBe(false);
    });
  });

  describe('length limits', () => {
    it('should have correct username length bounds', () => {
      expect(USERNAME_MIN_LENGTH).toBe(3);
      expect(USERNAME_MAX_LENGTH).toBe(20);
      expect(USERNAME_MIN_LENGTH).toBeLessThan(USERNAME_MAX_LENGTH);
    });

    it('should have correct password length bounds', () => {
      expect(PASSWORD_MIN_LENGTH).toBe(8);
      expect(PASSWORD_MAX_LENGTH).toBe(32);
      expect(PASSWORD_MIN_LENGTH).toBeLessThan(PASSWORD_MAX_LENGTH);
    });

    it('should have correct name max length', () => {
      expect(NAME_MAX_LENGTH).toBe(50);
    });

    it('should have correct description max length', () => {
      expect(DESCRIPTION_MAX_LENGTH).toBe(500);
    });

    it('should have correct URL max length', () => {
      expect(URL_MAX_LENGTH).toBe(2048);
    });
  });
});
