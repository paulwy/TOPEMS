export interface NavItem {
  code: string;
  label: string;
  icon?: string;
  path: string;
  permission?: string;
  order?: number;
  children?: NavItem[];
}

export interface ModuleCardConfig {
  order?: number;
  code: string;
  name: string;
  icon: string;
  path: string;
  permission?: string;
  status?: "online" | "beta" | "plan" | "new";
}

export interface PluginNavConfig {
  top_nav?: NavItem[];
  module_tabs?: NavItem[];
  module_card?: ModuleCardConfig;
}

class NavigationRegistry {
  private static instance: NavigationRegistry;
  private navItems: Map<string, NavItem[]> = new Map();
  private moduleCards: Map<string, ModuleCardConfig> = new Map();

  private constructor() {}

  static getInstance(): NavigationRegistry {
    if (!NavigationRegistry.instance) {
      NavigationRegistry.instance = new NavigationRegistry();
    }
    return NavigationRegistry.instance;
  }

  register(pluginCode: string, config: PluginNavConfig): void {
    if (config.top_nav) {
      this.navItems.set(pluginCode + ":top", config.top_nav);
    }
    if (config.module_tabs) {
      this.navItems.set(pluginCode + ":tabs", config.module_tabs);
    }
    if (config.module_card) {
      this.moduleCards.set(pluginCode, config.module_card);
    }
  }

  unregister(pluginCode: string): void {
    this.navItems.delete(pluginCode + ":top");
    this.navItems.delete(pluginCode + ":tabs");
    this.moduleCards.delete(pluginCode);
  }

