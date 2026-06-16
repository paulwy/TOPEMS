/**
 * RsTestPage 重构版本
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
  Play,
  FileText,
  Edit,
  ClipboardList,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { ListPageTemplate, type ColumnDef, type FilterConfig } from "../../components/templates";
import { PageHeader } from "../../components/layout";

// ============ 类型定义 ============
interface TestCase {
  id: string;
  case_no: string;
  case_name: string;
  case_type: string;
  priority: string;
  status: string;
  related_requirement: string;
}

interface FilterValues {
  search: string;
  caseType: string;
  priority: string;
  status: string;
}

// ============ 列定义 ============
const columns: ColumnDef<TestCase>[] = [
  {
    id: "case_no",
    label: "用例编号",
    sortable: true,
    render: (row) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <ClipboardList size={16} color="#3b82f6" />
        {row.case_no}
      </Box>
    ),
  },
  {
    id: "case_name",
    label: "用例名称",
  },
  {
    id: "case_type",
    label: "用例类型",
    render: (row) => {
      const typeMap: Record<string, string> = {
        功能测试: "功能测试",
        性能测试: "性能测试",
        压力测试: "压力测试",
        UI测试: "UI测试",
        安全测试: "安全测试",
      };
      return <Chip label={typeMap[row.case_type] || row.case_type} size="small" variant="outlined" />;
    },
  },
  {
    id: "priority",
    label: "优先级",
    render: (row) => {
      const priorityConfig: Record<string, { label: string; color: "error" | "warning" | "default" }> = {
        high: { label: "高", color: "error" },
        medium: { label: "中", color: "warning" },
        low: { label: "低", color: "default" },
      };
      const config = priorityConfig[row.priority] || priorityConfig.medium;
      return <Chip label={config.label} size="small" color={config.color} />;
    },
  },
  {
    id: "status",
    label: "状态",
    sortable: true,
    render: (row) => {
      const statusConfig: Record<string, { label: string; color: "success" | "error" | "warning" | "default" }> = {
        passed: { label: "已通过", color: "success" },
        failed: { label: "未通过", color: "error" },
        pending: { label: "待执行", color: "warning" },
      };
      const config = statusConfig[row.status] || statusConfig.pending;
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {row.status === "passed" ? (
            <CheckCircle size={14} color="green" />
          ) : row.status === "failed" ? (
            <XCircle size={14} color="red" />
          ) : (
            <Clock size={14} color="orange" />
          )}
          <Chip label={config.label} size="small" color={config.color} />
        </Box>
      );
    },
  },
  {
    id: "related_requirement",
    label: "关联需求",
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
    id: "caseType",
    label: "用例类型",
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
];

// ============ 组件 ============
const RsTestPageRefactored: React.FC = () => {
  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TestCase[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 筛选状态
  const [filtersValue, setFiltersValue] = useState<FilterValues>({
    search: "",
    caseType: "",
    priority: "",
    status: "",
  });

  // 模态框状态
  const [newCaseDialogOpen, setNewCaseDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [newCaseForm, setNewCaseForm] = useState({
    case_name: "",
    case_type: "功能测试",
    priority: "medium",
    related_requirement: "",
  });

  // 模拟数据
  useEffect(() => {
    const mockTestCases: TestCase[] = [
      {
        id: "1",
        case_no: "TC-001",
        case_name: "用户登录功能测试",
        case_type: "功能测试",
        priority: "high",
        status: "passed",
        related_requirement: "REQ-001",
      },
      {
        id: "2",
        case_no: "TC-002",
        case_name: "用户注册流程测试",
        case_type: "功能测试",
        priority: "high",
        status: "passed",
        related_requirement: "REQ-002",
      },
      {
        id: "3",
        case_no: "TC-003",
        case_name: "数据导出性能测试",
        case_type: "性能测试",
        priority: "medium",
        status: "failed",
        related_requirement: "REQ-003",
      },
      {
        id: "4",
        case_no: "TC-004",
        case_name: "接口并发测试",
        case_type: "压力测试",
        priority: "medium",
        status: "pending",
        related_requirement: "REQ-004",
      },
      {
        id: "5",
        case_no: "TC-005",
        case_name: "UI兼容性测试",
        case_type: "UI测试",
        priority: "low",
        status: "passed",
        related_requirement: "REQ-005",
      },
      {
        id: "6",
        case_no: "TC-006",
        case_name: "安全性测试-SQL注入",
        case_type: "安全测试",
        priority: "high",
        status: "passed",
        related_requirement: "REQ-006",
      },
    ];

    setTimeout(() => {
      setData(mockTestCases);
      setLoading(false);
    }, 500);
  }, []);

  // 获取数据
  const fetchTestCases = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  // 处理筛选变化
  const handleFilterChange = useCallback((filters: Record<string, any>) => {
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

  // 处理创建用例
  const handleCreateCase = useCallback(() => {
    const newCase: TestCase = {
      id: String(Date.now()),
      case_no: `TC-${String(data.length + 1).padStart(3, "0")}`,
      case_name: newCaseForm.case_name,
      case_type: newCaseForm.case_type,
      priority: newCaseForm.priority,
      status: "pending",
      related_requirement: newCaseForm.related_requirement,
    };
    setData((prev) => [newCase, ...prev]);
    setNewCaseDialogOpen(false);
    setNewCaseForm({ case_name: "", case_type: "功能测试", priority: "medium", related_requirement: "" });
  }, [data.length, newCaseForm]);

  // 处理查看详情
  const handleViewDetail = useCallback((tc: TestCase) => {
    setSelectedCase(tc);
    setDetailDialogOpen(true);
  }, []);

  // 处理执行测试
  const handleExecuteTest = useCallback((tc: TestCase) => {
    setData((prev) => prev.map((item) => (item.id === tc.id ? { ...tc, status: "passed" } : item)));
  }, []);

  // 过滤数据
  const filteredData = data.filter((tc) => {
    const matchesSearch =
      !filtersValue.search ||
      tc.case_no.toLowerCase().includes(filtersValue.search.toLowerCase()) ||
      tc.case_name.toLowerCase().includes(filtersValue.search.toLowerCase()) ||
      tc.related_requirement.toLowerCase().includes(filtersValue.search.toLowerCase());
    const matchesType = !filtersValue.caseType || tc.case_type === filtersValue.caseType;
    const matchesPriority = !filtersValue.priority || tc.priority === filtersValue.priority;
    const matchesStatus = !filtersValue.status || tc.status === filtersValue.status;
    return matchesSearch && matchesType && matchesPriority && matchesStatus;
  });

  // 处理导出
  const handleExport = useCallback(() => {
    // 导出功能开发中
  }, []);

  // 行操作
  const rowActions = [
    {
      label: "查看详情",
      icon: <FileText size={16} />,
      onClick: handleViewDetail,
      color: "primary" as const,
    },
    {
      label: "执行测试",
      icon: <Play size={16} />,
      onClick: handleExecuteTest,
      color: "primary" as const,
    },
    {
      label: "编辑",
      icon: <Edit size={16} />,
      onClick: () => {},
      color: "warning" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title="测试管理"
        subtitle="管理测试用例、执行测试任务"
        createButton={{
          label: "新建用例",
          onClick: () => setNewCaseDialogOpen(true),
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
            <IconButton onClick={fetchTestCases}>
              <RefreshCw
                size={20}
                style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
              />
            </IconButton>
          </Tooltip>
        }
      />

      <ListPageTemplate
        title=""
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
        emptyMessage="暂无测试用例数据"
        searchable
        searchPlaceholder="搜索用例编号、名称..."
      />

      {/* 新建用例对话框 */}
      <Dialog
        open={newCaseDialogOpen}
        onClose={() => setNewCaseDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>新建用例</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="用例名称"
              fullWidth
              value={newCaseForm.case_name}
              onChange={(e) => setNewCaseForm({ ...newCaseForm, case_name: e.target.value })}
            />
            <TextField
              label="用例类型"
              fullWidth
              value={newCaseForm.case_type}
              onChange={(e) => setNewCaseForm({ ...newCaseForm, case_type: e.target.value })}
            />
            <TextField
              label="优先级"
              fullWidth
              value={newCaseForm.priority}
              onChange={(e) => setNewCaseForm({ ...newCaseForm, priority: e.target.value })}
            />
            <TextField
              label="关联需求"
              fullWidth
              value={newCaseForm.related_requirement}
              onChange={(e) => setNewCaseForm({ ...newCaseForm, related_requirement: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCaseDialogOpen(false)}>取消</Button>
          <Button variant="contained" sx={{ bgcolor: "#3b82f6" }} onClick={handleCreateCase}>
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 用例详情对话框 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>用例详情</DialogTitle>
        <DialogContent>
          {selectedCase && (
            <Box sx={{ py: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {`${selectedCase.case_no} - ${selectedCase.case_name}`}
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Chip label={selectedCase.case_type} size="small" variant="outlined" />
                <Chip
                  label={selectedCase.priority === "high" ? "高" : selectedCase.priority === "medium" ? "中" : "低"}
                  size="small"
                  color={selectedCase.priority === "high" ? "error" : selectedCase.priority === "medium" ? "warning" : "default"}
                />
                <Chip
                  label={selectedCase.status === "passed" ? "已通过" : selectedCase.status === "failed" ? "未通过" : "待执行"}
                  size="small"
                  color={selectedCase.status === "passed" ? "success" : selectedCase.status === "failed" ? "error" : "warning"}
                />
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  关联需求: {selectedCase.related_requirement}
                </Typography>
              </Box>
              <Box sx={{ p: 2, mt: 2, bgcolor: "#f5f5f5" }}>
                <Typography variant="body2">测试步骤和预期结果区域 - 待实现</Typography>
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

export default RsTestPageRefactored;
