import { Grid } from "@/components/Grid";
import React, { useEffect, useState, useCallback } from "react";
import {
  ClipboardList,
  Plus,
  Clock,
  ChevronRight,
  Beaker,
  Edit,
  Trash2,
  X,
  CheckCircle,
  Play,
  FileText,
  Download,
  Upload,
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
  FormControlLabel,
  Checkbox,
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
  Sample,
  CreateSampleRequest,
  InspectionProcess,
  LimsStatistics,
} from "../api/lims";
import { limsApi } from "../api/lims";
import { ModuleGate } from "../components/PermissionGate";
import { MODULES } from "../config/permissions";
import { MetricCard } from "../components/MetricCard";
import { StatsChart } from "../components/StatsChart";

const LimsSamplePage: React.FC = () => {
  const navigate = useNavigate();
  const [samples, setSamples] = useState<Sample[]>([]);
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

  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [formData, setFormData] = useState<CreateSampleRequest>({
    name: "",
    description: "",
    status: "待测试",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [selectedSampleIds, setSelectedSampleIds] = useState<Set<string>>(
    new Set(),
  );
  const [showBatchCreateModal, setShowBatchCreateModal] = useState(false);
  const [batchCreateData, setBatchCreateData] = useState<CreateSampleRequest[]>(
    [{ name: "", description: "", status: "待测试" }],
  );
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<string[][] | null>(null);

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
      await Promise.all([loadSamples(), loadProcesses(), loadStatistics()]);
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
      console.error("加载样品失败:", err);
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

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      showNotification("error", "请输入样品名称");
      return;
    }

    try {
      setCreating(true);
      const response = await limsApi.createSample(formData);
      if (response.success) {
        showNotification("success", "样品创建成功");
        setShowModal(false);
        setFormData({ name: "", description: "", status: "待测试" });
        loadSamples();
      } else {
        showNotification("error", response.message || "创建失败");
      }
    } catch (err) {
      showNotification("error", "创建样品失败");
      console.error("创建样品失败:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个样品吗？")) return;

    try {
      const response = await limsApi.deleteSample(id);
      if (response.success) {
        showNotification("success", "样品删除成功");
        loadSamples();
      } else {
        showNotification("error", response.message || "删除失败");
      }
    } catch (err) {
      showNotification("error", "删除样品失败");
      console.error("删除样品失败:", err);
    }
  };

  const handleEdit = async () => {
    if (!formData.name.trim()) {
      showNotification("error", "请输入样品名称");
      return;
    }

    try {
      setCreating(true);
      const response = await limsApi.updateSample(selectedSample!.id, formData);
      if (response.success) {
        showNotification("success", "样品更新成功");
        setShowModal(false);
        setIsEditing(false);
        setFormData({ name: "", description: "", status: "待测试" });
        loadSamples();
      } else {
        showNotification("error", response.message || "更新失败");
      }
    } catch (err) {
      showNotification("error", "更新样品失败");
      console.error("更新样品失败:", err);
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (sample: Sample) => {
    setSelectedSample(sample);
    setFormData({
      name: sample.name,
      description: sample.description,
      status: sample.status,
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const openDetailModal = (sample: Sample) => {
    setSelectedSample(sample);
    setShowDetailModal(true);
  };

  const openTaskModal = (sample?: Sample, process?: InspectionProcess) => {
    setShowTaskModal(true);
  };

  const safeSamples = Array.isArray(samples) ? samples : [];
  const safeProcesses = Array.isArray(processes) ? processes : [];

  const filteredSamples = safeSamples.filter(
    (s) =>
      (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const toggleSampleSelect = useCallback((id: string) => {
    setSelectedSampleIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAllSamples = useCallback(() => {
    setSelectedSampleIds(new Set(filteredSamples.map((s) => s.id)));
  }, [filteredSamples]);

  const deselectAllSamples = useCallback(() => {
    setSelectedSampleIds(new Set());
  }, []);

  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除 ${selectedSampleIds.size} 个样品吗？`)) return;

    try {
      setCreating(true);
      const response = await limsApi.batchDeleteSamples({
        ids: Array.from(selectedSampleIds),
      });

      if (response.success) {
        const result = response.data!;
        showNotification(
          "success",
          `批量删除完成：成功 ${result.success} 个，失败 ${result.failed} 个`,
        );
        deselectAllSamples();
        loadSamples();
      } else {
        showNotification("error", response.message || "批量删除失败");
      }
    } catch (err) {
      showNotification("error", "批量删除失败");
      console.error("批量删除失败:", err);
    } finally {
      setCreating(false);
    }
  };

  const addBatchCreateItem = () => {
    setBatchCreateData((prev) => [
      ...prev,
      { name: "", description: "", status: "待测试" },
    ]);
  };

  const removeBatchCreateItem = (index: number) => {
    setBatchCreateData((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBatchCreateItem = (
    index: number,
    field: keyof CreateSampleRequest,
    value: string,
  ) => {
    setBatchCreateData((prev) => {
      const newData = [...prev];
      newData[index] = { ...newData[index], [field]: value };
      return newData;
    });
  };

  const handleBatchCreate = async () => {
    const validSamples = batchCreateData.filter(
      (item) => item.name.trim() !== "",
    );
    if (validSamples.length === 0) {
      showNotification("error", "请至少填写一个样品的名称");
      return;
    }

    try {
      setCreating(true);
      const response = await limsApi.batchCreateSamples({
        samples: validSamples,
      });

      if (response.success) {
        const result = response.data!;
        showNotification(
          "success",
          `批量创建完成：成功 ${result.success} 个，失败 ${result.failed} 个`,
        );
        setShowBatchCreateModal(false);
        setBatchCreateData([{ name: "", description: "", status: "待测试" }]);
        loadSamples();
      } else {
        showNotification("error", response.message || "批量创建失败");
      }
    } catch (err) {
      showNotification("error", "批量创建失败");
      console.error("批量创建失败:", err);
    } finally {
      setCreating(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      showNotification("error", "没有数据可导出");
      return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((h) => `"${(row[h] || "").toString().replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${filename}-${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("success", "导出成功");
  };

  const handleExport = () => {
    exportToCSV(safeSamples, "lims-samples");
  };

  const downloadTemplate = () => {
    const headers = ["name", "description", "status", "project_id"];
    const sampleRow = ["样品1", "样品描述", "待测试", ""];
    const content = [headers, sampleRow].map((row) => row.join(",")).join("\n");

    const blob = new Blob([content], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "samples_template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleImportFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImportFile(file);

      try {
        const content = await file.text();
        const lines = content.split("\n").slice(0, 6);
        const preview = lines.map((line) => line.split(","));
        setImportPreview(preview);
      } catch {
        setImportPreview(null);
      }
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      showNotification("error", "请选择要导入的文件");
      return;
    }

    try {
      setCreating(true);
      const response = await limsApi.importSamples(importFile);

      if (response.success) {
        const result = response.data!;
        let message = `导入完成：成功 ${result.success} 个`;
        if (result.failed > 0) {
          message += `，失败 ${result.failed} 个`;
          if (result.errors && result.errors.length > 0) {
            message += ` - ${result.errors.slice(0, 2).join("; ")}`;
          }
        }
        showNotification("success", message);
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview(null);
        loadSamples();
      } else {
        showNotification("error", response.message || "导入失败");
      }
    } catch (err) {
      showNotification("error", "导入失败");
      console.error("导入失败:", err);
    } finally {
      setCreating(false);
    }
  };

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
                      "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                    borderRadius: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Beaker size={24} color="white" />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    样品管理
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sample Management
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <ModuleGate
                module={MODULES.LIMS}
                action="write"
                showDisabled={true}
              >
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Plus size={16} />}
                  onClick={() => setShowModal(true)}
                >
                  新建样品
                </Button>
              </ModuleGate>
              <ModuleGate
                module={MODULES.LIMS}
                action="write"
                showDisabled={true}
              >
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Plus size={16} />}
                  onClick={() => setShowBatchCreateModal(true)}
                >
                  批量创建
                </Button>
              </ModuleGate>
              <ModuleGate
                module={MODULES.LIMS}
                action="read"
                showDisabled={true}
              >
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<Download size={16} />}
                  onClick={handleExport}
                  disabled={creating}
                >
                  导出
                </Button>
              </ModuleGate>
              <ModuleGate
                module={MODULES.LIMS}
                action="write"
                showDisabled={true}
              >
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<Upload size={16} />}
                  onClick={() => setShowImportModal(true)}
                >
                  导入
                </Button>
              </ModuleGate>
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
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <MetricCard
              title="样品总数"
              value={stats.total_samples}
              icon={<Beaker size={24} />}
              gradient={["#8B5CF6", "#7C3AED"]}
              subtitle={`待测试: ${stats.pending_samples}`}
              trend={stats.pending_samples > 0 ? "up" : "neutral"}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <MetricCard
              title="检验任务"
              value={stats.total_tasks}
              icon={<ClipboardList size={24} />}
              gradient={["#6366F1", "#4F46E5"]}
              subtitle={`进行中: ${stats.in_progress_tasks}`}
              trend={stats.in_progress_tasks > 0 ? "up" : "neutral"}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <MetricCard
              title="检验流程"
              value={stats.total_processes}
              icon={<FileText size={24} />}
              gradient={["#F59E0B", "#D97706"]}
              trend="neutral"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <MetricCard
              title="已完成样品"
              value={stats.completed_samples}
              icon={<CheckCircle size={24} />}
              gradient={["#00C897", "#00A878"]}
              trend="up"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <MetricCard
              title="测试中样品"
              value={stats.testing_samples}
              icon={<Clock size={24} />}
              gradient={["#EC4899", "#DB2777"]}
              trend="neutral"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
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
          <Grid item xs={12} lg={6}>
            <StatsChart
              title="样品状态分布"
              type="pie"
              data={[
                {
                  name: "待测试",
                  value: stats.pending_samples,
                  color: "#F59E0B",
                },
                {
                  name: "测试中",
                  value: stats.testing_samples,
                  color: "#EC4899",
                },
                {
                  name: "已完成",
                  value: stats.completed_samples,
                  color: "#00C897",
                },
                {
                  name: "已终止",
                  value: stats.cancelled_samples,
                  color: "#6B7280",
                },
              ].filter((d) => d.value > 0)}
              dataKey="value"
              nameKey="name"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
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
                      样品总数
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {safeSamples.length}
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
                    <Beaker size={24} color="#7c3aed" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
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
                      fontWeight="bold"
                      sx={{ color: "#b45309" }}
                    >
                      {safeSamples.filter((s) => s.status === "待测试").length}
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
          <Grid item xs={12} sm={6} md={3}>
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
                      测试中
                    </Typography>
                    <Typography
                      variant="h4"
                      fontWeight="bold"
                      sx={{ color: "#7e22ce" }}
                    >
                      {safeSamples.filter((s) => s.status === "测试中").length}
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
                      bgcolor: "#f3e8ff",
                    }}
                  >
                    <Clock size={24} color="#7e22ce" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
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
                      fontWeight="bold"
                      color="success.main"
                    >
                      {safeSamples.filter((s) => s.status === "已完成").length}
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
        </Grid>

        <Paper sx={{ borderRadius: 2 }} variant="outlined">
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 2,
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: "grey.50",
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={
                    selectedSampleIds.size === filteredSamples.length &&
                    filteredSamples.length > 0
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      selectAllSamples();
                    } else {
                      deselectAllSamples();
                    }
                  }}
                />
              }
              label={
                selectedSampleIds.size > 0
                  ? `已选择 ${selectedSampleIds.size} 项`
                  : "全部选择"
              }
            />
            {selectedSampleIds.size > 0 && (
              <ModuleGate
                module={MODULES.LIMS}
                action="delete"
                showDisabled={true}
              >
                <Button
                  color="error"
                  size="small"
                  startIcon={<Trash2 size={16} />}
                  onClick={handleBatchDelete}
                  disabled={creating}
                >
                  批量删除
                </Button>
              </ModuleGate>
            )}
          </Box>
          <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="h6" fontWeight="semibold">
              样品列表
            </Typography>
          </Box>
          <Box>
            {filteredSamples.length === 0 ? (
              <Box sx={{ p: 6, textAlign: "center" }}>
                <Beaker
                  size={64}
                  color="#cbd5e1"
                  style={{ marginBottom: 16 }}
                />
                <Typography color="text.secondary">暂无样品</Typography>
              </Box>
            ) : (
              filteredSamples.map((sample) => {
                const statusColor = getStatusColor(sample.status);
                return (
                  <Box
                    key={sample.id}
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
                        <Checkbox
                          checked={selectedSampleIds.has(sample.id)}
                          onChange={() => toggleSampleSelect(sample.id)}
                          sx={{ pt: 0.5 }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                              mb: 1,
                            }}
                          >
                            <Typography variant="h6" fontWeight="semibold">
                              {sample.name}
                            </Typography>
                            <Chip
                              size="small"
                              label={sample.status}
                              sx={{
                                bgcolor: statusColor.bgcolor,
                                color: statusColor.color,
                                fontWeight: 500,
                              }}
                            />
                          </Box>
                          <Typography
                            color="text.secondary"
                            sx={{ mb: 1.5 }}
                          >
                            {sample.description}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={3}
                            sx={{ fontSize: 14 }}
                            color="text.secondary"
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              <Clock size={16} />
                              接收日期:{" "}
                              {new Date(sample.received_date).toLocaleDateString(
                                "zh-CN",
                              )}
                            </Box>
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
                          onClick={() => openDetailModal(sample)}
                        >
                          查看详情
                        </Button>
                        <Button
                          size="small"
                          color="secondary"
                          startIcon={<Play size={16} />}
                          onClick={() => openTaskModal(sample, undefined)}
                        >
                          发起检验
                        </Button>
                        <Tooltip title="编辑">
                          <IconButton
                            size="small"
                            onClick={() => openEditModal(sample)}
                          >
                            <Edit size={20} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(sample.id)}
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
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setIsEditing(false);
        }}
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
            {isEditing ? "编辑样品" : "新建样品"}
          </Typography>
          <IconButton
            size="small"
            onClick={() => {
              setShowModal(false);
              setIsEditing(false);
            }}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <TextField
              label="样品名称"
              required
              fullWidth
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="请输入样品名称"
            />
            <TextField
              label="样品描述"
              fullWidth
              multiline
              rows={4}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="请输入样品描述"
            />
            <FormControl fullWidth>
              <InputLabel>样品状态</InputLabel>
              <Select
                value={formData.status}
                label="样品状态"
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <MenuItem value="待测试">待测试</MenuItem>
                <MenuItem value="测试中">测试中</MenuItem>
                <MenuItem value="已完成">已完成</MenuItem>
                <MenuItem value="已终止">已终止</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowModal(false)}
            variant="outlined"
            color="inherit"
          >
            取消
          </Button>
          <Button
            onClick={isEditing ? handleEdit : handleCreate}
            disabled={creating}
            variant="contained"
            color="secondary"
          >
            {creating
              ? isEditing
                ? "更新中..."
                : "创建中..."
              : isEditing
                ? "更新"
                : "创建"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogContent sx={{ p: 3 }}>
          {selectedSample && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 3,
                }}
              >
                <Typography variant="h5" fontWeight="semibold">
                  样品详情
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
                    <Typography variant="h6" fontWeight="semibold">
                      {selectedSample.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={selectedSample.status}
                      sx={{
                        bgcolor: getStatusColor(selectedSample.status).bgcolor,
                        color: getStatusColor(selectedSample.status).color,
                        fontWeight: 500,
                        px: 1.5,
                      }}
                    />
                  </Box>
                  <Typography color="text.secondary">
                    {selectedSample.description || "暂无描述"}
                  </Typography>
                </Box>

                <Grid
                  container
                  spacing={2}
                  sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1.5 }}
                >
                  <Grid item xs={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      样品编号
                    </Typography>
                    <Typography
                      fontWeight="medium"
                      sx={{ fontFamily: "monospace", fontSize: 14 }}
                    >
                      {selectedSample.id}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      接收日期
                    </Typography>
                    <Typography fontWeight="medium">
                      {new Date(selectedSample.received_date).toLocaleDateString(
                        "zh-CN",
                      )}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      创建时间
                    </Typography>
                    <Typography fontWeight="medium">
                      {new Date(selectedSample.created_at).toLocaleString(
                        "zh-CN",
                      )}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      更新时间
                    </Typography>
                    <Typography fontWeight="medium">
                      {new Date(selectedSample.updated_at).toLocaleString(
                        "zh-CN",
                      )}
                    </Typography>
                  </Grid>
                </Grid>

                <Divider />
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    onClick={() => {
                      setShowDetailModal(false);
                      openEditModal(selectedSample);
                    }}
                    variant="outlined"
                    color="primary"
                    sx={{ mr: 1.5 }}
                  >
                    编辑
                  </Button>
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

      <Dialog
        open={showBatchCreateModal}
        onClose={() => {
          setShowBatchCreateModal(false);
          setBatchCreateData([{ name: "", description: "", status: "待测试" }]);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" fontWeight="semibold">
            批量创建样品
          </Typography>
          <IconButton
            size="small"
            onClick={() => {
              setShowBatchCreateModal(false);
              setBatchCreateData([
                { name: "", description: "", status: "待测试" },
              ]);
            }}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: "60vh" }}>
          <Stack spacing={2}>
            {batchCreateData.map((item, index) => (
              <Paper
                key={index}
                variant="outlined"
                sx={{ p: 2, borderRadius: 1.5 }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1.5,
                  }}
                >
                  <Typography fontWeight="medium">样品 {index + 1}</Typography>
                  {batchCreateData.length > 1 && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeBatchCreateItem(index)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  )}
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="样品名称"
                      required
                      fullWidth
                      size="small"
                      value={item.name}
                      onChange={(e) =>
                        updateBatchCreateItem(index, "name", e.target.value)
                      }
                      placeholder="请输入样品名称"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>状态</InputLabel>
                      <Select
                        value={item.status}
                        label="状态"
                        onChange={(e) =>
                          updateBatchCreateItem(index, "status", e.target.value)
                        }
                      >
                        <MenuItem value="待测试">待测试</MenuItem>
                        <MenuItem value="测试中">测试中</MenuItem>
                        <MenuItem value="已完成">已完成</MenuItem>
                        <MenuItem value="已终止">已终止</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <TextField
                    label="样品描述"
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    value={item.description}
                    onChange={(e) =>
                      updateBatchCreateItem(index, "description", e.target.value)
                    }
                    placeholder="请输入样品描述"
                  />
                </Box>
              </Paper>
            ))}
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Plus size={16} />}
              onClick={addBatchCreateItem}
              sx={{ py: 1.5, borderStyle: "dashed" }}
            >
              添加样品
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowBatchCreateModal(false);
              setBatchCreateData([{ name: "", description: "", status: "待测试" }]);
            }}
            variant="outlined"
            color="inherit"
          >
            取消
          </Button>
          <Button
            onClick={handleBatchCreate}
            disabled={creating}
            variant="contained"
            color="success"
          >
            {creating ? "创建中..." : "批量创建"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportPreview(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" fontWeight="semibold">
            导入样品
          </Typography>
          <IconButton
            size="small"
            onClick={() => {
              setShowImportModal(false);
              setImportFile(null);
              setImportPreview(null);
            }}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: "70vh" }}>
          <Box sx={{ mb: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography variant="body2" fontWeight="medium">
                选择 CSV 文件
              </Typography>
              <Button
                size="small"
                color="primary"
                startIcon={<Download size={14} />}
                onClick={downloadTemplate}
              >
                下载模板
              </Button>
            </Box>
            <Box
              sx={{
                border: 2,
                borderStyle: "dashed",
                borderColor: "divider",
                borderRadius: 1.5,
                p: 3,
                textAlign: "center",
                transition: "border-color 0.2s",
                "&:hover": { borderColor: "text.secondary" },
                cursor: "pointer",
              }}
            >
              <input
                type="file"
                accept=".csv"
                id="file-upload"
                onChange={handleImportFileChange}
                style={{ display: "none" }}
              />
              <label htmlFor="file-upload" style={{ cursor: "pointer" }}>
                <Upload
                  size={40}
                  color="#94a3b8"
                  style={{ marginBottom: 12 }}
                />
                <Typography sx={{ mb: 0.5 }}>点击或拖拽文件到这里</Typography>
                <Typography variant="body2" color="text.secondary">
                  支持 CSV 格式
                </Typography>
              </label>
            </Box>
            {importFile && (
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  bgcolor: "grey.50",
                  borderRadius: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <FileText size={20} color="#0891b2" />
                  <Typography variant="body2">{importFile.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({(importFile.size / 1024).toFixed(1)} KB)
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => {
                    setImportFile(null);
                    setImportPreview(null);
                  }}
                >
                  <X size={16} />
                </IconButton>
              </Box>
            )}
          </Box>

          {importPreview && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="medium" sx={{ mb: 1.5 }}>
                文件预览（前5行）
              </Typography>
              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1.5,
                  overflow: "hidden",
                }}
              >
                <Box
                  component="table"
                  sx={{
                    width: "100%",
                    fontSize: 14,
                    borderCollapse: "collapse",
                  }}
                >
                  <tbody>
                    {importPreview.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        style={{
                          background:
                            rowIndex === 0 ? "#f8fafc" : "transparent",
                        }}
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            style={{
                              padding: "8px 12px",
                              borderBottom:
                                rowIndex === importPreview.length - 1
                                  ? "none"
                                  : "1px solid #e2e8f0",
                            }}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Box>
              </Box>
            </Box>
          )}

          <Paper
            variant="outlined"
            sx={{ p: 2, bgcolor: "primary.50", borderColor: "primary.200" }}
          >
            <Typography
              variant="body2"
              fontWeight="medium"
              color="primary.dark"
              sx={{ mb: 1 }}
            >
              CSV 格式说明
            </Typography>
            <Stack spacing={0.5} sx={{ fontSize: 14 }} color="primary.dark">
              <Typography variant="body2">
                •{" "}
                <Box
                  component="code"
                  sx={{ bgcolor: "primary.100", px: 0.5, borderRadius: 0.5 }}
                >
                  name
                </Box>
                ：样品名称（必填）
              </Typography>
              <Typography variant="body2">
                •{" "}
                <Box
                  component="code"
                  sx={{ bgcolor: "primary.100", px: 0.5, borderRadius: 0.5 }}
                >
                  description
                </Box>
                ：样品描述
              </Typography>
              <Typography variant="body2">
                •{" "}
                <Box
                  component="code"
                  sx={{ bgcolor: "primary.100", px: 0.5, borderRadius: 0.5 }}
                >
                  status
                </Box>
                ：状态（待测试、测试中、已完成、已终止）
              </Typography>
              <Typography variant="body2">
                •{" "}
                <Box
                  component="code"
                  sx={{ bgcolor: "primary.100", px: 0.5, borderRadius: 0.5 }}
                >
                  project_id
                </Box>
                ：关联项目ID
              </Typography>
            </Stack>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowImportModal(false);
              setImportFile(null);
              setImportPreview(null);
            }}
            variant="outlined"
            color="inherit"
          >
            取消
          </Button>
          <Button
            onClick={handleImport}
            disabled={creating || !importFile}
            variant="contained"
            sx={{
              backgroundColor: "#0891b2",
              "&:hover": { backgroundColor: "#0e7490" },
            }}
          >
            {creating ? "导入中..." : "导入"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LimsSamplePage;