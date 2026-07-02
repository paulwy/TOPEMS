import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NavigationRegistryV2 } from '../NavigationRegistryV2';

describe('NavigationRegistryV2 Edge Cases', () => {
  let registry: NavigationRegistryV2;
  const registeredCodes: string[] = [];

  beforeEach(() => {
    registry = NavigationRegistryV2.getInstance();
  });

  afterEach(() => {
    for (const code of registeredCodes) {
      registry.unregisterModule(code);
    }
    registeredCodes.length = 0;
  });

  describe('Dynamic Route Matching', () => {
    it('should match dynamic route with :id pattern', () => {
      registry.registerModule({
        code: 'test-dynamic',
        name: 'Dynamic Test',
        icon: 'Test',
        path: '/test-dynamic',
        source: 'core',
        navItems: [
          { code: 'test-detail', path: '/test-dynamic/:id', label: '详情', icon: 'Test' },
          { code: 'test-list', path: '/test-dynamic/list', label: '列表', icon: 'Test' },
        ],
      });
      registeredCodes.push('test-dynamic');

      const found = registry.findNavItemByPath('/test-dynamic/123');
      expect(found).toBeDefined();
      expect(found?.code).toBe('test-detail');
    });

    it('should match nested dynamic routes', () => {
      registry.registerModule({
        code: 'test-nested',
        name: 'Nested Dynamic',
        icon: 'Test',
        path: '/test-nested',
        source: 'core',
        navItems: [
          {
            code: 'test-project',
            path: '/test-nested/projects/:projectId',
            name: '项目',
            icon: 'Test',
            children: [
              {
                code: 'test-task',
                path: '/test-nested/projects/:projectId/tasks/:taskId',
                name: '任务',
                icon: 'Test',
              },
            ],
          },
        ],
      });
      registeredCodes.push('test-nested');

      const found = registry.findNavItemByPath('/test-nested/projects/proj-001/tasks/task-001');
      expect(found).toBeDefined();
      expect(found?.code).toBe('test-task');
    });

    it('should prefer static routes over dynamic routes', () => {
      registry.registerModule({
        code: 'test-static-priority',
        name: 'Static Priority',
        icon: 'Test',
        path: '/test-static-priority',
        source: 'core',
        navItems: [
          { code: 'test-users', path: '/test-static-priority/users', label: '用户列表', icon: 'Test' },
          { code: 'test-user', path: '/test-static-priority/:id', label: '用户详情', icon: 'Test' },
        ],
      });
      registeredCodes.push('test-static-priority');

      const usersFound = registry.findNavItemByPath('/test-static-priority/users');
      expect(usersFound?.code).toBe('test-users');

      const userFound = registry.findNavItemByPath('/test-static-priority/user-001');
      expect(userFound?.code).toBe('test-user');
    });

    it('should not match dynamic route with wrong segment count', () => {
      registry.registerModule({
        code: 'test-segment',
        name: 'Segment Test',
        icon: 'Test',
        path: '/test-segment',
        source: 'core',
        navItems: [
          { code: 'test-detail', path: '/test-segment/:id', label: '详情', icon: 'Test' },
        ],
      });
      registeredCodes.push('test-segment');

      const found = registry.findNavItemByPath('/test-segment/123/sub');
      expect(found).toBeUndefined();
    });
  });

  describe('Breadcrumb Hierarchy', () => {
    it('should build correct hierarchy for flat nav items', () => {
      registry.registerModule({
        code: 'test-breadcrumb',
        name: '面包屑测试',
        icon: 'Test',
        path: '/test-breadcrumb',
        source: 'core',
        navItems: [
          { code: 'test-page1', path: '/test-breadcrumb/page1', label: '页面1', icon: 'Test' },
        ],
      });
      registeredCodes.push('test-breadcrumb');

      const hierarchy = registry.getNavHierarchy('/test-breadcrumb/page1');
      expect(hierarchy.length).toBe(2);
      expect(hierarchy[0].code).toBe('test-breadcrumb');
      expect(hierarchy[0].label).toBe('面包屑测试');
      expect(hierarchy[1].code).toBe('test-page1');
      expect(hierarchy[1].label).toBe('页面1');
    });

    it('should build correct hierarchy for nested nav items', () => {
      registry.registerModule({
        code: 'test-nested-breadcrumb',
        name: '嵌套面包屑',
        icon: 'Test',
        path: '/test-nested-breadcrumb',
        source: 'core',
        navItems: [
          {
            code: 'test-level1',
            path: '/test-nested-breadcrumb/level1',
            label: '一级菜单',
            icon: 'Test',
            children: [
              {
                code: 'test-level2',
                path: '/test-nested-breadcrumb/level1/level2',
                label: '二级菜单',
                icon: 'Test',
                children: [
                  {
                    code: 'test-level3',
                    path: '/test-nested-breadcrumb/level1/level2/level3',
                    label: '三级菜单',
                    icon: 'Test',
                  },
                ],
              },
            ],
          },
        ],
      });
      registeredCodes.push('test-nested-breadcrumb');

      const hierarchy = registry.getNavHierarchy('/test-nested-breadcrumb/level1/level2/level3');
      expect(hierarchy.length).toBe(4);
      expect(hierarchy[0].code).toBe('test-nested-breadcrumb');
      expect(hierarchy[1].code).toBe('test-level1');
      expect(hierarchy[2].code).toBe('test-level2');
      expect(hierarchy[3].code).toBe('test-level3');
    });

    it('should return empty array for unknown path', () => {
      const hierarchy = registry.getNavHierarchy('/unknown/path');
      expect(hierarchy.length).toBe(0);
    });

    it('should handle dynamic routes in breadcrumb', () => {
      registry.registerModule({
        code: 'test-dynamic-breadcrumb',
        name: '动态面包屑',
        icon: 'Test',
        path: '/test-dynamic-breadcrumb',
        source: 'core',
        navItems: [
          {
            code: 'test-project-list',
            path: '/test-dynamic-breadcrumb/projects',
            label: '项目列表',
            icon: 'Test',
            children: [
              {
                code: 'test-project-detail',
                path: '/test-dynamic-breadcrumb/projects/:id',
                label: '项目详情',
                icon: 'Test',
              },
            ],
          },
        ],
      });
      registeredCodes.push('test-dynamic-breadcrumb');

      const hierarchy = registry.getNavHierarchy('/test-dynamic-breadcrumb/projects/proj-001');
      expect(hierarchy.length).toBe(3);
      expect(hierarchy[2].code).toBe('test-project-detail');
    });
  });

  describe('Sidebar Grouping', () => {
    it('should group nav items by group property', () => {
      registry.registerModule({
        code: 'test-grouping',
        name: '分组测试',
        icon: 'Test',
        path: '/test-grouping',
        source: 'core',
        navItems: [
          { code: 'test-group-a-1', path: '/test-grouping/a1', label: 'A1', icon: 'Test', group: 'management' },
          { code: 'test-group-a-2', path: '/test-grouping/a2', label: 'A2', icon: 'Test', group: 'management' },
          { code: 'test-group-b-1', path: '/test-grouping/b1', label: 'B1', icon: 'Test', group: 'operations' },
          { code: 'test-group-c-1', path: '/test-grouping/c1', label: 'C1', icon: 'Test' },
        ],
      });
      registeredCodes.push('test-grouping');

      const grouped = registry.getSidebarNavGrouped('test-grouping');
      expect(grouped['management']).toBeDefined();
      expect(grouped['management'].length).toBe(2);
      expect(grouped['operations']).toBeDefined();
      expect(grouped['operations'].length).toBe(1);
      expect(grouped['other']).toBeDefined();
      expect(grouped['other'].length).toBe(1);
    });

    it('should handle empty nav items', () => {
      registry.registerModule({
        code: 'test-empty-nav',
        name: '空导航',
        icon: 'Test',
        path: '/test-empty-nav',
        source: 'core',
        navItems: [],
      });
      registeredCodes.push('test-empty-nav');

      const items = registry.getSidebarNavItems('test-empty-nav');
      expect(items.length).toBe(0);

      const grouped = registry.getSidebarNavGrouped('test-empty-nav');
      expect(Object.keys(grouped).length).toBe(0);
    });

    it('should filter out items with showInSidebar=false', () => {
      registry.registerModule({
        code: 'test-hidden-items',
        name: '隐藏项测试',
        icon: 'Test',
        path: '/test-hidden-items',
        source: 'core',
        navItems: [
          { code: 'test-visible', path: '/test-hidden-items/visible', label: '可见', icon: 'Test' },
          { code: 'test-hidden', path: '/test-hidden-items/hidden', label: '隐藏', icon: 'Test', showInSidebar: false },
          { code: 'test-visible2', path: '/test-hidden-items/visible2', label: '可见2', icon: 'Test' },
        ],
      });
      registeredCodes.push('test-hidden-items');

      const items = registry.getSidebarNavItems('test-hidden-items');
      expect(items.length).toBe(2);
      expect(items.every((item) => item.code !== 'test-hidden')).toBe(true);
    });
  });

  describe('Module Card Generation', () => {
    it('should generate module card with first nav item path', () => {
      registry.registerModule({
        code: 'test-card',
        name: '卡片测试',
        icon: 'Test',
        path: '/test-card',
        source: 'core',
        navItems: [
          { code: 'test-dashboard', path: '/test-card/dashboard', label: '仪表盘', icon: 'Test' },
          { code: 'test-list', path: '/test-card/list', label: '列表', icon: 'Test' },
        ],
      });
      registeredCodes.push('test-card');

      const card = registry.toModuleCard(registry.getModule('test-card')!);
      expect(card.path).toBe('/test-card/dashboard');
    });

    it('should fall back to module path when no nav items', () => {
      registry.registerModule({
        code: 'test-no-nav',
        name: '无导航',
        icon: 'Test',
        path: '/test-no-nav',
        source: 'core',
        navItems: [],
      });
      registeredCodes.push('test-no-nav');

      const card = registry.toModuleCard(registry.getModule('test-no-nav')!);
      expect(card.path).toBe('/test-no-nav');
    });

    it('should handle modules with disabled status', () => {
      registry.registerModule({
        code: 'test-disabled',
        name: '禁用模块',
        icon: 'Test',
        path: '/test-disabled',
        source: 'core',
        status: 'disabled',
        navItems: [],
      });
      registeredCodes.push('test-disabled');

      const card = registry.toModuleCard(registry.getModule('test-disabled')!);
      expect(card.status).toBe('disabled');
    });
  });

  describe('Permission Filtering', () => {
    it('should filter items by permission in sidebar', () => {
      registry.registerModule({
        code: 'test-perm-filter',
        name: '权限过滤',
        icon: 'Test',
        path: '/test-perm-filter',
        source: 'core',
        navItems: [
          { code: 'test-public', path: '/test-perm-filter/public', label: '公开', icon: 'Test' },
          { code: 'test-admin', path: '/test-perm-filter/admin', label: '管理员', icon: 'Test', permission: 'admin:view' },
          { code: 'test-user', path: '/test-perm-filter/user', label: '用户', icon: 'Test', permission: 'user:view' },
        ],
      });
      registeredCodes.push('test-perm-filter');

      const userItems = registry.getSidebarNavItems('test-perm-filter', (perm) => perm === 'user:view');
      expect(userItems.length).toBe(2);
      expect(userItems.some((item) => item.code === 'test-public')).toBe(true);
      expect(userItems.some((item) => item.code === 'test-user')).toBe(true);
      expect(userItems.some((item) => item.code === 'test-admin')).toBe(false);
    });

    it('should filter modules by permission', () => {
      registry.registerModule({
        code: 'test-module-perm',
        name: '模块权限',
        icon: 'Test',
        path: '/test-module-perm',
        source: 'core',
        permission: 'admin:view',
        navItems: [],
      });
      registeredCodes.push('test-module-perm');

      const cards = registry.getModuleCards((perm) => perm !== 'admin:view');
      expect(cards.some((card) => card.code === 'test-module-perm')).toBe(false);
    });
  });
});