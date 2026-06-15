/**
 * InteractionManagementPage 重构版本
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 */

import React, { useState, useCallback } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
} from "@mui/material";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import type {
  Interaction,
  CreateInteractionRequest,
  UpdateInteractionRequest,
} from "@/api/crm";
import { crmApi } from "@/api/crm";
import { useAppStore } from "@/store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "@/components/templates";
import { PageHeader } from "@/components/layout";
import { FilterBar, type FilterConfig } from "@/components/mui";

// ============ 列定义 ============
const columns: ColumnDef<Interaction>[] = [
  {
    id: "subject",
    header: "主题",
    accessor: "subject",
    sortable: true,
    render: (value) => value || "-",
  },
  {
    id: "type",
    header: "类型",
    accessor: "type",
    width: 100,
    render: (value) => {
      const typeMap: Record<string, { label: string; variant: "filled" | "outlined" }> = {
        call: { label: "电话", variant: "filled" },
        email: { label: "邮件", variant: "filled" },
        meeting: { label: "会议", variant: "outlined" },
        visit: { label: "拜访", variant: "outlined" },
        other: { label: "其他", variant: "outlined" },
      };
      const type = typeMap[value] || { label: value, variant: "outlined" as const };
      return (
        <Chip
          size="small"
          variant={type.variant}
          label={type.label}
        />
      );
    },
  },
  {
    id: "scheduled_at",
    header: "计划时间",
    accessor: "scheduled_at",
    width: 160,
    render: (value) =>
      value ? new Date(value).toLocaleString("zh-CN") : "-",
  },
  {
    id: "completed_at",
    header: "完成时间",
    accessor: "completed_at",
    width: 160,
    render: (value) =>
      value ? new Date(value).toLocaleString("zh-CN") : "-",
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    width: 100,
    render: (value) => {
      const statusMap: Record<string, { label: string; color: "success" | "info" | "default" }> = {
        scheduled: { label: "已计划", color: "info" },
        completed: { label: "已完成", color: "success" },
        cancelled: { label: "已取消", color: "default" },
      };
      const status = statusMap[value] || { label: value, color: "default" as const };
      return <Chip size="small" color={status.color} label={status.label} />;
    },
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (interaction: Interaction) => void,
  onEdit: (interaction: Interaction) => void,
  onDelete: (interaction: Interaction) => void,
): RowAction<Interaction>[] => [
  {
    label: "查看",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
  {
    label: "编辑",
    icon: <Edit style={{ width: 16, height: 16 }} />,
    onClick: onEdit,
  },
  {
    label: "删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    onClick: onDelete,
    color: "error",
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "search",
    placeholder: "搜索交互主题...",
  },
  {
    id: "type",
    label: "类型",
    type: "select",
    options: [
      { value: "all", label: "全部类型" },
      { value: "call", label: "电话" },
      { value: "email", label: "邮件" },
      { value: "meeting", label: "会议" },
      { value: "visit", label: "拜访" },
      { value: "other", label: "其他" },
    ],
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "all", label: "全部状态" },
      { value: "scheduled", label: "已计划" },
      { value: "completed", label: "已完成" },
      { value: "cancelled", label: "已取消" },
    ],
  },
];

// ============ 批量操作 ============
const batchActions = [
  {
    label: "批量删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    color: "error" as const,
  },
];

