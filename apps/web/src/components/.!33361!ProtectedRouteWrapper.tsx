import React from 'react';
import { ModuleGate } from './PermissionGate';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { GlobalLayoutV3 } from '../layouts/GlobalLayoutV3';
import type { RouteConfig } from '../routes';

interface ProtectedRouteWrapperProps {
  route: RouteConfig;
  children: React.ReactNode;
}

const ProtectedRouteWrapper: React.FC<ProtectedRouteWrapperProps> = ({ route, children }) => {
  const permissions = route.requiredPermissions || [];
  const hasModuleGate = route.module && route.action;

  const renderContent = (withLayout: boolean) => {
    const content = hasModuleGate ? (
      <ModuleGate
        module={route.module!}
        action={route.action!}
      >
        {withLayout ? <GlobalLayoutV3>{children}</GlobalLayoutV3> : children}
      </ModuleGate>
    ) : withLayout ? (
      <GlobalLayoutV3>{children}</GlobalLayoutV3>
    ) : (
      children
    );
    return <ProtectedRoute requiredPermissions={permissions}>{content}</ProtectedRoute>;
  };

