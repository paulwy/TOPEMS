import type { TenantInstalledPlugin, Plugin } from '../../api/plugin/types';
import { pluginApi, pluginApiAggregated } from '../../api/plugin';
import { apiLogger } from '../../utils/logger';
import { navigationRegistryV2 } from '../navigation/NavigationRegistryV2';
import type { ModuleNavConfig, NavItemConfig, ModuleSuite } from '../navigation/types';

type PluginStatus = 'installing' | 'installed' | 'running' | 'disabled' | 'error' | 'uninstalled';

export interface PluginState {
  code: string;
  name: string;
  version: string;
  description?: string;
  category?: string;
  pluginType: 'core' | 'business';
  status: PluginStatus;
  isActive: boolean;
  licenseType?: string;
  icon?: string;
  path?: string;
  lastHeartbeat?: string;
  runtimeUrl?: string;
}

interface PluginManagerEventMap {
  pluginInstalled: [pluginCode: string];
  pluginUninstalled: [pluginCode: string];
  pluginActivated: [pluginCode: string];
  pluginDeactivated: [pluginCode: string];
  pluginStatusChanged: [pluginCode: string, status: PluginStatus];
  pluginsLoaded: [plugins: PluginState[]];
  pluginsUpdated: [plugins: PluginState[]];
  [key: string]: unknown[];
}

class TypedEventEmitter<Events extends Record<string, unknown[]>> {
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  on<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void): void {
    const key = event as string;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener as (...args: unknown[]) => void);
  }

  off<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void): void {
    const key = event as string;
    this.listeners.get(key)?.delete(listener as (...args: unknown[]) => void);
  }

  emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
    const key = event as string;
    this.listeners.get(key)?.forEach((listener) => {
      try {
        listener(...args);
      } catch (error) {
        apiLogger.error(`Error emitting event ${key}:`, error);
      }
    });
  }

  removeAllListeners<K extends keyof Events>(event?: K): void {
    if (event) {
      this.listeners.delete(event as string);
    } else {
      this.listeners.clear();
    }
  }
}

const CORE_MODULES = [
  'iam',
  'workflow',
  'notification',
  'doc',
  'report',
  'monitor',
  'integration',
  'ai',
  'mobile',
  'hrm',
  'finance',
  'erp',
];

const PLUGIN_ICON_MAP: Record<string, string> = {
  hrm: 'Users',
  crm: 'Users',
  pm: 'Target',
  finance: 'Building2',
  scm: 'Truck',
  qms: 'Shield',
  bi: 'BarChart3',
  mes: 'Factory',
  wms: 'Warehouse',
  pdm: 'Layers',
  srm: 'Handshake',
  lims: 'FlaskConical',
  ehs: 'Leaf',
  rs: 'FlaskRound',
  gis: 'Map',
  portal: 'LayoutDashboard',
  asset: 'Package',
  oa: 'FileText',
  im: 'MessageSquare',
  admin: 'Settings',
  lowcode: 'Code',
  plugin: 'Puzzle',
};

const CACHE_KEY = 'topems_plugins_cache';
const CACHE_TTL = 5 * 60 * 1000;

interface PluginCache {
  plugins: PluginState[];
  timestamp: number;
}

