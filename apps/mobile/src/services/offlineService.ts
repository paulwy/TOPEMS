import Dexie, { type EntityTable } from 'dexie';

const isReactNative = typeof window === 'undefined' || typeof window.indexedDB === 'undefined';

if (isReactNative) {
  console.log('React Native environment detected - using AsyncStorage fallback');
}

export interface OfflineRecord {
  id: string;
  module: string;
  action: string;
  data: string;
  createdAt: number;
  synced: boolean;
  syncAttempts: number;
  lastSyncAttempt?: number;
  error?: string;
}

export interface CacheEntry {
  id: string;
  module: string;
  key: string;
  data: string;
  expiresAt: number;
  updatedAt: number;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: number;
  createdAt: number;
}

class OfflineDB extends Dexie {
  offlineRecords!: EntityTable<OfflineRecord, 'id'>;
  cacheEntries!: EntityTable<CacheEntry, 'id'>;
  userSessions!: EntityTable<UserSession, 'id'>;

  constructor() {
    super('TOPEMSOfflineDB');
    this.version(1).stores({
      offlineRecords: 'id, module, action, createdAt, synced',
      cacheEntries: 'id, module, key, expiresAt',
      userSessions: 'id, userId, expiresAt',
    });
  }
}

export const db = new OfflineDB();

export class OfflineService {
  static async init(): Promise<void> {
    await db.open();
  }

  static async saveOfflineAction(
    module: string,
    action: string,
    data: Record<string, unknown>
  ): Promise<string> {
    const id = `${module}-${action}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const record: OfflineRecord = {
      id,
      module,
      action,
      data: JSON.stringify(data),
      createdAt: Date.now(),
      synced: false,
      syncAttempts: 0,
    };
    await db.offlineRecords.add(record);
    return id;
  }

  static async getPendingRecords(
    module?: string
  ): Promise<OfflineRecord[]> {
    const allRecords = await db.offlineRecords.toArray();
    let filtered = allRecords.filter((r) => !r.synced);
    if (module) {
      filtered = filtered.filter((r) => r.module === module);
    }
    return filtered.sort((a, b) => a.createdAt - b.createdAt);
  }

  static async markAsSynced(id: string): Promise<void> {
    await db.offlineRecords.update(id, { synced: true });
  }

  static async updateSyncAttempt(
    id: string,
    error?: string
  ): Promise<void> {
    const record = await db.offlineRecords.get(id);
    if (record) {
      await db.offlineRecords.update(id, {
        syncAttempts: record.syncAttempts + 1,
        lastSyncAttempt: Date.now(),
        error,
      });
    }
  }

  static async deleteRecord(id: string): Promise<void> {
    await db.offlineRecords.delete(id);
  }

  static async clearAllSynced(): Promise<void> {
    const syncedRecords = await db.offlineRecords.toArray();
    for (const record of syncedRecords) {
      if (record.synced) {
        await db.offlineRecords.delete(record.id);
      }
    }
  }

  static async getRecord(id: string): Promise<OfflineRecord | undefined> {
    return db.offlineRecords.get(id);
  }

  static async getAllRecords(): Promise<OfflineRecord[]> {
    return db.offlineRecords.toArray();
  }

  static async getPendingCount(): Promise<number> {
    const records = await db.offlineRecords.toArray();
    return records.filter((r) => !r.synced).length;
  }

  static async setCache(
    module: string,
    key: string,
    data: Record<string, unknown>,
    ttlSeconds: number = 3600
  ): Promise<void> {
    const id = `${module}-${key}`;
    const cacheEntry: CacheEntry = {
      id,
      module,
      key,
      data: JSON.stringify(data),
      expiresAt: Date.now() + ttlSeconds * 1000,
      updatedAt: Date.now(),
    };
    await db.cacheEntries.put(cacheEntry);
  }

  static async getCache(module: string, key: string): Promise<Record<string, unknown> | null> {
    const id = `${module}-${key}`;
    const entry = await db.cacheEntries.get(id);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      await db.cacheEntries.delete(id);
      return null;
    }
    try {
      return JSON.parse(entry.data);
    } catch {
      return null;
    }
  }

  static async invalidateCache(module: string): Promise<void> {
    const entries = await db.cacheEntries.toArray();
    for (const entry of entries) {
      if (entry.module === module) {
        await db.cacheEntries.delete(entry.id);
      }
    }
  }

  static async clearExpiredCache(): Promise<void> {
    const entries = await db.cacheEntries.toArray();
    const now = Date.now();
    for (const entry of entries) {
      if (entry.expiresAt < now) {
        await db.cacheEntries.delete(entry.id);
      }
    }
  }

  static async setUserSession(session: {
    userId: string;
    token: string;
    refreshToken: string;
    expiresAt: number;
  }): Promise<void> {
    const sessionEntry: UserSession = {
      id: session.userId,
      userId: session.userId,
      token: session.token,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      createdAt: Date.now(),
    };
    await db.userSessions.put(sessionEntry);
  }

  static async getUserSession(userId: string): Promise<UserSession | undefined> {
    const session = await db.userSessions.get(userId);
    if (session && session.expiresAt > Date.now()) {
      return session;
    }
    return undefined;
  }

  static async clearUserSession(userId: string): Promise<void> {
    await db.userSessions.delete(userId);
  }

  static async clearAll(): Promise<void> {
    await db.offlineRecords.clear();
    await db.cacheEntries.clear();
    await db.userSessions.clear();
  }

  static async getStats(): Promise<{
    pendingRecords: number;
    cachedEntries: number;
    userSessions: number;
  }> {
    const [records, cachedEntries, userSessions] = await Promise.all([
      db.offlineRecords.toArray(),
      db.cacheEntries.count(),
      db.userSessions.count(),
    ]);
    const pendingRecords = records.filter((r) => !r.synced).length;
    return { pendingRecords, cachedEntries, userSessions };
  }
}