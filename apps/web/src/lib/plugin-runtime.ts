/**
 * Plugin Runtime Manager
 * 插件运行时管理器 - 负责插件的健康检查、动态加载和生命周期管理
 */

import type { PluginRuntimeInfo, PluginRuntimeConfig } from '@/api/plugin';
import { PLUGIN_REGISTRY, fetchPluginInfo, checkPluginHealth } from '@/api/plugin';

export interface PluginHealthStatus {
  code: string;
  name: string;
  healthy: boolean;
  status?: string;
  latency?: number;
  lastChecked: number;
}

export interface LoadedPluginModule {
  code: string;
  name: string;
  module: any;
  manifest: PluginRuntimeInfo;
  loadedAt: number;
}

class PluginRuntimeManager {
  private healthStatus: Map<string, PluginHealthStatus> = new Map();
  private loadedModules: Map<string, LoadedPluginModule> = new Map();
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private healthCheckIntervalMs: number = 30000;
  private onHealthChange?: (status: PluginHealthStatus[]) => void;

  /**
   * 设置健康检查回调
   */
  setHealthChangeCallback(callback: (status: PluginHealthStatus[]) => void): void {
    this.onHealthChange = callback;
  }

  /**
   * 启动定时健康检查
   */
  startHealthMonitoring(intervalMs: number = 30000): void {
    this.stopHealthMonitoring();
    this.healthCheckIntervalMs = intervalMs;
    this.healthCheckInterval = setInterval(() => {
      this.checkAllHealth();
    }, intervalMs);
    // 立即执行一次检查
    this.checkAllHealth();
  }

  /**
   * 停止健康检查
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * 检查单个插件健康状态
   */
  async checkPluginHealth(code: string): Promise<PluginHealthStatus> {
    const config = PLUGIN_REGISTRY[code];
    if (!config) {
      return {
        code,
        name: code,
        healthy: false,
        lastChecked: Date.now(),
      };
    }

    try {
      const result = await checkPluginHealth(code);
      const status: PluginHealthStatus = {
        code,
        name: config.name,
        healthy: result.healthy,
        status: result.status,
        latency: result.latency,
        lastChecked: Date.now(),
      };
      this.healthStatus.set(code, status);
      return status;
    } catch {
      const status: PluginHealthStatus = {
        code,
        name: config.name,
        healthy: false,
        lastChecked: Date.now(),
      };
      this.healthStatus.set(code, status);
      return status;
    }
  }

  /**
   * 检查所有插件健康状态
   */
  async checkAllHealth(): Promise<PluginHealthStatus[]> {
    const codes = Object.keys(PLUGIN_REGISTRY);
    const results = await Promise.allSettled(codes.map((code) => this.checkPluginHealth(code)));

    const statusList: PluginHealthStatus[] = results
      .filter((r): r is PromiseFulfilledResult<PluginHealthStatus> => r.status === 'fulfilled')
      .map((r) => r.value);

    if (this.onHealthChange) {
      this.onHealthChange(statusList);
    }

    return statusList;
  }

  /**
   * 获取所有健康状态
   */
  getAllHealthStatus(): PluginHealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * 获取单个插件健康状态
   */
  getHealthStatus(code: string): PluginHealthStatus | undefined {
    return this.healthStatus.get(code);
  }

  /**
   * 动态加载插件模块
   */
  async loadPlugin(code: string, config?: PluginRuntimeConfig): Promise<LoadedPluginModule | null> {
    if (this.loadedModules.has(code)) {
      return this.loadedModules.get(code) || null;
    }

    try {
      const pluginInfo = await fetchPluginInfo(code);
      if (!pluginInfo) {
        return null;
      }

      const moduleUrl = config?.base_path
        ? `${config.base_path}/remoteEntry.js`
        : `${PLUGIN_REGISTRY[code]?.url}/remoteEntry.js`;

      if (!moduleUrl) {
        return null;
      }

      const module = await this.importRemoteModule(moduleUrl, pluginInfo);

      const loadedModule: LoadedPluginModule = {
        code,
        name: pluginInfo.name,
        module,
        manifest: pluginInfo,
        loadedAt: Date.now(),
      };

      this.loadedModules.set(code, loadedModule);
      return loadedModule;
    } catch (error) {
      console.error(`Failed to load plugin ${code}:`, error);
      return null;
    }
  }

  /**
   * 导入远程模块
   */
  private async importRemoteModule(url: string, manifest: PluginRuntimeInfo): Promise<any> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch remote entry: ${response.statusText}`);
      }

      const scriptContent = await response.text();

      const blob = new Blob([scriptContent], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);

      const module = await import(/* @vite-ignore */ blobUrl);

      URL.revokeObjectURL(blobUrl);

      return module;
    } catch (error) {
      console.error('Error importing remote module:', error);
      throw error;
    }
  }

  /**
   * 卸载插件模块
   */
  unloadPlugin(code: string): boolean {
    const module = this.loadedModules.get(code);
    if (!module) {
      return false;
    }

    this.loadedModules.delete(code);
    return true;
  }

  /**
   * 获取已加载的模块
   */
  getLoadedPlugin(code: string): LoadedPluginModule | undefined {
    return this.loadedModules.get(code);
  }

  /**
   * 获取所有已加载模块
   */
  getAllLoadedPlugins(): LoadedPluginModule[] {
    return Array.from(this.loadedModules.values());
  }

  /**
   * 检查插件是否已加载
   */
  isPluginLoaded(code: string): boolean {
    return this.loadedModules.has(code);
  }

  /**
   * 获取健康状态摘要
   */
  getHealthSummary(): { total: number; healthy: number; unhealthy: number } {
    const statusList = this.getAllHealthStatus();
    const healthy = statusList.filter((s) => s.healthy).length;
    return {
      total: statusList.length,
      healthy,
      unhealthy: statusList.length - healthy,
    };
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.stopHealthMonitoring();
    this.healthStatus.clear();
    this.loadedModules.clear();
    this.onHealthChange = undefined;
  }
}

const pluginRuntimeManager = new PluginRuntimeManager();

export { pluginRuntimeManager };
export default PluginRuntimeManager;
