import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { logger } from '@/utils/logger';
import { loadModuleConfig, coreModuleCodes, type RouteConfig } from '../routes';
import ProtectedRouteWrapper from './ProtectedRouteWrapper';
import PageLoader from './PageLoader';
import NotFoundPage from '@/pages/shared/NotFoundPage';
import { ModRootRedirect } from '@/lib/moduleRedirect';
import { MODULE_ROOT_TO_DASHBOARD, resolveModuleDashboard } from '@/lib/modulePathMap';
import { recordNavigation, prefetchIntelligent } from '@/lib/pwa';
import { ensureNamespacesLoaded, resolveNamespacesForPath } from '@/i18n';

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
    const namespaces = resolveNamespacesForPath(location.pathname);

    const loadAll = async () => {
      setLoading(true);
      try {
        // Phase 1: Ensure i18n namespaces are loaded BEFORE rendering
        // This prevents pages from showing raw i18n keys
        const phase1Namespaces = new Set(namespaces);
        if (moduleCode) {
          phase1Namespaces.add(moduleCode);
        }
        if (phase1Namespaces.size > 0) {
          await ensureNamespacesLoaded(Array.from(phase1Namespaces));
        }

        // Phase 2: Load or restore routes
        if (moduleCode) {
          if (prevModuleRef.current === moduleCode && routeCacheRef.current.has(moduleCode)) {
            logger.info(`[Dynamic Routes] Using cached routes for: ${moduleCode}`);
            setRoutes(routeCacheRef.current.get(moduleCode) || []);
            prevModuleRef.current = moduleCode;
          } else {
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

            const moduleRootPath = `/${moduleCode}`;
            if (MODULE_ROOT_TO_DASHBOARD[moduleRootPath]) {
              const dashboardPath = resolveModuleDashboard(moduleRootPath);
              const rootPathAlreadyExists = mappedRoutes.some((r) => r.path === moduleRootPath);
              if (!rootPathAlreadyExists) {
                mappedRoutes.unshift({
                  path: moduleRootPath,
                  element: (
                    <Navigate
                      to={dashboardPath}
                      replace
                    />
                  ),
                  module: moduleCode,
                  action: 'read',
                });
              }
            }

            routeCacheRef.current.set(moduleCode, mappedRoutes);
            setRoutes(mappedRoutes);
            prevModuleRef.current = moduleCode;
          }
        }
      } catch (error) {
        logger.error('[Dynamic Routes] Failed to load routes', error);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [location.pathname]);

