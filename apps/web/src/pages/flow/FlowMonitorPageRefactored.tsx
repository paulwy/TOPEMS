/**
 * FlowMonitorPage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 使用 ListPageTemplate 替代 Card + Table 布局
 * 3. 使用 ColumnDef 定义表格列
 */

import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Eye,
  Bell,
  Ban,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../../components/templates";
import { PageHeader } from "../../components/layout";

// ============ 类型定义 ============
interface FlowInstance {
  id: string;
  name: string;
  applicant: string;
  currentNode: string;
  status: "running" | "completed" | "rejected" | "terminated";
  duration: string;
  startTime: string;
}

interface FilterValues {
  search: string;
  name: string;
  status: string;
}

// ============ Mock 数据 ============
const mockInstances: FlowInstance[] = [
  {
    id: "INS-2024-001",
    name: "请假审批流程",
    applicant: "张三",
    currentNode: "部门审批",
    status: "running",
    duration: "2小时30分",
    startTime: "2024-03-20 09:00",
  },
  {
    id: "INS-2024-002",
    name: "费用报销流程",
    applicant: "李四",
    currentNode: "财务审批",
    status: "running",
    duration: "5小时15分",
    startTime: "2024-03-20 08:30",
  },
  {
    id: "INS-2024-003",
    name: "采购申请流程",
    applicant: "王五",
    currentNode: "已完成",
    status: "completed",
    duration: "1天2小时",
    startTime: "2024-03-19 10:00",
  },
  {
    id: "INS-2024-004",
    name: "合同审批流程",
    applicant: "赵六",
    currentNode: "已拒绝",
    status: "rejected",
    duration: "3小时",
    startTime: "2024-03-20 14:00",
  },
  {
    id: "INS-2024-005",
    name: "差旅申请流程",
    applicant: "孙七",
    currentNode: "已终止",
    status: "terminated",
    duration: "30分钟",
    startTime: "2024-03-20 15:30",
  },
  {
    id: "INS-2024-006",
    name: "加班申请流程",
    applicant: "周八",
    currentNode: "已完成",
    status: "completed",
    duration: "1小时",
    startTime: "2024-03-20 16:00",
  },
  {
    id: "INS-2024-007",
    name: "设备借用流程",
    applicant: "吴九",
    currentNode: "部门审批",
    status: "running",
    duration: "45分钟",
    startTime: "2024-03-20 17:00",
  },
  {
    id: "INS-2024-008",
    name: "请假审批流程",
    applicant: "郑十",
    currentNode: "经理审批",
    status: "running",
    duration: "1天",
    startTime: "2024-03-19 17:00",
  },
];

// ============ 状态映射 ============
const getStatusConfig = (
  status: FlowInstance["status"],
): { label: string; color: "success" | "error" | "warning" | "default" } => {
  const statusMap: Record<string, { label: string; color: "success" | "error" | "warning" | "default" }> = {
    running: { label: "进行中", color: "warning" },
    completed: { label: "已完成", color: "success" },
    rejected: { label: "已拒绝", color: "error" },
    terminated: { label: "已终止", color: "default" },
  };
  return statusMap[status] || { label: status, color: "default" as const };
};

// ============ 列定义 ============
const columns: ColumnDef<FlowInstance>[] = [
  {
    id: "id",
    label: "实例ID",
    sortable: true,
  },
  {
    id: "name",
    label: "流程名称",
    sortable: true,
  },
  {
    id: "applicant",
    label: "发起人",
  },
  {
    id: "currentNode",
    label: "当前节点",
  },
  {
    id: "status",
    label: "状态",
    render: (row) => {
      const config = getStatusConfig(row.status);
      return <Chip size="small" label={config.label} color={config.color} />;
    },
  },
  {
    id: "duration",
    label: "耗时",
  },
  {
    id: "startTime",
    label: "开始时间",
  },
];

