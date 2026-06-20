import React, { useState, useEffect } from "react";
import {
  Bell,
  ChevronLeft,
  Check,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import type { Notification, NotificationTypeEnum } from "@/api/notification";
import {
  markAsRead,
  deleteNotification,
  getNotifications,
} from "@/api/notification";
import { useNotification } from "@/hooks/useNotification";
import { NotificationContainer } from "@/components/NotificationContainer";
import { apiLogger } from "@/utils/logger";

const NotificationDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { success, error, notifications, hideNotification } = useNotification();

  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadNotification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadNotification = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await getNotifications(1, 100);
      if (response.success && response.data) {
        const found = response.data.notifications.find((n) => n.id === id);
        if (found) {
          setNotification(found);
        }
      }
    } catch (err) {
      apiLogger.error("Error loading notification:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async () => {
    if (!notification) return;

    setActionLoading(true);
    try {
      const res = await markAsRead(notification.id);
      if (res.success && res.data) {
        setNotification(res.data);
        success("已标记为已读");
      } else {
        error(res.message || "操作失败");
      }
    } catch (err: any) {
      error(err.message || "操作失败");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!notification) return;
    if (!confirm("确定要删除这条通知吗？")) return;

    setActionLoading(true);
    try {
      const res = await deleteNotification(notification.id);
      if (res.success) {
        success("通知已删除");
        navigate("/notifications");
      } else {
        error(res.message || "删除失败");
      }
    } catch (err: any) {
      error(err.message || "删除失败");
    } finally {
      setActionLoading(false);
    }
  };

  const getTypeLabel = (type: NotificationTypeEnum) => {
    const labels: Record<NotificationTypeEnum, string> = {
      system: "系统通知",
      workflow: "审批通知",
      reminder: "提醒通知",
      alert: "告警通知",
      message: "消息通知",
      info: "信息通知",
      success: "成功通知",
      warning: "警告通知",
      error: "错误通知",
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: NotificationTypeEnum) => {
    const colors: Record<NotificationTypeEnum, { bg: string; text: string }> = {
      system: { bg: "primary.100", text: "primary.700" },
      workflow: { bg: "purple.100", text: "purple.700" },
      reminder: { bg: "warning.100", text: "warning.700" },
      alert: { bg: "error.100", text: "error.700" },
      message: { bg: "success.100", text: "success.700" },
      info: { bg: "info.100", text: "info.700" },
      success: { bg: "success.100", text: "success.700" },
      warning: { bg: "warning.100", text: "warning.700" },
      error: { bg: "error.100", text: "error.700" },
    };
    return colors[type] || { bg: "grey.100", text: "grey.700" };
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 4)
      return { label: "紧急", bg: "error.100", text: "error.700" };
    if (priority >= 3)
      return { label: "高", bg: "warning.100", text: "warning.700" };
    if (priority >= 2)
      return { label: "中", bg: "warning.100", text: "warning.700" };
    return { label: "低", bg: "grey.100", text: "grey.700" };
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "grey.100",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Loader2
            size={48}
            color="#1976d2"
            style={{ margin: "0 auto", animation: "spin 1s linear infinite" }}
          />
          <Typography variant="body2" sx={{ mt: 1, color: "grey.500" }}>
            加载中...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!notification) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
        <NotificationContainer
          notifications={notifications}
          onClose={hideNotification}
        />

        {/* Header */}
        <Box
          sx={{
            bgcolor: "background.paper",
            boxShadow: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              maxWidth: 900,
              mx: "auto",
              px: { xs: 2, sm: 3, lg: 4 },
              py: 3,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                component="button"
                onClick={() => navigate("/notifications")}
                sx={{
                  p: 1,
                  borderRadius: 2,
                  "&:hover": { bgcolor: "grey.100" },
                  transition: "background-color 0.2s",
                }}
              >
                <ChevronLeft size={20} color="#666" />
              </Box>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: "grey.900" }}
                >
                  通知详情
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{ maxWidth: 900, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}
        >
          <Box
            sx={{
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 1,
              p: 6,
              textAlign: "center",
            }}
          >
            <AlertCircle
              size={64}
              color="#666"
              style={{ margin: "0 auto 16px" }}
            />
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: "grey.900", mb: 1 }}
            >
              通知不存在
            </Typography>
            <Typography variant="body2" sx={{ color: "grey.500", mb: 3 }}>
              该通知可能被已删除或不存在
            </Typography>
            <Box
              component="button"
              onClick={() => navigate("/notifications")}
              sx={{
                px: 2,
                py: 1,
                bgcolor: "primary.main",
                color: "white",
                borderRadius: 2,
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              返回通知列表
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  const priorityInfo = getPriorityLabel(notification.priority);
  const typeColor = getTypeColor(notification.notification_type);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      <NotificationContainer
        notifications={notifications}
        onClose={hideNotification}
      />

      {/* Header */}
      <Box
        sx={{
          bgcolor: "background.paper",
          boxShadow: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box
          sx={{ maxWidth: 900, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                component="button"
                onClick={() => navigate("/notifications")}
                sx={{
                  p: 1,
                  borderRadius: 2,
                  "&:hover": { bgcolor: "grey.100" },
                  transition: "background-color 0.2s",
                }}
              >
                <ChevronLeft size={20} color="#666" />
              </Box>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: "grey.900",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Bell size={24} style={{ marginRight: 12 }} color="#1976d2" />
                  通知详情
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {!notification.is_read && (
                <Box
                  component="button"
                  onClick={handleMarkAsRead}
                  disabled={actionLoading}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    px: 2,
                    py: 1,
                    color: "primary.700",
                    bgcolor: "primary.100",
                    borderRadius: 2,
                    "&:hover": { bgcolor: "primary.200" },
                    disabled: { opacity: 0.5, cursor: "not-allowed" },
                  }}
                >
                  <Check size={20} style={{ marginRight: 8 }} />
                  标记已读
                </Box>
              )}
              {notification.data?.link && (
                <Box
                  component="a"
                  href={notification.data.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    px: 2,
                    py: 1,
                    color: "primary.700",
                    bgcolor: "primary.100",
                    borderRadius: 2,
                    textDecoration: "none",
                    "&:hover": { bgcolor: "primary.200" },
                  }}
                >
                  <ExternalLink size={20} style={{ marginRight: 8 }} />
                  查看详情
                </Box>
              )}
              <Box
                component="button"
                onClick={handleDelete}
                disabled={actionLoading}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                  py: 1,
                  color: "error.700",
                  bgcolor: "error.100",
                  borderRadius: 2,
                  "&:hover": { bgcolor: "error.200" },
                  disabled: { opacity: 0.5, cursor: "not-allowed" },
                }}
              >
                <Trash2 size={20} style={{ marginRight: 8 }} />
                删除
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{ maxWidth: 900, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}
      >
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  component="span"
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    fontSize: "0.875rem",
                    borderRadius: 4,
                    bgcolor: typeColor.bg,
                    color: typeColor.text,
                  }}
                >
                  {getTypeLabel(notification.notification_type)}
                </Box>
                <Box
                  component="span"
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    fontSize: "0.875rem",
                    borderRadius: 4,
                    bgcolor: priorityInfo.bg,
                    color: priorityInfo.text,
                  }}
                >
                  {priorityInfo.label}
                </Box>
                {notification.is_read ? (
                  <Box
                    component="span"
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      fontSize: "0.875rem",
                      borderRadius: 4,
                      bgcolor: "success.100",
                      color: "success.700",
                    }}
                  >
                    已读
                  </Box>
                ) : (
                  <Box
                    component="span"
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      fontSize: "0.875rem",
                      borderRadius: 4,
                      bgcolor: "error.100",
                      color: "error.700",
                    }}
                  >
                    未读
                  </Box>
                )}
              </Box>
              <Typography variant="body2" sx={{ color: "grey.500" }}>
                {new Date(notification.created_at).toLocaleString("zh-CN")}
              </Typography>
            </Box>

            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: "grey.900", mb: 1 }}
            >
              {notification.title}
            </Typography>
          </Box>

          {/* Content */}
          <Box sx={{ p: 3 }}>
            <Box sx={{ "& p": { color: "grey.700", whiteSpace: "pre-wrap" } }}>
              <Typography variant="body1" component="p">
                {notification.content}
              </Typography>
            </Box>
          </Box>

          {/* Meta Info */}
          {(notification.read_at || notification.data) && (
            <Box
              sx={{
                p: 3,
                bgcolor: "grey.50",
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              {notification.read_at && (
                <Box sx={{ fontSize: "0.875rem", color: "grey.500", mb: 1 }}>
                  阅读时间：
                  {new Date(notification.read_at).toLocaleString("zh-CN")}
                </Box>
              )}

              {notification.data &&
                Object.keys(notification.data).length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, color: "grey.700", mb: 1 }}
                    >
                      附加数据
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        fontSize: "0.75rem",
                        color: "grey.600",
                        bgcolor: "background.paper",
                        p: 1.5,
                        borderRadius: 1,
                        border: 1,
                        borderColor: "grey.200",
                        overflow: "auto",
                      }}
                    >
                      {JSON.stringify(notification.data, null, 2)}
                    </Box>
                  </Box>
                )}
            </Box>
          )}
        </Box>

        {/* Navigation */}
        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-start" }}>
          <Box
            component="button"
            onClick={() => navigate("/notifications")}
            sx={{
              px: 2,
              py: 1,
              color: "grey.700",
              bgcolor: "background.paper",
              border: 1,
              borderColor: "grey.300",
              borderRadius: 2,
              "&:hover": { bgcolor: "grey.50" },
            }}
          >
            返回通知列表
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default NotificationDetailPage;
