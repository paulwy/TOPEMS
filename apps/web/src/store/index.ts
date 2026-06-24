import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 用户信息类型定义
export interface User {
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
}

// 通知类型
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: number;
}

// 通知设置类型
export interface NotificationSettings {
  email_enabled: boolean;
  system_enabled: boolean;
  workflow_enabled: boolean;
  document_enabled: boolean;
  security_enabled: boolean;
}

// 快捷方式类型
export interface Shortcut {
  id: string;
  title: string;
  icon: string;
  path: string;
}

// 主题类型
export type Theme = 'light' | 'dark' | 'system';

interface AppState {
  // 用户相关状态
  user: User | null;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  isAuthenticated: () => boolean;

  // 主题相关状态
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // 全局通知状态
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // 通知设置状态
  notificationSettings: NotificationSettings;
  setNotificationSettings: (settings: NotificationSettings) => void;
  updateNotificationSetting: (key: keyof NotificationSettings, value: boolean) => void;

  // 快捷方式状态
  shortcuts: Shortcut[];
  setShortcuts: (shortcuts: Shortcut[]) => void;
  addShortcut: (shortcut: Shortcut) => void;
  removeShortcut: (id: string) => void;

  // 工作流状态
  selectedWorkflowId: string | null;
  setSelectedWorkflowId: (id: string | null) => void;

  // UI 状态
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const defaultNotificationSettings: NotificationSettings = {
  email_enabled: true,
  system_enabled: true,
  workflow_enabled: true,
  document_enabled: true,
  security_enabled: true,
};

const defaultShortcuts: Shortcut[] = [
  { id: '1', title: '仪表盘', icon: 'Activity', path: '/dashboard' },
  { id: '2', title: '文档中心', icon: 'FileText', path: '/documents' },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 用户相关状态
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      isAuthenticated: () => !!get().user,

      // 主题相关状态
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => {
        const { theme } = get();
        set({
          theme: theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light',
        });
      },

      // 全局通知状态
      notifications: [],
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              ...notification,
              timestamp: Date.now(),
            },
          ],
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      clearNotifications: () => set({ notifications: [] }),

      // 通知设置状态
      notificationSettings: defaultNotificationSettings,
      setNotificationSettings: (settings) => set({ notificationSettings: settings }),
      updateNotificationSetting: (key, value) =>
        set((state) => ({
          notificationSettings: {
            ...state.notificationSettings,
            [key]: value,
          },
        })),

      // 快捷方式状态
      shortcuts: defaultShortcuts,
      setShortcuts: (shortcuts) => set({ shortcuts }),
      addShortcut: (shortcut) =>
        set((state) => ({
          shortcuts: [...state.shortcuts, shortcut],
        })),
      removeShortcut: (id) =>
        set((state) => ({
          shortcuts: state.shortcuts.filter((s) => s.id !== id),
        })),

      // 工作流状态
      selectedWorkflowId: null,
      setSelectedWorkflowId: (id) => set({ selectedWorkflowId: id }),

      // UI 状态
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: 'topems-app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        user: state.user,
        sidebarOpen: state.sidebarOpen,
        notificationSettings: state.notificationSettings,
        shortcuts: state.shortcuts,
      }),
    }
  )
);
