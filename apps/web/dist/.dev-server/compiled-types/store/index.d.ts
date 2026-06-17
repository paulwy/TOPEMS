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
export interface Notification {
    id: string;
    title: string;
    message: string;
    type: "info" | "success" | "error" | "warning";
    timestamp: number;
}
export interface NotificationSettings {
    email_enabled: boolean;
    system_enabled: boolean;
    workflow_enabled: boolean;
    document_enabled: boolean;
    security_enabled: boolean;
}
export interface Shortcut {
    id: string;
    title: string;
    icon: string;
    path: string;
}
export type Theme = "light" | "dark" | "system";
interface AppState {
    user: User | null;
    setUser: (user: User | null) => void;
    clearUser: () => void;
    isAuthenticated: () => boolean;
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, "id" | "timestamp">) => void;
    removeNotification: (id: string) => void;
    clearNotifications: () => void;
    notificationSettings: NotificationSettings;
    setNotificationSettings: (settings: NotificationSettings) => void;
    updateNotificationSetting: (key: keyof NotificationSettings, value: boolean) => void;
    shortcuts: Shortcut[];
    setShortcuts: (shortcuts: Shortcut[]) => void;
    addShortcut: (shortcut: Shortcut) => void;
    removeShortcut: (id: string) => void;
    selectedWorkflowId: string | null;
    setSelectedWorkflowId: (id: string | null) => void;
    sidebarOpen: boolean;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
}
export declare const useAppStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<AppState>, "setState" | "persist"> & {
    setState(partial: AppState | Partial<AppState> | ((state: AppState) => AppState | Partial<AppState>), replace?: false | undefined): unknown;
    setState(state: AppState | ((state: AppState) => AppState), replace: true): unknown;
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<AppState, unknown, unknown>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: AppState) => void) => () => void;
        onFinishHydration: (fn: (state: AppState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<AppState, unknown, unknown>>;
    };
}>;
export {};
