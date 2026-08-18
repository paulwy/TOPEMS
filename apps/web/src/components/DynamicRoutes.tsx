import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { logger } from '@/utils/logger';
import { loadModuleConfig, coreModuleCodes, type RouteConfig } from '../routes';
import ProtectedRouteWrapper from './ProtectedRouteWrapper';
import PageLoader from './PageLoader';
import NotFoundPage from '@/pages/shared/NotFoundPage';
import { ModRootRedirect } from '@/lib/moduleRedirect';
import { MODULE_ROOT_TO_DASHBOARD, resolveModuleDashboard } from '@/lib/modulePathMap';
// V37.0 Phase 7: 记录用户导航历史 + 触发智能预加载
import { recordNavigation, prefetchIntelligent } from '@/lib/pwa';
// i18n 按需加载：按路由路径推断业务 NS 并预热
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

          const moduleRootPath = `/${moduleCode}`;
          if (MODULE_ROOT_TO_DASHBOARD[moduleRootPath]) {
            const dashboardPath = resolveModuleDashboard(moduleRootPath);
            const rootPathAlreadyExists = mappedRoutes.some((r) => r.path === moduleRootPath);
            if (!rootPathAlreadyExists) {
              mappedRoutes.unshift({
                path: moduleRootPath,
                element: <Navigate to={dashboardPath} replace />,
                module: moduleCode,
                action: 'read',
              });
            }
          }

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

  // V37.0 Phase 7: 记录用户导航历史 + 触发智能预加载
  useEffect(() => {
    recordNavigation(location.pathname);
    // 延迟触发智能预加载，避免与当前路由加载竞争
    const timer = setTimeout(() => prefetchIntelligent(), 2000);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // ✨ i18n 按命名空间按需加载（路径推断，缓存路由与静态路由兜底入口）
  // - 当命中 routeCache 时 loadModuleConfig 不会运行，需要在这里补齐 NS 预热
  // - 非模块路由（/dashboard, /settings 等）也能正确得到公共框架 NS
  useEffect(() => {
    const namespaces = resolveNamespacesForPath(location.pathname);
    if (namespaces.length === 0) return;
    // fire-and-forget，不阻塞 UI；内部已做幂等 + 单飞
    ensureNamespacesLoaded(namespaces).catch((e) => {
      logger.warn('[i18n] route-based namespace preload skipped', e);
    });
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
      {/* 裸段 /:mod → 模块首个 landing 页（防御 404 白屏） */}
      <Route
        path='/:mod'
        element={<ModRootRedirect />}
      />
      <Route
        path='*'
        element={<NotFoundPage />}
      />
    </Routes>
  );
};

export default DynamicRoutes;
