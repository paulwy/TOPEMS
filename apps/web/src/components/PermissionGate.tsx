import type { ReactNode } from 'react';
import React from 'react';
import { usePermission } from '../hooks/usePermission';
import { Loader2 } from 'lucide-react';
import i18n from '@/i18n';

interface PermissionGateProps {
  children: ReactNode;
  permission?: string | string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showDisabled?: boolean;
  loading?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  requireAll = false,
  fallback = null,
  showDisabled = false,
  loading = false,
}) => {
  const { checkPermission, checkAnyPermission, checkAllPermissions } = usePermission();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
        }}
      >
        <Loader2
          data-testid='loader'
          sx={{
            width: 16,
            height: 16,
            color: 'text.disabled',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    );
  }

  if (!permission) {
    return <>{children}</>;
  }

  let hasPermission: boolean;
  if (Array.isArray(permission)) {
    hasPermission = requireAll ? checkAllPermissions(permission) : checkAnyPermission(permission);
  } else {
    hasPermission = checkPermission(permission);
  }

  if (hasPermission) {
    return <>{children}</>;
  }

  if (showDisabled) {
    return (
      <div
        style={{ opacity: 0.5, cursor: 'not-allowed' }}
        title={i18n.t('components.permission_gate.k0')}
      >
        {children}
      </div>
    );
  }

  return <>{fallback}</>;
};

interface ModuleGateProps {
  children: ReactNode;
  module: string;
  action?: 'read' | 'write' | 'update' | 'delete' | 'admin';
  fallback?: ReactNode;
  showDisabled?: boolean;
  loading?: boolean;
}

export const ModuleGate: React.FC<ModuleGateProps> = ({
  children,
  module,
  action = 'read',
  fallback = null,
  showDisabled = false,
  loading = false,
}) => {
  const { canAccessModule, canWriteModule, canDeleteModule, canAdminModule } = usePermission();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
        }}
      >
        <Loader2
          data-testid='loader'
          sx={{
            width: 16,
            height: 16,
            color: 'text.disabled',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    );
  }

  const checkAction = () => {
    switch (action) {
      case 'read':
        return canAccessModule(module);
      case 'write':
      case 'update':
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
      <div
        style={{ opacity: 0.5, cursor: 'not-allowed' }}
        title={`${i18n.t('components.permission_gate.k0')}${module}${i18n.t('components.permission_gate.k1')}${action}${i18n.t('components.permission_gate.k2')}`}
      >
        {children}
      </div>
    );
  }

  return <>{fallback}</>;
};
