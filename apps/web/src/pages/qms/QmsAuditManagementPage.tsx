import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardCheck,
  Users,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Plus,
  Eye,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "../../components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { qmsApi } from "../../api/qms";
import type { AuditPlan, AuditTask, AuditFinding } from "../../api/qms";

const QmsAuditManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<AuditPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<AuditPlan | null>(null);
  const [tasks, setTasks] = useState<AuditTask[]>([]);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    audit_type: "internal",
    start_date: "",
    end_date: "",
    auditors: "",
    departments: "",
  });

  useEffect(() => {
    loadAuditPlans();
  }, []);

  const loadAuditPlans = async () => {
    try {
      setLoading(true);
      const response = await qmsApi.listAuditPlans();
      if (response.success && response.data) {
        const plansData = response.data as any;
        const plansArray = Array.isArray(plansData)
          ? plansData
          : plansData.plans || [];
        setPlans(plansArray);
      }
    } catch (error) {
      console.error("加载审核计划失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlanDetails = async (planId: string) => {
    try {
      const [tasksRes, findingsRes] = await Promise.all([
        qmsApi.listAuditTasks(planId),
        qmsApi.listAuditFindings(planId),
      ]);

      if (tasksRes.success && tasksRes.data) {
        const tasksData = tasksRes.data as any;
        const tasksArray = Array.isArray(tasksData)
          ? tasksData
          : tasksData.tasks || [];
        setTasks(tasksArray);
      }

      if (findingsRes.success && findingsRes.data) {
        const findingsData = findingsRes.data as any;
        const findingsArray = Array.isArray(findingsData)
          ? findingsData
          : findingsData.findings || [];
        setFindings(findingsArray);
      }
    } catch (error) {
      console.error("加载审核详情失败:", error);
    }
  };

  const handleSelectPlan = async (plan: AuditPlan) => {
    setSelectedPlan(plan);
    await loadPlanDetails(plan.id);
    setShowDetailModal(true);
  };

  const handleCreatePlan = async () => {
    try {
      const auditorsArray = formData.auditors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const response = await qmsApi.createAuditPlan({
        title: formData.title,
        description: formData.description,
        audit_type: formData.audit_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        auditor: auditorsArray[0] || "",
        auditors: auditorsArray,
        departments: formData.departments
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        status: "planning",
        plan_no: `AP-${Date.now()}`,
        planned_date: formData.start_date,
      });
      if (response.success) {
        setShowAddModal(false);
        loadAuditPlans();
        resetForm();
      }
    } catch (error) {
      console.error("创建审核计划失败:", error);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await qmsApi.completeAuditTask(taskId);
      if (response.success && selectedPlan) {
        loadPlanDetails(selectedPlan.id);
      }
    } catch (error) {
      console.error("完成审核任务失败:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      audit_type: "internal",
      start_date: "",
      end_date: "",
      auditors: "",
      departments: "",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      planning: { color: "bg-blue-100 text-blue-700", label: "计划中" },
      计划中: { color: "bg-blue-100 text-blue-700", label: "计划中" },
      in_progress: { color: "bg-yellow-100 text-yellow-700", label: "进行中" },
      进行中: { color: "bg-yellow-100 text-yellow-700", label: "进行中" },
      completed: { color: "bg-green-100 text-green-700", label: "已完成" },
      已完成: { color: "bg-green-100 text-green-700", label: "已完成" },
      cancelled: { color: "bg-red-100 text-red-700", label: "已取消" },
      已取消: { color: "bg-red-100 text-red-700", label: "已取消" },
    };
    const item = statusMap[status] || {
      color: "bg-gray-100 text-gray-700",
      label: status,
    };
    return <Badge className={item.color}>{item.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { color: string; label: string }> = {
      high: { color: "bg-red-100 text-red-700", label: "高" },
      medium: { color: "bg-yellow-100 text-yellow-700", label: "中" },
      low: { color: "bg-green-100 text-green-700", label: "低" },
    };
    const item = priorityMap[priority] || {
      color: "bg-gray-100 text-gray-700",
      label: priority,
    };
    return <Badge className={item.color}>{item.label}</Badge>;
  };

  const planColumns: ColumnDef<AuditPlan>[] = [
    {
      accessorKey: "title",
      header: "审核计划",
      cell: ({ row }) => (
        <span className="font-medium text-slate-900">{row.original.title}</span>
      ),
    },
    {
      accessorKey: "audit_type",
      header: "类型",
      cell: ({ row }) => (
        <Badge className="bg-purple-100 text-purple-700">
          {row.original.audit_type === "internal" ? "内部审核" : "外部审核"}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: "start_date",
      header: "开始日期",
      cell: ({ row }) => (
        <span>
          {row.original.start_date
            ? new Date(row.original.start_date).toLocaleDateString("zh-CN")
            : "-"}
        </span>
      ),
    },
    {
      accessorKey: "end_date",
      header: "结束日期",
      cell: ({ row }) => (
        <span>
          {row.original.end_date
            ? new Date(row.original.end_date).toLocaleDateString("zh-CN")
            : "-"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSelectPlan(row.original)}
        >
          <Eye className="w-4 h-4 mr-1" />
          查看
        </Button>
      ),
    },
  ];

  const taskColumns: ColumnDef<AuditTask>[] = [
    { accessorKey: "title", header: "任务名称" },
    {
      accessorKey: "priority",
      header: "优先级",
      cell: ({ row }) => getPriorityBadge(row.original.priority),
    },
    {
      accessorKey: "assignee",
      header: "负责人",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>{row.original.assignee || "-"}</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.status !== "completed" && (
            <Button
              variant="ghost"
              size="icon"
              className="text-green-600"
              onClick={() => handleCompleteTask(row.original.id)}
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const findingColumns: ColumnDef<AuditFinding>[] = [
    {
      accessorKey: "severity",
      header: "严重程度",
      cell: ({ row }) => getPriorityBadge(row.original.severity),
    },
    { accessorKey: "description", header: "问题描述" },
    { accessorKey: "recommendation", header: "改进建议" },
    {
      accessorKey: "status",
      header: "处理状态",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
  ];

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;
  const openFindings = findings.filter((f) => f.status !== "resolved").length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/qms")}
                className="h-8 w-8"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">审核管理</h1>
                <p className="text-xs text-slate-500">Audit Management</p>
              </div>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              创建审核计划
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">审核计划总数</p>
                  <p className="text-3xl font-bold mt-1">{plans.length}</p>
                </div>
                <ClipboardCheck className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">进行中审核</p>
                  <p className="text-3xl font-bold mt-1">
                    {plans.filter((p) => p.status === "in_progress").length}
                  </p>
                </div>
                <Clock className="w-12 h-12 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">已完成审核</p>
                  <p className="text-3xl font-bold mt-1">
                    {plans.filter((p) => p.status === "completed").length}
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              审核计划列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            {plans.length > 0 ? (
              <DataTable
                columns={planColumns}
                data={plans}
                enablePagination={false}
              />
            ) : (
              <div className="text-center py-12 text-slate-500">
                <ClipboardCheck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>暂无审核计划</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  创建第一个计划
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>创建审核计划</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>计划名称 *</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="请输入审核计划名称"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>审核类型</Label>
                <select
                  value={formData.audit_type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      audit_type: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="internal">内部审核</option>
                  <option value="external">外部审核</option>
                </select>
              </div>
              <div>
                <Label>审核员</Label>
                <Input
                  value={formData.auditors}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      auditors: e.target.value,
                    }))
                  }
                  placeholder="多人用逗号分隔"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>开始日期</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      start_date: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>结束日期</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      end_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>涉及部门</Label>
              <Input
                value={formData.departments}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    departments: e.target.value,
                  }))
                }
                placeholder="多部门用逗号分隔"
              />
            </div>
            <div>
              <Label>计划描述</Label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="请描述审核计划的目的和范围..."
                className="w-full p-3 rounded-md border border-slate-200 resize-none h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              取消
            </Button>
            <Button onClick={handleCreatePlan}>创建计划</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              {selectedPlan?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">审核类型</p>
                  <p className="font-medium text-blue-900 mt-1">
                    {selectedPlan.audit_type === "internal"
                      ? "内部审核"
                      : "外部审核"}
                  </p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-600">审核状态</p>
                  <p className="font-medium text-yellow-900 mt-1">
                    {getStatusBadge(selectedPlan.status)}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">任务进度</p>
                  <p className="font-medium text-green-900 mt-1">
                    {completedTasks}/{totalTasks} 完成
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">审核员</p>
                  <p className="text-slate-900 mt-1 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {selectedPlan.auditors?.join(", ") || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">涉及部门</p>
                  <p className="text-slate-900 mt-1">
                    {selectedPlan.departments?.join(", ") || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">开始日期</p>
                  <p className="text-slate-900 mt-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {selectedPlan.start_date
                      ? new Date(selectedPlan.start_date).toLocaleDateString(
                          "zh-CN",
                        )
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">结束日期</p>
                  <p className="text-slate-900 mt-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {selectedPlan.end_date
                      ? new Date(selectedPlan.end_date).toLocaleDateString(
                          "zh-CN",
                        )
                      : "-"}
                  </p>
                </div>
              </div>

              {selectedPlan.description && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">计划描述</p>
                  <p className="text-slate-900 mt-1">
                    {selectedPlan.description}
                  </p>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4">
                <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  审核任务 ({completedTasks}/{totalTasks})
                </h3>
                <DataTable
                  columns={taskColumns}
                  data={tasks}
                  enablePagination={false}
                />
              </div>

              {findings.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    审核发现 ({openFindings} 项待处理)
                  </h3>
                  <DataTable
                    columns={findingColumns}
                    data={findings}
                    enablePagination={false}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowDetailModal(false)}
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QmsAuditManagementPage;
