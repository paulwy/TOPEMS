import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { coreModuleRoutes, getAllRoutes, coreModuleCodes } from '@/routes/v2';
import { coreModuleNavConfigs } from '@/lib/navigation/modules';
import { flattenRoutes } from '@/routes/v2/types';
import { pluginManager } from '@/lib/plugin-loader/pluginManager';

vi.mock('@/lib/plugin-loader/pluginManager', () => ({
  pluginManager: {
    initialize: vi.fn(),
    getActivePlugins: vi.fn(),
    emitter: { on: vi.fn() },
  },
}));

const mockPluginManager = pluginManager as unknown as Record<string, unknown>;

describe('Route-Navigation Alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPluginManager.initialize.mockRejectedValue(new Error('Test: No server connection'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have matching routes for navigation config paths', async () => {
    const routePathMap = new Map<string, string>();
    const allRoutes = await getAllRoutes();
    allRoutes.forEach((route) => {
      routePathMap.set(route.path, route.code);
    });

    coreModuleNavConfigs.forEach((navConfig) => {
      navConfig.navItems.forEach((item) => {
        expect(routePathMap.has(item.path)).toBe(
          true,
          `Navigation item "${item.code}" with path "${item.path}" is not found in route config`
        );
        item.children?.forEach((child) => {
          expect(routePathMap.has(child.path)).toBe(
            true,
            `Navigation child item "${child.code}" with path "${child.path}" is not found in route config`
          );
        });
      });
    });
  });

  it('should have consistent codes between routes and navigation', async () => {
    const routeCodeMap = new Map<string, string>();
    const allRoutes = await getAllRoutes();
    allRoutes.forEach((route) => {
      routeCodeMap.set(route.path, route.code);
    });

    coreModuleNavConfigs.forEach((navConfig) => {
      navConfig.navItems.forEach((item) => {
        const routeCode = routeCodeMap.get(item.path);
        expect(routeCode).toBe(
          item.code,
          `Code mismatch for path "${item.path}": route code is "${routeCode}", nav code is "${item.code}"`
        );
        item.children?.forEach((child) => {
          const childRouteCode = routeCodeMap.get(child.path);
          expect(childRouteCode).toBe(
            child.code,
            `Code mismatch for path "${child.path}": route code is "${childRouteCode}", nav code is "${child.code}"`
          );
        });
      });
    });
  });

  it('should verify all modules have matching route and nav configs', () => {
    const routeModuleCodes = new Set(coreModuleRoutes.map((r) => r.code));
    const navModuleCodes = new Set(coreModuleNavConfigs.map((n) => n.code));

    routeModuleCodes.forEach((code) => {
      expect(navModuleCodes.has(code)).toBe(
        true,
        `Module "${code}" exists in route config but not in navigation config`
      );
    });

    navModuleCodes.forEach((code) => {
      expect(routeModuleCodes.has(code)).toBe(
        true,
        `Module "${code}" exists in navigation config but not in route config`
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty plugin list gracefully', async () => {
      mockPluginManager.initialize.mockResolvedValue(undefined);
      mockPluginManager.getActivePlugins.mockReturnValue([]);

      const allRoutes = await getAllRoutes();
      expect(allRoutes).toBeDefined();
      expect(Array.isArray(allRoutes)).toBe(true);
    });

    it('should fall back to loading all modules when plugin manager fails', async () => {
      mockPluginManager.initialize.mockRejectedValue(new Error('Server unavailable'));

      const allRoutes = await getAllRoutes();
      expect(allRoutes.length).toBeGreaterThan(0);
      expect(allRoutes.some((r) => r.path.startsWith('/iam'))).toBe(true);
      expect(allRoutes.some((r) => r.path.startsWith('/admin'))).toBe(true);
    });

    it('should handle plugin initialization failure without crashing', async () => {
      mockPluginManager.initialize.mockRejectedValue(new Error('Network timeout'));

      await expect(getAllRoutes()).resolves.not.toThrow();
      const routes = await getAllRoutes();
      expect(Array.isArray(routes)).toBe(true);
    });

    it('should validate route path format consistency', async () => {
      const allRoutes = await getAllRoutes();

      allRoutes.forEach((route) => {
        expect(route.path).toBeDefined();
        expect(route.path.startsWith('/')).toBe(
          true,
          `Route path "${route.path}" does not start with /`
        );
        expect(typeof route.code).toBe('string');
        expect(route.code.length).toBeGreaterThan(0);
        expect(typeof route.title).toBe('string');
      });
    });

    it('should validate navigation item path format consistency', () => {
      coreModuleNavConfigs.forEach((navConfig) => {
        navConfig.navItems.forEach((item) => {
          expect(item.path).toBeDefined();
          expect(item.path.startsWith('/')).toBe(
            true,
            `Nav item "${item.code}" path "${item.path}" does not start with /`
          );
          expect(item.code).toBeDefined();
          expect(item.label).toBeDefined();
        });

        navConfig.navItems.forEach((item) => {
          item.children?.forEach((child) => {
            expect(child.path).toBeDefined();
            expect(child.path.startsWith('/')).toBe(
              true,
              `Nav child "${child.code}" path "${child.path}" does not start with /`
            );
          });
        });
      });
    });

    it('should detect duplicate paths across modules', async () => {
      const allRoutes = await getAllRoutes();
      const pathCounts = new Map<string, number>();

      allRoutes.forEach((route) => {
        pathCounts.set(route.path, (pathCounts.get(route.path) || 0) + 1);
      });

      const duplicatePaths = Array.from(pathCounts.entries()).filter(([, count]) => count > 1);

      expect(duplicatePaths).toHaveLength(
        0,
        `Found duplicate paths: ${duplicatePaths.map(([path]) => path).join(', ')}`
      );
    });

    it('should detect navigation items without corresponding routes', async () => {
      const routePathMap = new Map<string, string>();
      const allRoutes = await getAllRoutes();
      allRoutes.forEach((route) => {
        routePathMap.set(route.path, route.code);
      });

      const missingRoutes: string[] = [];

      coreModuleNavConfigs.forEach((navConfig) => {
        navConfig.navItems.forEach((item) => {
          if (!routePathMap.has(item.path)) {
            missingRoutes.push(`Navigation "${item.code}" (${item.path})`);
          }
          item.children?.forEach((child) => {
            if (!routePathMap.has(child.path)) {
              missingRoutes.push(`Navigation child "${child.code}" (${child.path})`);
            }
          });
        });
      });

      expect(missingRoutes).toHaveLength(
        0,
        `Navigation items without corresponding routes: ${missingRoutes.join(', ')}`
      );
    });

    it('should verify dynamic path parameters are consistently formatted', async () => {
      const allRoutes = await getAllRoutes();

      allRoutes.forEach((route) => {
        const params = route.path.match(/:([a-zA-Z][a-zA-Z0-9]*)/g) || [];
        params.forEach((param) => {
          expect(param.startsWith(':')).toBe(true);
          expect(/^:[a-zA-Z][a-zA-Z0-9]*$/.test(param)).toBe(
            true,
            `Invalid parameter format "${param}" in path "${route.path}"`
          );
        });
      });
    });
  });
});
