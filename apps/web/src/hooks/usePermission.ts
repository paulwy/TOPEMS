import { useAuth } from './useAuth';
import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  getInheritedPermissions,
  hasPermissionWithInheritance,
  getPermissionsByGroup,
  type ModuleCode,
} from '@/config/permissions';
import { logger } from "@/utils/logger";

const PERMISSION_CACHE_KEY = 'permission_cache';
const CACHE_TTL = 5 * 60 * 1000;

interface PermissionCache {
  permissions: string[];
  inheritedPermissions: string[];
  timestamp: number;
}

const getCachedPermissions = (): PermissionCache | null => {
  try {
    const cached = localStorage.getItem(PERMISSION_CACHE_KEY);
    if (cached) {
      const cache: PermissionCache = JSON.parse(cached);
      if (Date.now() - cache.timestamp < CACHE_TTL) {
        return cache;
      }
    }
  } catch (e) {
    logger.error('Failed to read permission cache:', e);
  }
  return null;
};

const setCachedPermissions = (permissions: string[], inheritedPermissions: string[]): void => {
  try {
    const cache: PermissionCache = {
      permissions,
      inheritedPermissions,
      timestamp: Date.now(),
    };
    localStorage.setItem(PERMISSION_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    logger.error('Failed to write permission cache:', e);
  }
};

export const usePermission = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, permissions, user } = useAuth();
  const [cachedInheritedPermissions, setCachedInheritedPermissions] = useState<string[]>([]);
  const cacheRef = useRef<PermissionCache | null>(null);

  useEffect(() => {
    const cached = getCachedPermissions();
    if (cached && cached.permissions.length === permissions.length) {
      cacheRef.current = cached;
      setCachedInheritedPermissions(cached.inheritedPermissions);
    } else {
      const inherited = getInheritedPermissions(permissions);
      setCachedInheritedPermissions(inherited);
      setCachedPermissions(permissions, inherited);
      cacheRef.current = { permissions, inheritedPermissions: inherited, timestamp: Date.now() };
    }
  }, [permissions]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === PERMISSION_CACHE_KEY) {
        const cached = getCachedPermissions();
        if (cached) {
          cacheRef.current = cached;
          setCachedInheritedPermissions(cached.inheritedPermissions);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const checkPermission = useCallback(
    (permission: string, useInheritance = true): boolean => {
      if (user?.is_superuser) return true;
      if (useInheritance) {
        return hasPermissionWithInheritance(permissions, permission);
      }
      return hasPermission(permission);
    },
    [hasPermission, permissions, user?.is_superuser]
  );

  const checkAnyPermission = useCallback(
    (permissionList: string[], useInheritance = true): boolean => {
      if (user?.is_superuser) return true;
      if (useInheritance) {
        return permissionList.some((perm) => hasPermissionWithInheritance(permissions, perm));
      }
      return hasAnyPermission(permissionList);
    },
    [hasAnyPermission, permissions, user?.is_superuser]
  );

  const checkAllPermissions = useCallback(
    (permissionList: string[], useInheritance = true): boolean => {
      if (user?.is_superuser) return true;
      if (useInheritance) {
        return permissionList.every((perm) => hasPermissionWithInheritance(permissions, perm));
      }
      return hasAllPermissions(permissionList);
    },
    [hasAllPermissions, permissions, user?.is_superuser]
  );

  const getModulePermissions = useCallback(
    (module: string) => {
      return {
        read: checkPermission(`${module}:read`),
        write: checkPermission(`${module}:write`),
        delete: checkPermission(`${module}:delete`),
        approve: checkPermission(`${module}:approve`),
        admin: checkPermission(`${module}:admin`),
      };
    },
    [checkPermission]
  );

  const canAccessModule = useCallback(
    (module: string): boolean => {
      if (user?.is_superuser) return true;
      return checkPermission(`${module}:read`);
    },
    [checkPermission, user?.is_superuser]
  );

  const canWriteModule = useCallback(
    (module: string): boolean => {
      if (user?.is_superuser) return true;
      return (
        checkPermission(`${module}:write`) ||
        checkPermission(`${module}:create`) ||
        checkPermission(`${module}:update`)
      );
    },
    [checkPermission, user?.is_superuser]
  );

  const canDeleteModule = useCallback(
    (module: string): boolean => {
      if (user?.is_superuser) return true;
      return checkPermission(`${module}:delete`);
    },
    [checkPermission, user?.is_superuser]
  );

  const canAdminModule = useCallback(
    (module: string): boolean => {
      if (user?.is_superuser) return true;
      return checkPermission(`${module}:admin`);
    },
    [checkPermission, user?.is_superuser]
  );

  const getInherited = useCallback((): string[] => {
    return cachedInheritedPermissions;
  }, [cachedInheritedPermissions]);

  const getPermissionsByGroupHook = useCallback(
    (groupId: string) => {
      const groupPermissions = getPermissionsByGroup(groupId);
      return groupPermissions.map((perm) => ({
        ...perm,
        hasAccess: checkPermission(perm.code),
      }));
    },
    [checkPermission]
  );

  const hasAnyModulePermission = useCallback(
    (modules: ModuleCode[], action?: string): boolean => {
      if (user?.is_superuser) return true;
      return modules.some((module) => {
        const perm = action ? `${module}:${action}` : `${module}:read`;
        return checkPermission(perm);
      });
    },
    [checkPermission, user?.is_superuser]
  );

  const refreshCache = useCallback(() => {
    const inherited = getInheritedPermissions(permissions);
    setCachedInheritedPermissions(inherited);
    setCachedPermissions(permissions, inherited);
    cacheRef.current = { permissions, inheritedPermissions: inherited, timestamp: Date.now() };
  }, [permissions]);

  const clearCache = useCallback(() => {
    localStorage.removeItem(PERMISSION_CACHE_KEY);
    cacheRef.current = null;
  }, []);

  const isSuperuser = useMemo(() => user?.is_superuser || false, [user?.is_superuser]);

  const effectivePermissions = useMemo(() => {
    if (user?.is_superuser) {
      return ['all'];
    }
    return cachedInheritedPermissions.length > 0 ? cachedInheritedPermissions : permissions;
  }, [user?.is_superuser, cachedInheritedPermissions, permissions]);

  return useMemo(
    () => ({
      permissions,
      effectivePermissions,
      isSuperuser,
      checkPermission,
      checkAnyPermission,
      checkAllPermissions,
      getModulePermissions,
      canAccessModule,
      canWriteModule,
      canDeleteModule,
      canAdminModule,
      getInherited,
      getPermissionsByGroup: getPermissionsByGroupHook,
      hasAnyModulePermission,
      refreshCache,
      clearCache,
    }),
    [
      permissions,
      effectivePermissions,
      isSuperuser,
      checkPermission,
      checkAnyPermission,
      checkAllPermissions,
      getModulePermissions,
      canAccessModule,
      canWriteModule,
      canDeleteModule,
      canAdminModule,
      getInherited,
      getPermissionsByGroupHook,
      hasAnyModulePermission,
      refreshCache,
      clearCache,
    ]
  );
};

export default usePermission;
