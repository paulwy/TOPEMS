import {
  Button,
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Loader2,
  Eye,
  GitBranch,
  ChevronLeft,
  Plus,
  FileText,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { WorkflowInstance, Workflow } from "@/api/flow";
import { flowApi } from "@/api/flow";
import { useAppStore } from "../../store";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";
import { ModeToggle } from "@/components/ModeToggle";

const FlowInstanceListPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [workflowFilter, setWorkflowFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    workflow_id: "",
    initiator_id: "",
    data: {},
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, workflowFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      const params: any = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (workflowFilter !== "all") {
        params.workflow_id = workflowFilter;
      }

      const instanceResponse = await flowApi.listInstances(params);
      if (instanceResponse.success && instanceResponse.data) {
        const data = instanceResponse.data as any;
        const instanceList = Array.isArray(data) ? data : data.items || [];
        setInstances(instanceList);
      } else {
        setInstances([]);
      }

      const workflowResponse = await flowApi.listWorkflows({ is_active: true });
      if (workflowResponse.success && workflowResponse.data) {
        const data = workflowResponse.data as any;
        const workflowList = Array.isArray(data) ? data : data.items || [];
        setWorkflows(workflowList);
      }
    } catch (err) {
      console.error("加载数据失败:", err);
      addNotification({
        title: "加载失败",
        message: "加载数据失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartInstance = async () => {
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
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: response.message || "启动失败",
          type: "error",
        });
      }
    } catch (err) {
      addNotification({
        title: "失败",
        message: "启动工作流实例失败",
        type: "error",
      });
      console.error("启动失败:", err);
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadgeVariant = (
    status: string,
  ):
    | "success"
    | "error"
    | "info"
    | "warning"
    | "default"
    | "primary"
    | "secondary" => {
    switch (status) {
      case "completed":
        return "success";
      case "rejected":
        return "error";
      case "running":
        return "info";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      completed: "已完成",
      rejected: "已拒绝",
      running: "进行中",
      pending: "待处理",
    };
    return statusMap[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={20} style={{ color: "#16a34a" }} />;
      case "rejected":
        return <XCircle size={20} style={{ color: "#dc2626" }} />;
      case "running":
        return <Play size={20} style={{ color: "#2563eb" }} />;
      case "pending":
        return <Clock size={20} style={{ color: "#ca8a04" }} />;
      default:
        return <AlertCircle size={20} style={{ color: "#4b5563" }} />;
    }
  };

  const statusCounts = {
    all: instances.length,
    running: instances.filter((i) => i.status === "running").length,
    pending: instances.filter((i) => i.status === "pending").length,
    completed: instances.filter((i) => i.status === "completed").length,
    rejected: instances.filter((i) => i.status === "rejected").length,
  };

  const columns = useMemo<ColumnDef<WorkflowInstance>[]>(
    () => [
      {
        accessorKey: "id",
        header: "实例 ID",
        cell: ({ row }) => {
          return (
            <Typography sx={{ fontWeight: 500, color: "grey.900" }}>
              {row.original.id.substring(0, 8)}...
            </Typography>
          );
        },
      },
      {
        accessorKey: "workflow_id",
        header: "工作流",
        cell: ({ row }) => {
          const workflow = workflows.find(
            (w) => w.id === row.original.workflow_id,
          );
          return (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              <FileText size={16} />
              <Typography variant="body2">
                {workflow?.name || "未知"}
              </Typography>
            </Stack>
          );
        },
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              {getStatusIcon(status)}
              <Chip
                size="small"
                variant={
                  getStatusBadgeVariant(status) === "warning"
                    ? "outlined"
                    : "filled"
                }
                color={getStatusBadgeVariant(status)}
                label={getStatusText(status)}
              />
            </Stack>
          );
        },
      },
      {
        accessorKey: "current_node",
        header: "当前节点",
        cell: ({ row }) => {
          return row.original.current_node ? (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              <Users size={16} />
              <Typography variant="body2" color="text.secondary">
                {row.original.current_node}
              </Typography>
            </Stack>
          ) : (
            "-"
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "创建时间",
        cell: ({ row }) => {
          return (
            <Typography variant="body2" color="text.secondary">
              {new Date(row.original.created_at).toLocaleString()}
            </Typography>
          );
        },
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => {
          return (
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Tooltip title="查看详情">
                <IconButton
                  size="small"
                  onClick={() => navigate(`/flow/instances/${row.original.id}`)}
                >
                  <Eye size={20} />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ],
    [workflows],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <IconButton onClick={() => navigate("/dashboard")}>
                <ChevronLeft size={20} />
              </IconButton>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: "primary.light",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <GitBranch size={24} style={{ color: "#6366f1" }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  工作流实例
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  管理运行中的工作流实例
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <ModeToggle />
              <Button
                variant="contained"
                onClick={() => setShowCreateModal(true)}
                startIcon={<Plus size={20} />}
              >
                启动实例
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Stats Cards */}
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
              border: statusFilter === status ? 2 : 0,
              borderColor: "primary.main",
            }}
            onClick={() => setStatusFilter(status)}
          >
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {count}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {status === "all" ? "全部" : getStatusText(status)}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <TextField
              size="small"
              placeholder="搜索实例ID..."
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={20} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 128 }}>
              <InputLabel>全部工作流</InputLabel>
              <Select
                value={workflowFilter}
                label="全部工作流"
                onChange={(e) => setWorkflowFilter(e.target.value)}
              >
                <MenuItem value="all">全部工作流</MenuItem>
                {workflows.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              onClick={loadData}
              startIcon={
                loading ? (
                  <Loader2
                    size={20}
                    sx={{
                      animation: loading ? "spin 1s linear infinite" : "none",
                    }}
                  />
                ) : (
                  <RefreshIcon />
                )
              }
            >
              刷新
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ p: 4 }}>
              <Stack spacing={2}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Stack
                    key={i}
                    direction="row"
                    spacing={2}
                    sx={{ alignItems: "center" }}
                  >
                    <Skeleton variant="circular" width={48} height={48} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="75%" />
                      <Skeleton variant="text" width="50%" />
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Box>
          ) : (
            <DataTable
              columns={columns}
              data={instances}
              searchKey="id"
              searchPlaceholder="搜索实例ID..."
            />
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
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
                <Loader2 size={16} className="animate-spin" />
              ) : undefined
            }
          >
            启动
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export default FlowInstanceListPage;
