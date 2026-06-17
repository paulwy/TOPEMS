import React, { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import NotificationPanel from "./NotificationPanel";
import { useNotificationWebSocket } from "../../hooks/useNotificationWebSocket";
import { useNotificationState } from "../../hooks/useNotificationState";
import { useAuth } from "../../hooks/useAuth";
import type { Notification } from "@/api/notification";

interface NotificationBellProps {
  onNotificationClick?: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  onNotificationClick,
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const {
    notifications: _,
    unreadCount,
    loading: __,
    error: ___,
    addNotification,
    updateNotification: ____,
    removeNotification: _____,
    fetchNotifications,
    fetchUnreadCount,
  } = useNotificationState(isAuthenticated);

  const handleNewNotification = useCallback(
    (notification: Notification) => {
      addNotification(notification);
      setHasNewNotification(true);
      setTimeout(() => setHasNewNotification(false), 3000);
    },
    [addNotification],
  );

  const userId = user?.id;

  const {
    isConnected,
    error: _wsError,
    reconnect: _reconnect,
  } = useNotificationWebSocket({
    userId: isAuthenticated && userId ? userId : "",
    onNotification: handleNewNotification,
    onUnreadCountChange: fetchUnreadCount,
    maxReconnectAttempts: 5,
    autoConnect: isAuthenticated,
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
    }
  }, [isAuthenticated, fetchUnreadCount]);

  const handleBellClick = () => {
    setShowPanel(!showPanel);
    if (onNotificationClick) {
      onNotificationClick();
    }
    if (!showPanel) {
      fetchNotifications();
      fetchUnreadCount();
    }
  };

  const handleClose = () => {
    setShowPanel(false);
  };

  const handleUnreadCountChange = (_count: number) => {
    fetchUnreadCount();
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={handleBellClick}
        style={{ padding: 8, color: "#4b5563", backgroundColor: "transparent", border: "none", borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }}
        aria-label="通知"
      >
        <Bell style={{ width: 24, height: 24 }} />
        {unreadCount > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, backgroundColor: "#ef4444", color: "#ffffff", fontSize: 12, fontWeight: "bold", borderRadius: 9999, minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        {hasNewNotification && (
          <span style={{ position: "absolute", top: -4, right: -4, width: 12, height: 12, backgroundColor: "#22c55e", borderRadius: "9999px", animation: "ping 1s cubic-bezier(0, 0, 0.2, 1)" }} />
        )}
        {isConnected && (
          <span
            style={{ position: "absolute", bottom: 4, right: 4, width: 8, height: 8, backgroundColor: "#22c55e", borderRadius: "9999px" }}
            title="已连接"
          />
        )}
      </button>

      {showPanel && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={handleClose} />
          <NotificationPanel
            onClose={handleClose}
            onUnreadCountChange={handleUnreadCountChange}
          />
        </>
      )}
    </div>
  );
};

export default NotificationBell;
