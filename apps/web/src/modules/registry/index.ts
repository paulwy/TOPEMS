/**
 * TOPEMS Module Registry
 * 
 * Manages all available modules/plugins in the system.
 * Supports both static (bundled) and dynamic (remote) modules.
 */

export interface ModuleConfig {
  /** Unique module identifier */
  id: string;
  /** Display name */
  name: string;
  /** Module description */
  description?: string;
  /** Module category */
  category: 'core' | 'business' | 'plugin';
  /** Version */
  version: string;
  /** Entry point for the module */
  entry: string;
  /** Remote URL for dynamic loading (optional) */
  remoteEntry?: string;
  /** Routes provided by this module */
  routes: ModuleRoute[];
  /** Permissions required */
  permissions?: string[];
  /** Dependencies on other modules */
  dependencies?: string[];
  /** Whether this module is enabled by default */
  isDefault?: boolean;
  /** Icon for the module */
  icon?: string;
}

export interface ModuleRoute {
  /** Route path */
  path: string;
  /** Route name */
  name: string;
  /** Component to load */
  component: () => Promise<any>;
  /** Icon for the route */
  icon?: string;
  /** Required permissions */
  permissions?: string[];
  /** Child routes */
  children?: ModuleRoute[];
}

// ============================================================================
// Core Modules (always included, bundled with main app)
// ============================================================================

export const CORE_MODULES: ModuleConfig[] = [
  {
    id: 'core-iam',
    name: '身份认证',
    description: '用户、角色、权限管理',
    category: 'core',
    version: '1.0.0',
    entry: '@/modules/iam',
    routes: [
      { path: '/iam/users', name: '用户管理', component: () => import('@/modules/iam/pages/Users') },
      { path: '/iam/roles', name: '角色管理', component: () => import('@/modules/iam/pages/Roles') },
      { path: '/iam/permissions', name: '权限管理', component: () => import('@/modules/iam/pages/Permissions') },
    ],
    isDefault: true,
    icon: 'User',
  },
  {
    id: 'core-doc',
    name: '文档管理',
    description: '云文档、知识库管理',
    category: 'core',
    version: '1.0.0',
    entry: '@/modules/doc',
    routes: [
      { path: '/doc/documents', name: '我的文档', component: () => import('@/modules/doc/pages/Documents') },
      { path: '/doc/folders', name: '文件夹', component: () => import('@/modules/doc/pages/Folders') },
      { path: '/doc/templates', name: '模板库', component: () => import('@/modules/doc/pages/Templates') },
    ],
    isDefault: true,
    icon: 'FileText',
  },
  {
    id: 'core-flow',
    name: '流程审批',
    description: '工作流、表单审批',
    category: 'core',
    version: '1.0.0',
    entry: '@/modules/flow',
    routes: [
      { path: '/flow/workflows', name: '流程设计', component: () => import('@/modules/flow/pages/Workflows') },
      { path: '/flow/instances', name: '我的申请', component: () => import('@/modules/flow/pages/Instances') },
      { path: '/flow/approvals', name: '待我审批', component: () => import('@/modules/flow/pages/Approvals') },
    ],
    isDefault: true,
    icon: 'GitBranch',
  },
  {
    id: 'core-file',
    name: '文件中心',
    description: '文件上传、下载、管理',
    category: 'core',
    version: '1.0.0',
    entry: '@/modules/file',
    routes: [
      { path: '/file/manage', name: '文件管理', component: () => import('@/modules/file/pages/Manage') },
      { path: '/file/shared', name: '共享文件', component: () => import('@/modules/file/pages/Shared') },
    ],
    isDefault: true,
    icon: 'Folder',
  },
  {
    id: 'core-comm',
    name: '协同通讯',
    description: '即时通讯、邮件、通知',
    category: 'core',
    version: '1.0.0',
    entry: '@/modules/communication',
    routes: [
      { path: '/comm/im', name: '即时消息', component: () => import('@/modules/communication/pages/IM') },
      { path: '/comm/mail', name: '企业邮箱', component: () => import('@/modules/communication/pages/Mail') },
      { path: '/comm/notify', name: '通知中心', component: () => import('@/modules/communication/pages/Notifications') },
    ],
    isDefault: true,
    icon: 'MessageSquare',
  },
];

// ============================================================================
// Business Modules (sold as packages)
// ============================================================================

