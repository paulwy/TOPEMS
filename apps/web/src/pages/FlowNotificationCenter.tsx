import React, { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Eye,
  Check,
  Mail,
  MessageSquare,
  FileText,
  Users,
  Play,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Notification } from "../api/flow";
import { flowApi } from "../api/flow";
import { useAppStore } from "../store";

const FlowNotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);

      // TODO: Get actual user ID from auth context
      const userId = "current-user-id";

      const params: any = {};
      if (filter === "unread") {
        // This would need backend support to filter by is_read
      }

      const response = await flowApi.listNotifications(userId, params);
      if (response.success && response.data) {
        const data = response.data as any;
        const notificationList = Array.isArray(data) ? data : data.items || [];
        setNotifications(notificationList);

        // Count unread
        const unread = notificationList.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error("加载通知失败:", err);
      addNotification({
        title: "错误",
        message: "加载通知失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async () => {
    try {
      const userId = "current-user-id"; // TODO: Get from auth context
      const response = await flowApi.markNotificationsAsRead(userId);
      if (response.success) {
        addNotification({
          title: "成功",
          message: "所有通知已标记为已读",
          type: "success",
        });
        loadNotifications();
      }
    } catch (err) {
      addNotification({ title: "错误", message: "标记失败", type: "error" });
      console.error("标记失败:", err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      // In a real app, we'd mark this single notification as read
      // For now, we'll just navigate
    }

    // Navigate based on notification type
    if (notification.workflow_instance_id) {
      navigate(`/flow/instances/${notification.workflow_instance_id}`);
    } else if (notification.approval_id) {
      navigate(`/flow/approvals/${notification.approval_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "approval_created":
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case "approval_completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "workflow_started":
        return <Play className="w-5 h-5 text-indigo-600" />;
      case "workflow_completed":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "workflow_rejected":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationText = (type: string) => {
    const typeMap: Record<string, string> = {
      approval_created: "新审批任务",
      approval_completed: "审批已完成",
      workflow_started: "工作流已启动",
      workflow_completed: "工作流已完成",
      workflow_rejected: "工作流被拒绝",
    };
    return typeMap[type] || type;
  };

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">通知中心</h1>
              <p className="text-sm text-gray-500">
                {unreadCount > 0 ? (
                  <span className="text-yellow-600 font-medium">
                    {unreadCount} 条未读通知
                  </span>
                ) : (
                  "暂无未读通知"
                )}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAsRead}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Check className="w-5 h-5 mr-2" />
              全部标记为已读
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setFilter("all")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                filter === "all"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              全部通知 ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                filter === "unread"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              未读 ({unreadCount})
            </button>
          </div>
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {filter === "unread" ? "暂无未读通知" : "暂无通知"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  notification.is_read
                    ? "border-gray-200 bg-white"
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        notification.is_read ? "bg-gray-100" : "bg-blue-100"
                      }`}
                    >
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3
                          className={`font-medium ${notification.is_read ? "text-gray-700" : "text-gray-900"}`}
                        >
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.content}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          {getNotificationIcon(notification.notification_type)}
                          <span className="ml-1">
                            {getNotificationText(
                              notification.notification_type,
                            )}
                          </span>
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(notification.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {notification.workflow_instance_id && (
                      <span className="text-xs text-gray-400 flex items-center">
                        <FileText className="w-3 h-3 mr-1" />
                        实例
                      </span>
                    )}
                    {notification.approval_id && (
                      <span className="text-xs text-gray-400 flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        审批
                      </span>
                    )}
                    {!notification.is_read && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        未读
                      </span>
                    )}
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

export default FlowNotificationCenter;