// ============ 组件 ============
const InteractionManagementPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    items: Interaction[];
    total: number;
    page: number;
    page_size: number;
  }>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // 模态框状态
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);

  // 行选择
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 表单数据
  const [formData, setFormData] = useState<CreateInteractionRequest>({
    type: "call",
    subject: "",
    content: "",
    scheduled_at: "",
    notes: "",
  });

  // 获取交互记录列表
  const fetchInteractions = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: data.page,
        pageSize: data.page_size,
      };
      if (searchText) params.search = searchText;
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await crmApi.interactions.list(params);
      if (response.success && response.data) {
        setData({
          items: response.data.items || [],
          total: response.data.total || 0,
          page: response.data.page || 1,
          page_size: response.data.page_size || 10,
        });
      }
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "加载失败",
        message: error.message || "获取交互记录数据失败",
      });
    } finally {
      setLoading(false);
    }
  }, [data.page, data.page_size, searchText, typeFilter, statusFilter, addNotification]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "type") setTypeFilter(value);
      if (filterId === "status") setStatusFilter(value);
    },
    [],
  );

  // 处理分页变化
  const handlePageChange = useCallback((page: number) => {
    setData((prev) => ({ ...prev, page }));
  }, []);

  // 处理行选择
  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  // 处理查看
  const handleView = useCallback((interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setShowDetailDialog(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setFormData({
      customer_id: interaction.customer_id,
      contact_id: interaction.contact_id,
      type: interaction.type,
      subject: interaction.subject || "",
      content: interaction.content || "",
      scheduled_at: interaction.scheduled_at || "",
      notes: "",
    });
    setShowDialog(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback(
    async (interaction: Interaction) => {
      if (!window.confirm(`确定要删除交互记录"${interaction.subject}"吗?`)) return;
      try {
        await crmApi.interactions.delete(interaction.id);
        addNotification({
          type: "success",
          title: "删除成功",
          message: "交互记录已删除",
        });
        fetchInteractions();
      } catch (error: any) {
        addNotification({
          type: "error",
          title: "删除失败",
          message: error.message || "无法删除交互记录",
        });
      }
    },
    [addNotification, fetchInteractions],
  );

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedInteraction) {
        await crmApi.interactions.update(
          selectedInteraction.id,
          formData as UpdateInteractionRequest,
        );
        addNotification({
          type: "success",
          title: "更新成功",
          message: "交互记录已更新",
        });
      } else {
        await crmApi.interactions.create(formData);
        addNotification({
          type: "success",
          title: "创建成功",
          message: "新交互记录已创建",
        });
      }
      setShowDialog(false);
      resetForm();
      fetchInteractions();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "操作失败",
        message: selectedInteraction ? "更新交互记录失败" : "创建交互记录失败",
      });
    }
  };

  // 处理批量删除
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 条交互记录吗?`)) return;
    try {
      await crmApi.interactions.batchDelete(selectedIds);
      addNotification({
        type: "success",
        title: "删除成功",
        message: `已删除 ${selectedIds.length} 条交互记录`,
      });
      setSelectedIds([]);
      fetchInteractions();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "删除失败",
        message: error.message || "批量删除失败",
      });
    }
  }, [selectedIds, addNotification, fetchInteractions]);

  // 重置表单
  const resetForm = () => {
    setSelectedInteraction(null);
    setFormData({
      type: "call",
      subject: "",
      content: "",
      scheduled_at: "",
      notes: "",
    });
  };

  // 初始加载
  React.useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  return (
    <>
      <PageHeader
        title="交互记录管理"
        subtitle={`共 ${data.total} 条交互记录`}
        actions={
          <>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
            >
              新增交互
            </Button>
          </>
        }
      />

      <ListPageTemplate
        columns={columns}
        data={data.items}
        loading={loading}
        rowActions={getRowActions(handleView, handleEdit, handleDelete)}
        filters={filters}
        onFilterChange={handleFilterChange}
        pagination={{
          page: data.page,
          pageSize: data.page_size,
          total: data.total,
          onPageChange: handlePageChange,
        }}
        onRowClick={handleView}
        emptyMessage="暂无交互记录数据"
        selection={{
          selected: selectedIds,
          onChange: handleSelectionChange,
        }}
        batchActions={batchActions}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedInteraction ? "编辑交互记录" : "新增交互记录"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2,
                py: 1,
              }}
            >
              <FormControl fullWidth size="small">
                <InputLabel htmlFor="type">类型 *</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  label="类型 *"
                >
                  <MenuItem value="call">电话</MenuItem>
                  <MenuItem value="email">邮件</MenuItem>
                  <MenuItem value="meeting">会议</MenuItem>
                  <MenuItem value="visit">拜访</MenuItem>
                  <MenuItem value="other">其他</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="主题"
                size="small"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
              />
              <Box sx={{ gridColumn: "1 / -1" }}>
                <TextField
                  label="内容"
                  size="small"
                  multiline
                  rows={4}
                  fullWidth
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                />
              </Box>
              <TextField
                label="计划时间"
                size="small"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={formData.scheduled_at}
                onChange={(e) =>
                  setFormData({ ...formData, scheduled_at: e.target.value })
                }
              />
              {selectedInteraction && (
                <FormControl fullWidth size="small">
                  <InputLabel htmlFor="status">状态</InputLabel>
                  <Select
                    value={selectedInteraction.status}
                    onChange={(e) =>
                      setSelectedInteraction({
                        ...selectedInteraction,
                        status: e.target.value,
                      })
                    }
                    label="状态"
                  >
                    <MenuItem value="scheduled">已计划</MenuItem>
                    <MenuItem value="completed">已完成</MenuItem>
                    <MenuItem value="cancelled">已取消</MenuItem>
                  </Select>
                </FormControl>
              )}
              <Box sx={{ gridColumn: "1 / -1" }}>
                <TextField
                  label="备注"
                  size="small"
                  multiline
                  rows={3}
                  fullWidth
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button variant="contained" onClick={handleSubmit}>
              保存
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>交互记录详情</DialogTitle>
        {selectedInteraction && (
          <DialogContent dividers>
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  类型
                </Box>
                <Box>
                  {(() => {
                    const typeMap: Record<string, { label: string; variant: "filled" | "outlined" }> = {
                      call: { label: "电话", variant: "filled" },
                      email: { label: "邮件", variant: "filled" },
                      meeting: { label: "会议", variant: "outlined" },
                      visit: { label: "拜访", variant: "outlined" },
                      other: { label: "其他", variant: "outlined" },
                    };
                    const type = typeMap[selectedInteraction.type] || { label: selectedInteraction.type, variant: "outlined" as const };
                    return <Chip size="small" variant={type.variant} label={type.label} />;
                  })()}
                </Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  主题
                </Box>
                <Box sx={{ fontWeight: 500 }}>
                  {selectedInteraction.subject || "-"}
                </Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  内容
                </Box>
                <Box>{selectedInteraction.content || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  计划时间
                </Box>
                <Box>
                  {selectedInteraction.scheduled_at
                    ? new Date(selectedInteraction.scheduled_at).toLocaleString("zh-CN")
                    : "-"}
                </Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  完成时间
                </Box>
                <Box>
                  {selectedInteraction.completed_at
                    ? new Date(selectedInteraction.completed_at).toLocaleString("zh-CN")
                    : "-"}
                </Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  状态
                </Box>
                <Box>
                  {(() => {
                    const statusMap: Record<string, { label: string; color: "success" | "info" | "default" }> = {
                      scheduled: { label: "已计划", color: "info" },
                      completed: { label: "已完成", color: "success" },
                      cancelled: { label: "已取消", color: "default" },
                    };
                    const status = statusMap[selectedInteraction.status] || { label: selectedInteraction.status, color: "default" as const };
                    return <Chip size="small" color={status.color} label={status.label} />;
                  })()}
                </Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  创建时间
                </Box>
                <Box>{new Date(selectedInteraction.created_at).toLocaleString("zh-CN")}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  更新时间
                </Box>
                <Box>{new Date(selectedInteraction.updated_at).toLocaleString("zh-CN")}</Box>
              </Box>
            </Box>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InteractionManagementPage;
