/**
 * PmProjectListPage 重构示例
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
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from "@mui/material";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  List,
  LayoutGrid,
  Calendar,
  TrendingUp,
} from "lucide-react";
import {
  projectApi,
  type Project,
} from "../api/pm";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../components/templates";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui";

// ============ 视图类型 ============
type ViewMode = "list" | "kanban" | "gantt";

// ============ 列定义 ============
const columns: ColumnDef<Project>[] = [
  {
    id: "name",
    header: "项目名称",
    accessor: "name",
    sortable: true,
    width: 200,
  },
  {
    id: "code",
    header: "项目代码",
    accessor: "code",
    sortable: true,
    width: 120,
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => {
      const statusMap: Record<string, { label: string; color: "success" | "warning" | "error" | "info" | "default" }> = {
        planning: { label: "规划中", color: "info" },
        progress: { label: "进行中", color: "warning" },
        completed: { label: "已完成", color: "success" },
        suspended: { label: "已暂停", color: "error" },
      };
      const status = statusMap[value] || { label: value, color: "default" as const };
      return <Chip label={status.label} color={status.color} size="small" />;
    },
  },
  {
    id: "progress",
    header: "进度",
    accessor: "progress",
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: 120 }}>
        <Box
          sx={{
            flex: 1,
            height: 6,
            bgcolor: "grey.200",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              width: `${value || 0}%`,
              height: "100%",
              bgcolor: "primary.main",
              borderRadius: 3,
            }}
          />
        </Box>
        <Typography variant="caption">{value || 0}%</Typography>
      </Box>
    ),
  },
  {
    id: "start_date",
    header: "开始日期",
    accessor: "start_date",
    render: (value) => value || "-",
  },
  {
    id: "end_date",
    header: "结束日期",
    accessor: "end_date",
    render: (value) => value || "-",
  },
  {
    id: "manager",
    header: "项目经理",
    accessor: "manager_name",
    render: (value) => value || "-",
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (project: Project) => void,
  onEdit: (project: Project) => void,
  onDelete: (project: Project) => void,
): RowAction<Project>[] => [
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
    placeholder: "搜索项目名称/代码...",
  },
  {
    id: "status",
    label: "状态",
    type: "select",
    options: [
      { value: "all", label: "全部状态" },
      { value: "planning", label: "规划中" },
      { value: "progress", label: "进行中" },
      { value: "completed", label: "已完成" },
      { value: "suspended", label: "已暂停" },
    ],
  },
  {
    id: "manager",
    label: "项目经理",
    type: "select",
    options: [
      { value: "all", label: "全部" },
      { value: "user1", label: "张三" },
      { value: "user2", label: "李四" },
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
  {
    label: "批量导出",
    icon: <TrendingUp style={{ width: 16, height: 16 }} />,
  },
];

// ============ 组件 ============
const PmProjectListPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    items: Project[];
    total: number;
    page: number;
    page_size: number;
  }>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });

  // 视图模式
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // 筛选状态
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // 行选择
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 表单数据
  const [formData, setFormData] = useState<Partial<Project>>({});

  // 统计信息
  const [stats, setStats] = useState({
    total: 0,
    progress: 0,
    completed: 0,
    suspended: 0,
  });

  // 获取项目列表
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: data.page,
        page_size: data.page_size,
      };
      if (searchText) params.search = searchText;
      if (statusFilter !== "all") params.status = statusFilter;
      if (managerFilter !== "all") params.manager_id = managerFilter;

      const response = await projectApi.list(params);
      if (response.code === 200 && response.data) {
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
        message: error.message || "获取项目数据失败",
      });
    } finally {
      setLoading(false);
    }
  }, [data.page, data.page_size, searchText, statusFilter, managerFilter, addNotification]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "status") setStatusFilter(value);
      if (filterId === "manager") setManagerFilter(value);
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
  const handleView = useCallback((project: Project) => {
    navigate(`/pm/project/${project.id}`);
  }, [navigate]);

  // 处理编辑
  const handleEdit = useCallback((project: Project) => {
    navigate(`/pm/project/${project.id}/edit`);
  }, [navigate]);

  // 处理删除
  const handleDelete = useCallback(
    async (project: Project) => {
      if (!window.confirm(`确定要删除项目"${project.name}"吗?`)) return;
      try {
        await projectApi.delete(project.id);
        addNotification({
          type: "success",
          title: "删除成功",
          message: "项目已删除",
        });
        fetchProjects();
      } catch (error: any) {
        addNotification({
          type: "error",
          title: "删除失败",
          message: error.message || "无法删除项目",
        });
      }
    },
    [addNotification, fetchProjects],
  );

  // 处理视图切换
  const handleViewModeChange = useCallback(
    (_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
      if (newMode !== null) {
        setViewMode(newMode);
      }
    },
    [],
  );

  // 初始加载
  React.useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <>
      <PageHeader
        title="项目管理"
        subtitle={`共 ${data.total} 个项目`}
        showBack
        onBack={() => navigate(-1)}
        actions={
          <>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
              sx={{ mr: 1 }}
            >
              <ToggleButton value="list">
                <List style={{ width: 18, height: 18 }} />
              </ToggleButton>
              <ToggleButton value="kanban">
                <LayoutGrid style={{ width: 18, height: 18 }} />
              </ToggleButton>
              <ToggleButton value="gantt">
                <Calendar style={{ width: 18, height: 18 }} />
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={() => navigate("/pm/project/create")}
            >
              新建项目
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
        emptyMessage="暂无项目数据"
        selection={{
          selected: selectedIds,
          onChange: handleSelectionChange,
        }}
        batchActions={batchActions}
      />

      {/* 看板视图提示 */}
      {viewMode === "kanban" && (
        <Box
          sx={{
            mt: 2,
            p: 4,
            bgcolor: "background.paper",
            borderRadius: 2,
            textAlign: "center",
          }}
        >
          <Typography color="text.secondary">
            看板视图开发中，敬请期待...
          </Typography>
        </Box>
      )}

      {/* 甘特图视图提示 */}
      {viewMode === "gantt" && (
        <Box
          sx={{
            mt: 2,
            p: 4,
            bgcolor: "background.paper",
            borderRadius: 2,
            textAlign: "center",
          }}
        >
          <Typography color="text.secondary">
            甘特图视图开发中，敬请期待...
          </Typography>
        </Box>
      )}
    </>
  );
};

export default PmProjectListPage;
