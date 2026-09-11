import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { EdgeComputeManager, edgeComputeManager } from '../edgeCompute';

// Mock i18n (required for module-level default endpoints)
vi.mock('@/i18n', () => ({
  default: {
    t: (x: string) => x,
  },
}));

describe('edgeCompute', () => {
  let manager: EdgeComputeManager;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new EdgeComputeManager();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
    manager.destroy();
  });

  afterAll(() => {
    // Clean up the module-level singleton's timer
    edgeComputeManager.destroy();
  });

  describe('constructor', () => {
    it('should use default config values', () => {
      const m = new EdgeComputeManager();
      const stats = m.getCacheStats();
      expect(stats.maxSize).toBe(200);
    });

    it('should accept custom config', () => {
      const m = new EdgeComputeManager({ maxCacheEntries: 50, cacheTTL: 1000 });
      expect(m.getCacheStats().maxSize).toBe(50);
    });
  });

  describe('registerEndpoint / unregisterEndpoint', () => {
    it('should register an endpoint with initial stats', () => {
      manager.registerEndpoint({
        id: 'e1',
        name: 'East',
        region: 'cn-east',
        url: 'https://example.com',
        weight: 100,
        latency: 20,
        healthy: true,
      });
      const ep = manager.getEndpoint('e1');
      expect(ep).toBeDefined();
      expect(ep!.failCount).toBe(0);
      expect(ep!.successCount).toBe(0);
      expect(ep!.healthy).toBe(true);
    });

    it('should unregister an existing endpoint', () => {
      manager.registerEndpoint({
        id: 'e2',
        name: 'N',
        region: 'cn-north',
        url: 'https://example.com',
        weight: 90,
        latency: 30,
        healthy: true,
      });
      expect(manager.unregisterEndpoint('e2')).toBe(true);
      expect(manager.getEndpoint('e2')).toBeUndefined();
    });

    it('should return false when unregistering nonexistent endpoint', () => {
      expect(manager.unregisterEndpoint('nope')).toBe(false);
    });

    it('should return all registered endpoints', () => {
      manager.registerEndpoint({
        id: 'a',
        name: 'A',
        region: 'r1',
        url: 'https://a.com',
        weight: 100,
        latency: 10,
        healthy: true,
      });
      manager.registerEndpoint({
        id: 'b',
        name: 'B',
        region: 'r2',
        url: 'https://b.com',
        weight: 90,
        latency: 20,
        healthy: true,
      });
      expect(manager.getAllEndpoints()).toHaveLength(2);
    });
  });

  describe('selectOptimalEndpoint', () => {
    beforeEach(() => {
      manager.registerEndpoint({
        id: 'fast',
        name: 'Fast',
        region: 'cn-east',
        url: 'https://fast.com',
        weight: 100,
        latency: 10,
        healthy: true,
      });
      manager.registerEndpoint({
        id: 'slow',
        name: 'Slow',
        region: 'cn-west',
        url: 'https://slow.com',
        weight: 50,
        latency: 200,
        healthy: true,
      });
    });

    it('should return null when no healthy endpoints', () => {
      const m = new EdgeComputeManager();
      expect(m.selectOptimalEndpoint()).toBeNull();
    });

    it('should select the best-scoring endpoint', () => {
      const best = manager.selectOptimalEndpoint();
      expect(best).not.toBeNull();
      expect(best!.id).toBe('fast'); // lower latency = higher score
    });

    it('should filter by region when specified', () => {
      const best = manager.selectOptimalEndpoint('cn-west');
      expect(best).not.toBeNull();
      expect(best!.id).toBe('slow');
    });

    it('should fall back to all regions when no healthy in specified region', () => {
      // Mark the cn-west endpoint as unhealthy
      manager.getEndpoint('slow')!.healthy = false;
      const best = manager.selectOptimalEndpoint('cn-west');
      // No healthy in cn-west, but fast is healthy in cn-east -> falls back
      expect(best).not.toBeNull();
    });

    it('should return null when all endpoints unhealthy', () => {
      manager.getEndpoint('fast')!.healthy = false;
      manager.getEndpoint('slow')!.healthy = false;
      expect(manager.selectOptimalEndpoint()).toBeNull();
    });
  });

  describe('getEdgeCache / setEdgeCache', () => {
    it('should store and retrieve cached data', () => {
      manager.setEdgeCache('key1', { foo: 'bar' }, 60000);
      const cached = manager.getEdgeCache<{ foo: string }>('key1');
      expect(cached).toEqual({ foo: 'bar' });
    });

    it('should return undefined for missing key', () => {
      expect(manager.getEdgeCache('nonexistent')).toBeUndefined();
    });

    it('should expire cache after TTL', () => {
      manager.setEdgeCache('short', 'value', 1000); // 1 second TTL
      expect(manager.getEdgeCache('short')).toBe('value');
      vi.advanceTimersByTime(2000);
      expect(manager.getEdgeCache('short')).toBeUndefined();
    });

    it('should evict oldest entry when cache is full', () => {
      const m = new EdgeComputeManager({ maxCacheEntries: 3 });
      m.setEdgeCache('k1', 'v1', 60000);
      vi.advanceTimersByTime(100);
      m.setEdgeCache('k2', 'v2', 60000);
      vi.advanceTimersByTime(100);
      m.setEdgeCache('k3', 'v3', 60000);
      vi.advanceTimersByTime(100);
      // Now adding a 4th should evict k1 (oldest)
      m.setEdgeCache('k4', 'v4', 60000);
      expect(m.getEdgeCache('k1')).toBeUndefined();
      expect(m.getEdgeCache('k4')).toBe('v4');
    });
  });

  describe('invalidateEdgeCache', () => {
    it('should remove a specific cache key', () => {
      manager.setEdgeCache('remove-me', 'data');
      expect(manager.getEdgeCache('remove-me')).toBe('data');
      expect(manager.invalidateEdgeCache('remove-me')).toBe(true);
      expect(manager.getEdgeCache('remove-me')).toBeUndefined();
    });

    it('should return false for missing key', () => {
      expect(manager.invalidateEdgeCache('missing')).toBe(false);
    });
  });

  describe('invalidateEdgeCachePattern', () => {
    it('should invalidate matching keys by regex', () => {
      manager.setEdgeCache('edge:user:1', 'a');
      manager.setEdgeCache('edge:user:2', 'b');
      manager.setEdgeCache('edge:post:1', 'c');
      const removed = manager.invalidateEdgeCachePattern('edge:user:');
      expect(removed).toBe(2);
      expect(manager.getEdgeCache('edge:post:1')).toBe('c');
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cached entries', () => {
      manager.setEdgeCache('a', 1);
      manager.setEdgeCache('b', 2);
      manager.clearAllCache();
      expect(manager.getCacheStats().size).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('should return current cache stats', () => {
      manager.setEdgeCache('x', 1);
      manager.setEdgeCache('y', 2);
      const stats = manager.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(200);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('executeEdgeFunction (cache-first)', () => {
    it('should return cached result without calling fetch', async () => {
      manager.setEdgeCache('edge:test:{}', { cached: true });
      const result = await manager.executeEdgeFunction('test', {}, { strategy: 'cache-first' });
      expect(result).toEqual({ cached: true });
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('should throw on cache-only miss', async () => {
      await expect(
        manager.executeEdgeFunction('missing', {}, { strategy: 'cache-only' })
      ).rejects.toThrow(/Cache miss/);
    });
  });

  describe('executeEdgeFunction (network)', () => {
    beforeEach(() => {
      manager.registerEndpoint({
        id: 'ep1',
        name: 'EP',
        region: 'r1',
        url: 'https://api.example.com',
        weight: 100,
        latency: 10,
        healthy: true,
      });
    });

    it('should call fetch and return JSON result', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'success' }),
      } as Response);

      const result = await manager.executeEdgeFunction('myFn', { a: 1 });
      expect(result).toEqual({ data: 'success' });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.example.com/edge/myFn',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should throw when no healthy endpoints available', async () => {
      const m = new EdgeComputeManager();
      await expect(m.executeEdgeFunction('fn')).rejects.toThrow(/No healthy edge endpoints/);
    });

    it('should fall back to stale cache on failure with SWR strategy', async () => {
      // Pre-populate cache
      const cacheKey = 'edge:failFn:{}';
      manager.setEdgeCache(cacheKey, { stale: true });

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network down'));

      const result = await manager.executeEdgeFunction(
        'failFn',
        {},
        {
          strategy: 'stale-while-revalidate',
        }
      );
      expect(result).toEqual({ stale: true });
    });
  });

  describe('health check failover / recovery', () => {
    beforeEach(() => {
      manager.registerEndpoint({
        id: 'healthy-ep',
        name: 'HE',
        region: 'r1',
        url: 'https://he.com',
        weight: 100,
        latency: 10,
        healthy: true,
      });
    });

    it('should mark endpoint unhealthy after failover threshold via executeEdgeFunction', async () => {
      manager.unregisterEndpoint('healthy-ep');
      manager.registerEndpoint({
        id: 'fail-ep',
        name: 'FE',
        region: 'r1',
        url: 'https://fe.com',
        weight: 100,
        latency: 10,
        healthy: true,
      });
      const ep = manager.getEndpoint('fail-ep')!;

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network down'));

      // failoverThreshold defaults to 3
      for (let i = 0; i < 2; i++) {
        await expect(manager.executeEdgeFunction('fn')).rejects.toThrow();
      }
      expect(ep.healthy).toBe(true);
      await expect(manager.executeEdgeFunction('fn')).rejects.toThrow();
      expect(ep.healthy).toBe(false);
    });

    it('should set healthy=true when health check passes', async () => {
      manager.registerEndpoint({
        id: 'rec-ep',
        name: 'RE',
        region: 'r1',
        url: 'https://re.com',
        weight: 100,
        latency: 10,
        healthy: false,
      });

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await manager.checkProviderHealth('rec-ep');
      expect(result).toBe(true);
      expect(manager.getEndpoint('rec-ep')!.healthy).toBe(true);
    });

    it('should set healthy=false when health check returns error', async () => {
      manager.registerEndpoint({
        id: 'err-ep',
        name: 'EE',
        region: 'r1',
        url: 'https://ee.com',
        weight: 100,
        latency: 10,
        healthy: true,
      });

      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
      } as Response);

      const result = await manager.checkProviderHealth('err-ep');
      expect(result).toBe(false);
      expect(manager.getEndpoint('err-ep')!.healthy).toBe(false);
    });

    it('should return false for unknown endpoint health check', async () => {
      const result = await manager.checkProviderHealth('unknown');
      expect(result).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should clear the health check timer', () => {
      const m = new EdgeComputeManager();
      m.registerEndpoint({
        id: 'timer-ep',
        name: 'T',
        region: 'r1',
        url: 'https://t.com',
        weight: 100,
        latency: 10,
        healthy: true,
      });
      // Should not throw
      expect(() => m.destroy()).not.toThrow();
    });
  });
});
