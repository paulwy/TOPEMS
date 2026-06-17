import type { Notification } from "@/api/notification";
export declare const useNotificationState: (enabled?: boolean) => {
    fetchNotifications: (page?: number, pageSize?: number) => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    addNotification: (notification: Notification) => void;
    updateNotification: (notification: Notification) => void;
    removeNotification: (id: string) => void;
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
};