export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, PluginState> = new Map();
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  public readonly emitter: TypedEventEmitter<PluginManagerEventMap>;

  private constructor() {
    this.emitter = new TypedEventEmitter();
    this.initCoreModules();
    this.loadFromCache();
  }

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  private initCoreModules(): void {
    CORE_MODULES.forEach((code) => {
      const pluginType = 'core';
      const name = this.getPluginName(code);
      this.plugins.set(code, {
        code,
        name,
        version: '1.0.0',
        description: `${name} - 核心服务`,
        pluginType,
        status: 'running',
        isActive: true,
        icon: PLUGIN_ICON_MAP[code] || 'Settings',
        path: `/${code}`,
      });
    });
  }

  private getPluginName(code: string): string {
    const names: Record<string, string> = {
      iam: '身份认证',
      workflow: '工作流',
      notification: '通知中心',
      doc: '文档管理',
      report: '报表中心',
      monitor: '系统监控',
      integration: '数据集成',
      ai: 'AI助手',
      mobile: '移动端',
      hrm: '人力资源',
      finance: '财务管理',
      crm: '客户管理',
      pm: '项目管理',
      scm: '供应链',
      qms: '质量管理',
      bi: '商业智能',
      mes: '生产执行',
      wms: '仓储管理',
      pdm: '产品数据',
      srm: '供应商',
      lims: '实验室',
      ehs: '环境安全',
      rs: '研发管理',
      gis: '地理信息',
      portal: '企业门户',
      erp: 'ERP',
      asset: '资产管理',
      oa: '办公自动化',
      im: '即时通讯',
      admin: '系统管理',
      lowcode: '低代码',
      plugin: '插件市场',
    };
    return names[code] || code;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.loadPluginsFromServer();
    await this.initializationPromise;
    this.isInitialized = true;
  }

  private async loadPluginsFromServer(): Promise<void> {
    try {
      apiLogger.info('[PluginManager] Loading plugins from server...');
      const response = await pluginApi.listInstalled();

      if (response && response.data) {
        const installedPlugins = response.data as TenantInstalledPlugin[];
        this.processInstalledPlugins(installedPlugins);
        this.emitter.emit('pluginsLoaded', this.getAllPlugins());
        await this.syncNavigationRegistry();
      }
    } catch (error) {
      apiLogger.error('[PluginManager] Failed to load plugins from server:', error);
    }
  }

  private processInstalledPlugins(plugins: TenantInstalledPlugin[]): void {
    plugins.forEach((plugin) => {
      const existing = this.plugins.get(plugin.plugin_code);
      const status = plugin.isactive ? 'running' : 'disabled';

      this.plugins.set(plugin.plugin_code, {
        code: plugin.plugin_code,
        name: plugin.plugin_name,
        version: plugin.installed_version || plugin.plugin_version || '1.0.0',
        description: plugin.plugin_description,
        category: plugin.plugin_category,
        pluginType: CORE_MODULES.includes(plugin.plugin_code) ? 'core' : 'business',
        status,
        isActive: plugin.isactive,
        licenseType: plugin.license_type,
        icon: PLUGIN_ICON_MAP[plugin.plugin_code] || 'Settings',
        path: `/${plugin.plugin_code}`,
        lastHeartbeat: plugin.last_heartbeat,
        runtimeUrl: plugin.runtime_url,
      });
    });
    this.saveToCache();
  }

  async refreshPlugins(): Promise<void> {
    try {
      apiLogger.info('[PluginManager] Refreshing plugins...');
      const response = await pluginApi.listInstalled();

      if (response && response.data) {
        const installedPlugins = response.data as TenantInstalledPlugin[];
        const previousPlugins = new Map(this.plugins);

        this.processInstalledPlugins(installedPlugins);

        const updatedPlugins = this.getAllPlugins();
        this.emitter.emit('pluginsUpdated', updatedPlugins);

        this.detectChanges(previousPlugins);
        await this.syncNavigationRegistry();
      }
    } catch (error) {
      apiLogger.error('[PluginManager] Failed to refresh plugins:', error);
    }
  }

  private detectChanges(previousPlugins: Map<string, PluginState>): void {
    this.plugins.forEach((current, code) => {
      const previous = previousPlugins.get(code);
      if (!previous) {
        this.emitter.emit('pluginInstalled', code);
      } else if (previous.status !== current.status) {
        this.emitter.emit('pluginStatusChanged', code, current.status);
        if (current.status === 'running' && previous.status !== 'running') {
          this.emitter.emit('pluginActivated', code);
        } else if (current.status === 'disabled' && previous.status !== 'disabled') {
          this.emitter.emit('pluginDeactivated', code);
        }
      }
    });

    previousPlugins.forEach((_, code) => {
      if (!this.plugins.has(code)) {
        this.emitter.emit('pluginUninstalled', code);
      }
    });
  }

  async installPlugin(pluginCode: string): Promise<PluginState | null> {
    try {
      apiLogger.info(`[PluginManager] Installing plugin: ${pluginCode}`);

      this.plugins.set(pluginCode, {
        code: pluginCode,
        name: this.getPluginName(pluginCode),
        version: '1.0.0',
        pluginType: CORE_MODULES.includes(pluginCode) ? 'core' : 'business',
        status: 'installing',
        isActive: false,
        icon: PLUGIN_ICON_MAP[pluginCode] || 'Settings',
        path: `/${pluginCode}`,
      });

      const response = await pluginApi.install(pluginCode);

      if (response && response.data) {
        const tenantPlugin = response.data as TenantInstalledPlugin;
        this.plugins.set(pluginCode, {
          code: pluginCode,
          name: tenantPlugin.plugin_name || this.getPluginName(pluginCode),
          version: tenantPlugin.installed_version || '1.0.0',
          description: tenantPlugin.plugin_description,
          pluginType: CORE_MODULES.includes(pluginCode) ? 'core' : 'business',
          status: 'running',
          isActive: true,
          licenseType: tenantPlugin.license_type,
          icon: PLUGIN_ICON_MAP[pluginCode] || 'Settings',
          path: `/${pluginCode}`,
        });

        this.emitter.emit('pluginInstalled', pluginCode);
        this.emitter.emit('pluginActivated', pluginCode);
        this.emitter.emit('pluginStatusChanged', pluginCode, 'running');

        await this.syncNavigationRegistry();
        return this.plugins.get(pluginCode) || null;
      }

      return null;
    } catch (error) {
      apiLogger.error(`[PluginManager] Failed to install plugin ${pluginCode}:`, error);
      this.plugins.set(pluginCode, {
        ...(this.plugins.get(pluginCode) || {
          code: pluginCode,
          name: this.getPluginName(pluginCode),
          version: '1.0.0',
          pluginType: CORE_MODULES.includes(pluginCode) ? 'core' : 'business',
          status: 'error',
          isActive: false,
          icon: PLUGIN_ICON_MAP[pluginCode] || 'Settings',
          path: `/${pluginCode}`,
        }),
        status: 'error',
      });
      this.emitter.emit('pluginStatusChanged', pluginCode, 'error');
      return null;
    }
  }

  async uninstallPlugin(
    pluginCode: string,
    tier: 'disable' | 'uninstall' | 'delete' = 'disable'
  ): Promise<boolean> {
    try {
      apiLogger.info(`[PluginManager] Uninstalling plugin: ${pluginCode} (tier: ${tier})`);

      const plugin = this.plugins.get(pluginCode);
      if (!plugin) {
        return false;
      }

      if (plugin.pluginType === 'core') {
        if (tier === 'delete') {
          apiLogger.warn(`[PluginManager] Cannot delete core plugin: ${pluginCode}`);
          return false;
        }
        this.plugins.set(pluginCode, { ...plugin, status: 'disabled', isActive: false });
        this.emitter.emit('pluginDeactivated', pluginCode);
        this.emitter.emit('pluginStatusChanged', pluginCode, 'disabled');
      } else {
        await pluginApi.uninstall(pluginCode);
        this.plugins.delete(pluginCode);
        this.emitter.emit('pluginUninstalled', pluginCode);
      }

      await this.syncNavigationRegistry();
      return true;
    } catch (error) {
      apiLogger.error(`[PluginManager] Failed to uninstall plugin ${pluginCode}:`, error);
      return false;
    }
  }

  async enablePlugin(pluginCode: string): Promise<boolean> {
    try {
      apiLogger.info(`[PluginManager] Enabling plugin: ${pluginCode}`);

      const plugin = this.plugins.get(pluginCode);
      if (!plugin) {
        return false;
      }

      await pluginApi.enable(pluginCode);

      this.plugins.set(pluginCode, { ...plugin, status: 'running', isActive: true });
      this.emitter.emit('pluginActivated', pluginCode);
      this.emitter.emit('pluginStatusChanged', pluginCode, 'running');

      await this.syncNavigationRegistry();
      return true;
    } catch (error) {
      apiLogger.error(`[PluginManager] Failed to enable plugin ${pluginCode}:`, error);
      return false;
    }
  }

  async disablePlugin(pluginCode: string): Promise<boolean> {
    try {
      apiLogger.info(`[PluginManager] Disabling plugin: ${pluginCode}`);

      const plugin = this.plugins.get(pluginCode);
      if (!plugin) {
        return false;
      }

      await pluginApi.disable(pluginCode);

      this.plugins.set(pluginCode, { ...plugin, status: 'disabled', isActive: false });
      this.emitter.emit('pluginDeactivated', pluginCode);
      this.emitter.emit('pluginStatusChanged', pluginCode, 'disabled');

      await this.syncNavigationRegistry();
      return true;
    } catch (error) {
      apiLogger.error(`[PluginManager] Failed to disable plugin ${pluginCode}:`, error);
      return false;
    }
  }

  getPlugin(pluginCode: string): PluginState | undefined {
    return this.plugins.get(pluginCode);
  }

  getAllPlugins(): PluginState[] {
    return Array.from(this.plugins.values()).sort((a, b) => {
      if (a.pluginType !== b.pluginType) {
        return a.pluginType === 'core' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  getActivePlugins(): PluginState[] {
    return this.getAllPlugins().filter((p) => p.isActive && p.status === 'running');
  }

  getCorePlugins(): PluginState[] {
    return this.getAllPlugins().filter((p) => p.pluginType === 'core');
  }

  getBusinessPlugins(): PluginState[] {
    return this.getAllPlugins().filter((p) => p.pluginType === 'business');
  }

  isPluginActive(pluginCode: string): boolean {
    return this.plugins.get(pluginCode)?.isActive ?? false;
  }

  isPluginInstalled(pluginCode: string): boolean {
    return this.plugins.has(pluginCode);
  }

  private async syncNavigationRegistry(): Promise<void> {
    const activePlugins = this.getActivePlugins();
    const registeredModules = navigationRegistryV2.getAllModuleCodes();

    activePlugins.forEach((plugin) => {
      if (!registeredModules.includes(plugin.code)) {
        this.registerPluginInNavigation(plugin);
      }
    });

    registeredModules.forEach((moduleCode) => {
      if (!this.isPluginActive(moduleCode)) {
        navigationRegistryV2.unregisterModule(moduleCode);
      }
    });

    apiLogger.info('[PluginManager] Navigation registry synchronized');
  }

  private registerPluginInNavigation(plugin: PluginState): void {
    const navItems = this.generateNavItems(plugin.code);

    const config: ModuleNavConfig = {
      code: plugin.code,
      name: plugin.name,
      icon: plugin.icon || 'Settings',
      path: plugin.path || `/${plugin.code}`,
      source: plugin.pluginType === 'core' ? 'core' : 'plugin',
      suite: this.getSuiteForPlugin(plugin.code) as ModuleSuite | undefined,
      status: 'online',
      order: this.getModuleOrder(plugin.code),
      description: plugin.description,
      navItems,
    };

    navigationRegistryV2.registerModule(config);
    apiLogger.info(`[PluginManager] Registered module: ${plugin.code}`);
  }

  private generateNavItems(pluginCode: string): NavItemConfig[] {
    const navItemMap: Record<string, NavItemConfig[]> = {
      hrm: [
        {
          code: 'hrm-employees',
          label: '员工管理',
          path: '/hrm/employees',
          icon: 'Users',
          order: 10,
          group: 'business',
        },
        {
          code: 'hrm-departments',
          label: '部门管理',
          path: '/hrm/departments',
          icon: 'Building2',
          order: 20,
          group: 'business',
        },
        {
          code: 'hrm-attendance',
          label: '考勤管理',
          path: '/hrm/attendance',
          icon: 'Calendar',
          order: 30,
          group: 'attendance',
        },
        {
          code: 'hrm-recruitment',
          label: '招聘管理',
          path: '/hrm/recruitment',
          icon: 'Users',
          order: 40,
          group: 'business',
        },
        {
          code: 'hrm-settings',
          label: '人事设置',
          path: '/hrm/settings',
          icon: 'Settings',
          order: 50,
          group: 'settings',
        },
      ],
      crm: [
        {
          code: 'crm-customers',
          label: '客户管理',
          path: '/crm/customers',
          icon: 'Users',
          order: 10,
          group: 'business',
        },
        {
          code: 'crm-leads',
          label: '线索管理',
          path: '/crm/leads',
          icon: 'Target',
          order: 20,
          group: 'business',
        },
        {
          code: 'crm-opportunities',
          label: '商机管理',
          path: '/crm/opportunities',
          icon: 'TrendingUp',
          order: 30,
          group: 'business',
        },
        {
          code: 'crm-contacts',
          label: '联系人',
          path: '/crm/contacts',
          icon: 'User',
          order: 40,
          group: 'business',
        },
      ],
      pm: [
        {
          code: 'pm-projects',
          label: '项目列表',
          path: '/pm/projects',
          icon: 'FolderKanban',
          order: 10,
          group: 'business',
        },
        {
          code: 'pm-tasks',
          label: '任务管理',
          path: '/pm/tasks',
          icon: 'CheckSquare',
          order: 20,
          group: 'tasks',
        },
        {
          code: 'pm-timelines',
          label: '项目进度',
          path: '/pm/timelines',
          icon: 'Calendar',
          order: 30,
          group: 'business',
        },
      ],
      mes: [
        {
          code: 'mes-orders',
          label: '生产订单',
          path: '/mes/orders',
          icon: 'ClipboardList',
          order: 10,
          group: 'business',
        },
        {
          code: 'mes-workstations',
          label: '工位管理',
          path: '/mes/workstations',
          icon: 'Factory',
          order: 20,
          group: 'business',
        },
        {
          code: 'mes-equipment',
          label: '设备管理',
          path: '/mes/equipment',
          icon: 'Wrench',
          order: 30,
          group: 'business',
        },
      ],
      wms: [
        {
          code: 'wms-inventory',
          label: '库存管理',
          path: '/wms/inventory',
          icon: 'Warehouse',
          order: 10,
          group: 'business',
        },
        {
          code: 'wms-inbound',
          label: '入库管理',
          path: '/wms/inbound',
          icon: 'ArrowDownCircle',
          order: 20,
          group: 'business',
        },
        {
          code: 'wms-outbound',
          label: '出库管理',
          path: '/wms/outbound',
          icon: 'ArrowUpCircle',
          order: 30,
          group: 'business',
        },
      ],
      qms: [
        {
          code: 'qms-inspections',
          label: '质量检验',
          path: '/qms/inspections',
          icon: 'CheckCircle',
          order: 10,
          group: 'business',
        },
        {
          code: 'qms-spc',
          label: '统计过程控制',
          path: '/qms/spc',
          icon: 'Activity',
          order: 20,
          group: 'analytics',
        },
        {
          code: 'qms-fmea',
          label: 'FMEA分析',
          path: '/qms/fmea',
          icon: 'AlertTriangle',
          order: 30,
          group: 'business',
        },
      ],
      erp: [
        {
          code: 'erp-finance',
          label: '财务管理',
          path: '/erp/finance',
          icon: 'DollarSign',
          order: 10,
          group: 'business',
        },
        {
          code: 'erp-assets',
          label: '资产管理',
          path: '/erp/assets',
          icon: 'Package',
          order: 20,
          group: 'business',
        },
        {
          code: 'erp-sales',
          label: '销售管理',
          path: '/erp/sales',
          icon: 'ShoppingCart',
          order: 30,
          group: 'business',
        },
      ],
      scm: [
        {
          code: 'scm-purchase',
          label: '采购管理',
          path: '/scm/purchase',
          icon: 'ShoppingBag',
          order: 10,
          group: 'business',
        },
        {
          code: 'scm-suppliers',
          label: '供应商',
          path: '/scm/suppliers',
          icon: 'Handshake',
          order: 20,
          group: 'business',
        },
        {
          code: 'scm-mrp',
          label: '物料需求',
          path: '/scm/mrp',
          icon: 'Layers',
          order: 30,
          group: 'business',
        },
      ],
    };

    return (
      navItemMap[pluginCode] || [
        {
          code: `${pluginCode}-overview`,
          label: '概览',
          path: `/${pluginCode}`,
          icon: PLUGIN_ICON_MAP[pluginCode] || 'LayoutDashboard',
          order: 10,
          group: 'overview',
        },
      ]
    );
  }

  private getSuiteForPlugin(pluginCode: string): string | undefined {
    const suiteMap: Record<string, string> = {
      hrm: 'hr',
      finance: 'finance',
      mes: 'manufacturing',
      pdm: 'manufacturing',
      wms: 'manufacturing',
      qms: 'quality',
      lims: 'quality',
      ehs: 'quality',
      scm: 'supply',
      srm: 'supply',
      crm: 'crm',
      bi: 'crm',
      pm: 'project',
      rs: 'project',
      gis: 'gis',
    };
    return suiteMap[pluginCode];
  }

  private getModuleOrder(pluginCode: string): number {
    const orderMap: Record<string, number> = {
      iam: 1,
      workflow: 2,
      hrm: 10,
      crm: 11,
      pm: 12,
      erp: 13,
      finance: 14,
      mes: 20,
      wms: 21,
      pdm: 22,
      qms: 30,
      lims: 31,
      ehs: 32,
      scm: 40,
      srm: 41,
      rs: 50,
      bi: 60,
      gis: 70,
      mobile: 80,
      portal: 81,
      report: 90,
      monitor: 91,
      integration: 92,
      notification: 93,
      doc: 94,
      ai: 95,
      admin: 99,
      plugin: 100,
    };
    return orderMap[pluginCode] || 50;
  }

  async getAvailablePlugins(): Promise<Plugin[] | null> {
    try {
      const response = await pluginApiAggregated.listMarketplace();
      return response?.data || null;
    } catch (error) {
      apiLogger.error('[PluginManager] Failed to get available plugins:', error);
      return null;
    }
  }

  async getPluginDetails(
    pluginCode: string
  ): Promise<{ plugin: Plugin; permissions: any[] } | null> {
    try {
      const response = await pluginApi.getDetails(pluginCode);
      return response?.data || null;
    } catch (error) {
      apiLogger.error(`[PluginManager] Failed to get details for plugin ${pluginCode}:`, error);
      return null;
    }
  }

  async upgradePlugin(pluginCode: string, version?: string): Promise<boolean> {
    try {
      await pluginApi.upgrade(pluginCode, version);
      await this.refreshPlugins();
      return true;
    } catch (error) {
      apiLogger.error(`[PluginManager] Failed to upgrade plugin ${pluginCode}:`, error);
      return false;
    }
  }

  dispose(): void {
    this.emitter.removeAllListeners();
    this.plugins.clear();
    this.isInitialized = false;
    this.initializationPromise = null;
    this.clearCache();
    PluginManager.instance = null as unknown as PluginManager;
  }

  private loadFromCache(): void {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const cache: PluginCache = JSON.parse(cached);
        if (Date.now() - cache.timestamp < CACHE_TTL) {
          cache.plugins.forEach((plugin) => {
            this.plugins.set(plugin.code, plugin);
          });
          apiLogger.info('[PluginManager] Loaded plugins from cache');
        } else {
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (error) {
      apiLogger.error('[PluginManager] Failed to load plugins from cache:', error);
    }
  }

  private saveToCache(): void {
    try {
      const cache: PluginCache = {
        plugins: this.getAllPlugins(),
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      apiLogger.info('[PluginManager] Saved plugins to cache');
    } catch (error) {
      apiLogger.error('[PluginManager] Failed to save plugins to cache:', error);
    }
  }

  private clearCache(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      apiLogger.error('[PluginManager] Failed to clear plugins cache:', error);
    }
  }

  getCacheAge(): number {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const cache: PluginCache = JSON.parse(cached);
        return Date.now() - cache.timestamp;
      }
    } catch (error) {
      apiLogger.error('[PluginManager] Failed to get cache age:', error);
    }
    return -1;
  }

  useCachedPlugins(): boolean {
    return this.getCacheAge() >= 0 && this.getCacheAge() < CACHE_TTL;
  }
}

export const pluginManager = PluginManager.getInstance();
