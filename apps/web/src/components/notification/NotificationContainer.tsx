import React from "react";
import { XCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";
import type { Notification } from "@/hooks/useNotification";

interface NotificationContainerProps {
  notifications: Notification[];
  onClose: (_id: string) => void;
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
    <div
      style={{
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {notifications.map((notification) => {
        const Icon = iconMap[notification.type];
        return (
          <div
            key={notification.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              borderRadius: "8px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              borderLeft: "4px solid",
              minWidth: "300px",
              maxWidth: "448px",
              transition: "all 0.3s ease",
              ...(notification.type === "success"
                ? {
                    backgroundColor: "#22c55e",
                    borderColor: "#16a34a",
                    color: "#ffffff",
                  }
                : {}),
              ...(notification.type === "error"
                ? {
                    backgroundColor: "#ef4444",
                    borderColor: "#dc2626",
                    color: "#ffffff",
                  }
                : {}),
              ...(notification.type === "info"
                ? {
                    backgroundColor: "#3b82f6",
                    borderColor: "#2563eb",
                    color: "#ffffff",
                  }
                : {}),
              ...(notification.type === "warning"
                ? {
                    backgroundColor: "#eab308",
                    borderColor: "#ca8a04",
                    color: "#ffffff",
                  }
                : {}),
            }}
          >
            <Icon sx={{ width: 20, height: 20, flexShrink: 0 }} />
            <p style={{ flex: 1, fontSize: "14px", fontWeight: 500 }}>
              {notification.message}
            </p>
            <button
              onClick={() => onClose(notification.id)}
              style={{
                padding: "4px",
                borderRadius: "9999px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              <X sx={{ width: 16, height: 16 }} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
