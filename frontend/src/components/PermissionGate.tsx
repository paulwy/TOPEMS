import type { ReactNode } from 'react';
import React from 'react';
import { usePermission } from '../hooks/usePermission';
import { useRole } from '../hooks/useRole';

interface PermissionGateProps {
  children: ReactNode;
  permission?: string | string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showDisabled?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  requireAll = false,
  fallback = null,
  showDisabled = false,
}) => {
  const { checkPermission, checkAnyPermission, checkAllPermissions } = usePermission();

  if (!permission) {
    return <>{children}</>;
  }

  const hasPermission = Array.isArray(permission)
    ? requireAll
      ? checkAllPermissions(permission)
      : checkAnyPermission(permission)
    : checkPermission(permission);

  if (hasPermission) {
    return <>{children}</>;
  }

  if (showDisabled) {
    return (
      <div className='opacity-50 cursor-not-allowed' title='您没有此操作的权限'>
        {children}
      </div>
    );
  }

  return <>{fallback}</>;
};

interface RoleGateProps {
  children: ReactNode;
  role?: string | string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showDisabled?: boolean;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  children,
  role,
  requireAll = false,
  fallback = null,
  showDisabled = false,
}) => {
  const { checkRole, checkAnyRole } = useRole();

  if (!role) {
    return <>{children}</>;
  }

  const hasRole = Array.isArray(role)
    ? requireAll
      ? role.every((r) => checkRole(r))
      : checkAnyRole(role)
    : checkRole(role);

  if (hasRole) {
    return <>{children}</>;
  }

  if (showDisabled) {
    return (
      <div className='opacity-50 cursor-not-allowed' title='您没有此角色权限'>
        {children}
      </div>
    );
  }

  return <>{fallback}</>;
};

interface ModuleGateProps {
  children: ReactNode;
  module: string;
  action?: 'read' | 'write' | 'delete' | 'admin';
  fallback?: ReactNode;
  showDisabled?: boolean;
}

export const ModuleGate: React.FC<ModuleGateProps> = ({
  children,
  module,
  action = 'read',
  fallback = null,
  showDisabled = false,
}) => {
  const { canAccessModule, canWriteModule, canDeleteModule, canAdminModule } = usePermission();

  const checkAction = () => {
    switch (action) {
      case 'read':
        return canAccessModule(module);
      case 'write':
        return canWriteModule(module);
      case 'delete':
        return canDeleteModule(module);
      case 'admin':
        return canAdminModule(module);
      default:
        return false;
    }
  };

  const hasPermission = checkAction();

  if (hasPermission) {
    return <>{children}</>;
  }

  if (showDisabled) {
    return (
      <div className='opacity-50 cursor-not-allowed' title={`您没有${module}模块的${action}权限`}>
        {children}
      </div>
    );
  }

  return <>{fallback}</>;
};

interface AdminGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  showDisabled?: boolean;
}

export const AdminGate: React.FC<AdminGateProps> = ({ children, fallback = null, showDisabled = false }) => {
  const { isAdmin } = useRole();

  if (isAdmin()) {
    return <>{children}</>;
  }

  if (showDisabled) {
    return (
      <div className='opacity-50 cursor-not-allowed' title='需要管理员权限'>
        {children}
      </div>
    );
  }

  return <>{fallback}</>;
};

export default PermissionGate;
