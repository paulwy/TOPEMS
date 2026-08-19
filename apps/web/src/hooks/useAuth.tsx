import type { ReactNode } from 'react';
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  createContext,
  useContext,
} from 'react';
import i18n from '@/i18n';
import { authApi } from '@/api/iam';
import { tenantApi } from '@/api/tenant';
import apiClient, { type ApiResponse } from '../api/client';
import { tauriAuth } from '@/services/tauriAuth';
import type { User } from '@topems/shared-types';
import { mapApiUserToUser } from '@topems/shared-types';
import { authLogger } from '@/utils/logger';
import { AUTH_PATHS } from '@/routes/auth';

// Re-export User type for backward compatibility
export type { User } from '@topems/shared-types';

// 会话配置常量
const SESSION = {
  SESSION_CHECK_INTERVAL: 5 * 60 * 1000, // 5分钟
  TOKEN_REFRESH_INTERVAL: 10 * 60 * 1000, // 10分钟
};

const REFRESH_INTERVAL = {
  MINUTE_5: 5 * 60 * 1000, // 5分钟
};

// 默认 token 过期时间（24小时，毫秒）- 当无法解析 JWT 时使用
const DEFAULT_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

// 从 JWT token payload 解析过期时间戳（毫秒）
// 这确保前端与后端的 token 过期时间保持一致
const parseTokenExpiryFromJWT = (token: string): number => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && typeof payload.exp === 'number') {
      // JWT 的 exp 是 Unix 时间戳（秒），转为毫秒
      return payload.exp * 1000;
    }
  } catch (e: unknown) {
    authLogger.warn('Failed to parse token expiry from JWT:', e);
  }
  // 解析失败时返回默认过期时间
  return Date.now() + DEFAULT_TOKEN_EXPIRY_MS;
};