  getTopNavItems(): NavItem[] {
    const items: NavItem[] = [];
    this.navItems.forEach((navItems, key) => {
      if (key.endsWith(":top")) {
        items.push(...navItems);
      }
    });
    return items.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getModuleTabs(pluginCode: string): NavItem[] | undefined {
    return this.navItems.get(pluginCode + ":tabs");
  }

  getModuleCards(): ModuleCardConfig[] {
    const cards: ModuleCardConfig[] = [];
    this.moduleCards.forEach((card) => {
      cards.push(card);
    });
    return cards.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getModuleCard(pluginCode: string): ModuleCardConfig | undefined {
    return this.moduleCards.get(pluginCode);
  }

  getAllPluginCodes(): string[] {
    const codes = new Set<string>();
    this.navItems.forEach((_, key) => {
      const parts = key.split(":");
      codes.add(parts[0]);
    });
    return Array.from(codes);
  }

  getNavItemsByPermission(
    hasPermission: (permission: string) => boolean,
  ): NavItem[] {
    const items: NavItem[] = [];
    this.navItems.forEach((navItems, key) => {
      if (key.endsWith(":top")) {
        navItems.forEach((item) => {
          if (!item.permission || hasPermission(item.permission)) {
            items.push(item);
          }
        });
      }
    });
    return items.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getModuleCardsByPermission(
    hasPermission: (permission: string) => boolean,
  ): ModuleCardConfig[] {
    const cards: ModuleCardConfig[] = [];
    this.moduleCards.forEach((card) => {
      if (!card.permission || hasPermission(card.permission)) {
        cards.push(card);
      }
    });
    return cards.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  updateModuleStatus(
    pluginCode: string,
    status: "online" | "beta" | "plan" | "new",
  ): void {
    const card = this.moduleCards.get(pluginCode);
    if (card) {
      card.status = status;
    }
  }
}

export const navigationRegistry = NavigationRegistry.getInstance();

const registerDefaultModules = () => {
  navigationRegistry.register("erp", {
    top_nav: [
      {
        code: "erp",
        label: "企业资源",
        icon: "Building",
        path: "/erp",
        order: 1,
        permission: "erp:read",
      },
    ],
    module_tabs: [
      {
        code: "erp-dashboard",
        label: "仪表盘",
        path: "/erp/dashboard",
        permission: "erp:read",
      },
      {
        code: "erp-finance",
        label: "财务管理",
        path: "/erp/finance",
        permission: "erp:read",
      },
      {
        code: "erp-inventory",
        label: "库存管理",
        path: "/erp/inventory",
        permission: "erp:read",
      },
      {
        code: "erp-sales",
        label: "销售管理",
        path: "/erp/sales",
        permission: "erp:read",
      },
    ],
    module_card: {
      code: "erp",
      name: "企业资源管理",
      icon: "Building",
      path: "/erp",
      status: "online",
      order: 1,
      permission: "erp:read",
    },
  });

  navigationRegistry.register("pm", {
    top_nav: [
      {
        code: "pm",
        label: "项目管理",
        icon: "FolderKanban",
        path: "/pm",
        order: 2,
        permission: "pm:read",
      },
    ],
    module_tabs: [
      {
        code: "pm-projects",
        label: "项目列表",
        path: "/pm/projects",
        permission: "pm:read",
      },
      {
        code: "pm-tasks",
        label: "任务管理",
        path: "/pm/tasks",
        permission: "pm:read",
      },
      {
        code: "pm-timeline",
        label: "时间线",
        path: "/pm/timeline",
        permission: "pm:read",
      },
      {
        code: "pm-reports",
        label: "报表分析",
        path: "/pm/reports",
        permission: "pm:read",
      },
    ],
    module_card: {
      code: "pm",
      name: "项目管理",
      icon: "FolderKanban",
      path: "/pm",
      status: "online",
      order: 2,
      permission: "pm:read",
    },
  });

  navigationRegistry.register("rs", {
    top_nav: [
      {
        code: "rs",
        label: "研发管理",
        icon: "FlaskConical",
        path: "/rs",
        order: 3,
        permission: "rs:read",
      },
    ],
    module_tabs: [
      {
        code: "rs-projects",
        label: "研发项目",
        path: "/rs/projects",
        permission: "rs:read",
      },
      {
        code: "rs-documents",
        label: "文档管理",
        path: "/rs/documents",
        permission: "rs:read",
      },
      {
        code: "rs-tests",
        label: "测试管理",
        path: "/rs/tests",
        permission: "rs:read",
      },
      {
        code: "rs-releases",
        label: "版本发布",
        path: "/rs/releases",
        permission: "rs:read",
      },
    ],
    module_card: {
      code: "rs",
      name: "研发管理",
      icon: "FlaskConical",
      path: "/rs",
      status: "online",
      order: 3,
      permission: "rs:read",
    },
  });

  navigationRegistry.register("scm", {
    top_nav: [
      {
        code: "scm",
        label: "供应链",
        icon: "Truck",
        path: "/scm",
        order: 4,
        permission: "scm:read",
      },
    ],
    module_tabs: [
      {
        code: "scm-suppliers",
        label: "供应商",
        path: "/scm/suppliers",
        permission: "scm:read",
      },
      {
        code: "scm-purchasing",
        label: "采购管理",
        path: "/scm/purchasing",
        permission: "scm:read",
      },
      {
        code: "scm-warehouse",
        label: "仓储管理",
        path: "/scm/warehouse",
        permission: "scm:read",
      },
      {
        code: "scm-logistics",
        label: "物流追踪",
        path: "/scm/logistics",
        permission: "scm:read",
      },
    ],
    module_card: {
      code: "scm",
      name: "供应链管理",
      icon: "Truck",
      path: "/scm",
      status: "online",
      order: 4,
      permission: "scm:read",
    },
  });

  navigationRegistry.register("crm", {
    top_nav: [
      {
        code: "crm",
        label: "客户关系",
        icon: "Users",
        path: "/crm",
        order: 5,
        permission: "crm:read",
      },
    ],
    module_tabs: [
      {
        code: "crm-customers",
        label: "客户管理",
        path: "/crm/customers",
        permission: "crm:read",
      },
      {
        code: "crm-opportunities",
        label: "商机管理",
        path: "/crm/opportunities",
        permission: "crm:read",
      },
      {
        code: "crm-activities",
        label: "活动管理",
        path: "/crm/activities",
        permission: "crm:read",
      },
      {
        code: "crm-reports",
        label: "销售报表",
        path: "/crm/reports",
        permission: "crm:read",
      },
    ],
    module_card: {
      code: "crm",
      name: "客户关系管理",
      icon: "Users",
      path: "/crm",
      status: "beta",
      order: 5,
      permission: "crm:read",
    },
  });

  navigationRegistry.register("ai", {
    top_nav: [
      {
        code: "ai",
        label: "AI助手",
        icon: "Bot",
        path: "/ai",
        order: 6,
        permission: "ai:read",
      },
    ],
    module_tabs: [
      {
        code: "ai-chat",
        label: "智能对话",
        path: "/ai/chat",
        permission: "ai:read",
      },
      {
        code: "ai-analytics",
        label: "数据分析",
        path: "/ai/analytics",
        permission: "ai:read",
      },
      {
        code: "ai-workflows",
        label: "自动化工作流",
        path: "/ai/workflows",
        permission: "ai:read",
      },
    ],
    module_card: {
      code: "ai",
      name: "AI智能助手",
      icon: "Bot",
      path: "/ai",
      status: "online",
      order: 6,
      permission: "ai:read",
    },
  });

  navigationRegistry.register("gis", {
    top_nav: [
      {
        code: "gis",
        label: "地理信息",
        icon: "Map",
        path: "/gis",
        order: 7,
        permission: "gis:read",
      },
    ],
    module_tabs: [
      {
        code: "gis-map",
        label: "地图视图",
        path: "/gis/map",
        permission: "gis:read",
      },
      {
        code: "gis-layers",
        label: "图层管理",
        path: "/gis/layers",
        permission: "gis:read",
      },
      {
        code: "gis-analysis",
        label: "空间分析",
        path: "/gis/analysis",
        permission: "gis:read",
      },
    ],
    module_card: {
      code: "gis",
      name: "地理信息系统",
      icon: "Map",
      path: "/gis",
      status: "plan",
      order: 7,
      permission: "gis:read",
    },
  });

  navigationRegistry.register("hrm", {
    top_nav: [
      {
        code: "hrm",
        label: "人力资源",
        icon: "Users",
        path: "/hrm",
        order: 8,
        permission: "hrm:read",
      },
    ],
    module_tabs: [
      {
        code: "hrm-employees",
        label: "员工管理",
        path: "/hrm/employees",
        permission: "hrm:read",
      },
      {
        code: "hrm-recruitment",
        label: "招聘管理",
        path: "/hrm/recruitment",
        permission: "hrm:read",
      },
      {
        code: "hrm-training",
        label: "培训管理",
        path: "/hrm/training",
        permission: "hrm:read",
      },
      {
        code: "hrm-performance",
        label: "绩效考核",
        path: "/hrm/performance",
        permission: "hrm:read",
      },
    ],
    module_card: {
      code: "hrm",
      name: "人力资源管理",
      icon: "Users",
      path: "/hrm",
      status: "online",
      order: 8,
      permission: "hrm:read",
    },
  });

  navigationRegistry.register("im", {
    top_nav: [
      {
        code: "im",
        label: "即时通讯",
        icon: "MessageCircle",
        path: "/im",
        order: 9,
        permission: "im:read",
      },
    ],
    module_tabs: [
      {
        code: "im-chats",
        label: "消息",
        path: "/im/chats",
        permission: "im:read",
      },
      {
        code: "im-contacts",
        label: "联系人",
        path: "/im/contacts",
        permission: "im:read",
      },
      {
        code: "im-groups",
        label: "群组",
        path: "/im/groups",
        permission: "im:read",
      },
    ],
    module_card: {
      code: "im",
      name: "即时通讯",
      icon: "MessageCircle",
      path: "/im",
      status: "online",
      order: 9,
      permission: "im:read",
    },
  });
};

registerDefaultModules();
