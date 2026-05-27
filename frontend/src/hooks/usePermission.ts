import { useAuth } from './useAuth';

export const usePermission = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, permissions, user } = useAuth();

  const checkPermission = (permission: string): boolean => {
    return hasPermission(permission);
  };

  const checkAnyPermission = (permissionList: string[]): boolean => {
    return hasAnyPermission(permissionList);
  };

  const checkAllPermissions = (permissionList: string[]): boolean => {
    return hasAllPermissions(permissionList);
  };

  const getModulePermissions = (module: string) => {
    return {
      read: hasPermission(`${module}:read`),
      write: hasPermission(`${module}:write`),
      delete: hasPermission(`${module}:delete`),
      admin: hasPermission(`${module}:admin`),
    };
  };

  const canAccessModule = (module: string): boolean => {
    return hasPermission(`${module}:read`);
  };

  const canWriteModule = (module: string): boolean => {
    return hasPermission(`${module}:write`);
  };

  const canDeleteModule = (module: string): boolean => {
    return hasPermission(`${module}:delete`);
  };

  const canAdminModule = (module: string): boolean => {
    return hasPermission(`${module}:admin`);
  };

  return {
    permissions,
    isSuperuser: user?.is_superuser || false,
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    getModulePermissions,
    canAccessModule,
    canWriteModule,
    canDeleteModule,
    canAdminModule,
  };
};

export default usePermission;
