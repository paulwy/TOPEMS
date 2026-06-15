/**
 * RsBugPage 重构版本
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
  Plus,
  Edit,
  Bug,
  User,
  Download,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef } from "../../components/templates";
import { PageHeader } from "../../components/layout";
import { FilterBar, type FilterConfig } from "../../components/mui";

// ============ 类型定义 ============
interface Bug {
  id: string;
  bug_no: string;
  bug_title: string;
  severity: string;
  priority: string;
  status: string;
  assignee: string;
  create_time: string;
}

interface FilterValues {
  search: string;
  severity: string;
  priority: string;
  status: string;
  assignee: string;
}

// ============ 列定义 ============
const columns: ColumnDef<Bug>[] = [
  {
    id: "bug_no",
    header: "缺陷编号",
    accessor: "bug_no",
    sortable: true,
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Bug size={16} color="#3b82f6" />
        {value}
      </Box>
    ),
  },
  {
    id: "bug_title",
    header: "缺陷标题",
    accessor: "bug_title",
    render: (value) => (
      <Tooltip title={value}>
        <Box sx={{ maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value}
        </Box>
      </Tooltip>
    ),
  },
  {
    id: "severity",
    header: "严重程度",
    accessor: "severity",
    render: (value) => {
      const severityConfig: Record<string, { label: string; color: "error" | "warning" | "info" | "default" }> = {
        critical: { label: "严重", color: "error" },
        major: { label: "主要", color: "warning" },
        minor: { label: "次要", color: "info" },
      };
      const config = severityConfig[value] || { label: value, color: "default" as const };
      return <Chip label={config.label} size="small" color={config.color} />;
    },
  },
  {
    id: "priority",
    header: "优先级",
    accessor: "priority",
    render: (value) => {
      const priorityLabel = value === "high" ? "高" : value === "medium" ? "中" : "低";
      return <Chip label={priorityLabel} size="small" variant="outlined" />;
    },
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    sortable: true,
    render: (value) => {
      const statusConfig: Record<string, { label: string; color: "default" | "primary" | "success" | "error" }> = {
        open: { label: "待处理", color: "error" },
        in_progress: { label: "处理中", color: "primary" },
        resolved: { label: "已解决", color: "success" },
        closed: { label: "已关闭", color: "default" },
      };
      const config = statusConfig[value] || { label: value, color: "default" as const };
      return <Chip label={config.label} size="small" color={config.color} />;
    },
  },
  {
    id: "assignee",
    header: "指派给",
    accessor: "assignee",
    render: (value) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <User size={14} />
        {value}
      </Box>
    ),
  },
  {
    id: "create_time",
    header: "创建时间",
    accessor: "create_time",
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
    id: "severity",
    label: "严重程度",
    type: "text",
  },
  {
    id: "priority",
    label: "优先级",
    type: "text",
  },
  {
    id: "status",
    label: "状态",
    type: "text",
  },
  {
    id: "assignee",
    label: "指派人",
    type: "text",
  },
];

// ============ 组件 ============
const RsBugPageRefactored: React.FC = () => {
  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Bug[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 筛选状态
  const [filtersValue, setFiltersValue] = useState<FilterValues>({
    search: "",
    severity: "",
    priority: "",
    status: "",
    assignee: "",
  });

  // 模态框状态
  const [newBugDialogOpen, setNewBugDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [newBugForm, setNewBugForm] = useState({
    bug_title: "",
    severity: "medium",
    priority: "medium",
    description: "",
  });

  // 模拟数据
  useEffect(() => {
    const mockBugs: Bug[] = [
      {
        id: "1",
        bug_no: "BUG-001",
        bug_title: "用户登录后页面空白",
        severity: "critical",
        priority: "high",
        status: "open",
        assignee: "张三",
        create_time: "2024-06-15 10:30:00",
      },
      {
        id: "2",
        bug_no: "BUG-002",
        bug_title: "数据导出功能报错",
        severity: "major",
        priority: "high",
        status: "in_progress",
        assignee: "李四",
        create_time: "2024-06-14 14:20:00",
      },
      {
        id: "3",
        bug_no: "BUG-003",
        bug_title: "表单验证提示不准确",
        severity: "minor",
        priority: "low",
        status: "resolved",
        assignee: "王五",
        create_time: "2024-06-13 09:15:00",
      },
      {
        id: "4",
        bug_no: "BUG-004",
        bug_title: "移动端样式错位",
        severity: "major",
        priority: "medium",
        status: "open",
        assignee: "赵六",
        create_time: "2024-06-12 16:45:00",
      },
      {
        id: "5",
        bug_no: "BUG-005",
        bug_title: "搜索结果分页异常",
        severity: "critical",
        priority: "high",
        status: "closed",
        assignee: "孙七",
        create_time: "2024-06-11 11:00:00",
      },
      {
        id: "6",
        bug_no: "BUG-006",
        bug_title: "图片上传进度条不更新",
        severity: "minor",
        priority: "low",
        status: "in_progress",
        assignee: "周八",
        create_time: "2024-06-10 15:30:00",
      },
    ];

    setTimeout(() => {
      setData(mockBugs);
      setTotal(mockBugs.length);
      setLoading(false);
    }, 500);
  }, []);

  // 获取数据
  const fetchBugs = useCallback(() => {
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

  // 处理创建缺陷
  const handleCreateBug = useCallback(() => {
    const newBug: Bug = {
      id: String(Date.now()),
      bug_no: `BUG-${String(data.length + 1).padStart(3, "0")}`,
      bug_title: newBugForm.bug_title,
      severity: newBugForm.severity,
      priority: newBugForm.priority,
      status: "open",
      assignee: "未分配",
      create_time: new Date().toLocaleString(),
    };
    setData((prev) => [newBug, ...prev]);
    setNewBugDialogOpen(false);
    setNewBugForm({ bug_title: "", severity: "medium", priority: "medium", description: "" });
  }, [data.length, newBugForm]);

  // 处理查看详情
  const handleViewDetail = useCallback((bug: Bug) => {
    setSelectedBug(bug);
    setDetailDialogOpen(true);
  }, []);

  // 处理关闭缺陷
  const handleCloseBug = useCallback((bugId: string) => {
    setData((prev) => prev.map((b) => (b.id === bugId ? { ...b, status: "closed" } : b)));
  }, []);

  // 过滤数据
  const filteredData = data.filter((bug) => {
    const matchesSearch =
      !filtersValue.search ||
      bug.bug_no.toLowerCase().includes(filtersValue.search.toLowerCase()) ||
      bug.bug_title.toLowerCase().includes(filtersValue.search.toLowerCase());
    const matchesSeverity = !filtersValue.severity || bug.severity === filtersValue.severity;
    const matchesPriority = !filtersValue.priority || bug.priority === filtersValue.priority;
    const matchesStatus = !filtersValue.status || bug.status === filtersValue.status;
    const matchesAssignee = !filtersValue.assignee || bug.assignee === filtersValue.assignee;
    return matchesSearch && matchesSeverity && matchesPriority && matchesStatus && matchesAssignee;
  });

  // 处理导出
  const handleExport = useCallback(() => {
    // 导出功能开发中
  }, []);

  // 行操作
  const rowActions = [
    {
      label: "查看详情",
      icon: <Bug size={16} />,
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
      label: "关闭",
      icon: <CheckCircle size={16} />,
      onClick: handleCloseBug,
      color: "success" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title="缺陷管理"
        subtitle="管理缺陷报告、跟踪缺陷处理进度"
        createButton={{
          label: "新建缺陷",
          onClick: () => setNewBugDialogOpen(true),
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
            <IconButton onClick={fetchBugs}>
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
        onRowClick={handleViewDetail}
        rowActions={rowActions}
        emptyMessage="暂无缺陷数据"
        searchable
        searchPlaceholder="搜索缺陷编号、标题..."
      />

      {/* 新建缺陷对话框 */}
      <Dialog
        open={newBugDialogOpen}
        onClose={() => setNewBugDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建缺陷</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="缺陷标题"
              fullWidth
              value={newBugForm.bug_title}
              onChange={(e) => setNewBugForm({ ...newBugForm, bug_title: e.target.value })}
            />
            <TextField
              label="严重程度"
              fullWidth
              value={newBugForm.severity}
              onChange={(e) => setNewBugForm({ ...newBugForm, severity: e.target.value })}
            />
            <TextField
              label="优先级"
              fullWidth
              value={newBugForm.priority}
              onChange={(e) => setNewBugForm({ ...newBugForm, priority: e.target.value })}
            />
            <TextField
              label="缺陷描述"
              fullWidth
              multiline
              rows={4}
              value={newBugForm.description}
              onChange={(e) => setNewBugForm({ ...newBugForm, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewBugDialogOpen(false)}>取消</Button>
          <Button variant="contained" sx={{ bgcolor: "#3b82f6" }} onClick={handleCreateBug}>
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 缺陷详情对话框 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>缺陷详情</DialogTitle>
        <DialogContent>
          {selectedBug && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                {selectedBug.bug_no} - {selectedBug.bug_title}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Chip
                  label={selectedBug.severity === "critical" ? "严重" : selectedBug.severity === "major" ? "主要" : "次要"}
                  size="small"
                  color={selectedBug.severity === "critical" ? "error" : selectedBug.severity === "major" ? "warning" : "info"}
                />
                <Chip
                  label={selectedBug.priority === "high" ? "高" : selectedBug.priority === "medium" ? "中" : "低"}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={selectedBug.status === "open" ? "待处理" : selectedBug.status === "in_progress" ? "处理中" : selectedBug.status === "resolved" ? "已解决" : "已关闭"}
                  size="small"
                  color={selectedBug.status === "open" ? "error" : selectedBug.status === "in_progress" ? "primary" : selectedBug.status === "resolved" ? "success" : "default"}
                />
              </Stack>
              <Stack direction="row" spacing={4} sx={{ mt: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    指派人
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedBug.assignee}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    创建时间
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedBug.create_time}
                  </Typography>
                </Box>
              </Stack>
              <Box sx={{ p: 2, mt: 3, bgcolor: "#f5f5f5" }}>
                <Typography variant="body2">缺陷详细信息区域 - 待实现</Typography>
              </Box>
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

export default RsBugPageRefactored;
