import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import type { PluginManifest } from './PluginLoader';
import { ModuleLoadingFallback, PluginLoader } from './PluginLoader';
import { moduleRegistry } from '@/modules/registry';
import { eventBus, ModuleEvents } from './eventBus';
import { logger } from '@/utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const remoteModuleCache: Map<string, CacheEntry<React.ComponentType>> = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 100;

function cleanupOldCache(): void {
  const now = Date.now();

  remoteModuleCache.forEach((entry, key) => {
    if (entry.expiresAt < now) {
      remoteModuleCache.delete(key);
    }
  });

  if (remoteModuleCache.size > MAX_CACHE_SIZE) {
    const oldestKeys = Array.from(remoteModuleCache.keys()).sort(
      (a, b) =>
        (remoteModuleCache.get(a)?.timestamp || 0) - (remoteModuleCache.get(b)?.timestamp || 0)
    );
    const keysToRemove = oldestKeys.slice(0, remoteModuleCache.size - MAX_CACHE_SIZE);
    keysToRemove.forEach((key) => remoteModuleCache.delete(key));
  }
}

async function loadRemoteModule(
  remoteName: string,
  modulePath: string,
  forceRefresh = false
): Promise<React.ComponentType> {
  const cacheKey = `${remoteName}:${modulePath}`;

  if (!forceRefresh && remoteModuleCache.has(cacheKey)) {
    const entry = remoteModuleCache.get(cacheKey)!;
    if (entry.expiresAt > Date.now()) {
      return entry.data;
    }
    remoteModuleCache.delete(cacheKey);
  }

  try {
    await WebpackInitSharing('default');

    const container = (window as Record<string, WebpackContainer | undefined>)[remoteName];

    if (!container) {
      throw new Error(`Remote module "${remoteName}" not found. Make sure the remote is loaded.`);
    }

    await container.init(WebpackShareScopes.default);
    const factory = await container.get(modulePath);
    const module = await factory();

    const resolvedModule = (module as unknown as Record<string, unknown>).default || module;
    const now = Date.now();
    remoteModuleCache.set(cacheKey, {
      data: resolvedModule as React.ComponentType,
      timestamp: now,
      expiresAt: now + CACHE_TTL,
    });

    cleanupOldCache();

    return resolvedModule as React.ComponentType;
  } catch (error: unknown) {
    logger.error(`[DynamicRouter] Failed to load remote module ${remoteName}:${modulePath}`, error);
    throw error;
  }
}

function createRemoteLazyComponent(
  remoteName: string,
  modulePath: string,
  onLoad?: () => void,
  onError?: (error: Error) => void
): React.LazyExoticComponent<React.ComponentType> {
  return lazy(async () => {
    try {
      const Component = await loadRemoteModule(remoteName, modulePath);
      onLoad?.();
      return { default: Component };
    } catch (error: unknown) {
      onError?.(error as Error);
      throw error;
    }
  });
}

interface DynamicRouteProps {
  path: string;
  element: React.ReactElement;
}

export const DynamicRouter: React.FC = () => {
  const [routes, setRoutes] = useState<DynamicRouteProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const location = useLocation();

  useEffect(() => {
    const loadRoutes = async () => {
      setLoading(true);
      setErrors({});

      const moduleRoutes = moduleRegistry.getAllRoutes();
      const dynamicRoutes: DynamicRouteProps[] = [];

      for (const route of moduleRoutes) {
        const moduleConfig = moduleRegistry.getModuleByRoutePath(route.path);

        if (moduleConfig?.remoteEntry) {
          const LazyComponent = createRemoteLazyComponent(
            moduleConfig.entry,
            route.componentPath || `./pages/${route.componentName}`,
            () => {
              eventBus.emit(ModuleEvents.MODULE_LOADED, {
                moduleId: route.path,
                path: route.path,
              });
            },
            (error) => {
              eventBus.emit(ModuleEvents.MODULE_ERROR, {
                moduleId: route.path,
                error,
              });
            }
          );

          dynamicRoutes.push({
            path: route.path,
            element: (
              <Suspense fallback={<ModuleLoadingFallback />}>
                <LazyComponent />
              </Suspense>
            ),
          });
        } else {
          const LazyComponent = lazy(() =>
            route
              .component()
              .then((mod) => {
                eventBus.emit(ModuleEvents.MODULE_LOADED, {
                  moduleId: route.path,
                  path: route.path,
                });
                return { default: mod.default || mod };
              })
              .catch((error) => {
                eventBus.emit(ModuleEvents.MODULE_ERROR, {
                  moduleId: route.path,
                  error,
                });
                throw error;
              })
          );

          dynamicRoutes.push({
            path: route.path,
            element: (
              <Suspense fallback={<ModuleLoadingFallback />}>
                <LazyComponent />
              </Suspense>
            ),
          });
        }
      }

      setRoutes(dynamicRoutes);
      setLoading(false);
    };

    loadRoutes();

    const handleModuleLoaded = (data: { moduleId: string }) => {
      logger.info(`[DynamicRouter] Module loaded: ${data.moduleId}`);
    };

    const handleModuleError = (data: { moduleId: string; error: Error }) => {
      logger.error(`[DynamicRouter] Module load error: ${data.moduleId}`, data.error);
    };

    eventBus.on(ModuleEvents.MODULE_LOADED, handleModuleLoaded);
    eventBus.on(ModuleEvents.MODULE_ERROR, handleModuleError);

    return () => {
      eventBus.off(ModuleEvents.MODULE_LOADED, handleModuleLoaded);
      eventBus.off(ModuleEvents.MODULE_ERROR, handleModuleError);
    };
  }, []);

  useEffect(() => {
    logger.info(`[DynamicRouter] Navigated to: ${location.pathname}`);
  }, [location]);

  if (loading) {
    return <ModuleLoadingFallback />;
  }

  if (Object.keys(errors).length > 0) {
    return (
      <div style={{ padding: 5 }}>
        {Object.entries(errors).map(([path, message]) => (
          <div
            key={path}
            style={{ color: 'error.main', marginBottom: 2.5 }}
          >
            {path}: {message}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Routes>
      {routes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={route.element}
        />
      ))}
    </Routes>
  );
};

export async function preloadRemoteModules(): Promise<void> {
  const remotes = moduleRegistry.getRemoteModules();

  await Promise.all(
    remotes.map(async (remote) => {
      try {
        await loadRemoteModule(remote.name, './store');
        logger.info(`[DynamicRouter] Preloaded remote: ${remote.name}`);
      } catch (error: unknown) {
        logger.warn(`[DynamicRouter] Failed to preload remote: ${remote.name}`, error);
      }
    })
  );
}

export async function loadRemotePage(
  remoteName: string,
  pagePath: string
): Promise<React.ComponentType> {
  return loadRemoteModule(remoteName, pagePath);
}

export async function loadPluginFromManifest(manifestUrl: string): Promise<PluginManifest> {
  const pluginLoader = new PluginLoader();
  return pluginLoader.loadManifest(manifestUrl);
}

export { DynamicRouter as default };
