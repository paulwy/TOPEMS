import { Grid } from "@/components/Grid";
import React, { useEffect, useState } from "react";
import {
  ClipboardList,
  Plus,
  Clock,
  ChevronRight,
  ClipboardCheck,
  Play,
  CheckCircle,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Snackbar,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  LinearProgress,
  Avatar,
  Stack,
} from "@mui/material";
import type {
  Sample,
  InspectionProcess,
  InspectionTask,
  InspectionRecord,
  CreateInspectionTaskRequest,
  CreateInspectionRecordRequest,
  LimsStatistics,
} from "@/api/lims";
import { limsApi } from "@/api/lims";
import { MetricCard } from "@/components/MetricCard";
import { STATUS_COLORS, getStatusColorConfig } from "@/constants/colors";
import { GRADIENTS } from "@/constants/colors";
import { StatsChart } from "@/components/StatsChart";
import { PageHeader } from "@/components/templates/PageHeader";
import { apiLogger } from "@/utils/logger";

const LimsTaskPage: React.FC = () => {
  const navigate = useNavigate();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [processes, setProcesses] = useState<InspectionProcess[]>([]);
  const [tasks, setTasks] = useState<InspectionTask[]>([]);
  const [stats, setStats] = useState<LimsStatistics>({
    total_samples: 0,
    pending_samples: 0,
    testing_samples: 0,
    completed_samples: 0,
    cancelled_samples: 0,
    total_tasks: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
    total_processes: 0,
    total_instruments: 0,
    normal_instruments: 0,
    calibration_instruments: 0,
    maintenance_instruments: 0,
    disabled_instruments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [serviceStatuses, setServiceStatuses] = useState<{
    [key: string]: boolean;
  }>({
    lims: false,
  });

  const isServiceUp = (serviceName: string): boolean => {
    return serviceStatuses[serviceName] || false;
  };

  const checkServiceStatus = async (
    serviceName: string,
    port: number,
    setStatus: (up: boolean) => void,
  ) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`http://localhost:${port}/health`, {
        signal: controller.signal,
        method: "GET",
      });
      clearTimeout(timeoutId);
      setStatus(response.ok);
    } catch {
      setStatus(false);
    }
  };

  useEffect(() => {
    const checkAllServices = () => {
      checkServiceStatus("lims", 8022, (up) =>
        setServiceStatuses((prev) => ({ ...prev, lims: up })),
      );
    };

    checkAllServices();
    const intervalId = setInterval(checkAllServices, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<InspectionTask | null>(null);
  const [selectedTaskRecords, setSelectedTaskRecords] = useState<
    InspectionRecord[]
  >([]);
  const [taskFormData, setTaskFormData] = useState<CreateInspectionTaskRequest>(
    {
      sample_id: "",
      process_id: "",
      inspector: "",
    },
  );
  const [recordFormData, setRecordFormData] =
    useState<CreateInspectionRecordRequest>({
      task_id: "",
      step_id: "",
      step_name: "",
      result: "",
      conclusion: "",
      inspector: "",
    });
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isServiceUp("lims")) {
      loadAllData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceStatuses.lims]);

  const loadStatistics = async () => {
    try {
      const response = await limsApi.getStatistics();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      apiLogger.error("加载统计数据失败:", err);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSamples(),
        loadProcesses(),
        loadTasks(),
        loadStatistics(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const adaptSample = (s: any): Sample => {
    return {
      ...s,
      received_date: s.received_date || s.created_at,
    };
  };

  const loadSamples = async () => {
    try {
      const response = await limsApi.listSamples();
      if (response.success && response.data) {
        let sampleData = response.data as any;
        let rawSamples: any[] = [];

        if (Array.isArray(sampleData)) {
          rawSamples = sampleData;
        } else if (sampleData.samples && Array.isArray(sampleData.samples)) {
          rawSamples = sampleData.samples;
        }

        const adaptedSamples = rawSamples.map((s) => adaptSample(s));
        setSamples(adaptedSamples);
      } else {
        setSamples([]);
      }
    } catch (err) {
      apiLogger.error("加载样品失败:", err);
      setSamples([]);
    }
  };

  const loadProcesses = async () => {
    try {
      const response = await limsApi.listProcesses();
      if (response.success && response.data) {
        let processData = response.data as any;
        let rawProcesses: any[] = [];

        if (Array.isArray(processData)) {
          rawProcesses = processData;
        } else if (
          processData.processes &&
          Array.isArray(processData.processes)
        ) {
          rawProcesses = processData.processes;
        }

        setProcesses(rawProcesses);
      } else {
        setProcesses([]);
      }
    } catch (err) {
      apiLogger.error("加载检验流程失败:", err);
      setProcesses([]);
    }
  };

  const mapStatusToChinese = (status: string): string => {
    const statusMap: Record<string, string> = {
      pending: "待测试",
      in_progress: "进行中",
      completed: "已完成",
      cancelled: "已终止",
      received: "待测试",
    };
    return statusMap[status] || status;
  };

  const adaptTask = (t: any): InspectionTask => {
    return {
      ...t,
      status: mapStatusToChinese(t.status),
    };
  };

  const loadTasks = async () => {
    try {
      const response = await limsApi.listTasks();
      if (response.success && response.data) {
        let taskData = response.data as any;
        let rawTasks: any[] = [];

        if (Array.isArray(taskData)) {
          rawTasks = taskData;
        } else if (taskData.tasks && Array.isArray(taskData.tasks)) {
          rawTasks = taskData.tasks;
        }

        const adaptedTasks = rawTasks.map((t) => adaptTask(t));
        setTasks(adaptedTasks);
      } else {
        setTasks([]);
      }
    } catch (err) {
      apiLogger.error("加载检验任务失败:", err);
      setTasks([]);
    }
  };

  const loadTaskRecords = async (taskId: string) => {
    try {
      const response = await limsApi.listRecordsByTask(taskId);
      if (response.success && response.data) {
        let recordData = response.data as any;
        let rawRecords: any[] = [];

        if (Array.isArray(recordData)) {
          rawRecords = recordData;
        } else if (recordData.records && Array.isArray(recordData.records)) {
          rawRecords = recordData.records;
        } else {
          rawRecords = [];
        }

        setSelectedTaskRecords(rawRecords);
      } else {
        setSelectedTaskRecords([]);
      }
    } catch (err) {
      apiLogger.error("加载检验记录失败:", err);
      setSelectedTaskRecords([]);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  const handleCreateTask = async () => {
    if (
      !taskFormData.sample_id ||
      !taskFormData.process_id ||
      !taskFormData.inspector.trim()
    ) {
      showNotification("error", "请填写完整信息");
      return;
    }

    try {
      setCreating(true);
      const response = await limsApi.createTask(taskFormData);
      if (response.success) {
        showNotification("success", "检验任务创建成功");
        setShowTaskModal(false);
        loadTasks();
      } else {
        showNotification("error", response.message || "创建失败");
      }
    } catch (err) {
      showNotification("error", "创建检验任务失败");
      apiLogger.error("创建检验任务失败:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleCompleteStep = async () => {
    if (!recordFormData.result.trim()) {
      showNotification("error", "请输入检验结果");
      return;
    }

    try {
      setCreating(true);
      const response = await limsApi.completeStep(
        selectedTask!.id,
        recordFormData,
      );
      if (response.success) {
        showNotification("success", "检验步骤完成");
        setShowRecordModal(false);
        loadTasks();
        if (selectedTask) {
          loadTaskRecords(selectedTask.id);
        }
      } else {
        showNotification("error", response.message || "操作失败");
      }
    } catch (err) {
      showNotification("error", "完成检验步骤失败");
      apiLogger.error("完成检验步骤失败:", err);
    } finally {
      setCreating(false);
    }
  };

  const openTaskDetailModal = async (task: InspectionTask) => {
    setSelectedTask(task);
    await loadTaskRecords(task.id);
    setShowDetailModal(true);
  };

  const openRecordModal = (task: InspectionTask) => {
    const process = processes.find((p) => p.id === task.process_id);
    const currentStepObj = process?.steps.find(
      (_, idx) => idx + 1 === task.current_step,
    );

    setRecordFormData({
      task_id: task.id,
      step_id: currentStepObj?.id || "",
      step_name: currentStepObj?.name || "",
      result: "",
      conclusion: "",
      inspector: "",
    });
    setShowRecordModal(true);
  };

  const safeSamples = Array.isArray(samples) ? samples : [];
  const safeProcesses = Array.isArray(processes) ? processes : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const getSampleName = (sampleId: string) => {
    const sample = safeSamples.find((s) => s.id === sampleId);
    return sample ? sample.name : "未知样品";
  };

  const getProcessName = (processId: string) => {
    const process = safeProcesses.find((p) => p.id === processId);
    return process ? process.name : "未知流程";
  };

  const getCurrentStepName = (task: InspectionTask) => {
    const process = safeProcesses.find((p) => p.id === task.process_id);
    if (!process) return "未知步骤";
    const step = process.steps[task.current_step - 1];
    return step ? step.name : "已完成";
  };

  const filteredTasks = safeTasks.filter(
    (t) =>
      getSampleName(t.sample_id)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      getProcessName(t.process_id)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const getStatusColor = (
    status: string,
  ): { bgcolor: string; color: string } => {
    if (!status) return { bgcolor: "#f1f5f9", color: "#475569" };
    switch (status) {
      case "进行中":
        return { bgcolor: "#dbeafe", color: "#1d4ed8" };
      case "已完成":
        return { bgcolor: "#dcfce7", color: "#15803d" };
      case "已终止":
        return { bgcolor: "#fee2e2", color: "#b91c1c" };
      case "待测试":
        return { bgcolor: "#fef3c7", color: "#b45309" };
      case "测试中":
        return { bgcolor: "#f3e8ff", color: "#7e22ce" };
      default:
        return { bgcolor: "#f1f5f9", color: "#475569" };
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: GRADIENTS.accent,
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <LinearProgress
            sx={{ width: 240, mb: 3, borderRadius: 1 }}
            color="secondary"
          />
          <Typography color="text.secondary">加载中...</Typography>
        </Box>
      </Box>
    );
  }

  if (!isServiceUp("lims")) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
          p: 2,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 6,
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
            borderRadius: 3,
          }}
        >
          <Avatar
            sx={{
              width: 64,
              height: 64,
              mx: "auto",
              mb: 3,
              bgcolor: "info.light",
            }}
          >
            <ClipboardList size={32} color="#0891b2" />
          </Avatar>
          <Typography variant="h5" sx={{ ...{ mb: 2 }, fontWeight: "bold" }}>
            实验室管理服务未启动
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            LIMS 服务正在启动中，请稍后刷新页面，或者联系管理员启动服务。
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/dashboard")}
          >
            返回首页
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      }}
    >
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification?.type || "success"}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>

      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
        <PageHeader
          title="检验任务"
          subtitle="Inspection Tasks"
          pageIcon={<ClipboardCheck style={{ width: 20, height: 20 }} />}
          pageColor="linear-gradient(135deg, #6366F1, #4F46E5)"
          breadcrumbs={[
            { label: "首页", href: "/dashboard" },
            { label: "LIMS" },
            { label: "检验任务" },
          ]}
          backButton={{ onClick: () => navigate("/dashboard") }}
          actions={[
            {
              label: "新建任务",
              icon: <Play style={{ width: 18, height: 18 }} />,
              variant: "contained",
              color: "secondary",
              onClick: () => setShowTaskModal(true),
            },
          ]}
          search={{
            value: searchTerm,
            onChange: setSearchTerm,
            placeholder: "搜索样品...",
          }}
          loading={loading}
        />
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <MetricCard
              title="样品总数"
              value={stats.total_samples}
              icon={<ClipboardList size={24} />}
              gradient={["#8B5CF6", "#7C3AED"]}
              subtitle={`待测试: ${stats.pending_samples}`}
              trend={stats.pending_samples > 0 ? "up" : "neutral"}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <MetricCard
              title="检验任务"
              value={stats.total_tasks}
              icon={<ClipboardCheck size={24} />}
              gradient={["#6366F1", "#4F46E5"]}
              subtitle={`进行中: ${stats.in_progress_tasks}`}
              trend={stats.in_progress_tasks > 0 ? "up" : "neutral"}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <MetricCard
              title="检验流程"
              value={stats.total_processes}
              icon={<ClipboardList size={24} />}
              gradient={["#F59E0B", "#D97706"]}
              trend="neutral"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <MetricCard
              title="已完成样品"
              value={stats.completed_samples}
              icon={<CheckCircle size={24} />}
              gradient={["#00C897", "#00A878"]}
              trend="up"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <MetricCard
              title="测试中样品"
              value={stats.testing_samples}
              icon={<Clock size={24} />}
              gradient={["#EC4899", "#DB2777"]}
              trend="neutral"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <MetricCard
              title="仪器设备"
              value={stats.total_instruments}
              icon={<ClipboardList size={24} />}
              gradient={["#14B8A6", "#0D9488"]}
              subtitle={`正常: ${stats.normal_instruments}`}
              trend="neutral"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2 }} variant="outlined">
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      任务总数
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                      {safeTasks.length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "secondary.light",
                    }}
                  >
                    <ClipboardCheck size={24} color="#7c3aed" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2 }} variant="outlined">
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      进行中
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: "bold" }}
                      color="primary"
                    >
                      {safeTasks.filter((t) => t.status === "进行中").length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "primary.light",
                    }}
                  >
                    <Clock size={24} color="#2563eb" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2 }} variant="outlined">
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      已完成
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: "bold" }}
                      color="success.main"
                    >
                      {safeTasks.filter((t) => t.status === "已完成").length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "success.light",
                    }}
                  >
                    <CheckCircle size={24} color="#15803d" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2 }} variant="outlined">
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      待测试
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ ...{ color: "#b45309" }, fontWeight: "bold" }}
                    >
                      {safeTasks.filter((t) => t.status === "待测试").length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "#fef3c7",
                    }}
                  >
                    <Clock size={24} color="#b45309" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper sx={{ borderRadius: 2 }} variant="outlined">
          <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="h6" sx={{ fontWeight: "semibold" }}>
              检验任务
            </Typography>
          </Box>
          <Box>
            {filteredTasks.length === 0 ? (
              <Box sx={{ p: 6, textAlign: "center" }}>
                <ClipboardCheck
                  size={64}
                  color="#cbd5e1"
                  style={{ marginBottom: 16 }}
                />
                <Typography color="text.secondary">暂无检验任务</Typography>
              </Box>
            ) : (
              filteredTasks.map((task) => {
                const statusColor = getStatusColor(task.status);
                return (
                  <Box
                    key={task.id}
                    sx={{
                      p: 3,
                      borderBottom: 1,
                      borderColor: "divider",
                      transition: "background 0.2s",
                      "&:hover": { bgcolor: "grey.50" },
                      "&:last-of-type": { borderBottom: 0 },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            mb: 1,
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: "semibold" }}
                          >
                            {getSampleName(task.sample_id)}
                          </Typography>
                          <Chip
                            size="small"
                            label={task.status}
                            sx={{
                              bgcolor: statusColor.bgcolor,
                              color: statusColor.color,
                              fontWeight: 500,
                            }}
                          />
                        </Box>
                        <Typography color="text.secondary" sx={{ mb: 1 }}>
                          检验流程: {getProcessName(task.process_id)}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="secondary.main"
                          sx={{ mb: 1.5 }}
                        >
                          当前步骤: {getCurrentStepName(task)}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={3}
                          sx={{ fontSize: 14 }}
                          color="text.secondary"
                        >
                          <span>检验员: {task.inspector}</span>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <Clock size={16} />
                            开始:{" "}
                            {new Date(task.started_at).toLocaleDateString(
                              "zh-CN",
                            )}
                          </Box>
                        </Stack>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <Button
                          size="small"
                          color="primary"
                          onClick={() => openTaskDetailModal(task)}
                        >
                          查看详情
                        </Button>
                        {task.status === "进行中" && (
                          <Button
                            size="small"
                            color="success"
                            startIcon={<CheckCircle size={16} />}
                            onClick={() => openRecordModal(task)}
                          >
                            完成步骤
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
        </Paper>
      </Container>

      <Dialog
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: "semibold" }}>
            新建检验任务
          </Typography>
          <IconButton size="small" onClick={() => setShowTaskModal(false)}>
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <FormControl fullWidth required>
              <InputLabel>样品</InputLabel>
              <Select
                value={taskFormData.sample_id}
                label="样品"
                onChange={(e) =>
                  setTaskFormData({
                    ...taskFormData,
                    sample_id: e.target.value,
                  })
                }
              >
                <MenuItem value="">请选择样品</MenuItem>
                {safeSamples.map((sample) => (
                  <MenuItem key={sample.id} value={sample.id}>
                    {sample.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>检验流程</InputLabel>
              <Select
                value={taskFormData.process_id}
                label="检验流程"
                onChange={(e) =>
                  setTaskFormData({
                    ...taskFormData,
                    process_id: e.target.value,
                  })
                }
              >
                <MenuItem value="">请选择流程</MenuItem>
                {safeProcesses.map((process) => (
                  <MenuItem key={process.id} value={process.id}>
                    {process.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="检验员"
              required
              fullWidth
              value={taskFormData.inspector}
              onChange={(e) =>
                setTaskFormData({ ...taskFormData, inspector: e.target.value })
              }
              placeholder="请输入检验员姓名"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowTaskModal(false)}
            variant="outlined"
            color="inherit"
          >
            取消
          </Button>
          <Button
            onClick={handleCreateTask}
            disabled={creating}
            variant="contained"
            color="secondary"
          >
            {creating ? "创建中..." : "创建任务"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: "semibold" }}>
            完成检验步骤
          </Typography>
          <IconButton size="small" onClick={() => setShowRecordModal(false)}>
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                当前步骤
              </Typography>
              <Typography color="secondary.main" sx={{ fontWeight: "medium" }}>
                {recordFormData.step_name}
              </Typography>
            </Box>
            <TextField
              label="检验结果"
              required
              fullWidth
              multiline
              rows={4}
              value={recordFormData.result}
              onChange={(e) =>
                setRecordFormData({ ...recordFormData, result: e.target.value })
              }
              placeholder="请输入检验结果"
            />
            <TextField
              label="结论"
              fullWidth
              multiline
              rows={2}
              value={recordFormData.conclusion}
              onChange={(e) =>
                setRecordFormData({
                  ...recordFormData,
                  conclusion: e.target.value,
                })
              }
              placeholder="请输入检验结论"
            />
            <TextField
              label="检验员"
              required
              fullWidth
              value={recordFormData.inspector}
              onChange={(e) =>
                setRecordFormData({
                  ...recordFormData,
                  inspector: e.target.value,
                })
              }
              placeholder="请输入检验员姓名"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowRecordModal(false)}
            variant="outlined"
            color="inherit"
          >
            取消
          </Button>
          <Button
            onClick={handleCompleteStep}
            disabled={creating}
            variant="contained"
            color="success"
          >
            {creating ? "处理中..." : "完成步骤"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      >
        <DialogContent sx={{ p: 3 }}>
          {selectedTask && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 3,
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: "semibold" }}>
                  检验任务详情
                </Typography>
                <IconButton onClick={() => setShowDetailModal(false)}>
                  <X size={24} />
                </IconButton>
              </Box>

              <Stack spacing={3}>
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: "semibold" }}>
                      {getSampleName(selectedTask.sample_id)}
                    </Typography>
                    <Chip
                      size="small"
                      label={selectedTask.status}
                      sx={{
                        bgcolor: getStatusColor(selectedTask.status).bgcolor,
                        color: getStatusColor(selectedTask.status).color,
                        fontWeight: 500,
                        px: 1.5,
                      }}
                    />
                  </Box>
                  <Typography color="text.secondary" sx={{ mb: 1 }}>
                    检验流程: {getProcessName(selectedTask.process_id)}
                  </Typography>
                  <Typography
                    color="secondary.main"
                    sx={{ fontWeight: "medium" }}
                  >
                    当前步骤: {getCurrentStepName(selectedTask)}
                  </Typography>
                </Box>

                <Grid
                  container
                  spacing={2}
                  sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1.5 }}
                >
                  <Grid size={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      任务编号
                    </Typography>
                    <Typography
                      sx={{
                        ...{ fontFamily: "monospace", fontSize: 14 },
                        fontWeight: "medium",
                      }}
                    >
                      {selectedTask.id}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      检验员
                    </Typography>
                    <Typography sx={{ fontWeight: "medium" }}>
                      {selectedTask.inspector}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      开始时间
                    </Typography>
                    <Typography sx={{ fontWeight: "medium" }}>
                      {new Date(selectedTask.started_at).toLocaleString(
                        "zh-CN",
                      )}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      完成时间
                    </Typography>
                    <Typography sx={{ fontWeight: "medium" }}>
                      {selectedTask.completed_at
                        ? new Date(selectedTask.completed_at).toLocaleString(
                            "zh-CN",
                          )
                        : "-"}
                    </Typography>
                  </Grid>
                </Grid>

                <Box>
                  <Typography sx={{ ...{ mb: 1.5 }, fontWeight: "semibold" }}>
                    检验记录
                  </Typography>
                  {selectedTaskRecords.length === 0 ? (
                    <Typography
                      color="text.secondary"
                      sx={{ textAlign: "center", py: 2 }}
                    >
                      暂无检验记录
                    </Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {selectedTaskRecords.map((record, idx) => (
                        <Paper
                          key={record.id}
                          variant="outlined"
                          sx={{ p: 2, borderRadius: 1.5 }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              mb: 1,
                            }}
                          >
                            <Typography
                              sx={{ fontWeight: "medium" }}
                              color="secondary.main"
                            >
                              步骤 {idx + 1}: {record.step_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(record.recorded_at).toLocaleString(
                                "zh-CN",
                              )}
                            </Typography>
                          </Box>
                          <Typography sx={{ mb: 1 }}>
                            结果: {record.result}
                          </Typography>
                          {record.conclusion && (
                            <Typography
                              variant="body2"
                              color="success.main"
                              sx={{ mb: 1 }}
                            >
                              结论: {record.conclusion}
                            </Typography>
                          )}
                          <Typography variant="body2" color="text.secondary">
                            检验员: {record.inspector}
                          </Typography>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Box>

                <Divider />
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    onClick={() => setShowDetailModal(false)}
                    variant="contained"
                    color="inherit"
                    sx={{
                      bgcolor: "grey.100",
                      "&:hover": { bgcolor: "grey.200" },
                    }}
                  >
                    关闭
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LimsTaskPage;
