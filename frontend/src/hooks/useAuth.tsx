import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { authApi } from '../api/iam';
import apiClient from '../api/client';
import type { ApiResponse } from '../api/client';
import { mapPermissionIdToName, mapPermissionIdsToNames } from '../config/permissionMapping';

export interface User {
  id: string;
  username: string;
  email: string;
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

const AuthContext = createContext<(AuthState & {
  login: (credentials: LoginCredentials) => Promise<any>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  refreshPermissions: () => Promise<void>;
}) | null>(null);

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

  useEffect(() => {
    const initAuth = () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const rolesStr = localStorage.getItem('roles');
      const permissionsStr = localStorage.getItem('permissions');

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          const roles = rolesStr ? JSON.parse(rolesStr) : [];
          const permissions = permissionsStr ? JSON.parse(permissionsStr) : [];
          
          // 初始化 API 客户端的认证令牌
          apiClient.setAuthToken(token);

          setState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            roles,
            permissions,
          });

          // 暂时不刷新用户信息，避免 API 调用导致的问题
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          logout();
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const response = await authApi.login(credentials);
      
      if (response.success && response.data) {
        const { access_token, user } = response.data;
        
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(user));

        const roles = user.roles || [];
        const permissions = user.permissions || [];
        
        if (roles.length > 0) {
          localStorage.setItem('roles', JSON.stringify(roles));
        }
        if (permissions.length > 0) {
          localStorage.setItem('permissions', JSON.stringify(permissions));
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
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('roles');
    localStorage.removeItem('permissions');
    
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      roles: [],
      permissions: [],
    });
  }, []);

  const hasPermission = useCallback((permission: string) => {
    if (state.user?.is_superuser) return true;
    
    // 权限名称到ID的映射
    const permissionNameToId: Record<string, string> = {
      'user:read': '00000000-0000-0000-0000-000000000010',
      'user:write': '00000000-0000-0000-0000-000000000011',
      'user:delete': '00000000-0000-0000-0000-000000000012',
      'user:admin': '00000000-0000-0000-0000-000000000013',
      'role:read': '00000000-0000-0000-0000-000000000014',
      'role:write': '00000000-0000-0000-0000-000000000015',
      'role:delete': '00000000-0000-0000-0000-000000000016',
      'role:admin': '00000000-0000-0000-0000-000000000017',
      'system:read': '00000000-0000-0000-0000-000000000020',
      'system:write': '00000000-0000-0000-0000-000000000021',
      'system:admin': '00000000-0000-0000-0000-000000000022',
      'rs:read': '00000001-0000-0000-0000-000000000001',
      'rs:write': '00000001-0000-0000-0000-000000000002',
      'rs:delete': '00000001-0000-0000-0000-000000000003',
      'rs:admin': '00000001-0000-0000-0000-000000000004',
      'lims:read': '00000002-0000-0000-0000-000000000001',
      'lims:write': '00000002-0000-0000-0000-000000000002',
      'lims:delete': '00000002-0000-0000-0000-000000000003',
      'lims:admin': '00000002-0000-0000-0000-000000000004',
      'qms:read': '00000003-0000-0000-0000-000000000001',
      'qms:write': '00000003-0000-0000-0000-000000000002',
      'qms:delete': '00000003-0000-0000-0000-000000000003',
      'qms:admin': '00000003-0000-0000-0000-000000000004',
      'ehs:read': '00000004-0000-0000-0000-000000000001',
      'ehs:write': '00000004-0000-0000-0000-000000000002',
      'ehs:delete': '00000004-0000-0000-0000-000000000003',
      'ehs:admin': '00000004-0000-0000-0000-000000000004',
      'srm:read': '00000005-0000-0000-0000-000000000001',
      'srm:write': '00000005-0000-0000-0000-000000000002',
      'srm:delete': '00000005-0000-0000-0000-000000000003',
      'srm:admin': '00000005-0000-0000-0000-000000000004',
      'pdm:read': '00000006-0000-0000-0000-000000000001',
      'pdm:write': '00000006-0000-0000-0000-000000000002',
      'pdm:delete': '00000006-0000-0000-0000-000000000003',
      'pdm:admin': '00000006-0000-0000-0000-000000000004',
      'workflow:read': '00000007-0000-0000-0000-000000000001',
      'workflow:write': '00000007-0000-0000-0000-000000000002',
      'workflow:approve': '00000007-0000-0000-0000-000000000003',
      'workflow:reject': '00000007-0000-0000-0000-000000000004',
      'workflow:admin': '00000007-0000-0000-0000-000000000005',
      'doc:read': '00000008-0000-0000-0000-000000000001',
      'doc:write': '00000008-0000-0000-0000-000000000002',
      'doc:delete': '00000008-0000-0000-0000-000000000003',
      'doc:admin': '00000008-0000-0000-0000-000000000004',
      'ai:read': '00000009-0000-0000-0000-000000000001',
      'ai:write': '00000009-0000-0000-0000-000000000002',
      'ai:delete': '00000009-0000-0000-0000-000000000003',
      'ai:admin': '00000009-0000-0000-0000-000000000004',
    };

    const permissionId = permissionNameToId[permission];
    const altFormat = permission.replace(':', '_');
    
    return state.permissions.includes(permission) || 
           state.permissions.includes(altFormat) ||
           (permissionId && state.permissions.includes(permissionId));
  }, [state.permissions, state.user?.is_superuser]);

  const hasRole = useCallback((role: string) => {
    if (state.user?.is_superuser) return true;
    return state.roles.includes(role);
  }, [state.roles, state.user?.is_superuser]);

  const hasAnyPermission = useCallback((permissions: string[]) => {
    if (state.user?.is_superuser) return true;
    return permissions.some(perm => state.permissions.includes(perm));
  }, [state.permissions, state.user?.is_superuser]);

  const hasAllPermissions = useCallback((permissions: string[]) => {
    if (state.user?.is_superuser) return true;
    return permissions.every(perm => state.permissions.includes(perm));
  }, [state.permissions, state.user?.is_superuser]);

  const refreshPermissions = useCallback(async () => {
    try {
      const response = await authApi.getMyPermissions();
      if (response.success && response.data) {
        const { roles, permissions } = response.data;
        
        localStorage.setItem('roles', JSON.stringify(roles.map(r => r.id)));
        localStorage.setItem('permissions', JSON.stringify(permissions.map(p => p.id)));
        
        setState(prev => ({
          ...prev,
          roles: roles.map(r => r.id),
          permissions: permissions.map(p => p.id),
        }));
      }
    } catch (error) {
      console.error('Failed to refresh permissions:', error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        hasPermission,
        hasRole,
        hasAnyPermission,
        hasAllPermissions,
        refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
