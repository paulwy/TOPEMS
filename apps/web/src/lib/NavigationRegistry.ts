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
  status?: 'online' | 'beta' | 'plan' | 'new';
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

  updateModuleStatus(pluginCode: string, status: "running" | "warning" | "stopped"): void {
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
      { code: "erp", label: "企业资源", icon: "Building", path: "/erp", order: 1 },
    ],
    module_tabs: [
      { code: "erp-dashboard", label: "仪表盘", path: "/erp/dashboard" },
      { code: "erp-finance", label: "财务管理", path: "/erp/finance" },
      { code: "erp-inventory", label: "库存管理", path: "/erp/inventory" },
      { code: "erp-sales", label: "销售管理", path: "/erp/sales" },
    ],
    module_card: {
      code: "erp",
      name: "企业资源管理",
      icon: "Building",
      path: "/erp",
      status: "running",
      order: 1,
    },
  });

  navigationRegistry.register("pm", {
    top_nav: [
      { code: "pm", label: "项目管理", icon: "FolderKanban", path: "/pm", order: 2 },
    ],
    module_tabs: [
      { code: "pm-projects", label: "项目列表", path: "/pm/projects" },
      { code: "pm-tasks", label: "任务管理", path: "/pm/tasks" },
      { code: "pm-timeline", label: "时间线", path: "/pm/timeline" },
      { code: "pm-reports", label: "报表分析", path: "/pm/reports" },
    ],
    module_card: {
      code: "pm",
      name: "项目管理",
      icon: "FolderKanban",
      path: "/pm",
      status: "running",
      order: 2,
    },
  });

  navigationRegistry.register("rs", {
    top_nav: [
      { code: "rs", label: "研发管理", icon: "FlaskConical", path: "/rs", order: 3 },
    ],
    module_tabs: [
      { code: "rs-projects", label: "研发项目", path: "/rs/projects" },
      { code: "rs-documents", label: "文档管理", path: "/rs/documents" },
      { code: "rs-tests", label: "测试管理", path: "/rs/tests" },
      { code: "rs-releases", label: "版本发布", path: "/rs/releases" },
    ],
    module_card: {
      code: "rs",
      name: "研发管理",
      icon: "FlaskConical",
      path: "/rs",
      status: "running",
      order: 3,
    },
  });

  navigationRegistry.register("scm", {
    top_nav: [
      { code: "scm", label: "供应链", icon: "Truck", path: "/scm", order: 4 },
    ],
    module_tabs: [
      { code: "scm-suppliers", label: "供应商", path: "/scm/suppliers" },
      { code: "scm-purchasing", label: "采购管理", path: "/scm/purchasing" },
      { code: "scm-warehouse", label: "仓储管理", path: "/scm/warehouse" },
      { code: "scm-logistics", label: "物流追踪", path: "/scm/logistics" },
    ],
    module_card: {
      code: "scm",
      name: "供应链管理",
      icon: "Truck",
      path: "/scm",
      status: "running",
      order: 4,
    },
  });

  navigationRegistry.register("crm", {
    top_nav: [
      { code: "crm", label: "客户关系", icon: "Users", path: "/crm", order: 5 },
    ],
    module_tabs: [
      { code: "crm-customers", label: "客户管理", path: "/crm/customers" },
      { code: "crm-opportunities", label: "商机管理", path: "/crm/opportunities" },
      { code: "crm-activities", label: "活动管理", path: "/crm/activities" },
      { code: "crm-reports", label: "销售报表", path: "/crm/reports" },
    ],
    module_card: {
      code: "crm",
      name: "客户关系管理",
      icon: "Users",
      path: "/crm",
      status: "beta",
      order: 5,
    },
  });

  navigationRegistry.register("ai", {
    top_nav: [
      { code: "ai", label: "AI助手", icon: "Bot", path: "/ai", order: 6 },
    ],
    module_tabs: [
      { code: "ai-chat", label: "智能对话", path: "/ai/chat" },
      { code: "ai-analytics", label: "数据分析", path: "/ai/analytics" },
      { code: "ai-workflows", label: "自动化工作流", path: "/ai/workflows" },
    ],
    module_card: {
      code: "ai",
      name: "AI智能助手",
      icon: "Bot",
      path: "/ai",
      status: "running",
      order: 6,
    },
  });

  navigationRegistry.register("gis", {
    top_nav: [
      { code: "gis", label: "地理信息", icon: "Map", path: "/gis", order: 7 },
    ],
    module_tabs: [
      { code: "gis-map", label: "地图视图", path: "/gis/map" },
      { code: "gis-layers", label: "图层管理", path: "/gis/layers" },
      { code: "gis-analysis", label: "空间分析", path: "/gis/analysis" },
    ],
    module_card: {
      code: "gis",
      name: "地理信息系统",
      icon: "Map",
      path: "/gis",
      status: "plan",
      order: 7,
    },
  });

  navigationRegistry.register("hrm", {
    top_nav: [
      { code: "hrm", label: "人力资源", icon: "Users", path: "/hrm", order: 8 },
    ],
    module_tabs: [
      { code: "hrm-employees", label: "员工管理", path: "/hrm/employees" },
      { code: "hrm-recruitment", label: "招聘管理", path: "/hrm/recruitment" },
      { code: "hrm-training", label: "培训管理", path: "/hrm/training" },
      { code: "hrm-performance", label: "绩效考核", path: "/hrm/performance" },
    ],
    module_card: {
      code: "hrm",
      name: "人力资源管理",
      icon: "Users",
      path: "/hrm",
      status: "running",
      order: 8,
    },
  });
};

registerDefaultModules();