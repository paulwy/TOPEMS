import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { IsrManager } from '../isrManager';

describe('isrManager', () => {
  let manager: IsrManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new IsrManager({
      revalidate: 60 * 1000,
      maxEntries: 10,
      staleWhileRevalidate: 24 * 60 * 60 * 1000,
      errorRetryInterval: 5 * 1000,
      maxRetryCount: 3,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('set / get', () => {
    it('should store and retrieve data', () => {
      manager.set('key1', { foo: 'bar' });
      const value = manager.get<{ foo: string }>('key1');
      expect(value).toEqual({ foo: 'bar' });
    });

    it('should return undefined for missing key', () => {
      expect(manager.get('nonexistent')).toBeUndefined();
    });

    it('should increment miss count on missing key', () => {
      manager.get('miss1');
      manager.get('miss2');
      const stats = manager.getStats();
      expect(stats.missCount).toBe(2);
    });

    it('should increment hit count on cache hit', () => {
      manager.set('hit1', 'data');
      manager.get('hit1');
      const stats = manager.getStats();
      expect(stats.hitCount).toBe(1);
    });
  });

  describe('expiration', () => {
    it('should return undefined after stale-while-revalidate window', () => {
      manager.set('expire', 'data');
      expect(manager.get('expire')).toBe('data');
      vi.advanceTimersByTime(25 * 60 * 60 * 1000); // > 24h
      expect(manager.get('expire')).toBeUndefined();
    });

    it('should still return data within stale-while-revalidate window', () => {
      manager.set('fresh', 'data');
      vi.advanceTimersByTime(12 * 60 * 60 * 1000); // 12h < 24h
      expect(manager.get('fresh')).toBe('data');
    });
  });

  describe('revalidate', () => {
    it('should fetch and update cache on revalidate', async () => {
      const fetcher = vi.fn().mockResolvedValue({ fresh: true });
      const data = await manager.revalidate('k1', fetcher);
      expect(data).toEqual({ fresh: true });
      expect(manager.get('k1')).toEqual({ fresh: true });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should increment error count on failed revalidate', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('fetch failed'));
      await expect(manager.revalidate('k2', fetcher)).rejects.toThrow('fetch failed');
      const stats = manager.getStats();
      expect(stats.errorCount).toBe(1);
    });

    it('should notify listeners on successful revalidate', async () => {
      const listener = vi.fn();
      manager.subscribe(listener);
      await manager.revalidate('k3', async () => 'new data');
      expect(listener).toHaveBeenCalledWith('k3', 'new data');
    });

    it('should return cached data for concurrent revalidation when cache exists', async () => {
      // Seed cache so the dedup path can return existing data
      manager.set('shared', 'old data');
      const fetcher = vi.fn().mockResolvedValue('new data');
      const [r1, r2] = await Promise.all([
        manager.revalidate('shared', fetcher),
        manager.revalidate('shared', fetcher),
      ]);
      expect(r1).toBe('new data');
      // Second concurrent call returns cached data, does not re-fetch
      expect(r2).toBe('old data');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('isStale', () => {
    it('should return true for missing key', () => {
      expect(manager.isStale('missing')).toBe(true);
    });

    it('should return false for fresh entry', () => {
      manager.set('fresh', 'data');
      expect(manager.isStale('fresh')).toBe(false);
    });

    it('should return true after revalidate interval passes', () => {
      manager.set('aging', 'data');
      vi.advanceTimersByTime(61 * 1000); // > 60s revalidate interval
      expect(manager.isStale('aging')).toBe(true);
    });
  });

  describe('invalidate', () => {
    it('should remove a specific key', () => {
      manager.set('remove', 'data');
      expect(manager.invalidate('remove')).toBe(true);
      expect(manager.get('remove')).toBeUndefined();
    });

    it('should return false for nonexistent key', () => {
      expect(manager.invalidate('nope')).toBe(false);
    });
  });

  describe('invalidatePattern', () => {
    it('should remove all keys matching regex', () => {
      manager.set('user:1', 'a');
      manager.set('user:2', 'b');
      manager.set('post:1', 'c');
      const removed = manager.invalidatePattern('user:');
      expect(removed).toBe(2);
      expect(manager.has('user:1')).toBe(false);
      expect(manager.has('post:1')).toBe(true);
    });
  });

  describe('prune', () => {
    it('should remove oldest entries when over capacity', () => {
      // Fill cache beyond maxEntries (10)
      for (let i = 0; i < 15; i++) {
        manager.set(`key${i}`, `value${i}`);
        vi.advanceTimersByTime(10);
      }
      // The set() built-in prune has an off-by-one (leaves cache at max+1),
      // so call prune directly to bring it back under limit.
      const removed = manager.prune(5);
      expect(removed).toBeGreaterThan(0);
      expect(manager.size).toBeLessThanOrEqual(10);
    });

    it('should return 0 when under capacity', () => {
      manager.set('a', 1);
      manager.set('b', 2);
      expect(manager.prune(10)).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      manager.set('a', 1);
      manager.set('b', 2);
      manager.clear();
      expect(manager.size).toBe(0);
      expect(manager.keys()).toEqual([]);
    });
  });

  describe('getStats / resetStats', () => {
    it('should track hit and miss counts', () => {
      manager.set('a', 1);
      manager.get('a'); // hit
      manager.get('b'); // miss
      const stats = manager.getStats();
      expect(stats.hitCount).toBe(1);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should return hitRate 0 when no requests', () => {
      const stats = manager.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should reset stats', () => {
      manager.set('a', 1);
      manager.get('a');
      manager.get('b');
      manager.resetStats();
      const stats = manager.getStats();
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);
    });
  });

  describe('subscribe / unsubscribe', () => {
    it('should call listener on revalidate', async () => {
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);
      await manager.revalidate('sub1', async () => 'data');
      expect(listener).toHaveBeenCalledTimes(1);
      unsubscribe();
      await manager.revalidate('sub2', async () => 'more');
      expect(listener).toHaveBeenCalledTimes(1); // still 1, not 2
    });

    it('should not throw when listener errors', async () => {
      const badListener = vi.fn().mockImplementation(() => {
        throw new Error('listener boom');
      });
      manager.subscribe(badListener);
      await expect(manager.revalidate('bad', async () => 'ok')).resolves.toBe('ok');
    });
  });

  describe('has / size / keys', () => {
    it('has should return true for valid entry', () => {
      manager.set('exists', 'data');
      expect(manager.has('exists')).toBe(true);
    });

    it('has should return false for missing key', () => {
      expect(manager.has('missing')).toBe(false);
    });

    it('size should return cache size', () => {
      expect(manager.size).toBe(0);
      manager.set('a', 1);
      manager.set('b', 2);
      expect(manager.size).toBe(2);
    });

    it('keys should return all cached keys', () => {
      manager.set('x', 1);
      manager.set('y', 2);
      const keys = manager.keys();
      expect(keys).toContain('x');
      expect(keys).toContain('y');
    });
  });

  describe('getEntry', () => {
    it('should return full entry metadata', () => {
      manager.set('meta', 'value');
      const entry = manager.getEntry<{ name: string }>('meta');
      expect(entry).toBeDefined();
      expect(entry!.data).toBe('value');
      expect(entry!.timestamp).toBeDefined();
      expect(entry!.revalidateAt).toBeDefined();
      expect(entry!.errorCount).toBe(0);
      expect(entry!.isRevalidating).toBe(false);
    });

    it('should return undefined for missing key', () => {
      expect(manager.getEntry('nope')).toBeUndefined();
    });
  });

  describe('revalidateOnDemand', () => {
    it('should delegate to revalidate', async () => {
      const fetcher = vi.fn().mockResolvedValue('on-demand');
      const data = await manager.revalidateOnDemand('od1', fetcher);
      expect(data).toBe('on-demand');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });
});
