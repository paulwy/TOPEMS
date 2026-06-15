/**
 * FlowInstanceListPage 重构版本
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
  Stack,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
} from "@mui/material";
import {
  Plus,
  Eye,
  GitBranch,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Play,
  RefreshCw,
  Loader2,
} from "lucide-react";
import type { WorkflowInstance, Workflow } from "../api/flow";
import { flowApi } from "../api/flow";
import { useAppStore } from "../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from "../components/templates";
import { PageHeader } from "../components/layout";
import { FilterBar, type FilterConfig } from "../components/mui";

// ============ 类型定义 ============
interface FilterValues {
  search: string;
  workflow: string;
}

interface InstanceData {
  items: WorkflowInstance[];
  total: number;
  page: number;
  page_size: number;
}

// ============ 列定义 ============
const columns: ColumnDef<WorkflowInstance>[] = [
  {
    id: "id",
    header: "实例 ID",
    accessor: "id",
    render: (value) => (
      <Box sx={{ fontWeight: 500 }}>
        {String(value).substring(0, 8)}...
      </Box>
    ),
  },
  {
    id: "workflow_id",
    header: "工作流",
    accessor: "workflow_id",
    render: (value, row) => {
      const workflow = (row as any)._workflow;
      return (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <GitBranch size={16} />
          <Box>{workflow?.name || "未知"}</Box>
        </Stack>
      );
    },
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => {
      const statusConfig: Record<string, { label: string; color: "success" | "error" | "info" | "warning" | "default" }> = {
        completed: { label: "已完成", color: "success" },
        rejected: { label: "已拒绝", color: "error" },
        running: { label: "进行中", color: "info" },
        pending: { label: "待处理", color: "warning" },
      };
      const config = statusConfig[value] || { label: value, color: "default" as const };
      return <Chip size="small" label={config.label} color={config.color} variant="outlined" />;
    },
  },
  {
    id: "current_node",
    header: "当前节点",
    accessor: "current_node",
    render: (value) => value || "-",
  },
  {
    id: "created_at",
    header: "创建时间",
    accessor: "created_at",
    render: (value) => new Date(value as string).toLocaleString(),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (instance: WorkflowInstance) => void,
): RowAction<WorkflowInstance>[] => [
  {
    label: "查看",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "search",
    placeholder: "搜索实例ID...",
  },
  {
    id: "workflow",
    label: "工作流",
    type: "select",
    options: [], // 动态填充
  },
];

// ============ 组件 ============
const FlowInstanceListPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InstanceData>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [filtersValue, setFiltersValue] = useState<FilterValues>({
    search: "",
    workflow: "all",
  });

  // 工作流列表
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    workflow_id: "",
    initiator_id: "",
    data: {},
  });
  const [creating, setCreating] = useState(false);

  // 状态统计
  const statusCounts = {
    all: data.items.length,
    running: data.items.filter((i) => i.status === "running").length,
    pending: data.items.filter((i) => i.status === "pending").length,
    completed: data.items.filter((i) => i.status === "completed").length,
    rejected: data.items.filter((i) => i.status === "rejected").length,
  };

  // 获取工作流列表
  const fetchWorkflows = useCallback(async () => {
    try {
      const response = await flowApi.listWorkflows({ is_active: true });
      if (response.success && response.data) {
        const responseData = response.data as any;
        const list = Array.isArray(responseData) ? responseData : responseData.items || [];
        setWorkflows(list);
      }
    } catch (error) {
      console.error("获取工作流列表失败:", error);
    }
  }, []);

  // 获取实例列表
  const fetchInstances = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: data.page,
        page_size: data.page_size,
      };
      if (filtersValue.workflow !== "all") {
        params.workflow_id = filtersValue.workflow;
      }

      const response = await flowApi.listInstances(params);
      if (response.success && response.data) {
        const responseData = response.data as any;
        const items = Array.isArray(responseData) ? responseData : responseData.items || [];
        
        // 将工作流信息附加到每个实例上
        const itemsWithWorkflow = items.map((item: WorkflowInstance) => ({
          ...item,
          _workflow: workflows.find((w) => w.id === item.workflow_id),
        }));

        setData({
          items: itemsWithWorkflow,
          total: items.length,
          page: data.page,
          page_size: data.page_size,
        });
      } else {
        setData({ items: [], total: 0, page: 1, page_size: 10 });
      }
    } catch (error: any) {
      addNotification({
        type: "error",
        title: "加载失败",
        message: error.message || "获取实例数据失败",
      });
    } finally {
      setLoading(false);
    }
  }, [data.page, data.page_size, filtersValue, workflows, addNotification]);

  // 处理筛选变化
  const handleFilterChange = useCallback((filterId: string, value: any) => {
    setFiltersValue((prev) => ({ ...prev, [filterId]: value }));
  }, []);

  // 处理分页变化
  const handlePageChange = useCallback((page: number) => {
    setData((prev) => ({ ...prev, page }));
  }, []);

  // 处理查看
  const handleView = useCallback(
    (instance: WorkflowInstance) => {
      navigate(`/flow/instances/${instance.id}`);
    },
    [navigate],
  );

  // 处理启动实例
  const handleStartInstance = useCallback(async () => {
    if (!createFormData.workflow_id) {
      addNotification({ title: "提示", message: "请选择工作流", type: "info" });
      return;
    }

    try {
      setCreating(true);
      const response = await flowApi.startInstance({
        workflow_id: createFormData.workflow_id,
        initiator_id: createFormData.initiator_id || undefined,
        data: createFormData.data,
      });

      if (response.success) {
        addNotification({
          title: "成功",
          message: "工作流实例启动成功",
          type: "success",
        });
        setShowCreateModal(false);
        setCreateFormData({ workflow_id: "", initiator_id: "", data: {} });
        fetchInstances();
      } else {
        addNotification({
          title: "失败",
          message: response.message || "启动失败",
          type: "error",
        });
      }
    } catch (error: any) {
      addNotification({
        title: "失败",
        message: "启动工作流实例失败",
        type: "error",
      });
    } finally {
      setCreating(false);
    }
  }, [createFormData, addNotification, fetchInstances]);

  // 动态生成筛选器选项
  const dynamicFilters: FilterConfig[] = [
    {
      id: "search",
      label: "搜索",
      type: "search",
      placeholder: "搜索实例ID...",
    },
    {
      id: "workflow",
      label: "工作流",
      type: "select",
      options: [
        { value: "all", label: "全部工作流" },
        ...workflows.map((w) => ({ value: w.id, label: w.name })),
      ],
    },
  ];

  // 初始加载
  React.useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  React.useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  return (
    <>
      <PageHeader
        title="工作流实例"
        subtitle="管理运行中的工作流实例"
        showBack
        onBack={() => navigate("/dashboard")}
        actions={
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setShowCreateModal(true)}
          >
            启动实例
          </Button>
        }
      />

      {/* 状态统计卡片 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 2,
          mb: 3,
        }}
      >
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card
            key={status}
            sx={{
              cursor: "pointer",
              border: filtersValue.workflow === status ? 2 : 0,
              borderColor: "primary.main",
            }}
            onClick={() => setFiltersValue((prev) => ({ ...prev, workflow: status }))}
          >
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ fontWeight: 700, fontSize: "1.5rem" }}>{count}</Box>
              <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                {status === "all" ? "全部" : status}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <ListPageTemplate
        columns={columns}
        data={data.items}
        loading={loading}
        rowActions={getRowActions(handleView)}
        filters={dynamicFilters}
        onFilterChange={handleFilterChange}
        pagination={{
          page: data.page,
          pageSize: data.page_size,
          total: data.total,
          onPageChange: handlePageChange,
        }}
        onRowClick={handleView}
        emptyMessage="暂无工作流实例"
        customActions={
          <IconButton onClick={fetchInstances} title="刷新">
            <Loader2
              size={20}
              sx={{ animation: loading ? "spin 1s linear infinite" : "none" }}
            />
          </IconButton>
        }
      />

      {/* 启动实例对话框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>启动工作流实例</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>选择工作流 *</InputLabel>
              <Select
                value={createFormData.workflow_id}
                label="选择工作流 *"
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    workflow_id: e.target.value,
                  })
                }
              >
                {workflows.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="发起人ID"
              value={createFormData.initiator_id}
              onChange={(e) =>
                setCreateFormData({
                  ...createFormData,
                  initiator_id: e.target.value,
                })
              }
              placeholder="可选"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setShowCreateModal(false)}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleStartInstance}
            disabled={creating || !createFormData.workflow_id}
            startIcon={
              creating ? (
                <Loader2 size={16} sx={{ animation: "spin 1s linear infinite" }} />
              ) : undefined
            }
          >
            启动
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FlowInstanceListPageRefactored;
