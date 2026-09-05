import { describe, it, expect, vi, beforeEach } from 'vitest';
// Injects IDBFactory polyfill into the global scope before the tested module is imported
import 'fake-indexeddb/auto';
import type { ServiceName } from '@/lib/apiClient';

// Reset module cache between tests so that offlineStorage's `dbInstance` module-level cache
// does not survive across tests (it caches the opened DB connection).
beforeEach(() => {
  vi.resetModules();
});

/**
 * Force-clears all data in the offlineStorage stores.
 * Works by dynamically importing the module (which opens/caches the DB),
 * then using its own clear methods to wipe data. This keeps tests isolated
 * without needing to fight against IDB's close/deleteDatabase semantics.
 */
async function wipeAllStores() {
  const mod = await import('@/services/OfflineStorage');
  await mod.clearAllOfflineRecords();
  // cache entries: delete them one-by-one since there is no bulk clear helper exported
  const allCached = await listAllCacheEntries(mod);
  for (const entry of allCached) {
    await mod.deleteCacheEntry(entry.service as ServiceName, entry.endpoint);
  }
}

async function listAllCacheEntries(mod: typeof import('@/services/OfflineStorage')) {
  // There is no public "list all cache entries" API. We iterate via deleteCacheEntry patterns
  // by re-opening the DB directly.
  return new Promise<any[]>((resolve, reject) => {
    const openReq = indexedDB.open('TOPEMSOfflineDB', 1);
    openReq.onsuccess = () => {
      const db = openReq.result;
      try {
        const tx = db.transaction(['cacheEntries'], 'readonly');
        const store = tx.objectStore('cacheEntries');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as any[]);
        req.onerror = () => reject(req.error);
      } catch (e) {
        // cacheEntries store doesn't exist yet -> empty
        resolve([]);
      }
    };
    openReq.onerror = () => reject(openReq.error);
    openReq.onupgradeneeded = () => {
      // no-op: createObjectStore handled later by offlineStorage module if DB missing
    };
  }).catch(() => []);
}

const SERVICE: ServiceName = 'iam';

