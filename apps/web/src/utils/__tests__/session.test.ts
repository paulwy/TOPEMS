import { describe, it, expect, vi, beforeEach } from 'vitest';
import { session } from '../session';

describe('session', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getUser / setUser', () => {
    it('should return null when no user stored', () => {
      expect(session.getUser()).toBeNull();
    });

    it('should store and retrieve user', () => {
      const user = {
        id: 'u1',
        username: 'admin',
        email: 'admin@test.com',
        name: 'Admin',
        role: 'admin',
        permissions: ['read', 'write'],
      };
      session.setUser(user);
      expect(session.getUser()).toEqual(user);
    });

    it('should handle corrupted data gracefully', () => {
      localStorage.setItem('topems_user', 'invalid-json');
      expect(session.getUser()).toBeNull();
    });
  });

  describe('removeUser', () => {
    it('should remove stored user', () => {
      session.setUser({
        id: 'u1',
        username: 'admin',
        email: 'a@b.com',
        name: 'Admin',
        role: 'admin',
        permissions: [],
      });
      session.removeUser();
      expect(session.getUser()).toBeNull();
    });
  });

  describe('getToken / setToken', () => {
    it('should return null when no token stored', () => {
      expect(session.getToken()).toBeNull();
    });

    it('should store and retrieve token', () => {
      session.setToken('my-jwt-token');
      expect(session.getToken()).toBe('my-jwt-token');
    });
  });

  describe('removeToken', () => {
    it('should remove stored token', () => {
      session.setToken('my-token');
      session.removeToken();
      expect(session.getToken()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no token or user', () => {
      expect(session.isAuthenticated()).toBe(false);
    });

    it('should return false when only token exists', () => {
      session.setToken('token');
      expect(session.isAuthenticated()).toBe(false);
    });

    it('should return false when only user exists', () => {
      session.setUser({
        id: 'u1',
        username: 'admin',
        email: 'a@b.com',
        name: 'Admin',
        role: 'admin',
        permissions: [],
      });
      expect(session.isAuthenticated()).toBe(false);
    });

    it('should return true when both token and user exist', () => {
      session.setToken('token');
      session.setUser({
        id: 'u1',
        username: 'admin',
        email: 'a@b.com',
        name: 'Admin',
        role: 'admin',
        permissions: [],
      });
      expect(session.isAuthenticated()).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('should return false when no user', () => {
      expect(session.hasPermission('read')).toBe(false);
    });

    it('should return true when user has permission', () => {
      session.setUser({
        id: 'u1',
        username: 'admin',
        email: 'a@b.com',
        name: 'Admin',
        role: 'admin',
        permissions: ['read', 'write'],
      });
      expect(session.hasPermission('read')).toBe(true);
    });

    it('should return false when user lacks permission', () => {
      session.setUser({
        id: 'u1',
        username: 'admin',
        email: 'a@b.com',
        name: 'Admin',
        role: 'admin',
        permissions: ['read'],
      });
      expect(session.hasPermission('delete')).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return false when no user', () => {
      expect(session.hasAnyPermission(['read', 'write'])).toBe(false);
    });

    it('should return true when user has at least one permission', () => {
      session.setUser({
        id: 'u1',
        username: 'admin',
        email: 'a@b.com',
        name: 'Admin',
        role: 'admin',
        permissions: ['read'],
      });
      expect(session.hasAnyPermission(['read', 'write'])).toBe(true);
    });

    it('should return false when user has none of the permissions', () => {
      session.setUser({
        id: 'u1',
        username: 'admin',
        email: 'a@b.com',
        name: 'Admin',
        role: 'admin',
        permissions: ['read'],
      });
      expect(session.hasAnyPermission(['write', 'delete'])).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return false when no user', () => {
      expect(session.hasRole('admin')).toBe(false);
    });

    it('should return true when role matches', () => {
      session.setUser({
        id: 'u1',
        username: 'admin',
        email: 'a@b.com',
        name: 'Admin',
        role: 'admin',
        permissions: [],
      });
      expect(session.hasRole('admin')).toBe(true);
    });

    it('should return false when role does not match', () => {
      session.setUser({
        id: 'u1',
        username: 'user',
        email: 'a@b.com',
        name: 'User',
        role: 'user',
        permissions: [],
      });
      expect(session.hasRole('admin')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all session data', () => {
      session.setToken('token');
      session.setUser({
        id: 'u1',
        username: 'admin',
        email: 'a@b.com',
        name: 'Admin',
        role: 'admin',
        permissions: [],
      });
      session.clear();
      expect(session.getToken()).toBeNull();
      expect(session.getUser()).toBeNull();
      expect(session.isAuthenticated()).toBe(false);
    });
  });

  describe('validate', () => {
    it('should return false when not authenticated', async () => {
      const result = await session.validate();
      expect(result).toBe(false);
    });

    it('should return true when authenticated', async () => {
      session.setToken('token');
      session.setUser({
        id: 'u1',
        username: 'admin',
        email: 'a@b.com',
        name: 'Admin',
        role: 'admin',
        permissions: [],
      });
      const result = await session.validate();
      expect(result).toBe(true);
    });
  });

  describe('updateLastActivity / getLastActivity', () => {
    it('should return 0 when no activity recorded', () => {
      expect(session.getLastActivity()).toBe(0);
    });

    it('should record and retrieve last activity', () => {
      session.updateLastActivity();
      const activity = session.getLastActivity();
      expect(activity).toBeGreaterThan(0);
      expect(activity).toBeLessThanOrEqual(Date.now());
    });
  });
});
