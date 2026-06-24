import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { session, SessionUser } from '@/utils/session';

vi.mock('@/utils/logger', () => ({
  default: () => ({
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

describe('session utils', () => {
  const mockUser: SessionUser = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
    permissions: ['users:read', 'users:write'],
  };

  let localStorageMock: Record<string, string> = {};

  beforeEach(() => {
    localStorageMock = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => { localStorageMock[key] = value; },
      removeItem: (key: string) => { delete localStorageMock[key]; },
      clear: () => { localStorageMock = {}; },
      length: 0,
      key: (index: number) => Object.keys(localStorageMock)[index] || null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getUser', () => {
    it('should return null when user is not stored', () => {
      expect(session.getUser()).toBeNull();
    });

    it('should return user when stored', () => {
      localStorage.setItem('topems_user', JSON.stringify(mockUser));
      expect(session.getUser()).toEqual(mockUser);
    });

    it('should return null when stored data is invalid JSON', () => {
      localStorage.setItem('topems_user', 'invalid json');
      expect(session.getUser()).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should store user to localStorage', () => {
      session.setUser(mockUser);
      const storedUser = localStorage.getItem('topems_user');
      expect(storedUser).toBe(JSON.stringify(mockUser));
    });

    it('should update last activity when setting user', () => {
      const beforeTime = Date.now();
      session.setUser(mockUser);
      const lastActivity = localStorage.getItem('last_activity');
      expect(lastActivity).toBeDefined();
      const activityTime = parseInt(lastActivity!, 10);
      expect(activityTime).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('removeUser', () => {
    it('should remove user from localStorage', () => {
      localStorage.setItem('topems_user', JSON.stringify(mockUser));
      session.removeUser();
      expect(localStorage.getItem('topems_user')).toBeNull();
    });
  });

  describe('getToken', () => {
    it('should return null when token is not stored', () => {
      expect(session.getToken()).toBeNull();
    });

    it('should return token when stored', () => {
      localStorage.setItem('token', 'test-token-123');
      expect(session.getToken()).toBe('test-token-123');
    });
  });

  describe('setToken', () => {
    it('should store token to localStorage', () => {
      session.setToken('test-token-456');
      expect(localStorage.getItem('token')).toBe('test-token-456');
    });

    it('should update last activity when setting token', () => {
      const beforeTime = Date.now();
      session.setToken('test-token');
      const lastActivity = localStorage.getItem('last_activity');
      expect(lastActivity).toBeDefined();
      const activityTime = parseInt(lastActivity!, 10);
      expect(activityTime).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('removeToken', () => {
    it('should remove token from localStorage', () => {
      localStorage.setItem('token', 'test-token');
      session.removeToken();
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('updateLastActivity', () => {
    it('should update last activity timestamp', () => {
      const beforeTime = Date.now();
      session.updateLastActivity();
      const lastActivity = localStorage.getItem('last_activity');
      expect(lastActivity).toBeDefined();
      const activityTime = parseInt(lastActivity!, 10);
      expect(activityTime).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('getLastActivity', () => {
    it('should return 0 when no activity is stored', () => {
      expect(session.getLastActivity()).toBe(0);
    });

    it('should return stored activity timestamp', () => {
      const testTime = 1234567890;
      localStorage.setItem('last_activity', String(testTime));
      expect(session.getLastActivity()).toBe(testTime);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no token and user', () => {
      expect(session.isAuthenticated()).toBe(false);
    });

    it('should return false when only token exists', () => {
      localStorage.setItem('token', 'test-token');
      expect(session.isAuthenticated()).toBe(false);
    });

    it('should return false when only user exists', () => {
      localStorage.setItem('topems_user', JSON.stringify(mockUser));
      expect(session.isAuthenticated()).toBe(false);
    });

    it('should return true when both token and user exist', () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('topems_user', JSON.stringify(mockUser));
      expect(session.isAuthenticated()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all session data', () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('topems_user', JSON.stringify(mockUser));
      localStorage.setItem('last_activity', '1234567890');

      session.clear();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('topems_user')).toBeNull();
      expect(localStorage.getItem('last_activity')).toBeNull();
    });
  });

  describe('validate', () => {
    it('should return false when not authenticated', async () => {
      const result = await session.validate();
      expect(result).toBe(false);
    });

    it('should return true when authenticated', async () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('topems_user', JSON.stringify(mockUser));

      const result = await session.validate();
      expect(result).toBe(true);
    });

    it('should update last activity when validating', async () => {
      const beforeTime = Date.now();
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('topems_user', JSON.stringify(mockUser));

      await session.validate();

      const lastActivity = localStorage.getItem('last_activity');
      expect(lastActivity).toBeDefined();
      const activityTime = parseInt(lastActivity!, 10);
      expect(activityTime).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('hasPermission', () => {
    it('should return false when no user', () => {
      expect(session.hasPermission('users:read')).toBe(false);
    });

    it('should return true when user has permission', () => {
      localStorage.setItem('topems_user', JSON.stringify(mockUser));
      expect(session.hasPermission('users:read')).toBe(true);
    });

    it('should return false when user does not have permission', () => {
      localStorage.setItem('topems_user', JSON.stringify(mockUser));
      expect(session.hasPermission('users:delete')).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return false when no user', () => {
      expect(session.hasAnyPermission(['users:read', 'users:write'])).toBe(false);
    });

    it('should return true when user has any of the permissions', () => {
      localStorage.setItem('topems_user', JSON.stringify(mockUser));
      expect(session.hasAnyPermission(['users:read', 'users:delete'])).toBe(true);
    });

    it('should return false when user has none of the permissions', () => {
      localStorage.setItem('topems_user', JSON.stringify(mockUser));
      expect(session.hasAnyPermission(['users:delete', 'users:create'])).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return false when no user', () => {
      expect(session.hasRole('admin')).toBe(false);
    });

    it('should return true when user has matching role', () => {
      localStorage.setItem('topems_user', JSON.stringify(mockUser));
      expect(session.hasRole('admin')).toBe(true);
    });

    it('should return false when user does not have matching role', () => {
      localStorage.setItem('topems_user', JSON.stringify(mockUser));
      expect(session.hasRole('user')).toBe(false);
    });
  });
});
