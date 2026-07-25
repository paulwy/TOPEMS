/**
 * V45.0 Track F: 微前端终极形态 — 运行时模块统一导出
 *
 * 导出运行时动态加载、跨框架兼容、统一设计系统、生命周期管理：
 * - dynamic-loader: 运行时模块动态加载（import + 并发控制 + 重试 + 缓存）
 * - cross-framework: 跨框架适配器（React/Vue/Angular/Svelte + 统一生命周期）
 * - design-system: 统一设计系统（设计令牌 + 主题 + CSS 变量同步）
 * - module-lifecycle: 统一生命周期管理（状态机 + 钩子 + 事件时间线）
 * - RuntimeDashboard: 运行时控制台可视化面板
 *
 * @example
 * import {
 *   dynamicLoader,
 *   crossFrameworkBridge,
 *   designSystemManager,
 *   lifecycleManager,
 *   RuntimeDashboard,
 * } from '@/microfrontend/runtime';
 */

// ==================== 运行时动态加载 ====================
export {
  DynamicModuleLoader,
  dynamicLoader,
  ModuleLoadStatus,
  type DynamicLoaderConfig,
  type RuntimeModule,
  type ModuleLoadCallback,
} from './dynamic-loader';

// ==================== 跨框架兼容 ====================
export {
  CrossFrameworkBridge,
  crossFrameworkBridge,
  ReactAdapter,
  VueAdapter,
  AngularAdapter,
  SvelteAdapter,
  FrameworkType,
  type FrameworkAdapter,
  type UnifiedProps,
  type UnifiedEvents,
  type UnifiedLifecycle,
  type LifecycleHook,
  type MountedComponent,
} from './cross-framework';

// ==================== 统一设计系统 ====================
export {
  DesignSystemManager,
  designSystemManager,
  TokenType,
  PRESET_TOKENS,
  LIGHT_THEME,
  DARK_THEME,
  DESIGN_SYSTEM_EVENTS,
  type DesignToken,
  type ThemeConfig,
  type ThemeMode,
  type ThemeChangeCallback,
  type ThemeChangeEventDetail,
} from './design-system';

// ==================== 统一生命周期管理 ====================
export {
  ModuleLifecycle,
  lifecycleManager,
  LifecycleState,
  LifecycleEventType,
  type LifecycleEvent,
  type LifecycleHooks,
  type ModuleLifecycleRecord,
  type LifecycleEventCallback,
} from './module-lifecycle';

// ==================== 运行时控制台 ====================
export { default as RuntimeDashboard } from './RuntimeDashboard';
