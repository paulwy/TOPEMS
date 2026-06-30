import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  navigationRegistry,
  type NavItem,
  type ModuleCardConfig,
  type PluginNavConfig,
} from '@/lib/NavigationRegistry';

// The NavigationRegistry is a singleton; navigationRegistry is the exported instance.
// To get clean state, we register/unregister specific test codes and clean up after.

const TEST_CODE = `test_${Date.now()}`;
const TEST_CODE_2 = `test2_${Date.now()}`;

const sampleTopNav: NavItem[] = [
  {
    code: `${TEST_CODE}-dashboard`,
    label: 'Test Dashboard',
    path: `/${TEST_CODE}/dashboard`,
    group: 'core',
    order: 1,
  },
  {
    code: `${TEST_CODE}-analytics`,
    label: 'Test Analytics',
    path: `/${TEST_CODE}/analytics`,
    group: 'core',
    order: 2,
  },
];

const sampleSidebar: NavItem[] = [
  { code: `${TEST_CODE}-overview`, label: 'Overview', path: `/${TEST_CODE}/overview`, order: 1 },
  { code: `${TEST_CODE}-settings`, label: 'Settings', path: `/${TEST_CODE}/settings`, order: 2 },
];

const sampleModuleCard: ModuleCardConfig = {
  order: 999,
  code: TEST_CODE,
  name: 'Test CRM',
  icon: 'test-icon',
  path: `/${TEST_CODE}`,
  status: 'online',
  source: 'plugin',
  suite: 'crm',
};

const sampleConfig: PluginNavConfig = {
  top_nav: sampleTopNav,
  sidebar_nav: sampleSidebar,
  module_card: sampleModuleCard,
};

