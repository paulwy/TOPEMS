import type { ReactNode } from "react";
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  createContext,
  useContext,
} from "react";
import { authApi } from "../api/iam";
import apiClient from "../api/client";

// 默认 token 过期时间（24小时，毫秒）- 当无法解析 JWT 时使用
const DEFAULT_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

// 从 JWT token payload 解析过期时间戳（毫秒）
// 这确保前端与后端的 token 过期时间保持一致
const parseTokenExpiryFromJWT = (token: string): number => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && typeof payload.exp === "number") {
      // JWT 的 exp 是 Unix 时间戳（秒），转为毫秒
      return payload.exp * 1000;
    }
  } catch (e) {
    console.warn("Failed to parse token expiry from JWT:", e);
  }
  // 解析失败时返回默认过期时间
  return Date.now() + DEFAULT_TOKEN_EXPIRY_MS;
};

// 权限名称到ID的映射 - 移到组件外部避免重复创建
const permissionNameToId: Record<string, string> = {
  "user:read": "00000000-0000-0000-0000-000000000010",
  "user:write": "00000000-0000-0000-0000-000000000011",
  "user:delete": "00000000-0000-0000-0000-000000000012",
  "user:admin": "00000000-0000-0000-0000-000000000013",
  "role:read": "00000000-0000-0000-0000-000000000014",
  "role:write": "00000000-0000-0000-0000-000000000015",
  "role:delete": "00000000-0000-0000-0000-000000000016",
  "role:admin": "00000000-0000-0000-0000-000000000017",
  "system:read": "00000000-0000-0000-0000-000000000020",
  "system:write": "00000000-0000-0000-0000-000000000021",
  "system:admin": "00000000-0000-0000-0000-000000000022",
  "rs:read": "00000001-0000-0000-0000-000000000001",
  "rs:write": "00000001-0000-0000-0000-000000000002",
  "rs:delete": "00000001-0000-0000-0000-000000000003",
  "rs:admin": "00000001-0000-0000-0000-000000000004",
  "lims:read": "00000002-0000-0000-0000-000000000001",
  "lims:write": "00000002-0000-0000-0000-000000000002",
  "lims:delete": "00000002-0000-0000-0000-000000000003",
  "lims:admin": "00000002-0000-0000-0000-000000000004",
  "qms:read": "00000003-0000-0000-0000-000000000001",
  "qms:write": "00000003-0000-0000-0000-000000000002",
  "qms:delete": "00000003-0000-0000-0000-000000000003",
  "qms:admin": "00000003-0000-0000-0000-000000000004",
  "ehs:read": "00000004-0000-0000-0000-000000000001",
  "ehs:write": "00000004-0000-0000-0000-000000000002",
  "ehs:delete": "00000004-0000-0000-0000-000000000003",
  "ehs:admin": "00000004-0000-0000-0000-000000000004",
  "srm:read": "00000005-0000-0000-0000-000000000001",
  "srm:write": "00000005-0000-0000-0000-000000000002",
  "srm:delete": "00000005-0000-0000-0000-000000000003",
  "srm:admin": "00000005-0000-0000-0000-000000000004",
  "pdm:read": "00000006-0000-0000-0000-000000000001",
  "pdm:write": "00000006-0000-0000-0000-000000000002",
  "pdm:delete": "00000006-0000-0000-0000-000000000003",
  "pdm:admin": "00000006-0000-0000-0000-000000000004",
  "workflow:read": "00000007-0000-0000-0000-000000000001",
  "workflow:write": "00000007-0000-0000-0000-000000000002",
  "workflow:approve": "00000007-0000-0000-0000-000000000003",
  "workflow:reject": "00000007-0000-0000-0000-000000000004",
  "workflow:admin": "00000007-0000-0000-0000-000000000005",
  "doc:read": "00000008-0000-0000-0000-000000000001",
  "doc:write": "00000008-0000-0000-0000-000000000002",
  "doc:delete": "00000008-0000-0000-0000-000000000003",
  "doc:admin": "00000008-0000-0000-0000-000000000004",
  "file:read": "00000016-0000-0000-0000-000000000001",
  "file:write": "00000016-0000-0000-0000-000000000002",
  "file:delete": "00000016-0000-0000-0000-000000000003",
  "file:admin": "00000016-0000-0000-0000-000000000004",
  "ai:read": "00000009-0000-0000-0000-000000000001",
  "ai:write": "00000009-0000-0000-0000-000000000002",
  "ai:delete": "00000009-0000-0000-0000-000000000003",
  "ai:admin": "00000009-0000-0000-0000-000000000004",
  "im:read": "00000010-0000-0000-0000-000000000001",
  "im:write": "00000010-0000-0000-0000-000000000002",
  "im:admin": "00000010-0000-0000-0000-000000000003",
  "mail:read": "00000011-0000-0000-0000-000000000001",
  "mail:write": "00000011-0000-0000-0000-000000000002",
  "mail:admin": "00000011-0000-0000-0000-000000000003",
  "gis:read": "00000012-0000-0000-0000-000000000001",
  "gis:write": "00000012-0000-0000-0000-000000000002",
  "gis:admin": "00000012-0000-0000-0000-000000000003",
  "notification:read": "00000013-0000-0000-0000-000000000001",
  "notification:write": "00000013-0000-0000-0000-000000000002",
  "pm:read": "00000014-0000-0000-0000-000000000001",
  "pm:write": "00000014-0000-0000-0000-000000000002",
  "pm:admin": "00000014-0000-0000-0000-000000000003",
  "integration:read": "00000015-0000-0000-0000-000000000001",
  "integration:write": "00000015-0000-0000-0000-000000000002",
  "integration:admin": "00000015-0000-0000-0000-000000000003",
};

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  created_at: string;
  is_active: boolean;
  is_superuser?: boolean;
}

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
      login: (credentials: LoginCredentials) => Promise<any>;
      logout: () => void;
      hasPermission: (permission: string) => boolean;
      hasRole: (role: string) => boolean;
      hasAnyPermission: (permissions: string[]) => boolean;
      hasAllPermissions: (permissions: string[]) => boolean;
      refreshPermissions: () => Promise<void>;
      refreshToken: () => Promise<boolean>;
      isSessionExpiringSoon: () => boolean;
      getTimeUntilExpiry: () => number;
    })
  | null
