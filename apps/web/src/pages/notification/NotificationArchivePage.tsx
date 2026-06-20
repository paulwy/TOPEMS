import React, { useState, useEffect } from "react";
import {
  Archive,
  ChevronLeft,
  Search,
  Loader2,
  RefreshCw,
  Settings,
  Trash2,
  RotateCcw,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type {
  ArchiveConfig,
  ArchivedNotification,
  NotificationTypeEnum,
} from "@/api/notification";
import {
  getArchivedNotifications,
  getArchiveConfig,
  updateArchiveConfig,
  runAutoArchive,
} from "@/api/notification";
import { useNotification } from "@/hooks/useNotification";
import { NotificationContainer } from "@/components/NotificationContainer";
import { Box, Typography } from "@mui/material";
import { apiLogger } from "@/utils/logger";

const NotificationArchivePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();

  const [archivedNotifications, setArchivedNotifications] = useState<
    ArchivedNotification[]
  >([]);
  const [archiveConfig, setArchiveConfig] = useState<ArchiveConfig | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<ArchivedNotification | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [archivedRes, configRes] = await Promise.all([
        getArchivedNotifications(page, 20),
        getArchiveConfig(),
      ]);

      if (archivedRes.success && archivedRes.data) {
        setArchivedNotifications(archivedRes.data.notifications || []);
        setTotal(archivedRes.data.total);
      }
      if (configRes.success && configRes.data) {
        setArchiveConfig(configRes.data);
      }
    } catch (err) {
      apiLogger.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (config: ArchiveConfig) => {
    try {
      const res = await updateArchiveConfig(config);
      if (res.success) {
        success("归档配置更新成功");
        setShowConfigModal(false);
        loadData();
      } else {
        error(res.message || "更新失败");
      }
    } catch (err: any) {
      error(err.message || "更新失败");
    }
  };

  const handleRunAutoArchive = async () => {
    try {
      const res = await runAutoArchive();
      if (res.success) {
        success(
          `自动归档执行成功，已归档 ${res.data?.archived_count || 0} 条通知`,
        );
        loadData();
      } else {
        error(res.message || "执行失败");
      }
    } catch (err: any) {
      error(err.message || "执行失败");
    }
  };

  const filteredNotifications = archivedNotifications.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
    const colors: Record<
      NotificationTypeEnum,
      { bgcolor: string; color: string }
    > = {
      system: { bgcolor: "#dbeafe", color: "#1d4ed8" },
      workflow: { bgcolor: "#ede9fe", color: "#7c3aed" },
      reminder: { bgcolor: "#fef9c3", color: "#a16207" },
      alert: { bgcolor: "#fee2e2", color: "#dc2626" },
      message: { bgcolor: "#dcfce7", color: "#16a34a" },
      info: { bgcolor: "#cffafe", color: "#0891b2" },
      success: { bgcolor: "#d1fae5", color: "#059669" },
      warning: { bgcolor: "#ffedd5", color: "#ea580c" },
      error: { bgcolor: "#ffe4e6", color: "#e11d48" },
    };
    return colors[type] || { bgcolor: "#f3f4f6", color: "#374151" };
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

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
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ maxWidth: 1400, mx: "auto", px: 3, py: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Box
                onClick={() => navigate("/notifications")}
                sx={{
                  p: 1,
                  "&:hover": { bgcolor: "grey.100" },
                  borderRadius: 1,
                  cursor: "pointer",
                }}
              >
                <ChevronLeft
                  sx={{ width: 20, height: 20, color: "grey.600" }}
                />
              </Box>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: "grey.900",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Archive
                    sx={{ width: 28, height: 28, color: "warning.main" }}
                  />
                  通知归档管理
                </Typography>
                <Typography variant="body2" sx={{ color: "grey.500", mt: 0.5 }}>
                  查看和管理已归档的通知
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                onClick={loadData}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                  py: 1,
                  color: "grey.700",
                  bgcolor: "grey.200",
                  borderRadius: 2,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "grey.300" },
                }}
              >
                <RefreshCw sx={{ width: 20, height: 20, mr: 1 }} />
                刷新
              </Box>
              <Box
                onClick={handleRunAutoArchive}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                  py: 1,
                  color: "warning.700",
                  bgcolor: "warning.100",
                  borderRadius: 2,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "warning.200" },
                }}
              >
                <RotateCcw sx={{ width: 20, height: 20, mr: 1 }} />
                执行自动归档
              </Box>
              <Box
                onClick={() => setShowConfigModal(true)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                  py: 1,
                  color: "grey.700",
                  bgcolor: "grey.200",
                  borderRadius: 2,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "grey.300" },
                }}
              >
                <Settings sx={{ width: 20, height: 20, mr: 1 }} />
                归档设置
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Archive Config Summary */}
      {archiveConfig && (
        <Box sx={{ maxWidth: 1400, mx: "auto", px: 3, py: 2 }}>
          <Box
            sx={{
              bgcolor: "warning.50",
              borderRadius: 2,
              p: 2,
              border: 1,
              borderColor: "warning.200",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Settings
                  sx={{ width: 20, height: 20, color: "warning.main", mr: 1 }}
                />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, color: "warning.900" }}
                >
                  归档配置
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: "0.875rem",
                  color: "warning.800",
                }}
              >
                <span>自动归档天数：{archiveConfig.auto_archive_days} 天</span>
                <span>保留天数：{archiveConfig.retention_days} 天</span>
                <Typography
                  component="span"
                  sx={{
                    color: archiveConfig.enabled
                      ? "success.main"
                      : "error.main",
                  }}
                >
                  {archiveConfig.enabled ? "已启用" : "已禁用"}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Filters */}
      <Box sx={{ maxWidth: 1400, mx: "auto", px: 3, py: 3 }}>
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
            p: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ flex: 1, position: "relative" }}>
              <Search
                sx={{
                  position: "absolute",
                  left: 2,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 20,
                  height: 20,
                  color: "grey.400",
                }}
              />
              <input
                type="text"
                placeholder="搜索归档通知标题、内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  paddingLeft: 40,
                  paddingRight: 16,
                  paddingTop: 8,
                  paddingBottom: 8,
                  border: "1px solid",
                  borderColor: "grey.300",
                  borderRadius: 8,
                  outline: "none",
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Content */}
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 1,
            overflow: "hidden",
          }}
        >
          {loading ? (
            <Box sx={{ p: 8, textAlign: "center" }}>
              <Loader2
                sx={{
                  width: 48,
                  height: 48,
                  color: "primary.main",
                  mx: "auto",
                  animation: "spin 1s linear infinite",
                }}
              />
              <Typography variant="body2" sx={{ color: "grey.500", mt: 1 }}>
                加载中...
              </Typography>
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Box sx={{ p: 8, textAlign: "center" }}>
              <Archive
                sx={{
                  width: 48,
                  height: 48,
                  color: "grey.400",
                  mx: "auto",
                  mb: 1.5,
                }}
              />
              <Typography sx={{ color: "grey.500" }}>暂无归档通知</Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ overflowX: "auto" }}>
                <Box component="table" sx={{ minWidth: 720 }}>
                  <Box component="thead" sx={{ bgcolor: "grey.50" }}>
                    <tr>
                      <th
                        style={{
                          padding: "12px 24px",
                          textAlign: "left",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: "grey.500",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        通知标题
                      </th>
                      <th
                        style={{
                          padding: "12px 24px",
                          textAlign: "left",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: "grey.500",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        类型
                      </th>
                      <th
                        style={{
                          padding: "12px 24px",
                          textAlign: "left",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: "grey.500",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        原创建时间
                      </th>
                      <th
                        style={{
                          padding: "12px 24px",
                          textAlign: "left",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: "grey.500",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        归档时间
                      </th>
                      <th
                        style={{
                          padding: "12px 24px",
                          textAlign: "right",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: "grey.500",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        操作
                      </th>
                    </tr>
                  </Box>
                  <Box
                    component="tbody"
                    sx={{
                      "& > tr": { borderTop: 1, borderColor: "divider" },
                      "& > tr:hover": { bgcolor: "grey.50" },
                    }}
                  >
                    {filteredNotifications.map((notification) => (
                      <tr key={notification.id}>
                        <td style={{ padding: "16px 24px" }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 500, color: "grey.900" }}
                          >
                            {notification.title}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "grey.500",
                              maxWidth: 400,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "block",
                            }}
                          >
                            {notification.content}
                          </Typography>
                        </td>
                        <td
                          style={{ padding: "16px 24px", whiteSpace: "nowrap" }}
                        >
                          <Box
                            component="span"
                            sx={{
                              px: 1,
                              py: 0.5,
                              fontSize: "0.75rem",
                              borderRadius: "9999px",
                              ...getTypeColor(notification.notification_type),
                            }}
                          >
                            {getTypeLabel(notification.notification_type)}
                          </Box>
                        </td>
                        <td
                          style={{
                            padding: "16px 24px",
                            whiteSpace: "nowrap",
                            fontSize: "0.875rem",
                            color: "grey.500",
                          }}
                        >
                          {new Date(notification.created_at).toLocaleString(
                            "zh-CN",
                          )}
                        </td>
                        <td
                          style={{
                            padding: "16px 24px",
                            whiteSpace: "nowrap",
                            fontSize: "0.875rem",
                            color: "grey.500",
                          }}
                        >
                          {new Date(notification.archived_at).toLocaleString(
                            "zh-CN",
                          )}
                        </td>
                        <td
                          style={{
                            padding: "16px 24px",
                            whiteSpace: "nowrap",
                            textAlign: "right",
                            fontSize: "0.875rem",
                            fontWeight: 500,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 1,
                            }}
                          >
                            <Box
                              onClick={() =>
                                setSelectedNotification(notification)
                              }
                              sx={{
                                p: 1,
                                color: "primary.main",
                                "&:hover": { bgcolor: "primary.100" },
                                borderRadius: 1,
                                cursor: "pointer",
                              }}
                              title="查看详情"
                            >
                              <Eye sx={{ width: 16, height: 16 }} />
                            </Box>
                          </Box>
                        </td>
                      </tr>
                    ))}
                  </Box>
                </Box>
              </Box>

              {/* Pagination */}
              {total > 20 && (
                <Box
                  sx={{
                    px: 3,
                    py: 2,
                    borderTop: 1,
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="body2" sx={{ color: "grey.600" }}>
                    第 {page} 页，共 {totalPages} 页
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      sx={{
                        px: 1.5,
                        py: 0.75,
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "grey.700",
                        bgcolor: "background.paper",
                        border: 1,
                        borderColor: "grey.300",
                        borderRadius: 2,
                        cursor: page === 1 ? "not-allowed" : "pointer",
                        opacity: page === 1 ? 0.5 : 1,
                      }}
                    >
                      上一页
                    </Box>
                    <Box
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      sx={{
                        px: 1.5,
                        py: 0.75,
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "grey.700",
                        bgcolor: "background.paper",
                        border: 1,
                        borderColor: "grey.300",
                        borderRadius: 2,
                        cursor: page >= totalPages ? "not-allowed" : "pointer",
                        opacity: page >= totalPages ? 0.5 : 1,
                      }}
                    >
                      下一页
                    </Box>
                  </Box>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Config Modal */}
      {showConfigModal && archiveConfig && (
        <ArchiveConfigModal
          config={archiveConfig}
          onClose={() => setShowConfigModal(false)}
          onSubmit={handleUpdateConfig}
        />
      )}

      {/* Detail Modal */}
      {selectedNotification && (
        <ArchivedNotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
        />
      )}
    </Box>
  );
};

// Archive Config Modal Component
interface ArchiveConfigModalProps {
  config: ArchiveConfig;
  onClose: () => void;
  onSubmit: (config: ArchiveConfig) => void;
}

const ArchiveConfigModal: React.FC<ArchiveConfigModalProps> = ({
  config,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<ArchiveConfig>(config);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        p: 2,
      }}
    >
      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 6,
          width: "100%",
          maxWidth: 480,
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "grey.900" }}>
            归档设置
          </Typography>
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: "grey.700" }}
            >
              启用自动归档
            </Typography>
            <Box
              onClick={() =>
                setFormData({ ...formData, enabled: !formData.enabled })
              }
              sx={{
                position: "relative",
                display: "inline-flex",
                width: 44,
                height: 24,
                borderRadius: "12px",
                alignItems: "center",
                bgcolor: formData.enabled ? "primary.main" : "grey.300",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  bgcolor: "white",
                  transition: "transform 0.2s",
                  transform: formData.enabled
                    ? "translateX(20px)"
                    : "translateX(4px)",
                }}
              />
            </Box>
          </Box>

          <Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: "grey.700", mb: 0.5 }}
            >
              自动归档天数
            </Typography>
            <input
              type="number"
              min="1"
              value={formData.auto_archive_days}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  auto_archive_days: parseInt(e.target.value) || 30,
                })
              }
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid",
                borderColor: "grey.300",
                borderRadius: 8,
                outline: "none",
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: "grey.500", mt: 0.5, display: "block" }}
            >
              超过此天数未读的通知将自动归档
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: "grey.700", mb: 0.5 }}
            >
              保留天数
            </Typography>
            <input
              type="number"
              min="1"
              value={formData.retention_days}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  retention_days: parseInt(e.target.value) || 90,
                })
              }
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid",
                borderColor: "grey.300",
                borderRadius: 8,
                outline: "none",
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: "grey.500", mt: 0.5, display: "block" }}
            >
              超过此天数的归档通知将被永久删除
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            p: 3,
            borderTop: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "flex-end",
            gap: 1.5,
          }}
        >
          <Box
            onClick={onClose}
            sx={{
              px: 2,
              py: 1,
              color: "grey.700",
              bgcolor: "grey.100",
              borderRadius: 2,
              cursor: "pointer",
              "&:hover": { bgcolor: "grey.200" },
            }}
          >
            取消
          </Box>
          <Box
            onClick={handleSubmit}
            sx={{
              px: 2,
              py: 1,
              bgcolor: "primary.main",
              color: "white",
              borderRadius: 2,
              cursor: "pointer",
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            保存
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// Archived Notification Detail Modal
interface ArchivedNotificationDetailModalProps {
  notification: ArchivedNotification;
  onClose: () => void;
}

const ArchivedNotificationDetailModal: React.FC<
  ArchivedNotificationDetailModalProps
> = ({ notification, onClose }) => {
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

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        p: 2,
      }}
    >
      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 6,
          width: "100%",
          maxWidth: 600,
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "grey.900" }}>
            归档通知详情
          </Typography>
        </Box>

        <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 500,
                color: "grey.500",
                textTransform: "uppercase",
                mb: 0.5,
                display: "block",
              }}
            >
              标题
            </Typography>
            <Typography sx={{ color: "grey.900" }}>
              {notification.title}
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 500,
                color: "grey.500",
                textTransform: "uppercase",
                mb: 0.5,
                display: "block",
              }}
            >
              内容
            </Typography>
            <Typography sx={{ color: "grey.700" }}>
              {notification.content}
            </Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 500,
                  color: "grey.500",
                  textTransform: "uppercase",
                  mb: 0.5,
                  display: "block",
                }}
              >
                类型
              </Typography>
              <Typography sx={{ color: "grey.700" }}>
                {getTypeLabel(notification.notification_type)}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 500,
                  color: "grey.500",
                  textTransform: "uppercase",
                  mb: 0.5,
                  display: "block",
                }}
              >
                优先级
              </Typography>
              <Typography sx={{ color: "grey.700" }}>
                {notification.priority >= 4
                  ? "紧急"
                  : notification.priority >= 3
                    ? "高"
                    : notification.priority >= 2
                      ? "中"
                      : "低"}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 500,
                  color: "grey.500",
                  textTransform: "uppercase",
                  mb: 0.5,
                  display: "block",
                }}
              >
                原创建时间
              </Typography>
              <Typography sx={{ color: "grey.700" }}>
                {new Date(notification.created_at).toLocaleString("zh-CN")}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 500,
                  color: "grey.500",
                  textTransform: "uppercase",
                  mb: 0.5,
                  display: "block",
                }}
              >
                归档时间
              </Typography>
              <Typography sx={{ color: "grey.700" }}>
                {new Date(notification.archived_at).toLocaleString("zh-CN")}
              </Typography>
            </Box>
          </Box>

          {notification.read_at && (
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 500,
                  color: "grey.500",
                  textTransform: "uppercase",
                  mb: 0.5,
                  display: "block",
                }}
              >
                阅读时间
              </Typography>
              <Typography sx={{ color: "grey.700" }}>
                {new Date(notification.read_at).toLocaleString("zh-CN")}
              </Typography>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            p: 3,
            borderTop: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Box
            onClick={onClose}
            sx={{
              px: 2,
              py: 1,
              bgcolor: "grey.100",
              color: "grey.700",
              borderRadius: 2,
              cursor: "pointer",
              "&:hover": { bgcolor: "grey.200" },
            }}
          >
            关闭
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default NotificationArchivePage;
