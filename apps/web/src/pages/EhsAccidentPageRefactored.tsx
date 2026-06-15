/**
 * EhsAccidentPage 重构版本 (事故记录)
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 */

import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  AlertCircle,
  FileText,
} from "lucide-react";
import {
  ehsApi,
  type Incident,
  type CreateIncidentRequest,
} from "../api/ehs";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../components/templates";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui";

// ============ 类型别名 ============
type IncidentType = "near_miss" | "accident" | "injury" | "environmental" | "equipment";
type SeverityLevel = "near_miss" | "minor" | "serious" | "fatal";
type IncidentStatus = "pending" | "investigating" | "resolved" | "closed";

// ============ 列定义 ============
const columns: ColumnDef<Incident>[] = [
  {
    id: "title",
    header: "事故标题",
    accessor: "title",
    sortable: true,
    width: 250,
  },
  {
    id: "incident_type",
    header: "事故类型",
    accessor: "incident_type",
    render: (value: IncidentType) => {
      const typeLabels: Record<IncidentType, string> = {
        near_miss: "未遂事件",
        accident: "事故",
        injury: "伤害",
        environmental: "环境事件",
        equipment: "设备事件",
      };
      const typeColors: Record<IncidentType, { bg: string; color: string }> = {
        near_miss: { bg: "info.light", color: "info.dark" },
        accident: { bg: "error.light", color: "error.dark" },
        injury: { bg: "warning.light", color: "warning.dark" },
        environmental: { bg: "success.light", color: "success.dark" },
        equipment: { bg: "grey.200", color: "grey.700" },
      };
      const colors = typeColors[value] || { bg: "grey.200", color: "grey.700" };
      return (
        <Chip
          label={typeLabels[value] || value}
          size="small"
          sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 500 }}
        />
      );
    },
  },
  {
    id: "severity",
    header: "严重程度",
    accessor: "severity",
    render: (value: SeverityLevel) => {
      const severityLabels: Record<SeverityLevel, string> = {
        near_miss: "未遂",
        minor: "轻微",
        serious: "严重",
        fatal: "致命",
      };
      const severityColors: Record<SeverityLevel, { bg: string; color: string }> = {
        near_miss: { bg: "info.light", color: "info.dark" },
        minor: { bg: "warning.light", color: "warning.dark" },
        serious: { bg: "error.light", color: "error.dark" },
        fatal: { bg: "error.dark", color: "error.contrastText" },
      };
      const colors = severityColors[value] || { bg: "grey.200", color: "grey.700" };
      return (
        <Chip
          label={severityLabels[value] || value}
          size="small"
          sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 500 }}
        />
      );
    },
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value: IncidentStatus) => {
      const statusLabels: Record<IncidentStatus, string> = {
        pending: "待处理",
        investigating: "调查中",
        resolved: "已解决",
        closed: "已关闭",
      };
      const statusColors: Record<IncidentStatus, { bg: string; color: string }> = {
        pending: { bg: "warning.light", color: "warning.dark" },
        investigating: { bg: "info.light", color: "info.dark" },
        resolved: { bg: "success.light", color: "success.dark" },
        closed: { bg: "grey.200", color: "grey.600" },
      };
      const colors = statusColors[value] || { bg: "grey.200", color: "grey.700" };
      return (
        <Chip
          label={statusLabels[value] || value}
          size="small"
          sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 500 }}
        />
      );
    },
  },
  {
    id: "location",
    header: "发生地点",
    accessor: "location",
    render: (value) => value || "-",
  },
  {
    id: "reported_by",
    header: "报告人",
    accessor: "reported_by",
    render: (value) => value || "-",
  },
  {
    id: "reported_at",
    header: "报告时间",
    accessor: "reported_at",
    render: (value) => {
      if (!value) return "-";
      return new Date(value).toLocaleDateString("zh-CN");
    },
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (incident: Incident) => void,
  onEdit: (incident: Incident) => void,
  onDelete: (incident: Incident) => void,
): RowAction<Incident>[] => [
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
    type: "text",
    value: "",
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "pending", label: "待处理" },
      { value: "investigating", label: "调查中" },
      { value: "resolved", label: "已解决" },
      { value: "closed", label: "已关闭" },
    ],
    value: "all",
  },
  {
    id: "severity",
    label: "严重程度",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "near_miss", label: "未遂" },
      { value: "minor", label: "轻微" },
      { value: "serious", label: "严重" },
      { value: "fatal", label: "致命" },
    ],
    value: "all",
  },
  {
    id: "incident_type",
    label: "事故类型",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "near_miss", label: "未遂事件" },
      { value: "accident", label: "事故" },
      { value: "injury", label: "伤害" },
      { value: "environmental", label: "环境事件" },
      { value: "equipment", label: "设备事件" },
    ],
    value: "all",
  },
];

