import { Chip } from '@mui/material';
import type { ReactNode } from 'react';
import React from 'react';
import { usePermission } from '../hooks/usePermission';
import { useRole } from '../hooks/useRole';
import { Shield, User, Users, Crown, Eye, Loader2 } from 'lucide-react';
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

interface RoleGateProps {
  children: ReactNode;
  role?: string | string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showDisabled?: boolean;
  loading?: boolean;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  children,
  role,
  requireAll = false,
  fallback = null,
  showDisabled = false,
  loading = false,
}) => {
  const { checkRole, checkAnyRole } = useRole();

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

  if (!role) {
    return <>{children}</>;
  }

  let hasRole: boolean;
  if (Array.isArray(role)) {
    hasRole = requireAll ? role.every((r) => checkRole(r)) : checkAnyRole(role);
  } else {
    hasRole = checkRole(role);
  }

  if (hasRole) {
    return <>{children}</>;
  }

  if (showDisabled) {
    return (
      <div
        style={{ opacity: 0.5, cursor: 'not-allowed' }}
        title={i18n.t('components.permission_gate.k1')}
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

interface AdminGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  showDisabled?: boolean;
  loading?: boolean;
}

export const AdminGate: React.FC<AdminGateProps> = ({
  children,
  fallback = null,
  showDisabled = false,
  loading = false,
}) => {
  const { isAdmin } = useRole();

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

  if (isAdmin()) {
    return <>{children}</>;
  }

  if (showDisabled) {
    return (
      <div
        style={{ opacity: 0.5, cursor: 'not-allowed' }}
        title={i18n.t('components.permission_gate.k2')}
      >
        {children}
      </div>
    );
  }

  return <>{fallback}</>;
};

interface SuperuserGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  showDisabled?: boolean;
  loading?: boolean;
}

export const SuperuserGate: React.FC<SuperuserGateProps> = ({
  children,
  fallback = null,
  showDisabled = false,
  loading = false,
}) => {
  const { isSuperuser } = usePermission();

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

  if (isSuperuser) {
    return <>{children}</>;
  }

  if (showDisabled) {
    return (
      <div
        style={{ opacity: 0.5, cursor: 'not-allowed' }}
        title={i18n.t('components.permission_gate.k3')}
      >
        {children}
      </div>
    );
  }

  return <>{fallback}</>;
};

// 角色徽章组件 - 用于显示用户角色
interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

type IconComponent = React.ComponentType<{ className?: string }>;

const roleConfig: Record<
  string,
  {
    variant: 'default' | 'destructive' | 'outline' | 'secondary';
    icon: IconComponent;
    label: string;
  }
> = {
  admin: { variant: 'destructive', icon: Crown, label: i18n.t('components.permission_gate.k4') },
  Admin: { variant: 'destructive', icon: Crown, label: i18n.t('components.permission_gate.k5') },
  manager: { variant: 'secondary', icon: Users, label: i18n.t('components.permission_gate.k6') },
  Manager: { variant: 'secondary', icon: Users, label: i18n.t('components.permission_gate.k7') },
  user: { variant: 'default', icon: User, label: i18n.t('components.permission_gate.k8') },
  User: { variant: 'default', icon: User, label: i18n.t('components.permission_gate.k9') },
  guest: { variant: 'outline', icon: Eye, label: i18n.t('components.permission_gate.k10') },
  Guest: { variant: 'outline', icon: Eye, label: i18n.t('components.permission_gate.k11') },
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const config = roleConfig[role] || {
    variant: 'outline' as const,
    icon: Shield,
    label: role,
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const _iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <Chip
      size='small'
      variant={config.variant === 'outline' ? 'outlined' : 'filled'}
      sx={{ gap: 0.5 }}
      label={config.label}
    />
  );
};

// 权限徽章组件 - 用于显示权限
interface PermissionBadgeProps {
  permission: string;
  size?: 'sm' | 'md';
}

export const PermissionBadge: React.FC<PermissionBadgeProps> = ({ permission, size = 'sm' }) => {
  const [module, action] = permission.split(':');

  const actionColors: Record<string, { bg: string; text: string }> = {
    read: { bg: 'success.lighter', text: 'success.dark' },
    write: { bg: 'primary.lightest', text: 'primary.dark' },
    delete: { bg: 'error.lighter', text: 'error.darker' },
    admin: { bg: 'secondary.lightest', text: 'secondary.dark' },
  };

  const colorStyle = actionColors[action] || { bg: 'grey.100', text: 'grey.700' };

  const sizeStyles = {
    sm: {
      fontSize: '12px',
      paddingLeft: 1.5,
      paddingRight: 1.5,
      paddingTop: 0.5,
      paddingBottom: 0.5,
    },
    md: {
      fontSize: '14px',
      paddingLeft: 2,
      paddingRight: 2,
      paddingTop: 1,
      paddingBottom: 1,
    },
  };

  return (
    <span
      style={{
        backgroundColor: colorStyle.bg,
        color: colorStyle.text,
        borderRadius: 'xs',
        fontWeight: 500,
        ...sizeStyles[size],
      }}
    >
      {module}:{action}
    </span>
  );
};
