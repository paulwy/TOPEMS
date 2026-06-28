import { useState, useEffect, useCallback } from 'react';

const SHARED_STATE_KEY = '__TOPEMS_SHARED_STATE__';

interface AuthState {
  user: any;
  token: string | null;
  isAuthenticated: boolean;
  roles: string[];
  permissions: string[];
}

interface SharedState {
  auth?: AuthState;
  [key: string]: any;
}

declare global {
  interface Window {
    [SHARED_STATE_KEY]?: SharedState;
  }
}

const getSharedAuth = (): AuthState | undefined => {
  if (typeof window === 'undefined') return undefined;
  return window[SHARED_STATE_KEY]?.auth;
};

const getLocalAuth = (): AuthState => {
  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const rolesStr = localStorage.getItem('roles');
    const permissionsStr = localStorage.getItem('permissions');

    return {
      user: userStr ? JSON.parse(userStr) : null,
      token: token || null,
      isAuthenticated: !!token && !!userStr,
      roles: rolesStr ? JSON.parse(rolesStr) : [],
      permissions: permissionsStr ? JSON.parse(permissionsStr) : [],
    };
  } catch {
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      roles: [],
      permissions: [],
    };
  }
};

export const useSharedAuth = () => {
  const [auth, setAuth] = useState<AuthState>(() => {
    return getSharedAuth() || getLocalAuth();
  });

  const refreshAuth = useCallback(() => {
    const sharedAuth = getSharedAuth();
    setAuth(sharedAuth || getLocalAuth());
  }, []);

  useEffect(() => {
    const handleSharedStateChange = () => {
      refreshAuth();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user' || e.key === 'roles' || e.key === 'permissions') {
        refreshAuth();
      }
    };

    window.addEventListener('topems:shared-state-change', handleSharedStateChange);
    window.addEventListener('storage', handleStorageChange);

    refreshAuth();

    return () => {
      window.removeEventListener('topems:shared-state-change', handleSharedStateChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshAuth]);

  const hasPermission = useCallback(
    (permission: string) => {
      if (auth.user?.is_superuser) return true;
      return auth.permissions.includes(permission);
    },
    [auth]
  );

  const hasRole = useCallback(
    (role: string) => {
      if (auth.user?.is_superuser) return true;
      return auth.roles.includes(role);
    },
    [auth]
  );

  return {
    ...auth,
    hasPermission,
    hasRole,
    refreshAuth,
  };
};

export default useSharedAuth;
