import { useAuth } from './useAuth';
import { useCallback, useMemo } from 'react';

export const usePermission = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, permissions, user } = useAuth();

  const checkPermission = useCallback(
    (permission: string): boolean => {
      return hasPermission(permission);
    },
    [hasPermission]
  );

  const checkAnyPermission = useCallback(
    (permissionList: string[]): boolean => {
      return hasAnyPermission(permissionList);
    },
    [hasAnyPermission]
  );

  const checkAllPermissions = useCallback(
    (permissionList: string[]): boolean => {
      return hasAllPermissions(permissionList);
    },
    [hasAllPermissions]
  );

  const getModulePermissions = useCallback(
    (module: string) => {
      return {
        read: hasPermission(`${module}:read`),
        write: hasPermission(`${module}:write`),
        delete: hasPermission(`${module}:delete`),
        admin: hasPermission(`${module}:admin`),
      };
    },
    [hasPermission]
  );

  const canAccessModule = useCallback(
    (module: string): boolean => {
      if (user?.is_superuser) return true;
      return permissions.some((p) => p === `${module}:read`);
    },
    [permissions, user?.is_superuser]
  );

  const canWriteModule = useCallback(
    (module: string): boolean => {
      if (user?.is_superuser) return true;
      return permissions.some(
        (p) => p === `${module}:write` || p === `${module}:create` || p === `${module}:update`
      );
    },
    [permissions, user?.is_superuser]
  );

  const canDeleteModule = useCallback(
    (module: string): boolean => {
      if (user?.is_superuser) return true;
      return permissions.some((p) => p === `${module}:delete`);
    },
    [permissions, user?.is_superuser]
  );

  const canAdminModule = useCallback(
    (module: string): boolean => {
      if (user?.is_superuser) return true;
      return permissions.some((p) => p === `${module}:admin`);
    },
    [permissions, user?.is_superuser]
  );

  const isSuperuser = useMemo(() => user?.is_superuser || false, [user?.is_superuser]);

  // 避免引用稳定化
  return useMemo(
    () => ({
      permissions,
      isSuperuser,
      checkPermission,
      checkAnyPermission,
      checkAllPermissions,
      getModulePermissions,
      canAccessModule,
      canWriteModule,
      canDeleteModule,
      canAdminModule,
    }),
    [
      permissions,
      isSuperuser,
      checkPermission,
      checkAnyPermission,
      checkAllPermissions,
      getModulePermissions,
      canAccessModule,
      canWriteModule,
      canDeleteModule,
      canAdminModule,
    ]
  );
};

export default usePermission;
