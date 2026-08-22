/**
 * 从 apps/web/src/modules/registry/index.ts 抽取的模块配置类型定义。
 *
 * 仅包含 ModuleConfig 与 ModuleRoute 两个接口定义；
 * 实际的 ModuleRegistry 实现、CORE_MODULES 等运行时逻辑仍保留在 web 端的 registry/index.ts 中。
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
