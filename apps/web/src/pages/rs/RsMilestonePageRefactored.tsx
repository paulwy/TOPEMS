/**
 * RsMilestonePage 重构版本
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
  LinearProgress,
} from "@mui/material";
import {
  Plus,
  Edit,
  Flag,
  Calendar,
  Link2,
  Eye,
  Download,
  RefreshCw,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef } from "../../components/templates";
import { PageHeader } from "../../components/layout";
import { FilterBar, type FilterConfig } from "../../components/mui";

// ============ 类型定义 ============
interface Milestone {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  progress: number;
  related_project: string;
  status: string;
}

interface FilterValues {
  search: string;
  status: string;
}

// ============ 列定义 ============
const columns: ColumnDef<Milestone>[] = [
  {
    id: "name",
    header: "里程碑名称",
    accessor: "name",
    sortable: true,
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Flag size={16} color="#3b82f6" />
        {value}
      </Box>
    ),
  },
  {
    id: "start_date",
    header: "开始日期",
    accessor: "start_date",
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Calendar size={14} />
        {value}
      </Box>
    ),
  },
  {
    id: "end_date",
    header: "结束日期",
    accessor: "end_date",
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Calendar size={14} />
        {value}
      </Box>
    ),
  },
  {
    id: "progress",
    header: "进度",
    accessor: "progress",
    render: (value) => (
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 150 }}
      >
        <LinearProgress
          variant="determinate"
          value={value as number}
          sx={{ flex: 1, height: 8, borderRadius: 4 }}
        />
        <Typography variant="caption">{value}%</Typography>
      </Box>
    ),
  },
  {
    id: "related_project",
    header: "关联项目",
    accessor: "related_project",
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Link2 size={14} />
        {value}
      </Box>
    ),
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    sortable: true,
    render: (value) => {
      const statusConfig: Record<
        string,
        { label: string; color: "success" | "primary" | "warning" | "default" }
      > = {
        completed: { label: "已完成", color: "success" },
        active: { label: "进行中", color: "primary" },
        planning: { label: "规划中", color: "warning" },
      };
      const config = statusConfig[value] || {
        label: value,
        color: "default" as const,
      };
      return <Chip label={config.label} size="small" color={config.color} />;
    },
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
const RsMilestonePageRefactored: React.FC = () => {
  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Milestone[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 筛选状态
  const [filtersValue, setFiltersValue] = useState<FilterValues>({
    search: "",
    status: "",
  });

  // 模态框状态
  const [newMilestoneDialogOpen, setNewMilestoneDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    null,
  );
  const [newMilestoneForm, setNewMilestoneForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    related_project: "",
  });

  // 模拟数据
  useEffect(() => {
    const mockMilestones: Milestone[] = [
      {
        id: "1",
        name: "v1.0.0 发布",
        start_date: "2024-06-01",
        end_date: "2024-06-30",
        progress: 75,
        related_project: "用户中心重构",
        status: "active",
      },
      {
        id: "2",
        name: "性能优化",
        start_date: "2024-05-01",
        end_date: "2024-05-31",
        progress: 100,
        related_project: "系统优化项目",
        status: "completed",
      },
      {
        id: "3",
        name: "移动端适配",
        start_date: "2024-06-15",
        end_date: "2024-07-15",
        progress: 30,
        related_project: "移动端开发",
        status: "active",
      },
      {
        id: "4",
        name: "数据库迁移",
        start_date: "2024-04-01",
        end_date: "2024-04-30",
        progress: 100,
        related_project: "数据库升级",
        status: "completed",
      },
      {
        id: "5",
        name: "API v2开发",
        start_date: "2024-07-01",
        end_date: "2024-08-31",
        progress: 0,
        related_project: "API重构",
        status: "planning",
      },
    ];

    setTimeout(() => {
      setData(mockMilestones);
      setTotal(mockMilestones.length);
      setLoading(false);
    }, 500);
  }, []);

  // 获取数据
  const fetchMilestones = useCallback(() => {
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

  // 处理创建里程碑
  const handleCreateMilestone = useCallback(() => {
    const newMs: Milestone = {
      id: String(Date.now()),
      name: newMilestoneForm.name,
      start_date: newMilestoneForm.start_date,
      end_date: newMilestoneForm.end_date,
      progress: 0,
      related_project: newMilestoneForm.related_project,
      status: "planning",
    };
    setData((prev) => [newMs, ...prev]);
    setNewMilestoneDialogOpen(false);
    setNewMilestoneForm({
      name: "",
      start_date: "",
      end_date: "",
      related_project: "",
    });
  }, [newMilestoneForm]);

  // 处理查看详情
  const handleViewDetail = useCallback((ms: Milestone) => {
    setSelectedMilestone(ms);
    setDetailDialogOpen(true);
  }, []);

  // 过滤数据
  const filteredData = data.filter((ms) => {
    const matchesSearch =
      !filtersValue.search ||
      ms.name.toLowerCase().includes(filtersValue.search.toLowerCase()) ||
      ms.related_project
        .toLowerCase()
        .includes(filtersValue.search.toLowerCase());
    const matchesStatus =
      !filtersValue.status || ms.status === filtersValue.status;
    return matchesSearch && matchesStatus;
  });

  // 处理导出
  const handleExport = useCallback(() => {
    // 导出功能开发中
  }, []);

  // 行操作
  const rowActions = [
    {
      label: "查看进度",
      icon: <Eye size={16} />,
      onClick: handleViewDetail,
      color: "primary" as const,
    },
    {
      label: "编辑",
      icon: <Edit size={16} />,
      onClick: () => {},
      color: "warning" as const,
    },
    {
      label: "关联项目",
      icon: <Link2 size={16} />,
      onClick: () => {},
      color: "primary" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title="里程碑"
        subtitle="管理项目里程碑、跟踪里程碑进度"
        createButton={{
          label: "新建里程碑",
          onClick: () => setNewMilestoneDialogOpen(true),
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
            <IconButton onClick={fetchMilestones}>
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
        emptyMessage="暂无里程碑数据"
        searchable
        searchPlaceholder="搜索里程碑名称、项目..."
      />

      {/* 新建里程碑对话框 */}
      <Dialog
        open={newMilestoneDialogOpen}
        onClose={() => setNewMilestoneDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建里程碑</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="里程碑名称"
              fullWidth
              value={newMilestoneForm.name}
              onChange={(e) =>
                setNewMilestoneForm({
                  ...newMilestoneForm,
                  name: e.target.value,
                })
              }
            />
            <TextField
              label="开始日期"
              type="date"
              fullWidth
              value={newMilestoneForm.start_date}
              onChange={(e) =>
                setNewMilestoneForm({
                  ...newMilestoneForm,
                  start_date: e.target.value,
                })
              }
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="结束日期"
              type="date"
              fullWidth
              value={newMilestoneForm.end_date}
              onChange={(e) =>
                setNewMilestoneForm({
                  ...newMilestoneForm,
                  end_date: e.target.value,
                })
              }
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="关联项目"
              fullWidth
              value={newMilestoneForm.related_project}
              onChange={(e) =>
                setNewMilestoneForm({
                  ...newMilestoneForm,
                  related_project: e.target.value,
                })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewMilestoneDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: "#3b82f6" }}
            onClick={handleCreateMilestone}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 里程碑详情对话框 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>里程碑详情</DialogTitle>
        <DialogContent>
          {selectedMilestone && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                {selectedMilestone.name}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Chip
                  label={
                    selectedMilestone.status === "completed"
                      ? "已完成"
                      : selectedMilestone.status === "active"
                        ? "进行中"
                        : "规划中"
                  }
                  size="small"
                  color={
                    selectedMilestone.status === "completed"
                      ? "success"
                      : selectedMilestone.status === "active"
                        ? "primary"
                        : "warning"
                  }
                />
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  进度
                </Typography>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}
                >
                  <LinearProgress
                    variant="determinate"
                    value={selectedMilestone.progress}
                    sx={{ flex: 1, height: 10, borderRadius: 4 }}
                  />
                  <Typography variant="body1" fontWeight="bold">
                    {selectedMilestone.progress}%
                  </Typography>
                </Box>
              </Box>
              <Stack direction="row" spacing={4} sx={{ mt: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    开始日期
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedMilestone.start_date}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    结束日期
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedMilestone.end_date}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    关联项目
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedMilestone.related_project}
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
    </>
  );
};

export default RsMilestonePageRefactored;
