import React from "react";
import type { Notification } from "@/api/notification";
interface NotificationItemProps {
    notification: Notification;
    onUpdate: (notification: Notification) => void;
    onDelete: (id: string) => void;
}
declare const NotificationItem: React.FC<NotificationItemProps>;
export default NotificationItem;
