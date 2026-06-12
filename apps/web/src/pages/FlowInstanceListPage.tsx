import React, { useState, useEffect, useMemo } from "react";
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Loader2,
  Eye,
  User,
  GitBranch,
  ChevronLeft,
  Plus,
  FileText,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { WorkflowInstance, Workflow } from "../api/flow";
import { flowApi } from "../api/flow";
import { useAppStore } from "../store";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/ModeToggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

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
  ): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case "completed":
        return "secondary";
      case "rejected":
        return "destructive";
      case "running":
        return "default";
      case "pending":
        return "outline";
      default:
        return "outline";
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
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "running":
        return <Play className="w-5 h-5 text-blue-600" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
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
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {row.original.id.substring(0, 8)}...
            </div>
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
            <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
              <FileText className="w-4 h-4 mr-1" />
              {workflow?.name || "未知"}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <div className="flex items-center space-x-1">
              {getStatusIcon(status)}
              <Badge variant={getStatusBadgeVariant(status)}>
                {getStatusText(status)}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "current_node",
        header: "当前节点",
        cell: ({ row }) => {
          return row.original.current_node ? (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4 mr-1" />
              {row.original.current_node}
            </div>
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
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(row.original.created_at).toLocaleString()}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => {
          return (
            <div className="flex items-center justify-end">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigate(`/flow/instances/${row.original.id}`)
                      }
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>查看详情</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        },
      },
    ],
    [workflows],
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <GitBranch className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                工作流实例
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                管理运行中的工作流实例
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ModeToggle />
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-5 h-5 mr-2" />
              启动实例
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card
            key={status}
            className={`cursor-pointer transition-all ${statusFilter === status ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""}`}
          >
            <CardContent
              onClick={() => setStatusFilter(status)}
              className="p-4"
            >
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {count}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {status === "all" ? "全部" : getStatusText(status)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input type="text" placeholder="搜索实例ID..." className="pl-10" />
          </div>
          <Select value={workflowFilter} onValueChange={setWorkflowFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="全部工作流" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部工作流</SelectItem>
              {workflows.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="secondary" onClick={loadData}>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <RefreshIcon className="w-5 h-5 mr-2" />
            )}
            刷新
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>启动工作流实例</DialogTitle>
            <DialogDescription>选择要启动的工作流实例</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workflow">选择工作流 *</Label>
              <Select
                value={createFormData.workflow_id}
                onValueChange={(v) =>
                  setCreateFormData({ ...createFormData, workflow_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择工作流" />
                </SelectTrigger>
                <SelectContent>
                  {workflows.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="initiator">发起人ID</Label>
              <Input
                id="initiator"
                type="text"
                value={createFormData.initiator_id}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    initiator_id: e.target.value,
                  })
                }
                placeholder="可选"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleStartInstance}
              disabled={creating || !createFormData.workflow_id}
            >
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              启动
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export default FlowInstanceListPage;
