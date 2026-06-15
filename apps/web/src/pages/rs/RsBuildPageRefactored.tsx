/**
 * RsBuildPage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 FilterBar 定义筛选器
 * 3. 使用 ListPageTemplate 替代 Card + Table 布局
 * 4. 使用 ColumnDef 定义表格列
 * 5. RS 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useCallback, useEffect } from "react";
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
} from "@mui/material";
import {
  Plus,
  Play,
  FileText,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  Download,
  RefreshCw,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef } from "../../components/templates";
import { PageHeader } from "../../components/layout";
import { FilterBar, type FilterConfig } from "../../components/mui";

// ============ 类型定义 ============
interface Build {
  id: string;
  build_no: string;
  build_task: string;
  trigger_type: string;
  status: string;
  duration: number;
  build_time: string;
}

interface FilterValues {
  search: string;
  status: string;
  taskType: string;
}

// ============ 列定义 ============
const columns: ColumnDef<Build>[] = [
  {
    id: "build_no",
    header: "构建编号",
    accessor: "build_no",
    sortable: true,
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Package size={16} color="#3b82f6" />
        {value}
      </Box>
    ),
  },
  {
    id: "build_task",
    header: "构建任务",
    accessor: "build_task",
  },
  {
    id: "trigger_type",
    header: "触发方式",
    accessor: "trigger_type",
    render: (value) => {
      const labelMap: Record<string, string> = {
        push: "代码推送",
        manual: "手动触发",
        tag: "标签发布",
        pr: "合并请求",
        schedule: "定时任务",
      };
      return <Chip label={labelMap[value] || value} size="small" variant="outlined" />;
    },
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    sortable: true,
    render: (value) => {
      const statusConfig: Record<string, { label: string; color: "success" | "error" | "primary" | "default"; icon: React.ReactNode }> = {
        success: { label: "成功", color: "success", icon: <CheckCircle size={14} /> },
        failed: { label: "失败", color: "error", icon: <XCircle size={14} /> },
        running: { label: "运行中", color: "primary", icon: <Loader size={14} className="animate-spin" /> },
        pending: { label: "等待中", color: "default", icon: <Clock size={14} /> },
      };
      const config = statusConfig[value] || statusConfig.pending;
      return (
        <Chip icon={config.icon} label={config.label} size="small" color={config.color} />
      );
    },
  },
  {
    id: "duration",
    header: "耗时",
    accessor: "duration",
    render: (value) => {
      if (value === 0) return "-";
      const mins = Math.floor((value as number) / 60);
      const secs = (value as number) % 60;
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Clock size={14} />
          {mins}分{secs}秒
        </Box>
      );
    },
  },
  {
    id: "build_time",
    header: "构建时间",
    accessor: "build_time",
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
    label: "构建状态",
    type: "text",
  },
  {
    id: "taskType",
    label: "任务类型",
    type: "text",
  },
];

// ============ 组件 ============
const RsBuildPageRefactored: React.FC = () => {
  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Build[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 筛选状态
  const [filtersValue, setFiltersValue] = useState<FilterValues>({
    search: "",
    status: "",
    taskType: "",
  });

  // 模态框状态
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedBuild, setSelectedBuild] = useState<Build | null>(null);

  // 模拟数据
  useEffect(() => {
    const mockBuilds: Build[] = [
      {
        id: "1",
        build_no: "BUILD-20240615-001",
        build_task: "frontend-main",
        trigger_type: "push",
        status: "success",
        duration: 320,
        build_time: "2024-06-15 14:30:00",
      },
      {
        id: "2",
        build_no: "BUILD-20240615-002",
        build_task: "backend-api",
        trigger_type: "manual",
        status: "running",
        duration: 0,
        build_time: "2024-06-15 14:25:00",
      },
      {
        id: "3",
        build_no: "BUILD-20240614-003",
        build_task: "mobile-app",
        trigger_type: "tag",
        status: "failed",
        duration: 180,
        build_time: "2024-06-14 16:20:00",
      },
      {
        id: "4",
        build_no: "BUILD-20240614-002",
        build_task: "shared-utils",
        trigger_type: "pr",
        status: "success",
        duration: 145,
        build_time: "2024-06-14 10:15:00",
      },
      {
        id: "5",
        build_no: "BUILD-20240614-001",
        build_task: "data-service",
        trigger_type: "schedule",
        status: "success",
        duration: 420,
        build_time: "2024-06-14 02:00:00",
      },
    ];

    setTimeout(() => {
      setData(mockBuilds);
      setTotal(mockBuilds.length);
      setLoading(false);
    }, 500);
  }, []);

  // 获取数据
  const fetchBuilds = useCallback(() => {
    setLoading(true);
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

  // 处理触发构建
  const handleTriggerBuild = useCallback(() => {
    const newBuild: Build = {
      id: String(Date.now()),
      build_no: `BUILD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(data.length + 1).padStart(3, "0")}`,
      build_task: "new-task",
      trigger_type: "manual",
      status: "running",
      duration: 0,
      build_time: new Date().toLocaleString(),
    };
    setData((prev) => [newBuild, ...prev]);
  }, [data.length]);

  // 处理查看日志
  const handleViewLog = useCallback((build: Build) => {
    setSelectedBuild(build);
    setLogDialogOpen(true);
  }, []);

  // 过滤数据
  const filteredData = data.filter((build) => {
    const matchesSearch =
      !filtersValue.search ||
      build.build_no.toLowerCase().includes(filtersValue.search.toLowerCase()) ||
      build.build_task.toLowerCase().includes(filtersValue.search.toLowerCase());
    const matchesStatus = !filtersValue.status || build.status === filtersValue.status;
    const matchesTaskType = !filtersValue.taskType || build.build_task.includes(filtersValue.taskType);
    return matchesSearch && matchesStatus && matchesTaskType;
  });

  // 处理导出
  const handleExport = useCallback(() => {
    // 导出功能开发中
  }, []);

  // 行操作
  const rowActions = [
    {
      label: "查看日志",
      icon: <FileText size={16} />,
      onClick: handleViewLog,
      color: "primary" as const,
    },
    {
      label: "制品管理",
      icon: <Package size={16} />,
      onClick: () => {},
      color: "primary" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title="构建管理"
        subtitle="管理构建任务、查看构建日志和制品"
        createButton={{
          label: "触发构建",
          onClick: handleTriggerBuild,
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
            <IconButton onClick={fetchBuilds}>
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
        onRowClick={handleViewLog}
        rowActions={rowActions}
        emptyMessage="暂无构建数据"
        searchable
        searchPlaceholder="搜索构建编号、任务..."
      />

      {/* 构建日志对话框 */}
      <Dialog
        open={logDialogOpen}
        onClose={() => setLogDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>构建日志</DialogTitle>
        <DialogContent>
          {selectedBuild && (
            <Box sx={{ py: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {selectedBuild.build_no} - {selectedBuild.build_task}
              </Typography>
              <Box sx={{ p: 2, mt: 2, bgcolor: "#1e1e1e", color: "#d4d4d4", fontFamily: "monospace", fontSize: 12, borderRadius: 1 }}>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
{`[14:30:00] Starting build...
[14:30:01] Cloning repository...
[14:30:05] Installing dependencies...
[14:30:15] Dependencies installed successfully
[14:30:16] Running tests...
[14:30:45] All tests passed
[14:30:46] Building application...
[14:31:20] Build completed successfully
[14:31:21] Generating artifacts...
[14:31:25] Artifacts generated: app.tar.gz
[14:31:26] Build finished with status: SUCCESS`}
                </pre>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RsBuildPageRefactored;
