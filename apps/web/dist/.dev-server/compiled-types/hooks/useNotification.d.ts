export type NotificationType = "success" | "error" | "info" | "warning";
export interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    duration?: number;
}
export declare function useNotification(): {
    notifications: Notification[];
    showNotification: (type: NotificationType, message: string, duration?: number) => string;
    hideNotification: (id: string) => void;
    success: (message: string, duration?: number) => string;
    error: (message: string, duration?: number) => string;
    info: (message: string, duration?: number) => string;
    warning: (message: string, duration?: number) => string;
};
