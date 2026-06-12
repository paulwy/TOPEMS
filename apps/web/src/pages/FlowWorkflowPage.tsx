import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  FileText,
  Play,
  Pause,
  Copy,
  History,
  Loader2,
  GitBranch,
  CheckCircle,
  XCircle,
  ChevronLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Workflow } from "../api/flow";
import { flowApi, CreateWorkflowRequest } from "../api/flow";
import { useAppStore } from "../store";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ModeToggle } from "@/components/ModeToggle";

const FlowWorkflowPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    loadWorkflows();
  }, [statusFilter]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== "all") {
        params.is_active = statusFilter === "active";
      }

      const response = await flowApi.listWorkflows(params);
      if (response.success && response.data) {
        const data = response.data as any;
        const workflowList = Array.isArray(data) ? data : data.items || [];
        setWorkflows(workflowList);
      } else {
        setWorkflows([]);
      }
    } catch (err) {
      console.error("加载工作流列表失败:", err);
      addNotification({
        title: "加载失败",
        message: "加载工作流列表失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async () => {
    if (!formData.name.trim()) {
      addNotification({
        title: "提示",
        message: "请输入工作流名称",
        type: "info",
      });
      return;
    }

    try {
      setCreating(true);
      const response = await flowApi.createWorkflow({
        name: formData.name,
        description: formData.description,
        is_active: formData.is_active,
      });

      if (response.success && response.data) {
        addNotification({
          title: "成功",
          message: "工作流创建成功",
          type: "success",
        });
        setShowCreateDialog(false);
        setFormData({ name: "", description: "", is_active: true });
        loadWorkflows();
        navigate(`/workflow/designer?id=${response.data.id}`);
      } else {
        addNotification({
          title: "失败",
          message: response.message || "创建失败",
          type: "error",
        });
      }
    } catch (err) {
      addNotification({
        title: "失败",
        message: "创建工作流失败",
        type: "error",
      });
      console.error("创建失败:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!window.confirm("确定要删除这个工作流吗？")) return;

    try {
      const response = await flowApi.deleteWorkflow(id);
      if (response.success) {
        addNotification({
          title: "成功",
          message: "工作流已删除",
          type: "success",
        });
        loadWorkflows();
      } else {
        addNotification({
          title: "失败",
          message: response.message || "删除失败",
          type: "error",
        });
      }
    } catch (err) {
      addNotification({
        title: "失败",
        message: "删除工作流失败",
        type: "error",
      });
      console.error("删除失败:", err);
    }
  };

  const handleToggleActive = async (workflow: Workflow) => {
    try {
      const response = await flowApi.updateWorkflow(workflow.id, {
        is_active: !workflow.is_active,
      });
      if (response.success) {
        addNotification({
          title: "成功",
          message: `工作流已${workflow.is_active ? "停用" : "启用"}`,
          type: "success",
        });
        loadWorkflows();
      } else {
        addNotification({
          title: "失败",
          message: response.message || "操作失败",
          type: "error",
        });
      }
    } catch (err) {
      addNotification({ title: "失败", message: "操作失败", type: "error" });
      console.error("切换状态失败:", err);
    }
  };

  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const columns = useMemo<ColumnDef<Workflow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "工作流名称",
        cell: ({ row }) => (
          <div className="flex items-center">
            <GitBranch className="w-4 h-4 mr-2 text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {row.original.name}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "description",
        header: "描述",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {row.original.description || "-"}
          </span>
        ),
      },
      {
        accessorKey: "is_active",
        header: "状态",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "secondary"}>
            {row.original.is_active ? "已启用" : "已停用"}
          </Badge>
        ),
      },
      {
        accessorKey: "created_at",
        header: "创建时间",
        cell: ({ row }) => (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(row.original.created_at).toLocaleString("zh-CN")}
          </span>
        ),
      },
      {
        accessorKey: "updated_at",
        header: "更新时间",
        cell: ({ row }) => (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(row.original.updated_at).toLocaleString("zh-CN")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <div className="flex items-center space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigate(`/workflow/designer?id=${row.original.id}`)
                    }
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>编辑设计</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigate(`/flow/history?id=${row.original.id}`)
                    }
                  >
                    <History className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>版本历史</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(row.original)}
                  >
                    {row.original.is_active ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {row.original.is_active ? "停用" : "启用"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteWorkflow(row.original.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>删除</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ),
      },
    ],
    [navigate],
  );

  const stats = {
    total: workflows.length,
    active: workflows.filter((w) => w.is_active).length,
    inactive: workflows.filter((w) => !w.is_active).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
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
                工作流管理
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                设计和管理审批流程
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ModeToggle />
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-5 h-5 mr-2" />
              创建工作流
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card
          className={`cursor-pointer transition-all ${statusFilter === "all" ? "ring-2 ring-blue-500" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.total}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              全部工作流
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${statusFilter === "active" ? "ring-2 ring-blue-500" : ""}`}
          onClick={() => setStatusFilter("active")}
        >
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.active}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              已启用
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${statusFilter === "inactive" ? "ring-2 ring-blue-500" : ""}`}
          onClick={() => setStatusFilter("inactive")}
        >
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {stats.inactive}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              已停用
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索工作流名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="secondary" onClick={loadWorkflows}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            刷新
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-4">
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
          ) : (
            <DataTable
              columns={columns}
              data={filteredWorkflows}
              searchKey="name"
              searchPlaceholder="搜索工作流..."
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建工作流</DialogTitle>
            <DialogDescription>创建一个新的工作流定义</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">工作流名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="请输入工作流名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="请输入工作流描述"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label htmlFor="is_active">启用工作流</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              取消
            </Button>
            <Button onClick={handleCreateWorkflow} disabled={creating}>
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              创建并设计
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlowWorkflowPage;
