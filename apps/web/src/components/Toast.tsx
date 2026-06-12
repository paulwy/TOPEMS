import React, { useEffect, useState } from "react";
import { XCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";
import type { Notification, NotificationType } from "../hooks/useNotification";

interface ToastProps {
  notification: Notification;
  onClose: (id: string) => void;
}

const iconMap: Record<
  NotificationType,
  React.ComponentType<{ className?: string }>
> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
};

const iconColorMap = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
  warning: "text-yellow-500",
};

export const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const Icon = iconMap[notification.type];

  useEffect(() => {
    setIsVisible(true);

    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(notification.id);
    }, 300);
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-md min-w-[300px] max-w-md
        transform transition-all duration-300 ease-in-out
        ${colorMap[notification.type]}
        ${isVisible && !isLeaving ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}
      `}
    >
      <Icon
        className={`w-5 h-5 flex-shrink-0 ${iconColorMap[notification.type]}`}
      />
      <p className="flex-1 text-sm font-medium">{notification.message}</p>
      <button
        onClick={handleClose}
        className="p-1 hover:bg-black/5 rounded-full transition-colors"
        aria-label="关闭通知"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  notifications: Notification[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  notifications,
  onClose,
}) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onClose={onClose}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
