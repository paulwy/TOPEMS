import React from "react";
interface NotificationPanelProps {
    onClose: () => void;
    onUnreadCountChange: (count: number) => void;
}
declare const NotificationPanel: React.FC<NotificationPanelProps>;
export default NotificationPanel;
