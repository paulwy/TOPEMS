import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { logger } from '@/utils/logger';
import { loadModuleConfig, coreModuleCodes, type RouteConfig } from '../routes';
import ProtectedRouteWrapper from './ProtectedRouteWrapper';
import PageLoader from './PageLoader';

const DynamicRoutes: React.FC = () => {
  const [routes, setRoutes] = useState<RouteConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const routeCacheRef = useRef<Map<string, RouteConfig[]>>(new Map());
  const prevModuleRef = useRef<string | null>(null);

  const detectModuleFromPath = (path: string): string | null => {
    const pathParts = path.split('/').filter((p) => p);
    if (pathParts.length === 0) return null;
    const firstPart = pathParts[0];
    if (coreModuleCodes.includes(firstPart as (typeof coreModuleCodes)[number])) {
      return firstPart;
    }
    return null;
  };

  useEffect(() => {
    const moduleCode = detectModuleFromPath(location.pathname);

    if (prevModuleRef.current === moduleCode && routeCacheRef.current.has(moduleCode || '')) {
      setRoutes(routeCacheRef.current.get(moduleCode || '') || []);
      setLoading(false);
      return;
    }

    const loadRoutes = async () => {
      setLoading(true);
      try {
        if (moduleCode) {
          const cachedRoutes = routeCacheRef.current.get(moduleCode);
          if (cachedRoutes) {
            logger.info(`[Dynamic Routes] Using cached routes for: ${moduleCode}`);
            setRoutes(cachedRoutes);
            prevModuleRef.current = moduleCode;
            setLoading(false);
            return;
          }

          logger.info(`[Dynamic Routes] Loading module: ${moduleCode}`);
          const moduleConfig = await loadModuleConfig(moduleCode);
          const flatRoutes = moduleConfig.routes.flatMap((route) => {
            const flatten = (r: typeof route): (typeof route)[] => [
              r,
              ...(r.children || []).flatMap(flatten),
            ];
            return flatten(route);
          });
          const mappedRoutes: RouteConfig[] = flatRoutes.map((route) => ({
            path: route.path,
            element: route.element,
            requiredPermissions: route.requiredPermissions,
            module: route.module,
            action: route.action,
          }));
          routeCacheRef.current.set(moduleCode, mappedRoutes);
          setRoutes(mappedRoutes);
          prevModuleRef.current = moduleCode;
        }
      } catch (error) {
        logger.error('[Dynamic Routes] Failed to load routes', error);
      } finally {
        setLoading(false);
      }
    };

    loadRoutes();
  }, [location.pathname]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Routes>
      {routes.map((route) => {
        const { element } = route;
        const Element = element as React.ComponentType;
        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <ProtectedRouteWrapper route={route}>
                <React.Suspense fallback={<PageLoader />}>
                  <Element />
                </React.Suspense>
              </ProtectedRouteWrapper>
            }
          />
        );
      })}
    </Routes>
  );
};

export default DynamicRoutes;
