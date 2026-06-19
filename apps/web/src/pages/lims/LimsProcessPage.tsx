import { Grid } from "@/components/Grid";
import React, { useEffect, useState } from "react";
import {
  ClipboardList,
  ChevronRight,
  FileText,
  Play,
  Clock,
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Snackbar,
  Alert,
  LinearProgress,
  Avatar,
  Stack,
} from "@mui/material";
import type { InspectionProcess, LimsStatistics } from "@/api/lims";
import { limsApi } from "@/api/lims";
import { MetricCard } from "@/components/MetricCard";
import { StatsChart } from "@/components/StatsChart";

const LimsProcessPage: React.FC = () => {
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<InspectionProcess[]>([]);
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

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedProcess, setSelectedProcess] =
    useState<InspectionProcess | null>(null);
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
  }, [serviceStatuses.lims]);

  const loadStatistics = async () => {
    try {
      const response = await limsApi.getStatistics();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("加载统计数据失败:", err);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadProcesses(), loadStatistics()]);
    } finally {
      setLoading(false);
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
      console.error("加载检验流程失败:", err);
      setProcesses([]);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  const openTaskModal = (process?: InspectionProcess) => {
    setSelectedProcess(process || null);
    setShowTaskModal(true);
  };

  const safeProcesses = Array.isArray(processes) ? processes : [];

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
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
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
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
      <Paper
        elevation={0}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderRadius: 0,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              minHeight: 64,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <IconButton onClick={() => navigate("/dashboard")}>
                <ChevronRight style={{ transform: "rotate(180deg)" }} />
              </IconButton>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    background:
                      "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    borderRadius: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FileText size={24} color="white" />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    检验流程
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Inspection Processes
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Play size={16} />}
                onClick={() => openTaskModal()}
              >
                新建任务
              </Button>
            </Box>
          </Box>
        </Container>
      </Paper>

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

      <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
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
              icon={<ClipboardList size={24} />}
              gradient={["#6366F1", "#4F46E5"]}
              subtitle={`进行中: ${stats.in_progress_tasks}`}
              trend={stats.in_progress_tasks > 0 ? "up" : "neutral"}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <MetricCard
              title="检验流程"
              value={stats.total_processes}
              icon={<FileText size={24} />}
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
                      流程总数
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {safeProcesses.length}
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
                    <FileText size={24} color="#7c3aed" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper sx={{ borderRadius: 2 }} variant="outlined">
          <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="h6" fontWeight="semibold">
              检验流程
            </Typography>
          </Box>
          <Box>
            {safeProcesses.length === 0 ? (
              <Box sx={{ p: 6, textAlign: "center" }}>
                <FileText
                  size={64}
                  color="#cbd5e1"
                  style={{ marginBottom: 16 }}
                />
                <Typography color="text.secondary">暂无检验流程</Typography>
              </Box>
            ) : (
              safeProcesses.map((process) => (
                <Box
                  key={process.id}
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
                      <Typography
                        variant="h6"
                        fontWeight="semibold"
                        sx={{ mb: 1 }}
                      >
                        {process.name}
                      </Typography>
                      <Typography color="text.secondary" sx={{ mb: 2 }}>
                        {process.description}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1.5}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        {(process.steps || []).map((step, idx) => (
                          <Box
                            key={step.id}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 24,
                                height: 24,
                                bgcolor: "secondary.light",
                                color: "secondary.dark",
                                fontSize: 12,
                                fontWeight: 500,
                              }}
                            >
                              {idx + 1}
                            </Avatar>
                            <Typography variant="body2">{step.name}</Typography>
                            {idx < process.steps.length - 1 && (
                              <Typography color="text.disabled">→</Typography>
                            )}
                          </Box>
                        ))}
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
                        color="secondary"
                        startIcon={<Play size={16} />}
                        onClick={() => openTaskModal(process)}
                      >
                        使用此流程
                      </Button>
                    </Box>
                  </Box>
                </Box>
              ))
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
          <Typography variant="h6" fontWeight="semibold">
            新建检验任务
          </Typography>
          <IconButton size="small" onClick={() => setShowTaskModal(false)}>
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography color="text.secondary" variant="body2">
              检验任务创建功能已迁移至检验任务页面，请前往对应页面创建任务。
            </Typography>
            {selectedProcess && (
              <Typography color="primary" variant="body2">
                当前选择流程: {selectedProcess.name}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowTaskModal(false);
              navigate("/lims/tasks");
            }}
            variant="contained"
            color="secondary"
          >
            前往任务页面
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LimsProcessPage;
