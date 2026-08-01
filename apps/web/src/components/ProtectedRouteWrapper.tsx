import React, { Suspense } from 'react';
import { ModuleGate } from './PermissionGate';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { SmartLayout } from '../layouts/SmartLayout';
import PageLoader from './PageLoader';
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
        {withLayout ? <SmartLayout>{children}</SmartLayout> : children}
      </ModuleGate>
    ) : withLayout ? (
      <SmartLayout>{children}</SmartLayout>
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
