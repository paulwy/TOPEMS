/**
 * Store 聚合导出
 *
 * 本文件提供两种导出方式：
 * 1. 独立领域 store（推荐使用）：useAuthStore, useThemeStore, useUIStore 等
 * 2. 向后兼容的聚合 store：useAppStore（已废弃，基于独立 store 组合）
 *
 * 推荐使用独立领域 store：
 * - useAuthStore：用户认证、权限管理
 * - useThemeStore：主题切换
 * - useUIStore：UI 状态（侧边栏等）
 * - useNotificationStore：通知管理
 * - useNotificationSettingsStore：通知设置
 * - useShortcutsStore：快捷方式管理
 * - useWorkflowStore：工作流状态
 *
 * 迁移指南（useAppStore → 独立 store）：
 *   // 旧写法（已废弃）
 *   const user = useAppStore((s) => s.user);
 *   const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
 *   const addNotification = useAppStore((s) => s.addNotification);
 *
 *   // 新写法（推荐）
 *   const user = useAuthStore((s) => s.user);
 *   const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
 *   const addNotification = useNotificationStore((s) => s.addNotification);
 *
 * 字段到独立 store 的映射：
 *   user/setUser/clearUser/isAuthenticated  → useAuthStore
 *   theme/setTheme/toggleTheme              → useThemeStore
 *   sidebarOpen/sidebarCollapsed/toggle*    → useUIStore
 *   notifications/addNotification/clear*    → useNotificationStore
 *   notificationSettings/setNotification*   → useNotificationSettingsStore
 *   shortcuts/addShortcut/removeShortcut    → useShortcutsStore
 *   selectedWorkflowId/setSelectedWorkflowId → useWorkflowStore
 */

// 导出类型
/**
 * 向后兼容的聚合 store
 *
 * @deprecated 推荐使用独立的领域 store（见文件顶部迁移指南）。
 * 此 hook 将在下一个主版本中移除。新代码禁止使用 useAppStore。
 */
import { useMemo } from 'react';
import { useAuthStore } from './authStore';
import { useThemeStore } from './themeStore';
import { useUIStore } from './uiStore';
import { useNotificationStore } from './notificationStore';
import { useNotificationSettingsStore } from './notificationSettingsStore';
import { useShortcutsStore } from './shortcutsStore';
import { useWorkflowStore } from './workflowStore';

export type { User } from './authStore';
export type { Theme } from './themeStore';
export type { Notification } from './notificationStore';
export type { NotificationSettings } from './notificationSettingsStore';
export type { Shortcut } from './shortcutsStore';

// 导出独立领域 store（推荐使用）
export { useAuthStore, useAuth } from './authStore';
export { useThemeStore } from './themeStore';
export { useUIStore } from './uiStore';
export { useNotificationStore } from './notificationStore';
export { useNotificationSettingsStore } from './notificationSettingsStore';
export { useShortcutsStore } from './shortcutsStore';
export { useWorkflowStore } from './workflowStore';
export { usePluginStore } from './pluginStore';
export { useBIStore } from './biStore';
export { classifyError, getUserFriendlyError } from '../utils/errorHandler';

// 兼容的类型定义
export interface AppUser {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  isActive: boolean;
  isSuperuser?: boolean;
  avatar?: string;
  department?: string;
  position?: string;
  phone?: string;
}

interface AppState {
  // 用户相关状态（来自 useAuthStore）
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  clearUser: () => void;
  isAuthenticated: () => boolean;

  // 主题相关状态（来自 useThemeStore）
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;

  // 全局通知状态（来自 useNotificationStore）
  notifications: Array<{
    id: string;
    title?: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
    timestamp: number;
    duration?: number;
  }>;
  addNotification: (notification: {
    title?: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
    duration?: number;
  }) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // 通知设置状态（来自 useNotificationSettingsStore）
  notificationSettings: {
    email_enabled: boolean;
    system_enabled: boolean;
    workflow_enabled: boolean;
    document_enabled: boolean;
    security_enabled: boolean;
  };
  setNotificationSettings: (settings: {
    email_enabled: boolean;
    system_enabled: boolean;
    workflow_enabled: boolean;
    document_enabled: boolean;
    security_enabled: boolean;
  }) => void;
  updateNotificationSetting: (
    key: keyof {
      email_enabled: boolean;
      system_enabled: boolean;
      workflow_enabled: boolean;
      document_enabled: boolean;
      security_enabled: boolean;
    },
    value: boolean
  ) => void;