// ============ 批量操作 ============
const batchActions = [
  {
    label: "批量删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    color: "error" as const,
  },
  {
    label: "批量导出",
    icon: <Download style={{ width: 16, height: 16 }} />,
  },
];

// ============ 组件 ============
const EhsAccidentPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    items: Incident[];
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // 行选择
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 表单数据
  const [formData, setFormData] = useState<Partial<CreateIncidentRequest>>({});

  // 获取事故列表
  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ehsApi.listIncidents({
        page: 1,
        page_size: 100,
        search: searchText !== "" ? searchText : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      if (response.success && response.data) {
        let items = response.data.data || [];
        // 按严重程度筛选（前端筛选）
        if (severityFilter !== "all") {
          items = items.filter(item => item.severity === severityFilter);
        }
        // 按事故类型筛选（前端筛选）
        if (typeFilter !== "all") {
          items = items.filter(item => item.incident_type === typeFilter);
        }
        setData({
          items: items,
          total: items.length,
          page: 1,
          page_size: 10,
        });
      }
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "加载失败",
        message: error.message || "获取事故数据失败",
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification, searchText, statusFilter, severityFilter, typeFilter]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "status") setStatusFilter(value);
      if (filterId === "severity") setSeverityFilter(value);
      if (filterId === "incident_type") setTypeFilter(value);
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
  const handleView = useCallback((incident: Incident) => {
    setSelectedIncident(incident);
    setShowViewModal(true);
  }, []);

  // 处理编辑
  const handleEdit = useCallback((incident: Incident) => {
    setSelectedIncident(incident);
    setFormData({
      title: incident.title,
      description: incident.description || undefined,
      incident_type: incident.incident_type,
      severity: incident.severity,
      location: incident.location || undefined,
      reported_by: incident.reported_by || undefined,
      reported_at: incident.reported_at || undefined,
      status: incident.status,
    });
    setShowEditModal(true);
  }, []);

  // 处理删除
  const handleDelete = useCallback(
    async (incident: Incident) => {
      if (!window.confirm(`确定要删除事故记录"${incident.title}"吗?`)) return;
      try {
        await ehsApi.deleteIncident(incident.id);
        addNotification({
          type: "success",
          title: "删除成功",
          message: "事故记录已删除",
        });
        fetchIncidents();
      } catch (error: any) {
        addNotification({
          type: "error",
          title: "删除失败",
          message: error.message || "无法删除事故记录",
        });
      }
    },
    [addNotification, fetchIncidents],
  );

  // 处理创建
  const handleCreate = useCallback(async () => {
    if (!formData.title?.trim()) {
      addNotification({
        type: "error",
        title: "验证失败",
        message: "请输入事故标题",
      });
      return;
    }
    try {
      const createData: CreateIncidentRequest = {
        title: formData.title,
        description: formData.description || null,
        incident_type: formData.incident_type || "accident",
        severity: formData.severity || "minor",
        location: formData.location || null,
        reported_by: formData.reported_by || null,
        reported_at: formData.reported_at || null,
        status: formData.status || "pending",
      };
      await ehsApi.createIncident(createData);
      addNotification({
        type: "success",
        title: "创建成功",
        message: "事故记录已创建",
      });
      setShowCreateModal(false);
      setFormData({});
      fetchIncidents();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "创建失败",
        message: error.message || "无法创建事故记录",
      });
    }
  }, [formData, addNotification, fetchIncidents]);

  // 处理更新
  const handleUpdate = useCallback(async () => {
    if (!selectedIncident) return;
    try {
      await ehsApi.updateIncident(selectedIncident.id, {
        title: formData.title,
        description: formData.description || null,
        incident_type: formData.incident_type,
        severity: formData.severity,
        location: formData.location || null,
        reported_by: formData.reported_by || null,
        reported_at: formData.reported_at || null,
        status: formData.status,
      });
      addNotification({
        type: "success",
        title: "更新成功",
        message: "事故记录已更新",
      });
      setShowEditModal(false);
      setFormData({});
      fetchIncidents();
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "更新失败",
        message: error.message || "无法更新事故记录",
      });
    }
  }, [selectedIncident, formData, addNotification, fetchIncidents]);

  // 初始加载
  React.useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  return (
    <>
      <PageHeader
        title="事故记录"
        subtitle={`共 ${data.total} 条记录`}
        showBack
        onBack={() => navigate(-1)}
        icon={<AlertCircle style={{ width: 24, height: 24 }} />}
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<Download style={{ width: 18, height: 18 }} />}
              onClick={() => {
                // TODO: 导出功能
              }}
            >
              导出
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={() => setShowCreateModal(true)}
              sx={{ backgroundColor: "#dc2626", "&:hover": { backgroundColor: "#b91c1c" } }}
            >
              新建事故
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
        emptyMessage="暂无事故数据"
        selection={{
          selected: selectedIds,
          onChange: handleSelectionChange,
        }}
        batchActions={batchActions}
      />

      {/* 查看模态框 */}
      <Dialog
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AlertCircle style={{ width: 20, height: 20, color: "#dc2626" }} />
          事故详情
        </DialogTitle>
        <DialogContent>
          {selectedIncident && (
            <Box sx={{ pt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  事故标题
                </Box>
                <Box sx={{ fontWeight: 500, fontSize: "1.1rem" }}>{selectedIncident.title}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  事故类型
                </Box>
                <Box>
                  {selectedIncident.incident_type === "near_miss" ? "未遂事件" :
                   selectedIncident.incident_type === "accident" ? "事故" :
                   selectedIncident.incident_type === "injury" ? "伤害" :
                   selectedIncident.incident_type === "environmental" ? "环境事件" : "设备事件"}
                </Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  严重程度
                </Box>
                <Box>
                  <Chip
                    label={
                      selectedIncident.severity === "near_miss" ? "未遂" :
                      selectedIncident.severity === "minor" ? "轻微" :
                      selectedIncident.severity === "serious" ? "严重" : "致命"
                    }
                    size="small"
                    sx={{
                      bgcolor: selectedIncident.severity === "fatal" ? "error.dark" :
                               selectedIncident.severity === "serious" ? "error.light" :
                               selectedIncident.severity === "minor" ? "warning.light" : "info.light",
                      color: selectedIncident.severity === "fatal" ? "error.contrastText" :
                             selectedIncident.severity === "serious" ? "error.dark" :
                             selectedIncident.severity === "minor" ? "warning.dark" : "info.dark",
                      fontWeight: 500,
                    }}
                  />
                </Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  状态
                </Box>
                <Box>
                  {selectedIncident.status === "pending" ? "待处理" :
                   selectedIncident.status === "investigating" ? "调查中" :
                   selectedIncident.status === "resolved" ? "已解决" : "已关闭"}
                </Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  发生地点
                </Box>
                <Box>{selectedIncident.location || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  报告人
                </Box>
                <Box>{selectedIncident.reported_by || "-"}</Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  报告时间
                </Box>
                <Box>
                  {selectedIncident.reported_at
                    ? new Date(selectedIncident.reported_at).toLocaleDateString("zh-CN")
                    : "-"}
                </Box>
              </Box>
              <Box>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  创建时间
                </Box>
                <Box>
                  {selectedIncident.created_at
                    ? new Date(selectedIncident.created_at).toLocaleDateString("zh-CN")
                    : "-"}
                </Box>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  事故描述
                </Box>
                <Box>{selectedIncident.description || "暂无描述"}</Box>
              </Box>
              {selectedIncident.root_cause && (
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                    根本原因
                  </Box>
                  <Box>{selectedIncident.root_cause}</Box>
                </Box>
              )}
              {selectedIncident.corrective_actions && (
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Box component="span" sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                    纠正措施
                  </Box>
                  <Box>{selectedIncident.corrective_actions}</Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowViewModal(false);
              if (selectedIncident) handleEdit(selectedIncident);
            }}
            sx={{ backgroundColor: "#dc2626", "&:hover": { backgroundColor: "#b91c1c" } }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>

      {/* 创建模态框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建事故记录</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="事故标题 *"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="请输入事故标题"
            />
            <FormControl fullWidth>
              <InputLabel>事故类型</InputLabel>
              <Select
                value={formData.incident_type || "accident"}
                label="事故类型"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    incident_type: e.target.value as IncidentType,
                  })
                }
              >
                <MenuItem value="near_miss">未遂事件</MenuItem>
                <MenuItem value="accident">事故</MenuItem>
                <MenuItem value="injury">伤害</MenuItem>
                <MenuItem value="environmental">环境事件</MenuItem>
                <MenuItem value="equipment">设备事件</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>严重程度</InputLabel>
              <Select
                value={formData.severity || "minor"}
                label="严重程度"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    severity: e.target.value as SeverityLevel,
                  })
                }
              >
                <MenuItem value="near_miss">未遂</MenuItem>
                <MenuItem value="minor">轻微</MenuItem>
                <MenuItem value="serious">严重</MenuItem>
                <MenuItem value="fatal">致命</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={formData.status || "pending"}
                label="状态"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as IncidentStatus,
                  })
                }
              >
                <MenuItem value="pending">待处理</MenuItem>
                <MenuItem value="investigating">调查中</MenuItem>
                <MenuItem value="resolved">已解决</MenuItem>
                <MenuItem value="closed">已关闭</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="发生地点"
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="请输入发生地点"
            />
            <TextField
              fullWidth
              label="报告人"
              value={formData.reported_by || ""}
              onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
              placeholder="请输入报告人"
            />
            <TextField
              fullWidth
              type="datetime-local"
              label="报告时间"
              value={formData.reported_at || ""}
              onChange={(e) => setFormData({ ...formData, reported_at: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="事故描述"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入事故描述"
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            sx={{ backgroundColor: "#dc2626", "&:hover": { backgroundColor: "#b91c1c" } }}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑模态框 */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>编辑事故记录</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="事故标题 *"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="请输入事故标题"
            />
            <FormControl fullWidth>
              <InputLabel>事故类型</InputLabel>
              <Select
                value={formData.incident_type || "accident"}
                label="事故类型"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    incident_type: e.target.value as IncidentType,
                  })
                }
              >
                <MenuItem value="near_miss">未遂事件</MenuItem>
                <MenuItem value="accident">事故</MenuItem>
                <MenuItem value="injury">伤害</MenuItem>
                <MenuItem value="environmental">环境事件</MenuItem>
                <MenuItem value="equipment">设备事件</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>严重程度</InputLabel>
              <Select
                value={formData.severity || "minor"}
                label="严重程度"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    severity: e.target.value as SeverityLevel,
                  })
                }
              >
                <MenuItem value="near_miss">未遂</MenuItem>
                <MenuItem value="minor">轻微</MenuItem>
                <MenuItem value="serious">严重</MenuItem>
                <MenuItem value="fatal">致命</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={formData.status || "pending"}
                label="状态"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as IncidentStatus,
                  })
                }
              >
                <MenuItem value="pending">待处理</MenuItem>
                <MenuItem value="investigating">调查中</MenuItem>
                <MenuItem value="resolved">已解决</MenuItem>
                <MenuItem value="closed">已关闭</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="发生地点"
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="请输入发生地点"
            />
            <TextField
              fullWidth
              label="报告人"
              value={formData.reported_by || ""}
              onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
              placeholder="请输入报告人"
            />
            <TextField
              fullWidth
              label="事故描述"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入事故描述"
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditModal(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleUpdate}
            sx={{ backgroundColor: "#dc2626", "&:hover": { backgroundColor: "#b91c1c" } }}
          >
            更新
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EhsAccidentPageRefactored;