describe('NavigationRegistry', () => {
  beforeEach(() => {
    // Clean up any previous test registrations
    navigationRegistry.unregister(TEST_CODE);
    navigationRegistry.unregister(TEST_CODE_2);
  });

  afterEach(() => {
    // Always clean up
    navigationRegistry.unregister(TEST_CODE);
    navigationRegistry.unregister(TEST_CODE_2);
  });

  describe('register / unregister', () => {
    it('should register a module with top_nav', () => {
      navigationRegistry.register(TEST_CODE, { top_nav: sampleTopNav });
      const items = navigationRegistry.getTopNavItems();
      // Filter to only our test items
      const ourItems = items.filter((i) => i.code.startsWith(TEST_CODE));
      expect(ourItems).toHaveLength(2);
      expect(ourItems[0].code).toBe(`${TEST_CODE}-dashboard`);
    });

    it('should register a module with sidebar_nav', () => {
      navigationRegistry.register(TEST_CODE, { sidebar_nav: sampleSidebar });
      const items = navigationRegistry.getSidebarNavItems(TEST_CODE);
      expect(items).toHaveLength(2);
      expect(items[0].code).toBe(`${TEST_CODE}-overview`);
    });

    it('should register a module with module_card', () => {
      navigationRegistry.register(TEST_CODE, { module_card: sampleModuleCard });
      const card = navigationRegistry.getModuleCard(TEST_CODE);
      expect(card).toBeDefined();
      expect(card?.name).toBe('Test CRM');
      expect(card?.status).toBe('online');
    });

    it('should register a full config', () => {
      navigationRegistry.register(TEST_CODE, sampleConfig);
      const topItems = navigationRegistry
        .getTopNavItems()
        .filter((i) => i.code.startsWith(TEST_CODE));
      expect(topItems).toHaveLength(2);
      expect(navigationRegistry.getSidebarNavItems(TEST_CODE)).toHaveLength(2);
      expect(navigationRegistry.getModuleCard(TEST_CODE)?.name).toBe('Test CRM');
    });

    it('should overwrite on duplicate registration', () => {
      navigationRegistry.register(TEST_CODE, { top_nav: sampleTopNav });
      navigationRegistry.register(TEST_CODE, {
        top_nav: [
          {
            code: `${TEST_CODE}-new`,
            label: 'New',
            path: `/${TEST_CODE}/new`,
            group: 'core',
            order: 1,
          },
        ],
      });
      const items = navigationRegistry.getTopNavItems().filter((i) => i.code.startsWith(TEST_CODE));
      expect(items).toHaveLength(1);
      expect(items[0].code).toBe(`${TEST_CODE}-new`);
    });

    it('should unregister a module completely', () => {
      navigationRegistry.register(TEST_CODE, sampleConfig);
      navigationRegistry.unregister(TEST_CODE);

      const topItems = navigationRegistry
        .getTopNavItems()
        .filter((i) => i.code.startsWith(TEST_CODE));
      expect(topItems).toHaveLength(0);
      expect(navigationRegistry.getSidebarNavItems(TEST_CODE)).toHaveLength(0);
      expect(navigationRegistry.getModuleCard(TEST_CODE)).toBeUndefined();
    });
  });

  describe('getTopNavItems', () => {
    it('should return items sorted by order', () => {
      navigationRegistry.register(TEST_CODE, {
        top_nav: [
          { code: `${TEST_CODE}-b`, label: 'B', path: `/${TEST_CODE}/b`, group: 'core', order: 2 },
          { code: `${TEST_CODE}-a`, label: 'A', path: `/${TEST_CODE}/a`, group: 'core', order: 1 },
        ],
      });
      const ourItems = navigationRegistry
        .getTopNavItems()
        .filter((i) => i.code.startsWith(TEST_CODE));
      expect(ourItems[0].code).toBe(`${TEST_CODE}-a`);
      expect(ourItems[1].code).toBe(`${TEST_CODE}-b`);
    });

    it('should combine top_nav from multiple modules', () => {
      navigationRegistry.register(TEST_CODE, {
        top_nav: [
          { code: TEST_CODE, label: 'Test1', path: `/${TEST_CODE}`, group: 'business', order: 1 },
        ],
      });
      navigationRegistry.register(TEST_CODE_2, {
        top_nav: [
          {
            code: TEST_CODE_2,
            label: 'Test2',
            path: `/${TEST_CODE_2}`,
            group: 'business',
            order: 2,
          },
        ],
      });
      const ourItems = navigationRegistry
        .getTopNavItems()
        .filter((i) => i.code === TEST_CODE || i.code === TEST_CODE_2);
      expect(ourItems).toHaveLength(2);
    });
  });

  describe('getCoreNavItems / getBusinessNavItems', () => {
    it('should filter core items', () => {
      navigationRegistry.register(TEST_CODE, {
        top_nav: [
          {
            code: `${TEST_CODE}-core`,
            label: 'Core',
            path: `/${TEST_CODE}/core`,
            group: 'core',
            order: 1,
          },
          {
            code: `${TEST_CODE}-biz`,
            label: 'Business',
            path: `/${TEST_CODE}/biz`,
            group: 'business',
            order: 2,
          },
        ],
      });
      const coreItems = navigationRegistry
        .getCoreNavItems()
        .filter((i) => i.code.startsWith(TEST_CODE));
      expect(coreItems).toHaveLength(1);
      expect(coreItems[0].code).toBe(`${TEST_CODE}-core`);
    });

    it('should filter business items', () => {
      navigationRegistry.register(TEST_CODE, {
        top_nav: [
          {
            code: `${TEST_CODE}-core`,
            label: 'Core',
            path: `/${TEST_CODE}/core`,
            group: 'core',
            order: 1,
          },
          {
            code: `${TEST_CODE}-biz`,
            label: 'Business',
            path: `/${TEST_CODE}/biz`,
            group: 'business',
            order: 2,
          },
        ],
      });
      const bizItems = navigationRegistry
        .getBusinessNavItems()
        .filter((i) => i.code.startsWith(TEST_CODE));
      expect(bizItems).toHaveLength(1);
      expect(bizItems[0].code).toBe(`${TEST_CODE}-biz`);
    });
  });

  describe('getModuleCards', () => {
    it('should return all module cards sorted by order', () => {
      navigationRegistry.register(TEST_CODE, {
        module_card: {
          order: 999,
          code: TEST_CODE,
          name: 'Test CRM',
          icon: 'crm',
          path: `/${TEST_CODE}`,
          status: 'online',
        },
      });
      navigationRegistry.register(TEST_CODE_2, {
        module_card: {
          order: 998,
          code: TEST_CODE_2,
          name: 'Test HRM',
          icon: 'hrm',
          path: `/${TEST_CODE_2}`,
          status: 'online',
        },
      });
      const ourCards = navigationRegistry
        .getModuleCards()
        .filter((c) => c.code === TEST_CODE || c.code === TEST_CODE_2);
      expect(ourCards).toHaveLength(2);
      // 998 < 999, so HRM comes first
      expect(ourCards[0].code).toBe(TEST_CODE_2);
      expect(ourCards[1].code).toBe(TEST_CODE);
    });
  });

  describe('getModuleCardsByPermission', () => {
    it('should filter cards by permission', () => {
      navigationRegistry.register(TEST_CODE, {
        module_card: {
          order: 999,
          code: TEST_CODE,
          name: 'Test CRM',
          icon: 'crm',
          path: `/${TEST_CODE}`,
          status: 'online',
          permission: `${TEST_CODE}:view`,
        },
      });
      navigationRegistry.register(TEST_CODE_2, {
        module_card: {
          order: 998,
          code: TEST_CODE_2,
          name: 'Test HRM',
          icon: 'hrm',
          path: `/${TEST_CODE_2}`,
          status: 'online',
          // no permission = always visible
        },
      });

      const withPermission = navigationRegistry.getModuleCardsByPermission(() => false);
      const ourCards = withPermission.filter((c) => c.code === TEST_CODE || c.code === TEST_CODE_2);
      // Only HRM has no permission requirement
      expect(ourCards).toHaveLength(1);
      expect(ourCards[0].code).toBe(TEST_CODE_2);

      const allGranted = navigationRegistry.getModuleCardsByPermission(() => true);
      const allOurCards = allGranted.filter((c) => c.code === TEST_CODE || c.code === TEST_CODE_2);
      expect(allOurCards).toHaveLength(2);
    });
  });

  describe('getModuleCard', () => {
    it('should return undefined for non-existent module', () => {
      expect(navigationRegistry.getModuleCard('nonexistent_test_module_xyz')).toBeUndefined();
    });

    it('should return correct card for registered module', () => {
      navigationRegistry.register(TEST_CODE, { module_card: sampleModuleCard });
      const card = navigationRegistry.getModuleCard(TEST_CODE);
      expect(card?.code).toBe(TEST_CODE);
      expect(card?.name).toBe('Test CRM');
    });
  });

  describe('getAllPluginCodes', () => {
    it('should contain registered test codes', () => {
      navigationRegistry.register(TEST_CODE, { top_nav: sampleTopNav });
      navigationRegistry.register(TEST_CODE_2, { sidebar_nav: sampleSidebar });

      const codes = navigationRegistry.getAllPluginCodes();
      expect(codes).toContain(TEST_CODE);
      expect(codes).toContain(TEST_CODE_2);
    });
  });

  describe('getNavItemsByPermission', () => {
    it('should filter nav items by permission', () => {
      navigationRegistry.register(TEST_CODE, {
        top_nav: [
          {
            code: `${TEST_CODE}-public`,
            label: 'Public',
            path: `/${TEST_CODE}/public`,
            group: 'core',
            order: 1,
          },
          {
            code: `${TEST_CODE}-restricted`,
            label: 'Restricted',
            path: `/${TEST_CODE}/restricted`,
            group: 'core',
            order: 2,
            permission: `${TEST_CODE}:admin`,
          },
        ],
      });

      const userItems = navigationRegistry.getNavItemsByPermission((p) => p === 'user:access');
      const ourItems = userItems.filter((i) => i.code.startsWith(TEST_CODE));
      expect(ourItems).toHaveLength(1);
      expect(ourItems[0].code).toBe(`${TEST_CODE}-public`);
    });
  });

  describe('updateModuleStatus', () => {
    it('should update module status', () => {
      navigationRegistry.register(TEST_CODE, { module_card: sampleModuleCard });
      navigationRegistry.updateModuleStatus(TEST_CODE, 'beta');

      const card = navigationRegistry.getModuleCard(TEST_CODE);
      expect(card?.status).toBe('beta');
    });
  });

  describe('event emitter', () => {
    it('should emit navigationUpdated event on register', () => {
      const listener = vi.fn();
      navigationRegistry.emitter.on('navigationUpdated', listener);
      navigationRegistry.register(TEST_CODE, sampleConfig);
      expect(listener).toHaveBeenCalledWith(TEST_CODE);
      navigationRegistry.emitter.off('navigationUpdated', listener);
    });

    it('should emit navigationUpdated event on unregister', () => {
      const listener = vi.fn();
      navigationRegistry.register(TEST_CODE, sampleConfig);
      navigationRegistry.emitter.on('navigationUpdated', listener);
      navigationRegistry.unregister(TEST_CODE);
      expect(listener).toHaveBeenCalledWith(TEST_CODE);
      navigationRegistry.emitter.off('navigationUpdated', listener);
    });
  });
});
