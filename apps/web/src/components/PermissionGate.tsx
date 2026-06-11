import type { ReactNode } from 'react';
import React from 'react';
import { usePermission } from '../hooks/usePermission';
import { useRole } from '../hooks/useRole';
import { Shield, User, Users, Crown, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
      <div className='flex items-center justify-center p-2'>
        <Loader2 className='w-4 h-4 animate-spin text-gray-400' />
      </div>
    );
  }

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
      <div className='flex items-center justify-center p-2'>
        <Loader2 className='w-4 h-4 animate-spin text-gray-400' />
      </div>
    );
  }

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
      <div className='flex items-center justify-center p-2'>
        <Loader2 className='w-4 h-4 animate-spin text-gray-400' />
      </div>
    );
  }

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
  loading?: boolean;
}

export const AdminGate: React.FC<AdminGateProps> = ({ children, fallback = null, showDisabled = false, loading = false }) => {
  const { isAdmin } = useRole();

  if (loading) {
    return (
      <div className='flex items-center justify-center p-2'>
        <Loader2 className='w-4 h-4 animate-spin text-gray-400' />
      </div>
    );
  }

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

interface SuperuserGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  showDisabled?: boolean;
  loading?: boolean;
}

export const SuperuserGate: React.FC<SuperuserGateProps> = ({ children, fallback = null, showDisabled = false, loading = false }) => {
  const { isSuperuser } = usePermission();

  if (loading) {
    return (
      <div className='flex items-center justify-center p-2'>
        <Loader2 className='w-4 h-4 animate-spin text-gray-400' />
      </div>
    );
  }

  if (isSuperuser) {
    return <>{children}</>;
  }

  if (showDisabled) {
    return (
      <div className='opacity-50 cursor-not-allowed' title='需要超级管理员权限'>
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

const roleConfig: Record<string, { variant: 'default' | 'destructive' | 'outline' | 'secondary'; icon: React.ElementType; label: string }> = {
  admin: { variant: 'destructive', icon: Crown, label: '管理员' },
  Admin: { variant: 'destructive', icon: Crown, label: '管理员' },
  manager: { variant: 'secondary', icon: Users, label: '经理' },
  Manager: { variant: 'secondary', icon: Users, label: '经理' },
  user: { variant: 'default', icon: User, label: '用户' },
  User: { variant: 'default', icon: User, label: '用户' },
  guest: { variant: 'outline', icon: Eye, label: '访客' },
  Guest: { variant: 'outline', icon: Eye, label: '访客' },
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md', showIcon = true }) => {
  const config = roleConfig[role] || { variant: 'outline' as const, icon: Shield, label: role };
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <Badge variant={config.variant} className={`${sizeClasses[size]} gap-1`}>
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
};

// 权限徽章组件 - 用于显示权限
interface PermissionBadgeProps {
  permission: string;
  size?: 'sm' | 'md';
}

export const PermissionBadge: React.FC<PermissionBadgeProps> = ({ permission, size = 'sm' }) => {
  const [module, action] = permission.split(':');

  const actionColors: Record<string, string> = {
    read: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    write: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };

  const colorClass = actionColors[action] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
  };

  return (
    <span className={`${colorClass} ${sizeClasses[size]} rounded font-medium`}>
      {module}:{action}
    </span>
  );
};
