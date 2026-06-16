/**
 * RsReleasePage 重构版本
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
  TextField,
} from "@mui/material";
import {
  Eye,
  RotateCcw,
  Download,
  RefreshCw,
  Calendar,
  User,
  Tag,
} from "lucide-react";
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from "../../components/templates";
import { PageHeader } from "../../components/layout";

// ============ 类型定义 ============
interface Release {
  id: string;
  version: string;
  release_time: string;
  release_note: string;
  environment: string;
  status: string;
  release_by: string;
}

interface FilterValues {
  search: string;
  env: string;
  status: string;
}

// ============ 列定义 ============
const columns: ColumnDef<Release>[] = [
  {
    id: "version",
    label: "版本号",
    sortable: true,
    render: (row) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Tag size={16} color="#3b82f6" />
        {row.version}
      </Box>
    ),
  },
  {
    id: "release_time",
    label: "发布时间",
    render: (row) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Calendar size={14} />
        {row.release_time}
      </Box>
    ),
  },
  {
    id: "release_note",
    label: "发布说明",
    render: (row) => (
      <Tooltip title={row.release_note}>
        <Box
          sx={{
            maxWidth: 250,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {row.release_note}
        </Box>
      </Tooltip>
    ),
  },
  {
    id: "environment",
    label: "发布环境",
    render: (row) => {
      const envConfig: Record<
        string,
        { label: string; color: "error" | "warning" | "success" }
      > = {
        production: { label: "生产环境", color: "error" },
        staging: { label: "预发布环境", color: "warning" },
        development: { label: "开发环境", color: "success" },
      };
      const config = envConfig[row.environment] || {
        label: row.environment,
        color: "success" as const,
      };
      return <Chip label={config.label} size="small" color={config.color} />;
    },
  },
  {
    id: "status",
    label: "状态",
    sortable: true,
    render: (row) => {
      const statusConfig: Record<
        string,
        { label: string; color: "success" | "warning" | "error" | "default" }
      > = {
        released: { label: "已发布", color: "success" },
        planning: { label: "规划中", color: "warning" },
        rolled_back: { label: "已回滚", color: "error" },
      };
      const config = statusConfig[row.status] || {
        label: row.status,
        color: "default" as const,
      };
      return <Chip label={config.label} size="small" color={config.color} />;
    },
  },
  {
    id: "release_by",
    label: "发布人",
    render: (row) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <User size={14} />
        {row.release_by}
      </Box>
    ),
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
    id: "env",
    label: "环境",
    type: "text",
  },
  {
    id: "status",
    label: "状态",
    type: "text",
  },
];

// ============ 组件 ============
const RsReleasePageRefactored: React.FC = () => {
  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Release[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 筛选状态
  const [filtersValue, setFiltersValue] = useState<FilterValues>({
    search: "",
    env: "",
    status: "",
  });

  // 模态框状态
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [newReleaseDialogOpen, setNewReleaseDialogOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [newReleaseForm, setNewReleaseForm] = useState({
    version: "",
    environment: "staging",
    release_note: "",
  });

  // 模拟数据
  useEffect(() => {
    setLoading(true);
    const mockReleases: Release[] = [
      {
        id: "1",
        version: "v2.3.1",
        release_time: "2024-06-15 14:30:00",
        release_note: "修复用户登录问题，优化性能",
        environment: "production",
        status: "released",
        release_by: "张三",
      },
      {
        id: "2",
        version: "v2.3.0",
        release_time: "2024-06-10 10:00:00",
        release_note: "新增数据分析功能",
        environment: "production",
        status: "released",
        release_by: "李四",
      },
      {
        id: "3",
        version: "v2.4.0-beta",
        release_time: "2024-06-20 09:00:00",
        release_note: "新版本测试发布",
        environment: "staging",
        status: "planning",
        release_by: "王五",
      },
      {
        id: "4",
        version: "v2.2.5",
        release_time: "2024-06-05 16:45:00",
        release_note: "紧急修复生产问题",
        environment: "production",
        status: "rolled_back",
        release_by: "赵六",
      },
      {
        id: "5",
        version: "v2.2.4",
        release_time: "2024-06-01 11:20:00",
        release_note: "常规版本更新",
        environment: "production",
        status: "released",
        release_by: "孙七",
      },
    ];

    setTimeout(() => {
      setData(mockReleases);
      setLoading(false);
    }, 500);
  }, []);

  // 获取数据
  const fetchReleases = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  // 处理筛选变化
  const handleFilterChange = useCallback((filters: Partial<FilterValues>) => {
    setFiltersValue((prev) => ({ ...prev, ...filters }));
  }, []);

  // 处理分页变化
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  // 处理查看详情
  const handleViewDetail = useCallback((release: Release) => {
    setSelectedRelease(release);
    setDetailDialogOpen(true);
  }, []);

  // 处理回滚
  const handleRollback = useCallback((release: Release) => {
    const newRollback: Release = {
      id: String(Date.now()),
      version: "上一版本",
      release_time: new Date().toLocaleString(),
      release_note: "回滚操作",
      environment: release.environment,
      status: "planning",
      release_by: "当前用户",
    };
    setData((prev) => [newRollback, ...prev]);
  }, []);

  // 处理创建发布
  const handleCreateRelease = useCallback(() => {
    const newRelease: Release = {
      id: String(Date.now()),
      version: newReleaseForm.version,
      release_time: new Date().toLocaleString(),
      release_note: newReleaseForm.release_note,
      environment: newReleaseForm.environment,
      status: "planning",
      release_by: "当前用户",
    };
    setData((prev) => [newRelease, ...prev]);
    setNewReleaseDialogOpen(false);
    setNewReleaseForm({
      version: "",
      environment: "staging",
      release_note: "",
    });
  }, [newReleaseForm]);

  // 过滤数据
  const filteredData = data.filter((release) => {
    const matchesSearch =
      !filtersValue.search ||
      release.version
        .toLowerCase()
        .includes(filtersValue.search.toLowerCase()) ||
      release.release_note
        .toLowerCase()
        .includes(filtersValue.search.toLowerCase()) ||
      release.release_by
        .toLowerCase()
        .includes(filtersValue.search.toLowerCase());
    const matchesEnv =
      !filtersValue.env || release.environment === filtersValue.env;
    const matchesStatus =
      !filtersValue.status || release.status === filtersValue.status;
    return matchesSearch && matchesEnv && matchesStatus;
  });

  // 处理导出
  const handleExport = useCallback(() => {
    // 导出功能开发中
  }, []);

  // 行操作
  const rowActions: RowAction<Release>[] = [
    {
      label: "查看详情",
      icon: <Eye size={16} />,
      onClick: handleViewDetail,
      color: "primary" as const,
    },
    {
      label: "回滚",
      icon: <RotateCcw size={16} />,
      onClick: handleRollback,
      color: "warning" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title="发布管理"
        subtitle="管理版本发布、查看发布历史"
        createButton={{
          label: "新建发布",
          onClick: () => setNewReleaseDialogOpen(true),
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
            <IconButton onClick={fetchReleases}>
              <RefreshCw
                size={20}
                style={{
                  animation: loading ? "spin 1s linear infinite" : "none",
                }}
              />
            </IconButton>
          </Tooltip>
        }
      />

      <ListPageTemplate
        title="发布列表"
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
        onRowClick={handleViewDetail}
        rowActions={rowActions}
        emptyMessage="暂无发布数据"
        searchable
        searchPlaceholder="搜索版本、说明..."
      />

      {/* 发布详情对话框 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>发布详情</DialogTitle>
        <DialogContent>
          {selectedRelease && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                {selectedRelease.version}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Chip
                  label={
                    selectedRelease.environment === "production"
                      ? "生产环境"
                      : selectedRelease.environment === "staging"
                        ? "预发布环境"
                        : "开发环境"
                  }
                  color={
                    selectedRelease.environment === "production"
                      ? "error"
                      : selectedRelease.environment === "staging"
                        ? "warning"
                        : "success"
                  }
                />
                <Chip
                  label={
                    selectedRelease.status === "released"
                      ? "已发布"
                      : selectedRelease.status === "planning"
                        ? "规划中"
                        : "已回滚"
                  }
                  color={
                    selectedRelease.status === "released"
                      ? "success"
                      : selectedRelease.status === "planning"
                        ? "warning"
                        : "error"
                  }
                />
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  发布说明
                </Typography>
                <Box sx={{ p: 2, mt: 1, bgcolor: "#f5f5f5" }}>
                  <Typography variant="body2">
                    {selectedRelease.release_note}
                  </Typography>
                </Box>
              </Box>
              <Stack direction="row" spacing={4} sx={{ mt: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    发布时间
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {selectedRelease.release_time}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    发布人
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {selectedRelease.release_by}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 新建发布对话框 */}
      <Dialog
        open={newReleaseDialogOpen}
        onClose={() => setNewReleaseDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建发布</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="版本号"
              fullWidth
              value={newReleaseForm.version}
              onChange={(e) =>
                setNewReleaseForm({
                  ...newReleaseForm,
                  version: e.target.value,
                })
              }
            />
            <TextField
              label="发布环境"
              fullWidth
              value={newReleaseForm.environment}
              onChange={(e) =>
                setNewReleaseForm({
                  ...newReleaseForm,
                  environment: e.target.value,
                })
              }
            />
            <TextField
              label="发布说明"
              fullWidth
              multiline
              rows={4}
              value={newReleaseForm.release_note}
              onChange={(e) =>
                setNewReleaseForm({
                  ...newReleaseForm,
                  release_note: e.target.value,
                })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewReleaseDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: "#3b82f6" }}
            onClick={handleCreateRelease}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RsReleasePageRefactored;
