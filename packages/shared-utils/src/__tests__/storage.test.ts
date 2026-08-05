import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setStorage,
  getStorage,
  removeStorage,
  clearStorage,
  setSessionStorage,
  getSessionStorage,
  removeSessionStorage,
} from '../storage';

describe('shared-utils/storage - localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('setStorage / getStorage', () => {
    it('roundtrips a string value', () => {
      setStorage('key1', 'hello');
      expect(getStorage('key1')).toBe('hello');
    });

    it('roundtrips an object', () => {
      setStorage('key2', { name: 'topems', version: 1 });
      expect(getStorage('key2')).toEqual({ name: 'topems', version: 1 });
    });

    it('roundtrips an array', () => {
      setStorage('key3', [1, 2, 3]);
      expect(getStorage('key3')).toEqual([1, 2, 3]);
    });

    it('roundtrips a number', () => {
      setStorage('key4', 42);
      expect(getStorage('key4')).toBe(42);
    });

    it('roundtrips a boolean', () => {
      setStorage('key5', true);
      expect(getStorage('key5')).toBe(true);
    });

    it('roundtrips null', () => {
      setStorage('key6', null);
      expect(getStorage('key6')).toBeNull();
    });

    it('returns defaultValue when key does not exist', () => {
      expect(getStorage('missing', 'fallback')).toBe('fallback');
      expect(getStorage('missing', { default: true })).toEqual({ default: true });
    });

    it('returns undefined when key does not exist and no defaultValue', () => {
      expect(getStorage('missing')).toBeUndefined();
    });
  });

  describe('removeStorage', () => {
    it('removes a stored key', () => {
      setStorage('toRemove', 'value');
      removeStorage('toRemove');
      expect(getStorage('toRemove')).toBeUndefined();
    });

    it('does not throw for non-existent key', () => {
      expect(() => removeStorage('never-existed')).not.toThrow();
    });
  });

  describe('clearStorage', () => {
    it('clears all localStorage entries', () => {
      setStorage('a', 1);
      setStorage('b', 2);
      clearStorage();
      expect(getStorage('a')).toBeUndefined();
      expect(getStorage('b')).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('setStorage catches quota exceeded and warns', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
      expect(() => setStorage('x', 'y')).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to set localStorage:',
        expect.any(DOMException)
      );
      warnSpy.mockRestore();
      vi.restoreAllMocks();
    });

    it('getStorage catches JSON parse errors and returns defaultValue', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem('bad-json', '{invalid json}');
      expect(getStorage('bad-json', 'default')).toBe('default');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});

describe('shared-utils/storage - sessionStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('setSessionStorage / getSessionStorage', () => {
    it('roundtrips an object', () => {
      setSessionStorage('s1', { user: 'admin', roles: ['read', 'write'] });
      expect(getSessionStorage('s1')).toEqual({ user: 'admin', roles: ['read', 'write'] });
    });

    it('returns defaultValue when key does not exist', () => {
      expect(getSessionStorage('missing', 0)).toBe(0);
    });

    it('returns undefined when key does not exist and no defaultValue', () => {
      expect(getSessionStorage('missing')).toBeUndefined();
    });
  });

  describe('removeSessionStorage', () => {
    it('removes a stored key', () => {
      setSessionStorage('toRemove', 'value');
      removeSessionStorage('toRemove');
      expect(getSessionStorage('toRemove')).toBeUndefined();
    });

    it('does not throw for non-existent key', () => {
      expect(() => removeSessionStorage('never')).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('setSessionStorage catches errors and warns', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
      expect(() => setSessionStorage('x', 'y')).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to set sessionStorage:',
        expect.any(DOMException)
      );
      warnSpy.mockRestore();
      vi.restoreAllMocks();
    });
  });
});
