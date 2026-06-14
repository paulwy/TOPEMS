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
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
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
    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
      planning: { bg: '#dbeafe', color: '#2563eb', label: "计划中" },
      计划中: { bg: '#dbeafe', color: '#2563eb', label: "计划中" },
      in_progress: { bg: '#fef9c3', color: '#ca8a04', label: "进行中" },
      进行中: { bg: '#fef9c3', color: '#ca8a04', label: "进行中" },
      completed: { bg: '#dcfce7', color: '#16a34a', label: "已完成" },
      已完成: { bg: '#dcfce7', color: '#16a34a', label: "已完成" },
      cancelled: { bg: '#fee2e2', color: '#dc2626', label: "已取消" },
      已取消: { bg: '#fee2e2', color: '#dc2626', label: "已取消" },
    };
    const item = statusMap[status] || {
      bg: '#f3f4f6',
      color: '#4b5563',
      label: status,
    };
    return <Chip label={item.label} size="small" sx={{ backgroundColor: item.bg, color: item.color }} />;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { bg: string; color: string; label: string }> = {
      high: { bg: '#fee2e2', color: '#dc2626', label: "高" },
      medium: { bg: '#fef9c3', color: '#ca8a04', label: "中" },
      low: { bg: '#dcfce7', color: '#16a34a', label: "低" },
    };
    const item = priorityMap[priority] || {
      bg: '#f3f4f6',
      color: '#4b5563',
      label: priority,
    };
    return <Chip label={item.label} size="small" sx={{ backgroundColor: item.bg, color: item.color }} />;
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
        <Chip label={row.original.audit_type === "internal" ? "内部审核" : "外部审核"} size="small" sx={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }} />
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
          variant="text"
          size="small"
          onClick={() => handleSelectPlan(row.original)}
          startIcon={<Box component={Eye} sx={{ fontSize: 16 }} />}
        >
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
        <Box sx={{ display: 'flex', gap: 1 }}>
          {row.original.status !== "completed" && (
            <Button
              variant="text"
              size="small"
              sx={{ color: '#16a34a' }}
              onClick={() => handleCompleteTask(row.original.id)}
              startIcon={<Box component={Check} sx={{ fontSize: 16 }} />}
            />
          )}
        </Box>
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
                variant="text"
                onClick={() => navigate("/qms")}
                sx={{ minWidth: 32, height: 32 }}
              >
                <Box component={ArrowLeft} sx={{ fontSize: 20 }} />
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
          <CardHeader sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component={ClipboardCheck} sx={{ fontSize: 20, color: '#2563eb' }} />
              审核计划列表
            </Typography>
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
                  variant="outlined"
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={() => setShowAddModal(true)}
                  startIcon={<Box component={Plus} sx={{ fontSize: 12 }} />}
                >
                  创建第一个计划
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={showAddModal} onClose={() => setShowAddModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle>创建审核计划</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>计划名称 *</Typography>
              <TextField
                size="small"
                fullWidth
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="请输入审核计划名称"
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>审核类型</Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>审核类型</InputLabel>
                  <Select
                    value={formData.audit_type}
                    label="审核类型"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        audit_type: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value="internal">内部审核</MenuItem>
                    <MenuItem value="external">外部审核</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>审核员</Typography>
                <TextField
                  size="small"
                  fullWidth
                  value={formData.auditors}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      auditors: e.target.value,
                    }))
                  }
                  placeholder="多人用逗号分隔"
                />
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>开始日期</Typography>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  value={formData.start_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      start_date: e.target.value,
                    }))
                  }
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>结束日期</Typography>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  value={formData.end_date}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      end_date: e.target.value,
                    }))
                  }
                />
              </Box>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>涉及部门</Typography>
              <TextField
                size="small"
                fullWidth
                value={formData.departments}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({
                    ...prev,
                    departments: e.target.value,
                  }))
                }
                placeholder="多部门用逗号分隔"
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, display: 'block' }}>计划描述</Typography>
              <TextField
                multiline
                rows={3}
                fullWidth
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="请描述审核计划的目的和范围..."
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowAddModal(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreatePlan}>创建计划</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showDetailModal} onClose={() => setShowDetailModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component={ClipboardCheck} sx={{ fontSize: 20, color: '#2563eb' }} />
          {selectedPlan?.title}
        </DialogTitle>
        <DialogContent>
          {selectedPlan && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: '#2563eb' }}>审核类型</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: '#1e40af', mt: 0.5 }}>
                    {selectedPlan.audit_type === "internal" ? "内部审核" : "外部审核"}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#fefce8', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: '#ca8a04' }}>审核状态</Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedPlan.status)}</Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: '#16a34a' }}>任务进度</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: '#166534', mt: 0.5 }}>
                    {completedTasks}/{totalTasks} 完成
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>审核员</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <Box component={Users} sx={{ fontSize: 16 }} />
                    <Typography variant="body1" sx={{ color: 'text.primary' }}>
                      {selectedPlan.auditors?.join(", ") || "-"}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>涉及部门</Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {selectedPlan.departments?.join(", ") || "-"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>开始日期</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <Box component={Calendar} sx={{ fontSize: 16 }} />
                    <Typography variant="body1" sx={{ color: 'text.primary' }}>
                      {selectedPlan.start_date ? new Date(selectedPlan.start_date).toLocaleDateString("zh-CN") : "-"}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>结束日期</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <Box component={Calendar} sx={{ fontSize: 16 }} />
                    <Typography variant="body1" sx={{ color: 'text.primary' }}>
                      {selectedPlan.end_date ? new Date(selectedPlan.end_date).toLocaleDateString("zh-CN") : "-"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {selectedPlan.description && (
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>计划描述</Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    {selectedPlan.description}
                  </Typography>
                </Box>
              )}

              <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Box component={FileText} sx={{ fontSize: 20 }} />
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    审核任务 ({completedTasks}/{totalTasks})
                  </Typography>
                </Box>
                <DataTable
                  columns={taskColumns}
                  data={tasks}
                  enablePagination={false}
                />
              </Box>

              {findings.length > 0 && (
                <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Box component={AlertCircle} sx={{ fontSize: 20 }} />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      审核发现 ({openFindings} 项待处理)
                    </Typography>
                  </Box>
                  <DataTable
                    columns={findingColumns}
                    data={findings}
                    enablePagination={false}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default QmsAuditManagementPage;