export const BUSINESS_MODULES: ModuleConfig[] = [
  {
    id: 'biz-manufacturing',
    name: '制造执行',
    description: 'MES 生产执行系统',
    category: 'business',
    version: '1.0.0',
    entry: '@/modules/manufacturing',
    routes: [
      { path: '/mfg/orders', name: '生产工单', component: () => import('@/modules/manufacturing/pages/Orders') },
      { path: '/mfg/process', name: '工序管理', component: () => import('@/modules/manufacturing/pages/Process') },
      { path: '/mfg/equipment', name: '设备管理', component: () => import('@/modules/manufacturing/pages/Equipment') },
    ],
    icon: 'Factory',
  },
  {
    id: 'biz-quality',
    name: '质量管控',
    description: 'QMS + LIMS + EHS',
    category: 'business',
    version: '1.0.0',
    entry: '@/modules/quality',
    routes: [
      { path: '/qa/inspection', name: '质量检验', component: () => import('@/modules/quality/pages/Inspection') },
      { path: '/qa/lab', name: '实验室', component: () => import('@/modules/quality/pages/Lab') },
      { path: '/qa/ehs', name: '环境健康', component: () => import('@/modules/quality/pages/EHS') },
    ],
    icon: 'Shield',
  },
  {
    id: 'biz-analytics',
    name: '数据分析',
    description: 'BI 大屏、报表中心',
    category: 'business',
    version: '1.0.0',
    entry: '@/modules/analytics',
    routes: [
      { path: '/analytics/dashboard', name: '数据大屏', component: () => import('@/modules/analytics/pages/Dashboard') },
      { path: '/analytics/reports', name: '报表中心', component: () => import('@/modules/analytics/pages/Reports') },
    ],
    icon: 'BarChart',
  },
];

// ============================================================================
// Plugin Modules (dynamically loaded from remote)
// ============================================================================

export const PLUGIN_MODULES: ModuleConfig[] = [
  {
    id: 'plugin-ai',
    name: 'AI 知识库',
    description: 'RAG 智能问答',
    category: 'plugin',
    version: '1.0.0',
    entry: '@/modules/ai',
    routes: [
      { path: '/ai/knowledge', name: '知识库', component: () => import('@/modules/ai/pages/Knowledge') },
      { path: '/ai/chat', name: 'AI 助手', component: () => import('@/modules/ai/pages/Chat') },
    ],
    icon: 'Bot',
  },
  {
    id: 'plugin-erp',
    name: 'ERP 系统',
    description: '企业资源计划',
    category: 'plugin',
    version: '1.0.0',
    entry: '@/modules/erp',
    routes: [
      { path: '/erp/purchase', name: '采购管理', component: () => import('@/modules/erp/pages/Purchase') },
      { path: '/erp/sale', name: '销售管理', component: () => import('@/modules/erp/pages/Sale') },
    ],
    icon: 'DollarSign',
  },
];

// ============================================================================
// Module Registry
// ============================================================================

export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private modules: Map<string, ModuleConfig> = new Map();
  private enabledModules: Set<string> = new Set();

  private constructor() {
    this.registerModules(CORE_MODULES);
    this.registerModules(BUSINESS_MODULES);
    this.registerModules(PLUGIN_MODULES);
  }

  static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  private registerModules(modules: ModuleConfig[]): void {
    modules.forEach((module) => {
      this.modules.set(module.id, module);
      if (module.isDefault) {
        this.enabledModules.add(module.id);
      }
    });
  }

  getModule(id: string): ModuleConfig | undefined {
    return this.modules.get(id);
  }

  getAllModules(): ModuleConfig[] {
    return Array.from(this.modules.values());
  }

  getModulesByCategory(category: 'core' | 'business' | 'plugin'): ModuleConfig[] {
    return this.getAllModules().filter((m) => m.category === category);
  }

  getEnabledModules(): ModuleConfig[] {
    return Array.from(this.enabledModules).map((id) => this.modules.get(id)!).filter(Boolean);
  }

  enableModule(id: string): void {
    if (this.modules.has(id)) {
      this.enabledModules.add(id);
    }
  }

  disableModule(id: string): void {
    this.enabledModules.delete(id);
  }

  isModuleEnabled(id: string): boolean {
    return this.enabledModules.has(id);
  }

  getAllRoutes(): ModuleRoute[] {
    const routes: ModuleRoute[] = [];
    this.getEnabledModules().forEach((module) => {
      routes.push(...module.routes);
    });
    return routes;
  }

  /**
   * Load a remote module dynamically
   */
  async loadRemoteModule(moduleId: string): Promise<any> {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Module ${moduleId} not found`);
    }

    if (module.category === 'core' || module.category === 'business') {
      // Static module - use lazy import
      return import(/* @vite-ignore */ module.entry);
    }

    if (module.remoteEntry && module.entry) {
      // Dynamic remote module
      // @ts-ignore
      await __webpack_init_sharing__('default');
      // @ts-ignore
      const container = await window[module.id];
      // @ts-ignore
      await container.init(__webpack_share_scopes__.default);
      // @ts-ignore
      const factory = await container.get(module.entry);
      return factory().then((module: any) => module);
    }

    throw new Error(`Cannot load module ${moduleId}: no entry point`);
  }
}

export const moduleRegistry = ModuleRegistry.getInstance();

// ============================================================================
// React Integration
// ============================================================================

export function useModules() {
  return {
    registry: moduleRegistry,
    allModules: moduleRegistry.getAllModules(),
    enabledModules: moduleRegistry.getEnabledModules(),
    coreModules: moduleRegistry.getModulesByCategory('core'),
    businessModules: moduleRegistry.getModulesByCategory('business'),
    pluginModules: moduleRegistry.getModulesByCategory('plugin'),
  };
}

export function useModuleRoutes() {
  const { enabledModules } = useModules();
  
  const routes: ModuleRoute[] = [];
  enabledModules.forEach((module) => {
    routes.push(...module.routes);
  });
  
  return routes;
}
