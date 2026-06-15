/**
 * RsProjectListPage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 FilterBar 定义筛选器
 * 3. 使用 ListPageTemplate 替代 Card + Table 布局
 * 4. 使用 ColumnDef 定义表格列
 * 5. RS 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Download,
  RefreshCw,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef } from "../../components/templates";
import { PageHeader } from "../../components/layout";
import { FilterBar, type FilterConfig } from "../../components/mui";
import { useAppStore } from "../../store";

// ============ 类型定义 ============
interface Project {
  id: string;
  name: string;
  code: string;
  project_type: string;
  status: string;
  leader: string;
  progress: number;
  start_date: string;
  end_date: string | null;
  budget: number | null;
}

interface FilterValues {
  search: string;
  status: string;
}

// ============ 列定义 ============
const columns: ColumnDef<Project>[] = [
  {
    id: "code",
    header: "项目编码",
    accessor: "code",
    sortable: true,
  },
  {
    id: "name",
    header: "项目名称",
    accessor: "name",
    sortable: true,
  },
  {
    id: "project_type",
    header: "项目类型",
    accessor: "project_type",
    render: (value) => (
      <Chip label={value} size="small" variant="outlined" />
    ),
  },
  {
    id: "leader",
    header: "负责人",
    accessor: "leader",
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    sortable: true,
    render: (value) => {
      const statusMap: Record<string, { label: string; color: "primary" | "success" | "warning" | "error" | "default" }> = {
        "进行中": { label: "进行中", color: "primary" },
        "已完成": { label: "已完成", color: "success" },
        "暂停": { label: "暂停", color: "warning" },
        "取消": { label: "已取消", color: "error" },
      };
      const config = statusMap[value] || { label: value, color: "default" as const };
      return <Chip label={config.label} size="small" color={config.color} />;
    },
  },
  {
    id: "progress",
    header: "进度",
    accessor: "progress",
    render: (value) => (
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <LinearProgress variant="determinate" value={value as number} sx={{ width: 80 }} />
        <Typography variant="body2">{value}%</Typography>
      </Stack>
    ),
  },
  {
    id: "start_date",
    header: "开始日期",
    accessor: "start_date",
  },
  {
    id: "budget",
    header: "预算(万元)",
    accessor: "budget",
    render: (value) => (value ? (value / 10000).toFixed(1) : "-"),
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "text",
  },
  {
    id: "status",
    label: "状态",
    type: "text",
  },
];

// ============ 组件 ============
const RsProjectListPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Project[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 筛选状态
  const [filtersValue, setFiltersValue] = useState<FilterValues>({
    search: "",
    status: "",
  });

  // 模态框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // 模拟数据
  useEffect(() => {
    const mockProjects: Project[] = [
      {
        id: "1",
        name: "新型催化剂研发项目",
        code: "RS-2024-001",
        project_type: "新产品研发",
        status: "进行中",
        leader: "张三",
        progress: 65,
        start_date: "2024-01-15",
        end_date: "2024-12-31",
        budget: 500000,
      },
      {
        id: "2",
        name: "聚合物改性研究",
        code: "RS-2024-002",
        project_type: "工艺改进",
        status: "进行中",
        leader: "李四",
        progress: 42,
        start_date: "2024-02-01",
        end_date: "2024-08-30",
        budget: 300000,
      },
      {
        id: "3",
        name: "环保材料开发",
        code: "RS-2024-003",
        project_type: "新产品研发",
        status: "已完成",
        leader: "王五",
        progress: 100,
        start_date: "2024-03-01",
        end_date: "2024-06-30",
        budget: 200000,
      },
      {
        id: "4",
        name: "纳米材料合成工艺",
        code: "RS-2024-004",
        project_type: "工艺改进",
        status: "暂停",
        leader: "赵六",
        progress: 30,
        start_date: "2024-04-01",
        end_date: null,
        budget: 400000,
      },
      {
        id: "5",
        name: "高性能涂料配方优化",
        code: "RS-2024-005",
        project_type: "配方优化",
        status: "进行中",
        leader: "孙七",
        progress: 78,
        start_date: "2024-05-01",
        end_date: "2024-10-31",
        budget: 150000,
      },
    ];

    setTimeout(() => {
      setData(mockProjects);
      setTotal(mockProjects.length);
      setLoading(false);
    }, 500);
  }, []);

  // 获取项目列表
  const fetchProjects = useCallback(() => {
    setLoading(true);
    // 实际项目中这里会调用 API
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  // 处理筛选变化
  const handleFilterChange = useCallback((filterId: string, value: any) => {
    setFiltersValue((prev) => ({ ...prev, [filterId]: value }));
  }, []);

  // 处理分页变化
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  // 处理查看
  const handleView = useCallback(
    (project: Project) => {
      navigate(`/rs/projects/${project.id}`);
    },
    [navigate],
  );

  // 处理编辑
  const handleEdit = useCallback(
    (project: Project) => {
      navigate(`/rs/projects/${project.id}/edit`);
    },
    [navigate],
  );

  // 处理删除
  const handleDeleteClick = useCallback((project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (selectedProject) {
      setData((prev) => prev.filter((p) => p.id !== selectedProject.id));
      addNotification({
        title: "成功",
        message: "项目删除成功",
        type: "success",
      });
    }
    setDeleteDialogOpen(false);
    setSelectedProject(null);
  }, [selectedProject, addNotification]);

  // 过滤数据
  const filteredData = data.filter((project) => {
    const matchesSearch =
      !filtersValue.search ||
      project.name.toLowerCase().includes(filtersValue.search.toLowerCase()) ||
      project.code.toLowerCase().includes(filtersValue.search.toLowerCase());
    const matchesStatus =
      !filtersValue.status || project.status === filtersValue.status;
    return matchesSearch && matchesStatus;
  });

  // 处理导出
  const handleExport = useCallback(() => {
    addNotification({
      title: "提示",
      message: "导出功能开发中",
      type: "info",
    });
  }, [addNotification]);

  // 行操作
  const rowActions = [
    {
      label: "查看",
      icon: <Eye size={16} />,
      onClick: handleView,
      color: "primary" as const,
    },
    {
      label: "编辑",
      icon: <Edit size={16} />,
      onClick: handleEdit,
      color: "warning" as const,
    },
    {
      label: "删除",
      icon: <Trash2 size={16} />,
      onClick: handleDeleteClick,
      color: "error" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title="研发项目管理"
        subtitle="管理研发项目、跟踪进度、分配资源"
        createButton={{
          label: "新建项目",
          href: "/rs/projects/create",
        }}
        actions={[
          {
            label: "导出",
            icon: <Download size={18} />,
            onClick: handleExport,
            variant: "outlined",
          },
        ]}
        rightContent={
          <Tooltip title="刷新">
            <IconButton onClick={fetchProjects}>
              <RefreshCw
                size={20}
                style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
              />
            </IconButton>
          </Tooltip>
        }
      />

      <ListPageTemplate
        columns={columns}
        data={filteredData}
        loading={loading}
        filters={filters}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total: filteredData.length,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        onRowClick={handleView}
        rowActions={rowActions}
        emptyMessage="暂无项目数据"
        searchable
        searchPlaceholder="搜索项目名称或编码..."
      />

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除项目 "{selectedProject?.name}" 吗？此操作不可恢复。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RsProjectListPageRefactored;