  // 快捷方式状态（来自 useShortcutsStore）
  shortcuts: Array<{
    id: string;
    title: string;
    icon: string;
    path: string;
  }>;
  setShortcuts: (
    shortcuts: Array<{
      id: string;
      title: string;
      icon: string;
      path: string;
    }>
  ) => void;
  addShortcut: (shortcut: { id: string; title: string; icon: string; path: string }) => void;
  removeShortcut: (id: string) => void;

  // 工作流状态（来自 useWorkflowStore）
  selectedWorkflowId: string | null;
  setSelectedWorkflowId: (id: string | null) => void;

  // UI 状态（来自 useUIStore）
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

/**
 * 向后兼容的聚合 store hook
 * 通过组合独立 store 实现，保持 API 兼容性
 *
 * 注意：此 hook 不支持 getState()，如果需要直接访问 store，
 * 请使用独立的领域 store（如 useNotificationStore.getState()）
 */
export function useAppStore<T = AppState>(selector?: (state: AppState) => T): T {
  // 从各个独立 store 获取状态和方法
  const authUser = useAuthStore((state) => state.user);
  const authSetUser = useAuthStore((state) => state.setUser);
  const authClearAuth = useAuthStore((state) => state.clearAuth);
  const authIsAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const notifications = useNotificationStore((state) => state.notifications);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);

  const notificationSettings = useNotificationSettingsStore((state) => state.notificationSettings);
  const setNotificationSettings = useNotificationSettingsStore(
    (state) => state.setNotificationSettings
  );
  const updateNotificationSetting = useNotificationSettingsStore(
    (state) => state.updateNotificationSetting
  );

  const shortcuts = useShortcutsStore((state) => state.shortcuts);
  const setShortcuts = useShortcutsStore((state) => state.setShortcuts);
  const addShortcut = useShortcutsStore((state) => state.addShortcut);
  const removeShortcut = useShortcutsStore((state) => state.removeShortcut);

  const selectedWorkflowId = useWorkflowStore((state) => state.selectedWorkflowId);
  const setSelectedWorkflowId = useWorkflowStore((state) => state.setSelectedWorkflowId);

  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const toggleSidebarCollapsed = useUIStore((state) => state.toggleSidebarCollapsed);
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);

  // 使用 useMemo 缓存组合状态对象，避免每次渲染都创建新对象
  const appState = useMemo<AppState>(
    () => ({
      user: authUser as AppUser | null,
      setUser: authSetUser as (user: AppUser | null) => void,
      clearUser: authClearAuth,
      isAuthenticated: authIsAuthenticated,

      theme,
      setTheme,
      toggleTheme,

      notifications,
      addNotification,
      removeNotification,
      clearNotifications,

      notificationSettings,
      setNotificationSettings,
      updateNotificationSetting,

      shortcuts,
      setShortcuts,
      addShortcut,
      removeShortcut,

      selectedWorkflowId,
      setSelectedWorkflowId,

      sidebarOpen,
      sidebarCollapsed,
      toggleSidebar,
      setSidebarOpen,
      toggleSidebarCollapsed,
      setSidebarCollapsed,
    }),
    [
      authUser,
      authSetUser,
      authClearAuth,
      authIsAuthenticated,
      theme,
      setTheme,
      toggleTheme,
      notifications,
      addNotification,
      removeNotification,
      clearNotifications,
      notificationSettings,
      setNotificationSettings,
      updateNotificationSetting,
      shortcuts,
      setShortcuts,
      addShortcut,
      removeShortcut,
      selectedWorkflowId,
      setSelectedWorkflowId,
      sidebarOpen,
      sidebarCollapsed,
      toggleSidebar,
      setSidebarOpen,
      toggleSidebarCollapsed,
      setSidebarCollapsed,
    ]
  );

  // 使用 useMemo 缓存 selector 结果，避免不必要的重新计算
  return useMemo(() => (selector ? selector(appState) : appState), [selector, appState]) as T;
}
