import { describe, it, expect, beforeEach } from 'vitest';
import {
  localStorage2,
  sessionStorage2,
  LocalStorage,
  SessionStorage,
  STORAGE_KEYS,
} from '../storage';

describe('LocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('set & get', () => {
    it('should store and retrieve a value', () => {
      localStorage2.set('key1', { name: 'test' });
      const result = localStorage2.get<{ name: string }>('key1');
      expect(result).toEqual({ name: 'test' });
    });

    it('should return defaultValue for non-existent key', () => {
      const result = localStorage2.get('non-existent', 'default');
      expect(result).toBe('default');
    });

    it('should return undefined for non-existent key without default', () => {
      const result = localStorage2.get('non-existent');
      expect(result).toBeUndefined();
    });

    it('should handle expired entries', async () => {
      localStorage2.set('key1', 'value', 1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const result = localStorage2.get('key1');
      expect(result).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should remove existing key', () => {
      localStorage2.set('key1', 'value');
      localStorage2.remove('key1');
      expect(localStorage2.has('key1')).toBe(false);
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      localStorage2.set('key1', 'value');
      expect(localStorage2.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(localStorage2.has('non-existent')).toBe(false);
    });
  });

  describe('keys', () => {
    it('should return all keys with prefix', () => {
      localStorage2.set('key1', 'value1');
      localStorage2.set('key2', 'value2');
      const keys = localStorage2.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should not include keys without prefix', () => {
      localStorage.setItem('other_key', 'value');
      localStorage2.set('key1', 'value1');
      const keys = localStorage2.keys();
      expect(keys).not.toContain('other_key');
    });
  });

  describe('clear', () => {
    it('should clear all prefixed keys', () => {
      localStorage2.set('key1', 'value1');
      localStorage2.set('key2', 'value2');
      localStorage2.clear();
      expect(localStorage2.has('key1')).toBe(false);
      expect(localStorage2.has('key2')).toBe(false);
    });

    it('should not clear non-prefixed keys', () => {
      localStorage.setItem('other_key', 'value');
      localStorage2.clear();
      expect(localStorage.getItem('other_key')).toBe('value');
    });
  });

  describe('with custom options', () => {
    it('should support custom prefix', () => {
      const customStorage = new LocalStorage({ prefix: 'custom_' });
      customStorage.set('key1', 'value');
      expect(localStorage.getItem('custom_key1')).not.toBeNull();
    });
  });
});

describe('SessionStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('set & get', () => {
    it('should store and retrieve a value', () => {
      sessionStorage2.set('key1', { name: 'test' });
      const result = sessionStorage2.get<{ name: string }>('key1');
      expect(result).toEqual({ name: 'test' });
    });

    it('should return defaultValue for non-existent key', () => {
      const result = sessionStorage2.get('non-existent', 'default');
      expect(result).toBe('default');
    });
  });

  describe('remove', () => {
    it('should remove existing key', () => {
      sessionStorage2.set('key1', 'value');
      sessionStorage2.remove('key1');
      expect(sessionStorage2.get('key1')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all prefixed keys', () => {
      sessionStorage2.set('key1', 'value1');
      sessionStorage2.set('key2', 'value2');
      sessionStorage2.clear();
      expect(sessionStorage2.get('key1')).toBeUndefined();
      expect(sessionStorage2.get('key2')).toBeUndefined();
    });
  });
});

describe('STORAGE_KEYS', () => {
  it('should have all expected keys', () => {
    expect(STORAGE_KEYS.USER_INFO).toBe('user_info');
    expect(STORAGE_KEYS.USER_PERMISSIONS).toBe('user_permissions');
    expect(STORAGE_KEYS.THEME).toBe('theme');
    expect(STORAGE_KEYS.LANGUAGE).toBe('language');
    expect(STORAGE_KEYS.SIDEBAR_COLLAPSED).toBe('sidebar_collapsed');
    expect(STORAGE_KEYS.TABLE_COLUMNS).toBe('table_columns');
    expect(STORAGE_KEYS.FORM_DRAFT).toBe('form_draft');
    expect(STORAGE_KEYS.LAST_LOGIN).toBe('last_login');
    expect(STORAGE_KEYS.REMEMBER_ME).toBe('remember_me');
  });
});
