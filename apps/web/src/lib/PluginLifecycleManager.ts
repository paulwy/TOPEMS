import { navigationRegistry, type PluginNavConfig } from './NavigationRegistry';

// 浏览器兼容的简单事件发射器（避免依赖 Node.js events 模块）
type PluginEventListener = (...args: unknown[]) => void;
class SimpleEventEmitter {
  private listeners: Map<string, PluginEventListener[]> = new Map();
  private maxListeners = 100;

  setMaxListeners(n: number): void {
    this.maxListeners = n;
  }

  on(event: string, listener: PluginEventListener): void {
    const arr = this.listeners.get(event) || [];
    if (arr.length >= this.maxListeners) {
      console.warn(
        `MaxListenersExceededWarning: Possible memory leak detected. ${arr.length + 1} ${event} listeners added.`
      );
    }
    arr.push(listener);
    this.listeners.set(event, arr);
  }

  off(event: string, listener: PluginEventListener): void {
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

export interface PluginInfo {
  code: string;
  name: string;
  version: string;
  status: 'loaded' | 'unloaded' | 'loading' | 'error';
  navConfig?: PluginNavConfig;
  error?: string;
}

class PluginLifecycleManager {
  private static instance: PluginLifecycleManager;
  private plugins: Map<string, PluginInfo> = new Map();
  private pendingPlugins: Map<string, Promise<void>> = new Map();
  public emitter: SimpleEventEmitter;

  private constructor() {
    this.emitter = new SimpleEventEmitter();
    this.emitter.setMaxListeners(100);
  }

  static getInstance(): PluginLifecycleManager {
    if (!PluginLifecycleManager.instance) {
      PluginLifecycleManager.instance = new PluginLifecycleManager();
    }
    return PluginLifecycleManager.instance;
  }

  async loadPlugin(pluginCode: string, config: PluginInfo): Promise<void> {
    if (this.pendingPlugins.has(pluginCode)) {
      return this.pendingPlugins.get(pluginCode)!;
    }

    const loadingPromise = this.doLoadPlugin(pluginCode, config);
    this.pendingPlugins.set(pluginCode, loadingPromise);

    try {
      await loadingPromise;
    } finally {
      this.pendingPlugins.delete(pluginCode);
    }
  }

  private async doLoadPlugin(pluginCode: string, config: PluginInfo): Promise<void> {
    try {
      this.updatePluginStatus(pluginCode, 'loading');

      if (config.navConfig) {
        navigationRegistry.register(pluginCode, config.navConfig);
      }

      const pluginInfo: PluginInfo = {
        ...config,
        status: 'loaded',
      };
      this.plugins.set(pluginCode, pluginInfo);

      this.emitter.emit('pluginLoaded', pluginCode, pluginInfo);
    } catch (error: unknown) {
      const pluginInfo: PluginInfo = {
        ...config,
        status: 'error',
        error: error instanceof Error ? error.message : '加载失败',
      };
      this.plugins.set(pluginCode, pluginInfo);

      this.emitter.emit('pluginError', pluginCode, pluginInfo);
      throw error;
    }
  }

  async unloadPlugin(pluginCode: string): Promise<void> {
    const plugin = this.plugins.get(pluginCode);
    if (!plugin || plugin.status === 'unloaded') {
      return;
    }

    try {
      navigationRegistry.unregister(pluginCode);

      this.plugins.set(pluginCode, {
        ...plugin,
        status: 'unloaded',
      });

      this.emitter.emit('pluginUnloaded', pluginCode);
    } catch (error: unknown) {
      this.plugins.set(pluginCode, {
        ...plugin,
        status: 'error',
        error: error instanceof Error ? error.message : '卸载失败',
      });

      this.emitter.emit('pluginError', pluginCode, this.plugins.get(pluginCode)!);
      throw error;
    }
  }

  getPlugin(pluginCode: string): PluginInfo | undefined {
    return this.plugins.get(pluginCode);
  }

  getAllPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values());
  }

  getLoadedPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values()).filter((p) => p.status === 'loaded');
  }

  updatePluginStatus(pluginCode: string, status: PluginInfo['status']): void {
    const plugin = this.plugins.get(pluginCode);
    if (plugin) {
      plugin.status = status;
      this.plugins.set(pluginCode, plugin);
    }
  }

  updatePluginNavConfig(pluginCode: string, navConfig: PluginNavConfig): void {
    const plugin = this.plugins.get(pluginCode);
    if (plugin) {
      plugin.navConfig = navConfig;
      this.plugins.set(pluginCode, plugin);
      navigationRegistry.register(pluginCode, navConfig);
      this.emitter.emit('pluginNavUpdated', pluginCode, navConfig);
    }
  }

  async loadAllPlugins(plugins: PluginInfo[]): Promise<void> {
    const promises = plugins.map((plugin) => this.loadPlugin(plugin.code, plugin));
    await Promise.allSettled(promises).then((results) => {
      const errors = results.filter((r) => r.status === 'rejected');
      if (errors.length > 0) {
        console.warn(`Failed to load ${errors.length} plugins`);
      }
    });
  }

  async unloadAllPlugins(): Promise<void> {
    const promises = Array.from(this.plugins.keys()).map((code) => this.unloadPlugin(code));
    await Promise.allSettled(promises);
  }
}

export const pluginLifecycleManager = PluginLifecycleManager.getInstance();
