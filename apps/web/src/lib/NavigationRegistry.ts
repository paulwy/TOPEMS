// 浏览器兼容的简单事件发射器（避免依赖 Node.js events 模块）
type EventListener = (...args: unknown[]) => void;
class SimpleEventEmitter {
  private listeners: Map<string, EventListener[]> = new Map();
  private maxListeners = 100;

  setMaxListeners(n: number): void {
    this.maxListeners = n;
  }

  on(event: string, listener: EventListener): void {
    const arr = this.listeners.get(event) || [];
    if (arr.length >= this.maxListeners) {
      console.warn(
        `MaxListenersExceededWarning: Possible memory leak detected. ${arr.length + 1} ${event} listeners added.`
      );
    }
    arr.push(listener);
    this.listeners.set(event, arr);
  }

  off(event: string, listener: EventListener): void {
    const arr = this.listeners.get(event);
    if (!arr) return;
    const idx = arr.indexOf(listener);
    if (idx !== -1) arr.splice(idx, 1);
  }

  emit(event: string, ...args: unknown[]): void {
    const arr = this.listeners.get(event);
    if (!arr) return;
    for (const listener of [...arr]) {
      try {
        listener(...args);
      } catch (e: unknown) {
        console.error(`Error in event listener for "${event}":`, e);
      }
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export interface NavItem {
  code: string;
  label: string;
  icon?: string;
  path: string;
  permission?: string;
  order?: number;
  children?: NavItem[];
  badge?: number | string;
  badgeColor?: 'primary' | 'success' | 'warning' | 'error';
  description?: string;
  group?: 'core' | 'business';
}

export interface ModuleCardConfig {
  order?: number;
  code: string;
  name: string;
  icon: string;
  path: string;
  permission?: string;
  status?: 'online' | 'beta' | 'plan' | 'new';
  /** 模块来源：core=核心功能（平台自带，不可卸载），plugin=业务插件（来自插件市场，可安装/卸载） */
  source?: 'core' | 'plugin';
  /** 专业套件分组：finance=财务套件, hr=人力套件, manufacturing=制造套件, supply=供应链套件, crm=客户套件, quality=质量套件, project=项目套件, gis=地理套件 */
  suite?: 'finance' | 'hr' | 'manufacturing' | 'supply' | 'crm' | 'quality' | 'project' | 'gis';
}

export interface PluginNavConfig {
  top_nav?: NavItem[];
  sidebar_nav?: NavItem[];
  module_tabs?: NavItem[];
  module_card?: ModuleCardConfig;
}

class NavigationRegistry {
  private static instance: NavigationRegistry;
  private navItems: Map<string, NavItem[]> = new Map();
  private moduleCards: Map<string, ModuleCardConfig> = new Map();
  private moduleStatuses: Map<string, string> = new Map();
  public emitter: SimpleEventEmitter;

  private constructor() {
    this.emitter = new SimpleEventEmitter();
    this.emitter.setMaxListeners(100);
  }

  static getInstance(): NavigationRegistry {
    if (!NavigationRegistry.instance) {
      NavigationRegistry.instance = new NavigationRegistry();
    }
    return NavigationRegistry.instance;
  }

  register(pluginCode: string, config: PluginNavConfig): void {
    if (config.top_nav) {
      this.navItems.set(`${pluginCode}:top`, config.top_nav);
    }
    if (config.sidebar_nav) {
      this.navItems.set(`${pluginCode}:sidebar`, config.sidebar_nav);
    }
    if (config.module_tabs) {
      this.navItems.set(`${pluginCode}:tabs`, config.module_tabs);
    }
    if (config.module_card) {
      this.moduleCards.set(pluginCode, config.module_card);
      this.moduleStatuses.set(pluginCode, config.module_card.status || 'online');
    }
    this.emitter.emit('navigationUpdated', pluginCode);
  }

  unregister(pluginCode: string): void {
    this.navItems.delete(`${pluginCode}:top`);
    this.navItems.delete(`${pluginCode}:sidebar`);
    this.navItems.delete(`${pluginCode}:tabs`);
    this.moduleCards.delete(pluginCode);
    this.moduleStatuses.delete(pluginCode);
    this.emitter.emit('navigationUpdated', pluginCode);
  }

  getTopNavItems(): NavItem[] {
    const items: NavItem[] = [];
    this.navItems.forEach((navItems, key) => {
      if (key.endsWith(':top')) {
        items.push(...navItems);
      }
    });
    return items.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getCoreNavItems(): NavItem[] {
    return this.getTopNavItems().filter((item) => item.group === 'core');
  }

  getBusinessNavItems(): NavItem[] {
    return this.getTopNavItems().filter((item) => item.group === 'business');
  }

  getSidebarNavItems(pluginCode: string): NavItem[] {
    const items = this.navItems.get(`${pluginCode}:sidebar`) || [];
    return items.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getModuleTabs(pluginCode: string): NavItem[] | undefined {
    return this.navItems.get(`${pluginCode}:tabs`);
  }

  getModuleCards(): ModuleCardConfig[] {
    const cards: ModuleCardConfig[] = [];
    this.moduleCards.forEach((card) => {
      cards.push(card);
    });
    return cards.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getModuleCardsByPermission(hasPermission: (permission: string) => boolean): ModuleCardConfig[] {
    const cards: ModuleCardConfig[] = [];
    this.moduleCards.forEach((card) => {
      if (!card.permission || hasPermission(card.permission)) {
        cards.push(card);
      }
    });
    return cards.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getModuleCard(pluginCode: string): ModuleCardConfig | undefined {
    return this.moduleCards.get(pluginCode);
  }

  getAllPluginCodes(): string[] {
    const codes = new Set<string>();
    this.navItems.forEach((_, key) => {
      const parts = key.split(':');
      codes.add(parts[0]);
    });
    return Array.from(codes);
  }

  getNavItemsByPermission(hasPermission: (permission: string) => boolean): NavItem[] {
    const items: NavItem[] = [];
    this.navItems.forEach((navItems, key) => {
      if (key.endsWith(':top')) {
        navItems.forEach((item) => {
          if (!item.permission || hasPermission(item.permission)) {
            items.push(item);
          }
        });
      }
    });
    return items.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  updateModuleStatus(pluginCode: string, status: 'online' | 'beta' | 'plan' | 'new'): void {
    this.moduleStatuses.set(pluginCode, status);
    const card = this.moduleCards.get(pluginCode);
    if (card) {
      card.status = status;
    }
    this.emitter.emit('navigationUpdated', pluginCode);
  }

  /**
   * 获取按 source 分组的 topNav 项（带权限过滤）
   * 返回 { core: NavItem[], plugin: NavItem[] }
   */
  getNavItemsGroupedBySource(hasPermission: (permission: string) => boolean): {
    core: NavItem[];
    plugin: NavItem[];
  } {
    const core: NavItem[] = [];
    const plugin: NavItem[] = [];
    this.navItems.forEach((navItems, key) => {
      if (key.endsWith(':top')) {
        navItems.forEach((item) => {
          if (!item.permission || hasPermission(item.permission)) {
            const card = this.moduleCards.get(key.replace(':top', ''));
            const source = card?.source || 'plugin';
            if (source === 'core') {
              core.push(item);
            } else {
              plugin.push(item);
            }
          }
        });
      }
    });
    core.sort((a, b) => (a.order || 0) - (b.order || 0));
    plugin.sort((a, b) => (a.order || 0) - (b.order || 0));
    return { core, plugin };
  }

  /**
   * 获取所有导航项的层级结构（top_nav + sidebar_nav）
   */
  getAllNavItemsWithHierarchy(): NavItem[] {
    const items: NavItem[] = [];
    const pluginCodes = this.getAllPluginCodes();
    const topNavItems = this.getTopNavItems();

    pluginCodes.forEach((code) => {
      const sidebarNav = this.getSidebarNavItems(code);
      const topNav = topNavItems.find((item) => item.code === code);

      if (topNav) {
        const itemWithChildren: NavItem = {
          ...topNav,
          children: sidebarNav.length > 0 ? sidebarNav : topNav.children,
        };
        items.push(itemWithChildren);
      } else if (sidebarNav.length > 0) {
        items.push(...sidebarNav);
      }
    });

    return items;
  }

  /**
   * 根据路径查找导航项（支持动态路由）
   */
  findNavItemByPath(path: string): NavItem | undefined {
    const allItems = this.getAllNavItemsWithHierarchy();
    return this.findNavItemInTree(path, allItems);
  }

  /**
   * 在导航树中递归查找指定路径的项
   */
  private findNavItemInTree(path: string, items: NavItem[]): NavItem | undefined {
    for (const item of items) {
      if (item.path === path) {
        return item;
      }

      if (item.path.includes(':') && this.matchDynamicRoute(item.path, path)) {
        return item;
      }

      if (item.children) {
        const found = this.findNavItemInTree(path, item.children);
        if (found) return found;
      }
    }
    return undefined;
  }

  /**
   * 匹配动态路由
   */
  private matchDynamicRoute(routePath: string, currentPath: string): boolean {
    const routeSegments = routePath.split('/').filter(Boolean);
    const pathSegments = currentPath.split('/').filter(Boolean);

    if (routeSegments.length !== pathSegments.length) {
      return false;
    }

    for (let i = 0; i < routeSegments.length; i++) {
      const routeSegment = routeSegments[i];
      const pathSegment = pathSegments[i];

      if (!routeSegment.startsWith(':') && routeSegment !== pathSegment) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取指定路径的导航层级链（从根到目标）
   */
  getNavHierarchy(path: string): NavItem[] {
    const allItems = this.getAllNavItemsWithHierarchy();
    const hierarchy: NavItem[] = [];

    const traverse = (items: NavItem[], currentHierarchy: NavItem[]): boolean => {
      for (const item of items) {
        const newHierarchy = [...currentHierarchy, item];

        if (
          item.path === path ||
          (item.path.includes(':') && this.matchDynamicRoute(item.path, path))
        ) {
          hierarchy.push(...newHierarchy);
          return true;
        }

        if (item.children && traverse(item.children, newHierarchy)) {
          return true;
        }
      }
      return false;
    };

    traverse(allItems, []);
    return hierarchy;
  }

  /**
   * 根据路径查找所属模块
   * 通过遍历所有模块的导航项，找到包含该路径的模块
   */
  findModuleByPath(path: string): string | undefined {
    const pluginCodes = this.getAllPluginCodes();

    for (const code of pluginCodes) {
      const sidebarItems = this.getSidebarNavItems(code);
      for (const item of sidebarItems) {
        if (
          item.path === path ||
          (item.path.includes(':') && this.matchDynamicRoute(item.path, path))
        ) {
          return code;
        }
        if (path.startsWith(`${item.path}/`)) {
          return code;
        }
      }

      const topNavItems = this.getTopNavItems().filter((t) => t.code === code);
      for (const item of topNavItems) {
        if (
          item.path === path ||
          (item.path.includes(':') && this.matchDynamicRoute(item.path, path))
        ) {
          return code;
        }
        if (path.startsWith(`${item.path}/`)) {
          return code;
        }
      }
    }

    return undefined;
  }
}

export const navigationRegistry = NavigationRegistry.getInstance();

const registerDefaultModules = () => {
  navigationRegistry.register('erp', {
    top_nav: [
      {
        code: 'erp',
        label: '企业资源',
        icon: 'Building',
        path: '/erp',
        group: 'core',
        order: 1,
        permission: 'erp:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'erp-dashboard',
        label: '仪表盘',
        icon: 'LayoutDashboard',
        path: '/erp/dashboard',
        order: 0,
        permission: 'erp:read',
      },
      {
        code: 'erp-purchase-orders',
        label: '采购订单',
        icon: 'ShoppingBag',
        path: '/erp/purchase-orders',
        order: 1,
        permission: 'erp:read',
      },
      {
        code: 'erp-sales-orders',
        label: '销售订单',
        icon: 'ShoppingCart',
        path: '/erp/sales-orders',
        order: 2,
        permission: 'erp:read',
      },
      {
        code: 'erp-inventory-management',
        label: '库存管理',
        icon: 'Package',
        path: '/erp/inventory',
        order: 3,
        permission: 'erp:read',
      },
      {
        code: 'erp-materials',
        label: '物料管理',
        icon: 'Boxes',
        path: '/erp/materials',
        order: 4,
        permission: 'erp:read',
      },
      {
        code: 'erp-suppliers',
        label: '供应商管理',
        icon: 'Truck',
        path: '/erp/suppliers',
        order: 5,
        permission: 'erp:read',
      },
      {
        code: 'erp-customers',
        label: '客户管理',
        icon: 'Users',
        path: '/erp/customers',
        order: 6,
        permission: 'erp:read',
      },
      {
        code: 'erp-financial-reports',
        label: '财务报表',
        icon: 'BarChart3',
        path: '/erp/financial-reports',
        order: 7,
        permission: 'erp:read',
      },
      {
        code: 'erp-vouchers',
        label: '凭证管理',
        icon: 'FileText',
        path: '/erp/vouchers',
        order: 8,
        permission: 'erp:read',
      },
      {
        code: 'erp-finance',
        label: '财务管理',
        icon: 'DollarSign',
        path: '/finance',
        order: 9,
        permission: 'erp:read',
      },
      {
        code: 'erp-inventory',
        label: 'WMS库存',
        icon: 'Warehouse',
        path: '/wms/inventory',
        order: 10,
        permission: 'erp:read',
      },
      {
        code: 'erp-sales',
        label: 'CRM销售',
        icon: 'Target',
        path: '/crm/opportunities',
        order: 11,
        permission: 'erp:read',
      },
      {
        code: 'erp-audit-logs',
        label: '审计日志',
        icon: 'ScrollText',
        path: '/erp/audit-logs',
        order: 12,
        permission: 'erp:admin',
      },
      {
        code: 'erp-dict',
        label: '数据字典',
        icon: 'Book',
        path: '/erp/dict',
        order: 13,
        permission: 'erp:admin',
      },
      {
        code: 'erp-database',
        label: '数据库管理',
        icon: 'Database',
        path: '/erp/database',
        order: 14,
        permission: 'erp:admin',
      },
      {
        code: 'erp-expense-claims',
        label: '费用报销',
        path: '/expense-claims',
        icon: 'Receipt',
        order: 15,
        permission: 'erp:read',
      },
    ],
    module_tabs: [
      {
        code: 'erp-dashboard',
        label: '仪表盘',
        path: '/erp/dashboard',
        permission: 'erp:read',
      },
      {
        code: 'erp-purchase-orders',
        label: '采购订单',
        path: '/erp/purchase-orders',
        permission: 'erp:read',
      },
      {
        code: 'erp-sales-orders',
        label: '销售订单',
        path: '/erp/sales-orders',
        permission: 'erp:read',
      },
      {
        code: 'erp-inventory-management',
        label: '库存管理',
        path: '/erp/inventory',
        permission: 'erp:read',
      },
      {
        code: 'erp-materials',
        label: '物料管理',
        path: '/erp/materials',
        permission: 'erp:read',
      },
      {
        code: 'erp-suppliers',
        label: '供应商管理',
        path: '/erp/suppliers',
        permission: 'erp:read',
      },
      {
        code: 'erp-customers',
        label: '客户管理',
        path: '/erp/customers',
        permission: 'erp:read',
      },
      {
        code: 'erp-financial-reports',
        label: '财务报表',
        path: '/erp/financial-reports',
        permission: 'erp:read',
      },
      {
        code: 'erp-vouchers',
        label: '凭证管理',
        path: '/erp/vouchers',
        permission: 'erp:read',
      },
      {
        code: 'erp-finance',
        label: '财务管理',
        path: '/finance',
        permission: 'erp:read',
      },
      {
        code: 'erp-inventory',
        label: 'WMS库存',
        path: '/wms/inventory',
        permission: 'erp:read',
      },
      {
        code: 'erp-sales',
        label: 'CRM销售',
        path: '/crm/opportunities',
        permission: 'erp:read',
      },
      {
        code: 'erp-audit-logs',
        label: '审计日志',
        path: '/erp/audit-logs',
        permission: 'erp:admin',
      },
      {
        code: 'erp-dict',
        label: '数据字典',
        path: '/erp/dict',
        permission: 'erp:admin',
      },
      {
        code: 'erp-database',
        label: '数据库管理',
        path: '/erp/database',
        permission: 'erp:admin',
      },
      {
        code: 'erp-expense-claims',
        label: '费用报销',
        path: '/expense-claims',
        permission: 'erp:read',
      },
    ],
    module_card: {
      code: 'erp',
      name: '企业资源管理',
      icon: 'Building',
      path: '/erp',
      status: 'online',
      order: 1,
      permission: 'erp:read',
      source: 'core',
    },
  });

  navigationRegistry.register('pm', {
    top_nav: [
      {
        code: 'pm',
        label: '项目管理',
        icon: 'FolderKanban',
        path: '/pm',
        group: 'core',
        order: 2,
        permission: 'pm:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'pm-dashboard',
        label: '仪表盘',
        icon: 'LayoutDashboard',
        path: '/pm/dashboard',
        order: -1,
        permission: 'pm:read',
      },
      {
        code: 'pm-projects',
        label: '项目列表',
        icon: 'FolderKanban',
        path: '/pm/projects',
        order: 0,
        permission: 'pm:read',
      },
      {
        code: 'pm-contract',
        label: '合同管理',
        icon: 'FileSignature',
        path: '/pm/contracts',
        order: 4,
        permission: 'pm:read',
      },
      {
        code: 'pm-reports',
        label: '报表分析',
        icon: 'BarChart3',
        path: '/pm/reports',
        order: 6,
        permission: 'pm:read',
      },
      {
        code: 'pm-resources',
        label: '资源管理',
        icon: 'Boxes',
        path: '/pm/resources',
        order: 7,
        permission: 'pm:read',
      },
    ],
    module_tabs: [
      {
        code: 'pm-dashboard',
        label: '仪表盘',
        path: '/pm/dashboard',
        permission: 'pm:read',
      },
      {
        code: 'pm-projects',
        label: '项目列表',
        path: '/pm/projects',
        permission: 'pm:read',
      },
      {
        code: 'pm-contract',
        label: '合同管理',
        path: '/pm/contracts',
        permission: 'pm:read',
      },
      {
        code: 'pm-reports',
        label: '报表分析',
        path: '/pm/reports',
        permission: 'pm:read',
      },
      {
        code: 'pm-resources',
        label: '资源管理',
        path: '/pm/resources',
        permission: 'pm:read',
      },
    ],
    module_card: {
      code: 'pm',
      name: '项目管理',
      icon: 'FolderKanban',
      path: '/pm',
      status: 'online',
      order: 2,
      permission: 'pm:read',
      source: 'core',
      suite: 'project',
    },
  });

  navigationRegistry.register('rs', {
    top_nav: [
      {
        code: 'rs',
        label: '研发管理',
        icon: 'FlaskConical',
        path: '/rs',
        group: 'core',
        order: 3,
        permission: 'rs:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'rs-projects',
        label: '研发项目',
        icon: 'FlaskConical',
        path: '/rs/projects',
        order: 0,
        permission: 'rs:read',
      },
      {
        code: 'rs-documents',
        label: '文档管理',
        icon: 'FileText',
        path: '/rs/docs',
        order: 1,
        permission: 'rs:read',
      },
      {
        code: 'rs-tests',
        label: '测试管理',
        icon: 'CheckSquare',
        path: '/rs/tests',
        order: 2,
        permission: 'rs:read',
      },
      {
        code: 'rs-releases',
        label: '版本发布',
        icon: 'Rocket',
        path: '/rs/releases',
        order: 3,
        permission: 'rs:read',
      },
      {
        code: 'rs-bugs',
        label: '缺陷管理',
        icon: 'Bug',
        path: '/rs/bugs',
        order: 4,
        permission: 'rs:read',
      },
      {
        code: 'rs-builds',
        label: '构建管理',
        icon: 'Hammer',
        path: '/rs/builds',
        order: 5,
        permission: 'rs:read',
      },
      {
        code: 'rs-code',
        label: '代码管理',
        icon: 'Code',
        path: '/rs/code',
        order: 6,
        permission: 'rs:read',
      },
      {
        code: 'rs-deploy',
        label: '部署管理',
        icon: 'CloudCog',
        path: '/rs/deploy',
        order: 7,
        permission: 'rs:read',
      },
      {
        code: 'rs-milestones',
        label: '里程碑',
        icon: 'Flag',
        path: '/rs/milestones',
        order: 8,
        permission: 'rs:read',
      },
      {
        code: 'rs-reviews',
        label: '评审管理',
        icon: 'Eye',
        path: '/rs/reviews',
        order: 9,
        permission: 'rs:read',
      },
      {
        code: 'rs-settings',
        label: '研发设置',
        icon: 'Settings',
        path: '/rs/settings',
        order: 10,
        permission: 'rs:read',
      },
      {
        code: 'rs-formulas',
        label: '配方管理',
        path: '/rs/formulas',
        icon: 'FlaskConical',
        order: 11,
        permission: 'rs:read',
      },
      {
        code: 'rs-experiments',
        label: '试验管理',
        path: '/rs/experiments',
        icon: 'TestTube',
        order: 12,
        permission: 'rs:read',
      },
    ],
    module_tabs: [
      {
        code: 'rs-projects',
        label: '研发项目',
        path: '/rs/projects',
        permission: 'rs:read',
      },
      {
        code: 'rs-documents',
        label: '文档管理',
        path: '/rs/docs',
        permission: 'rs:read',
      },
      {
        code: 'rs-tests',
        label: '测试管理',
        path: '/rs/tests',
        permission: 'rs:read',
      },
      {
        code: 'rs-releases',
        label: '版本发布',
        path: '/rs/releases',
        permission: 'rs:read',
      },
      {
        code: 'rs-bugs',
        label: '缺陷管理',
        path: '/rs/bugs',
        permission: 'rs:read',
      },
      {
        code: 'rs-builds',
        label: '构建管理',
        path: '/rs/builds',
        permission: 'rs:read',
      },
      {
        code: 'rs-code',
        label: '代码管理',
        path: '/rs/code',
        permission: 'rs:read',
      },
      {
        code: 'rs-deploy',
        label: '部署管理',
        path: '/rs/deploy',
        permission: 'rs:read',
      },
      {
        code: 'rs-milestones',
        label: '里程碑',
        path: '/rs/milestones',
        permission: 'rs:read',
      },
      {
        code: 'rs-reviews',
        label: '评审管理',
        path: '/rs/reviews',
        permission: 'rs:read',
      },
      {
        code: 'rs-settings',
        label: '研发设置',
        path: '/rs/settings',
        permission: 'rs:read',
      },
      {
        code: 'rs-formulas',
        label: '配方管理',
        path: '/rs/formulas',
        permission: 'rs:read',
      },
      {
        code: 'rs-experiments',
        label: '试验管理',
        path: '/rs/experiments',
        permission: 'rs:read',
      },
    ],
    module_card: {
      code: 'rs',
      name: '研发管理',
      icon: 'FlaskConical',
      path: '/rs',
      status: 'online',
      order: 3,
      permission: 'rs:read',
      source: 'core',
      suite: 'project',
    },
  });

  navigationRegistry.register('scm', {
    top_nav: [
      {
        code: 'scm',
        label: '供应链',
        icon: 'Truck',
        path: '/scm',
        group: 'business',
        order: 4,
        permission: 'scm:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'scm-suppliers',
        label: '供应商管理',
        icon: 'Users',
        path: '/scm/suppliers',
        order: 0,
        permission: 'scm:read',
      },
      {
        code: 'scm-purchase-orders',
        label: '采购订单',
        icon: 'ShoppingCart',
        path: '/scm/purchase-orders',
        order: 1,
        permission: 'scm:read',
      },
      {
        code: 'scm-purchase-items',
        label: '采购物料',
        icon: 'Package',
        path: '/scm/purchase-items',
        order: 1.5,
        permission: 'scm:read',
      },
      {
        code: 'scm-evaluations',
        label: '供应商评估',
        icon: 'Award',
        path: '/scm/evaluations',
        order: 1.6,
        permission: 'scm:read',
      },
      {
        code: 'scm-delivery-appointment',
        label: '送货预约',
        icon: 'CalendarCheck',
        path: '/scm/delivery-appointments',
        order: 2,
        permission: 'scm:read',
      },
      {
        code: 'scm-mrp-plan',
        label: 'MRP计划',
        icon: 'Calculator',
        path: '/scm/mrp-plan',
        order: 2.5,
        permission: 'scm:read',
      },
      {
        code: 'scm-mrp-suggestion',
        label: 'MRP建议',
        icon: 'Lightbulb',
        path: '/scm/mrp-suggestion',
        order: 2.6,
        permission: 'scm:read',
      },
      {
        code: 'scm-purchase-requisitions',
        label: '采购申请',
        icon: 'FileEdit',
        path: '/scm/purchase-requisitions',
        order: 3,
        permission: 'scm:read',
      },
      {
        code: 'scm-purchase-contracts',
        label: '采购合同',
        icon: 'FileSignature',
        path: '/scm/purchase-contracts',
        order: 3.1,
        permission: 'scm:read',
      },
      {
        code: 'scm-supplier-admissions',
        label: '供应商准入',
        icon: 'UserCheck',
        path: '/scm/supplier-admissions',
        order: 3.2,
        permission: 'scm:read',
      },
    ],
    module_tabs: [
      {
        code: 'scm-suppliers',
        label: '供应商管理',
        path: '/scm/suppliers',
        permission: 'scm:read',
      },
      {
        code: 'scm-purchase-orders',
        label: '采购订单',
        path: '/scm/purchase-orders',
        permission: 'scm:read',
      },
      {
        code: 'scm-purchase-items',
        label: '采购物料',
        path: '/scm/purchase-items',
        permission: 'scm:read',
      },
      {
        code: 'scm-evaluations',
        label: '供应商评估',
        path: '/scm/evaluations',
        permission: 'scm:read',
      },
      {
        code: 'scm-delivery-appointment',
        label: '送货预约',
        path: '/scm/delivery-appointments',
        permission: 'scm:read',
      },
      {
        code: 'scm-mrp-plan',
        label: 'MRP计划',
        path: '/scm/mrp-plan',
        permission: 'scm:read',
      },
      {
        code: 'scm-mrp-suggestion',
        label: 'MRP建议',
        path: '/scm/mrp-suggestion',
        permission: 'scm:read',
      },
      {
        code: 'scm-purchase-requisitions',
        label: '采购申请',
        path: '/scm/purchase-requisitions',
        permission: 'scm:read',
      },
      {
        code: 'scm-purchase-contracts',
        label: '采购合同',
        path: '/scm/purchase-contracts',
        permission: 'scm:read',
      },
      {
        code: 'scm-supplier-admissions',
        label: '供应商准入',
        path: '/scm/supplier-admissions',
        permission: 'scm:read',
      },
    ],
    module_card: {
      code: 'scm',
      name: '供应链管理',
      icon: 'Truck',
      path: '/scm',
      status: 'online',
      order: 4,
      permission: 'scm:read',
      source: 'plugin',
      suite: 'supply',
    },
  });

  navigationRegistry.register('finance', {
    top_nav: [
      {
        code: 'finance',
        label: '财务管理',
        icon: 'Wallet',
        path: '/finance',
        group: 'business',
        order: 10,
        permission: 'finance:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'finance-vouchers',
        label: '凭证管理',
        icon: 'FileText',
        path: '/finance/vouchers',
        order: 1,
        permission: 'finance:read',
      },
      {
        code: 'finance-ledger',
        label: '总账管理',
        icon: 'Book',
        path: '/finance/ledger',
        order: 2,
        permission: 'finance:read',
      },
      {
        code: 'finance-receivable',
        label: '应收管理',
        icon: 'CreditCard',
        path: '/finance/receivable',
        order: 3,
        permission: 'finance:read',
      },
      {
        code: 'finance-payable',
        label: '应付管理',
        icon: 'CreditCard',
        path: '/finance/payable',
        order: 4,
        permission: 'finance:read',
      },
      {
        code: 'finance-invoices',
        label: '发票管理',
        icon: 'Receipt',
        path: '/finance/invoices',
        order: 5,
        permission: 'finance:read',
      },
      {
        code: 'finance-tax',
        label: '税务管理',
        icon: 'Percent',
        path: '/finance/tax',
        order: 6,
        permission: 'finance:read',
      },
      {
        code: 'finance-expense',
        label: '费用管理',
        icon: 'Receipt',
        path: '/finance/expense',
        order: 7,
        permission: 'finance:read',
      },
      {
        code: 'finance-cost',
        label: '成本管理',
        icon: 'Calculator',
        path: '/finance/cost',
        order: 8,
        permission: 'finance:read',
      },
      {
        code: 'finance-reports',
        label: '财务报表',
        icon: 'BarChart3',
        path: '/finance/reports',
        order: 9,
        permission: 'finance:read',
      },
      {
        code: 'finance-budget',
        label: '预算管理',
        icon: 'Calculator',
        path: '/finance/budget',
        order: 10,
        permission: 'finance:read',
      },
      {
        code: 'finance-budget-management',
        label: '预算管理',
        icon: 'Calculator',
        path: '/finance/budget-management',
        order: 10.5,
        permission: 'finance:read',
      },
      {
        code: 'finance-assets',
        label: '资产管理',
        icon: 'Building',
        path: '/finance/assets',
        order: 11,
        permission: 'finance:read',
      },
      {
        code: 'finance-consolidation',
        label: '合并报表',
        icon: 'GitMerge',
        path: '/finance/consolidation',
        order: 12,
        permission: 'finance:read',
      },
      {
        code: 'finance-consolidation-reports',
        label: '合并报表',
        icon: 'GitMerge',
        path: '/finance/consolidation-reports',
        order: 12.5,
        permission: 'finance:read',
      },
      {
        code: 'finance-opening-balance',
        label: '期初余额',
        icon: 'Scale',
        path: '/finance/opening-balance',
        order: 13,
        permission: 'finance:read',
      },
      {
        code: 'finance-receipts',
        label: '收款管理',
        icon: 'Download',
        path: '/finance/receipts',
        order: 14,
        permission: 'finance:read',
      },
      {
        code: 'finance-payments',
        label: '付款管理',
        icon: 'Upload',
        path: '/finance/payments',
        order: 15,
        permission: 'finance:read',
      },
      {
        code: 'finance-voucher-templates',
        label: '凭证模板',
        path: '/finance/voucher-templates',
        icon: 'FileText',
        order: 16,
        permission: 'finance:read',
      },
    ],
    module_tabs: [
      {
        code: 'finance-vouchers',
        label: '凭证管理',
        path: '/finance/vouchers',
        permission: 'finance:read',
      },
      {
        code: 'finance-ledger',
        label: '总账管理',
        path: '/finance/ledger',
        permission: 'finance:read',
      },
      {
        code: 'finance-receivable',
        label: '应收管理',
        path: '/finance/receivable',
        permission: 'finance:read',
      },
      {
        code: 'finance-payable',
        label: '应付管理',
        path: '/finance/payable',
        permission: 'finance:read',
      },
      {
        code: 'finance-invoices',
        label: '发票管理',
        path: '/finance/invoices',
        permission: 'finance:read',
      },
      {
        code: 'finance-tax',
        label: '税务管理',
        path: '/finance/tax',
        permission: 'finance:read',
      },
      {
        code: 'finance-expense',
        label: '费用管理',
        path: '/finance/expense',
        permission: 'finance:read',
      },
      {
        code: 'finance-cost',
        label: '成本管理',
        path: '/finance/cost',
        permission: 'finance:read',
      },
      {
        code: 'finance-reports',
        label: '财务报表',
        path: '/finance/reports',
        permission: 'finance:read',
      },
      {
        code: 'finance-budget',
        label: '预算管理',
        path: '/finance/budget',
        permission: 'finance:read',
      },
      {
        code: 'finance-budget-management',
        label: '预算管理',
        path: '/finance/budget-management',
        permission: 'finance:read',
      },
      {
        code: 'finance-assets',
        label: '资产管理',
        path: '/finance/assets',
        permission: 'finance:read',
      },
      {
        code: 'finance-consolidation',
        label: '合并报表',
        path: '/finance/consolidation',
        permission: 'finance:read',
      },
      {
        code: 'finance-consolidation-reports',
        label: '合并报表',
        path: '/finance/consolidation-reports',
        permission: 'finance:read',
      },
      {
        code: 'finance-opening-balance',
        label: '期初余额',
        path: '/finance/opening-balance',
        permission: 'finance:read',
      },
      {
        code: 'finance-receipts',
        label: '收款管理',
        path: '/finance/receipts',
        icon: 'Download',
        order: 14,
        permission: 'finance:read',
      },
      {
        code: 'finance-payments',
        label: '付款管理',
        path: '/finance/payments',
        icon: 'Upload',
        order: 15,
        permission: 'finance:read',
      },
      {
        code: 'finance-voucher-templates',
        label: '凭证模板',
        path: '/finance/voucher-templates',
        permission: 'finance:read',
      },
    ],
    module_card: {
      code: 'finance',
      name: '财务管理',
      icon: 'Wallet',
      path: '/finance',
      status: 'online',
      order: 10,
      permission: 'finance:read',
      source: 'plugin',
      suite: 'finance',
    },
  });

  navigationRegistry.register('mes', {
    top_nav: [
      {
        code: 'mes',
        label: '生产执行',
        icon: 'Factory',
        path: '/mes',
        group: 'business',
        order: 11,
        permission: 'mes:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'mes-board',
        label: '生产看板',
        icon: 'LayoutDashboard',
        path: '/mes/board',
        order: -1,
        permission: 'mes:read',
      },
      {
        code: 'mes-orders',
        label: '生产订单',
        icon: 'ClipboardList',
        path: '/mes/orders',
        order: 0,
        permission: 'mes:read',
      },
      {
        code: 'mes-schedules',
        label: '生产排程',
        icon: 'CalendarClock',
        path: '/mes/schedules',
        order: 1,
        permission: 'mes:read',
      },
      {
        code: 'mes-processes',
        label: '生产过程',
        icon: 'GitBranch',
        path: '/mes/processes',
        order: 2,
        permission: 'mes:read',
      },
      {
        code: 'mes-process-routes',
        label: '工序路线',
        icon: 'Route',
        path: '/mes/process-routes',
        order: 2.5,
        permission: 'mes:read',
      },
      {
        code: 'mes-process-flows',
        label: '工艺流程',
        icon: 'GitBranch',
        path: '/mes/process-flows',
        order: 2.6,
        permission: 'mes:read',
      },
      {
        code: 'mes-workstations',
        label: '工作站',
        icon: 'Monitor',
        path: '/mes/workstations',
        order: 3,
        permission: 'mes:read',
      },
      {
        code: 'mes-equipment',
        label: '设备管理',
        icon: 'Wrench',
        path: '/mes/equipment',
        order: 4,
        permission: 'mes:read',
      },
      {
        code: 'mes-equipment-oee',
        label: 'OEE分析',
        icon: 'BarChart3',
        path: '/mes/equipment-oee',
        order: 5,
        permission: 'mes:read',
      },
      {
        code: 'mes-boms',
        label: '物料BOM',
        icon: 'Layers',
        path: '/mes/boms',
        order: 6,
        permission: 'mes:read',
      },
      {
        code: 'mes-quality',
        label: '质检管理',
        icon: 'ClipboardCheck',
        path: '/mes/quality',
        order: 6.5,
        permission: 'mes:read',
      },
      {
        code: 'mes-wip',
        label: '在制品',
        icon: 'Package',
        path: '/mes/wip',
        order: 7,
        permission: 'mes:read',
      },
      {
        code: 'mes-material-issues',
        label: '物料领用',
        icon: 'ArrowRightFromLine',
        path: '/mes/material-issues',
        order: 8,
        permission: 'mes:read',
      },
      {
        code: 'mes-material-returns',
        label: '物料退库',
        icon: 'ArrowLeftFromLine',
        path: '/mes/material-returns',
        order: 9,
        permission: 'mes:read',
      },
      {
        code: 'mes-records',
        label: '生产记录',
        icon: 'FileText',
        path: '/mes/records',
        order: 10,
        permission: 'mes:read',
      },
      {
        code: 'mes-quality-traceability',
        label: '质量追溯',
        icon: 'Search',
        path: '/mes/quality-traceability',
        order: 11,
        permission: 'mes:read',
      },
      {
        code: 'mes-work-reports',
        label: '报工管理',
        icon: 'ClipboardPen',
        path: '/mes/work-reports',
        order: 12,
        permission: 'mes:read',
      },
      {
        code: 'mes-quality-inspection',
        label: '质检管理',
        icon: 'ClipboardCheck',
        path: '/mes/quality-inspection',
        order: 13,
        permission: 'mes:read',
      },
      {
        code: 'mes-material-requirements',
        label: '物料需求计划',
        icon: 'PackageOpen',
        path: '/mes/material-requirements',
        order: 14,
        permission: 'mes:read',
      },
      {
        code: 'mes-work-orders',
        label: '工单管理',
        icon: 'ListTodo',
        path: '/mes/work-orders',
        order: 15,
        permission: 'mes:read',
      },
      {
        code: 'mes-teams',
        label: '班组管理',
        icon: 'Users',
        path: '/mes/teams',
        order: 16,
        permission: 'mes:read',
      },
      {
        code: 'mes-production-kanban',
        label: '生产看板',
        icon: 'LayoutGrid',
        path: '/mes/production-kanban',
        order: 17,
        permission: 'mes:read',
      },
    ],
    module_tabs: [
      {
        code: 'mes-board',
        label: '生产看板',
        path: '/mes/board',
        permission: 'mes:read',
      },
      {
        code: 'mes-orders',
        label: '生产订单',
        path: '/mes/orders',
        permission: 'mes:read',
      },
      {
        code: 'mes-schedules',
        label: '生产排程',
        path: '/mes/schedules',
        permission: 'mes:read',
      },
      {
        code: 'mes-processes',
        label: '生产过程',
        path: '/mes/processes',
        permission: 'mes:read',
      },
      {
        code: 'mes-process-routes',
        label: '工序路线',
        path: '/mes/process-routes',
        permission: 'mes:read',
      },
      {
        code: 'mes-process-flows',
        label: '工艺流程',
        path: '/mes/process-flows',
        permission: 'mes:read',
      },
      {
        code: 'mes-workstations',
        label: '工作站',
        path: '/mes/workstations',
        permission: 'mes:read',
      },
      {
        code: 'mes-equipment',
        label: '设备管理',
        path: '/mes/equipment',
        permission: 'mes:read',
      },
      {
        code: 'mes-equipment-oee',
        label: 'OEE分析',
        path: '/mes/equipment-oee',
        permission: 'mes:read',
      },
      {
        code: 'mes-boms',
        label: '物料BOM',
        path: '/mes/boms',
        permission: 'mes:read',
      },
      {
        code: 'mes-quality',
        label: '质检管理',
        path: '/mes/quality',
        permission: 'mes:read',
      },
      {
        code: 'mes-wip',
        label: '在制品',
        path: '/mes/wip',
        permission: 'mes:read',
      },
      {
        code: 'mes-material-issues',
        label: '物料领用',
        path: '/mes/material-issues',
        permission: 'mes:read',
      },
      {
        code: 'mes-material-returns',
        label: '物料退库',
        path: '/mes/material-returns',
        permission: 'mes:read',
      },
      {
        code: 'mes-records',
        label: '生产记录',
        path: '/mes/records',
        permission: 'mes:read',
      },
      {
        code: 'mes-quality-traceability',
        label: '质量追溯',
        path: '/mes/quality-traceability',
        permission: 'mes:read',
      },
      {
        code: 'mes-work-reports',
        label: '报工管理',
        path: '/mes/work-reports',
        permission: 'mes:read',
      },
      {
        code: 'mes-quality-inspection',
        label: '质检管理',
        path: '/mes/quality-inspection',
        permission: 'mes:read',
      },
      {
        code: 'mes-material-requirements',
        label: '物料需求计划',
        path: '/mes/material-requirements',
        permission: 'mes:read',
      },
      {
        code: 'mes-work-orders',
        label: '工单管理',
        path: '/mes/work-orders',
        permission: 'mes:read',
      },
      {
        code: 'mes-teams',
        label: '班组管理',
        path: '/mes/teams',
        permission: 'mes:read',
      },
      {
        code: 'mes-production-kanban',
        label: '生产看板',
        path: '/mes/production-kanban',
        permission: 'mes:read',
      },
    ],
    module_card: {
      code: 'mes',
      name: '生产执行',
      icon: 'Factory',
      path: '/mes',
      status: 'online',
      order: 11,
      permission: 'mes:read',
      source: 'plugin',
      suite: 'manufacturing',
    },
  });

  navigationRegistry.register('crm', {
    top_nav: [
      {
        code: 'crm',
        label: '客户关系',
        icon: 'Users',
        path: '/crm',
        group: 'business',
        order: 5,
        permission: 'crm:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'crm-dashboard',
        label: '仪表盘',
        icon: 'LayoutDashboard',
        path: '/crm/dashboard',
        order: -1,
        permission: 'crm:read',
      },
      {
        code: 'crm-customers',
        label: '客户管理',
        icon: 'Users',
        path: '/crm/customers',
        order: 0,
        permission: 'crm:read',
      },
      {
        code: 'crm-opportunities',
        label: '商机管理',
        icon: 'Target',
        path: '/crm/opportunities',
        order: 1,
        permission: 'crm:read',
      },
      {
        code: 'crm-contacts',
        label: '联系人管理',
        icon: 'Contact',
        path: '/crm/contacts',
        order: 2,
        permission: 'crm:read',
      },
      {
        code: 'crm-interactions',
        label: '交互记录管理',
        icon: 'MessagesSquare',
        path: '/crm/interactions',
        order: 3,
        permission: 'crm:read',
      },
      {
        code: 'crm-segments',
        label: '客户分群',
        icon: 'Tags',
        path: '/crm/segments',
        order: 4,
        permission: 'crm:read',
      },
      {
        code: 'crm-funnel',
        label: '销售漏斗',
        icon: 'Filter',
        path: '/crm/funnel',
        order: 5,
        permission: 'crm:read',
      },
      {
        code: 'crm-recommendations',
        label: '客户推荐',
        icon: 'Lightbulb',
        path: '/crm/recommendations',
        order: 6,
        permission: 'crm:read',
      },
      {
        code: 'crm-forecast',
        label: '销售预测',
        icon: 'TrendingUp',
        path: '/crm/forecast',
        order: 7,
        permission: 'crm:read',
      },
      {
        code: 'crm-scoring',
        label: '客户评分',
        icon: 'Star',
        path: '/crm/scoring',
        order: 8,
        permission: 'crm:read',
      },
      {
        code: 'crm-billing',
        label: '账单管理',
        icon: 'Receipt',
        path: '/crm/billing',
        order: 9,
        permission: 'crm:read',
      },
    ],
    module_tabs: [
      {
        code: 'crm-dashboard',
        label: '仪表盘',
        path: '/crm/dashboard',
        permission: 'crm:read',
      },
      {
        code: 'crm-customers',
        label: '客户管理',
        path: '/crm/customers',
        permission: 'crm:read',
      },
      {
        code: 'crm-opportunities',
        label: '商机管理',
        path: '/crm/opportunities',
        permission: 'crm:read',
      },
      {
        code: 'crm-contacts',
        label: '联系人管理',
        path: '/crm/contacts',
        permission: 'crm:read',
      },
      {
        code: 'crm-interactions',
        label: '交互记录管理',
        path: '/crm/interactions',
        permission: 'crm:read',
      },
      {
        code: 'crm-segments',
        label: '客户分群',
        path: '/crm/segments',
        permission: 'crm:read',
      },
      {
        code: 'crm-funnel',
        label: '销售漏斗',
        path: '/crm/funnel',
        permission: 'crm:read',
      },
      {
        code: 'crm-recommendations',
        label: '客户推荐',
        path: '/crm/recommendations',
        permission: 'crm:read',
      },
      {
        code: 'crm-forecast',
        label: '销售预测',
        path: '/crm/forecast',
        permission: 'crm:read',
      },
      {
        code: 'crm-scoring',
        label: '客户评分',
        path: '/crm/scoring',
        permission: 'crm:read',
      },
      {
        code: 'crm-billing',
        label: '账单管理',
        path: '/crm/billing',
        permission: 'crm:read',
      },
    ],
    module_card: {
      code: 'crm',
      name: '客户关系管理',
      icon: 'Users',
      path: '/crm',
      status: 'beta',
      order: 5,
      permission: 'crm:read',
      source: 'plugin',
      suite: 'crm',
    },
  });

  navigationRegistry.register('ai', {
    top_nav: [
      {
        code: 'ai',
        label: 'AI助手',
        icon: 'Bot',
        path: '/ai',
        group: 'core',
        order: 6,
        permission: 'ai:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'ai-dashboard',
        label: 'AI仪表盘',
        icon: 'LayoutDashboard',
        path: '/ai',
        order: 0,
        permission: 'ai:read',
      },
      {
        code: 'ai-chat',
        label: '智能对话',
        icon: 'MessageSquare',
        path: '/ai/chat',
        order: 1,
        permission: 'ai:read',
      },
      {
        code: 'ai-knowledge',
        label: '知识库',
        icon: 'Database',
        path: '/ai/knowledge',
        order: 2,
        permission: 'ai:read',
      },
      {
        code: 'ai-document',
        label: '文档智能',
        icon: 'FileText',
        path: '/ai/document',
        order: 3,
        permission: 'ai:read',
      },
      {
        code: 'ai-code',
        label: '代码助手',
        icon: 'Code2',
        path: '/ai/code',
        order: 4,
        permission: 'ai:read',
      },
      {
        code: 'ai-prompts',
        label: 'Prompt库',
        icon: 'BookOpen',
        path: '/ai/prompts',
        order: 5,
        permission: 'ai:read',
      },
      {
        code: 'ai-settings',
        label: '模型设置',
        icon: 'Settings',
        path: '/ai/settings',
        order: 6,
        permission: 'ai:read',
      },
    ],
    module_tabs: [
      {
        code: 'ai-dashboard',
        label: '仪表盘',
        path: '/ai',
        permission: 'ai:read',
      },
      {
        code: 'ai-chat',
        label: '智能对话',
        path: '/ai/chat',
        permission: 'ai:read',
      },
      {
        code: 'ai-knowledge',
        label: '知识库',
        path: '/ai/knowledge',
        permission: 'ai:read',
      },
      {
        code: 'ai-document',
        label: '文档智能',
        path: '/ai/document',
        permission: 'ai:read',
      },
      {
        code: 'ai-code',
        label: '代码助手',
        path: '/ai/code',
        permission: 'ai:read',
      },
      {
        code: 'ai-prompts',
        label: 'Prompt库',
        path: '/ai/prompts',
        permission: 'ai:read',
      },
      {
        code: 'ai-settings',
        label: '模型设置',
        path: '/ai/settings',
        permission: 'ai:read',
      },
    ],
    module_card: {
      code: 'ai',
      name: 'AI智能助手',
      icon: 'Bot',
      path: '/ai',
      status: 'online',
      order: 6,
      permission: 'ai:read',
      source: 'core',
    },
  });

  navigationRegistry.register('gis', {
    top_nav: [
      {
        code: 'gis',
        label: '地理信息',
        icon: 'Map',
        path: '/gis',
        group: 'business',
        order: 7,
        permission: 'gis:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'gis-map',
        label: '地图视图',
        icon: 'Map',
        path: '/gis/map',
        order: 0,
        permission: 'gis:read',
      },
      {
        code: 'gis-fence',
        label: '电子围栏',
        path: '/gis/fence',
        icon: 'Shield',
        order: 1,
        permission: 'gis:read',
      },
      {
        code: 'gis-tracking',
        label: '车辆追踪',
        path: '/gis/tracking',
        icon: 'MapPin',
        order: 2,
        permission: 'gis:read',
      },
    ],
    module_tabs: [
      {
        code: 'gis-map',
        label: '地图视图',
        path: '/gis/map',
        permission: 'gis:read',
      },
      {
        code: 'gis-fence',
        label: '电子围栏',
        path: '/gis/fence',
        permission: 'gis:read',
      },
      {
        code: 'gis-tracking',
        label: '车辆追踪',
        path: '/gis/tracking',
        permission: 'gis:read',
      },
    ],
    module_card: {
      code: 'gis',
      name: '地理信息系统',
      icon: 'Map',
      path: '/gis',
      status: 'plan',
      order: 7,
      permission: 'gis:read',
      source: 'plugin',
      suite: 'gis',
    },
  });

  navigationRegistry.register('hrm', {
    top_nav: [
      {
        code: 'hrm',
        label: '人力资源',
        icon: 'Users',
        path: '/hrm',
        group: 'business',
        order: 8,
        permission: 'hrm:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'hrm-employees',
        label: '员工管理',
        icon: 'Users',
        path: '/hrm/employees',
        order: 0,
        permission: 'hrm:read',
      },
      {
        code: 'hrm-companies',
        label: '公司管理',
        icon: 'Building',
        path: '/hrm/companies',
        order: 1,
        permission: 'hrm:read',
      },
      {
        code: 'hrm-departments',
        label: '部门管理',
        icon: 'Building2',
        path: '/hrm/departments',
        order: 2,
        permission: 'hrm:read',
      },
      {
        code: 'hrm-organization',
        label: '组织架构',
        icon: 'Network',
        path: '/hrm/organization',
        order: 3,
        permission: 'hrm:read',
      },
      {
        code: 'hrm-positions',
        label: '职位管理',
        icon: 'Briefcase',
        path: '/hrm/positions',
        order: 4,
        permission: 'hrm:read',
      },
      {
        code: 'hrm-attendance',
        label: '考勤管理',
        icon: 'Clock',
        path: '/hrm/attendance',
        order: 5,
        permission: 'hrm:read',
      },
      {
        code: 'hrm-leave',
        label: '请假管理',
        icon: 'Calendar',
        path: '/hrm/leave',
        order: 6,
        permission: 'hrm:read',
      },
      {
        code: 'hrm-contracts',
        label: '合同管理',
        icon: 'FileSignature',
        path: '/hrm/contracts',
        order: 7,
        permission: 'hrm:read',
      },
      {
        code: 'hrm-recruitment',
        label: '招聘管理',
        icon: 'UserPlus',
        path: '/hrm/recruitment',
        order: 8,
        permission: 'hrm:read',
      },
      {
        code: 'hrm-payroll',
        label: '薪酬管理',
        icon: 'DollarSign',
        path: '/hrm/payroll',
        order: 9,
        permission: 'hrm:read',
      },
      {
        code: 'hrm-training',
        label: '培训管理',
        icon: 'GraduationCap',
        path: '/hrm/training',
        order: 10,
        permission: 'hrm:read',
      },
      {
        code: 'hrm-performance',
        label: '绩效考核',
        icon: 'Award',
        path: '/hrm/performance',
        order: 11,
        permission: 'hrm:read',
      },
      {
        code: 'hrm-reports',
        label: '人事报表',
        icon: 'BarChart3',
        path: '/hrm/reports',
        order: 12,
        permission: 'hrm:read',
      },
      {
        code: 'hrm-salary-adjustments',
        label: '薪资调整',
        icon: 'TrendingUp',
        path: '/hrm/salary-adjustments',
        order: 13,
        permission: 'hrm:read',
      },
    ],
    module_tabs: [
      {
        code: 'hrm-employees',
        label: '员工管理',
        path: '/hrm/employees',
        permission: 'hrm:read',
      },
      {
        code: 'hrm-companies',
        label: '公司管理',
        path: '/hrm/companies',
        permission: 'hrm:read',
      },
      {
        code: 'hrm-departments',
        label: '部门管理',
        path: '/hrm/departments',
        permission: 'hrm:read',
      },
      {
        code: 'hrm-organization',
        label: '组织架构',
        path: '/hrm/organization',
        permission: 'hrm:read',
      },
      {
        code: 'hrm-positions',
        label: '职位管理',
        path: '/hrm/positions',
        permission: 'hrm:read',
      },
      {
        code: 'hrm-attendance',
        label: '考勤管理',
        path: '/hrm/attendance',
        permission: 'hrm:read',
      },
      {
        code: 'hrm-leave',
        label: '请假管理',
        path: '/hrm/leave',
        permission: 'hrm:read',
      },
      {
        code: 'hrm-contracts',
        label: '合同管理',
        path: '/hrm/contracts',
        permission: 'hrm:read',
      },
      {
        code: 'hrm-recruitment',
        label: '招聘管理',
        path: '/hrm/recruitment',
        permission: 'hrm:read',
      },
      {
        code: 'hrm-payroll',
        label: '薪酬管理',
        path: '/hrm/payroll',
        permission: 'hrm:read',
      },
      {
        code: 'hrm-training',
        label: '培训管理',
        path: '/hrm/training',
        permission: 'hrm:read',
      },
      {
        code: 'hrm-performance',
        label: '绩效考核',
        path: '/hrm/performance',
        permission: 'hrm:read',
      },
      {
        code: 'hrm-reports',
        label: '人事报表',
        path: '/hrm/reports',
        permission: 'hrm:read',
      },
      {
        code: 'hrm-salary-adjustments',
        label: '薪资调整',
        path: '/hrm/salary-adjustments',
        permission: 'hrm:read',
      },
    ],
    module_card: {
      code: 'hrm',
      name: '人力资源管理',
      icon: 'Users',
      path: '/hrm',
      status: 'online',
      order: 8,
      permission: 'hrm:read',
      source: 'plugin',
      suite: 'hr',
    },
  });

  navigationRegistry.register('im', {
    top_nav: [
      {
        code: 'im',
        label: '即时通讯',
        icon: 'MessageCircle',
        path: '/im',
        group: 'core',
        order: 9,
        permission: 'im:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'im-chat',
        label: '聊天',
        icon: 'MessageCircle',
        path: '/im',
        order: 0,
        permission: 'im:read',
      },
      {
        code: 'im-mail',
        label: '邮件',
        icon: 'Mail',
        path: '/mail',
        order: 1,
        permission: 'im:read',
      },
    ],
    module_tabs: [
      {
        code: 'im-chat',
        label: '聊天',
        path: '/im',
        permission: 'im:read',
      },
      {
        code: 'im-mail',
        label: '邮件',
        path: '/mail',
        permission: 'im:read',
      },
    ],
    module_card: {
      code: 'im',
      name: '即时通讯',
      icon: 'MessageCircle',
      path: '/im',
      status: 'online',
      order: 9,
      permission: 'im:read',
      source: 'core',
    },
  });

  navigationRegistry.register('bi', {
    top_nav: [
      {
        code: 'bi',
        label: '商业智能',
        icon: 'BarChart3',
        path: '/bi',
        group: 'business',
        order: 12,
        permission: 'bi:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'bi-overview',
        label: '概览首页',
        icon: 'LayoutDashboard',
        path: '/bi',
        order: -1,
        permission: 'bi:read',
      },
      {
        code: 'bi-dashboard',
        label: '仪表盘',
        icon: 'LayoutGrid',
        path: '/bi/dashboard',
        order: 0,
        permission: 'bi:read',
      },
      {
        code: 'bi-analysis',
        label: '多维分析',
        icon: 'TrendingUp',
        path: '/bi/analysis',
        order: 1,
        permission: 'bi:read',
      },
      {
        code: 'bi-analytics',
        label: '数据分析',
        icon: 'BarChart3',
        path: '/bi/analytics',
        order: 2,
        permission: 'bi:read',
      },
      {
        code: 'bi-comparison',
        label: '对比分析',
        icon: 'GitCompare',
        path: '/bi/comparison',
        order: 3,
        permission: 'bi:read',
      },
      {
        code: 'bi-reports',
        label: '报表设计器',
        icon: 'FileText',
        path: '/bi/reports',
        order: 4,
        permission: 'bi:read',
      },
      {
        code: 'bi-datasets',
        label: '数据集管理',
        icon: 'Layers',
        path: '/bi/datasets',
        order: 5,
        permission: 'bi:read',
      },
      {
        code: 'bi-datasources',
        label: '数据源管理',
        icon: 'Database',
        path: '/bi/datasources',
        order: 6,
        permission: 'bi:admin',
      },
      {
        code: 'bi-visualizations',
        label: '可视化',
        icon: 'PieChart',
        path: '/bi/visualizations',
        order: 7,
        permission: 'bi:read',
      },
      {
        code: 'bi-gis',
        label: 'GIS分析',
        icon: 'Map',
        path: '/bi/gis',
        order: 8,
        permission: 'bi:read',
      },
      {
        code: 'bi-permissions',
        label: '数据权限',
        icon: 'Shield',
        path: '/bi/permissions',
        order: 9,
        permission: 'bi:admin',
      },
    ],
    module_tabs: [
      {
        code: 'bi-overview',
        label: '概览',
        path: '/bi',
        permission: 'bi:read',
      },
      {
        code: 'bi-dashboard',
        label: '仪表盘',
        path: '/bi/dashboard',
        permission: 'bi:read',
      },
      {
        code: 'bi-analysis',
        label: '多维分析',
        path: '/bi/analysis',
        permission: 'bi:read',
      },
      {
        code: 'bi-analytics',
        label: '数据分析',
        path: '/bi/analytics',
        permission: 'bi:read',
      },
      {
        code: 'bi-comparison',
        label: '对比分析',
        path: '/bi/comparison',
        permission: 'bi:read',
      },
      {
        code: 'bi-reports',
        label: '报表设计器',
        path: '/bi/reports',
        permission: 'bi:read',
      },
      {
        code: 'bi-datasets',
        label: '数据集',
        path: '/bi/datasets',
        permission: 'bi:read',
      },
      {
        code: 'bi-datasources',
        label: '数据源',
        path: '/bi/datasources',
        permission: 'bi:admin',
      },
      {
        code: 'bi-visualizations',
        label: '可视化',
        path: '/bi/visualizations',
        permission: 'bi:read',
      },
      {
        code: 'bi-gis',
        label: 'GIS分析',
        path: '/bi/gis',
        permission: 'bi:read',
      },
      {
        code: 'bi-permissions',
        label: '数据权限',
        path: '/bi/permissions',
        permission: 'bi:admin',
      },
    ],
    module_card: {
      code: 'bi',
      name: '商业智能',
      icon: 'BarChart3',
      path: '/bi',
      status: 'online',
      order: 12,
      permission: 'bi:read',
      source: 'plugin',
      suite: 'crm',
    },
  });

  navigationRegistry.register('iam', {
    top_nav: [
      {
        code: 'iam',
        label: '权限管理',
        icon: 'Shield',
        path: '/iam',
        group: 'core',
        order: 20,
        permission: 'iam:users_read',
      },
    ],
    sidebar_nav: [
      {
        code: 'iam-dashboard',
        label: '控制台',
        icon: 'LayoutDashboard',
        path: '/iam',
        order: 0,
        permission: 'iam:users_read',
      },
      {
        code: 'iam-tenants',
        label: '租户管理',
        icon: 'Building2',
        path: '/admin/tenants',
        order: 0.5,
        permission: 'tenant:manage',
      },
      {
        code: 'iam-tenant-settings',
        label: '租户设置',
        icon: 'Settings',
        path: '/tenant/settings',
        order: 0.6,
        permission: 'tenant:settings',
      },
      {
        code: 'iam-tenant-billing',
        label: '订阅计费',
        icon: 'CreditCard',
        path: '/tenant/billing',
        order: 0.7,
        permission: 'tenant:billing',
      },
      {
        code: 'iam-users',
        label: '用户管理',
        icon: 'Users',
        path: '/iam/users',
        order: 1,
        permission: 'iam:users_read',
      },
      {
        code: 'iam-roles',
        label: '角色管理',
        icon: 'UserCheck',
        path: '/iam/roles',
        order: 2,
        permission: 'iam:roles_read',
      },
      {
        code: 'iam-permissions',
        label: '权限管理',
        icon: 'Key',
        path: '/iam/permissions',
        order: 3,
        permission: 'iam:permissions_read',
      },
      {
        code: 'iam-audit',
        label: '审计日志',
        icon: 'FileSearch',
        path: '/iam/audit',
        order: 4,
        permission: 'iam:audit_read',
      },
      {
        code: 'iam-system',
        label: '系统管理',
        icon: 'Settings',
        path: '/iam/system',
        order: 5,
        permission: 'iam:system_read',
      },
      {
        code: 'iam-dictionaries',
        label: '数据字典',
        icon: 'BookOpen',
        path: '/iam/dictionaries',
        order: 6,
        permission: 'iam:dictionaries_read',
      },
      {
        code: 'iam-plugins',
        label: '插件市场',
        icon: 'Plugin',
        path: '/iam/plugins',
        order: 7,
        permission: 'iam:plugins_read',
      },
      // TODO: page not implemented
      // {
      //   code: 'iam-system-monitor',
      //   label: '系统监控',
      //   icon: 'Monitor',
      //   path: '/iam/system/monitor',
      //   order: 8,
      //   permission: 'iam:system_read',
      // },
    ],
    module_tabs: [
      {
        code: 'iam-dashboard',
        label: '控制台',
        path: '/iam',
        permission: 'iam:users_read',
      },
      {
        code: 'iam-tenants',
        label: '租户管理',
        path: '/admin/tenants',
        permission: 'tenant:manage',
      },
      {
        code: 'iam-tenant-settings',
        label: '租户设置',
        path: '/tenant/settings',
        permission: 'tenant:settings',
      },
      {
        code: 'iam-tenant-billing',
        label: '订阅计费',
        path: '/tenant/billing',
        permission: 'tenant:billing',
      },
      {
        code: 'iam-users',
        label: '用户管理',
        path: '/iam/users',
        permission: 'iam:users_read',
      },
      {
        code: 'iam-roles',
        label: '角色管理',
        path: '/iam/roles',
        permission: 'iam:roles_read',
      },
      {
        code: 'iam-permissions',
        label: '权限管理',
        path: '/iam/permissions',
        permission: 'iam:permissions_read',
      },
      {
        code: 'iam-audit',
        label: '审计日志',
        path: '/iam/audit',
        permission: 'iam:audit_read',
      },
      {
        code: 'iam-system',
        label: '系统管理',
        path: '/iam/system',
        permission: 'iam:system_read',
      },
      {
        code: 'iam-dictionaries',
        label: '数据字典',
        path: '/iam/dictionaries',
        permission: 'iam:dictionaries_read',
      },
      {
        code: 'iam-plugins',
        label: '插件市场',
        path: '/iam/plugins',
        permission: 'iam:plugins_read',
      },
      // TODO: page not implemented
      // {
      //   code: 'iam-system-monitor',
      //   label: '系统监控',
      //   path: '/iam/system/monitor',
      //   permission: 'iam:system_read',
      // },
    ],
    module_card: {
      code: 'iam',
      name: '权限管理',
      icon: 'Shield',
      path: '/iam',
      status: 'online',
      order: 20,
      permission: 'iam:users_read',
      source: 'core',
    },
  });

  navigationRegistry.register('workflow', {
    top_nav: [
      {
        code: 'workflow',
        label: '工作流',
        icon: 'GitBranch',
        path: '/flow',
        group: 'core',
        order: 13,
        permission: 'workflow:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'workflow-dashboard',
        label: '仪表盘',
        icon: 'LayoutDashboard',
        path: '/flow',
        order: 0,
        permission: 'workflow:read',
      },
      {
        code: 'workflow-definitions',
        label: '流程定义',
        icon: 'FileCode',
        path: '/flow/definitions',
        order: 1,
        permission: 'workflow:read',
      },
      {
        code: 'workflow-designer',
        label: '流程设计',
        icon: 'Pencil',
        path: '/flow/designer',
        order: 2,
        permission: 'workflow:write',
      },
      {
        code: 'workflow-instances',
        label: '流程实例',
        icon: 'Layers',
        path: '/flow/instances',
        order: 3,
        permission: 'workflow:read',
      },
      {
        code: 'workflow-approvals',
        label: '审批中心',
        icon: 'ClipboardCheck',
        path: '/flow/approvals',
        order: 4,
        permission: 'workflow:read',
      },
      {
        code: 'workflow-statistics',
        label: '统计分析',
        icon: 'BarChart2',
        path: '/flow/statistics',
        order: 5,
        permission: 'workflow:read',
      },
      {
        code: 'workflow-history',
        label: '版本历史',
        icon: 'History',
        path: '/flow/history',
        order: 6,
        permission: 'workflow:read',
      },
      {
        code: 'workflow-definition',
        label: '流程定义管理',
        icon: 'FileCode2',
        path: '/flow/definition',
        order: 7,
        permission: 'workflow:read',
      },
      {
        code: 'workflow-flow-designer',
        label: '流程设计器',
        icon: 'PenTool',
        path: '/flow/flow-designer',
        order: 8,
        permission: 'workflow:write',
      },
      {
        code: 'workflow-monitor',
        label: '流程监控',
        icon: 'Monitor',
        path: '/flow/monitor',
        order: 9,
        permission: 'workflow:read',
      },
      {
        code: 'workflow-settings',
        label: '流程设置',
        icon: 'Settings',
        path: '/flow/settings',
        order: 10,
        permission: 'workflow:read',
      },
      {
        code: 'workflow-templates',
        label: '流程模板',
        icon: 'LayoutTemplate',
        path: '/flow/templates',
        order: 11,
        permission: 'workflow:read',
      },
      {
        code: 'workflow-notifications',
        label: '通知中心',
        path: '/flow/notifications',
        icon: 'Bell',
        order: 12,
        permission: 'workflow:read',
      },
    ],
    module_tabs: [
      {
        code: 'workflow-dashboard',
        label: '仪表盘',
        path: '/flow',
        permission: 'workflow:read',
      },
      {
        code: 'workflow-definitions',
        label: '流程定义',
        path: '/flow/definitions',
        permission: 'workflow:read',
      },
      {
        code: 'workflow-designer',
        label: '流程设计',
        path: '/flow/designer',
        permission: 'workflow:write',
      },
      {
        code: 'workflow-instances',
        label: '流程实例',
        path: '/flow/instances',
        permission: 'workflow:read',
      },
      {
        code: 'workflow-approvals',
        label: '审批中心',
        path: '/flow/approvals',
        permission: 'workflow:read',
      },
      {
        code: 'workflow-statistics',
        label: '统计分析',
        path: '/flow/statistics',
        permission: 'workflow:read',
      },
      {
        code: 'workflow-history',
        label: '版本历史',
        path: '/flow/history',
        permission: 'workflow:read',
      },
      {
        code: 'workflow-definition',
        label: '流程定义管理',
        path: '/flow/definition',
        permission: 'workflow:read',
      },
      {
        code: 'workflow-flow-designer',
        label: '流程设计器',
        path: '/flow/flow-designer',
        permission: 'workflow:write',
      },
      {
        code: 'workflow-monitor',
        label: '流程监控',
        path: '/flow/monitor',
        permission: 'workflow:read',
      },
      {
        code: 'workflow-settings',
        label: '流程设置',
        path: '/flow/settings',
        permission: 'workflow:read',
      },
      {
        code: 'workflow-templates',
        label: '流程模板',
        path: '/flow/templates',
        permission: 'workflow:read',
      },
      {
        code: 'workflow-notifications',
        label: '通知中心',
        path: '/flow/notifications',
        permission: 'workflow:read',
      },
    ],
    module_card: {
      code: 'workflow',
      name: '工作流引擎',
      icon: 'GitBranch',
      path: '/flow',
      status: 'online',
      order: 13,
      permission: 'workflow:read',
      source: 'core',
    },
  });

  navigationRegistry.register('wms', {
    top_nav: [
      {
        code: 'wms',
        label: '仓储管理',
        icon: 'Warehouse',
        path: '/wms',
        group: 'business',
        order: 14,
        permission: 'wms:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'wms-dashboard',
        label: '仪表盘',
        icon: 'LayoutDashboard',
        path: '/wms',
        order: 0,
        permission: 'wms:read',
      },
      {
        code: 'wms-warehouses',
        label: '仓库管理',
        icon: 'Building2',
        path: '/wms/warehouses',
        order: 1,
        permission: 'wms:read',
      },
      {
        code: 'wms-inventory',
        label: '库存管理',
        icon: 'Package',
        path: '/wms/inventory',
        order: 2,
        permission: 'wms:read',
      },
      {
        code: 'wms-inbound',
        label: '入库管理',
        icon: 'Download',
        path: '/wms/inbound-orders',
        order: 3,
        permission: 'wms:read',
      },
      {
        code: 'wms-outbound',
        label: '出库管理',
        icon: 'Upload',
        path: '/wms/outbound-orders',
        order: 4,
        permission: 'wms:read',
      },
      {
        code: 'wms-stocktake',
        label: '盘点管理',
        icon: 'ClipboardList',
        path: '/wms/stock-takes',
        order: 5,
        permission: 'wms:read',
      },
      {
        code: 'wms-suppliers',
        label: '供应商管理',
        icon: 'Users',
        path: '/wms/suppliers',
        order: 6,
        permission: 'wms:read',
      },
      {
        code: 'wms-locations',
        label: '库位管理',
        icon: 'MapPin',
        path: '/wms/locations',
        order: 7,
        permission: 'wms:read',
      },
      {
        code: 'wms-transfers',
        label: '库存调拨',
        icon: 'ArrowRightLeft',
        path: '/wms/transfers',
        order: 8,
        permission: 'wms:read',
      },
      {
        code: 'wms-replenishment',
        label: '补货管理',
        icon: 'ShoppingCart',
        path: '/wms/replenishment',
        order: 9,
        permission: 'wms:read',
      },
      {
        code: 'wms-inbound',
        label: '入库管理',
        icon: 'Download',
        path: '/wms/inbound',
        order: 10,
        permission: 'wms:read',
      },
      {
        code: 'wms-outbound',
        label: '出库管理',
        icon: 'Upload',
        path: '/wms/outbound',
        order: 11,
        permission: 'wms:read',
      },
      {
        code: 'wms-reports',
        label: '库存报表',
        icon: 'BarChart3',
        path: '/wms/reports',
        order: 12,
        permission: 'wms:read',
      },
      {
        code: 'wms-batches',
        label: '批次管理',
        icon: 'Layers',
        path: '/wms/batches',
        order: 13,
        permission: 'wms:read',
      },
      {
        code: 'wms-serial-numbers',
        label: '序列号管理',
        icon: 'Hash',
        path: '/wms/serial-numbers',
        order: 14,
        permission: 'wms:read',
      },
    ],
    module_tabs: [
      {
        code: 'wms-dashboard',
        label: '仪表盘',
        path: '/wms',
        permission: 'wms:read',
      },
      {
        code: 'wms-warehouses',
        label: '仓库管理',
        path: '/wms/warehouses',
        permission: 'wms:read',
      },
      {
        code: 'wms-inventory',
        label: '库存管理',
        path: '/wms/inventory',
        permission: 'wms:read',
      },
      {
        code: 'wms-inbound',
        label: '入库管理',
        path: '/wms/inbound-orders',
        permission: 'wms:read',
      },
      {
        code: 'wms-outbound',
        label: '出库管理',
        path: '/wms/outbound-orders',
        permission: 'wms:read',
      },
      {
        code: 'wms-stocktake',
        label: '盘点管理',
        path: '/wms/stock-takes',
        permission: 'wms:read',
      },
      {
        code: 'wms-suppliers',
        label: '供应商管理',
        path: '/wms/suppliers',
        permission: 'wms:read',
      },
      {
        code: 'wms-locations',
        label: '库位管理',
        path: '/wms/locations',
        permission: 'wms:read',
      },
      {
        code: 'wms-transfers',
        label: '库存调拨',
        path: '/wms/transfers',
        permission: 'wms:read',
      },
      {
        code: 'wms-replenishment',
        label: '补货管理',
        path: '/wms/replenishment',
        permission: 'wms:read',
      },
      {
        code: 'wms-inbound',
        label: '入库管理',
        path: '/wms/inbound',
        permission: 'wms:read',
      },
      {
        code: 'wms-outbound',
        label: '出库管理',
        path: '/wms/outbound',
        permission: 'wms:read',
      },
      {
        code: 'wms-reports',
        label: '库存报表',
        path: '/wms/reports',
        permission: 'wms:read',
      },
      {
        code: 'wms-batches',
        label: '批次管理',
        path: '/wms/batches',
        permission: 'wms:read',
      },
      {
        code: 'wms-serial-numbers',
        label: '序列号管理',
        path: '/wms/serial-numbers',
        permission: 'wms:read',
      },
    ],
    module_card: {
      code: 'wms',
      name: '仓储管理系统',
      icon: 'Warehouse',
      path: '/wms',
      status: 'online',
      order: 14,
      permission: 'wms:read',
      source: 'plugin',
      suite: 'manufacturing',
    },
  });

  navigationRegistry.register('pdm', {
    top_nav: [
      {
        code: 'pdm',
        label: '产品数据',
        icon: 'Box',
        path: '/pdm',
        group: 'business',
        order: 15,
        permission: 'pdm:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'pdm-stats',
        label: '统计概览',
        icon: 'BarChart3',
        path: '/pdm/stats',
        order: 0,
        permission: 'pdm:read',
      },
      {
        code: 'pdm-formula',
        label: '配方管理',
        icon: 'FlaskConical',
        path: '/pdm/formula',
        order: 1,
        permission: 'pdm:read',
      },
      {
        code: 'pdm-process',
        label: '工艺流程',
        icon: 'GitBranch',
        path: '/pdm/process',
        order: 2,
        permission: 'pdm:read',
      },
      {
        code: 'pdm-batch',
        label: '批次管理',
        icon: 'Hash',
        path: '/pdm/batch',
        order: 3,
        permission: 'pdm:read',
      },
      {
        code: 'pdm-step',
        label: '步骤管理',
        icon: 'ListOrdered',
        path: '/pdm/step',
        order: 4,
        permission: 'pdm:read',
      },
      {
        code: 'pdm-bom',
        label: 'BOM管理',
        icon: 'Package',
        path: '/pdm/bom',
        order: 5,
        permission: 'pdm:read',
      },
      {
        code: 'pdm-version',
        label: '版本管理',
        icon: 'Tag',
        path: '/pdm/version',
        order: 6,
        permission: 'pdm:read',
      },
      {
        code: 'pdm-product-config',
        label: '产品配置',
        icon: 'Settings',
        path: '/pdm/product-config',
        order: 7,
        permission: 'pdm:read',
      },
      {
        code: 'pdm-products',
        label: '产品管理',
        icon: 'Package',
        path: '/pdm/products',
        order: 8,
        permission: 'pdm:read',
      },
      {
        code: 'pdm-materials',
        label: '物料管理',
        icon: 'Layers',
        path: '/pdm/materials',
        order: 9,
        permission: 'pdm:read',
      },
      {
        code: 'pdm-changes',
        label: '变更管理',
        icon: 'FileWarning',
        path: '/pdm/changes',
        order: 10,
        permission: 'pdm:read',
      },
      {
        code: 'pdm-projects',
        label: '项目管理',
        icon: 'FolderKanban',
        path: '/pdm/projects',
        order: 11,
        permission: 'pdm:read',
      },
      {
        code: 'pdm-documents',
        label: '文档管理',
        icon: 'FileText',
        path: '/pdm/documents',
        order: 12,
        permission: 'pdm:read',
      },
      // TODO: page not implemented
      // {
      //   code: 'pdm-bom-versions',
      //   label: 'BOM版本',
      //   icon: 'Package',
      //   path: '/pdm/bom-versions',
      //   order: 13,
      //   permission: 'pdm:read',
      // },
    ],
    module_tabs: [
      {
        code: 'pdm-stats',
        label: '统计概览',
        path: '/pdm/stats',
        permission: 'pdm:read',
      },
      {
        code: 'pdm-formula',
        label: '配方管理',
        path: '/pdm/formula',
        permission: 'pdm:read',
      },
      {
        code: 'pdm-process',
        label: '工艺流程',
        path: '/pdm/process',
        permission: 'pdm:read',
      },
      {
        code: 'pdm-batch',
        label: '批次管理',
        path: '/pdm/batch',
        permission: 'pdm:read',
      },
      {
        code: 'pdm-step',
        label: '步骤管理',
        path: '/pdm/step',
        permission: 'pdm:read',
      },
      {
        code: 'pdm-bom',
        label: 'BOM管理',
        path: '/pdm/bom',
        permission: 'pdm:read',
      },
      {
        code: 'pdm-version',
        label: '版本管理',
        path: '/pdm/version',
        permission: 'pdm:read',
      },
      {
        code: 'pdm-product-config',
        label: '产品配置',
        path: '/pdm/product-config',
        permission: 'pdm:read',
      },
      {
        code: 'pdm-products',
        label: '产品管理',
        path: '/pdm/products',
        permission: 'pdm:read',
      },
      {
        code: 'pdm-materials',
        label: '物料管理',
        path: '/pdm/materials',
        permission: 'pdm:read',
      },
      {
        code: 'pdm-changes',
        label: '变更管理',
        path: '/pdm/changes',
        permission: 'pdm:read',
      },
      {
        code: 'pdm-projects',
        label: '项目管理',
        path: '/pdm/projects',
        permission: 'pdm:read',
      },
      {
        code: 'pdm-documents',
        label: '文档管理',
        path: '/pdm/documents',
        permission: 'pdm:read',
      },
      // TODO: page not implemented
      // {
      //   code: 'pdm-bom-versions',
      //   label: 'BOM版本',
      //   path: '/pdm/bom-versions',
      //   permission: 'pdm:read',
      // },
    ],
    module_card: {
      code: 'pdm',
      name: '产品数据管理',
      icon: 'Box',
      path: '/pdm',
      status: 'beta',
      order: 15,
      permission: 'pdm:read',
      source: 'plugin',
      suite: 'manufacturing',
    },
  });

  navigationRegistry.register('monitor', {
    top_nav: [
      {
        code: 'monitor',
        label: '系统监控',
        icon: 'Activity',
        path: '/monitor',
        group: 'core',
        order: 19,
        permission: 'monitor:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'monitor-dashboard',
        label: '监控概览',
        icon: 'LayoutDashboard',
        path: '/monitor/dashboard',
        order: 0,
        permission: 'monitor:read',
      },
      {
        code: 'monitor-metrics',
        label: '性能指标',
        icon: 'TrendingUp',
        path: '/monitor/metrics',
        order: 1,
        permission: 'monitor:read',
      },
      {
        code: 'monitor-alerts',
        label: '告警中心',
        icon: 'AlertTriangle',
        path: '/monitor/alerts',
        order: 2,
        permission: 'monitor:read',
      },
    ],
    module_tabs: [
      {
        code: 'monitor-dashboard',
        label: '监控概览',
        path: '/monitor/dashboard',
        permission: 'monitor:read',
      },
      {
        code: 'monitor-metrics',
        label: '性能指标',
        path: '/monitor/metrics',
        permission: 'monitor:read',
      },
      {
        code: 'monitor-alerts',
        label: '告警中心',
        path: '/monitor/alerts',
        permission: 'monitor:read',
      },
    ],
    module_card: {
      code: 'monitor',
      name: '系统监控',
      icon: 'Activity',
      path: '/monitor',
      status: 'online',
      order: 19,
      permission: 'monitor:read',
      source: 'core',
    },
  });

  navigationRegistry.register('docs', {
    top_nav: [
      {
        code: 'docs',
        label: '文档中心',
        icon: 'FileText',
        path: '/documents',
        group: 'core',
        order: 16,
        permission: 'doc:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'docs-dashboard',
        label: '文档首页',
        icon: 'LayoutDashboard',
        path: '/documents',
        order: 0,
        permission: 'doc:read',
      },
      {
        code: 'docs-center',
        label: '文档库',
        icon: 'FolderOpen',
        path: '/document-center',
        order: 1,
        permission: 'doc:read',
      },
      {
        code: 'docs-knowledge',
        label: '知识库',
        icon: 'BookOpen',
        path: '/knowledge-base',
        order: 2,
        permission: 'ai:read',
      },
      {
        code: 'docs-templates',
        label: '模板管理',
        icon: 'LayoutTemplate',
        path: '/templates',
        order: 3,
        permission: 'doc:admin',
      },
      {
        code: 'docs-help',
        label: '帮助中心',
        icon: 'HelpCircle',
        path: '/help',
        order: 4,
        permission: '',
      },
    ],
    module_tabs: [
      {
        code: 'docs-dashboard',
        label: '文档首页',
        path: '/documents',
        permission: 'doc:read',
      },
      {
        code: 'docs-center',
        label: '文档库',
        path: '/document-center',
        permission: 'doc:read',
      },
      {
        code: 'docs-knowledge',
        label: '知识库',
        path: '/knowledge-base',
        permission: 'ai:read',
      },
      {
        code: 'docs-templates',
        label: '模板管理',
        path: '/templates',
        permission: 'doc:admin',
      },
      {
        code: 'docs-help',
        label: '帮助中心',
        path: '/help',
        permission: '',
      },
    ],
    module_card: {
      code: 'docs',
      name: '文档中心',
      icon: 'FileText',
      path: '/documents',
      status: 'online',
      order: 16,
      permission: 'doc:read',
      source: 'core',
    },
  });

  navigationRegistry.register('notification', {
    top_nav: [
      {
        code: 'notification',
        label: '通知中心',
        icon: 'Bell',
        path: '/notifications',
        group: 'core',
        order: 17,
        permission: '',
      },
    ],
    sidebar_nav: [
      {
        code: 'notification-center',
        label: '通知列表',
        icon: 'Bell',
        path: '/notifications',
        order: 0,
        permission: '',
      },
      {
        code: 'notification-templates',
        label: '通知模板',
        icon: 'FileTemplate',
        path: '/notifications/templates',
        order: 1,
        permission: '',
      },
      {
        code: 'notification-archive',
        label: '归档管理',
        icon: 'Archive',
        path: '/notifications/archive',
        order: 2,
        permission: '',
      },
      {
        code: 'notification-stats',
        label: '统计分析',
        icon: 'BarChart2',
        path: '/notifications/stats',
        order: 3,
        permission: '',
      },
    ],
    module_tabs: [
      {
        code: 'notification-center',
        label: '通知列表',
        path: '/notifications',
        permission: '',
      },
      {
        code: 'notification-templates',
        label: '通知模板',
        path: '/notifications/templates',
        permission: '',
      },
      {
        code: 'notification-archive',
        label: '归档管理',
        path: '/notifications/archive',
        permission: '',
      },
      {
        code: 'notification-stats',
        label: '统计分析',
        path: '/notifications/stats',
        permission: '',
      },
    ],
    module_card: {
      code: 'notification',
      name: '通知中心',
      icon: 'Bell',
      path: '/notifications',
      status: 'online',
      order: 17,
      permission: '',
      source: 'core',
    },
  });

  navigationRegistry.register('report', {
    top_nav: [
      {
        code: 'report',
        label: '报表中心',
        icon: 'BarChart2',
        path: '/report/list',
        group: 'core',
        order: 18,
        permission: 'report:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'report-list',
        label: '报表列表',
        icon: 'FileText',
        path: '/report/list',
        order: 0,
        permission: 'report:read',
      },
      {
        code: 'report-design',
        label: '报表设计',
        icon: 'Pencil',
        path: '/report/design',
        order: 1,
        permission: 'report:read',
      },
      {
        code: 'report-schedules',
        label: '定时任务',
        icon: 'Clock',
        path: '/report/schedules',
        order: 2,
        permission: 'report:read',
      },
      {
        code: 'report-subscriptions',
        label: '订阅管理',
        icon: 'Mail',
        path: '/report/subscriptions',
        order: 3,
        permission: 'report:read',
      },
      {
        code: 'report-templates',
        label: '报表模板',
        icon: 'LayoutTemplate',
        path: '/report/templates',
        order: 4,
        permission: 'report:read',
      },
      {
        code: 'report-builder',
        label: '报表构建',
        icon: 'Hammer',
        path: '/report/builder',
        order: 5,
        permission: 'report:read',
      },
      {
        code: 'report-viewer',
        label: '报表查看',
        icon: 'Eye',
        path: '/report/viewer',
        order: 6,
        permission: 'report:read',
      },
    ],
    module_tabs: [
      {
        code: 'report-list',
        label: '报表列表',
        path: '/report/list',
        permission: 'report:read',
      },
      {
        code: 'report-design',
        label: '报表设计',
        path: '/report/design',
        permission: 'report:read',
      },
      {
        code: 'report-schedules',
        label: '定时任务',
        path: '/report/schedules',
        permission: 'report:read',
      },
      {
        code: 'report-subscriptions',
        label: '订阅管理',
        path: '/report/subscriptions',
        permission: 'report:read',
      },
      {
        code: 'report-templates',
        label: '报表模板',
        path: '/report/templates',
        permission: 'report:read',
      },
      {
        code: 'report-builder',
        label: '报表构建',
        path: '/report/builder',
        permission: 'report:read',
      },
      {
        code: 'report-viewer',
        label: '报表查看',
        path: '/report/viewer',
        permission: 'report:read',
      },
    ],
    module_card: {
      code: 'report',
      name: '报表中心',
      icon: 'BarChart2',
      path: '/report/list',
      status: 'online',
      order: 18,
      permission: 'report:read',
      source: 'core',
    },
  });

  navigationRegistry.register('mobile', {
    top_nav: [
      {
        code: 'mobile',
        label: '移动配置',
        icon: 'Smartphone',
        path: '/mobile',
        group: 'core',
        order: 21,
        permission: 'mobile:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'mobile-settings',
        label: '基础设置',
        icon: 'Settings',
        path: '/mobile/settings',
        order: 0,
        permission: 'mobile:read',
      },
      {
        code: 'mobile-offline',
        label: '离线同步',
        icon: 'CloudOff',
        path: '/mobile/offline-sync',
        order: 1,
        permission: 'mobile:read',
      },
      {
        code: 'mobile-scan',
        label: '扫码设置',
        icon: 'ScanLine',
        path: '/mobile/scan',
        order: 2,
        permission: 'mobile:read',
      },
      {
        code: 'mobile-notifications',
        label: '推送设置',
        icon: 'Bell',
        path: '/mobile/notifications',
        order: 3,
        permission: 'mobile:read',
      },
    ],
    module_tabs: [
      {
        code: 'mobile-settings',
        label: '基础设置',
        path: '/mobile/settings',
        permission: 'mobile:read',
      },
      {
        code: 'mobile-offline',
        label: '离线同步',
        path: '/mobile/offline-sync',
        permission: 'mobile:read',
      },
      {
        code: 'mobile-scan',
        label: '扫码设置',
        path: '/mobile/scan',
        permission: 'mobile:read',
      },
      {
        code: 'mobile-notifications',
        label: '推送设置',
        path: '/mobile/notifications',
        permission: 'mobile:read',
      },
    ],
    module_card: {
      code: 'mobile',
      name: '移动配置',
      icon: 'Smartphone',
      path: '/mobile',
      status: 'beta',
      order: 21,
      permission: 'mobile:read',
      source: 'plugin',
    },
  });

  navigationRegistry.register('integration', {
    top_nav: [
      {
        code: 'integration',
        label: '系统集成',
        icon: 'Plug',
        path: '/integration',
        group: 'core',
        order: 22,
        permission: 'integration:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'integration-dashboard',
        label: '集成概览',
        icon: 'LayoutDashboard',
        path: '/integration/dashboard',
        order: 0,
        permission: 'integration:read',
      },
      {
        code: 'integration-lims-qms',
        label: 'LIMS-QMS',
        icon: 'Link',
        path: '/integration/lims-qms',
        order: 1,
        permission: 'integration:read',
      },
      {
        code: 'integration-mes-erp',
        label: 'MES-ERP',
        icon: 'Link',
        path: '/integration/mes-erp',
        order: 2,
        permission: 'integration:read',
      },
      {
        code: 'integration-wms-scm',
        label: 'WMS-SCM',
        icon: 'Link',
        path: '/integration/wms-scm',
        order: 3,
        permission: 'integration:read',
      },
      {
        code: 'integration-events',
        label: '事件中心',
        icon: 'Zap',
        path: '/integration/events',
        order: 4,
        permission: 'integration:read',
      },
      {
        code: 'integration-rules',
        label: '转换规则',
        icon: 'SlidersHorizontal',
        path: '/integration/rules',
        order: 5,
        permission: 'integration:read',
      },
      {
        code: 'integration-external-erp',
        label: '外部ERP',
        icon: 'Globe',
        path: '/integration/external-erp-overview',
        order: 6,
        permission: 'integration:read',
      },
    ],
    module_tabs: [
      {
        code: 'integration-dashboard',
        label: '集成概览',
        path: '/integration/dashboard',
        permission: 'integration:read',
      },
      {
        code: 'integration-lims-qms',
        label: 'LIMS-QMS',
        path: '/integration/lims-qms',
        permission: 'integration:read',
      },
      {
        code: 'integration-mes-erp',
        label: 'MES-ERP',
        path: '/integration/mes-erp',
        permission: 'integration:read',
      },
      {
        code: 'integration-events',
        label: '事件中心',
        path: '/integration/events',
        permission: 'integration:read',
      },
      {
        code: 'integration-wms-scm',
        label: 'WMS-SCM',
        path: '/integration/wms-scm',
        permission: 'integration:read',
      },
      {
        code: 'integration-rules',
        label: '转换规则',
        path: '/integration/rules',
        permission: 'integration:read',
      },
      {
        code: 'integration-external-erp',
        label: '外部ERP',
        path: '/integration/external-erp-overview',
        permission: 'integration:read',
      },
    ],
    module_card: {
      code: 'integration',
      name: '系统集成',
      icon: 'Plug',
      path: '/integration',
      status: 'beta',
      order: 22,
      permission: 'integration:read',
      source: 'plugin',
    },
  });

  navigationRegistry.register('srm', {
    top_nav: [
      {
        code: 'srm',
        label: '供应商管理',
        icon: 'Handshake',
        path: '/srm',
        group: 'business',
        order: 23,
        permission: 'srm:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'srm-dashboard',
        label: '仪表盘',
        icon: 'LayoutDashboard',
        path: '/srm/dashboard',
        order: 0,
        permission: 'srm:read',
      },
      {
        code: 'srm-suppliers',
        label: '供应商',
        icon: 'Users',
        path: '/srm/suppliers',
        order: 1,
        permission: 'srm:read',
        children: [
          {
            code: 'srm-supplier-detail',
            label: '供应商详情',
            icon: 'User',
            path: '/srm/suppliers/:id',
            permission: 'srm:read',
          },
        ],
      },
      {
        code: 'srm-evaluations',
        label: '供应商评估',
        icon: 'Award',
        path: '/srm/evaluations',
        order: 2,
        permission: 'srm:read',
      },
      {
        code: 'srm-performance',
        label: '绩效报表',
        icon: 'BarChart3',
        path: '/srm/performance',
        order: 3,
        permission: 'srm:read',
      },
      {
        code: 'srm-orders',
        label: '采购订单',
        icon: 'ShoppingCart',
        path: '/srm/orders',
        order: 4,
        permission: 'srm:read',
      },
      {
        code: 'srm-contracts',
        label: '合同管理',
        icon: 'FileSignature',
        path: '/srm/contracts',
        order: 5,
        permission: 'srm:read',
      },
      {
        code: 'srm-finance',
        label: '财务结算',
        icon: 'Wallet',
        path: '/srm/finance',
        order: 6,
        permission: 'srm:read',
      },
      {
        code: 'srm-supplier-portal',
        label: '供应商门户',
        icon: 'Building2',
        path: '/srm/supplier-portal',
        order: 7,
        permission: 'srm:read',
      },
      {
        code: 'srm-inquiry-quotation',
        label: '询报价管理',
        icon: 'TrendingUp',
        path: '/srm/inquiry-quotation',
        order: 8,
        permission: 'srm:read',
      },
      {
        code: 'srm-bidding',
        label: '招投标管理',
        icon: 'Gavel',
        path: '/srm/bidding',
        order: 9,
        permission: 'srm:read',
      },
    ],
    module_tabs: [
      {
        code: 'srm-dashboard',
        label: '仪表盘',
        path: '/srm/dashboard',
        permission: 'srm:read',
      },
      {
        code: 'srm-suppliers',
        label: '供应商',
        path: '/srm/suppliers',
        permission: 'srm:read',
      },
      {
        code: 'srm-evaluations',
        label: '供应商评估',
        path: '/srm/evaluations',
        permission: 'srm:read',
      },
      {
        code: 'srm-performance',
        label: '绩效报表',
        path: '/srm/performance',
        permission: 'srm:read',
      },
      {
        code: 'srm-orders',
        label: '采购订单',
        path: '/srm/orders',
        permission: 'srm:read',
      },
      {
        code: 'srm-contracts',
        label: '合同管理',
        path: '/srm/contracts',
        permission: 'srm:read',
      },
      {
        code: 'srm-finance',
        label: '财务结算',
        path: '/srm/finance',
        permission: 'srm:read',
      },
      {
        code: 'srm-supplier-portal',
        label: '供应商门户',
        path: '/srm/supplier-portal',
        permission: 'srm:read',
      },
      {
        code: 'srm-inquiry-quotation',
        label: '询报价管理',
        path: '/srm/inquiry-quotation',
        permission: 'srm:read',
      },
      {
        code: 'srm-bidding',
        label: '招投标管理',
        path: '/srm/bidding',
        permission: 'srm:read',
      },
    ],
    module_card: {
      code: 'srm',
      name: '供应商关系管理',
      icon: 'Handshake',
      path: '/srm',
      status: 'online',
      order: 23,
      permission: 'srm:read',
      source: 'plugin',
      suite: 'supply',
    },
  });

  // ============================================================
  // OA 行政综合（归属 ERP 模块）
  // ============================================================
  navigationRegistry.register('erp-oa', {
    top_nav: [
      {
        code: 'erp-oa',
        label: '行政综合',
        icon: 'Building',
        path: '/administration',
        group: 'core',
        order: 4,
        permission: 'erp:admin',
      },
    ],
    sidebar_nav: [
      {
        code: 'erp-oa-dashboard',
        label: '行政概览',
        icon: 'LayoutDashboard',
        path: '/administration',
        order: 0,
        permission: 'erp:admin',
      },
      {
        code: 'erp-oa-announcements',
        label: '公告管理',
        icon: 'Megaphone',
        path: '/announcements',
        order: 1,
        permission: 'erp:admin',
      },
      {
        code: 'erp-oa-meeting-rooms',
        label: '会议室管理',
        icon: 'Video',
        path: '/meeting-rooms',
        order: 2,
        permission: 'erp:admin',
      },
      {
        code: 'erp-oa-vehicles',
        label: '车辆管理',
        icon: 'Car',
        path: '/vehicles',
        order: 3,
        permission: 'erp:admin',
      },
      {
        code: 'erp-oa-office-supplies',
        label: '办公用品',
        icon: 'Package',
        path: '/office-supplies',
        order: 4,
        permission: 'erp:admin',
      },
      {
        code: 'erp-oa-budget',
        label: '预算管理',
        path: '/budget',
        icon: 'Calculator',
        order: 5,
        permission: 'erp:admin',
      },
      {
        code: 'erp-oa-expense-claims',
        label: '费用报销',
        path: '/expense-claims',
        icon: 'Receipt',
        order: 6,
        permission: 'erp:admin',
      },
    ],
    module_tabs: [
      {
        code: 'erp-oa-dashboard',
        label: '行政概览',
        path: '/administration',
        permission: 'erp:admin',
      },
      {
        code: 'erp-oa-announcements',
        label: '公告管理',
        path: '/announcements',
        permission: 'erp:admin',
      },
      {
        code: 'erp-oa-meeting-rooms',
        label: '会议室管理',
        path: '/meeting-rooms',
        permission: 'erp:admin',
      },
      {
        code: 'erp-oa-vehicles',
        label: '车辆管理',
        path: '/vehicles',
        permission: 'erp:admin',
      },
      {
        code: 'erp-oa-office-supplies',
        label: '办公用品',
        path: '/office-supplies',
        permission: 'erp:admin',
      },
      {
        code: 'erp-oa-budget',
        label: '预算管理',
        path: '/budget',
        permission: 'erp:admin',
      },
      {
        code: 'erp-oa-expense-claims',
        label: '费用报销',
        path: '/expense-claims',
        permission: 'erp:admin',
      },
    ],
    module_card: {
      code: 'erp-oa',
      name: '行政综合',
      icon: 'Building',
      path: '/administration',
      status: 'online',
      order: 4,
      permission: 'erp:admin',
      source: 'core',
    },
  });

  navigationRegistry.register('lims', {
    top_nav: [
      {
        code: 'lims',
        label: '实验室管理',
        icon: 'FlaskRound',
        path: '/lims',
        group: 'business',
        order: 24,
        permission: 'lims:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'lims-samples',
        label: '样品管理',
        icon: 'TestTube',
        path: '/lims/samples',
        order: 0,
        permission: 'lims:read',
        children: [
          {
            code: 'lims-sample-detail',
            label: '样品详情',
            icon: 'FileText',
            path: '/lims/sample/:id',
            permission: 'lims:read',
          },
        ],
      },
      {
        code: 'lims-processes',
        label: '流程管理',
        icon: 'GitBranch',
        path: '/lims/processes',
        order: 1,
        permission: 'lims:read',
      },
      {
        code: 'lims-tasks',
        label: '任务管理',
        icon: 'ListTodo',
        path: '/lims/tasks',
        order: 2,
        permission: 'lims:read',
        children: [
          {
            code: 'lims-task-detail',
            label: '任务详情',
            icon: 'FileText',
            path: '/lims/task/:id',
            permission: 'lims:read',
          },
        ],
      },
      {
        code: 'lims-inspection-tasks',
        label: '检验任务',
        icon: 'ClipboardCheck',
        path: '/lims/inspection-tasks',
        order: 2.5,
        permission: 'lims:read',
      },
      {
        code: 'lims-inspection-results',
        label: '检验结果',
        icon: 'FileCheck',
        path: '/lims/inspection-results',
        order: 2.6,
        permission: 'lims:read',
      },
      {
        code: 'lims-instruments',
        label: '仪器管理',
        icon: 'Microscope',
        path: '/lims/instruments-manage',
        order: 3,
        permission: 'lims:read',
        children: [
          {
            code: 'lims-instrument-detail',
            label: '仪器详情',
            icon: 'FileText',
            path: '/lims/instrument/:id',
            permission: 'lims:read',
          },
        ],
      },
      {
        code: 'lims-reagents',
        label: '试剂管理',
        icon: 'FlaskConical',
        path: '/lims/reagents',
        order: 4,
        permission: 'lims:read',
      },
      {
        code: 'lims-barcodes',
        label: '条码管理',
        icon: 'Barcode',
        path: '/lims/barcodes',
        order: 5,
        permission: 'lims:read',
      },
    ],
    module_tabs: [
      {
        code: 'lims-samples',
        label: '样品管理',
        path: '/lims/samples',
        permission: 'lims:read',
      },
      {
        code: 'lims-processes',
        label: '流程管理',
        path: '/lims/processes',
        permission: 'lims:read',
      },
      {
        code: 'lims-tasks',
        label: '任务管理',
        path: '/lims/tasks',
        permission: 'lims:read',
      },
      {
        code: 'lims-inspection-tasks',
        label: '检验任务',
        path: '/lims/inspection-tasks',
        permission: 'lims:read',
      },
      {
        code: 'lims-inspection-results',
        label: '检验结果',
        path: '/lims/inspection-results',
        permission: 'lims:read',
      },
      {
        code: 'lims-instruments',
        label: '仪器管理',
        path: '/lims/instruments-manage',
        permission: 'lims:read',
      },
      {
        code: 'lims-reagents',
        label: '试剂管理',
        path: '/lims/reagents',
        permission: 'lims:read',
      },
      {
        code: 'lims-barcodes',
        label: '条码管理',
        path: '/lims/barcodes',
        permission: 'lims:read',
      },
    ],
    module_card: {
      code: 'lims',
      name: '实验室信息管理',
      icon: 'FlaskRound',
      path: '/lims',
      status: 'beta',
      order: 24,
      permission: 'lims:read',
      source: 'plugin',
      suite: 'quality',
    },
  });

  navigationRegistry.register('qms', {
    top_nav: [
      {
        code: 'qms',
        label: '质量管理',
        icon: 'CheckCircle',
        path: '/qms',
        group: 'business',
        order: 25,
        permission: 'qms:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'qms-standards',
        label: '质量标准',
        icon: 'FileCheck',
        path: '/qms/standards',
        order: 0,
        permission: 'qms:read',
        children: [
          {
            code: 'qms-standard-detail',
            label: '标准详情',
            icon: 'FileText',
            path: '/qms/standard/:id',
            permission: 'qms:read',
          },
        ],
      },
      {
        code: 'qms-checks',
        label: '检验管理',
        icon: 'ClipboardCheck',
        path: '/qms/checks',
        order: 1,
        permission: 'qms:read',
      },
      {
        code: 'qms-issues',
        label: '不合格品',
        icon: 'AlertCircle',
        path: '/qms/issues',
        order: 2,
        permission: 'qms:read',
      },
      {
        code: 'qms-improvements',
        label: '持续改进',
        icon: 'TrendingUp',
        path: '/qms/improvements',
        order: 3,
        permission: 'qms:read',
      },
      {
        code: 'qms-audit',
        label: '审核管理',
        icon: 'FileSearch',
        path: '/qms/audit',
        order: 4,
        permission: 'qms:read',
      },
      {
        code: 'qms-apqp',
        label: 'APQP策划',
        icon: 'ClipboardList',
        path: '/qms/apqp',
        order: 5,
        permission: 'qms:read',
      },
      {
        code: 'qms-quality-cost',
        label: '质量成本',
        icon: 'DollarSign',
        path: '/qms/quality-cost',
        order: 6,
        permission: 'qms:read',
      },
      {
        code: 'qms-spc',
        label: 'SPC 控制图',
        icon: 'Activity',
        path: '/qms/spc',
        order: 7,
        permission: 'qms:read',
      },
      {
        code: 'qms-eight-d',
        label: '8D 问题解决',
        icon: 'FileText',
        path: '/qms/eight-d',
        order: 8,
        permission: 'qms:read',
      },
      {
        code: 'qms-fmea',
        label: 'FMEA 分析',
        icon: 'AlertTriangle',
        path: '/qms/fmea',
        order: 9,
        permission: 'qms:read',
      },
    ],
    module_tabs: [
      {
        code: 'qms-standards',
        label: '质量标准',
        path: '/qms/standards',
        permission: 'qms:read',
      },
      {
        code: 'qms-checks',
        label: '检验管理',
        path: '/qms/checks',
        permission: 'qms:read',
      },
      {
        code: 'qms-issues',
        label: '不合格品',
        path: '/qms/issues',
        permission: 'qms:read',
      },
      {
        code: 'qms-improvements',
        label: '持续改进',
        path: '/qms/improvements',
        permission: 'qms:read',
      },
      {
        code: 'qms-audit',
        label: '审核管理',
        path: '/qms/audit',
        permission: 'qms:read',
      },
      {
        code: 'qms-apqp',
        label: 'APQP策划',
        path: '/qms/apqp',
        permission: 'qms:read',
      },
      {
        code: 'qms-quality-cost',
        label: '质量成本',
        path: '/qms/quality-cost',
        permission: 'qms:read',
      },
      {
        code: 'qms-spc',
        label: 'SPC 控制图',
        path: '/qms/spc',
        permission: 'qms:read',
      },
      {
        code: 'qms-eight-d',
        label: '8D 问题解决',
        path: '/qms/eight-d',
        permission: 'qms:read',
      },
      {
        code: 'qms-fmea',
        label: 'FMEA 分析',
        path: '/qms/fmea',
        permission: 'qms:read',
      },
    ],
    module_card: {
      code: 'qms',
      name: '质量管理系统',
      icon: 'CheckCircle',
      path: '/qms',
      status: 'beta',
      order: 25,
      permission: 'qms:read',
      source: 'plugin',
      suite: 'quality',
    },
  });

  navigationRegistry.register('ehs', {
    top_nav: [
      {
        code: 'ehs',
        label: '环境健康',
        icon: 'Leaf',
        path: '/ehs',
        group: 'business',
        order: 26,
        permission: 'ehs:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'ehs-hazards',
        label: '危险源管理',
        icon: 'AlertTriangle',
        path: '/ehs/hazards',
        order: 0,
        permission: 'ehs:read',
        children: [
          {
            code: 'ehs-hazard-detail',
            label: '危险源详情',
            icon: 'AlertCircle',
            path: '/ehs/hazard/:id',
            permission: 'ehs:read',
          },
        ],
      },
      {
        code: 'ehs-checks',
        label: '安全检查',
        icon: 'ClipboardList',
        path: '/ehs/checks',
        order: 1,
        permission: 'ehs:read',
      },
      {
        code: 'ehs-drills',
        label: '应急演练',
        icon: 'Siren',
        path: '/ehs/drills',
        order: 2,
        permission: 'ehs:read',
      },
      {
        code: 'ehs-incident',
        label: '事故报告',
        icon: 'FileText',
        path: '/ehs/incident',
        order: 3,
        permission: 'ehs:read',
      },
      // TODO: page not implemented
      // {
      //   code: 'ehs-accidents',
      //   label: '事故记录',
      //   icon: 'AlertOctagon',
      //   path: '/ehs/accidents',
      //   order: 3,
      //   permission: 'ehs:read',
      // },
      {
        code: 'ehs-plan',
        label: '应急预案',
        icon: 'FileText',
        path: '/ehs/plan',
        order: 4,
        permission: 'ehs:read',
      },
      {
        code: 'ehs-environment',
        label: '环境管理',
        icon: 'Leaf',
        path: '/ehs/environment',
        order: 5,
        permission: 'ehs:read',
      },
      {
        code: 'ehs-health',
        label: '职业健康',
        icon: 'Heart',
        path: '/ehs/health',
        order: 6,
        permission: 'ehs:read',
      },
      {
        code: 'ehs-emergency',
        label: '应急管理',
        icon: 'Siren',
        path: '/ehs/emergency',
        order: 7,
        permission: 'ehs:read',
      },
      {
        code: 'ehs-training',
        label: '培训管理',
        icon: 'GraduationCap',
        path: '/ehs/training',
        order: 8,
        permission: 'ehs:read',
      },
      {
        code: 'ehs-compliance',
        label: '合规管理',
        icon: 'Shield',
        path: '/ehs/compliance',
        order: 9,
        permission: 'ehs:read',
      },
      // TODO: page not implemented
      // {
      //   code: 'ehs-hazard',
      //   label: '隐患管理',
      //   icon: 'AlertTriangle',
      //   path: '/ehs/hazard',
      //   order: 10,
      //   permission: 'ehs:read',
      // },
    ],
    module_tabs: [
      {
        code: 'ehs-hazards',
        label: '危险源管理',
        path: '/ehs/hazards',
        permission: 'ehs:read',
      },
      {
        code: 'ehs-checks',
        label: '安全检查',
        path: '/ehs/checks',
        permission: 'ehs:read',
      },
      {
        code: 'ehs-drills',
        label: '应急演练',
        path: '/ehs/drills',
        permission: 'ehs:read',
      },
      {
        code: 'ehs-incident',
        label: '事故报告',
        path: '/ehs/incident',
        permission: 'ehs:read',
      },
      // TODO: page not implemented
      // {
      //   code: 'ehs-accidents',
      //   label: '事故记录',
      //   path: '/ehs/accidents',
      //   permission: 'ehs:read',
      // },
      {
        code: 'ehs-plan',
        label: '应急预案',
        path: '/ehs/plan',
        permission: 'ehs:read',
      },
      {
        code: 'ehs-environment',
        label: '环境管理',
        path: '/ehs/environment',
        permission: 'ehs:read',
      },
      {
        code: 'ehs-health',
        label: '职业健康',
        path: '/ehs/health',
        permission: 'ehs:read',
      },
      {
        code: 'ehs-emergency',
        label: '应急管理',
        path: '/ehs/emergency',
        permission: 'ehs:read',
      },
      {
        code: 'ehs-training',
        label: '培训管理',
        path: '/ehs/training',
        permission: 'ehs:read',
      },
      {
        code: 'ehs-compliance',
        label: '合规管理',
        path: '/ehs/compliance',
        permission: 'ehs:read',
      },
      // TODO: page not implemented
      // {
      //   code: 'ehs-hazard',
      //   label: '隐患管理',
      //   path: '/ehs/hazard',
      //   permission: 'ehs:read',
      // },
    ],
    module_card: {
      code: 'ehs',
      name: '环境健康安全',
      icon: 'Leaf',
      path: '/ehs',
      status: 'beta',
      order: 26,
      permission: 'ehs:read',
      source: 'plugin',
      suite: 'quality',
    },
  });

  navigationRegistry.register('plugin', {
    top_nav: [
      {
        code: 'plugin',
        label: '插件中心',
        icon: 'Package',
        path: '/plugin/marketplace',
        group: 'core',
        order: 30,
        permission: 'plugin:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'plugin-marketplace',
        label: '插件市场',
        icon: 'Store',
        path: '/plugin/marketplace',
        order: 1,
        permission: 'plugin:read',
      },
      {
        code: 'plugin-installed',
        label: '已安装插件',
        icon: 'Puzzle',
        path: '/admin/plugins',
        order: 2,
        permission: 'plugin:manage',
      },
      {
        code: 'plugin-upload',
        label: '发布插件',
        icon: 'Upload',
        path: '/plugin/upload',
        order: 3,
        permission: 'plugin:write',
      },
    ],
    module_card: {
      code: 'plugin',
      name: '插件中心',
      icon: 'Package',
      path: '/plugin/marketplace',
      status: 'online',
      order: 30,
      permission: 'plugin:read',
      source: 'core',
    },
  });

  navigationRegistry.register('lowcode', {
    top_nav: [
      {
        code: 'lowcode',
        label: '低代码平台',
        icon: 'Blocks',
        path: '/lowcode',
        group: 'core',
        order: 31,
        permission: 'lowcode:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'lowcode-overview',
        label: '概览仪表盘',
        icon: 'LayoutDashboard',
        path: '/lowcode/overview',
        order: 0,
        permission: 'lowcode:read',
      },
      {
        code: 'lowcode-apps',
        label: '应用管理',
        icon: 'AppWindow',
        path: '/lowcode/apps',
        order: 1,
        permission: 'lowcode:read',
      },
      {
        code: 'lowcode-models',
        label: '数据模型',
        icon: 'Database',
        path: '/lowcode/models',
        order: 2,
        permission: 'lowcode:read',
      },
      {
        code: 'lowcode-forms',
        label: '表单设计',
        icon: 'FileText',
        path: '/lowcode/forms',
        order: 3,
        permission: 'lowcode:read',
      },
      {
        code: 'lowcode-pages',
        label: '页面设计',
        icon: 'Layout',
        path: '/lowcode/pages',
        order: 4,
        permission: 'lowcode:read',
      },
      {
        code: 'lowcode-datasources',
        label: '数据源',
        icon: 'HardDrive',
        path: '/lowcode/datasources',
        order: 5,
        permission: 'lowcode:read',
      },
    ],
    module_tabs: [
      {
        code: 'lowcode-overview',
        label: '概览',
        path: '/lowcode/overview',
        permission: 'lowcode:read',
      },
      {
        code: 'lowcode-apps',
        label: '应用',
        path: '/lowcode/apps',
        permission: 'lowcode:read',
      },
      {
        code: 'lowcode-models',
        label: '数据模型',
        path: '/lowcode/models',
        permission: 'lowcode:read',
      },
      {
        code: 'lowcode-forms',
        label: '表单',
        path: '/lowcode/forms',
        permission: 'lowcode:read',
      },
      {
        code: 'lowcode-pages',
        label: '页面',
        path: '/lowcode/pages',
        permission: 'lowcode:read',
      },
      {
        code: 'lowcode-datasources',
        label: '数据源',
        path: '/lowcode/datasources',
        permission: 'lowcode:read',
      },
    ],
    module_card: {
      code: 'lowcode',
      name: '低代码平台',
      icon: 'Blocks',
      path: '/lowcode/overview',
      status: 'beta',
      order: 31,
      permission: 'lowcode:read',
      source: 'core',
    },
  });
};

registerDefaultModules();
