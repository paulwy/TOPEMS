import type { ServiceName } from '@/lib/apiClient';

export interface OfflineRecord {
  id: string;
  service: ServiceName;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data: unknown;
  timestamp: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  error?: string;
}

export interface CacheEntry {
  id: string;
  service: ServiceName;
  endpoint: string;
  data: unknown;
  timestamp: number;
  ttl: number;
}

const DB_NAME = 'TOPEMSOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offlineRecords';
const CACHE_STORE_NAME = 'cacheEntries';

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const offlineStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        offlineStore.createIndex('status', 'status', { unique: false });
        offlineStore.createIndex('service', 'service', { unique: false });
        offlineStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        const cacheStore = db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'id' });
        cacheStore.createIndex('service', 'service', { unique: false });
        cacheStore.createIndex('endpoint', 'endpoint', { unique: false });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

export async function saveOfflineRecord(
  record: Omit<OfflineRecord, 'id' | 'status' | 'retryCount'>
): Promise<string> {
  const db = await getDB();
  const id = `${record.service}_${record.endpoint}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const fullRecord: OfflineRecord = {
      ...record,
      id,
      status: 'pending',
      retryCount: 0,
    };

    const request = store.add(fullRecord);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineRecords(
  status?: OfflineRecord['status']
): Promise<OfflineRecord[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    let request: IDBRequest;

    if (status) {
      const index = store.index('status');
      request = index.getAll(status);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function updateOfflineRecord(
  id: string,
  updates: Partial<OfflineRecord>
): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (!record) {
        reject(new Error('Record not found'));
        return;
      }

      const updatedRecord = { ...record, ...updates };
      const putRequest = store.put(updatedRecord);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function deleteOfflineRecord(id: string): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllOfflineRecords(): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveCacheEntry(entry: Omit<CacheEntry, 'id' | 'timestamp'>): Promise<void> {
  const db = await getDB();
  const id = `${entry.service}_${entry.endpoint}`;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE_NAME);

    const fullEntry: CacheEntry = {
      ...entry,
      id,
      timestamp: Date.now(),
    };

    const request = store.put(fullEntry);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCacheEntry(
  service: ServiceName,
  endpoint: string
): Promise<CacheEntry | null> {
  const db = await getDB();
  const id = `${service}_${endpoint}`;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE_NAME], 'readonly');
    const store = transaction.objectStore(CACHE_STORE_NAME);

    const request = store.get(id);

    request.onsuccess = () => {
      const entry = request.result;
      if (!entry) {
        resolve(null);
        return;
      }

      if (Date.now() - entry.timestamp > entry.ttl) {
        resolve(null);
        return;
      }

      resolve(entry);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function deleteCacheEntry(service: ServiceName, endpoint: string): Promise<void> {
  const db = await getDB();
  const id = `${service}_${endpoint}`;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE_NAME);

    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearExpiredCache(): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE_NAME);

    const request = store.getAll();

    request.onsuccess = () => {
      const entries = request.result;
      let completed = 0;

      entries.forEach((entry) => {
        if (Date.now() - entry.timestamp > entry.ttl) {
          store.delete(entry.id);
        }
        completed++;

        if (completed === entries.length) {
          resolve();
        }
      });

      if (entries.length === 0) {
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export function getOfflineCount(): Promise<number> {
  return new Promise((resolve) => {
    getDB()
      .then((db) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('status');
        const request = index.count('pending');

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      })
      .catch(() => resolve(0));
  });
}
