/**
 * HrmRecruitmentPage 重构后
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 * 5. 保持业务逻辑不变
 * 6. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Paper,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Briefcase,
  Users,
  Calendar,
  MapPin,
  Plus,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import {
  recruitmentApi,
  type RecruitmentPosition,
  type PaginatedResult,
} from "../api/hrm";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  StatCardGroup,
  EmptyState,
  type ColumnDef,
  type RowAction,
} from "../components/mui";
import { FilterBar, type FilterConfig } from "../components/mui/FilterBar";
import { PageHeader } from "../components/layout";

// ============ 列定义 ============
const getColumns = (
  getStatusBadge: (status: string) => JSX.Element,
): ColumnDef<RecruitmentPosition>[] => [
  {
    id: "title",
    header: "职位名称",
    accessor: "title",
    minWidth: 180,
    render: (row: RecruitmentPosition) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Briefcase sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {row.title || "-"}
        </Typography>
      </Box>
    ),
  },
  {
    id: "department",
    header: "部门",
    accessor: "department",
    minWidth: 120,
    render: (value: string) => (
      <Typography variant="body2">{value || "-"}</Typography>
    ),
  },
  {
    id: "location",
    header: "工作地点",
    accessor: "location",
    minWidth: 120,
    render: (value: string) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <MapPin sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{value || "-"}</Typography>
      </Box>
    ),
  },
  {
    id: "headcount",
    header: "招聘人数",
    accessor: "headcount",
    minWidth: 80,
    render: (value: number) => (
      <Chip size="small" label={value || 0} sx={{ bgcolor: "primary.light", color: "white" }} />
    ),
  },
  {
    id: "applicants",
    header: "应聘人数",
    accessor: "applicants",
    minWidth: 80,
    render: (value: number) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Users sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2">{value || 0}</Typography>
      </Box>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    width: 100,
    render: (row: RecruitmentPosition) => getStatusBadge(row.status),
  },
  {
    id: "created_at",
    header: "发布时间",
    accessor: "created_at",
    minWidth: 120,
    render: (value: string) => (
      <Typography variant="body2" sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
        {value ? new Date(value).toLocaleDateString() : "-"}
      </Typography>
    ),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (record: RecruitmentPosition) => void,
  onEdit: (record: RecruitmentPosition) => void,
  onDelete: (record: RecruitmentPosition) => void,
): RowAction<RecruitmentPosition>[] => [
  {
    label: "查看",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
  {
    label: "编辑",
    icon: <Edit style={{ width: 16, height: 16 }} />,
    onClick: onEdit,
    color: "primary",
  },
  {
    label: "删除",
    icon: <Trash2 style={{ width: 16, height: 16 }} />,
    onClick: (row) => onDelete(row),
    color: "error",
    divider: true,
  },
];

// ============ 筛选配置 ============
const getFilters = (): FilterConfig[] => [
  {
    id: "search",
    label: "搜索",
    type: "text",
    placeholder: "搜索职位名称...",
    width: 200,
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { label: "全部", value: "all" },
      { label: "招聘中", value: "open" },
      { label: "已暂停", value: "paused" },
      { label: "已关闭", value: "closed" },
    ],
  },
];

// ============ 组件 ============
const HrmRecruitmentPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 当前标签页
  const [activeTab, setActiveTab] = useState("positions");

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<RecruitmentPosition>>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<RecruitmentPosition | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<RecruitmentPosition>>({});

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    const config: Record<string, { color: "success" | "warning" | "default"; label: string }> = {
      open: { color: "success", label: "招聘中" },
      paused: { color: "warning", label: "已暂停" },
      closed: { color: "default", label: "已关闭" },
    };
    const c = config[status] || { color: "default", label: status };
    return (
      <Chip size="small" color={c.color} label={c.label} sx={{ fontWeight: 500 }} />
    );
  }, []);

  // 获取招聘职位列表
  const fetchPositions = useCallback(
    async (params?: any) => {
      setLoading(true);
      try {
        const response = await recruitmentApi.list(params);
        if (response.code === 200 && response.data) {
          setData(response.data as PaginatedResult<RecruitmentPosition>);
        }
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "获取招聘数据失败",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [addNotification],
  );

  // 初始加载
  React.useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  // 搜索处理
  const handleSearch = useCallback(() => {
    const params: any = {};
    if (searchText) params.search = searchText;
    if (statusFilter !== "all") params.status = statusFilter;
    fetchPositions(params);
  }, [searchText, statusFilter, fetchPositions]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchText("");
    setStatusFilter("all");
    fetchPositions();
  }, [fetchPositions]);

  // 新增
  const handleAdd = useCallback(() => {
    setSelectedPosition(null);
    setFormData({});
    setShowCreateModal(true);
  }, []);

  // 编辑
  const handleEdit = useCallback((record: RecruitmentPosition) => {
    setSelectedPosition(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  // 查看
  const handleView = useCallback((record: RecruitmentPosition) => {
    setSelectedPosition(record);
    setShowViewModal(true);
  }, []);

  // 删除
  const handleDelete = useCallback(
    async (record: RecruitmentPosition) => {
      if (!confirm(`确定要删除职位"${record.title}"吗？`)) return;
      try {
        await recruitmentApi.delete(record.id);
        addNotification({
          title: "成功",
          message: "删除成功",
          type: "success",
        });
        fetchPositions();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "删除失败",
          type: "error",
        });
      }
    },
    [addNotification, fetchPositions],
  );

  // 创建
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await recruitmentApi.create(formData);
        addNotification({
          title: "成功",
          message: "创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setFormData({});
        fetchPositions();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "创建失败",
          type: "error",
        });
      }
    },
    [addNotification, formData, fetchPositions],
  );

  // 更新
  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedPosition) return;
      try {
        await recruitmentApi.update(selectedPosition.id, formData);
        addNotification({
          title: "成功",
          message: "更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedPosition(null);
        fetchPositions();
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "更新失败",
          type: "error",
        });
      }
    },
    [addNotification, selectedPosition, formData, fetchPositions],
  );

  // 输入变化
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 统计卡片数据
  const stats = useMemo(() => {
    const items = data.items || [];
    return {
      total: items.length,
      open: items.filter((p) => p.status === "open").length,
      applicants: items.reduce((sum, p) => sum + (p.applicants || 0), 0),
      hired: items.reduce((sum, p) => sum + (p.hired || 0), 0),
    };
  }, [data.items]);

  const statCards = useMemo(
    () => [
      {
        id: "total",
        title: "职位总数",
        value: stats.total,
        icon: <Briefcase style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        id: "open",
        title: "招聘中",
        value: stats.open,
        icon: <Briefcase style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        id: "applicants",
        title: "应聘人数",
        value: stats.applicants,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: "info" as const,
      },
      {
        id: "hired",
        title: "已入职",
        value: stats.hired,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: "warning" as const,
      },
    ],
    [stats],
  );

  const columns = useMemo(() => getColumns(getStatusBadge), [getStatusBadge]);
  const rowActions = useMemo(() => getRowActions(handleView, handleEdit, handleDelete), [handleView, handleEdit, handleDelete]);
  const filterConfigs = useMemo(() => getFilters(), []);

  // 筛选变化处理
  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      if (filters.search !== undefined) setSearchText(filters.search);
      if (filters.status !== undefined) setStatusFilter(filters.status);
    },
    [],
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="招聘管理"
        subtitle={`共 ${data.total} 个职位`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={handleAdd}
            sx={{ bgcolor: "#3b82f6" }}
          >
            发布职位
          </Button>
        }
      />

      {/* 标签页 */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tab value="positions" label="招聘职位" />
          <Tab value="candidates" label="候选人" />
          <Tab value="interviews" label="面试安排" />
        </Tabs>
      </Paper>

      {activeTab === "positions" && (
        <>
          {/* 统计概览 */}
          <Paper sx={{ mb: 3, borderRadius: 2, p: 2 }}>
            <StatCardGroup stats={statCards} columns={4} />
          </Paper>

          {/* 筛选栏 */}
          <FilterBar
            filters={filterConfigs}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
            onSearch={handleSearch}
          />

          {/* 数据列表 */}
          <Paper sx={{ borderRadius: 2, mt: 3 }}>
            <ListPageTemplate
              columns={columns}
              data={data.items}
              loading={loading}
              pagination={{
                page: data.page - 1,
                pageSize: data.page_size,
                total: data.total,
                onPageChange: (page) => fetchPositions({ page: page + 1 }),
                onPageSizeChange: (pageSize) => fetchPositions({ page_size: pageSize }),
              }}
              rowActions={rowActions}
              onRowClick={handleView}
              emptyMessage="暂无招聘职位"
            />
          </Paper>
        </>
      )}

      {activeTab === "candidates" && (
        <Paper sx={{ borderRadius: 2, p: 4, textAlign: "center" }}>
          <EmptyState emoji="👤" title="候选人" description="候选人管理功能开发中" compact />
        </Paper>
      )}

      {activeTab === "interviews" && (
        <Paper sx={{ borderRadius: 2, p: 4, textAlign: "center" }}>
          <EmptyState emoji="📅" title="面试安排" description="面试安排功能开发中" compact />
        </Paper>
      )}

      {/* 查看详情模态框 */}
      <Dialog open={showViewModal} onClose={() => setShowViewModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>职位详情</DialogTitle>
        <DialogContent>
          {selectedPosition && (
            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">职位名称</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedPosition.title || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">部门</Typography>
                <Typography variant="body2">{selectedPosition.department || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">工作地点</Typography>
                <Typography variant="body2">{selectedPosition.location || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">招聘人数</Typography>
                <Typography variant="body2">{selectedPosition.headcount || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">应聘人数</Typography>
                <Typography variant="body2">{selectedPosition.applicants || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">状态</Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedPosition.status)}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
          <Button variant="contained" onClick={() => { setShowViewModal(false); handleEdit(selectedPosition!); }} sx={{ bgcolor: "#3b82f6" }}>
            编辑
          </Button>
        </DialogActions>
      </Dialog>

      {/* 创建/编辑模态框 */}
      <Dialog open={showCreateModal || showEditModal} onClose={() => { setShowCreateModal(false); setShowEditModal(false); }} maxWidth="md" fullWidth>
        <DialogTitle>{showCreateModal ? "发布职位" : "编辑职位"}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={showCreateModal ? handleCreate : handleUpdate} sx={{ display: "grid", gap: 2, pt: 1 }}>
            <TextField
              label="职位名称"
              size="small"
              value={(formData as RecruitmentPosition)?.title || ""}
              onChange={(e) => handleInputChange("title", e.target.value)}
              required
            />

            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
              <TextField
                label="部门"
                size="small"
                value={(formData as RecruitmentPosition)?.department || ""}
                onChange={(e) => handleInputChange("department", e.target.value)}
              />
              <TextField
                label="工作地点"
                size="small"
                value={(formData as RecruitmentPosition)?.location || ""}
                onChange={(e) => handleInputChange("location", e.target.value)}
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
              <TextField
                label="招聘人数"
                type="number"
                size="small"
                value={(formData as RecruitmentPosition)?.headcount || ""}
                onChange={(e) => handleInputChange("headcount", Number(e.target.value))}
              />
              <FormControl size="small" fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={(formData as RecruitmentPosition)?.status || "open"}
                  label="状态"
                  onChange={(e) => handleInputChange("status", e.target.value)}
                >
                  <MenuItem value="open">招聘中</MenuItem>
                  <MenuItem value="paused">已暂停</MenuItem>
                  <MenuItem value="closed">已关闭</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <DialogActions sx={{ p: 0, pt: 2, justifyContent: "flex-end" }}>
              <Button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} variant="outlined">取消</Button>
              <Button type="submit" variant="contained" sx={{ bgcolor: "#3b82f6" }}>{showCreateModal ? "发布" : "保存"}</Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default HrmRecruitmentPage;