>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
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
    // 5分钟 = 300000毫秒
    return timeUntilExpiry > 0 && timeUntilExpiry < 5 * 60 * 1000;
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

    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

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
        }, 60000); // 每分钟最多更新一次
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
    const refresh_token = localStorage.getItem("refresh_token");
    if (!refresh_token) {
      return false;
    }

    try {
      const response = await authApi.refreshToken(refresh_token);
      if (response.success && response.data) {
        const { access_token } = response.data;
        localStorage.setItem("token", access_token);
        apiClient.setAuthToken(access_token);

        // 从新 token 解析过期时间（与后端配置保持一致）
        const newExpiry = parseTokenExpiryFromJWT(access_token);
        setTokenExpiry(newExpiry);
        localStorage.setItem("token_expiry", newExpiry.toString());

        setState((prev) => ({ ...prev, token: access_token }));
        return true;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      localStorage.removeItem("roles");
      localStorage.removeItem("permissions");
      localStorage.removeItem("token_expiry");
      window.location.href = "/login";
      return false;
    }
    return false;
  }, []);

  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;

    const initAuth = async () => {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      const rolesStr = localStorage.getItem("roles");
      const permissionsStr = localStorage.getItem("permissions");

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          const roles = rolesStr ? JSON.parse(rolesStr) : [];
          const permissions = permissionsStr ? JSON.parse(permissionsStr) : [];

          // 优先使用 token 本身的过期时间，其次使用存储的过期时间
          const tokenExpiry = parseTokenExpiryFromJWT(token);
          setTokenExpiry(tokenExpiry);
          localStorage.setItem("token_expiry", tokenExpiry.toString());

          apiClient.setAuthToken(token);

          setState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            roles,
            permissions,
          });

          // 每50分钟刷新一次 token
          refreshInterval = setInterval(
            async () => {
              console.log("Attempting to refresh token...");
              await refreshToken();
            },
            50 * 60 * 1000,
          );
        } catch (error) {
          console.error("Failed to initialize auth:", error);
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
        const { access_token, refresh_token, user } = response.data;

        localStorage.setItem("token", access_token);
        if (refresh_token) {
          localStorage.setItem("refresh_token", refresh_token);
        }
        localStorage.setItem("user", JSON.stringify(user));

        apiClient.setAuthToken(access_token);

        // 从 JWT token 解析过期时间（与后端配置保持一致）
        const expiry = parseTokenExpiryFromJWT(access_token);
        setTokenExpiry(expiry);
        localStorage.setItem("token_expiry", expiry.toString());

        const roles = user.roles || [];
        const permissions = user.permissions || [];

        if (roles.length > 0) {
          localStorage.setItem("roles", JSON.stringify(roles));
        }
        if (permissions.length > 0) {
          localStorage.setItem("permissions", JSON.stringify(permissions));
        }

        setState({
          user,
          token: access_token,
          isAuthenticated: true,
          isLoading: false,
          roles,
          permissions,
        });
      }

      return response;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("roles");
    localStorage.removeItem("permissions");
    localStorage.removeItem("token_expiry");

    setTokenExpiry(null);

    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      roles: [],
      permissions: [],
    });
  }, []);

  // Listen for unauthorized events from API client to sync React state with localStorage
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [logout]);

  const hasPermission = useCallback((permission: string) => {
    const { permissions, user } = stateRef.current;
    if (user?.is_superuser) return true;

    const permissionId = permissionNameToId[permission];
    const altFormat = permission.replace(":", "_");

    return (
      permissions.includes(permission) ||
      permissions.includes(altFormat) ||
      (permissionId !== undefined && permissions.includes(permissionId))
    );
  }, []);

  const hasRole = useCallback((role: string) => {
    const { roles, user } = stateRef.current;
    if (user?.is_superuser) return true;
    return roles.includes(role);
  }, []);

  const hasAnyPermission = useCallback((perms: string[]) => {
    const { permissions, user } = stateRef.current;
    if (user?.is_superuser) return true;
    return perms.some((perm) => permissions.includes(perm));
  }, []);

  const hasAllPermissions = useCallback((perms: string[]) => {
    const { permissions, user } = stateRef.current;
    if (user?.is_superuser) return true;
    return perms.every((perm) => permissions.includes(perm));
  }, []);

  const refreshPermissions = useCallback(async () => {
    try {
      const response = await authApi.getMyPermissions();
      if (response.success && response.data) {
        const { roles, permissions } = response.data;

        localStorage.setItem("roles", JSON.stringify(roles.map((r) => r.id)));
        localStorage.setItem(
          "permissions",
          JSON.stringify(permissions.map((p) => p.id)),
        );

        setState((prev) => ({
          ...prev,
          roles: roles.map((r) => r.id),
          permissions: permissions.map((p) => p.id),
        }));
      }
    } catch (error) {
      console.error("Failed to refresh permissions:", error);
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
    }),
    [
      state,
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
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export default AuthContext;