// AuthState uses User from shared-types but adds React-specific fields
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  roles: string[];
  permissions: string[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

const AuthContext = createContext<
  | (AuthState & {
      login: (credentials: LoginCredentials) => Promise<ApiResponse>;
      logout: () => void;
      hasPermission: (permission: string) => boolean;
      hasRole: (role: string) => boolean;
      hasAnyPermission: (permissions: string[]) => boolean;
      hasAllPermissions: (permissions: string[]) => boolean;
      refreshPermissions: () => Promise<void>;
      refreshToken: () => Promise<boolean>;
      isSessionExpiringSoon: () => boolean;
      getTimeUntilExpiry: () => number;
      switchTenant: (tenantId: string) => Promise<boolean>;
      getMyTenants: () => Promise<Record<string, unknown>[]>;
    })
  | null
>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    roles: [],
    permissions: [],
  });

  // Token 过期时间戳（毫秒）
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Use refs to hold latest state values for stable callbacks
  const stateRef = useRef(state);
  const tokenExpiryRef = useRef(tokenExpiry);
  const lastActivityRef = useRef(lastActivity);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    tokenExpiryRef.current = tokenExpiry;
  }, [tokenExpiry]);

  useEffect(() => {
    lastActivityRef.current = lastActivity;
  }, [lastActivity]);

  // 会话即将过期检查（5分钟内）
  const isSessionExpiringSoon = useCallback(() => {
    if (!tokenExpiryRef.current) return false;
    const now = Date.now();
    const timeUntilExpiry = tokenExpiryRef.current - now;
    // 使用会话配置常量
    return timeUntilExpiry > 0 && timeUntilExpiry < SESSION.SESSION_CHECK_INTERVAL;
  }, []);

  // 获取距离过期的剩余时间（秒）
  const getTimeUntilExpiry = useCallback(() => {
    if (!tokenExpiryRef.current) return 0;
    const now = Date.now();
    const timeUntilExpiry = tokenExpiryRef.current - now;
    return Math.max(0, Math.floor(timeUntilExpiry / 1000));
  }, []);

  // 更新最后活动时间
  const updateLastActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // 用户活动监听器 - 检测鼠标、键盘、点击等活动
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      updateLastActivity();
    };

    // 使用节流来避免过于频繁的更新
    let throttleTimer: NodeJS.Timeout | null = null;
    const throttledHandler = () => {
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          handleActivity();
          throttleTimer = null;
        }, SESSION.TOKEN_REFRESH_INTERVAL); // 使用会话刷新间隔常量
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, throttledHandler, { passive: true });
    });

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, throttledHandler);
      });
      if (throttleTimer) {
        clearTimeout(throttleTimer);
      }
    };
  }, [state.isAuthenticated, updateLastActivity]);

  const refreshToken = useCallback(async () => {
    if (tauriAuth.isAvailable()) {
      const isValid = await tauriAuth.isTokenValid();
      if (!isValid) {
        authLogger.warn('Token invalid according to Tauri backend, forcing logout');
        logout();
        return false;
      }
    }

    const refreshTokenValue = localStorage.getItem('refresh_token');
    if (!refreshTokenValue) {
      return false;
    }

    try {
      const response = await authApi.refreshToken(refreshTokenValue);
      if (response.success && response.data) {
        const { access_token: accessToken } = response.data;
        localStorage.setItem('token', accessToken);
        apiClient.setAuthToken(accessToken);

        tauriAuth.setToken(accessToken);

        const newExpiry = parseTokenExpiryFromJWT(accessToken);
        setTokenExpiry(newExpiry);
        localStorage.setItem('token_expiry', newExpiry.toString());

        tauriAuth.setTokenExpiry(newExpiry);
        tauriAuth.broadcastTokenChange(accessToken);

        setState((prev) => ({ ...prev, token: accessToken }));
        return true;
      }
    } catch (error: unknown) {
      authLogger.error('Token refresh failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('roles');
      localStorage.removeItem('permissions');
      localStorage.removeItem('token_expiry');
      tauriAuth.clearToken();
      tauriAuth.clearUserInfo();
      tauriAuth.clearTokenExpiry();
      tauriAuth.broadcastTokenChange(null);
      window.location.href = AUTH_PATHS.login;
      return false;
    }
    return false;
  }, []);

  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;

    const initAuth = async () => {
      let token = localStorage.getItem('token');
      let userStr = localStorage.getItem('user');
      let rolesStr = localStorage.getItem('roles');
      let permissionsStr = localStorage.getItem('permissions');

      // If no token in localStorage, try Tauri backend (desktop app persistence)
      if (!token && tauriAuth.isAvailable()) {
        const tauriToken = await tauriAuth.getToken();
        if (tauriToken) {
          authLogger.info('Restoring token from Tauri backend storage');
          token = tauriToken;
          localStorage.setItem('token', token);

          const userInfo = await tauriAuth.getUserInfo();
          if (userInfo) {
            localStorage.setItem('user', JSON.stringify(userInfo.user));
            localStorage.setItem('roles', JSON.stringify(userInfo.roles));
            localStorage.setItem('permissions', JSON.stringify(userInfo.permissions));
            userStr = localStorage.getItem('user');
            rolesStr = localStorage.getItem('roles');
            permissionsStr = localStorage.getItem('permissions');
          }

          const tauriExpiry = await tauriAuth.getTokenExpiry();
          if (tauriExpiry) {
            localStorage.setItem('token_expiry', tauriExpiry.toString());
          }
        }
      }

      if (token) {
        // Sync token and expiry to Tauri backend FIRST before validity check
        if (tauriAuth.isAvailable()) {
          const tokenExpiry = parseTokenExpiryFromJWT(token);
          await tauriAuth.setToken(token);
          await tauriAuth.setTokenExpiry(tokenExpiry);
        }

        let tokenExpired = false;

        if (tauriAuth.isAvailable()) {
          const valid = await tauriAuth.isTokenValid();
          if (!valid) {
            tokenExpired = true;
          }
        }

        if (!tokenExpired) {
          const storedExpiry = localStorage.getItem('token_expiry');
          if (storedExpiry) {
            const expiryTs = parseInt(storedExpiry, 10);
            if (!isNaN(expiryTs) && Date.now() > expiryTs) {
              tokenExpired = true;
            }
          } else {
            const expiryFromJWT = parseTokenExpiryFromJWT(token);
            if (Date.now() > expiryFromJWT) {
              tokenExpired = true;
            }
          }
        }

        if (tokenExpired) {
          authLogger.warn('Token expired on startup, forcing logout');
          logout();
          return;
        }
      }

      if (token && userStr) {
        try {
          const rawUser = JSON.parse(userStr);
          // Transform user to unified format (handles both old snake_case and new format)
          const user = mapApiUserToUser(rawUser);
          const roles = rolesStr ? JSON.parse(rolesStr) : [];
          const permissions = permissionsStr ? JSON.parse(permissionsStr) : [];

          // 优先使用 token 本身的过期时间，其次使用存储的过期时间
          const tokenExpiry = parseTokenExpiryFromJWT(token);
          setTokenExpiry(tokenExpiry);
          localStorage.setItem('token_expiry', tokenExpiry.toString());

          apiClient.setAuthToken(token);

          setState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            roles,
            permissions,
          });

          // Sync auth state to Tauri backend storage on startup
          tauriAuth.setToken(token);
          tauriAuth.setUserInfo(user, roles, permissions);
          tauriAuth.setTokenExpiry(tokenExpiry);

          // 使用刷新间隔常量刷新 token
          refreshInterval = setInterval(
            async () => {
              authLogger.info('Attempting to refresh token...');
              await refreshToken();
            },
            REFRESH_INTERVAL.MINUTE_5 // 5分钟刷新一次
          );
        } catch (error: unknown) {
          authLogger.error('Failed to initialize auth:', error);
          logout();
        }
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshToken]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const response = await authApi.login(credentials);

      if (response.success && response.data) {
        const { access_token: accessToken, refresh_token: refreshTokenValue, user } = response.data;
        // Transform user to unified format (camelCase + snake_case compatibility)
        const mappedUser = mapApiUserToUser(user);

        localStorage.setItem('token', accessToken);
        if (refreshTokenValue) {
          localStorage.setItem('refresh_token', refreshTokenValue);
        }
        localStorage.setItem('user', JSON.stringify(mappedUser));

        apiClient.setAuthToken(accessToken);

        // Sync token to Tauri backend storage (desktop app)
        tauriAuth.setToken(accessToken);

        // 从 JWT token 解析过期时间（与后端配置保持一致）
        const expiry = parseTokenExpiryFromJWT(accessToken);
        setTokenExpiry(expiry);
        localStorage.setItem('token_expiry', expiry.toString());

        const roles = mappedUser.roles || [];
        const permissions = mappedUser.permissions || [];

        if (roles.length > 0) {
          localStorage.setItem('roles', JSON.stringify(roles));
        }
        if (permissions.length > 0) {
          localStorage.setItem('permissions', JSON.stringify(permissions));
        }

        tauriAuth.setUserInfo(mappedUser, roles, permissions);
        tauriAuth.setTokenExpiry(expiry);
        tauriAuth.broadcastTokenChange(accessToken);

        setState({
          user: mappedUser,
          token: accessToken,
          isAuthenticated: true,
          isLoading: false,
          roles,
          permissions,
        });
      }

      return response;
    } catch (error: unknown) {
      authLogger.error('Login error:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      authLogger.warn('Logout API call failed, continuing with local cleanup', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('roles');
      localStorage.removeItem('permissions');
      localStorage.removeItem('token_expiry');

      // Clear token from Tauri backend storage (desktop app)
      tauriAuth.clearToken();
      tauriAuth.clearUserInfo();
      tauriAuth.clearTokenExpiry();
      tauriAuth.broadcastTokenChange(null);

      setTokenExpiry(null);

      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        roles: [],
        permissions: [],
      });
    }
  }, []);

  // Listen for unauthorized events from API client to sync React state with localStorage
  useEffect(() => {
    const handleUnauthorized = () => {
      const tokenAtEventTime = localStorage.getItem('token');
      const userAtEventTime = localStorage.getItem('user');

      authLogger.warn(i18n.t('shared.use_auth.4_0'), {
        hasTokenAtEventTime: !!tokenAtEventTime,
        hasUserAtEventTime: !!userAtEventTime,
        currentPath: window.location.pathname,
        callingLogout: true,
        timestamp: new Date().toISOString(),
      });

      logout();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  // hasPermission moved below to read from localStorage directly

  const hasRole = useCallback((role: string) => {
    const { roles, user } = stateRef.current;
    if (user?.is_superuser) return true;
    return roles.includes(role);
  }, []);

  const hasAnyPermission = useCallback((perms: string[]) => {
    // 直接从 localStorage 读取权限，确保获取最新数据
    const userStr = localStorage.getItem('user');
    const permissionsStr = localStorage.getItem('permissions');

    let user = null;
    let permissions: string[] = [];

    try {
      if (userStr) {
        user = JSON.parse(userStr);
      }
      if (permissionsStr) {
        permissions = JSON.parse(permissionsStr);
      }
    } catch (e: unknown) {
      authLogger.error('Failed to parse auth data from localStorage:', e);
    }

    // 超级用户拥有所有权限
    if (user?.is_superuser) return true;

    // 检查是否有任意一个要求的权限
    return perms.some((perm) => permissions.includes(perm));
  }, []);

  const hasAllPermissions = useCallback((perms: string[]) => {
    // 直接从 localStorage 读取权限
    const userStr = localStorage.getItem('user');
    const permissionsStr = localStorage.getItem('permissions');

    let user = null;
    let permissions: string[] = [];

    try {
      if (userStr) {
        user = JSON.parse(userStr);
      }
      if (permissionsStr) {
        permissions = JSON.parse(permissionsStr);
      }
    } catch (e: unknown) {
      authLogger.error('Failed to parse auth data from localStorage:', e);
    }

    // 超级用户拥有所有权限
    if (user?.is_superuser) return true;

    // 检查是否拥有所有要求的权限
    return perms.every((perm) => permissions.includes(perm));
  }, []);

  const hasPermission = useCallback((permission: string) => {
    // 直接从 localStorage 读取权限
    const userStr = localStorage.getItem('user');
    const permissionsStr = localStorage.getItem('permissions');

    let user = null;
    let permissions: string[] = [];

    try {
      if (userStr) {
        user = JSON.parse(userStr);
      }
      if (permissionsStr) {
        permissions = JSON.parse(permissionsStr);
      }
    } catch (e: unknown) {
      authLogger.error('Failed to parse auth data from localStorage:', e);
    }

    // 超级用户拥有所有权限
    if (user?.is_superuser) return true;

    return permissions.includes(permission);
  }, []);

  const refreshPermissions = useCallback(async () => {
    try {
      const response = await authApi.getMyPermissions();
      if (response.success && response.data) {
        const { roles, permissions } = response.data;

        localStorage.setItem('roles', JSON.stringify(roles.map((r) => r.id)));
        localStorage.setItem('permissions', JSON.stringify(permissions.map((p) => p.id)));

        setState((prev) => ({
          ...prev,
          roles: roles.map((r) => r.id),
          permissions: permissions.map((p) => p.id),
        }));
      }
    } catch (error: unknown) {
      authLogger.error('Failed to refresh permissions:', error);
    }
  }, []);

  const switchTenant = useCallback(async (tenantId: string): Promise<boolean> => {
    try {
      const response = await tenantApi.switchTenant(tenantId);
      if (response.success && response.data) {
        const {
          access_token: accessToken,
          user,
          tenant_id: newTenantId,
        } = response.data as unknown as Record<string, unknown>;

        if (accessToken) {
          localStorage.setItem('token', accessToken as string);
          apiClient.setAuthToken(accessToken as string);

          // Sync new tenant token to Tauri backend storage
          tauriAuth.setToken(accessToken as string);

          const newExpiry = parseTokenExpiryFromJWT(accessToken as string);
          setTokenExpiry(newExpiry);
          localStorage.setItem('token_expiry', newExpiry.toString());
          tauriAuth.setTokenExpiry(newExpiry);
          tauriAuth.broadcastTokenChange(accessToken as string);
        }

        if (user) {
          const mappedUser = mapApiUserToUser(user);
          localStorage.setItem('user', JSON.stringify(mappedUser));
          setState((prev) => ({ ...prev, user: mappedUser }));
        }

        if (newTenantId) {
          localStorage.setItem('current_tenant_id', newTenantId as string);
        }

        authLogger.info('Tenant switched successfully:', tenantId);
        return true;
      }
      return false;
    } catch (error: unknown) {
      authLogger.error('Failed to switch tenant:', error);
      return false;
    }
  }, []);

  const getMyTenants = useCallback(async (): Promise<Record<string, unknown>[]> => {
    try {
      const response = await tenantApi.getMyTenants();
      if (response.success && response.data) {
        return response.data as unknown as Record<string, unknown>[];
      }
      return [];
    } catch (error: unknown) {
      authLogger.error('Failed to get my tenants:', error);
      return [];
    }
  }, []);

  // 稳定 Context 值
  const contextValue = useMemo(
    () => ({
      ...state,
      login,
      logout,
      hasPermission,
      hasRole,
      hasAnyPermission,
      hasAllPermissions,
      refreshPermissions,
      refreshToken,
      isSessionExpiringSoon,
      getTimeUntilExpiry,
      switchTenant,
      getMyTenants,
    }),
    [
      state.user,
      state.token,
      state.isAuthenticated,
      state.isLoading,
      state.roles,
      state.permissions,
      login,
      logout,
      hasPermission,
      hasRole,
      hasAnyPermission,
      hasAllPermissions,
      refreshPermissions,
      refreshToken,
      isSessionExpiringSoon,
      getTimeUntilExpiry,
      switchTenant,
      getMyTenants,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export default AuthContext;
