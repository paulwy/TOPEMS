/**
 * Store 聚合导出
 *
 * 使用独立领域 store：
 * - useAuthStore：用户认证、权限管理
 * - useThemeStore：主题切换
 * - useUIStore：UI 状态（侧边栏等）
 * - useNotificationStore：通知管理
 * - useNotificationSettingsStore：通知设置
 * - useShortcutsStore：快捷方式管理
 * - useWorkflowStore：工作流状态
 */

import { useAuthStore } from './authStore';
import { useThemeStore } from './themeStore';
import { useUIStore } from './uiStore';
import { useNotificationStore } from './notificationStore';
import { useNotificationSettingsStore } from './notificationSettingsStore';
import { useShortcutsStore } from './shortcutsStore';
import { useWorkflowStore } from './workflowStore';
import { useModuleLoadingStore } from './moduleLoadingStore';

export type { User } from './authStore';
export type { Theme } from './themeStore';
export type { Notification } from './notificationStore';
export type { NotificationSettings } from './notificationSettingsStore';
export type { Shortcut } from './shortcutsStore';
export type { ModuleStatus, ModuleLoadingState } from './moduleLoadingStore';

export { useAuthStore, useAuth } from './authStore';

export { useThemeStore, useTheme } from './themeStore';

export {
  useUIStore,
  useSidebarOpen,
  useSidebarCollapsed,
  useToggleSidebar,
  useSetSidebarOpen,
  useToggleSidebarCollapsed,
  useSetSidebarCollapsed,
} from './uiStore';

export { useNotificationStore } from './notificationStore';
export { useNotificationSettingsStore } from './notificationSettingsStore';
export { useShortcutsStore } from './shortcutsStore';
export { useWorkflowStore } from './workflowStore';

export {
  usePluginStore,
  useInstalledPlugins,
  useMarketplacePlugins,
  usePluginHealthStatus,
  usePluginLoading,
  usePluginError,
  useSelectedPluginCode,
  useSelectedPlugins,
  useSearchQuery,
  useActiveCategory,
  useIsPluginInstalled,
  useIsPluginActive,
  usePluginHealth,
  useInstalledPlugin,
  useMarketplacePlugin,
  useFilteredPlugins,
  useFilteredInstalledPlugins,
  useHealthSummary,
  useInstalledCount,
  useActiveCount,
} from './pluginStore';

export {
  useBIStore,
  useBISummary,
  useBIDevelopment,
  useBIQuality,
  useBIProduction,
  useBILaboratory,
  useBILoading,
  useBIError,
} from './biStore';

export {
  useModuleLoadingStore,
  useModuleState,
  useTotalProgress,
  useIsModuleLoaded,
  useIsModuleLoading,
  useHasModuleError,
} from './moduleLoadingStore';

export { classifyError, getUserFriendlyError } from '../utils/errorHandler';
