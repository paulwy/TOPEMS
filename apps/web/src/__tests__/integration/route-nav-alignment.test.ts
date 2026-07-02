import { describe, it, expect } from 'vitest';
import { coreModuleRoutes, getAllRoutes } from '@/routes/v2';
import { coreModuleNavConfigs } from '@/lib/navigation/modules';
import { flattenRoutes } from '@/routes/v2/types';

describe('Route-Navigation Alignment', () => {
  it('should have matching routes for navigation config paths', () => {
    const routePathMap = new Map<string, string>();
    getAllRoutes().forEach((route) => {
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

  it('should have consistent codes between routes and navigation', () => {
    const routeCodeMap = new Map<string, string>();
    getAllRoutes().forEach((route) => {
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
});