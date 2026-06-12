import { useAuth } from "./useAuth";
import { useCallback, useMemo } from "react";

export const usePermission = () => {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
    user,
  } = useAuth();

  const checkPermission = useCallback(
    (permission: string): boolean => {
      return hasPermission(permission);
    },
    [hasPermission],
  );

  const checkAnyPermission = useCallback(
    (permissionList: string[]): boolean => {
      return hasAnyPermission(permissionList);
    },
    [hasAnyPermission],
  );

  const checkAllPermissions = useCallback(
    (permissionList: string[]): boolean => {
      return hasAllPermissions(permissionList);
    },
    [hasAllPermissions],
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
    [hasPermission],
  );

  const canAccessModule = useCallback(
    (module: string): boolean => {
      return hasPermission(`${module}:read`);
    },
    [hasPermission],
  );

  const canWriteModule = useCallback(
    (module: string): boolean => {
      return hasPermission(`${module}:write`);
    },
    [hasPermission],
  );

  const canDeleteModule = useCallback(
    (module: string): boolean => {
      return hasPermission(`${module}:delete`);
    },
    [hasPermission],
  );

  const canAdminModule = useCallback(
    (module: string): boolean => {
      return hasPermission(`${module}:admin`);
    },
    [hasPermission],
  );

  const isSuperuser = useMemo(
    () => user?.is_superuser || false,
    [user?.is_superuser],
  );

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
    ],
  );
};

export default usePermission;
