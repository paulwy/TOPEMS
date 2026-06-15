/**
 * HrmPositionPage 重构后
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Briefcase,
  Users,
  Plus,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import {
  positionApi,
  type Position,
  type PaginatedResult,
} from "../api/hrm";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  StatCardGroup,
  type ColumnDef,
  type RowAction,
} from "../components/mui";
import { FilterBar, type FilterConfig } from "../components/mui/FilterBar";
import { PageHeader } from "../components/layout";

// ============ 列定义 ============
const getColumns = (
  getStatusBadge: (status: string) => JSX.Element,
): ColumnDef<Position>[] => [
  {
    id: "name",
    header: "岗位名称",
    accessor: "name",
    minWidth: 180,
    render: (row: Position) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Briefcase sx={{ width: 16, height: 16, color: "text.secondary" }} />
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {row.name || "-"}
        </Typography>
      </Box>
    ),
  },
  {
    id: "code",
    header: "岗位编码",
    accessor: "code",
    minWidth: 120,
    render: (value: string) => (
      <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
        {value || "-"}
      </Typography>
    ),
  },
  {
    id: "level",
    header: "职级",
    accessor: "level",
    minWidth: 100,
    render: (value: string) => (
      <Chip size="small" variant="outlined" label={value || "-"} />
    ),
  },
  {
    id: "employee_count",
    header: "员工数",
    accessor: "employee_count",
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
    render: (row: Position) => getStatusBadge(row.status),
  },
  {
    id: "created_at",
    header: "创建时间",
    accessor: "created_at",
    minWidth: 150,
    render: (value: string) => (
      <Typography variant="body2" sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
        {value ? new Date(value).toLocaleDateString() : "-"}
      </Typography>
    ),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (record: Position) => void,
  onEdit: (record: Position) => void,
  onDelete: (record: Position) => void,
): RowAction<Position>[] => [
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
    placeholder: "搜索岗位名称/编码...",
    width: 220,
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { label: "全部", value: "all" },
      { label: "启用", value: "active" },
      { label: "禁用", value: "inactive" },
    ],
  },
];

// ============ 组件 ============
const HrmPositionPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Position>>({
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
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  // 表单数据
  const [formData, setFormData] = useState<Partial<Position>>({});

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    const config: Record<string, { color: "success" | "default"; label: string }> = {
      active: { color: "success", label: "启用" },
      inactive: { color: "default", label: "禁用" },
    };
    const c = config[status] || { color: "default", label: status };
    return (
      <Chip size="small" color={c.color} label={c.label} sx={{ fontWeight: 500 }} />
    );
  }, []);

  // 获取岗位列表
  const fetchPositions = useCallback(
    async (params?: any) => {
      setLoading(true);
      try {
        const response = await positionApi.list(params);
        if (response.code === 200 && response.data) {
          setData(response.data as PaginatedResult<Position>);
        }
      } catch (error: any) {
        addNotification({
          title: "失败",
          message: error.message || "获取岗位数据失败",
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
  const handleEdit = useCallback((record: Position) => {
    setSelectedPosition(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  // 查看
  const handleView = useCallback((record: Position) => {
    setSelectedPosition(record);
    setShowViewModal(true);
  }, []);

  // 删除
  const handleDelete = useCallback(
    async (record: Position) => {
      if (!confirm(`确定要删除岗位"${record.name}"吗？`)) return;
      try {
        await positionApi.delete(record.id);
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
        await positionApi.create(formData);
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
        await positionApi.update(selectedPosition.id, formData);
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
      active: items.filter((p) => p.status === "active").length,
      inactive: items.filter((p) => p.status === "inactive").length,
      employees: items.reduce((sum, p) => sum + (p.employee_count || 0), 0),
    };
  }, [data.items]);

  const statCards = useMemo(
    () => [
      {
        id: "total",
        title: "岗位总数",
        value: stats.total,
        icon: <Briefcase style={{ width: 24, height: 24 }} />,
        color: "primary" as const,
      },
      {
        id: "active",
        title: "启用",
        value: stats.active,
        icon: <Briefcase style={{ width: 24, height: 24 }} />,
        color: "success" as const,
      },
      {
        id: "inactive",
        title: "禁用",
        value: stats.inactive,
        icon: <Briefcase style={{ width: 24, height: 24 }} />,
        color: "default" as const,
      },
      {
        id: "employees",
        title: "在职员工",
        value: stats.employees,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: "info" as const,
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
        title="岗位管理"
        subtitle={`共 ${data.total} 个岗位`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={handleAdd}
            sx={{ bgcolor: "#3b82f6" }}
          >
            新增岗位
          </Button>
        }
      />

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
          emptyMessage="暂无岗位数据"
        />
      </Paper>

      {/* 查看详情模态框 */}
      <Dialog open={showViewModal} onClose={() => setShowViewModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>岗位详情</DialogTitle>
        <DialogContent>
          {selectedPosition && (
            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2, pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">岗位名称</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedPosition.name || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">岗位编码</Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>{selectedPosition.code || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">职级</Typography>
                <Typography variant="body2">{selectedPosition.level || "-"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">员工数</Typography>
                <Typography variant="body2">{selectedPosition.employee_count || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">状态</Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedPosition.status)}</Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">创建时间</Typography>
                <Typography variant="body2">
                  {selectedPosition.created_at ? new Date(selectedPosition.created_at).toLocaleString() : "-"}
                </Typography>
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
      <Dialog open={showCreateModal || showEditModal} onClose={() => { setShowCreateModal(false); setShowEditModal(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>{showCreateModal ? "新增岗位" : "编辑岗位"}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={showCreateModal ? handleCreate : handleUpdate} sx={{ display: "grid", gap: 2, pt: 1 }}>
            <TextField
              label="岗位名称"
              size="small"
              value={(formData as Position)?.name || ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />

            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
              <TextField
                label="岗位编码"
                size="small"
                value={(formData as Position)?.code || ""}
                onChange={(e) => handleInputChange("code", e.target.value)}
              />
              <TextField
                label="职级"
                size="small"
                value={(formData as Position)?.level || ""}
                onChange={(e) => handleInputChange("level", e.target.value)}
              />
            </Box>

            <FormControl size="small" fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={(formData as Position)?.status || "active"}
                label="状态"
                onChange={(e) => handleInputChange("status", e.target.value)}
              >
                <MenuItem value="active">启用</MenuItem>
                <MenuItem value="inactive">禁用</MenuItem>
              </Select>
            </FormControl>

            <DialogActions sx={{ p: 0, pt: 2, justifyContent: "flex-end" }}>
              <Button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} variant="outlined">取消</Button>
              <Button type="submit" variant="contained" sx={{ bgcolor: "#3b82f6" }}>{showCreateModal ? "创建" : "保存"}</Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default HrmPositionPage;