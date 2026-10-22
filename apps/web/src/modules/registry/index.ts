/**
 * TOPEMS Module Registry
 *
 * Manages all available modules/plugins in the system.
 * Supports both static (bundled) and dynamic (remote) modules.
 */

// ============================================================================
// Core Modules (Remote modules loaded via Module Federation)
// ============================================================================

import type { ModuleConfig, ModuleRoute } from '@topems/app-shell';
import { CORE_MODULES_CONFIG } from './core-modules';

export type { ModuleConfig, ModuleRoute };

/**
 * 核心模块路由注册：
 * - MF 部署模式：注册 core-modules 全量路由（本地 + topems_core remote 字符串导入路由）。
 * - static/本地打包模式（前端回归模块化单体）：仅注册本地组件可用的路由
 *   （/core/users、/core/roles）。其余路由（permissions/org/workflow/documents/reports）
 *   依赖 topems_core remote（端口 3001）未部署，若注册会因动态 import 失败导致页面崩溃。
 *   判断依据：component 源码字符串含 `topems_core/pages` 即远程导入。
 */
const isMFMode = () => {
  const mode = (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_DEPLOYMENT_MODE : undefined) as string | undefined;
  if (mode) return mode !== 'static';
  return false;
};

export const CORE_MODULES: ModuleConfig[] = isMFMode()
  ? CORE_MODULES_CONFIG
  : CORE_MODULES_CONFIG.map((module) => ({
      ...module,
      routes: module.routes.filter((route) => {
        const src = route.component?.toString() || '';
        return !src.includes('topems_core/pages');
      }),
    })).filter((module) => module.routes.length > 0);

// ============================================================================
// Business Modules (sold as packages)
// ============================================================================
// 注意：以下业务模块为 Module Federation 架构预留，当前版本尚未实现
// 待实现后启用，对应组件路径为 '@/modules/xxx/pages/xxx'
// 当前页面通过传统路由配置在 'src/pages/' 目录下

const BUSINESS_MODULES: ModuleConfig[] = [
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

const PLUGIN_MODULES: ModuleConfig[] = [
  // 待实现：plugin-ai (AI 知识库)
  // 待实现：plugin-erp (ERP 系统)
];

// ============================================================================
// Module Registry
// ============================================================================

class ModuleRegistry {
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
  async loadRemoteModule(moduleId: string): Promise<unknown> {
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
      await WebpackInitSharing('default');
      const container = (window as Record<string, WebpackContainer | undefined>)[module.id];
      if (!container) {
        throw new Error(`Remote container "${module.id}" not found on window`);
      }
      await container.init(WebpackShareScopes.default);
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