// ============ 组件 ============
const FlowMonitorPageRefactored: React.FC = () => {
  const navigate = useNavigate();

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FlowInstance[]>(mockInstances);

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 筛选状态
  const [filtersValue, setFiltersValue] = useState<FilterValues>({
    search: "",
    name: "all",
    status: "all",
  });

  // 终止弹窗
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<FlowInstance | null>(
    null,
  );

  // 统计
  const runningCount = data.filter((d) => d.status === "running").length;
  const completedCount = data.filter((d) => d.status === "completed").length;

  // 筛选后的数据
  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.id.toLowerCase().includes(filtersValue.search.toLowerCase()) ||
      item.applicant.toLowerCase().includes(filtersValue.search.toLowerCase());
    const matchesName =
      filtersValue.name === "all" || item.name === filtersValue.name;
    const matchesStatus =
      filtersValue.status === "all" || item.status === filtersValue.status;
    return matchesSearch && matchesName && matchesStatus;
  });

  // 分页数据
  const paginatedData = filteredData.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const totalCount = filteredData.length;

  // 处理搜索
  const handleSearch = useCallback((value: string) => {
    setFiltersValue((prev) => ({ ...prev, search: value }));
    setPage(1);
  }, []);

  // 处理筛选变化
  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    setFiltersValue((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  }, []);

  // 处理分页变化
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // 处理每页数量变化
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  // 处理查看
  const handleView = useCallback((instance: FlowInstance) => {
    console.log("查看实例:", instance.id);
  }, []);

  // 处理催办
  const handleUrge = useCallback((instance: FlowInstance) => {
    console.log("催办:", instance.id);
  }, []);

  // 处理终止
  const handleTerminate = useCallback((instance: FlowInstance) => {
    setSelectedInstance(instance);
    setShowTerminateDialog(true);
  }, []);

  // 确认终止
  const confirmTerminate = useCallback(() => {
    if (selectedInstance) {
      setData((prev) =>
        prev.map((d) =>
          d.id === selectedInstance.id
            ? { ...d, status: "terminated" as const, currentNode: "已终止" }
            : d,
        ),
      );
      setShowTerminateDialog(false);
      setSelectedInstance(null);
    }
  }, [selectedInstance]);

  // 处理取回
  const handleRecall = useCallback((instance: FlowInstance) => {
    console.log("取回:", instance.id);
  }, []);

  // 刷新
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  }, []);

  // 行操作
  const rowActions: RowAction<FlowInstance>[] = [
    { label: "查看", icon: <Eye size={18} />, onClick: handleView },
    {
      label: "催办",
      icon: <Bell size={18} />,
      onClick: handleUrge,
      show: (row) => row.status === "running",
    },
    {
      label: "终止",
      icon: <Ban size={18} />,
      onClick: handleTerminate,
      color: "error",
      show: (row) => row.status === "running",
    },
    {
      label: "取回",
      icon: <RotateCcw size={18} />,
      onClick: handleRecall,
      show: (row) => row.status === "running",
    },
  ];

  return (
    <>
      <PageHeader
        title="流程监控"
        subtitle="监控所有流程实例的运行状态"
        backButton={{ onClick: () => navigate(-1) }}
      />

      {/* 统计卡片 */}
      <Box
        sx={{
          bgcolor: "white",
          borderRadius: 1,
          boxShadow: 1,
          p: 3,
          mb: 3,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Stack direction="row" spacing={3}>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#f59e0b" }}>
              {runningCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              进行中
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#16a34a" }}>
              {completedCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              已完成
            </Typography>
          </Box>
        </Stack>
      </Box>

      <ListPageTemplate<FlowInstance>
        title="流程实例"
        columns={columns}
        data={paginatedData}
        loading={loading}
        searchable
        searchPlaceholder="搜索实例ID或申请人..."
        searchValue={filtersValue.search}
        onSearch={handleSearch}
        filters={[
          {
            id: "name",
            label: "流程名称",
            type: "select",
            options: [
              { value: "all", label: "全部" },
              { value: "请假审批流程", label: "请假审批流程" },
              { value: "费用报销流程", label: "费用报销流程" },
              { value: "采购申请流程", label: "采购申请流程" },
              { value: "合同审批流程", label: "合同审批流程" },
              { value: "差旅申请流程", label: "差旅申请流程" },
              { value: "加班申请流程", label: "加班申请流程" },
              { value: "设备借用流程", label: "设备借用流程" },
            ],
          },
          {
            id: "status",
            label: "状态",
            type: "select",
            options: [
              { value: "all", label: "全部" },
              { value: "running", label: "进行中" },
              { value: "completed", label: "已完成" },
              { value: "rejected", label: "已拒绝" },
              { value: "terminated", label: "已终止" },
            ],
          },
        ]}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total: totalCount,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        onRowClick={handleView}
        emptyMessage="暂无流程实例"
        rowActions={rowActions}
        headerContent={
          <Stack
            direction="row"
            spacing={1}
            sx={{ mb: 2, justifyContent: "flex-end" }}
          >
            <Tooltip title="刷新">
              <IconButton onClick={handleRefresh}>
                <RefreshCw
                  size={20}
                  style={{
                    animation: loading ? "spin 1s linear infinite" : "none",
                  }}
                />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      />

      {/* 终止确认对话框 */}
      <Dialog open={showTerminateDialog} onClose={() => setShowTerminateDialog(false)}>
        <DialogTitle>终止流程实例</DialogTitle>
        <DialogContent>
          <Typography>
            确定要终止流程实例 <strong>{selectedInstance?.id}</strong> 吗？
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500", mt: 1 }}>
            终止后该流程将无法恢复
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setShowTerminateDialog(false)}>
            取消
          </Button>
          <Button variant="contained" color="error" onClick={confirmTerminate}>
            确认终止
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FlowMonitorPageRefactored;
