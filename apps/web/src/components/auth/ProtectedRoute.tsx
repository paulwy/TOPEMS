import type { ReactNode } from 'react';
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { useRole } from '../../hooks/useRole';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  requireAllPermissions?: boolean;
  fallbackPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  requireAllPermissions = false,
  fallbackPath = '/login',
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { checkAnyPermission, checkAllPermissions } = usePermission();
  const { checkAnyRole } = useRole();
  const location = useLocation();

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
              border: '4px solid #2563eb',
              borderBottom: '4px solid transparent',
              borderRadius: '9999px',
              animation: 'spin 1s linear infinite',
              margin: 'auto',
              marginBottom: '16px',
            }}
          ></div>
          <p style={{ color: '#64748b' }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={fallbackPath}
        state={{ from: location }}
        replace
      />
    );
  }

  if (requiredPermissions.length > 0) {
    const hasPermissions = requireAllPermissions
      ? checkAllPermissions(requiredPermissions)
      : checkAnyPermission(requiredPermissions);

    if (!hasPermissions) {
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
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
            <h2
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '8px',
              }}
            >
              权限不足
            </h2>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>
              您没有访问此页面的权限。请联系管理员获取相应权限。
            </p>
            <button
              onClick={() => window.history.back()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              返回上一页
            </button>
          </div>
        </div>
      );
    }
  }

  if (requiredRoles.length > 0) {
    const hasRoles = checkAnyRole(requiredRoles);

    if (!hasRoles) {
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
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
            <h2
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '8px',
              }}
            >
              角色权限不足
            </h2>
            <p style={{ color: '#64748b', marginBottom: '16px' }}>
              您没有访问此页面的角色权限。请联系管理员分配相应角色。
            </p>
            <button
              onClick={() => window.history.back()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              返回上一页
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

interface PermissionRouteProps {
  children: ReactNode;
  module: string;
  action?: 'read' | 'write' | 'delete' | 'admin';
  fallbackComponent?: ReactNode;
}

export const PermissionRoute: React.FC<PermissionRouteProps> = ({
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
      <div style={{ padding: '24px' }}>
        <div
          style={{
            backgroundColor: '#fefce8',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0 }}>
              <svg
                style={{ height: 20, width: 20, color: '#f59e0b' }}
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
            <div style={{ marginLeft: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#a16207' }}>权限提示</h3>
              <div style={{ marginTop: '8px', fontSize: '14px', color: '#a16207' }}>
                <p>
                  您没有访问 {module} 模块的 {action} 权限。
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

interface GuestRouteProps {
  children: ReactNode;
}

export const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return (
      <Navigate
        to='/dashboard'
        replace
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
