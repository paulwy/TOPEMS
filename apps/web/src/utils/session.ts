import createLogger from './logger';

const logger = createLogger('Session');

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

const STORAGE_KEYS = {
  USER: 'topems_user',
  TOKEN: 'token',
  LAST_ACTIVITY: 'last_activity',
};

export const session = {
  getUser(): SessionUser | null {
    try {
      const userStr = localStorage.getItem(STORAGE_KEYS.USER);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error: unknown) {
      logger.error('Failed to parse user from storage:', error);
      return null;
    }
  },

  setUser(user: SessionUser): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      this.updateLastActivity();
    } catch (error: unknown) {
      logger.error('Failed to save user to storage:', error);
    }
  },

  removeUser(): void {
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  },

  setToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    this.updateLastActivity();
  },

  removeToken(): void {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  },

  updateLastActivity(): void {
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, String(Date.now()));
  },

  getLastActivity(): number {
    const lastActivity = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
    return lastActivity ? parseInt(lastActivity, 10) : 0;
  },

  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    return !!token && !!user;
  },

  clear(): void {
    this.removeUser();
    this.removeToken();
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
    logger.info('Session cleared');
  },

  async validate(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    // 暂时不做 API 验证，直接返回 true
    this.updateLastActivity();
    return true;
  },

  hasPermission(permission: string): boolean {
    const user = this.getUser();
    if (!user) return false;
    return user.permissions.includes(permission);
  },

  hasAnyPermission(permissions: string[]): boolean {
    const user = this.getUser();
    if (!user) return false;
    return permissions.some((p) => user.permissions.includes(p));
  },

  hasRole(role: string): boolean {
    const user = this.getUser();
    if (!user) return false;
    return user.role === role;
  },
};

export default session;
