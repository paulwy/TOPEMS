import { storage } from '../storage';

// AsyncStorage 内存 mock：行为与原生实现一致（getItem/setItem/removeItem/multiRemove）
const memory = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => memory.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      memory.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      memory.delete(k);
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
      for (const k of keys) memory.delete(k);
    }),
  },
}));

describe('storage', () => {
  beforeEach(async () => {
    memory.clear();
    jest.clearAllMocks();
  });

  test('setToken/getToken 往返', async () => {
    await storage.setToken('jwt-token-abc');
    await expect(storage.getToken()).resolves.toBe('jwt-token-abc');
  });

  test('removeToken 后 getToken 返回 null', async () => {
    await storage.setToken('x');
    await storage.removeToken();
    await expect(storage.getToken()).resolves.toBeNull();
  });

  test('refreshToken 独立于 token 存取', async () => {
    await storage.setToken('t1');
    await storage.setRefreshToken('r1');
    await expect(storage.getToken()).resolves.toBe('t1');
    await expect(storage.getRefreshToken()).resolves.toBe('r1');
    await storage.removeRefreshToken();
    await expect(storage.getRefreshToken()).resolves.toBeNull();
    // token 不受 refresh 清理影响
    await expect(storage.getToken()).resolves.toBe('t1');
  });

  test('setUser/getUser JSON 序列化往返', async () => {
    const user = { id: 'u1', name: '测试用户' };
    await storage.setUser(user);
    await expect(storage.getUser<typeof user>()).resolves.toEqual(user);
  });

  test('clearAll 清理 token/user/scanHistory', async () => {
    await storage.setToken('t');
    await storage.setUser({ id: 'u' });
    await storage.setScanHistory(['s1']);
    await storage.clearAll();
    await expect(storage.getToken()).resolves.toBeNull();
    await expect(storage.getUser()).resolves.toBeNull();
    await expect(storage.getScanHistory()).resolves.toBeNull();
  });

  test('setScanHistory/getScanHistory 往返', async () => {
    await storage.setScanHistory(['scan-a', 'scan-b']);
    await expect(storage.getScanHistory<string[]>()).resolves.toEqual(['scan-a', 'scan-b']);
  });

  test('存储损坏时 getUser/getScanHistory 返回 null（容错）', async () => {
    memory.set('topems_user', '{broken-json');
    memory.set('topems_scan_history', '{also-broken');
    await expect(storage.getUser()).resolves.toBeNull();
    await expect(storage.getScanHistory()).resolves.toBeNull();
  });
});
