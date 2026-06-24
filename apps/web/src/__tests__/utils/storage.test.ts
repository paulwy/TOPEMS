import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { localStorage2, sessionStorage2, LocalStorage, SessionStorage, STORAGE_KEYS } from '@/utils/storage';

describe('storage utils', () => {
  let localStorageMock: Record<string, string> = {};
  let sessionStorageMock: Record<string, string> = {};

  beforeEach(() => {
    localStorageMock = {};
    sessionStorageMock = {};
    
    const localStorageObj: Storage & { [key: string]: string } = {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => { localStorageMock[key] = value; },
      removeItem: (key: string) => { delete localStorageMock[key]; },
      clear: () => { localStorageMock = {}; },
      get length() { return Object.keys(localStorageMock).length; },
      key: (index: number) => Object.keys(localStorageMock)[index] || null,
    };

    const sessionStorageObj: Storage & { [key: string]: string } = {
      getItem: (key: string) => sessionStorageMock[key] || null,
      setItem: (key: string, value: string) => { sessionStorageMock[key] = value; },
      removeItem: (key: string) => { delete sessionStorageMock[key]; },
      clear: () => { sessionStorageMock = {}; },
      get length() { return Object.keys(sessionStorageMock).length; },
      key: (index: number) => Object.keys(sessionStorageMock)[index] || null,
    };

    vi.stubGlobal('localStorage', new Proxy(localStorageObj, {
      ownKeys: () => Object.keys(localStorageMock),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    }));

    vi.stubGlobal('sessionStorage', new Proxy(sessionStorageObj, {
      ownKeys: () => Object.keys(sessionStorageMock),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('LocalStorage', () => {
    it('should set and get a value', () => {
      localStorage2.set('test_key', 'test_value');
      expect(localStorage2.get('test_key')).toBe('test_value');
    });

    it('should return default value when key does not exist', () => {
      expect(localStorage2.get('nonexistent', 'default')).toBe('default');
    });

    it('should return undefined when key does not exist and no default', () => {
      expect(localStorage2.get('nonexistent')).toBeUndefined();
    });

    it('should remove a value', () => {
      localStorage2.set('test_key', 'test_value');
      localStorage2.remove('test_key');
      expect(localStorage2.get('test_key')).toBeUndefined();
    });

    it('should clear all prefixed values', () => {
      localStorage2.set('key1', 'value1');
      localStorage2.set('key2', 'value2');
      localStorage.setItem('other_key', 'other_value');

      localStorage2.clear();

      expect(localStorage2.get('key1')).toBeUndefined();
      expect(localStorage2.get('key2')).toBeUndefined();
      expect(localStorage.getItem('other_key')).toBe('other_value');
    });

    it('should check if key exists', () => {
      localStorage2.set('test_key', 'test_value');
      expect(localStorage2.has('test_key')).toBe(true);
      expect(localStorage2.has('nonexistent')).toBe(false);
    });

    it('should get all keys', () => {
      localStorage2.set('key1', 'value1');
      localStorage2.set('key2', 'value2');

      const keys = localStorage2.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should handle expiration', () => {
      localStorage2.set('expiring_key', 'value', 1);
      expect(localStorage2.get('expiring_key')).toBe('value');

      return new Promise((resolve) => {
        setTimeout(() => {
          expect(localStorage2.get('expiring_key')).toBeUndefined();
          resolve(undefined);
        }, 10);
      });
    });

    it('should handle complex objects', () => {
      const obj = { name: 'Test', value: 42, nested: { key: 'value' } };
      localStorage2.set('complex_obj', obj);
      expect(localStorage2.get('complex_obj')).toEqual(obj);
    });

    it('should work with custom prefix', () => {
      const customStorage = new LocalStorage({ prefix: 'custom_' });
      customStorage.set('key', 'value');
      expect(customStorage.get('key')).toBe('value');
      expect(localStorage.getItem('custom_key')).toBeDefined();
    });
  });

  describe('SessionStorage', () => {
    it('should set and get a value', () => {
      sessionStorage2.set('test_key', 'test_value');
      expect(sessionStorage2.get('test_key')).toBe('test_value');
    });

    it('should return default value when key does not exist', () => {
      expect(sessionStorage2.get('nonexistent', 'default')).toBe('default');
    });

    it('should return undefined when key does not exist and no default', () => {
      expect(sessionStorage2.get('nonexistent')).toBeUndefined();
    });

    it('should remove a value', () => {
      sessionStorage2.set('test_key', 'test_value');
      sessionStorage2.remove('test_key');
      expect(sessionStorage2.get('test_key')).toBeUndefined();
    });

    it('should clear all prefixed values', () => {
      sessionStorage2.set('key1', 'value1');
      sessionStorage2.set('key2', 'value2');
      sessionStorage.setItem('other_key', 'other_value');

      sessionStorage2.clear();

      expect(sessionStorage2.get('key1')).toBeUndefined();
      expect(sessionStorage2.get('key2')).toBeUndefined();
      expect(sessionStorage.getItem('other_key')).toBe('other_value');
    });

    it('should handle complex objects', () => {
      const obj = { name: 'Test', value: 42 };
      sessionStorage2.set('complex_obj', obj);
      expect(sessionStorage2.get('complex_obj')).toEqual(obj);
    });
  });

  describe('STORAGE_KEYS', () => {
    it('should have expected keys', () => {
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
});
