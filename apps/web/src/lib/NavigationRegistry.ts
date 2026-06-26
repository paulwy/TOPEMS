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
}

export interface ModuleCardConfig {
  order?: number;
  code: string;
  name: string;
  icon: string;
  path: string;
  permission?: string;
  status?: 'online' | 'beta' | 'plan' | 'new';
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
        code: 'erp-finance',
        label: '财务管理',
        icon: 'DollarSign',
        path: '/erp/finance',
        order: 1,
        permission: 'erp:read',
      },
      {
        code: 'erp-inventory',
        label: '库存管理',
        icon: 'Package',
        path: '/erp/inventory',
        order: 2,
        permission: 'erp:read',
      },
      {
        code: 'erp-sales',
        label: '销售管理',
        icon: 'ShoppingCart',
        path: '/erp/sales',
        order: 3,
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
        code: 'erp-finance',
        label: '财务管理',
        path: '/erp/finance',
        permission: 'erp:read',
      },
      {
        code: 'erp-inventory',
        label: '库存管理',
        path: '/erp/inventory',
        permission: 'erp:read',
      },
      {
        code: 'erp-sales',
        label: '销售管理',
        path: '/erp/sales',
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
    },
  });

  navigationRegistry.register('pm', {
    top_nav: [
      {
        code: 'pm',
        label: '项目管理',
        icon: 'FolderKanban',
        path: '/pm',
        order: 2,
        permission: 'pm:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'pm-projects',
        label: '项目列表',
        icon: 'FolderKanban',
        path: '/pm/projects',
        order: 0,
        permission: 'pm:read',
      },
      {
        code: 'pm-tasks',
        label: '任务管理',
        icon: 'ListTodo',
        path: '/pm/tasks',
        order: 1,
        permission: 'pm:read',
      },
      {
        code: 'pm-gantt',
        label: '甘特图',
        icon: 'GanttChart',
        path: '/pm/gantt',
        order: 2,
        permission: 'pm:read',
      },
      {
        code: 'pm-risk',
        label: '风险管理',
        icon: 'ShieldAlert',
        path: '/pm/risk',
        order: 3,
        permission: 'pm:read',
      },
      {
        code: 'pm-contract',
        label: '合同管理',
        icon: 'FileSignature',
        path: '/pm/contract',
        order: 4,
        permission: 'pm:read',
      },
      {
        code: 'pm-timeline',
        label: '时间线',
        icon: 'Calendar',
        path: '/pm/timeline',
        order: 5,
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
        code: 'pm-projects',
        label: '项目列表',
        path: '/pm/projects',
        permission: 'pm:read',
      },
      {
        code: 'pm-tasks',
        label: '任务管理',
        path: '/pm/tasks',
        permission: 'pm:read',
      },
      {
        code: 'pm-gantt',
        label: '甘特图',
        path: '/pm/gantt',
        permission: 'pm:read',
      },
      {
        code: 'pm-risk',
        label: '风险管理',
        path: '/pm/risk',
        permission: 'pm:read',
      },
      {
        code: 'pm-contract',
        label: '合同管理',
        path: '/pm/contract',
        permission: 'pm:read',
      },
      {
        code: 'pm-timeline',
        label: '时间线',
        path: '/pm/timeline',
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
    },
  });

  navigationRegistry.register('rs', {
    top_nav: [
      {
        code: 'rs',
        label: '研发管理',
        icon: 'FlaskConical',
        path: '/rs',
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
    ],
    module_card: {
      code: 'rs',
      name: '研发管理',
      icon: 'FlaskConical',
      path: '/rs',
      status: 'online',
      order: 3,
      permission: 'rs:read',
    },
  });

  navigationRegistry.register('scm', {
    top_nav: [
      {
        code: 'scm',
        label: '供应链',
        icon: 'Truck',
        path: '/scm',
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
        code: 'scm-purchase-order',
        label: '采购订单',
        icon: 'ShoppingCart',
        path: '/scm/purchase-order',
        order: 1,
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
        code: 'scm-inventory',
        label: '库存管理',
        icon: 'Package',
        path: '/scm/inventory',
        order: 3,
        permission: 'scm:read',
      },
      {
        code: 'scm-warehouse',
        label: '仓储管理',
        icon: 'Warehouse',
        path: '/scm/warehouse',
        order: 4,
        permission: 'scm:read',
      },
      {
        code: 'scm-logistics',
        label: '物流追踪',
        icon: 'Truck',
        path: '/scm/logistics',
        order: 5,
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
        code: 'scm-purchase-order',
        label: '采购订单',
        path: '/scm/purchase-order',
        permission: 'scm:read',
      },
      {
        code: 'scm-delivery-appointment',
        label: '送货预约',
        path: '/scm/delivery-appointments',
        permission: 'scm:read',
      },
      {
        code: 'scm-inventory',
        label: '库存管理',
        path: '/scm/inventory',
        permission: 'scm:read',
      },
      {
        code: 'scm-warehouse',
        label: '仓储管理',
        path: '/scm/warehouse',
        permission: 'scm:read',
      },
      {
        code: 'scm-logistics',
        label: '物流追踪',
        path: '/scm/logistics',
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
    },
  });

  navigationRegistry.register('finance', {
    top_nav: [
      {
        code: 'finance',
        label: '财务管理',
        icon: 'Wallet',
        path: '/finance',
        order: 10,
        permission: 'finance:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'finance-account',
        label: '科目管理',
        icon: 'Book',
        path: '/finance/account',
        order: 0,
        permission: 'finance:read',
      },
      {
        code: 'finance-voucher',
        label: '凭证管理',
        icon: 'FileText',
        path: '/finance/voucher',
        order: 1,
        permission: 'finance:read',
      },
      {
        code: 'finance-arap',
        label: '应收应付',
        icon: 'CreditCard',
        path: '/finance/arap',
        order: 2,
        permission: 'finance:read',
      },
      {
        code: 'finance-report',
        label: '财务报表',
        icon: 'BarChart3',
        path: '/finance/report',
        order: 3,
        permission: 'finance:read',
      },
      {
        code: 'finance-budget',
        label: '预算管理',
        icon: 'Calculator',
        path: '/finance/budget',
        order: 4,
        permission: 'finance:read',
      },
      {
        code: 'finance-asset',
        label: '资产管理',
        icon: 'Building',
        path: '/finance/asset',
        order: 5,
        permission: 'finance:read',
      },
    ],
    module_tabs: [
      {
        code: 'finance-account',
        label: '科目管理',
        path: '/finance/account',
        permission: 'finance:read',
      },
      {
        code: 'finance-voucher',
        label: '凭证管理',
        path: '/finance/voucher',
        permission: 'finance:read',
      },
      {
        code: 'finance-arap',
        label: '应收应付',
        path: '/finance/arap',
        permission: 'finance:read',
      },
      {
        code: 'finance-report',
        label: '财务报表',
        path: '/finance/report',
        permission: 'finance:read',
      },
      {
        code: 'finance-budget',
        label: '预算管理',
        path: '/finance/budget',
        permission: 'finance:read',
      },
      {
        code: 'finance-asset',
        label: '资产管理',
        path: '/finance/asset',
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
    },
  });

  navigationRegistry.register('mes', {
    top_nav: [
      {
        code: 'mes',
        label: '生产执行',
        icon: 'Factory',
        path: '/mes',
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
        code: 'mes-order',
        label: '生产订单',
        icon: 'ClipboardList',
        path: '/mes/order',
        order: 0,
        permission: 'mes:read',
      },
      {
        code: 'mes-process',
        label: '生产过程',
        icon: 'GitBranch',
        path: '/mes/process',
        order: 1,
        permission: 'mes:read',
      },
      {
        code: 'mes-workstation',
        label: '工作站',
        icon: 'Monitor',
        path: '/mes/workstation',
        order: 2,
        permission: 'mes:read',
      },
      {
        code: 'mes-equipment',
        label: '设备管理',
        icon: 'Wrench',
        path: '/mes/equipment',
        order: 3,
        permission: 'mes:read',
      },
      {
        code: 'mes-quality',
        label: '质量管理',
        icon: 'CheckCircle',
        path: '/mes/quality',
        order: 4,
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
        code: 'mes-order',
        label: '生产订单',
        path: '/mes/order',
        permission: 'mes:read',
      },
      {
        code: 'mes-process',
        label: '生产过程',
        path: '/mes/process',
        permission: 'mes:read',
      },
      {
        code: 'mes-workstation',
        label: '工作站',
        path: '/mes/workstation',
        permission: 'mes:read',
      },
      {
        code: 'mes-equipment',
        label: '设备管理',
        path: '/mes/equipment',
        permission: 'mes:read',
      },
      {
        code: 'mes-quality',
        label: '质量管理',
        path: '/mes/quality',
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
    },
  });

  navigationRegistry.register('crm', {
    top_nav: [
      {
        code: 'crm',
        label: '客户关系',
        icon: 'Users',
        path: '/crm',
        order: 5,
        permission: 'crm:read',
      },
    ],
    sidebar_nav: [
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
        code: 'crm-activities',
        label: '活动管理',
        icon: 'Calendar',
        path: '/crm/activities',
        order: 2,
        permission: 'crm:read',
      },
      {
        code: 'crm-reports',
        label: '销售报表',
        icon: 'BarChart3',
        path: '/crm/reports',
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
    ],
    module_tabs: [
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
        code: 'crm-activities',
        label: '活动管理',
        path: '/crm/activities',
        permission: 'crm:read',
      },
      {
        code: 'crm-reports',
        label: '销售报表',
        path: '/crm/reports',
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
    ],
    module_card: {
      code: 'crm',
      name: '客户关系管理',
      icon: 'Users',
      path: '/crm',
      status: 'beta',
      order: 5,
      permission: 'crm:read',
    },
  });

  navigationRegistry.register('ai', {
    top_nav: [
      {
        code: 'ai',
        label: 'AI助手',
        icon: 'Bot',
        path: '/ai',
        order: 6,
        permission: 'ai:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'ai-chat',
        label: '智能对话',
        icon: 'MessageSquare',
        path: '/ai/chat',
        order: 0,
        permission: 'ai:read',
      },
      {
        code: 'ai-analytics',
        label: '数据分析',
        icon: 'BarChart3',
        path: '/ai/analytics',
        order: 1,
        permission: 'ai:read',
      },
      {
        code: 'ai-workflows',
        label: '自动化工作流',
        icon: 'GitBranch',
        path: '/ai/workflows',
        order: 2,
        permission: 'ai:read',
      },
      {
        code: 'ai-assistant',
        label: 'AI助手',
        icon: 'Bot',
        path: '/ai/assistant',
        order: 3,
        permission: 'ai:read',
      },
    ],
    module_tabs: [
      {
        code: 'ai-chat',
        label: '智能对话',
        path: '/ai/chat',
        permission: 'ai:read',
      },
      {
        code: 'ai-analytics',
        label: '数据分析',
        path: '/ai/analytics',
        permission: 'ai:read',
      },
      {
        code: 'ai-workflows',
        label: '自动化工作流',
        path: '/ai/workflows',
        permission: 'ai:read',
      },
      {
        code: 'ai-assistant',
        label: 'AI助手',
        path: '/ai/assistant',
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
    },
  });

  navigationRegistry.register('gis', {
    top_nav: [
      {
        code: 'gis',
        label: '地理信息',
        icon: 'Map',
        path: '/gis',
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
        code: 'gis-layers',
        label: '图层管理',
        icon: 'Layers',
        path: '/gis/layers',
        order: 1,
        permission: 'gis:read',
      },
      {
        code: 'gis-analysis',
        label: '空间分析',
        icon: 'TrendingUp',
        path: '/gis/analysis',
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
        code: 'gis-layers',
        label: '图层管理',
        path: '/gis/layers',
        permission: 'gis:read',
      },
      {
        code: 'gis-analysis',
        label: '空间分析',
        path: '/gis/analysis',
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
    },
  });

  navigationRegistry.register('hrm', {
    top_nav: [
      {
        code: 'hrm',
        label: '人力资源',
        icon: 'Users',
        path: '/hrm',
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
        code: 'hrm-recruitment',
        label: '招聘管理',
        icon: 'UserPlus',
        path: '/hrm/recruitment',
        order: 1,
        permission: 'hrm:read',
      },
      {
        code: 'hrm-training',
        label: '培训管理',
        icon: 'GraduationCap',
        path: '/hrm/training',
        order: 2,
        permission: 'hrm:read',
      },
      {
        code: 'hrm-performance',
        label: '绩效考核',
        icon: 'Award',
        path: '/hrm/performance',
        order: 3,
        permission: 'hrm:read',
      },
      {
        code: 'hrm-salary-adjustments',
        label: '薪资调整',
        icon: 'TrendingUp',
        path: '/hrm/salary-adjustments',
        order: 4,
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
        code: 'hrm-recruitment',
        label: '招聘管理',
        path: '/hrm/recruitment',
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
    },
  });

  navigationRegistry.register('im', {
    top_nav: [
      {
        code: 'im',
        label: '即时通讯',
        icon: 'MessageCircle',
        path: '/im',
        order: 9,
        permission: 'im:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'im-chats',
        label: '消息',
        icon: 'MessageCircle',
        path: '/im/chats',
        order: 0,
        permission: 'im:read',
      },
      {
        code: 'im-contacts',
        label: '联系人',
        icon: 'Users',
        path: '/im/contacts',
        order: 1,
        permission: 'im:read',
      },
      {
        code: 'im-groups',
        label: '群组',
        icon: 'Users',
        path: '/im/groups',
        order: 2,
        permission: 'im:read',
      },
    ],
    module_tabs: [
      {
        code: 'im-chats',
        label: '消息',
        path: '/im/chats',
        permission: 'im:read',
      },
      {
        code: 'im-contacts',
        label: '联系人',
        path: '/im/contacts',
        permission: 'im:read',
      },
      {
        code: 'im-groups',
        label: '群组',
        path: '/im/groups',
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
    },
  });

  navigationRegistry.register('bi', {
    top_nav: [
      {
        code: 'bi',
        label: '商业智能',
        icon: 'BarChart3',
        path: '/bi',
        order: 12,
        permission: 'bi:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'bi-dashboard',
        label: '仪表盘',
        icon: 'LayoutDashboard',
        path: '/bi/dashboard',
        order: 0,
        permission: 'bi:read',
      },
      {
        code: 'bi-analytics',
        label: '数据分析',
        icon: 'TrendingUp',
        path: '/bi/analytics',
        order: 1,
        permission: 'bi:read',
      },
      {
        code: 'bi-comparison',
        label: '对比分析',
        icon: 'GitCompare',
        path: '/bi/comparison',
        order: 2,
        permission: 'bi:read',
      },
      {
        code: 'bi-reports',
        label: '报表中心',
        icon: 'FileText',
        path: '/bi/reports',
        order: 3,
        permission: 'bi:read',
      },
      {
        code: 'bi-datasources',
        label: '数据源',
        icon: 'Database',
        path: '/bi/datasources',
        order: 4,
        permission: 'bi:read',
      },
      {
        code: 'bi-visualizations',
        label: '可视化',
        icon: 'PieChart',
        path: '/bi/visualizations',
        order: 5,
        permission: 'bi:read',
      },
      {
        code: 'bi-gis',
        label: 'GIS分析',
        icon: 'Map',
        path: '/bi/gis',
        order: 6,
        permission: 'bi:read',
      },
    ],
    module_tabs: [
      {
        code: 'bi-dashboard',
        label: '仪表盘',
        path: '/bi/dashboard',
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
        label: '报表中心',
        path: '/bi/reports',
        permission: 'bi:read',
      },
      {
        code: 'bi-datasources',
        label: '数据源',
        path: '/bi/datasources',
        permission: 'bi:read',
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
    ],
    module_card: {
      code: 'bi',
      name: '商业智能',
      icon: 'BarChart3',
      path: '/bi',
      status: 'online',
      order: 12,
      permission: 'bi:read',
    },
  });

  navigationRegistry.register('iam', {
    top_nav: [
      {
        code: 'iam',
        label: '权限管理',
        icon: 'Shield',
        path: '/iam',
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
      {
        code: 'iam-system-monitor',
        label: '系统监控',
        icon: 'Monitor',
        path: '/system/monitor',
        order: 8,
        permission: 'iam:system_read',
      },
    ],
    module_tabs: [
      {
        code: 'iam-dashboard',
        label: '控制台',
        path: '/iam',
        permission: 'iam:users_read',
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
    ],
    module_card: {
      code: 'iam',
      name: '权限管理',
      icon: 'Shield',
      path: '/iam',
      status: 'online',
      order: 20,
      permission: 'iam:users_read',
    },
  });

  navigationRegistry.register('workflow', {
    top_nav: [
      {
        code: 'workflow',
        label: '工作流',
        icon: 'GitBranch',
        path: '/flow',
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
    ],
    module_card: {
      code: 'workflow',
      name: '工作流引擎',
      icon: 'GitBranch',
      path: '/flow',
      status: 'online',
      order: 13,
      permission: 'workflow:read',
    },
  });

  navigationRegistry.register('wms', {
    top_nav: [
      {
        code: 'wms',
        label: '仓储管理',
        icon: 'Warehouse',
        path: '/wms',
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
    ],
    module_card: {
      code: 'wms',
      name: '仓储管理系统',
      icon: 'Warehouse',
      path: '/wms',
      status: 'online',
      order: 14,
      permission: 'wms:read',
    },
  });

  navigationRegistry.register('pdm', {
    top_nav: [
      {
        code: 'pdm',
        label: '产品数据',
        icon: 'Box',
        path: '/pdm',
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
    ],
    module_card: {
      code: 'pdm',
      name: '产品数据管理',
      icon: 'Box',
      path: '/pdm',
      status: 'beta',
      order: 15,
      permission: 'pdm:read',
    },
  });

  navigationRegistry.register('monitor', {
    top_nav: [
      {
        code: 'monitor',
        label: '系统监控',
        icon: 'Activity',
        path: '/monitor',
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
    },
  });

  navigationRegistry.register('docs', {
    top_nav: [
      {
        code: 'docs',
        label: '文档中心',
        icon: 'FileText',
        path: '/documents',
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
    ],
    module_card: {
      code: 'docs',
      name: '文档中心',
      icon: 'FileText',
      path: '/documents',
      status: 'online',
      order: 16,
      permission: 'doc:read',
    },
  });

  navigationRegistry.register('notification', {
    top_nav: [
      {
        code: 'notification',
        label: '通知中心',
        icon: 'Bell',
        path: '/notifications',
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
    },
  });

  navigationRegistry.register('report', {
    top_nav: [
      {
        code: 'report',
        label: '报表中心',
        icon: 'BarChart2',
        path: '/report/list',
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
    ],
    module_card: {
      code: 'report',
      name: '报表中心',
      icon: 'BarChart2',
      path: '/report/list',
      status: 'online',
      order: 18,
      permission: 'report:read',
    },
  });

  navigationRegistry.register('mobile', {
    top_nav: [
      {
        code: 'mobile',
        label: '移动配置',
        icon: 'Smartphone',
        path: '/mobile',
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
    },
  });

  navigationRegistry.register('integration', {
    top_nav: [
      {
        code: 'integration',
        label: '系统集成',
        icon: 'Plug',
        path: '/integration',
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
        path: '/integration/external-erp',
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
    ],
    module_card: {
      code: 'integration',
      name: '系统集成',
      icon: 'Plug',
      path: '/integration',
      status: 'beta',
      order: 22,
      permission: 'integration:read',
    },
  });

  navigationRegistry.register('srm', {
    top_nav: [
      {
        code: 'srm',
        label: '供应商管理',
        icon: 'Handshake',
        path: '/srm',
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
        code: 'srm-sourcing',
        label: '寻源管理',
        icon: 'Target',
        path: '/srm/sourcing',
        order: 4,
        permission: 'srm:read',
      },
      {
        code: 'srm-orders',
        label: '采购订单',
        icon: 'ShoppingCart',
        path: '/srm/orders',
        order: 5,
        permission: 'srm:read',
      },
      {
        code: 'srm-contracts',
        label: '合同管理',
        icon: 'FileSignature',
        path: '/srm/contracts',
        order: 6,
        permission: 'srm:read',
      },
      {
        code: 'srm-finance',
        label: '财务结算',
        icon: 'Wallet',
        path: '/srm/finance',
        order: 7,
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
    ],
    module_card: {
      code: 'srm',
      name: '供应商关系管理',
      icon: 'Handshake',
      path: '/srm',
      status: 'online',
      order: 23,
      permission: 'srm:read',
    },
  });

  navigationRegistry.register('lims', {
    top_nav: [
      {
        code: 'lims',
        label: '实验室管理',
        icon: 'FlaskRound',
        path: '/lims',
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
        code: 'lims-instruments',
        label: '仪器管理',
        icon: 'Microscope',
        path: '/lims/instruments',
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
        code: 'lims-instruments',
        label: '仪器管理',
        path: '/lims/instruments',
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
    },
  });

  navigationRegistry.register('qms', {
    top_nav: [
      {
        code: 'qms',
        label: '质量管理',
        icon: 'CheckCircle',
        path: '/qms',
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
    ],
    module_card: {
      code: 'qms',
      name: '质量管理系统',
      icon: 'CheckCircle',
      path: '/qms',
      status: 'beta',
      order: 25,
      permission: 'qms:read',
    },
  });

  navigationRegistry.register('ehs', {
    top_nav: [
      {
        code: 'ehs',
        label: '环境健康',
        icon: 'Leaf',
        path: '/ehs',
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
      {
        code: 'ehs-accidents',
        label: '事故记录',
        icon: 'AlertOctagon',
        path: '/ehs/accidents',
        order: 3,
        permission: 'ehs:read',
      },
      {
        code: 'ehs-plan',
        label: '应急预案',
        icon: 'FileText',
        path: '/ehs/plan',
        order: 4,
        permission: 'ehs:read',
      },
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
      {
        code: 'ehs-plan',
        label: '应急预案',
        path: '/ehs/plan',
        permission: 'ehs:read',
      },
    ],
    module_card: {
      code: 'ehs',
      name: '环境健康安全',
      icon: 'Leaf',
      path: '/ehs',
      status: 'beta',
      order: 26,
      permission: 'ehs:read',
    },
  });
};

registerDefaultModules();
