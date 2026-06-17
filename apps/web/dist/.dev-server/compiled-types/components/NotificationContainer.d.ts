import React from "react";
import type { Notification } from "../hooks/useNotification";
interface NotificationContainerProps {
    notifications: Notification[];
    onClose: (_id: string) => void;
}
export declare const NotificationContainer: React.FC<NotificationContainerProps>;
export {};
