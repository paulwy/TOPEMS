import { useAuth } from './useAuth';
import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  getInheritedPermissions,
  hasPermissionWithInheritance,
  getPermissionsByGroup,
  type ModuleCode,
} from '@/config/permissions';
import { logger } from '@/utils/logger';

const PERMISSION_CACHE_KEY = 'permission_cache';
const CACHE_TTL = 5 * 60 * 1000;

/**
 * P3 权限码兼容层（2026-11-06）：
 * 历史前端引用存在 `*:*:view` 与后端校验 / DB 授权实码 `*:*:read` 不一致的情况
 * （如 crm:dashboard:view、finance:account:view），按原码检查会恒假，导致菜单/按钮被误隐藏。
 * 这里对 `:view` 做等价 action 回退（先原码、后 `:read`），原引用保持不变，
 * 待后端权限表与 DB 授权收敛后再统一（登记于整改计划 P3）。
 */
const resolvePermissionAliases = (permission: string): string[] => {
  const parts = permission.split(':');
  if (parts.length === 3 && parts[2] === 'view') {
    return [permission, `${parts[0]}:${parts[1]}:read`];
  }
  return [permission];
};

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
  const prevPermissionsRef = useRef<string[]>([]);

  useEffect(() => {
    const prevPermissions = prevPermissionsRef.current;
    const permissionsChanged =
      prevPermissions.length !== permissions.length ||
      !prevPermissions.every((p, i) => p === permissions[i]);

    if (!permissionsChanged) return;

    prevPermissionsRef.current = permissions;

    const cached = getCachedPermissions();
    if (cached && cached.permissions.length === permissions.length) {
      const cachedPermissionsChanged =
        cached.permissions.length !== permissions.length ||
        !cached.permissions.every((p, i) => p === permissions[i]);

      if (!cachedPermissionsChanged) {
        cacheRef.current = cached;
        setCachedInheritedPermissions(cached.inheritedPermissions);
        return;
      }
    }

    const inherited = getInheritedPermissions(permissions);
    setCachedInheritedPermissions(inherited);
    setCachedPermissions(permissions, inherited);
    cacheRef.current = { permissions, inheritedPermissions: inherited, timestamp: Date.now() };
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
      return resolvePermissionAliases(permission).some((code) =>
        useInheritance ? hasPermissionWithInheritance(permissions, code) : hasPermission(code)
      );
    },
    [hasPermission, permissions, user?.is_superuser]
  );

  const checkAnyPermission = useCallback(
    (permissionList: string[], useInheritance = true): boolean => {
      if (user?.is_superuser) return true;
      return permissionList.some((perm) =>
        resolvePermissionAliases(perm).some((code) =>
          useInheritance
            ? hasPermissionWithInheritance(permissions, code)
            : hasAnyPermission([code])
        )
      );
    },
    [hasAnyPermission, permissions, user?.is_superuser]
  );

  const checkAllPermissions = useCallback(
    (permissionList: string[], useInheritance = true): boolean => {
      if (user?.is_superuser) return true;
      return permissionList.every((perm) =>
        resolvePermissionAliases(perm).some((code) =>
          useInheritance
            ? hasPermissionWithInheritance(permissions, code)
            : hasAllPermissions([code])
        )
      );
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
