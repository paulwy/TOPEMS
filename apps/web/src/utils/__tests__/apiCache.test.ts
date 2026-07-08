import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiCache } from '../apiCache';

describe('apiCache', () => {
  beforeEach(() => {
    apiCache.clear();
  });

  describe('set & get', () => {
    it('should store and retrieve data', () => {
      apiCache.set('key1', { name: 'test' });
      const result = apiCache.get<{ name: string }>('key1');
      expect(result).toEqual({ name: 'test' });
    });

    it('should return null for non-existent key', () => {
      const result = apiCache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should return null for expired entries', async () => {
      apiCache.set('key1', 'value', 1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const result = apiCache.get('key1');
      expect(result).toBeNull();
    });

    it('should delete expired entry on get', async () => {
      apiCache.set('key1', 'value', 1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      apiCache.get('key1');
      expect(apiCache.has('key1')).toBe(false);
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      apiCache.set('key1', 'value');
      expect(apiCache.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(apiCache.has('non-existent')).toBe(false);
    });

    it('should return false for expired key', async () => {
      apiCache.set('key1', 'value', 1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(apiCache.has('key1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete existing key', () => {
      apiCache.set('key1', 'value');
      expect(apiCache.delete('key1')).toBe(true);
      expect(apiCache.has('key1')).toBe(false);
    });

    it('should return false for non-existent key', () => {
      expect(apiCache.delete('non-existent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      apiCache.set('key1', 'value1');
      apiCache.set('key2', 'value2');
      apiCache.clear();
      expect(apiCache.has('key1')).toBe(false);
      expect(apiCache.has('key2')).toBe(false);
    });
  });

  describe('clearByPrefix', () => {
    it('should clear entries matching prefix', () => {
      apiCache.set('user:1', 'value1');
      apiCache.set('user:2', 'value2');
      apiCache.set('post:1', 'value3');
      apiCache.clearByPrefix('user:');
      expect(apiCache.has('user:1')).toBe(false);
      expect(apiCache.has('user:2')).toBe(false);
      expect(apiCache.has('post:1')).toBe(true);
    });
  });

  describe('generateKey', () => {
    it('should generate key from URL only', () => {
      const key = apiCache.generateKey('/api/employees');
      expect(key).toBe('/api/employees');
    });

    it('should generate key from URL and params', () => {
      const key = apiCache.generateKey('/api/employees', { page: 1, size: 10 });
      expect(key).toContain('/api/employees?');
      expect(key).toContain('page=1');
      expect(key).toContain('size=10');
    });

    it('should sort params alphabetically', () => {
      const key = apiCache.generateKey('/api/test', { b: 2, a: 1 });
      const aIndex = key.indexOf('a=');
      const bIndex = key.indexOf('b=');
      expect(aIndex).toBeLessThan(bIndex);
    });
  });

  describe('dedup', () => {
    it('should deduplicate concurrent requests', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      const [r1, r2] = await Promise.all([
        apiCache.dedup('key1', mockFn),
        apiCache.dedup('key1', mockFn),
      ]);
      expect(r1).toBe('result');
      expect(r2).toBe('result');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should allow new request after previous completes', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      await apiCache.dedup('key1', mockFn);
      await apiCache.dedup('key1', mockFn);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should propagate errors to all waiting requests', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('fail'));
      const [p1, p2] = [
        apiCache.dedup('key1', mockFn),
        apiCache.dedup('key1', mockFn),
      ];
      await expect(p1).rejects.toThrow('fail');
      await expect(p2).rejects.toThrow('fail');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('getOrFetch', () => {
    it('should return cached value if available', async () => {
      apiCache.set('key1', 'cached');
      const mockFn = vi.fn();
      const result = await apiCache.getOrFetch('key1', mockFn);
      expect(result).toBe('cached');
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should fetch if not cached', async () => {
      const mockFn = vi.fn().mockResolvedValue('fetched');
      const result = await apiCache.getOrFetch('key1', mockFn);
      expect(result).toBe('fetched');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should cache the fetched result', async () => {
      const mockFn = vi.fn().mockResolvedValue('fetched');
      await apiCache.getOrFetch('key1', mockFn);
      await apiCache.getOrFetch('key1', mockFn);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});
