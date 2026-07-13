import 'fake-indexeddb/auto';
import { OfflineService, db } from '../offlineService';

describe('OfflineService', () => {
  beforeAll(async () => {
    await OfflineService.init();
  });

  afterEach(async () => {
    await db.offlineRecords.clear();
    await db.cacheEntries.clear();
    await db.userSessions.clear();
  });

  test('saveOfflineAction should save record', async () => {
    const id = await OfflineService.saveOfflineAction('attendance', 'create', {
      userId: 'test-user',
      checkInTime: Date.now(),
    });

    expect(id).toBeDefined();
    expect(id).toContain('attendance-create');

    const record = await OfflineService.getRecord(id);
    expect(record).toBeDefined();
    expect(record?.module).toBe('attendance');
    expect(record?.action).toBe('create');
    expect(record?.synced).toBe(false);
  });

  test('getPendingRecords should return unsynced records', async () => {
    await OfflineService.saveOfflineAction('task', 'create', { title: 'Test Task' });
    await OfflineService.saveOfflineAction('approval', 'create', { title: 'Test Approval' });

    const records = await OfflineService.getPendingRecords();
    expect(records.length).toBe(2);
    expect(records.every((r) => !r.synced)).toBe(true);
  });

  test('getPendingRecords should filter by module', async () => {
    await OfflineService.saveOfflineAction('task', 'create', { title: 'Task 1' });
    await OfflineService.saveOfflineAction('task', 'update', { title: 'Task 2' });
    await OfflineService.saveOfflineAction('attendance', 'create', { checkIn: Date.now() });

    const taskRecords = await OfflineService.getPendingRecords('task');
    expect(taskRecords.length).toBe(2);
    expect(taskRecords.every((r) => r.module === 'task')).toBe(true);
  });

  test('markAsSynced should update record status', async () => {
    const id = await OfflineService.saveOfflineAction('task', 'create', { title: 'Test' });

    await OfflineService.markAsSynced(id);
    const record = await OfflineService.getRecord(id);

    expect(record?.synced).toBe(true);
  });

  test('getPendingCount should return correct count', async () => {
    await OfflineService.saveOfflineAction('task', 'create', { title: 'Task 1' });
    await OfflineService.saveOfflineAction('task', 'create', { title: 'Task 2' });

    const count = await OfflineService.getPendingCount();
    expect(count).toBe(2);
  });

  test('setCache and getCache should work', async () => {
    const testData = { key: 'value', count: 10 };

    await OfflineService.setCache('task', 'list', testData, 3600);
    const cached = await OfflineService.getCache('task', 'list');

    expect(cached).toEqual(testData);
  });

  test('getCache should return null for expired cache', async () => {
    await OfflineService.setCache('task', 'expired', { data: 'test' }, -1);

    const cached = await OfflineService.getCache('task', 'expired');
    expect(cached).toBe(null);
  });

  test('setUserSession and getUserSession should work', async () => {
    const session = {
      userId: 'user-123',
      token: 'token-abc',
      refreshToken: 'refresh-xyz',
      expiresAt: Date.now() + 3600000,
    };

    await OfflineService.setUserSession(session);
    const retrieved = await OfflineService.getUserSession('user-123');

    expect(retrieved?.userId).toBe('user-123');
    expect(retrieved?.token).toBe('token-abc');
  });

  test('getUserSession should return undefined for expired session', async () => {
    const session = {
      userId: 'user-expired',
      token: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() - 1000,
    };

    await OfflineService.setUserSession(session);
    const retrieved = await OfflineService.getUserSession('user-expired');

    expect(retrieved).toBeUndefined();
  });

  test('getStats should return correct statistics', async () => {
    await OfflineService.saveOfflineAction('task', 'create', { title: 'Task' });
    await OfflineService.setCache('task', 'list', {}, 3600);
    await OfflineService.setUserSession({
      userId: 'user-1',
      token: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 3600000,
    });

    const stats = await OfflineService.getStats();
    expect(stats.pendingRecords).toBe(1);
    expect(stats.cachedEntries).toBe(1);
    expect(stats.userSessions).toBe(1);
  });

  test('clearAll should clear all data', async () => {
    await OfflineService.saveOfflineAction('task', 'create', { title: 'Task' });
    await OfflineService.setCache('task', 'list', {}, 3600);
    await OfflineService.setUserSession({
      userId: 'user-1',
      token: 'token',
      refreshToken: 'refresh',
      expiresAt: Date.now() + 3600000,
    });

    await OfflineService.clearAll();

    const stats = await OfflineService.getStats();
    expect(stats.pendingRecords).toBe(0);
    expect(stats.cachedEntries).toBe(0);
    expect(stats.userSessions).toBe(0);
  });
});