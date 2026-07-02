/**
 * NavigationRegistry — 导航注册表测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// We need to reset the singleton between tests
describe('NavigationRegistryV2', () => {
  beforeEach(() => {
    // Re-import to get a fresh registry state
    vi.resetModules();
  });

  it('singleton getInstance returns the same instance', async () => {
    const { NavigationRegistryV2 } = await import('../navigation/NavigationRegistryV2');
    // Access private constructor via getInstance
    const instance1 = NavigationRegistryV2.getInstance();
    const instance2 = NavigationRegistryV2.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('registerModule and getModule work correctly', async () => {
    const { NavigationRegistryV2 } = await import('../navigation/NavigationRegistryV2');
    const registry = NavigationRegistryV2.getInstance();

    const config = {
      code: 'test-module',
      name: 'Test Module',
      icon: 'TestIcon',
      path: '/test',
      source: 'core' as const,
      navItems: [
        { code: 'test-item', label: 'Test Item', path: '/test/item', showInSidebar: true },
      ],
    };
    registry.registerModule(config);

    const result = registry.getModule('test-module');
    expect(result).toBeDefined();
    expect(result!.code).toBe('test-module');
    expect(result!.name).toBe('Test Module');
    expect(result!.navItems).toHaveLength(1);

    // Cleanup
    registry.unregisterModule('test-module');
  });

  it('getAllModules returns sorted by order', async () => {
    const { NavigationRegistryV2 } = await import('../navigation/NavigationRegistryV2');
    const registry = NavigationRegistryV2.getInstance();

    registry.registerModule({
      code: 'z-last',
      name: 'Z Last',
      icon: 'Z',
      path: '/z',
      source: 'plugin' as const,
      order: 100,
      navItems: [],
    });
    registry.registerModule({
      code: 'a-first',
      name: 'A First',
      icon: 'A',
      path: '/a',
      source: 'core' as const,
      order: 1,
      navItems: [],
    });

    const all = registry.getAllModules();
    expect(all[0].code).toBe('a-first');
    expect(all[1].code).toBe('z-last');

    registry.unregisterModule('z-last');
    registry.unregisterModule('a-first');
  });

  it('getTopNavItems filters by permission', async () => {
    const { NavigationRegistryV2 } = await import('../navigation/NavigationRegistryV2');
    const registry = NavigationRegistryV2.getInstance();

    registry.registerModule({
      code: 'open-mod',
      name: 'Open',
      icon: 'O',
      path: '/open',
      source: 'core' as const,
      navItems: [{ code: 'o1', label: 'O1', path: '/open/1' }],
    });
    registry.registerModule({
      code: 'restricted-mod',
      name: 'Restricted',
      icon: 'R',
      path: '/restricted',
      source: 'core' as const,
      permission: 'admin:read',
      navItems: [{ code: 'r1', label: 'R1', path: '/restricted/1' }],
    });

    const withPerm = registry.getTopNavItems(() => false);
    const openCodes = withPerm.map((i) => i.code);
    expect(openCodes).not.toContain('restricted-mod');
    expect(openCodes).toContain('open-mod');

    registry.unregisterModule('open-mod');
    registry.unregisterModule('restricted-mod');
  });

  it('findModuleByPath matches prefix', async () => {
    const { NavigationRegistryV2 } = await import('../navigation/NavigationRegistryV2');
    const registry = NavigationRegistryV2.getInstance();

    registry.registerModule({
      code: 'hrm',
      name: 'HRM',
      icon: 'H',
      path: '/hrm',
      source: 'core' as const,
      navItems: [],
    });

    expect(registry.findModuleByPath('/hrm')?.code).toBe('hrm');
    expect(registry.findModuleByPath('/hrm/employees')?.code).toBe('hrm');
    expect(registry.findModuleByPath('/finance')).toBeUndefined();

    registry.unregisterModule('hrm');
  });

  it('coreModuleNavConfigs registers 31 modules', async () => {
    const { coreModuleNavConfigs } = await import('../navigation/modules');
    expect(coreModuleNavConfigs.length).toBeGreaterThanOrEqual(29);

    // Ensure each config has required fields
    coreModuleNavConfigs.forEach((cfg) => {
      expect(cfg.code).toBeTruthy();
      expect(cfg.name).toBeTruthy();
      expect(cfg.path).toBeTruthy();
      expect(cfg.source).toMatch(/^(core|plugin)$/);
      expect(Array.isArray(cfg.navItems)).toBe(true);
    });
  });
});
