import type { ReactNode } from 'react';

export interface WithPermissionOptions {
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showDisabled?: boolean;
  loadingFallback?: ReactNode;
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

export interface PermissionGuardProps {
  children: ReactNode;
  permissions?: string[];
  requireAll?: boolean;
  fallbackPath?: string;
  fallbackComponent?: ReactNode;
}

export interface ModulePermissionGuardProps {
  children: ReactNode;
  module: string;
  action?: 'read' | 'write' | 'delete' | 'approve' | 'admin';
  fallbackComponent?: ReactNode;
}

export interface ConditionalRenderProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  children: ReactNode;
  else?: ReactNode;
}
