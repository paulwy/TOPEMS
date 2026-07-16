/**
 * TOPEMS Module Registry
 *
 * Manages all available modules/plugins in the system.
 * Supports both static (bundled) and dynamic (remote) modules.
 */

// ============================================================================
// Core Modules (Remote modules loaded via Module Federation)
// ============================================================================

import { getCoreModules } from './core-modules';

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
  /** Component to load (local modules) */
  component: () => Promise<any>;
  /** Component name (remote modules) */
  componentName?: string;
  /** Component path (remote modules, e.g., './pages/UserManagement') */
  componentPath?: string;
  /** Icon for the route */
  icon?: string;
  /** Required permissions */
  permissions?: string[];
  /** Child routes */
  children?: ModuleRoute[];
}

const isStaticMode = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEPLOYMENT_MODE) === 'static';

export let CORE_MODULES: ModuleConfig[] = [];

export function initializeCoreModules() {
  CORE_MODULES = isStaticMode ? [] : getCoreModules();
}

// ============================================================================
// Business Modules (sold as packages)
// ============================================================================
// 注意：以下业务模块为 Module Federation 架构预留，当前版本尚未实现
// 待实现后启用，对应组件路径为 '@/modules/xxx/pages/xxx'
// 当前页面通过传统路由配置在 'src/pages/' 目录下

export const BUSINESS_MODULES: ModuleConfig[] = [
  // 待实现：biz-manufacturing (MES 生产执行系统)
  // 待实现：biz-quality (QMS + LIMS + EHS 质量管控)
  // 待实现：biz-analytics (BI 大屏、报表中心)
];

// ============================================================================
// Plugin Modules (dynamically loaded from remote)
// ============================================================================
// 注意：以下插件模块为 Module Federation 架构预留，当前版本尚未实现
// 待实现后启用，对应组件将从远程服务器动态加载
// 当前插件市场页面通过传统路由配置在 'src/pages/plugin/' 目录下

export const PLUGIN_MODULES: ModuleConfig[] = [
  // 待实现：plugin-ai (AI 知识库)
  // 待实现：plugin-erp (ERP 系统)
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
    return Array.from(this.enabledModules)
      .map((id) => this.modules.get(id)!)
      .filter(Boolean);
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
   * Get a module by its route path
   */
  getModuleByRoutePath(routePath: string): ModuleConfig | undefined {
    for (const module of this.modules.values()) {
      if (module.routes.some((route) => route.path === routePath)) {
        return module;
      }
    }
    return undefined;
  }

  /**
   * Get all remote (Module Federation) modules
   */
  getRemoteModules(): ModuleConfig[] {
    return this.getAllModules().filter((m) => !!m.remoteEntry);
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
      await __webpack_init_sharing__('default');
      const container = (window as Record<string, WebpackContainer | undefined>)[module.id];
      if (!container) {
        throw new Error(`Remote container "${module.id}" not found on window`);
      }
      await container.init(__webpack_share_scopes__.default);
      const factory = await container.get(module.entry);
      return factory();
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
