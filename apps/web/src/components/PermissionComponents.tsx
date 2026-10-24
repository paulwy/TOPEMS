import type { ReactNode } from 'react';

interface WithPermissionOptions {
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showDisabled?: boolean;
  loadingFallback?: ReactNode;
}

interface RequirePermissionProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showDisabled?: boolean;
  loading?: boolean;
  onDenied?: () => void;
}

interface PermissionGuardProps {
  children: ReactNode;
  permissions?: string[];
  requireAll?: boolean;
  fallbackPath?: string;
  fallbackComponent?: ReactNode;
}

interface ModulePermissionGuardProps {
  children: ReactNode;
  module: string;
  action?: 'read' | 'write' | 'delete' | 'approve' | 'admin';
  fallbackComponent?: ReactNode;
}

interface ConditionalRenderProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  children: ReactNode;
  else?: ReactNode;
}
