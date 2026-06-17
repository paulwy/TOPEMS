/**
 * DynamicRouter - Module Federation aware router
 *
 * Supports loading remote modules via Module Federation
 * and fallback to static imports for local modules.
 */

import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Route, useLocation } from 'react-router-dom';
import { ModuleLoadingFallback } from './ModuleLoader';
import { moduleRegistry } from '../registry';
import { eventBus, ModuleEvents } from './EventBus';

// Remote module container type
interface RemoteContainer {
  init: (shareScope: unknown) => Promise<void>;
  get: (modulePath: string) => () => Promise<{ default: React.ComponentType }>;
}

// Global types injected by Module Federation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const __webpack_share_scopes__: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const __webpack_init_sharing__: (scope: string) => Promise<void>;

// Cache for loaded remote modules
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const remoteModuleCache: Map<string, any> = new Map();

/**
 * Load a remote module via Module Federation
 */
async function loadRemoteModule(
  remoteName: string,
  modulePath: string
): Promise<React.ComponentType> {
  const cacheKey = `${remoteName}:${modulePath}`;

  if (remoteModuleCache.has(cacheKey)) {
    return remoteModuleCache.get(cacheKey);
  }

  try {
    await __webpack_init_sharing__('default');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const container = (window as any)[remoteName] as RemoteContainer | undefined;

    if (!container) {
      throw new Error(
        `Remote module "${remoteName}" not found. Make sure the remote is loaded.`
      );
    }

    await container.init(__webpack_share_scopes__.default);
    const factory = await container.get(modulePath);
    const module = await factory();

    // Handle both default export and module object
    const resolvedModule = module.default || module;
    remoteModuleCache.set(cacheKey, resolvedModule);

    return resolvedModule;
  } catch (error) {
    console.error(
      `[DynamicRouter] Failed to load remote module ${remoteName}:${modulePath}`,
      error
    );
    throw error;
  }
}

/**
 * Create a lazy component from a remote module
 */
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
    } catch (error) {
      onError?.(error as Error);
      throw error;
    }
  });
}

interface DynamicRouteProps {
  path: string;
  element: React.ComponentType;
}

export const DynamicRouter: React.FC = () => {
  const [routes, setRoutes] = useState<DynamicRouteProps[]>([]);
  const location = useLocation();

  useEffect(() => {
    const loadRoutes = () => {
      const moduleRoutes = moduleRegistry.getAllRoutes();
      const dynamicRoutes: DynamicRouteProps[] = moduleRoutes.map((route) => {
        const moduleConfig = moduleRegistry.getModuleByRoutePath(route.path);

        if (moduleConfig?.remoteEntry) {
          // Remote module via Module Federation
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

          return {
            path: route.path,
            element: () => (
              <Suspense fallback={<ModuleLoadingFallback />}>
                <LazyComponent />
              </Suspense>
            ),
          };
        }

        // Static local module
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

        return {
          path: route.path,
          element: () => (
            <Suspense fallback={<ModuleLoadingFallback />}>
              <LazyComponent />
            </Suspense>
          ),
        };
      });
      setRoutes(dynamicRoutes);
    };

    loadRoutes();

    const handleModuleLoaded = (data: { moduleId: string }) => {
      console.log(`[DynamicRouter] Module loaded: ${data.moduleId}`);
    };

    const handleModuleError = (data: {
      moduleId: string;
      error: Error;
    }) => {
      console.error(
        `[DynamicRouter] Module load error: ${data.moduleId}`,
        data.error
      );
    };

    eventBus.on(ModuleEvents.MODULE_LOADED, handleModuleLoaded);
    eventBus.on(ModuleEvents.MODULE_ERROR, handleModuleError);

    return () => {
      eventBus.off(ModuleEvents.MODULE_LOADED, handleModuleLoaded);
      eventBus.off(ModuleEvents.MODULE_ERROR, handleModuleError);
    };
  }, []);

  useEffect(() => {
    console.log(`[DynamicRouter] Navigated to: ${location.pathname}`);
  }, [location]);

  return (
    <>
      {routes.map((route) => (
        <Route key={route.path} path={route.path} element={<route.element />} />
      ))}
    </>
  );
};

// ============================================================================
// Host Shell Remote Loader
// ============================================================================

/**
 * Remote module configuration
 */
export interface RemoteConfig {
  name: string;
  url: string;
}

/**
 * Preload remote modules for the Host Shell
 */
export async function preloadRemoteModules(): Promise<void> {
  const remotes = moduleRegistry.getRemoteModules();

  await Promise.all(
    remotes.map(async (remote) => {
      try {
        await loadRemoteModule(remote.name, './store');
        console.log(`[DynamicRouter] Preloaded remote: ${remote.name}`);
      } catch (error) {
        console.warn(
          `[DynamicRouter] Failed to preload remote: ${remote.name}`,
          error
        );
      }
    })
  );
}

/**
 * Load a specific remote module page
 */
export async function loadRemotePage(
  remoteName: string,
  pagePath: string
): Promise<React.ComponentType> {
  return loadRemoteModule(remoteName, pagePath);
}

// ============================================================================
// Legacy compatibility export
// ============================================================================

export { DynamicRouter as default };
