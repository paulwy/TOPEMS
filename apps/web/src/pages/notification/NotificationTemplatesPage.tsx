import React, { useState, useEffect } from "react";
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  Search,
  Loader2,
  Archive,
  FileText,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import type {
  NotificationTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateStatusEnum,
  NotificationTypeEnum,
} from "@/api/notification";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/api/notification";
import { useNotification } from "@/hooks/useNotification";
import { NotificationContainer } from "@/components/NotificationContainer";

const NotificationTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();

  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<TemplateStatusEnum | "">(
    "",
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<NotificationTemplate | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadTemplates();
  }, [page, selectedStatus]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const statusParam = selectedStatus || undefined;
      const response = await getTemplates(page, 20, statusParam || undefined);
      if (response.success && response.data) {
        setTemplates(response.data.templates);
        setTotal(response.data.total);
      }
    } catch (err) {
      console.error("Error loading templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (data: CreateTemplateRequest) => {
    try {
      const res = await createTemplate(data);
      if (res.success) {
        success("模板创建成功");
        setShowCreateModal(false);
        loadTemplates();
      } else {
        error(res.message || "创建失败");
      }
    } catch (err: any) {
      error(err.message || "创建失败");
    }
  };

  const handleUpdateTemplate = async (
    id: string,
    data: CreateTemplateRequest | UpdateTemplateRequest,
  ) => {
    try {
      const updateData: UpdateTemplateRequest = { ...data, id };
      const res = await updateTemplate(id, updateData);
      if (res.success) {
        success("模板更新成功");
        setShowEditModal(false);
        setSelectedTemplate(null);
        loadTemplates();
      } else {
        error(res.message || "更新失败");
      }
    } catch (err: any) {
      error(err.message || "更新失败");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("确定要删除这个模板吗？")) return;

    try {
      const res = await deleteTemplate(id);
      if (res.success) {
        success("模板删除成功");
        loadTemplates();
      } else {
        error(res.message || "删除失败");
      }
    } catch (err: any) {
      error(err.message || "删除失败");
    }
  };

  const handleToggleArchive = async (id: string) => {
    try {
      const template = templates.find((t) => t.id === id);
      if (!template) return;

      const res = await updateTemplate(id, {
        id,
        status:
          template.status === "active"
            ? ("inactive" as TemplateStatusEnum)
            : ("active" as TemplateStatusEnum),
      });
      if (res.success) {
        success("模板状态更新成功");
        loadTemplates();
      } else {
        error(res.message || "更新失败");
      }
    } catch (err: any) {
      error(err.message || "更新失败");
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title_template.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatusBadge = (status: TemplateStatusEnum) => {
    switch (status) {
      case "active":
        return (
          <Box
            component="span"
            sx={{
              px: 1,
              py: 0.5,
              fontSize: "0.75rem",
              borderRadius: 4,
              bgcolor: "success.100",
              color: "success.700",
            }}
          >
            启用
          </Box>
        );
      case "inactive":
        return (
          <Box
            component="span"
            sx={{
              px: 1,
              py: 0.5,
              fontSize: "0.75rem",
              borderRadius: 4,
              bgcolor: "grey.100",
              color: "grey.700",
            }}
          >
            禁用
          </Box>
        );
      case "deprecated":
        return (
          <Box
            component="span"
            sx={{
              px: 1,
              py: 0.5,
              fontSize: "0.75rem",
              borderRadius: 4,
              bgcolor: "error.100",
              color: "error.700",
            }}
          >
            废弃
          </Box>
        );
      default:
        return null;
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
          boxShadow: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            maxWidth: 1400,
            mx: "auto",
            px: { xs: 2, sm: 3, lg: 4 },
            py: 3,
          }}
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
                  <FileText
                    size={28}
                    style={{ marginRight: 12 }}
                    color="#1976d2"
                  />
                  通知模板管理
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: "grey.500" }}>
                  管理和配置通知消息模板
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                component="button"
                onClick={loadTemplates}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                  py: 1,
                  color: "grey.700",
                  bgcolor: "grey.200",
                  borderRadius: 2,
                  "&:hover": { bgcolor: "grey.300" },
                  transition: "background-color 0.2s",
                }}
              >
                <RefreshCw size={20} style={{ marginRight: 8 }} />
                刷新
              </Box>
              <Box
                component="button"
                onClick={() => setShowCreateModal(true)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                  py: 1,
                  bgcolor: "primary.main",
                  color: "white",
                  borderRadius: 2,
                  "&:hover": { bgcolor: "primary.dark" },
                  transition: "background-color 0.2s",
                }}
              >
                <Plus size={20} style={{ marginRight: 8 }} />
                新增模板
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Filters */}
      <Box
        sx={{ maxWidth: 1400, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}
      >
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
              <Box
                sx={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              >
                <Search size={20} color="#666" />
              </Box>
              <Box
                component="input"
                type="text"
                placeholder="搜索模板名称、描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  width: "100%",
                  pl: 5,
                  pr: 2,
                  py: 1,
                  border: 1,
                  borderColor: "grey.300",
                  borderRadius: 2,
                  "&:focus": {
                    outline: "none",
                    borderColor: "primary.main",
                    boxShadow: 2,
                  },
                }}
              />
            </Box>

            <Box
              component="select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as TemplateStatusEnum | "");
                setPage(1);
              }}
              sx={{
                px: 2,
                py: 1,
                border: 1,
                borderColor: "grey.300",
                borderRadius: 2,
                "&:focus": {
                  outline: "none",
                  borderColor: "primary.main",
                  boxShadow: 2,
                },
              }}
            >
              <option value="">全部状态</option>
              <option value="active">启用</option>
              <option value="inactive">禁用</option>
              <option value="deprecated">废弃</option>
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
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Loader2
                size={48}
                color="#1976d2"
                style={{
                  margin: "0 auto",
                  animation: "spin 1s linear infinite",
                }}
              />
              <Typography variant="body2" sx={{ mt: 1, color: "grey.500" }}>
                加载中...
              </Typography>
            </Box>
          ) : filteredTemplates.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <FileText
                size={48}
                color="#666"
                style={{ margin: "0 auto 12px" }}
              />
              <Typography variant="body2" sx={{ color: "grey.500" }}>
                暂无模板数据
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ overflowX: "auto" }}>
                <Box
                  component="table"
                  sx={{
                    minWidth: "100%",
                    "& > * + *": { borderTop: 1, borderColor: "grey.200" },
                  }}
                >
                  <Box component="thead" sx={{ bgcolor: "grey.50" }}>
                    <Box component="tr">
                      <Box
                        component="th"
                        sx={{
                          px: 3,
                          py: 2,
                          textAlign: "left",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "grey.500",
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        模板名称
                      </Box>
                      <Box
                        component="th"
                        sx={{
                          px: 3,
                          py: 2,
                          textAlign: "left",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "grey.500",
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        类型
                      </Box>
                      <Box
                        component="th"
                        sx={{
                          px: 3,
                          py: 2,
                          textAlign: "left",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "grey.500",
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        标题模板
                      </Box>
                      <Box
                        component="th"
                        sx={{
                          px: 3,
                          py: 2,
                          textAlign: "left",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "grey.500",
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        状态
                      </Box>
                      <Box
                        component="th"
                        sx={{
                          px: 3,
                          py: 2,
                          textAlign: "left",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "grey.500",
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        优先级
                      </Box>
                      <Box
                        component="th"
                        sx={{
                          px: 3,
                          py: 2,
                          textAlign: "left",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "grey.500",
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        创建时间
                      </Box>
                      <Box
                        component="th"
                        sx={{
                          px: 3,
                          py: 2,
                          textAlign: "right",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "grey.500",
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        操作
                      </Box>
                    </Box>
                  </Box>
                  <Box
                    component="tbody"
                    sx={{
                      bgcolor: "background.paper",
                      "& > * + *": { borderTop: 1, borderColor: "grey.200" },
                    }}
                  >
                    {filteredTemplates.map((template) => {
                      const typeColor = getTypeColor(
                        template.notification_type,
                      );
                      return (
                        <Box
                          component="tr"
                          key={template.id}
                          sx={{
                            "&:hover": { bgcolor: "grey.50" },
                            transition: "background-color 0.2s",
                          }}
                        >
                          <Box
                            component="td"
                            sx={{ px: 3, py: 2.5, whiteSpace: "nowrap" }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  bgcolor: "primary.100",
                                  borderRadius: 2,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  mr: 1.5,
                                }}
                              >
                                <Bell size={20} color="#1976d2" />
                              </Box>
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 500, color: "grey.900" }}
                                >
                                  {template.name}
                                </Typography>
                                {template.description && (
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: "0.75rem",
                                      color: "grey.500",
                                      maxWidth: 200,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {template.description}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </Box>
                          <Box
                            component="td"
                            sx={{ px: 3, py: 2.5, whiteSpace: "nowrap" }}
                          >
                            <Box
                              component="span"
                              sx={{
                                px: 1,
                                py: 0.5,
                                fontSize: "0.75rem",
                                borderRadius: 4,
                                bgcolor: typeColor.bg,
                                color: typeColor.text,
                              }}
                            >
                              {getTypeLabel(template.notification_type)}
                            </Box>
                          </Box>
                          <Box
                            component="td"
                            sx={{ px: 3, py: 2.5, whiteSpace: "nowrap" }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: "grey.900",
                                maxWidth: 200,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {template.title_template}
                            </Typography>
                          </Box>
                          <Box
                            component="td"
                            sx={{ px: 3, py: 2.5, whiteSpace: "nowrap" }}
                          >
                            {getStatusBadge(template.status)}
                          </Box>
                          <Box
                            component="td"
                            sx={{
                              px: 3,
                              py: 2.5,
                              whiteSpace: "nowrap",
                              fontSize: "0.875rem",
                              color: "grey.500",
                            }}
                          >
                            {(template.default_priority ?? 0) >= 4
                              ? "紧急"
                              : (template.default_priority ?? 0) >= 3
                                ? "高"
                                : (template.default_priority ?? 0) >= 2
                                  ? "中"
                                  : "低"}
                          </Box>
                          <Box
                            component="td"
                            sx={{
                              px: 3,
                              py: 2.5,
                              whiteSpace: "nowrap",
                              fontSize: "0.875rem",
                              color: "grey.500",
                            }}
                          >
                            {new Date(template.created_at).toLocaleDateString(
                              "zh-CN",
                            )}
                          </Box>
                          <Box
                            component="td"
                            sx={{
                              px: 3,
                              py: 2.5,
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
                                gap: 0.5,
                              }}
                            >
                              <Box
                                component="button"
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setShowPreviewModal(true);
                                }}
                                sx={{
                                  p: 0.5,
                                  color: "primary.main",
                                  "&:hover": { bgcolor: "primary.100" },
                                  borderRadius: 1,
                                  transition: "all 0.2s",
                                }}
                                title="预览"
                              >
                                <Eye size={16} />
                              </Box>
                              <Box
                                component="button"
                                onClick={() => handleToggleArchive(template.id)}
                                sx={{
                                  p: 0.5,
                                  color: "warning.main",
                                  "&:hover": { bgcolor: "warning.100" },
                                  borderRadius: 1,
                                  transition: "all 0.2s",
                                }}
                                title={
                                  template.status === "active" ? "禁用" : "启用"
                                }
                              >
                                <Archive size={16} />
                              </Box>
                              <Box
                                component="button"
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setShowEditModal(true);
                                }}
                                sx={{
                                  p: 0.5,
                                  color: "primary.main",
                                  "&:hover": { bgcolor: "primary.100" },
                                  borderRadius: 1,
                                  transition: "all 0.2s",
                                }}
                                title="编辑"
                              >
                                <Edit size={16} />
                              </Box>
                              <Box
                                component="button"
                                onClick={() =>
                                  handleDeleteTemplate(template.id)
                                }
                                sx={{
                                  p: 0.5,
                                  color: "error.main",
                                  "&:hover": { bgcolor: "error.100" },
                                  borderRadius: 1,
                                  transition: "all 0.2s",
                                }}
                                title="删除"
                              >
                                <Trash2 size={16} />
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
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
                      component="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
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
                        "&:hover": { bgcolor: "grey.50" },
                        disabled: { opacity: 0.5, cursor: "not-allowed" },
                      }}
                    >
                      上一页
                    </Box>
                    <Box
                      component="button"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page >= totalPages}
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
                        "&:hover": { bgcolor: "grey.50" },
                        disabled: { opacity: 0.5, cursor: "not-allowed" },
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

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <TemplateFormModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={
            handleCreateTemplate as (
              data: CreateTemplateRequest | UpdateTemplateRequest,
            ) => void
          }
        />
      )}

      {showEditModal && selectedTemplate && (
        <TemplateFormModal
          template={selectedTemplate}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTemplate(null);
          }}
          onSubmit={(data) => handleUpdateTemplate(selectedTemplate.id, data)}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </Box>
  );
};

// Template Form Modal Component
interface TemplateFormModalProps {
  template?: NotificationTemplate;
  onClose: () => void;
  onSubmit: (data: CreateTemplateRequest | UpdateTemplateRequest) => void;
}

const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  template,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<CreateTemplateRequest>({
    name: template?.name || "",
    description: template?.description || "",
    notification_type: template?.notification_type || "system",
    title_template: template?.title_template || "",
    content_template: template?.content_template || "",
    data_schema: template?.data_schema || undefined,
    default_priority: template?.default_priority || 2,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "rgba(0, 0, 0, 0.5)",
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
          boxShadow: 3,
          width: "100%",
          maxWidth: 800,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "grey.900" }}>
            {template ? "编辑模板" : "新增模板"}
          </Typography>
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ flex: 1, overflowY: "auto", p: 3 }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: 1, md: 2 },
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, color: "grey.700", mb: 0.5 }}
                >
                  模板名称 *
                </Typography>
                <Box
                  component="input"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  sx={{
                    width: "100%",
                    px: 1.5,
                    py: 1,
                    border: 1,
                    borderColor: "grey.300",
                    borderRadius: 2,
                    "&:focus": {
                      outline: "none",
                      borderColor: "primary.main",
                      boxShadow: 2,
                    },
                  }}
                  placeholder="请输入模板名称"
                />
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, color: "grey.700", mb: 0.5 }}
                >
                  通知类型 *
                </Typography>
                <Box
                  component="select"
                  required
                  value={formData.notification_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      notification_type: e.target.value as NotificationTypeEnum,
                    })
                  }
                  sx={{
                    width: "100%",
                    px: 1.5,
                    py: 1,
                    border: 1,
                    borderColor: "grey.300",
                    borderRadius: 2,
                    "&:focus": {
                      outline: "none",
                      borderColor: "primary.main",
                      boxShadow: 2,
                    },
                  }}
                >
                  <option value="system">系统通知</option>
                  <option value="workflow">审批通知</option>
                  <option value="reminder">提醒通知</option>
                  <option value="alert">告警通知</option>
                  <option value="message">消息通知</option>
                </Box>
              </Box>
            </Box>

            <Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, color: "grey.700", mb: 0.5 }}
              >
                描述
              </Typography>
              <Box
                component="textarea"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                sx={{
                  width: "100%",
                  px: 1.5,
                  py: 1,
                  border: 1,
                  borderColor: "grey.300",
                  borderRadius: 2,
                  "&:focus": {
                    outline: "none",
                    borderColor: "primary.main",
                    boxShadow: 2,
                  },
                }}
                rows={2}
                placeholder="请输入模板描述"
              />
            </Box>

            <Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, color: "grey.700", mb: 0.5 }}
              >
                标题模板 *
              </Typography>
              <Box
                component="input"
                type="text"
                required
                value={formData.title_template}
                onChange={(e) =>
                  setFormData({ ...formData, title_template: e.target.value })
                }
                sx={{
                  width: "100%",
                  px: 1.5,
                  py: 1,
                  border: 1,
                  borderColor: "grey.300",
                  borderRadius: 2,
                  "&:focus": {
                    outline: "none",
                    borderColor: "primary.main",
                    boxShadow: 2,
                  },
                }}
                placeholder="请输入标题模板，使用 {{variable}} 格式定义变量"
              />
            </Box>

            <Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, color: "grey.700", mb: 0.5 }}
              >
                内容模板 *
              </Typography>
              <Box
                component="textarea"
                required
                value={formData.content_template}
                onChange={(e) =>
                  setFormData({ ...formData, content_template: e.target.value })
                }
                sx={{
                  width: "100%",
                  px: 1.5,
                  py: 1,
                  border: 1,
                  borderColor: "grey.300",
                  borderRadius: 2,
                  "&:focus": {
                    outline: "none",
                    borderColor: "primary.main",
                    boxShadow: 2,
                  },
                  fontFamily: "monospace",
                }}
                rows={6}
                placeholder="请输入内容模板，使用 {{variable}} 格式定义变量"
              />
              <Typography
                variant="body2"
                sx={{ fontSize: "0.75rem", color: "grey.500", mt: 0.5 }}
              >
                使用 {"{{variable}}"} 格式定义变量
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, color: "grey.700", mb: 0.5 }}
              >
                默认优先级
              </Typography>
              <Box
                component="select"
                value={formData.default_priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    default_priority: parseInt(e.target.value),
                  })
                }
                sx={{
                  width: "100%",
                  px: 1.5,
                  py: 1,
                  border: 1,
                  borderColor: "grey.300",
                  borderRadius: 2,
                  "&:focus": {
                    outline: "none",
                    borderColor: "primary.main",
                    boxShadow: 2,
                  },
                }}
              >
                <option value={1}>低</option>
                <option value={2}>中</option>
                <option value={3}>高</option>
                <option value={4}>紧急</option>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            p: 3,
            borderTop: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "flex-end",
            gap: 1,
          }}
        >
          <Box
            component="button"
            type="button"
            onClick={onClose}
            sx={{
              px: 2,
              py: 1,
              color: "grey.700",
              bgcolor: "grey.100",
              borderRadius: 2,
              "&:hover": { bgcolor: "grey.200" },
            }}
          >
            取消
          </Box>
          <Box
            component="button"
            onClick={handleSubmit}
            sx={{
              px: 2,
              py: 1,
              bgcolor: "primary.main",
              color: "white",
              borderRadius: 2,
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            {template ? "保存" : "创建"}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// Template Preview Modal Component
interface TemplatePreviewModalProps {
  template: NotificationTemplate;
  onClose: () => void;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  template,
  onClose,
}) => {
  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "rgba(0, 0, 0, 0.5)",
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
          boxShadow: 3,
          width: "100%",
          maxWidth: 900,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "grey.900" }}>
            模板预览
          </Typography>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: "grey.900", mb: 1 }}
            >
              {template.name}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                fontSize: "0.875rem",
                color: "grey.500",
              }}
            >
              <span>类型：{getTypeLabel(template.notification_type)}</span>
              <span>状态：{template.status}</span>
              <span>优先级：{template.default_priority}</span>
            </Box>
            {template.description && (
              <Typography variant="body2" sx={{ mt: 1, color: "grey.600" }}>
                {template.description}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              bgcolor: "grey.50",
              borderRadius: 2,
              p: 3,
              border: 1,
              borderColor: "grey.200",
              mb: 2,
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "grey.900", mb: 1 }}
            >
              标题模板：
            </Typography>
            <Box
              component="pre"
              sx={{
                whiteSpace: "pre-wrap",
                fontSize: "0.875rem",
                color: "grey.700",
                fontFamily: "monospace",
              }}
            >
              {template.title_template}
            </Box>
          </Box>

          <Box
            sx={{
              bgcolor: "grey.50",
              borderRadius: 2,
              p: 3,
              border: 1,
              borderColor: "grey.200",
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "grey.900", mb: 1 }}
            >
              内容模板：
            </Typography>
            <Box
              component="pre"
              sx={{
                whiteSpace: "pre-wrap",
                fontSize: "0.875rem",
                color: "grey.700",
                fontFamily: "monospace",
              }}
            >
              {template.content_template}
            </Box>
          </Box>

          {template.data_schema && (
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: "grey.900", mb: 1 }}
              >
                数据模式：
              </Typography>
              <Box
                component="pre"
                sx={{
                  whiteSpace: "pre-wrap",
                  fontSize: "0.75rem",
                  color: "grey.700",
                  fontFamily: "monospace",
                  bgcolor: "grey.50",
                  p: 2,
                  borderRadius: 2,
                }}
              >
                {JSON.stringify(template.data_schema, null, 2)}
              </Box>
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
            component="button"
            onClick={onClose}
            sx={{
              px: 2,
              py: 1,
              bgcolor: "grey.100",
              color: "grey.700",
              borderRadius: 2,
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

export default NotificationTemplatesPage;
