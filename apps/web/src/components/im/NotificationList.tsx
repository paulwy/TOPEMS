import { Button } from "@mui/material";
import React, { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, Clock } from "lucide-react";

import { imApi, type Notification } from "../../api/im";
import { useAppStore } from "../../store";
import { logger } from "@/utils/logger";

interface NotificationListProps {
  userId?: string;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  userId = "current-user",
}) => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await imApi.listNotifications(userId);
      if (response.success && response.data) {
        const data: any = response.data;
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      logger.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await imApi.markNotificationRead(notificationId);
      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n,
          ),
        );
      }
    } catch (error) {
      logger.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await imApi.markAllNotificationsRead(userId);
      if (response.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        addNotification({
          title: "Success",
          message: "所有通知已标记为已读",
          type: "success",
        });
      }
    } catch (error) {
      logger.error("Failed to mark all notifications as read:", error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString("zh-CN");
  };

  const getNotificationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "chat":
      case "message":
        return <Bell sx={{ width: 20, height: 20, color: "#3b82f6" }} />;
      case "warning":
        return <Bell sx={{ width: 20, height: 20, color: "#eab308" }} />;
      case "error":
        return <Bell sx={{ width: 20, height: 20, color: "#ef4444" }} />;
      case "success":
        return <Bell sx={{ width: 20, height: 20, color: "#22c55e" }} />;
      default:
        return <Bell sx={{ width: 20, height: 20, color: "#6b7280" }} />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Bell sx={{ width: 20, height: 20 }} />
            通知
            {unreadCount > 0 && (
              <span
                style={{
                  backgroundColor: "#ef4444",
                  color: "#ffffff",
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 9999,
                }}
              >
                {unreadCount}
              </span>
            )}
          </h2>
          {unreadCount > 0 && (
            <Button
              variant="text"
              size="small"
              onClick={handleMarkAllAsRead}
              sx={{ fontSize: 14 }}
            >
              <CheckCheck sx={{ width: 16, height: 16, mr: 1 }} />
              全部已读
            </Button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: 32,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "9999px",
                border: "4px solid #6366f1",
                borderTopColor: "transparent",
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#6b7280" }}>
            <Bell
              sx={{
                width: 48,
                height: 48,
                mx: "auto",
                mb: 3,
                color: "#d1d5db",
              }}
            />
            <p>暂无通知</p>
          </div>
        ) : (
          <div style={{ borderTop: "1px solid #f3f4f6" }}>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  padding: 16,
                  transition: "background-color 0.15s",
                  backgroundColor: !notification.is_read
                    ? "#eff6ff"
                    : undefined,
                }}
              >
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flexShrink: 0, marginTop: 4 }}>
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <h3 style={{ fontWeight: 500, color: "#111827" }}>
                        {notification.title}
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Clock sx={{ width: 12, height: 12 }} />
                          {formatTime(notification.created_at)}
                        </span>
                        {!notification.is_read && (
                          <Button
                            variant="text"
                            size="small"
                            sx={{ minWidth: 24, width: 24, height: 24, p: 0 }}
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <Check sx={{ width: 12, height: 12 }} />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: "#4b5563", marginTop: 4 }}>
                      {notification.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
