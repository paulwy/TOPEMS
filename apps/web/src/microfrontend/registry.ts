/**
 * 微前端模块注册表
 *
 * 运行时动态注册和卸载微前端模块。
 * 用于支持插件市场按需安装模块。
 */

import type { RemoteModuleConfig } from './config';

type ModuleStatus = 'registered' | 'loaded' | 'error' | 'unloaded';

interface RegisteredModule {
  config: RemoteModuleConfig;
  status: ModuleStatus;
  loadedAt?: Date;
  error?: string;
}

class MicroFrontendRegistry {
  private modules: Map<string, RegisteredModule> = new Map();
  private listeners: Set<(modules: RegisteredModule[]) => void> = new Set();

  /** 注册模块 */
  register(config: RemoteModuleConfig): void {
    this.modules.set(config.name, { config, status: 'registered' });
    this.notifyListeners();
  }

  /** 批量注册 */
  registerAll(configs: RemoteModuleConfig[]): void {
    configs.forEach((c) => this.register(c));
  }

  /** 卸载模块 */
  unregister(name: string): void {
    this.modules.delete(name);
    this.notifyListeners();
  }

  /** 标记模块已加载 */
  markLoaded(name: string): void {
    const module = this.modules.get(name);
    if (module) {
      module.status = 'loaded';
      module.loadedAt = new Date();
      this.notifyListeners();
    }
  }

  /** 标记模块加载失败 */
  markError(name: string, error: string): void {
    const module = this.modules.get(name);
    if (module) {
      module.status = 'error';
      module.error = error;
      this.notifyListeners();
    }
  }

  /** 获取所有模块 */
  getAll(): RegisteredModule[] {
    return Array.from(this.modules.values());
  }

  /** 获取已加载模块 */
  getLoaded(): RegisteredModule[] {
    return this.getAll().filter((m) => m.status === 'loaded');
  }

  /** 订阅模块状态变更 */
  subscribe(listener: (modules: RegisteredModule[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const modules = this.getAll();
    this.listeners.forEach((l) => l(modules));
  }
}

const microFrontendRegistry = new MicroFrontendRegistry();
export type { RegisteredModule, ModuleStatus };
