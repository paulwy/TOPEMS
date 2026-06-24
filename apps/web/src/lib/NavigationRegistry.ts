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
        path: '/rs/documents',
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
        path: '/rs/documents',
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
        code: 'scm-inventory',
        label: '库存管理',
        icon: 'Package',
        path: '/scm/inventory',
        order: 2,
        permission: 'scm:read',
      },
      {
        code: 'scm-warehouse',
        label: '仓储管理',
        icon: 'Warehouse',
        path: '/scm/warehouse',
        order: 3,
        permission: 'scm:read',
      },
      {
        code: 'scm-logistics',
        label: '物流追踪',
        icon: 'Truck',
        path: '/scm/logistics',
        order: 4,
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

  // Finance 财务管理模块
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
        icon: 'BookOpen',
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
        code: 'finance-ledger',
        label: '总账',
        icon: 'Book',
        path: '/finance/ledger',
        order: 2,
        permission: 'finance:read',
      },
      {
        code: 'finance-report',
        label: '财务报表',
        icon: 'BarChart3',
        path: '/finance/reports',
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
        icon: 'Building2',
        path: '/finance/asset',
        order: 5,
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

  // MES 生产执行模块
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
        icon: 'Shield',
        path: '/mes/quality',
        order: 4,
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

  // SCM 供应链模块
  navigationRegistry.register('scm', {
    top_nav: [
      {
        code: 'scm',
        label: '供应链',
        icon: 'Truck',
        path: '/scm',
        order: 12,
        permission: 'scm:read',
      },
    ],
    sidebar_nav: [
      {
        code: 'scm-supplier',
        label: '供应商管理',
        icon: 'Users',
        path: '/scm/supplier',
        order: 0,
        permission: 'scm:read',
      },
      {
        code: 'scm-purchase',
        label: '采购订单',
        icon: 'ShoppingCart',
        path: '/scm/purchase',
        order: 1,
        permission: 'scm:read',
      },
      {
        code: 'scm-inventory',
        label: '库存管理',
        icon: 'Package',
        path: '/scm/inventory',
        order: 2,
        permission: 'scm:read',
      },
      {
        code: 'scm-warehouse',
        label: '仓储管理',
        icon: 'Warehouse',
        path: '/scm/warehouse',
        order: 3,
        permission: 'scm:read',
      },
    ],
    module_card: {
      code: 'scm',
      name: '供应链管理',
      icon: 'Truck',
      path: '/scm',
      status: 'online',
      order: 12,
      permission: 'scm:read',
    },
  });
};

registerDefaultModules();
