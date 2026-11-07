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
 * 历史上存在 MF 部署模式（topems_* 远程路由）与 static/本地打包模式的切换；
 * MF 远程路由已于冗余清理批次移除（core-modules.ts 仅保留本地 import 路由），
 * 两模式等价，直接注册全量本地路由。
 */
export const CORE_MODULES: ModuleConfig[] = CORE_MODULES_CONFIG;

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
   * Get all remote (Module Federation) modules.
   * 冗余清理后 CORE_MODULES 已无 remoteEntry 字段，恒返回空数组；
   * 保留方法以兼容 DynamicRouter.preloadRemoteModules 调用（循环自然为 0 次）。
   */
  getRemoteModules(): ModuleConfig[] {
    return this.getAllModules().filter((m) => !!m.remoteEntry);
  }

  /**
   * Load a module dynamically（MF 远程加载分支已随 MF 面移除）
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

    throw new Error(`Cannot load module ${moduleId}: no entry point`);
  }
}

export const moduleRegistry = ModuleRegistry.getInstance();

// ============================================================================
// React Integration
// ============================================================================
