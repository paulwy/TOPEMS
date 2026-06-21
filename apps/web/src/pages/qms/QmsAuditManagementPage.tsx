import React, { useState, useEffect } from "react";
import { apiLogger } from "@/utils/logger";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardCheck,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Plus,
  Eye,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Chip,
  Card,
  CardContent,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

import { ListPageTemplate, type ColumnDef } from "@/components/templates";
import { qmsApi } from "@/api/qms";
import type { AuditPlan, AuditTask, AuditFinding } from "@/api/qms";

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
      apiLogger.error("加载审核计划失败:", error);
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
      apiLogger.error("加载审核详情失败:", error);
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
      apiLogger.error("创建审核计划失败:", error);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await qmsApi.completeAuditTask(taskId);
      if (response.success && selectedPlan) {
        loadPlanDetails(selectedPlan.id);
      }
    } catch (error) {
      apiLogger.error("完成审核任务失败:", error);
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
    const statusMap: Record<
      string,
      { bg: string; color: string; label: string }
    > = {
      planning: { bg: "#dbeafe", color: "#2563eb", label: "计划中" },
      计划中: { bg: "#dbeafe", color: "#2563eb", label: "计划中" },
      in_progress: { bg: "#fef9c3", color: "#ca8a04", label: "进行中" },
      进行中: { bg: "#fef9c3", color: "#ca8a04", label: "进行中" },
      completed: { bg: "#dcfce7", color: "#16a34a", label: "已完成" },
      已完成: { bg: "#dcfce7", color: "#16a34a", label: "已完成" },
      cancelled: { bg: "#fee2e2", color: "#dc2626", label: "已取消" },
      已取消: { bg: "#fee2e2", color: "#dc2626", label: "已取消" },
    };
    const item = statusMap[status] || {
      bg: "#f3f4f6",
      color: "#4b5563",
      label: status,
    };
    return (
      <Chip
        label={item.label}
        size="small"
        sx={{ backgroundColor: item.bg, color: item.color }}
      />
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<
      string,
      { bg: string; color: string; label: string }
    > = {
      high: { bg: "#fee2e2", color: "#dc2626", label: "高" },
      medium: { bg: "#fef9c3", color: "#ca8a04", label: "中" },
      low: { bg: "#dcfce7", color: "#16a34a", label: "低" },
    };
    const item = priorityMap[priority] || {
      bg: "#f3f4f6",
      color: "#4b5563",
      label: priority,
    };
    return (
      <Chip
        label={item.label}
        size="small"
        sx={{ backgroundColor: item.bg, color: item.color }}
      />
    );
  };

  const columns: ColumnDef<AuditPlan>[] = [
    {
      id: "title",
      label: "审核计划",
      render: (row) => (
        <Typography sx={{ fontWeight: 500, color: "slate.900" }}>
          {row.title}
        </Typography>
      ),
    },
    {
      id: "audit_type",
      label: "类型",
      render: (row) => (
        <Chip
          label={row.audit_type === "internal" ? "内部审核" : "外部审核"}
          size="small"
          sx={{ backgroundColor: "#f3e8ff", color: "#7c3aed" }}
        />
      ),
    },
    {
      id: "status",
      label: "状态",
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: "start_date",
      label: "开始日期",
      render: (row) => (
        <span>
          {row.start_date
            ? new Date(row.start_date).toLocaleDateString("zh-CN")
            : "-"}
        </span>
      ),
    },
    {
      id: "end_date",
      label: "结束日期",
      render: (row) => (
        <span>
          {row.end_date
            ? new Date(row.end_date).toLocaleDateString("zh-CN")
            : "-"}
        </span>
      ),
    },
    {
      id: "actions",
      label: "操作",
      render: (row) => (
        <Button
          variant="text"
          size="small"
          onClick={() => handleSelectPlan(row)}
          startIcon={<Box component={Eye} sx={{ fontSize: 16 }} />}
        >
          查看
        </Button>
      ),
    },
  ];

  const taskColumns: ColumnDef<AuditTask>[] = [
    { id: "title", label: "任务名称", render: (row) => row.title },
    {
      id: "priority",
      label: "优先级",
      render: (row) => getPriorityBadge(row.priority),
    },
    {
      id: "assignee",
      label: "负责人",
      render: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box component={Users} sx={{ fontSize: 16 }} />
          <Typography>{row.assignee || "-"}</Typography>
        </Box>
      ),
    },
    {
      id: "status",
      label: "状态",
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: "actions",
      label: "操作",
      render: (row) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          {row.status !== "completed" && (
            <Button
              variant="text"
              size="small"
              sx={{ color: "#16a34a" }}
              onClick={() => handleCompleteTask(row.id)}
              startIcon={<Box component={Check} sx={{ fontSize: 16 }} />}
            />
          )}
        </Box>
      ),
    },
  ];

  const findingColumns: ColumnDef<AuditFinding>[] = [
    {
      id: "severity",
      label: "严重程度",
      render: (row) => getPriorityBadge(row.severity),
    },
    { id: "description", label: "问题描述", render: (row) => row.description },
    {
      id: "recommendation",
      label: "改进建议",
      render: (row) => row.recommendation,
    },
    {
      id: "status",
      label: "处理状态",
      render: (row) => getStatusBadge(row.status),
    },
  ];

  const stats = {
    total: plans.length,
    inProgress: plans.filter((p) => p.status === "in_progress").length,
    completed: plans.filter((p) => p.status === "completed").length,
  };

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const totalTasks = tasks.length;
  const openFindings = findings.filter((f) => f.status !== "resolved").length;

  return (
    <>
      <ListPageTemplate
        title="审核管理"
        subtitle="Audit Management"
        backButton={{
          href: "/qms",
          onClick: () => navigate("/qms"),
        }}
        columns={columns}
        data={plans}
        loading={loading}
        actions={[
          {
            label: "创建审核计划",
            icon: <Plus sx={{ width: 16, height: 16, mr: 1 }} />,
            onClick: () => setShowAddModal(true),
            variant: "contained",
          },
        ]}
        headerContent={
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(1, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: 3,
              mb: 4,
            }}
          >
            <Card
              sx={{
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                color: "white",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography sx={{ color: "#93c5fd", fontSize: "0.875rem" }}>
                      审核计划总数
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                      {stats.total}
                    </Typography>
                  </Box>
                  <ClipboardCheck
                    sx={{ width: 48, height: 48, color: "#93c5fd" }}
                  />
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
                color: "white",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography sx={{ color: "#fde68a", fontSize: "0.875rem" }}>
                      进行中审核
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                      {stats.inProgress}
                    </Typography>
                  </Box>
                  <Clock sx={{ width: 48, height: 48, color: "#fde68a" }} />
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                background: "linear-gradient(135deg, #22c55e 0%, #10b981 100%)",
                color: "white",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography sx={{ color: "#bbf7d0", fontSize: "0.875rem" }}>
                      已完成审核
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                      {stats.completed}
                    </Typography>
                  </Box>
                  <CheckCircle
                    sx={{ width: 48, height: 48, color: "#bbf7d0" }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Box>
        }
        emptyMessage="暂无审核计划"
        onRefresh={loadAuditPlans}
      />

      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>创建审核计划</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5, display: "block" }}>
                计划名称 *
              </Typography>
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
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: "block" }}>
                  审核类型
                </Typography>
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
                <Typography variant="body2" sx={{ mb: 0.5, display: "block" }}>
                  审核员
                </Typography>
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
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, display: "block" }}>
                  开始日期
                </Typography>
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
                <Typography variant="body2" sx={{ mb: 0.5, display: "block" }}>
                  结束日期
                </Typography>
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
              <Typography variant="body2" sx={{ mb: 0.5, display: "block" }}>
                涉及部门
              </Typography>
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
              <Typography variant="body2" sx={{ mb: 0.5, display: "block" }}>
                计划描述
              </Typography>
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
          <Button variant="outlined" onClick={() => setShowAddModal(false)}>
            取消
          </Button>
          <Button variant="contained" onClick={handleCreatePlan}>
            创建计划
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            component={ClipboardCheck}
            sx={{ fontSize: 20, color: "#2563eb" }}
          />
          {selectedPlan?.title}
        </DialogTitle>
        <DialogContent>
          {selectedPlan && (
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: "#eff6ff", borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: "#2563eb" }}>
                    审核类型
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 500, color: "#1e40af", mt: 0.5 }}
                  >
                    {selectedPlan.audit_type === "internal"
                      ? "内部审核"
                      : "外部审核"}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "#fefce8", borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: "#ca8a04" }}>
                    审核状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {getStatusBadge(selectedPlan.status)}
                  </Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: "#f0fdf4", borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: "#16a34a" }}>
                    任务进度
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 500, color: "#166534", mt: 0.5 }}
                  >
                    {completedTasks}/{totalTasks} 完成
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    审核员
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Box component={Users} sx={{ fontSize: 16 }} />
                    <Typography variant="body1" sx={{ color: "text.primary" }}>
                      {selectedPlan.auditors?.join(", ") || "-"}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    涉及部门
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {selectedPlan.departments?.join(", ") || "-"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    开始日期
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Box component={Calendar} sx={{ fontSize: 16 }} />
                    <Typography variant="body1" sx={{ color: "text.primary" }}>
                      {selectedPlan.start_date
                        ? new Date(selectedPlan.start_date).toLocaleDateString(
                            "zh-CN",
                          )
                        : "-"}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    结束日期
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Box component={Calendar} sx={{ fontSize: 16 }} />
                    <Typography variant="body1" sx={{ color: "text.primary" }}>
                      {selectedPlan.end_date
                        ? new Date(selectedPlan.end_date).toLocaleDateString(
                            "zh-CN",
                          )
                        : "-"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {selectedPlan.description && (
                <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    计划描述
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    {selectedPlan.description}
                  </Typography>
                </Box>
              )}

              <Box sx={{ borderTop: 1, borderColor: "divider", pt: 3 }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
                >
                  <Box component={FileText} sx={{ fontSize: 20 }} />
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    审核任务 ({completedTasks}/{totalTasks})
                  </Typography>
                </Box>
                <ListPageTemplate
                  columns={taskColumns}
                  data={tasks}
                  loading={loading}
                  pagination={{
                    page: 0,
                    pageSize: 10,
                    total: tasks.length,
                    onPageChange: () => {},
                  }}
                />
              </Box>

              {findings.length > 0 && (
                <Box sx={{ borderTop: 1, borderColor: "divider", pt: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <Box component={FileText} sx={{ fontSize: 20 }} />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      审核发现 ({openFindings} 项待处理)
                    </Typography>
                  </Box>
                  <ListPageTemplate
                    columns={findingColumns}
                    data={findings}
                    loading={loading}
                    pagination={{
                      page: 0,
                      pageSize: 10,
                      total: findings.length,
                      onPageChange: () => {},
                    }}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowDetailModal(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QmsAuditManagementPage;
