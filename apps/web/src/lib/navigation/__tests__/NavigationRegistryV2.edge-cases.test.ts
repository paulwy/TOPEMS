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
          {
            code: 'test-users',
            path: '/test-static-priority/users',
            label: '用户列表',
            icon: 'Test',
          },
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
        navItems: [{ code: 'test-detail', path: '/test-segment/:id', label: '详情', icon: 'Test' }],
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
          {
            code: 'test-group-a-1',
            path: '/test-grouping/a1',
            label: 'A1',
            icon: 'Test',
            group: 'management',
          },
          {
            code: 'test-group-a-2',
            path: '/test-grouping/a2',
            label: 'A2',
            icon: 'Test',
            group: 'management',
          },
          {
            code: 'test-group-b-1',
            path: '/test-grouping/b1',
            label: 'B1',
            icon: 'Test',
            group: 'operations',
          },
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
          {
            code: 'test-hidden',
            path: '/test-hidden-items/hidden',
            label: '隐藏',
            icon: 'Test',
            showInSidebar: false,
          },
          {
            code: 'test-visible2',
            path: '/test-hidden-items/visible2',
            label: '可见2',
            icon: 'Test',
          },
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
          {
            code: 'test-admin',
            path: '/test-perm-filter/admin',
            label: '管理员',
            icon: 'Test',
            permission: 'admin:view',
          },
          {
            code: 'test-user',
            path: '/test-perm-filter/user',
            label: '用户',
            icon: 'Test',
            permission: 'user:view',
          },
        ],
      });
      registeredCodes.push('test-perm-filter');

      const userItems = registry.getSidebarNavItems(
        'test-perm-filter',
        (perm) => perm === 'user:view'
      );
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

  describe('P3 跨模块归属收敛（showInSidebar: false）', () => {
    it('getSidebarNavItems 应排除 showInSidebar: false 的重复入口（erp 收敛 9 项）', () => {
      registry.registerModule({
        code: 'test-erp-p3',
        name: 'ERP Test',
        icon: 'Test',
        path: '/test-erp',
        source: 'core',
        navItems: [
          // 保留项
          { code: 'erp-dashboard', path: '/test-erp/dashboard', label: '仪表盘', icon: 'Test' },
          { code: 'erp-dictionaries', path: '/test-erp/dictionaries', label: '字典', icon: 'Test' },
          // P3 收敛项（showInSidebar: false）
          {
            code: 'erp-customer-management',
            path: '/test-erp/customers',
            label: '客户',
            icon: 'Test',
            showInSidebar: false,
          },
          {
            code: 'erp-supplier-management',
            path: '/test-erp/suppliers',
            label: '供应商',
            icon: 'Test',
            showInSidebar: false,
          },
          {
            code: 'erp-inventory-management',
            path: '/test-erp/inventory',
            label: '库存',
            icon: 'Test',
            showInSidebar: false,
          },
          {
            code: 'erp-material-management',
            path: '/test-erp/materials',
            label: '物料',
            icon: 'Test',
            showInSidebar: false,
          },
          {
            code: 'erp-purchase-order',
            path: '/test-erp/purchase',
            label: '采购',
            icon: 'Test',
            showInSidebar: false,
          },
          {
            code: 'erp-sales-orders',
            path: '/test-erp/sales',
            label: '销售',
            icon: 'Test',
            showInSidebar: false,
          },
          {
            code: 'erp-financial-statements',
            path: '/test-erp/finance',
            label: '财务',
            icon: 'Test',
            showInSidebar: false,
          },
          {
            code: 'erp-vehicle-management',
            path: '/test-erp/vehicles',
            label: '车辆',
            icon: 'Test',
            showInSidebar: false,
          },
          {
            code: 'erp-asset-management',
            path: '/test-erp/assets',
            label: '资产',
            icon: 'Test',
            showInSidebar: false,
          },
        ],
      });
      registeredCodes.push('test-erp-p3');

      const items = registry.getSidebarNavItems('test-erp-p3', () => true);
      const codes = items.map((item) => item.code);
      // 收敛项不在侧边栏
      const hiddenCodes = [
        'erp-customer-management',
        'erp-supplier-management',
        'erp-inventory-management',
        'erp-material-management',
        'erp-purchase-order',
        'erp-sales-orders',
        'erp-financial-statements',
        'erp-vehicle-management',
        'erp-asset-management',
      ];
      for (const c of hiddenCodes) {
        expect(codes).not.toContain(c);
      }
      // 保留项仍在
      expect(codes).toContain('erp-dashboard');
      expect(codes).toContain('erp-dictionaries');
    });

    it('showInSidebar 缺省时仍展示（默认 true）', () => {
      registry.registerModule({
        code: 'test-erp-default',
        name: 'ERP Default',
        icon: 'Test',
        path: '/test-erp-default',
        source: 'core',
        navItems: [
          { code: 'keep-item', path: '/test-erp-default/keep', label: '保留', icon: 'Test' },
        ],
      });
      registeredCodes.push('test-erp-default');

      const codes = registry
        .getSidebarNavItems('test-erp-default', () => true)
        .map((item) => item.code);
      expect(codes).toContain('keep-item');
    });

    it('getSidebarNavItems 应排除 srm-contract（合同域唯一归属 scm，批4）', () => {
      registry.registerModule({
        code: 'test-srm-p3',
        name: 'SRM Test',
        icon: 'Test',
        path: '/test-srm',
        source: 'core',
        navItems: [
          { code: 'srm-dashboard', path: '/test-srm/dashboard', label: '供应商首页', icon: 'Test' },
          { code: 'srm-supplier', path: '/test-srm/suppliers', label: '供应商', icon: 'Test' },
          {
            code: 'srm-contract',
            path: '/test-srm/contract',
            label: '合同',
            icon: 'Test',
            showInTabs: true,
            showInSidebar: false,
          },
        ],
      });
      registeredCodes.push('test-srm-p3');

      const codes = registry.getSidebarNavItems('test-srm-p3', () => true).map((item) => item.code);
      expect(codes).not.toContain('srm-contract');
      expect(codes).toContain('srm-dashboard');
      expect(codes).toContain('srm-supplier');
    });

    it('getSidebarNavItems 应排除 srm-order（采购订单域唯一归属 scm，批4）', () => {
      registry.registerModule({
        code: 'test-srm-order-p3',
        name: 'SRM Order Test',
        icon: 'Test',
        path: '/test-srm-order',
        source: 'core',
        navItems: [
          { code: 'srm-product', path: '/test-srm-order/products', label: '商品', icon: 'Test' },
          {
            code: 'srm-order',
            path: '/test-srm-order/orders',
            label: '订单',
            icon: 'Test',
            showInTabs: true,
            showInSidebar: false,
          },
        ],
      });
      registeredCodes.push('test-srm-order-p3');

      const codes = registry
        .getSidebarNavItems('test-srm-order-p3', () => true)
        .map((item) => item.code);
      expect(codes).not.toContain('srm-order');
      expect(codes).toContain('srm-product');
    });

    it('getSidebarNavItems 应排除供应商主数据跨模块副本（scm/wms → srm，批4）', () => {
      registry.registerModule({
        code: 'test-supplier-scm',
        name: 'SCM Supplier',
        icon: 'Test',
        path: '/test-supplier-scm',
        source: 'core',
        navItems: [
          {
            code: 'scm-purchase-orders',
            path: '/test-supplier-scm/orders',
            label: '采购订单',
            icon: 'Test',
          },
          {
            code: 'scm-suppliers',
            path: '/test-supplier-scm/suppliers',
            label: '供应商',
            icon: 'Test',
            showInSidebar: false,
          },
        ],
      });
      registry.registerModule({
        code: 'test-supplier-wms',
        name: 'WMS Supplier',
        icon: 'Test',
        path: '/test-supplier-wms',
        source: 'core',
        navItems: [
          {
            code: 'wms-batches',
            path: '/test-supplier-wms/batches',
            label: '批次',
            icon: 'Test',
          },
          {
            code: 'wms-supplier-management',
            path: '/test-supplier-wms/suppliers',
            label: '供应商',
            icon: 'Test',
            showInSidebar: false,
          },
        ],
      });
      registeredCodes.push('test-supplier-scm', 'test-supplier-wms');

      const scmCodes = registry
        .getSidebarNavItems('test-supplier-scm', () => true)
        .map((item) => item.code);
      expect(scmCodes).not.toContain('scm-suppliers');
      expect(scmCodes).toContain('scm-purchase-orders');

      const wmsCodes = registry
        .getSidebarNavItems('test-supplier-wms', () => true)
        .map((item) => item.code);
      expect(wmsCodes).not.toContain('wms-supplier-management');
      expect(wmsCodes).toContain('wms-batches');
    });

    it('getSidebarNavItems 应排除 rd-material（物料主数据域唯一归属 pdm，批4）', () => {
      registry.registerModule({
        code: 'test-rd-material-p3',
        name: 'RD Material Test',
        icon: 'Test',
        path: '/test-rd-material',
        source: 'core',
        navItems: [
          { code: 'rd-project', path: '/test-rd-material/projects', label: '项目', icon: 'Test' },
          { code: 'rd-test', path: '/test-rd-material/tests', label: '测试', icon: 'Test' },
          {
            code: 'rd-material',
            path: '/test-rd-material/materials',
            label: '物料',
            icon: 'Test',
            showInTabs: true,
            showInSidebar: false,
          },
        ],
      });
      registeredCodes.push('test-rd-material-p3');

      const codes = registry
        .getSidebarNavItems('test-rd-material-p3', () => true)
        .map((item) => item.code);
      expect(codes).not.toContain('rd-material');
      expect(codes).toContain('rd-project');
      expect(codes).toContain('rd-test');
    });

    it('getSidebarNavItems 应排除 erp 财务重复入口（finance 域唯一归属，批4）且保留 bank-account', () => {
      registry.registerModule({
        code: 'test-erp-finance-p3',
        name: 'ERP Finance Test',
        icon: 'Test',
        path: '/test-erp-finance',
        source: 'core',
        navItems: [
          {
            code: 'erp-dashboard',
            path: '/test-erp-finance/dashboard',
            label: '总览',
            icon: 'Test',
          },
          {
            code: 'erp-dictionaries',
            path: '/test-erp-finance/dicts',
            label: '字典',
            icon: 'Test',
          },
          {
            code: 'erp-general-ledger',
            path: '/test-erp-finance/vouchers',
            label: '总账',
            icon: 'Test',
            showInTabs: true,
            showInSidebar: false,
          },
          {
            code: 'erp-receivable-payable',
            path: '/test-erp-finance/arp',
            label: '应收应付',
            icon: 'Test',
            showInSidebar: false,
          },
          {
            code: 'erp-budget-management',
            path: '/test-erp-finance/budget',
            label: '预算',
            icon: 'Test',
            showInSidebar: false,
          },
          {
            code: 'erp-accounting-management',
            path: '/test-erp-finance/accounting',
            label: '会计核算',
            icon: 'Test',
            showInSidebar: false,
          },
          {
            code: 'erp-financial-analysis',
            path: '/test-erp-finance/analysis',
            label: '财务分析',
            icon: 'Test',
            showInSidebar: false,
          },
          {
            code: 'erp-bank-account',
            path: '/test-erp-finance/banks',
            label: '银行账户',
            icon: 'Test',
          },
        ],
      });
      registeredCodes.push('test-erp-finance-p3');

      const codes = registry
        .getSidebarNavItems('test-erp-finance-p3', () => true)
        .map((item) => item.code);
      expect(codes).not.toContain('erp-general-ledger');
      expect(codes).not.toContain('erp-receivable-payable');
      expect(codes).not.toContain('erp-budget-management');
      expect(codes).not.toContain('erp-accounting-management');
      expect(codes).not.toContain('erp-financial-analysis');
      expect(codes).toContain('erp-bank-account');
      expect(codes).toContain('erp-dictionaries');
    });

    it('getSidebarNavItems 应排除 report 与 bi 重复入口且保留调度/订阅/模板/查看器（批4）', () => {
      registry.registerModule({
        code: 'test-report-bi-p3',
        name: 'Report BI Test',
        icon: 'Test',
        path: '/test-report-bi',
        source: 'core',
        navItems: [
          { code: 'bi-dashboard', path: '/test-report-bi/bi', label: 'BI', icon: 'Test' },
          {
            code: 'report-dashboard',
            path: '/test-report-bi/dashboard',
            label: '报表总览',
            icon: 'Test',
            showInTabs: true,
            showInSidebar: false,
          },
          {
            code: 'report-list',
            path: '/test-report-bi/list',
            label: '报表列表',
            icon: 'Test',
            showInTabs: true,
            showInSidebar: false,
          },
          {
            code: 'report-design',
            path: '/test-report-bi/design',
            label: '报表设计',
            icon: 'Test',
            showInSidebar: false,
          },
          {
            code: 'report-builder',
            path: '/test-report-bi/builder',
            label: '报表构建',
            icon: 'Test',
            showInSidebar: false,
          },
          {
            code: 'report-report',
            path: '/test-report-bi/reports',
            label: '报表',
            icon: 'Test',
            showInSidebar: false,
          },
          {
            code: 'report-schedule',
            path: '/test-report-bi/schedules',
            label: '调度',
            icon: 'Test',
            showInTabs: true,
          },
          {
            code: 'report-subscription',
            path: '/test-report-bi/subscriptions',
            label: '订阅',
            icon: 'Test',
            showInTabs: true,
          },
          {
            code: 'report-template',
            path: '/test-report-bi/templates',
            label: '模板',
            icon: 'Test',
          },
          {
            code: 'report-viewer',
            path: '/test-report-bi/viewer',
            label: '查看器',
            icon: 'Test',
          },
        ],
      });
      registeredCodes.push('test-report-bi-p3');

      const codes = registry
        .getSidebarNavItems('test-report-bi-p3', () => true)
        .map((item) => item.code);
      expect(codes).not.toContain('report-dashboard');
      expect(codes).not.toContain('report-list');
      expect(codes).not.toContain('report-design');
      expect(codes).not.toContain('report-builder');
      expect(codes).not.toContain('report-report');
      expect(codes).toContain('report-schedule');
      expect(codes).toContain('report-subscription');
      expect(codes).toContain('report-template');
      expect(codes).toContain('report-viewer');
    });

    it('getSidebarNavItems 应排除 oa-vehicles（车辆域唯一归属 tms，批4）且保留用车申请', () => {
      registry.registerModule({
        code: 'test-oa-vehicle-p3',
        name: 'OA Vehicle Test',
        icon: 'Test',
        path: '/test-oa-vehicle',
        source: 'core',
        navItems: [
          { code: 'oa-announcement', path: '/test-oa-vehicle/news', label: '公告', icon: 'Test' },
          {
            code: 'oa-vehicles',
            path: '/test-oa-vehicle/vehicles',
            label: '车辆',
            icon: 'Test',
            showInSidebar: false,
          },
        ],
      });
      registry.registerModule({
        code: 'test-erp-vehicle-req-p3',
        name: 'ERP Vehicle Request Test',
        icon: 'Test',
        path: '/test-erp-vehicle-req',
        source: 'core',
        navItems: [
          {
            code: 'erp-vehicle-request',
            path: '/test-erp-vehicle-req/requests',
            label: '用车申请',
            icon: 'Test',
          },
        ],
      });
      registeredCodes.push('test-oa-vehicle-p3', 'test-erp-vehicle-req-p3');

      const oaCodes = registry
        .getSidebarNavItems('test-oa-vehicle-p3', () => true)
        .map((item) => item.code);
      expect(oaCodes).not.toContain('oa-vehicles');
      expect(oaCodes).toContain('oa-announcement');

      const erpCodes = registry
        .getSidebarNavItems('test-erp-vehicle-req-p3', () => true)
        .map((item) => item.code);
      expect(erpCodes).toContain('erp-vehicle-request');
    });
  });
});
