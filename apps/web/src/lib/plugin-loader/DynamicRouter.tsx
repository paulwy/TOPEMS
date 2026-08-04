import React, { useEffect, useState, Suspense, lazy, useCallback } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import type { PluginManifest, PluginRoute } from './PluginLoader';
import { ModuleLoadingFallback, ModuleErrorFallback, PluginLoader } from './PluginLoader';
import { moduleRegistry } from '@/modules/registry';
import { eventBus, ModuleEvents } from './EventBus';
import { logger } from '@/utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const remoteModuleCache: Map<string, CacheEntry<React.ComponentType>> = new Map();
const routeConfigCache: Map<string, DynamicRouteProps[]> = new Map();
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

  const pluginLoaderRef = React.useRef(new PluginLoader());

  const loadPluginRoutes = useCallback(
    async (manifest: PluginManifest): Promise<DynamicRouteProps[]> => {
      const pluginRoutes: DynamicRouteProps[] = [];

      if (!manifest.routes || manifest.routes.length === 0) {
        return pluginRoutes;
      }

      for (const route of manifest.routes) {
        try {
          const LazyComponent = await createPluginLazyComponent(manifest, route);
          pluginRoutes.push({
            path: route.path,
            element: (
              <Suspense fallback={<ModuleLoadingFallback />}>
                <LazyComponent />
              </Suspense>
            ),
          });
        } catch (error: unknown) {
          logger.error(`[DynamicRouter] Failed to create route for ${route.path}`, error);
          setErrors((prev) => ({
            ...prev,
            [route.path]: error instanceof Error ? error.message : 'Unknown error',
          }));
        }
      }

      return pluginRoutes;
    },
    []
  );

  const createPluginLazyComponent = async (
    manifest: PluginManifest,
    route: PluginRoute
  ): Promise<React.LazyExoticComponent<React.ComponentType>> => {
    const { frontend } = manifest;

    switch (frontend.type) {
      case 'module-federation':
        return createRemoteLazyComponent(
          frontend.entry,
          route.component,
          () => {
            eventBus.emit(ModuleEvents.MODULE_LOADED, {
              moduleId: manifest.pluginCode,
              path: route.path,
            });
          },
          (error) => {
            eventBus.emit(ModuleEvents.MODULE_ERROR, {
              moduleId: manifest.pluginCode,
              error,
            });
          }
        );

      case 'systemjs':
        return lazy(async () => {
          try {
            const module = await pluginLoaderRef.current.loadBundle(frontend);
            const Component = module[route.component] || module.default;
            eventBus.emit(ModuleEvents.MODULE_LOADED, {
              moduleId: manifest.pluginCode,
              path: route.path,
            });
            return { default: Component };
          } catch (error: unknown) {
            eventBus.emit(ModuleEvents.MODULE_ERROR, {
              moduleId: manifest.pluginCode,
              error: error as Error,
            });
            throw error;
          }
        });

      case 'umd':
        return lazy(async () => {
          try {
            const module = await pluginLoaderRef.current.loadBundle(frontend);
            const Component = module[route.component] || module.default;
            eventBus.emit(ModuleEvents.MODULE_LOADED, {
              moduleId: manifest.pluginCode,
              path: route.path,
            });
            return { default: Component };
          } catch (error: unknown) {
            eventBus.emit(ModuleEvents.MODULE_ERROR, {
              moduleId: manifest.pluginCode,
              error: error as Error,
            });
            throw error;
          }
        });

      default:
        throw new Error(`Unsupported frontend type: ${frontend.type}`);
    }
  };

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
      <div style={{ padding: '20px' }}>
        {Object.entries(errors).map(([path, message]) => (
          <div
            key={path}
            style={{ color: 'error.main', marginBottom: '10px' }}
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

export interface RemoteConfig {
  name: string;
  url: string;
}

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
