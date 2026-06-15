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
  ClipboardCheck,
  Download,
  Upload,
  Settings,
  Wrench,
  AlertCircle,
  CheckCircle2,
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
  Tabs,
  Tab,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
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
  InspectionTask,
  InspectionRecord,
  CreateInspectionTaskRequest,
  CreateInspectionRecordRequest,
  Instrument,
  CreateInstrumentRequest,
  MaintenanceRecord,
  CreateMaintenanceRecordRequest,
  LimsStatistics,
} from "../api/lims";
import {
  limsApi,
  BatchOperationResult,
} from "../api/lims";
import { ModuleGate } from "../components/PermissionGate";
import { MODULES } from "../config/permissions";
import { MetricCard } from "../components/MetricCard";
import { StatsChart } from "../components/StatsChart";

type ActiveTab = "samples" | "processes" | "tasks" | "records" | "instruments";

const Limspage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>("samples");
  const [samples, setSamples] = useState<Sample[]>([]);
  const [processes, setProcesses] = useState<InspectionProcess[]>([]);
  const [tasks, setTasks] = useState<InspectionTask[]>([]);
  const [records, setRecords] = useState<InspectionRecord[]>([]);
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

  // Check if a specific service is up
  const isServiceUp = (serviceName: string): boolean => {
    return serviceStatuses[serviceName] || false;
  };

  // Check service status
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

  // Check all services on mount and periodically
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
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showInstrumentModal, setShowInstrumentModal] = useState(false);
  const [showInstrumentDetailModal, setShowInstrumentDetailModal] =
    useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [selectedProcess, setSelectedProcess] =
    useState<InspectionProcess | null>(null);
  const [selectedTask, setSelectedTask] = useState<InspectionTask | null>(null);
  const [selectedTaskRecords, setSelectedTaskRecords] = useState<
    InspectionRecord[]
  >([]);
  const [selectedInstrument, setSelectedInstrument] =
    useState<Instrument | null>(null);
  const [instrumentMaintenanceRecords, setInstrumentMaintenanceRecords] =
    useState<MaintenanceRecord[]>([]);
  const [formData, setFormData] = useState<CreateSampleRequest>({
    name: "",
    description: "",
    status: "待测试",
  });
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
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingInstrument, setIsEditingInstrument] = useState(false);
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
      await Promise.all([
        loadSamples(),
        loadProcesses(),
        loadTasks(),
        loadInstruments(),
        loadStatistics(),
      ]);
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

  const safeInstruments = instruments || [];

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

  const getInstrumentTypeIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      分析仪器: Beaker,
      测量仪器: Settings,
      实验设备: Wrench,
      default: Settings,
    };
    return iconMap[type] || iconMap["default"];
  };

  const getInstrumentStatusColor = (status: string): {
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

  const adaptSample = (s: any): Sample => {
    return {
      ...s,
      received_date: s.received_date || s.created_at,
    };
  };

  const adaptProcess = (p: any): InspectionProcess => {
    return {
      ...p,
    };
  };

  const adaptTask = (t: any): InspectionTask => {
    return {
      ...t,
      status: mapStatusToChinese(t.status),
    };
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

        const adaptedProcesses = rawProcesses.map((p) => adaptProcess(p));
        setProcesses(adaptedProcesses);
      } else {
        setProcesses([]);
      }
    } catch (err) {
      console.error("加载检验流程失败:", err);
      setProcesses([]);
    }
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
      console.error("加载检验任务失败:", err);
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
      console.error("加载检验记录失败:", err);
      setSelectedTaskRecords([]);
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
    setTaskFormData({
      sample_id: sample?.id || "",
      process_id: process?.id || "",
      inspector: "",
    });
    setShowTaskModal(true);
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
      console.error("创建检验任务失败:", err);
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
      console.error("完成检验步骤失败:", err);
    } finally {
      setCreating(false);
    }
  };

  const openTaskDetailModal = async (task: InspectionTask) => {
    setSelectedTask(task);
    await loadTaskRecords(task.id);
    setShowDetailModal(true);
  };

  const safeSamples = Array.isArray(samples) ? samples : [];
  const safeProcesses = Array.isArray(processes) ? processes : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeRecords = Array.isArray(records) ? records : [];

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

  const filteredSamples = safeSamples.filter(
    (s) =>
      (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredTasks = safeTasks.filter(
    (t) =>
      getSampleName(t.sample_id)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      getProcessName(t.process_id)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
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

  const handleExportCurrentTab = () => {
    const data =
      activeTab === "samples"
        ? safeSamples
        : activeTab === "processes"
          ? safeProcesses
          : activeTab === "tasks"
            ? safeTasks
            : activeTab === "records"
              ? safeRecords
              : safeInstruments;
    exportToCSV(data, `lims-${activeTab}`);
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

  // ==================== Render: Loading ====================
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

  // ==================== Render: Service Down ====================
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

  // ==================== Render: Main Page ====================
  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      }}
    >
      {/* Header */}
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
                    background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                    borderRadius: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ClipboardList size={24} color="white" />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    检验管理
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Laboratory Information Management
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              {activeTab === "samples" && (
                <>
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
                      onClick={handleExportCurrentTab}
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
                </>
              )}
              {activeTab === "tasks" && (
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<Play size={16} />}
                  onClick={() => openTaskModal()}
                >
                  新建任务
                </Button>
              )}
              {activeTab === "instruments" && (
                <Button
                  variant="contained"
                  sx={{
                    backgroundColor: "#0d9488",
                    "&:hover": { backgroundColor: "#0f766e" },
                  }}
                  startIcon={<Plus size={16} />}
                  onClick={() => openInstrumentModal()}
                >
                  添加仪器
                </Button>
              )}
            </Box>
          </Box>
        </Container>
      </Paper>

      {/* Notification Snackbar */}
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

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
        {/* Tabs */}
        <Paper sx={{ mb: 3, p: 0.5, borderRadius: 2 }} elevation={0} variant="outlined">
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="fullWidth"
            sx={{ minHeight: 48 }}
          >
            <Tab
              value="samples"
              label="样品管理"
              icon={<Beaker size={18} />}
              iconPosition="start"
              sx={{ minHeight: 48, fontWeight: 500 }}
            />
            <Tab
              value="processes"
              label="检验流程"
              icon={<FileText size={18} />}
              iconPosition="start"
              sx={{ minHeight: 48, fontWeight: 500 }}
            />
            <Tab
              value="tasks"
              label="检验任务"
              icon={<ClipboardCheck size={18} />}
              iconPosition="start"
              sx={{ minHeight: 48, fontWeight: 500 }}
            />
            <Tab
              value="instruments"
              label="仪器管理"
              icon={<Settings size={18} />}
              iconPosition="start"
              sx={{ minHeight: 48, fontWeight: 500 }}
            />
          </Tabs>
        </Paper>

        {/* Stats Dashboard */}
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
              icon={<ClipboardCheck size={24} />}
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
              title="仪器设备"
              value={stats.total_instruments}
              icon={<Settings size={24} />}
              gradient={["#14B8A6", "#0D9488"]}
              subtitle={`正常: ${stats.normal_instruments}`}
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
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} lg={6}>
            <StatsChart
              title="样品状态分布"
              type="pie"
              data={[
                { name: "待测试", value: stats.pending_samples, color: "#F59E0B" },
                { name: "测试中", value: stats.testing_samples, color: "#EC4899" },
                { name: "已完成", value: stats.completed_samples, color: "#00C897" },
                { name: "已终止", value: stats.cancelled_samples, color: "#6B7280" },
              ].filter((d) => d.value > 0)}
              dataKey="value"
              nameKey="name"
            />
          </Grid>
          <Grid item xs={12} lg={6}>
            <StatsChart
              title="仪器状态分布"
              type="pie"
              data={[
                { name: "正常", value: stats.normal_instruments, color: "#00C897" },
                { name: "校准中", value: stats.calibration_instruments, color: "#F59E0B" },
                { name: "维修中", value: stats.maintenance_instruments, color: "#EF4444" },
                { name: "停用", value: stats.disabled_instruments, color: "#6B7280" },
              ].filter((d) => d.value > 0)}
              dataKey="value"
              nameKey="name"
            />
          </Grid>
        </Grid>

        {/* Tab-specific Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={activeTab === "instruments" ? 6 : 3}>
            <Card sx={{ borderRadius: 2 }} variant="outlined">
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {activeTab === "samples"
                        ? "样品总数"
                        : activeTab === "processes"
                          ? "流程总数"
                          : activeTab === "tasks"
                            ? "任务总数"
                            : "仪器总数"}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {activeTab === "samples"
                        ? safeSamples.length
                        : activeTab === "processes"
                          ? safeProcesses.length
                          : activeTab === "tasks"
                            ? safeTasks.length
                            : safeInstruments.length}
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
                    {activeTab === "samples" ? (
                      <Beaker size={24} color="#7c3aed" />
                    ) : activeTab === "processes" ? (
                      <FileText size={24} color="#7c3aed" />
                    ) : activeTab === "tasks" ? (
                      <ClipboardCheck size={24} color="#7c3aed" />
                    ) : (
                      <Settings size={24} color="#0d9488" />
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          {activeTab !== "instruments" && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 2 }} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          进行中
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color="primary">
                          {activeTab === "tasks"
                            ? safeTasks.filter((t) => t.status === "进行中").length
                            : "-"}
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
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 2 }} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          已完成
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color="success.main">
                          {activeTab === "tasks"
                            ? safeTasks.filter((t) => t.status === "已完成").length
                            : "-"}
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
            </>
          )}
          {activeTab === "instruments" && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 2 }} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          正常
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color="success.main">
                          {safeInstruments.filter((i) => i.status === "正常").length}
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
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 2 }} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          需维护
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" sx={{ color: "#ea580c" }}>
                          {safeInstruments.filter((i) => i.status === "维修中").length}
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
            </>
          )}
        </Grid>

        {/* Tab: Samples */}
        {activeTab === "samples" && (
          <Box>
            <Paper sx={{ borderRadius: 2 }} variant="outlined">
              {/* Batch Operations Bar */}
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
                        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flex: 1 }}>
                            <Checkbox
                              checked={selectedSampleIds.has(sample.id)}
                              onChange={() => toggleSampleSelect(sample.id)}
                              sx={{ pt: 0.5 }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
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
                              <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                                {sample.description}
                              </Typography>
                              <Stack direction="row" spacing={3} sx={{ fontSize: 14 }} color="text.secondary">
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Clock size={16} />
                                  接收日期:{" "}
                                  {new Date(sample.received_date).toLocaleDateString("zh-CN")}
                                </Box>
                              </Stack>
                            </Box>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
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
          </Box>
        )}

        {/* Tab: Processes */}
        {activeTab === "processes" && (
          <Box>
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
                      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" fontWeight="semibold" sx={{ mb: 1 }}>
                            {process.name}
                          </Typography>
                          <Typography color="text.secondary" sx={{ mb: 2 }}>
                            {process.description}
                          </Typography>
                          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                            {(process.steps || []).map((step, idx) => (
                              <Box
                                key={step.id}
                                sx={{ display: "flex", alignItems: "center", gap: 1 }}
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
                                <Typography variant="body2">
                                  {step.name}
                                </Typography>
                                {idx < process.steps.length - 1 && (
                                  <Typography color="text.disabled">→</Typography>
                                )}
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Button
                            size="small"
                            color="secondary"
                            startIcon={<Play size={16} />}
                            onClick={() => openTaskModal(undefined, process)}
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
          </Box>
        )}

        {/* Tab: Tasks */}
        {activeTab === "tasks" && (
          <Box>
            <Paper sx={{ borderRadius: 2 }} variant="outlined">
              <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="h6" fontWeight="semibold">
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
                        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                              <Typography variant="h6" fontWeight="semibold">
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
                            <Typography variant="body2" color="secondary.main" sx={{ mb: 1.5 }}>
                              当前步骤: {getCurrentStepName(task)}
                            </Typography>
                            <Stack direction="row" spacing={3} sx={{ fontSize: 14 }} color="text.secondary">
                              <span>检验员: {task.inspector}</span>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <Clock size={16} />
                                开始:{" "}
                                {new Date(task.started_at).toLocaleDateString("zh-CN")}
                              </Box>
                            </Stack>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
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
          </Box>
        )}
      </Container>

      {/* Tab: Instruments */}
      {activeTab === "instruments" && (
        <Container maxWidth="xl" sx={{ pb: 4, px: { xs: 2, sm: 3 } }}>
          <Paper sx={{ borderRadius: 2 }} variant="outlined">
            <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
              <Typography variant="h6" fontWeight="semibold">仪器设备</Typography>
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
                      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flex: 1 }}>
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
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1, flexWrap: "wrap" }}>
                              <Typography variant="h6" fontWeight="semibold">
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
                                sx={{ bgcolor: "grey.100", color: "text.secondary" }}
                              />
                            </Box>
                            <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                              {instrument.manufacturer && instrument.model
                                ? `${instrument.manufacturer} - ${instrument.model}`
                                : instrument.manufacturer ||
                                  instrument.model ||
                                  "暂无型号信息"}
                            </Typography>
                            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ fontSize: 14 }} color="text.secondary">
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
                                <span>负责人: {instrument.responsible_person}</span>
                              )}
                              {instrument.next_calibration_date && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#ea580c" }}>
                                  <AlertCircle size={16} />
                                  下次校准:{" "}
                                  {new Date(instrument.next_calibration_date).toLocaleDateString("zh-CN")}
                                </Box>
                              )}
                            </Stack>
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
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
                              onClick={() => handleDeleteInstrument(instrument.id)}
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
      )}

      {/* Create/Edit Sample Modal */}
      <Dialog
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setIsEditing(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入样品名称"
            />
            <TextField
              label="样品描述"
              fullWidth
              multiline
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入样品描述"
            />
            <FormControl fullWidth>
              <InputLabel>样品状态</InputLabel>
              <Select
                value={formData.status}
                label="样品状态"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
            {creating ? (isEditing ? "更新中..." : "创建中...") : isEditing ? "更新" : "创建"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Task Modal */}
      <Dialog
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight="semibold">新建检验任务</Typography>
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
                  setTaskFormData({ ...taskFormData, sample_id: e.target.value })
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
                  setTaskFormData({ ...taskFormData, process_id: e.target.value })
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

      {/* Record Modal */}
      <Dialog
        open={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight="semibold">完成检验步骤</Typography>
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
              <Typography color="secondary.main" fontWeight="medium">
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
                setRecordFormData({ ...recordFormData, conclusion: e.target.value })
              }
              placeholder="请输入检验结论"
            />
            <TextField
              label="检验员"
              required
              fullWidth
              value={recordFormData.inspector}
              onChange={(e) =>
                setRecordFormData({ ...recordFormData, inspector: e.target.value })
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

      {/* Task Detail Modal */}
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogContent sx={{ p: 3 }}>
          {selectedTask && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                <Typography variant="h5" fontWeight="semibold">
                  检验任务详情
                </Typography>
                <IconButton onClick={() => setShowDetailModal(false)}>
                  <X size={24} />
                </IconButton>
              </Box>

              <Stack spacing={3}>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Typography variant="h6" fontWeight="semibold">
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
                  <Typography color="secondary.main" fontWeight="medium">
                    当前步骤: {getCurrentStepName(selectedTask)}
                  </Typography>
                </Box>

                <Grid container spacing={2} sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1.5 }}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      任务编号
                    </Typography>
                    <Typography fontWeight="medium" sx={{ fontFamily: "monospace", fontSize: 14 }}>
                      {selectedTask.id}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      检验员
                    </Typography>
                    <Typography fontWeight="medium">
                      {selectedTask.inspector}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      开始时间
                    </Typography>
                    <Typography fontWeight="medium">
                      {new Date(selectedTask.started_at).toLocaleString("zh-CN")}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      完成时间
                    </Typography>
                    <Typography fontWeight="medium">
                      {selectedTask.completed_at
                        ? new Date(selectedTask.completed_at).toLocaleString("zh-CN")
                        : "-"}
                    </Typography>
                  </Grid>
                </Grid>

                <Box>
                  <Typography fontWeight="semibold" sx={{ mb: 1.5 }}>
                    检验记录
                  </Typography>
                  {selectedTaskRecords.length === 0 ? (
                    <Typography color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
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
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                            <Typography fontWeight="medium" color="secondary.main">
                              步骤 {idx + 1}: {record.step_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(record.recorded_at).toLocaleString("zh-CN")}
                            </Typography>
                          </Box>
                          <Typography sx={{ mb: 1 }}>
                            结果: {record.result}
                          </Typography>
                          {record.conclusion && (
                            <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
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
                    sx={{ bgcolor: "grey.100", "&:hover": { bgcolor: "grey.200" } }}
                  >
                    关闭
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Batch Create Modal */}
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
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight="semibold">批量创建样品</Typography>
          <IconButton
            size="small"
            onClick={() => {
              setShowBatchCreateModal(false);
              setBatchCreateData([{ name: "", description: "", status: "待测试" }]);
            }}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: "60vh" }}>
          <Stack spacing={2}>
            {batchCreateData.map((item, index) => (
              <Paper key={index} variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
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
                      onChange={(e) => updateBatchCreateItem(index, "name", e.target.value)}
                      placeholder="请输入样品名称"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>状态</InputLabel>
                      <Select
                        value={item.status}
                        label="状态"
                        onChange={(e) => updateBatchCreateItem(index, "status", e.target.value)}
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
                    onChange={(e) => updateBatchCreateItem(index, "description", e.target.value)}
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

      {/* Import Modal */}
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
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight="semibold">导入样品</Typography>
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
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
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
              <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
                <Box component="table" sx={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
                  <tbody>
                    {importPreview.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        style={{ background: rowIndex === 0 ? "#f8fafc" : "transparent" }}
                      >
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            style={{
                              padding: "8px 12px",
                              borderBottom: rowIndex === importPreview.length - 1 ? "none" : "1px solid #e2e8f0",
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
            <Typography variant="body2" fontWeight="medium" color="primary.dark" sx={{ mb: 1 }}>
              CSV 格式说明
            </Typography>
            <Stack spacing={0.5} sx={{ fontSize: 14 }} color="primary.dark">
              <Typography variant="body2">
                • <Box component="code" sx={{ bgcolor: "primary.100", px: 0.5, borderRadius: 0.5 }}>name</Box>
                ：样品名称（必填）
              </Typography>
              <Typography variant="body2">
                • <Box component="code" sx={{ bgcolor: "primary.100", px: 0.5, borderRadius: 0.5 }}>description</Box>
                ：样品描述
              </Typography>
              <Typography variant="body2">
                • <Box component="code" sx={{ bgcolor: "primary.100", px: 0.5, borderRadius: 0.5 }}>status</Box>
                ：状态（待测试、测试中、已完成、已终止）
              </Typography>
              <Typography variant="body2">
                • <Box component="code" sx={{ bgcolor: "primary.100", px: 0.5, borderRadius: 0.5 }}>project_id</Box>
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

      {/* Create/Edit Instrument Modal */}
      <Dialog
        open={showInstrumentModal}
        onClose={() => {
          setShowInstrumentModal(false);
          setIsEditingInstrument(false);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight="semibold">
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
              <Grid item xs={12} md={6}>
                <TextField
                  label="仪器名称"
                  required
                  fullWidth
                  value={instrumentFormData.name}
                  onChange={(e) =>
                    setInstrumentFormData({ ...instrumentFormData, name: e.target.value })
                  }
                  placeholder="请输入仪器名称"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="仪器编号"
                  required
                  fullWidth
                  value={instrumentFormData.code}
                  onChange={(e) =>
                    setInstrumentFormData({ ...instrumentFormData, code: e.target.value })
                  }
                  placeholder="请输入仪器编号"
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>仪器类型</InputLabel>
                  <Select
                    value={instrumentFormData.type}
                    label="仪器类型"
                    onChange={(e) =>
                      setInstrumentFormData({ ...instrumentFormData, type: e.target.value })
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
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>仪器状态</InputLabel>
                  <Select
                    value={instrumentFormData.status}
                    label="仪器状态"
                    onChange={(e) =>
                      setInstrumentFormData({ ...instrumentFormData, status: e.target.value })
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
              <Grid item xs={12} md={6}>
                <TextField
                  label="制造商"
                  fullWidth
                  value={instrumentFormData.manufacturer}
                  onChange={(e) =>
                    setInstrumentFormData({ ...instrumentFormData, manufacturer: e.target.value })
                  }
                  placeholder="请输入制造商"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="型号"
                  fullWidth
                  value={instrumentFormData.model}
                  onChange={(e) =>
                    setInstrumentFormData({ ...instrumentFormData, model: e.target.value })
                  }
                  placeholder="请输入型号"
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="序列号"
                  fullWidth
                  value={instrumentFormData.serial_number}
                  onChange={(e) =>
                    setInstrumentFormData({ ...instrumentFormData, serial_number: e.target.value })
                  }
                  placeholder="请输入序列号"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="存放位置"
                  fullWidth
                  value={instrumentFormData.location}
                  onChange={(e) =>
                    setInstrumentFormData({ ...instrumentFormData, location: e.target.value })
                  }
                  placeholder="请输入存放位置"
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="购买日期"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={instrumentFormData.purchase_date}
                  onChange={(e) =>
                    setInstrumentFormData({ ...instrumentFormData, purchase_date: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="上次校准日期"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={instrumentFormData.calibration_date}
                  onChange={(e) =>
                    setInstrumentFormData({ ...instrumentFormData, calibration_date: e.target.value })
                  }
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="下次校准日期"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={instrumentFormData.next_calibration_date}
                  onChange={(e) =>
                    setInstrumentFormData({ ...instrumentFormData, next_calibration_date: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="负责人"
                  fullWidth
                  value={instrumentFormData.responsible_person}
                  onChange={(e) =>
                    setInstrumentFormData({ ...instrumentFormData, responsible_person: e.target.value })
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
                setInstrumentFormData({ ...instrumentFormData, description: e.target.value })
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
              isEditingInstrument ? handleUpdateInstrument : handleCreateInstrument
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

      {/* Instrument Detail Modal */}
      <Dialog
        open={showInstrumentDetailModal}
        onClose={() => setShowInstrumentDetailModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogContent sx={{ p: 3 }}>
          {selectedInstrument && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                <Typography variant="h5" fontWeight="semibold">
                  仪器详情
                </Typography>
                <IconButton onClick={() => setShowInstrumentDetailModal(false)}>
                  <X size={24} />
                </IconButton>
              </Box>

              <Stack spacing={3}>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Typography variant="h6" fontWeight="semibold">
                      {selectedInstrument.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={selectedInstrument.status}
                      sx={{
                        bgcolor: getInstrumentStatusColor(selectedInstrument.status).bgcolor,
                        color: getInstrumentStatusColor(selectedInstrument.status).color,
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

                <Grid container spacing={2} sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1.5 }}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      制造商
                    </Typography>
                    <Typography fontWeight="medium">
                      {selectedInstrument.manufacturer || "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      型号
                    </Typography>
                    <Typography fontWeight="medium">
                      {selectedInstrument.model || "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      序列号
                    </Typography>
                    <Typography fontWeight="medium" sx={{ fontFamily: "monospace" }}>
                      {selectedInstrument.serial_number || "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      存放位置
                    </Typography>
                    <Typography fontWeight="medium">
                      {selectedInstrument.location || "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      负责人
                    </Typography>
                    <Typography fontWeight="medium">
                      {selectedInstrument.responsible_person || "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      购买日期
                    </Typography>
                    <Typography fontWeight="medium">
                      {selectedInstrument.purchase_date
                        ? new Date(selectedInstrument.purchase_date).toLocaleDateString("zh-CN")
                        : "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      上次校准
                    </Typography>
                    <Typography fontWeight="medium">
                      {selectedInstrument.calibration_date
                        ? new Date(selectedInstrument.calibration_date).toLocaleDateString("zh-CN")
                        : "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      下次校准
                    </Typography>
                    <Typography
                      fontWeight="medium"
                      sx={{
                        color: selectedInstrument.next_calibration_date ? "#ea580c" : "text.primary",
                      }}
                    >
                      {selectedInstrument.next_calibration_date
                        ? new Date(selectedInstrument.next_calibration_date).toLocaleDateString("zh-CN")
                        : "-"}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      创建时间
                    </Typography>
                    <Typography fontWeight="medium">
                      {new Date(selectedInstrument.created_at).toLocaleString("zh-CN")}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      更新时间
                    </Typography>
                    <Typography fontWeight="medium">
                      {new Date(selectedInstrument.updated_at).toLocaleString("zh-CN")}
                    </Typography>
                  </Grid>
                </Grid>

                <Box>
                  <Typography fontWeight="semibold" sx={{ mb: 1.5 }}>
                    维护记录
                  </Typography>
                  {instrumentMaintenanceRecords.length === 0 ? (
                    <Typography color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
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
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                            <Typography fontWeight="medium" sx={{ color: "#0f766e" }}>
                              {record.maintenance_type}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(record.performed_at).toLocaleDateString("zh-CN")}
                            </Typography>
                          </Box>
                          <Typography sx={{ mb: 1 }}>
                            {record.description}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14 }} color="text.secondary">
                            <span>执行人: {record.performed_by}</span>
                            {record.cost && <span>费用: ¥{record.cost}</span>}
                          </Box>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Box>

                <Divider />
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
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
                    sx={{ bgcolor: "grey.100", "&:hover": { bgcolor: "grey.200" } }}
                  >
                    关闭
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Maintenance Record Modal */}
      <Dialog
        open={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight="semibold">添加维护记录</Typography>
          <IconButton size="small" onClick={() => setShowMaintenanceModal(false)}>
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedInstrument && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  仪器名称
                </Typography>
                <Typography sx={{ color: "#0f766e" }} fontWeight="medium">
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
                <Grid item xs={12} md={6}>
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
                <Grid item xs={12} md={6}>
                  <TextField
                    label="执行日期"
                    type="date"
                    required
                    fullWidth
                    InputLabelProps={{ shrink: true }}
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
                <Grid item xs={12} md={6}>
                  <TextField
                    label="下次维护日期"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={maintenanceFormData.next_maintenance_date}
                    onChange={(e) =>
                      setMaintenanceFormData({
                        ...maintenanceFormData,
                        next_maintenance_date: e.target.value,
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
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

export default Limspage;
