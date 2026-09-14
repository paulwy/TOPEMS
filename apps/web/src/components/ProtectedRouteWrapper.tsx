import React from 'react';
import { ModuleGate } from './PermissionGate';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { SmartLayout } from '../layouts/SmartLayout';
import { AdaptiveLayout, isUIV3Enabled } from '../layouts';
import type { RouteConfig } from '../routes';

interface ProtectedRouteWrapperProps {
  route: RouteConfig;
  children: React.ReactNode;
}

const ProtectedRouteWrapper: React.FC<ProtectedRouteWrapperProps> = ({ route, children }) => {
  const permissions = route.requiredPermissions || [];
  const hasModuleGate = route.module && route.action;
  const v3Enabled = isUIV3Enabled();

  const renderContent = (withLayout: boolean) => {
    // V3 布局：使用 AdaptiveLayout（GlobalLayoutV3 / MobileLayoutV3）
    const LayoutWrapper = v3Enabled ? AdaptiveLayout : SmartLayout;

    const content = hasModuleGate ? (
      <ModuleGate
        module={route.module!}
        action={route.action!}
      >
        {withLayout ? <LayoutWrapper>{children}</LayoutWrapper> : children}
      </ModuleGate>
    ) : withLayout ? (
      <LayoutWrapper>{children}</LayoutWrapper>
    ) : (
      children
    );
    return <ProtectedRoute requiredPermissions={permissions}>{content}</ProtectedRoute>;
  };

  if (route.module === 'mobile') {
    return renderContent(false);
  }

  return renderContent(true);
};

export default ProtectedRouteWrapper;
