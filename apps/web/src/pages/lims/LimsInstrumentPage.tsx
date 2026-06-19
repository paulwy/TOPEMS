import { Grid } from "@/components/Grid";
import React, { useEffect, useState } from "react";
import {
  ClipboardList,
  Plus,
  ChevronRight,
  Settings,
  Wrench,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Beaker,
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
  Tooltip,
  LinearProgress,
  Avatar,
  Stack,
} from "@mui/material";
import type {
  Instrument,
  CreateInstrumentRequest,
  MaintenanceRecord,
  CreateMaintenanceRecordRequest,
  LimsStatistics,
} from "@/api/lims";
import { limsApi } from "@/api/lims";
import { MetricCard } from "@/components/MetricCard";
import { StatsChart } from "@/components/StatsChart";
import { PageHeader } from "@/components/templates/PageHeader";

const LimsInstrumentPage: React.FC = () => {
  const navigate = useNavigate();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
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

  const [showInstrumentModal, setShowInstrumentModal] = useState(false);
  const [showInstrumentDetailModal, setShowInstrumentDetailModal] =
    useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedInstrument, setSelectedInstrument] =
    useState<Instrument | null>(null);
  const [instrumentMaintenanceRecords, setInstrumentMaintenanceRecords] =
    useState<MaintenanceRecord[]>([]);
  const [instrumentFormData, setInstrumentFormData] =
    useState<CreateInstrumentRequest>({
      name: "",
      code: "",
      type: "",
      manufacturer: "",
      model: "",
      serial_number: "",
      location: "",
      status: "正常",
      purchase_date: "",
      calibration_date: "",
      next_calibration_date: "",
      responsible_person: "",
      description: "",
    });
  const [maintenanceFormData, setMaintenanceFormData] =
    useState<CreateMaintenanceRecordRequest>({
      instrument_id: "",
      maintenance_type: "",
      description: "",
      performed_by: "",
      performed_at: new Date().toISOString().split("T")[0],
      next_maintenance_date: "",
      cost: 0,
      notes: "",
    });
  const [isEditingInstrument, setIsEditingInstrument] = useState(false);
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
      await Promise.all([loadInstruments(), loadStatistics()]);
    } finally {
      setLoading(false);
    }
  };

  const loadInstruments = async () => {
    try {
      const response = await limsApi.listInstruments();
      if (response.success && response.data) {
        let instrumentData = response.data as any;
        let rawInstruments: any[] = [];

        if (Array.isArray(instrumentData)) {
          rawInstruments = instrumentData;
        } else if (
          instrumentData.items &&
          Array.isArray(instrumentData.items)
        ) {
          rawInstruments = instrumentData.items;
        }

        setInstruments(rawInstruments);
      } else {
        setInstruments([]);
      }
    } catch (err) {
      console.error("加载仪器失败:", err);
      setInstruments([]);
    }
  };

  const getInstrumentTypeIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      分析仪器: Beaker,
      测量仪器: Settings,
      实验设备: Wrench,
      default: Settings,
    };
    return iconMap[type] || iconMap["default"];
  };

  const getInstrumentStatusColor = (
    status: string,
  ): {
    bgcolor: string;
    color: string;
  } => {
    const colorMap: Record<string, { bgcolor: string; color: string }> = {
      正常: { bgcolor: "#dcfce7", color: "#15803d" },
      校准中: { bgcolor: "#fef3c7", color: "#b45309" },
      维修中: { bgcolor: "#fee2e2", color: "#b91c1c" },
      停用: { bgcolor: "#f1f5f9", color: "#475569" },
      报废: { bgcolor: "#f1f5f9", color: "#475569" },
      normal: { bgcolor: "#dcfce7", color: "#15803d" },
      calibration: { bgcolor: "#fef3c7", color: "#b45309" },
      maintenance: { bgcolor: "#fee2e2", color: "#b91c1c" },
      disabled: { bgcolor: "#f1f5f9", color: "#475569" },
    };
    return colorMap[status] || colorMap["normal"];
  };

  const loadMaintenanceRecords = async (instrumentId: string) => {
    try {
      const response = await limsApi.listMaintenanceByInstrument(instrumentId);
      if (response.success && response.data) {
        const data = response.data as any;
        setInstrumentMaintenanceRecords(
          Array.isArray(data) ? data : data.items || [],
        );
      }
    } catch (err) {
      console.error("加载维护记录失败:", err);
      setInstrumentMaintenanceRecords([]);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  const openInstrumentModal = (instrument?: Instrument) => {
    if (instrument) {
      setIsEditingInstrument(true);
      setSelectedInstrument(instrument);
      setInstrumentFormData({
        name: instrument.name || "",
        code: instrument.code || "",
        type: instrument.type || "",
        manufacturer: instrument.manufacturer || "",
        model: instrument.model || "",
        serial_number: instrument.serial_number || "",
        location: instrument.location || "",
        status: instrument.status || "正常",
        purchase_date: instrument.purchase_date || "",
        calibration_date: instrument.calibration_date || "",
        next_calibration_date: instrument.next_calibration_date || "",
        responsible_person: instrument.responsible_person || "",
        description: instrument.description || "",
      });
    } else {
      setIsEditingInstrument(false);
      setInstrumentFormData({
        name: "",
        code: "",
        type: "",
        manufacturer: "",
        model: "",
        serial_number: "",
        location: "",
        status: "正常",
        purchase_date: "",
        calibration_date: "",
        next_calibration_date: "",
        responsible_person: "",
        description: "",
      });
    }
    setShowInstrumentModal(true);
  };

  const openInstrumentDetailModal = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
    loadMaintenanceRecords(instrument.id);
    setShowInstrumentDetailModal(true);
  };

  const openMaintenanceModal = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
    setMaintenanceFormData({
      instrument_id: instrument.id,
      maintenance_type: "",
      description: "",
      performed_by: "",
      performed_at: new Date().toISOString().split("T")[0],
      next_maintenance_date: "",
      cost: 0,
      notes: "",
    });
    setShowMaintenanceModal(true);
  };

  const handleCreateInstrument = async () => {
    try {
      setCreating(true);
      const response = await limsApi.createInstrument(instrumentFormData);
      if (response.success) {
        showNotification("success", "仪器创建成功");
        setShowInstrumentModal(false);
        loadInstruments();
      } else {
        showNotification("error", response.message || "创建失败");
      }
    } catch (err) {
      showNotification("error", "创建仪器失败");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateInstrument = async () => {
    if (!selectedInstrument) return;
    try {
      setCreating(true);
      const response = await limsApi.updateInstrument(
        selectedInstrument.id,
        instrumentFormData,
      );
      if (response.success) {
        showNotification("success", "仪器更新成功");
        setShowInstrumentModal(false);
        loadInstruments();
      } else {
        showNotification("error", response.message || "更新失败");
      }
    } catch (err) {
      showNotification("error", "更新仪器失败");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteInstrument = async (id: string) => {
    if (!confirm("确定要删除这个仪器吗？")) return;
    try {
      const response = await limsApi.deleteInstrument(id);
      if (response.success) {
        showNotification("success", "仪器删除成功");
        loadInstruments();
      } else {
        showNotification("error", response.message || "删除失败");
      }
    } catch (err) {
      showNotification("error", "删除仪器失败");
    }
  };

  const handleCreateMaintenance = async () => {
    try {
      setCreating(true);
      const response = await limsApi.createMaintenance(maintenanceFormData);
      if (response.success) {
        showNotification("success", "维护记录创建成功");
        setShowMaintenanceModal(false);
        if (selectedInstrument) {
          loadMaintenanceRecords(selectedInstrument.id);
        }
      } else {
        showNotification("error", response.message || "创建失败");
      }
    } catch (err) {
      showNotification("error", "创建维护记录失败");
    } finally {
      setCreating(false);
    }
  };

  const safeInstruments = Array.isArray(instruments) ? instruments : [];

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
          <Typography variant="h5"  sx={{ ...{ mb: 2 }, fontWeight: 'bold' }}>
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
          title="仪器管理"
          subtitle="Instrument Management"
          pageIcon={<Settings style={{ width: 20, height: 20 }} />}
          pageColor="linear-gradient(135deg, #14B8A6, #0D9488)"
          breadcrumbs={[
            { label: "首页", href: "/dashboard" },
            { label: "LIMS" },
            { label: "仪器管理" },
          ]}
          backButton={{ onClick: () => navigate("/dashboard") }}
          actions={[
            {
              label: "添加仪器",
              icon: <Plus style={{ width: 18, height: 18 }} />,
              variant: "contained",
              color: "primary",
              onClick: () => openInstrumentModal(),
            },
          ]}
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
              icon={<ClipboardList size={24} />}
              gradient={["#F59E0B", "#D97706"]}
              trend="neutral"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <MetricCard
              title="仪器设备"
              value={stats.total_instruments}
              icon={<Settings size={24} />}
              gradient={["#14B8A6", "#0D9488"]}
              subtitle={`正常: ${stats.normal_instruments}`}
              trend="neutral"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <MetricCard
              title="已完成样品"
              value={stats.completed_samples}
              icon={<CheckCircle2 size={24} />}
              gradient={["#00C897", "#00A878"]}
              trend="up"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <MetricCard
              title="测试中样品"
              value={stats.testing_samples}
              icon={<ClipboardList size={24} />}
              gradient={["#EC4899", "#DB2777"]}
              trend="neutral"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, lg: 6 }}>
            <StatsChart
              title="仪器状态分布"
              type="pie"
              data={[
                {
                  name: "正常",
                  value: stats.normal_instruments,
                  color: "#00C897",
                },
                {
                  name: "校准中",
                  value: stats.calibration_instruments,
                  color: "#F59E0B",
                },
                {
                  name: "维修中",
                  value: stats.maintenance_instruments,
                  color: "#EF4444",
                },
                {
                  name: "停用",
                  value: stats.disabled_instruments,
                  color: "#6B7280",
                },
              ].filter((d) => d.value > 0)}
              dataKey="value"
              nameKey="name"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 6 }}>
            <Card sx={{ borderRadius: 2 }} variant="outlined">
              <CardContent>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  仪器概览
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {safeInstruments.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      仪器总数
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 'bold' }}
                      color="success.main"
                    >
                      {
                        safeInstruments.filter((i) => i.status === "正常")
                          .length
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      正常运行
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography
                      variant="h4"
                      
                      sx={{ ...{ color: "#ea580c" }, fontWeight: 'bold' }}
                    >
                      {
                        safeInstruments.filter((i) => i.status === "校准中")
                          .length
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      校准中
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 'bold' }}
                      color="error.main"
                    >
                      {
                        safeInstruments.filter((i) => i.status === "维修中")
                          .length
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      维修中
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 6 }}>
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
                      仪器总数
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {safeInstruments.length}
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
                      bgcolor: "#ccfbf1",
                    }}
                  >
                    <Settings size={24} color="#0d9488" />
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
                      正常
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 'bold' }}
                      color="success.main"
                    >
                      {
                        safeInstruments.filter((i) => i.status === "正常")
                          .length
                      }
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
                    <CheckCircle2 size={24} color="#15803d" />
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
                      需维护
                    </Typography>
                    <Typography
                      variant="h4"
                      
                      sx={{ ...{ color: "#ea580c" }, fontWeight: 'bold' }}
                    >
                      {
                        safeInstruments.filter((i) => i.status === "维修中")
                          .length
                      }
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
                      bgcolor: "#fed7aa",
                    }}
                  >
                    <Wrench size={24} color="#ea580c" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper sx={{ borderRadius: 2 }} variant="outlined">
          <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="h6" sx={{ fontWeight: 'semibold' }}>
              仪器设备
            </Typography>
          </Box>
          <Box>
            {safeInstruments.length === 0 ? (
              <Box sx={{ p: 6, textAlign: "center" }}>
                <Settings
                  size={64}
                  color="#cbd5e1"
                  style={{ marginBottom: 16 }}
                />
                <Typography color="text.secondary">暂无仪器设备</Typography>
              </Box>
            ) : (
              safeInstruments.map((instrument) => {
                const statusColor = getInstrumentStatusColor(instrument.status);
                const TypeIcon = getInstrumentTypeIcon(instrument.type);
                return (
                  <Box
                    key={instrument.id}
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
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                          flex: 1,
                        }}
                      >
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 1.5,
                            bgcolor: "#ccfbf1",
                            color: "#0d9488",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <TypeIcon size={24} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                              mb: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <Typography variant="h6" sx={{ fontWeight: 'semibold' }}>
                              {instrument.name}
                            </Typography>
                            <Chip
                              size="small"
                              label={instrument.status}
                              sx={{
                                bgcolor: statusColor.bgcolor,
                                color: statusColor.color,
                                fontWeight: 500,
                              }}
                            />
                            <Chip
                              size="small"
                              label={instrument.type}
                              sx={{
                                bgcolor: "grey.100",
                                color: "text.secondary",
                              }}
                            />
                          </Box>
                          <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                            {instrument.manufacturer && instrument.model
                              ? `${instrument.manufacturer} - ${instrument.model}`
                              : instrument.manufacturer ||
                                instrument.model ||
                                "暂无型号信息"}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={2}
                            useFlexGap
                            sx={{ fontSize: 14, flexWrap: 'wrap' }}
                            color="text.secondary"
                          >
                            <span>
                              编号:{" "}
                              <span style={{ fontFamily: "monospace" }}>
                                {instrument.code}
                              </span>
                            </span>
                            {instrument.location && (
                              <span>位置: {instrument.location}</span>
                            )}
                            {instrument.responsible_person && (
                              <span>
                                负责人: {instrument.responsible_person}
                              </span>
                            )}
                            {instrument.next_calibration_date && (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  color: "#ea580c",
                                }}
                              >
                                <AlertCircle size={16} />
                                下次校准:{" "}
                                {new Date(
                                  instrument.next_calibration_date,
                                ).toLocaleDateString("zh-CN")}
                              </Box>
                            )}
                          </Stack>
                        </Box>
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
                          onClick={() => openInstrumentDetailModal(instrument)}
                        >
                          查看详情
                        </Button>
                        <Button
                          size="small"
                          sx={{ color: "#0d9488" }}
                          startIcon={<Wrench size={16} />}
                          onClick={() => openMaintenanceModal(instrument)}
                        >
                          维护记录
                        </Button>
                        <Tooltip title="编辑">
                          <IconButton
                            size="small"
                            onClick={() => openInstrumentModal(instrument)}
                          >
                            <Edit size={20} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              handleDeleteInstrument(instrument.id)
                            }
                          >
                            <Trash2 size={20} />
                          </IconButton>
                        </Tooltip>
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
        open={showInstrumentModal}
        onClose={() => {
          setShowInstrumentModal(false);
          setIsEditingInstrument(false);
        }}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 'semibold' }}>
            {isEditingInstrument ? "编辑仪器" : "添加仪器"}
          </Typography>
          <IconButton
            size="small"
            onClick={() => {
              setShowInstrumentModal(false);
              setIsEditingInstrument(false);
            }}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: "70vh" }}>
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="仪器名称"
                  required
                  fullWidth
                  value={instrumentFormData.name}
                  onChange={(e) =>
                    setInstrumentFormData({
                      ...instrumentFormData,
                      name: e.target.value,
                    })
                  }
                  placeholder="请输入仪器名称"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="仪器编号"
                  required
                  fullWidth
                  value={instrumentFormData.code}
                  onChange={(e) =>
                    setInstrumentFormData({
                      ...instrumentFormData,
                      code: e.target.value,
                    })
                  }
                  placeholder="请输入仪器编号"
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>仪器类型</InputLabel>
                  <Select
                    value={instrumentFormData.type}
                    label="仪器类型"
                    onChange={(e) =>
                      setInstrumentFormData({
                        ...instrumentFormData,
                        type: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="">请选择类型</MenuItem>
                    <MenuItem value="分析仪器">分析仪器</MenuItem>
                    <MenuItem value="测量仪器">测量仪器</MenuItem>
                    <MenuItem value="实验设备">实验设备</MenuItem>
                    <MenuItem value="其他">其他</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>仪器状态</InputLabel>
                  <Select
                    value={instrumentFormData.status}
                    label="仪器状态"
                    onChange={(e) =>
                      setInstrumentFormData({
                        ...instrumentFormData,
                        status: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="正常">正常</MenuItem>
                    <MenuItem value="维修中">维修中</MenuItem>
                    <MenuItem value="校准中">校准中</MenuItem>
                    <MenuItem value="报废">报废</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="制造商"
                  fullWidth
                  value={instrumentFormData.manufacturer}
                  onChange={(e) =>
                    setInstrumentFormData({
                      ...instrumentFormData,
                      manufacturer: e.target.value,
                    })
                  }
                  placeholder="请输入制造商"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="型号"
                  fullWidth
                  value={instrumentFormData.model}
                  onChange={(e) =>
                    setInstrumentFormData({
                      ...instrumentFormData,
                      model: e.target.value,
                    })
                  }
                  placeholder="请输入型号"
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="序列号"
                  fullWidth
                  value={instrumentFormData.serial_number}
                  onChange={(e) =>
                    setInstrumentFormData({
                      ...instrumentFormData,
                      serial_number: e.target.value,
                    })
                  }
                  placeholder="请输入序列号"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="存放位置"
                  fullWidth
                  value={instrumentFormData.location}
                  onChange={(e) =>
                    setInstrumentFormData({
                      ...instrumentFormData,
                      location: e.target.value,
                    })
                  }
                  placeholder="请输入存放位置"
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="购买日期"
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={instrumentFormData.purchase_date}
                  onChange={(e) =>
                    setInstrumentFormData({
                      ...instrumentFormData,
                      purchase_date: e.target.value,
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="上次校准日期"
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={instrumentFormData.calibration_date}
                  onChange={(e) =>
                    setInstrumentFormData({
                      ...instrumentFormData,
                      calibration_date: e.target.value,
                    })
                  }
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="下次校准日期"
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={instrumentFormData.next_calibration_date}
                  onChange={(e) =>
                    setInstrumentFormData({
                      ...instrumentFormData,
                      next_calibration_date: e.target.value,
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="负责人"
                  fullWidth
                  value={instrumentFormData.responsible_person}
                  onChange={(e) =>
                    setInstrumentFormData({
                      ...instrumentFormData,
                      responsible_person: e.target.value,
                    })
                  }
                  placeholder="请输入负责人"
                />
              </Grid>
            </Grid>
            <TextField
              label="备注说明"
              fullWidth
              multiline
              rows={3}
              value={instrumentFormData.description}
              onChange={(e) =>
                setInstrumentFormData({
                  ...instrumentFormData,
                  description: e.target.value,
                })
              }
              placeholder="请输入备注说明"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowInstrumentModal(false);
              setIsEditingInstrument(false);
            }}
            variant="outlined"
            color="inherit"
          >
            取消
          </Button>
          <Button
            onClick={
              isEditingInstrument
                ? handleUpdateInstrument
                : handleCreateInstrument
            }
            disabled={creating}
            variant="contained"
            sx={{
              backgroundColor: "#0d9488",
              "&:hover": { backgroundColor: "#0f766e" },
            }}
          >
            {creating
              ? isEditingInstrument
                ? "更新中..."
                : "创建中..."
              : isEditingInstrument
                ? "更新"
                : "创建"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showInstrumentDetailModal}
        onClose={() => setShowInstrumentDetailModal(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      >
        <DialogContent sx={{ p: 3 }}>
          {selectedInstrument && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 3,
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 'semibold' }}>
                  仪器详情
                </Typography>
                <IconButton onClick={() => setShowInstrumentDetailModal(false)}>
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
                    <Typography variant="h6" sx={{ fontWeight: 'semibold' }}>
                      {selectedInstrument.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={selectedInstrument.status}
                      sx={{
                        bgcolor: getInstrumentStatusColor(
                          selectedInstrument.status,
                        ).bgcolor,
                        color: getInstrumentStatusColor(
                          selectedInstrument.status,
                        ).color,
                        fontWeight: 500,
                        px: 1.5,
                      }}
                    />
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                    <Chip
                      size="small"
                      label={selectedInstrument.type}
                      sx={{ bgcolor: "#ccfbf1", color: "#0f766e" }}
                    />
                    <Chip
                      size="small"
                      label={selectedInstrument.code}
                      sx={{
                        bgcolor: "grey.100",
                        color: "text.secondary",
                        fontFamily: "monospace",
                      }}
                    />
                  </Stack>
                  <Typography color="text.secondary">
                    {selectedInstrument.description || "暂无备注"}
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
                      制造商
                    </Typography>
                    <Typography sx={{ fontWeight: 'medium' }}>
                      {selectedInstrument.manufacturer || "-"}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      型号
                    </Typography>
                    <Typography sx={{ fontWeight: 'medium' }}>
                      {selectedInstrument.model || "-"}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      序列号
                    </Typography>
                    <Typography
                      
                      sx={{ ...{ fontFamily: "monospace" }, fontWeight: 'medium' }}
                    >
                      {selectedInstrument.serial_number || "-"}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      存放位置
                    </Typography>
                    <Typography sx={{ fontWeight: 'medium' }}>
                      {selectedInstrument.location || "-"}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      负责人
                    </Typography>
                    <Typography sx={{ fontWeight: 'medium' }}>
                      {selectedInstrument.responsible_person || "-"}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      购买日期
                    </Typography>
                    <Typography sx={{ fontWeight: 'medium' }}>
                      {selectedInstrument.purchase_date
                        ? new Date(
                            selectedInstrument.purchase_date,
                          ).toLocaleDateString("zh-CN")
                        : "-"}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      上次校准
                    </Typography>
                    <Typography sx={{ fontWeight: 'medium' }}>
                      {selectedInstrument.calibration_date
                        ? new Date(
                            selectedInstrument.calibration_date,
                          ).toLocaleDateString("zh-CN")
                        : "-"}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      下次校准
                    </Typography>
                    <Typography
                      
                      sx={{ ...{
                        color: selectedInstrument.next_calibration_date
                          ? "#ea580c"
                          : "text.primary",
                      }, fontWeight: 'medium' }}
                    >
                      {selectedInstrument.next_calibration_date
                        ? new Date(
                            selectedInstrument.next_calibration_date,
                          ).toLocaleDateString("zh-CN")
                        : "-"}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      创建时间
                    </Typography>
                    <Typography sx={{ fontWeight: 'medium' }}>
                      {new Date(selectedInstrument.created_at).toLocaleString(
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
                      更新时间
                    </Typography>
                    <Typography sx={{ fontWeight: 'medium' }}>
                      {new Date(selectedInstrument.updated_at).toLocaleString(
                        "zh-CN",
                      )}
                    </Typography>
                  </Grid>
                </Grid>

                <Box>
                  <Typography  sx={{ ...{ mb: 1.5 }, fontWeight: 'semibold' }}>
                    维护记录
                  </Typography>
                  {instrumentMaintenanceRecords.length === 0 ? (
                    <Typography
                      color="text.secondary"
                      sx={{ textAlign: "center", py: 2 }}
                    >
                      暂无维护记录
                    </Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {instrumentMaintenanceRecords.map((record) => (
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
                              
                              sx={{ ...{ color: "#0f766e" }, fontWeight: 'medium' }}
                            >
                              {record.maintenance_type}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(record.performed_at).toLocaleDateString(
                                "zh-CN",
                              )}
                            </Typography>
                          </Box>
                          <Typography sx={{ mb: 1 }}>
                            {record.description}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              fontSize: 14,
                            }}
                            color="text.secondary"
                          >
                            <span>执行人: {record.performed_by}</span>
                            {record.cost && <span>费用: ¥{record.cost}</span>}
                          </Box>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Box>

                <Divider />
                <Box
                  sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}
                >
                  <Button
                    onClick={() => {
                      setShowInstrumentDetailModal(false);
                      openMaintenanceModal(selectedInstrument);
                    }}
                    variant="outlined"
                    sx={{ color: "#0d9488", borderColor: "#0d9488" }}
                  >
                    添加维护记录
                  </Button>
                  <Button
                    onClick={() => {
                      setShowInstrumentDetailModal(false);
                      openInstrumentModal(selectedInstrument);
                    }}
                    variant="outlined"
                    color="primary"
                  >
                    编辑
                  </Button>
                  <Button
                    onClick={() => setShowInstrumentDetailModal(false)}
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

      <Dialog
        open={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 'semibold' }}>
            添加维护记录
          </Typography>
          <IconButton
            size="small"
            onClick={() => setShowMaintenanceModal(false)}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedInstrument && (
            <Stack spacing={3}>
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  仪器名称
                </Typography>
                <Typography sx={{ ...{ color: "#0f766e" }, fontWeight: 'medium' }} >
                  {selectedInstrument.name}
                </Typography>
              </Box>
              <FormControl fullWidth required>
                <InputLabel>维护类型</InputLabel>
                <Select
                  value={maintenanceFormData.maintenance_type}
                  label="维护类型"
                  onChange={(e) =>
                    setMaintenanceFormData({
                      ...maintenanceFormData,
                      maintenance_type: e.target.value,
                    })
                  }
                >
                  <MenuItem value="">请选择维护类型</MenuItem>
                  <MenuItem value="日常维护">日常维护</MenuItem>
                  <MenuItem value="定期校准">定期校准</MenuItem>
                  <MenuItem value="故障维修">故障维修</MenuItem>
                  <MenuItem value="部件更换">部件更换</MenuItem>
                  <MenuItem value="性能验证">性能验证</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="维护描述"
                required
                fullWidth
                multiline
                rows={3}
                value={maintenanceFormData.description}
                onChange={(e) =>
                  setMaintenanceFormData({
                    ...maintenanceFormData,
                    description: e.target.value,
                  })
                }
                placeholder="请输入维护描述"
              />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="执行人"
                    required
                    fullWidth
                    value={maintenanceFormData.performed_by}
                    onChange={(e) =>
                      setMaintenanceFormData({
                        ...maintenanceFormData,
                        performed_by: e.target.value,
                      })
                    }
                    placeholder="请输入执行人"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="执行日期"
                    type="date"
                    required
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={maintenanceFormData.performed_at}
                    onChange={(e) =>
                      setMaintenanceFormData({
                        ...maintenanceFormData,
                        performed_at: e.target.value,
                      })
                    }
                  />
                </Grid>
              </Grid>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="下次维护日期"
                    type="date"
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={maintenanceFormData.next_maintenance_date}
                    onChange={(e) =>
                      setMaintenanceFormData({
                        ...maintenanceFormData,
                        next_maintenance_date: e.target.value,
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="费用（元）"
                    type="number"
                    fullWidth
                    value={maintenanceFormData.cost}
                    onChange={(e) =>
                      setMaintenanceFormData({
                        ...maintenanceFormData,
                        cost: Number(e.target.value),
                      })
                    }
                    placeholder="0"
                  />
                </Grid>
              </Grid>
              <TextField
                label="备注"
                fullWidth
                multiline
                rows={2}
                value={maintenanceFormData.notes}
                onChange={(e) =>
                  setMaintenanceFormData({
                    ...maintenanceFormData,
                    notes: e.target.value,
                  })
                }
                placeholder="请输入备注"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowMaintenanceModal(false)}
            variant="outlined"
            color="inherit"
          >
            取消
          </Button>
          <Button
            onClick={handleCreateMaintenance}
            disabled={creating}
            variant="contained"
            sx={{
              backgroundColor: "#0d9488",
              "&:hover": { backgroundColor: "#0f766e" },
            }}
          >
            {creating ? "创建中..." : "创建"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LimsInstrumentPage;
