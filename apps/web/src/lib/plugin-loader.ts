/**
 * TOPEMS Plugin Loader
 *
 * 前端插件动态加载器，支持 SystemJS 模块加载
 */

export interface PluginInfo {
  code: string;
  name: string;
  version: string;
  description?: string;
  main: string;
  dependencies?: Record<string, string>;
}

export interface PluginManifest {
  plugin: PluginInfo;
  routes?: RouteConfig[];
  menus?: MenuConfig[];
  permissions?: string[];
}

export interface RouteConfig {
  path: string;
  component: string;
  name?: string;
  meta?: Record<string, unknown>;
}

export interface MenuConfig {
  key: string;
  path?: string;
  icon?: string;
  label: string;
  children?: MenuConfig[];
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  module: any;
  routes: RouteConfig[];
  menus: MenuConfig[];
}

export interface PluginLoadOptions {
  baseUrl: string;
  onLoading?: (plugin: string) => void;
  onLoaded?: (plugin: LoadedPlugin) => void;
  onError?: (plugin: string, error: Error) => void;
}

class PluginLoader {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private options: PluginLoadOptions;
  private system: any;

  constructor(options: PluginLoadOptions) {
    this.options = options;
    this.system = (window as any).System;

    // 初始化 SystemJS
    this.initSystem();
  }

  private initSystem(): void {
    // 配置 SystemJS
    this.system.config({
      baseURL: this.options.baseUrl,
      defaultJSExtensions: true,
      map: {
        '@': this.options.baseUrl,
      },
      packages: {
        '': {
          defaultExtension: 'js',
        },
      },
    });
  }

  /**
   * 加载单个插件
   */
  async loadPlugin(pluginCode: string, manifestUrl: string): Promise<LoadedPlugin> {
    // 如果已加载，直接返回
    if (this.plugins.has(pluginCode)) {
      return this.plugins.get(pluginCode)!;
    }

    this.options.onLoading?.(pluginCode);

    try {
      // 加载插件清单
      const response = await fetch(manifestUrl);
      if (!response.ok) {
        throw new Error(`Failed to load plugin manifest: ${response.statusText}`);
      }

      const manifest: PluginManifest = await response.json();

      // 加载主模块
      const moduleUrl = `${this.options.baseUrl}/${manifest.plugin.code}/${manifest.plugin.main}`;
      const module = await this.system.import(moduleUrl);

      // 注册路由和菜单
      const loadedPlugin: LoadedPlugin = {
        manifest,
        module,
        routes: manifest.routes || [],
        menus: manifest.menus || [],
      };

      // 保存插件
      this.plugins.set(pluginCode, loadedPlugin);

      this.options.onLoaded?.(loadedPlugin);

      return loadedPlugin;
    } catch (error: unknown) {
      this.options.onError?.(pluginCode, error as Error);
      throw error;
    }
  }

  /**
   * 批量加载插件
   */
  async loadPlugins(
    plugins: Array<{ code: string; manifestUrl: string }>
  ): Promise<LoadedPlugin[]> {
    const results: LoadedPlugin[] = [];

    for (const plugin of plugins) {
      try {
        const loaded = await this.loadPlugin(plugin.code, plugin.manifestUrl);
        results.push(loaded);
      } catch (error: unknown) {
        console.error(`Failed to load plugin ${plugin.code}:`, error);
      }
    }

    return results;
  }

  /**
   * 卸载插件
   */
  unloadPlugin(pluginCode: string): boolean {
    const plugin = this.plugins.get(pluginCode);
    if (!plugin) {
      return false;
    }

    // 从 SystemJS 中删除模块
    const moduleUrl = `${this.options.baseUrl}/${plugin.manifest.plugin.code}/${plugin.manifest.plugin.main}`;
    delete this.system.registry.modules[moduleUrl];

    // 删除插件
    this.plugins.delete(pluginCode);

    return true;
  }

