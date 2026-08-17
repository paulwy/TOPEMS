import type { ReactNode, ComponentType } from 'react';
import React from 'react';
import { usePermission } from '../hooks/usePermission';
import { useAuth } from '../hooks/useAuth';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

export interface WithPermissionOptions {
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showDisabled?: boolean;
  loadingFallback?: ReactNode;
}

export function withPermission<T extends object>(
  WrappedComponent: ComponentType<T>,
  options: WithPermissionOptions
): ComponentType<T> {
  const {
    requiredPermission,
    requiredPermissions = [],
    requireAll = false,
    fallback = null,
    showDisabled = false,
    loadingFallback = null,
  } = options;

  const PermissionHOC: React.FC<T> = (props) => {
    const { checkPermission, checkAnyPermission, checkAllPermissions } = usePermission();
    const { isLoading } = useAuth();

    if (isLoading) {
      return <>{loadingFallback || null}</>;
    }

    let hasPermission = true;

    if (requiredPermission) {
      hasPermission = checkPermission(requiredPermission);
    } else if (requiredPermissions.length > 0) {
      hasPermission = requireAll
        ? checkAllPermissions(requiredPermissions)
        : checkAnyPermission(requiredPermissions);
    }

    if (hasPermission) {
      return <WrappedComponent {...props} />;
    }

    if (showDisabled) {
      return (
        <div style={{ opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' }}>
          <WrappedComponent {...props} />
        </div>
      );
    }

    return <>{fallback}</>;
  };

  PermissionHOC.displayName = `withPermission(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return PermissionHOC;
}

export interface RequirePermissionProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showDisabled?: boolean;
  loading?: boolean;
  onDenied?: () => void;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  showDisabled = false,
  loading = false,
  onDenied,
}) => {
  const { checkPermission, checkAnyPermission, checkAllPermissions } = usePermission();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 4,
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            border: '2px solid grey.200',
            borderTopColor: 'primary.main',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        ></div>
      </div>
    );
  }

  let hasPermission = true;

  if (permission) {
    hasPermission = checkPermission(permission);
  } else if (permissions.length > 0) {
    hasPermission = requireAll ? checkAllPermissions(permissions) : checkAnyPermission(permissions);
  }

  if (hasPermission) {
    return <>{children}</>;
  }

  if (onDenied) {
    onDenied();
  }

  if (showDisabled) {
    return (
      <div
        style={{ opacity: 0.5, cursor: 'not-allowed' }}
        title={i18n.t('components.permission_components.k0')}
      >
        {children}
      </div>
    );
  }

  return <>{fallback}</>;
};

export interface PermissionGuardProps {
  children: ReactNode;
  permissions?: string[];
  requireAll?: boolean;
  fallbackPath?: string;
  fallbackComponent?: ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permissions = [],
  requireAll = false,
  fallbackPath,
  fallbackComponent,
}) => {
  const { checkAnyPermission, checkAllPermissions, isSuperuser } = usePermission();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid grey.200',
              borderTopColor: 'primary.main',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: 'auto',
              marginBottom: 4,
            }}
          ></div>
          <p style={{ color: 'grey.500' }}>{i18n.t('components.permission_components.k0')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (fallbackPath) {
      window.location.href = fallbackPath;
      return null;
    }
    return <>{fallbackComponent || null}</>;
  }

  if (isSuperuser) {
    return <>{children}</>;
  }

  if (permissions.length === 0) {
    return <>{children}</>;
  }

  const hasPermissions = requireAll
    ? checkAllPermissions(permissions)
    : checkAnyPermission(permissions);

  if (hasPermissions) {
    return <>{children}</>;
  }

  if (fallbackPath) {
    window.location.href = fallbackPath;
    return null;
  }

  if (fallbackComponent) {
    return <>{fallbackComponent}</>;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'grey.100',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: 6,
          backgroundColor: 'common.white',
          borderRadius: 'lg',
          boxShadow: designTokens.shadows.md,
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: 4 }}>🔒</div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'grey.800', marginBottom: 2 }}>
          {i18n.t('components.permission_components.k1')}
        </h2>
        <p style={{ color: 'grey.500', marginBottom: 4 }}>
          {i18n.t('components.permission_components.k2')}
        </p>
        <button
          onClick={() => window.history.back()}
          style={{
            padding: '10px 24px',
            backgroundColor: 'primary.main',
            color: 'common.white',
            borderRadius: 'md',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {i18n.t('components.permission_components.k3')}
        </button>
      </div>
    </div>
  );
};

export interface ModulePermissionGuardProps {
  children: ReactNode;
  module: string;
  action?: 'read' | 'write' | 'delete' | 'approve' | 'admin';
  fallbackComponent?: ReactNode;
}

export const ModulePermissionGuard: React.FC<ModulePermissionGuardProps> = ({
  children,
  module,
  action = 'read',
  fallbackComponent,
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
      case 'approve':
        return canWriteModule(module);
      case 'admin':
        return canAdminModule(module);
      default:
        return false;
    }
  };

  if (!checkAction()) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }
    return (
      <div style={{ padding: 6 }}>
        <div
          style={{
            backgroundColor: 'warning.100',
            border: `1px solid ${designTokens.colors.warning['400']}`,
            borderRadius: 'md',
            padding: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0, marginRight: 3 }}>
              <svg
                style={{ height: 20, width: 20, color: 'warning.600' }}
                viewBox='0 0 20 20'
                fill='currentColor'
              >
                <path
                  fillRule='evenodd'
                  d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                  clipRule='evenodd'
                />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 500, color: 'warning.800' }}>
                {i18n.t('components.permission_components.k1')}
              </h3>
              <div style={{ marginTop: 2, fontSize: '14px', color: 'warning.800' }}>
                <p>
                  {i18n.t('components.permission_components.k0')} {module}{' '}
                  {i18n.t('components.permission_components.k1')} {action}{' '}
                  {i18n.t('components.permission_components.k2')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export interface ConditionalRenderProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  children: ReactNode;
  else?: ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  permission,
  permissions = [],
  requireAll = false,
  children,
  else: elseContent = null,
}) => {
  const { checkPermission, checkAnyPermission, checkAllPermissions } = usePermission();

  let hasPermission = true;

  if (permission) {
    hasPermission = checkPermission(permission);
  } else if (permissions.length > 0) {
    hasPermission = requireAll ? checkAllPermissions(permissions) : checkAnyPermission(permissions);
  }

  return <>{hasPermission ? children : elseContent}</>;
};
