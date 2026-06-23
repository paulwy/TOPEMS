import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Archive,
  ChevronLeft,
  Search,
  Loader2,
  RefreshCw,
  Settings,
  RotateCcw,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { Button } from "@/components/ui/Button";
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
import { apiLogger } from "@/utils/logger";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from "@/components/templates";

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<ArchivedNotification | null>(null);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

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

  const filteredNotifications = useMemo(() => {
    if (!debouncedSearch) return archivedNotifications;
    const query = debouncedSearch.toLowerCase();
    return archivedNotifications.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query),
    );
  }, [archivedNotifications, debouncedSearch]);

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

  const columns: ColumnDef<ArchivedNotification>[] = useMemo(
    () => [
      {
        id: "title",
        label: "通知标题",
        render: (row) => (
          <Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: "grey.900" }}
            >
              {row.title}
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
              {row.content}
            </Typography>
          </Box>
        ),
      },
      {
        id: "notification_type",
        label: "类型",
        render: (row) => {
          const typeColor = getTypeColor(row.notification_type);
          return (
            <Box
              component="span"
              sx={{
                px: 1,
                py: 0.5,
                fontSize: "0.75rem",
                borderRadius: "9999px",
                ...typeColor,
              }}
            >
              {getTypeLabel(row.notification_type)}
            </Box>
          );
        },
      },
      {
        id: "created_at",
        label: "原创建时间",
        render: (row) => (
          <Typography variant="body2" color="text.secondary">
            {new Date(row.created_at).toLocaleString("zh-CN")}
          </Typography>
        ),
      },
      {
        id: "archived_at",
        label: "归档时间",
        render: (row) => (
          <Typography variant="body2" color="text.secondary">
            {new Date(row.archived_at).toLocaleString("zh-CN")}
          </Typography>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const rowActions: RowAction<ArchivedNotification>[] = useMemo(
    () => [
      {
        label: "查看详情",
        icon: <Eye size={16} />,
        onClick: (row) => setSelectedNotification(row),
      },
    ],
    [],
  );

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      <NotificationContainer
        notifications={notifications}
        onClose={hideNotification}
      />

      <ListPageTemplate
        title="通知归档管理"
        subtitle="查看和管理已归档的通知"
        backButton={{
          onClick: () => navigate("/notifications"),
        }}
        columns={columns}
        data={filteredNotifications}
        loading={loading}
        getRowId={(row) => row.id}
        searchable
        searchPlaceholder="搜索归档通知标题、内容..."
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        pagination={{
          page: page - 1,
          pageSize: 20,
          total: total,
          onPageChange: (p) => setPage(p + 1),
        }}
        rowActions={rowActions}
        onRefresh={loadData}
        actions={[
          {
            label: "执行自动归档",
            icon: <RotateCcw style={{ width: 16, height: 16 }} />,
            onClick: handleRunAutoArchive,
            variant: "outlined",
          },
          {
            label: "归档设置",
            icon: <Settings style={{ width: 16, height: 16 }} />,
            onClick: () => setShowConfigModal(true),
            variant: "outlined",
          },
        ]}
        headerContent={
          archiveConfig ? (
            <Box
              sx={{
                bgcolor: "warning.50",
                borderRadius: 2,
                p: 2,
                mb: 2,
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
                  <span>
                    自动归档天数：{archiveConfig.auto_archive_days} 天
                  </span>
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
          ) : null
        }
        emptyIcon={
          <Archive style={{ width: 48, height: 48, color: "#9e9e9e" }} />
        }
        emptyMessage="暂无归档通知"
      />

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