describe('offlineStorage (via fake-indexeddb)', () => {
  beforeEach(async () => {
    // Wipe stores via the module's own APIs before every single test run
    await wipeAllStores();
  });

  describe('Offline Records (Queue)', () => {
    it('saveOfflineRecord returns generated id and stores with status pending', async () => {
      const { saveOfflineRecord, getOfflineRecords } = await import('@/services/OfflineStorage');

      const id = await saveOfflineRecord({
        service: SERVICE,
        endpoint: '/users',
        method: 'POST',
        data: { name: 'Alice' },
        timestamp: 1000,
      });

      expect(id).toContain('iam_/users_');
      const all = await getOfflineRecords();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe(id);
      expect(all[0].status).toBe('pending');
      expect(all[0].retryCount).toBe(0);
      expect((all[0].data as any).name).toBe('Alice');
    });

    it('getOfflineRecords filters by status index', async () => {
      const { saveOfflineRecord, getOfflineRecords, updateOfflineRecord } =
        await import('@/services/OfflineStorage');

      const idA = await saveOfflineRecord({
        service: SERVICE,
        endpoint: '/a',
        method: 'GET',
        data: null,
        timestamp: 1,
      });
      const idB = await saveOfflineRecord({
        service: SERVICE,
        endpoint: '/b',
        method: 'GET',
        data: null,
        timestamp: 2,
      });

      await updateOfflineRecord(idA, { status: 'synced' });

      const pending = await getOfflineRecords('pending');
      expect(pending.map((r) => r.id)).toEqual([idB]);

      const synced = await getOfflineRecords('synced');
      expect(synced.map((r) => r.id)).toEqual([idA]);
    });

    it('updateOfflineRecord modifies fields of existing record', async () => {
      const { saveOfflineRecord, getOfflineRecords, updateOfflineRecord } =
        await import('@/services/OfflineStorage');

      const id = await saveOfflineRecord({
        service: SERVICE,
        endpoint: '/x',
        method: 'PUT',
        data: {},
        timestamp: 5,
      });

      await updateOfflineRecord(id, {
        status: 'failed',
        retryCount: 2,
        error: 'Network down',
      });

      const found = (await getOfflineRecords())[0];
      expect(found.status).toBe('failed');
      expect(found.retryCount).toBe(2);
      expect(found.error).toBe('Network down');
    });

    it('updateOfflineRecord rejects for missing record', async () => {
      const { updateOfflineRecord } = await import('@/services/OfflineStorage');
      await expect(updateOfflineRecord('non-existent', { status: 'synced' })).rejects.toThrow(
        /not found/i
      );
    });

    it('deleteOfflineRecord removes record by id', async () => {
      const { saveOfflineRecord, getOfflineRecords, deleteOfflineRecord } =
        await import('@/services/OfflineStorage');

      const id = await saveOfflineRecord({
        service: SERVICE,
        endpoint: '/d',
        method: 'DELETE',
        data: null,
        timestamp: 6,
      });
      expect(await getOfflineRecords()).toHaveLength(1);

      await deleteOfflineRecord(id);
      expect(await getOfflineRecords()).toHaveLength(0);
    });

    it('clearAllOfflineRecords empties the queue', async () => {
      const { saveOfflineRecord, getOfflineRecords, clearAllOfflineRecords } =
        await import('@/services/OfflineStorage');

      await saveOfflineRecord({
        service: SERVICE,
        endpoint: '/1',
        method: 'GET',
        data: null,
        timestamp: 1,
      });
      await saveOfflineRecord({
        service: SERVICE,
        endpoint: '/2',
        method: 'GET',
        data: null,
        timestamp: 2,
      });

      expect(await getOfflineRecords()).toHaveLength(2);
      await clearAllOfflineRecords();
      expect(await getOfflineRecords()).toHaveLength(0);
    });

    it('getOfflineCount returns number of pending records via index.count', async () => {
      const { saveOfflineRecord, getOfflineCount, updateOfflineRecord } =
        await import('@/services/OfflineStorage');

      const idA = await saveOfflineRecord({
        service: SERVICE,
        endpoint: '/a',
        method: 'GET',
        data: null,
        timestamp: 1,
      });
      await saveOfflineRecord({
        service: SERVICE,
        endpoint: '/b',
        method: 'GET',
        data: null,
        timestamp: 2,
      });

      expect(await getOfflineCount()).toBe(2);
      await updateOfflineRecord(idA, { status: 'synced' });
      expect(await getOfflineCount()).toBe(1);
    });
  });

  describe('Cache Entries', () => {
    const service: ServiceName = 'crm';
    const endpoint = '/customers';

    afterEach(() => {
      vi.useRealTimers();
    });

    it('saveCacheEntry + getCacheEntry roundtrip an entry before TTL', async () => {
      const { saveCacheEntry, getCacheEntry } = await import('@/services/OfflineStorage');
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));

      await saveCacheEntry({
        service,
        endpoint,
        data: [{ id: 1, name: 'X' }],
        ttl: 60_000, // 60s
      });

      // 10s later -> still valid (IDs are deterministic via service+endpoint key)
      vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 10));
      const entry = await getCacheEntry(service, endpoint);
      expect(entry).not.toBeNull();
      expect(entry!.service).toBe(service);
      expect(entry!.endpoint).toBe(endpoint);
      expect((entry!.data as any)[0].name).toBe('X');
      expect(entry!.ttl).toBe(60_000);
    });

    it('getCacheEntry returns null when TTL expired', async () => {
      const { saveCacheEntry, getCacheEntry } = await import('@/services/OfflineStorage');
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));

      await saveCacheEntry({
        service,
        endpoint,
        data: 'cached',
        ttl: 1_000, // 1s
      });

      vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 30));
      const expired = await getCacheEntry(service, endpoint);
      expect(expired).toBeNull();
    });

    it('getCacheEntry returns null when never cached', async () => {
      const { getCacheEntry } = await import('@/services/OfflineStorage');
      expect(await getCacheEntry(service, '/nonexistent')).toBeNull();
    });

    it('deleteCacheEntry removes specific cache entry', async () => {
      const { saveCacheEntry, getCacheEntry, deleteCacheEntry } =
        await import('@/services/OfflineStorage');

      await saveCacheEntry({ service, endpoint, data: 'v', ttl: 60_000 });
      expect(await getCacheEntry(service, endpoint)).not.toBeNull();

      await deleteCacheEntry(service, endpoint);
      expect(await getCacheEntry(service, endpoint)).toBeNull();
    });

    it('clearExpiredCache removes entries past TTL but leaves valid ones', async () => {
      const { saveCacheEntry, getCacheEntry, clearExpiredCache } =
        await import('@/services/OfflineStorage');
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));

      await saveCacheEntry({
        service: 'iam' as ServiceName,
        endpoint: '/e1',
        data: 1,
        ttl: 500,
      });
      await saveCacheEntry({
        service: 'iam' as ServiceName,
        endpoint: '/e2',
        data: 2,
        ttl: 5_000,
      });

      vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 1));

      await clearExpiredCache();

      expect(await getCacheEntry('iam' as ServiceName, '/e1')).toBeNull();
      expect(await getCacheEntry('iam' as ServiceName, '/e2')).not.toBeNull();
    });

    it('clearExpiredCache works with empty store', async () => {
      const { clearExpiredCache } = await import('@/services/OfflineStorage');
      await expect(clearExpiredCache()).resolves.not.toThrow();
    });
  });
});