  /**
   * 获取已加载插件
   */
  getPlugin(pluginCode: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginCode);
  }

  /**
   * 获取所有已加载插件
   */
  getAllPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取所有路由
   */
  getAllRoutes(): RouteConfig[] {
    return this.getAllPlugins().flatMap((p) => p.routes);
  }

  /**
   * 获取所有菜单
   */
  getAllMenus(): MenuConfig[] {
    return this.getAllPlugins().flatMap((p) => p.menus);
  }

  /**
   * 检查插件是否已加载
   */
  isLoaded(pluginCode: string): boolean {
    return this.plugins.has(pluginCode);
  }
}

// 创建全局实例
let globalLoader: PluginLoader | null = null;

export function createPluginLoader(options: PluginLoadOptions): PluginLoader {
  globalLoader = new PluginLoader(options);
  return globalLoader;
}

export function getPluginLoader(): PluginLoader | null {
  return globalLoader;
}

// 路由管理器
export class RouteManager {
  private routes: Map<string, RouteConfig> = new Map();

  addRoute(plugin: string, route: RouteConfig): void {
    this.routes.set(`${plugin}:${route.path}`, route);
  }

  addRoutes(plugin: string, routes: RouteConfig[]): void {
    routes.forEach((route) => this.addRoute(plugin, route));
  }

  removeRoutes(plugin: string): void {
    for (const key of this.routes.keys()) {
      if (key.startsWith(`${plugin}:`)) {
        this.routes.delete(key);
      }
    }
  }

  getRoute(path: string): RouteConfig | undefined {
    return this.routes.get(path);
  }

  getAllRoutes(): RouteConfig[] {
    return Array.from(this.routes.values());
  }
}

// 菜单管理器
export class MenuManager {
  private menus: Map<string, MenuConfig> = new Map();

  addMenu(plugin: string, menu: MenuConfig): void {
    this.menus.set(`${plugin}:${menu.key}`, menu);
  }

  addMenus(plugin: string, menus: MenuConfig[]): void {
    menus.forEach((menu) => this.addMenu(plugin, menu));
  }

  removeMenus(plugin: string): void {
    for (const key of this.menus.keys()) {
      if (key.startsWith(`${plugin}:`)) {
        this.menus.delete(key);
      }
    }
  }

  getMenu(key: string): MenuConfig | undefined {
    return this.menus.get(key);
  }

  getAllMenus(): MenuConfig[] {
    return Array.from(this.menus.values());
  }

  getMenuTree(): MenuConfig[] {
    const roots: MenuConfig[] = [];
    const map = new Map<string, MenuConfig>();

    // 先把所有菜单加入 map
    for (const menu of this.menus.values()) {
      map.set(menu.key, { ...menu, children: [] });
    }

    // 构建树结构
    for (const menu of map.values()) {
      if (menu.children && menu.children.length > 0) {
        // 有子菜单
      } else {
        roots.push(menu);
      }
    }

    return roots;
  }
}

// 全局路由和菜单管理器
export const routeManager = new RouteManager();
export const menuManager = new MenuManager();

// 插件清单验证
export function validateManifest(manifest: unknown): manifest is PluginManifest {
  if (!manifest || typeof manifest !== 'object') {
    return false;
  }

  const m = manifest as Record<string, unknown>;

  if (!m.plugin || typeof m.plugin !== 'object') {
    return false;
  }

  const plugin = m.plugin as Record<string, unknown>;

  if (typeof plugin.code !== 'string' || !plugin.code) {
    return false;
  }
  if (typeof plugin.name !== 'string' || !plugin.name) {
    return false;
  }
  if (typeof plugin.version !== 'string' || !plugin.version) {
    return false;
  }
  if (typeof plugin.main !== 'string' || !plugin.main) {
    return false;
  }

  return true;
}

// 体积检查
export function checkBundleSize(
  bytes: number,
  warnThreshold = 500 * 1024,
  errorThreshold = 1024 * 1024
): 'ok' | 'warning' | 'error' {
  if (bytes > errorThreshold) {
    return 'error';
  }
  if (bytes > warnThreshold) {
    return 'warning';
  }
  return 'ok';
}

// 异步 Script 加载器（备用）
export async function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}

export default PluginLoader;
