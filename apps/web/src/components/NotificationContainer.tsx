import React from "react";
import { XCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";
import type { Notification } from "../hooks/useNotification";

interface NotificationContainerProps {
  notifications: Notification[];
  onClose: (id: string) => void;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: "bg-green-500 border-green-600 text-white",
  error: "bg-red-500 border-red-600 text-white",
  info: "bg-blue-500 border-blue-600 text-white",
  warning: "bg-yellow-500 border-yellow-600 text-white",
};

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onClose,
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-3">
      {notifications.map((notification) => {
        const Icon = iconMap[notification.type];
        return (
          <div
            key={notification.id}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg border-l-4 min-w-[300px] max-w-md transform transition-all duration-300 ${
              colorMap[notification.type]
            }`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <p className="flex-1 text-sm font-medium">{notification.message}</p>
            <button
              onClick={() => onClose(notification.id)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
