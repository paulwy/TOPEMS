import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Stack,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Divider,
  Grid,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Skeleton,
  Alert,
  Snackbar,
  LinearProgress,
  AppBar,
  Toolbar,
} from "@mui/material";
import {
  FlaskConical as Science,
  Plus as Add,
  Search,
  Clock as AccessTime,
  ChevronRight,
  FileText as Description,
  Edit,
  Trash2 as Delete,
  X as Close,
  CheckCircle,
  FlaskConical as Biotech,
  Download,
  Upload,
  Code,
  GitBranch as AccountTree,
  CircleCheck as CheckCircleOutline,
  X as Cancel,
  Eye as Visibility,
  Hourglass as HourglassEmpty,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type {
  Project,
  CreateProjectRequest,
  Experiment,
  CreateExperimentRequest,
  UpdateExperimentRequest,
  Formula,
  CreateFormulaRequest,
  FormulaVersion,
  RsStatistics,
} from "../api/rs";
import { rsApi, formulaApi } from "../api/rs";
import { FieldError } from "../components/ValidationError";
import { ModuleGate } from "../components/PermissionGate";
import { MODULES } from "../config/permissions";
import { MetricCard } from "../components/MetricCard";
import { StatsChart } from "../components/StatsChart";

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  立项: { bg: "info.light", color: "info.dark" },
  进行中: { bg: "primary.light", color: "primary.dark" },
  已完成: { bg: "success.light", color: "success.dark" },
  已终止: { bg: "error.light", color: "error.dark" },
  草稿: { bg: "grey.200", color: "grey.700" },
  待审批: { bg: "warning.light", color: "warning.dark" },
  已批准: { bg: "success.light", color: "success.dark" },
  已发布: { bg: "info.light", color: "info.dark" },
  已废弃: { bg: "grey.200", color: "grey.700" },
};

const EXPERIMENT_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  小试: { bg: "info.light", color: "info.dark" },
  中试: { bg: "warning.light", color: "warning.dark" },
  量产: { bg: "success.light", color: "success.dark" },
};

const getStatusColor = (status: string): { bgcolor: string; color: string } => {
  const c = STATUS_COLORS[status] || { bg: "grey.200", color: "grey.700" };
  return { bgcolor: c.bg, color: c.color };
};

const getExperimentTypeColor = (type: string): { bgcolor: string; color: string } => {
  const c = EXPERIMENT_TYPE_COLORS[type] || { bg: "grey.200", color: "grey.700" };
  return { bgcolor: c.bg, color: c.color };
};

const getFormulaStatusColor = (status: string) => getStatusColor(status);

const StatusChip: React.FC<{ status: string; type?: "experiment" }> = ({ status, type }) => {
  const colorMap = type === "experiment" ? getExperimentTypeColor(status) : getStatusColor(status);
  return (
    <Chip
      size="small"
      label={status}
      sx={{ bgcolor: colorMap.bgcolor, color: colorMap.color, fontWeight: 500 }}
    />
  );
};

const Rspage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "projects" | "experiments" | "formulas"
  >("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [stats, setStats] = useState<RsStatistics>({
    total_projects: 0,
    pending_projects: 0,
    in_progress_projects: 0,
    completed_projects: 0,
    cancelled_projects: 0,
    total_experiments: 0,
    pending_experiments: 0,
    in_progress_experiments: 0,
    completed_experiments: 0,
    total_formulas: 0,
    draft_formulas: 0,
    approved_formulas: 0,
    total_tasks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [serviceStatuses, setServiceStatuses] = useState<{
    [key: string]: boolean;
  }>({
    rs: false,
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
      checkServiceStatus("rs", 8020, (up) =>
        setServiceStatuses((prev) => ({ ...prev, rs: up })),
      );
    };

    checkAllServices();
    const intervalId = setInterval(checkAllServices, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showExperimentModal, setShowExperimentModal] = useState(false);
  const [showExperimentDetailModal, setShowExperimentDetailModal] =
    useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [showFormulaDetailModal, setShowFormulaDetailModal] = useState(false);
  const [showFormulaVersionModal, setShowFormulaVersionModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedExperiment, setSelectedExperiment] =
    useState<Experiment | null>(null);
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [formulaVersions, setFormulaVersions] = useState<FormulaVersion[]>([]);
  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: "",
    code: "",
    description: "",
    project_type: "研发",
    leader: "",
    start_date: new Date().toISOString().split("T")[0],
  });
  const [formulaFormData, setFormulaFormData] = useState<CreateFormulaRequest>({
    project_id: "",
    name: "",
    code: "",
    version: "v1.0",
    category: "",
    description: "",
    ingredients: [],
    process_steps: "",
    status: "草稿",
    effective_date: "",
    expiration_date: "",
  });
  const [formulaVersionFormData, setFormulaVersionFormData] = useState({
    version: "",
    changes: "",
  });
  const [experimentFormData, setExperimentFormData] =
    useState<CreateExperimentRequest>({
      project_id: "",
      name: "",
      code: "",
      experiment_type: "小试",
      phase: "小试",
      objective: "",
      method: "",
      experimenter: "",
    });
  const [editingExperiment, setEditingExperiment] = useState<Experiment | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingExperiment, setIsEditingExperiment] = useState(false);
  const [isEditingFormula, setIsEditingFormula] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [projectErrors, setProjectErrors] = useState<Record<string, string>>(
    {},
  );
  const [experimentErrors, setExperimentErrors] = useState<
    Record<string, string>
  >({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(
    new Set(),
  );
  const [showBatchCreateModal, setShowBatchCreateModal] = useState(false);
  const [batchCreateData, setBatchCreateData] = useState<
    CreateProjectRequest[]
  >([
    {
      name: "",
      code: "",
      description: "",
      project_type: "研发",
      leader: "",
      start_date: new Date().toISOString().split("T")[0],
    },
  ]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<string[][] | null>(null);

  const validateProjectField = (
    field: string,
    value: string,
  ): string | null => {
    switch (field) {
      case "name":
        if (!value.trim()) return "项目名称不能为空";
        if (value.length < 2) return "项目名称至少需要2个字符";
        if (value.length > 100) return "项目名称不能超过100个字符";
        return null;
      case "code":
        if (!value.trim()) return "项目编号不能为空";
        return null;
      case "leader":
        if (!value.trim()) return "负责人不能为空";
        return null;
      case "description":
        if (value.length > 1000) return "描述不能超过1000个字符";
        return null;
      default:
        return null;
    }
  };

  const validateExperimentField = (
    field: string,
    value: string,
  ): string | null => {
    switch (field) {
      case "name":
        if (!value.trim()) return "试验名称不能为空";
        if (value.length < 2) return "试验名称至少需要2个字符";
        if (value.length > 200) return "试验名称不能超过200个字符";
        return null;
      case "code":
        if (!value.trim()) return "试验编号不能为空";
        return null;
      case "project_id":
        if (!value) return "请选择关联项目";
        return null;
      case "experimenter":
        if (value.length > 50) return "试验员姓名不能超过50个字符";
        return null;
      case "objective":
        if (value.length > 2000) return "目标不能超过2000个字符";
        return null;
      default:
        return null;
    }
  };

  const handleProjectFieldChange = (field: string, value: string) => {
    const error = validateProjectField(field, value);
    setProjectErrors((prev) => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  };

  const handleExperimentFieldChange = (field: string, value: string) => {
    const error = validateExperimentField(field, value);
    setExperimentErrors((prev) => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  };

  const handleProjectFieldBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [`project_${field}`]: true }));
    const error = validateProjectField(field, value);
    setProjectErrors((prev) => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  };

  const handleExperimentFieldBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [`experiment_${field}`]: true }));
    const error = validateExperimentField(field, value);
    setExperimentErrors((prev) => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  };

  const validateProjectForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "项目名称不能为空";
    } else if (formData.name.length < 2) {
      errors.name = "项目名称至少需要2个字符";
    } else if (formData.name.length > 100) {
      errors.name = "项目名称不能超过100个字符";
    }

    if (!formData.code.trim()) {
      errors.code = "项目编号不能为空";
    }

    if (!formData.leader.trim()) {
      errors.leader = "负责人不能为空";
    }

    if (formData.description && formData.description.length > 1000) {
      errors.description = "描述不能超过1000个字符";
    }

    setProjectErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateExperimentForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!experimentFormData.name.trim()) {
      errors.name = "试验名称不能为空";
    } else if (experimentFormData.name.length < 2) {
      errors.name = "试验名称至少需要2个字符";
    } else if (experimentFormData.name.length > 200) {
      errors.name = "试验名称不能超过200个字符";
    }

    if (!experimentFormData.code.trim()) {
      errors.code = "试验编号不能为空";
    }

    if (!experimentFormData.project_id) {
      errors.project_id = "请选择关联项目";
    }

    if (
      experimentFormData.experimenter &&
      experimentFormData.experimenter.length > 50
    ) {
      errors.experimenter = "试验员姓名不能超过50个字符";
    }

    setExperimentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    if (isServiceUp("rs")) {
      loadAllData();
    } else {
      setLoading(false);
    }
  }, [serviceStatuses.rs]);

  const loadStatistics = async () => {
    try {
      const response = await rsApi.getStatistics();
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
        loadProjects(),
        loadExperiments(),
        loadFormulas(),
        loadStatistics(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const adaptProject = (p: any): Project => {
    return {
      ...p,
      start_date: p.start_date || p.created_at,
    };
  };

  const adaptExperiment = (e: any): Experiment => {
    return {
      ...e,
      started_at: e.started_at || e.created_at,
    };
  };

  const loadProjects = async () => {
    try {
      const response = await rsApi.listProjects();
      if (response.success && response.data) {
        let projectData = response.data as any;
        let rawProjects: any[] = [];

        if (Array.isArray(projectData)) {
          rawProjects = projectData;
        } else if (
          projectData.projects &&
          Array.isArray(projectData.projects)
        ) {
          rawProjects = projectData.projects;
        }

        const adaptedProjects = rawProjects.map((p) => adaptProject(p));
        setProjects(adaptedProjects);
      } else {
        setProjects([]);
      }
    } catch (err) {
      showNotification("error", "加载项目列表失败");
      console.error("加载项目失败:", err);
      setProjects([]);
    }
  };

  const loadExperiments = async () => {
    try {
      const response = await rsApi.listExperiments();
      if (response.success && response.data) {
        let expData = response.data as any;
        let rawExperiments: any[] = [];

        if (Array.isArray(expData)) {
          rawExperiments = expData;
        } else if (expData.experiments && Array.isArray(expData.experiments)) {
          rawExperiments = expData.experiments;
        }

        const adaptedExperiments = rawExperiments.map((e) =>
          adaptExperiment(e),
        );
        setExperiments(adaptedExperiments);
      } else {
        setExperiments([]);
      }
    } catch (err) {
      console.error("加载试验记录失败:", err);
      setExperiments([]);
    }
  };

  const loadFormulas = async () => {
    try {
      const response = await formulaApi.listFormulas();
      if (response.success && response.data) {
        let formulaData = response.data as any;
        let rawFormulas: any[] = [];

        if (Array.isArray(formulaData)) {
          rawFormulas = formulaData;
        } else if (formulaData.items && Array.isArray(formulaData.items)) {
          rawFormulas = formulaData.items;
        }

        setFormulas(rawFormulas);
      } else {
        setFormulas([]);
      }
    } catch (err) {
      console.error("加载配方失败:", err);
      setFormulas([]);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreate = async () => {
    if (!validateProjectForm()) {
      showNotification("error", "请修正表单错误后重试");
      return;
    }

    try {
      setCreating(true);
      const response = await rsApi.createProject(formData);
      if (response.success) {
        showNotification("success", "项目创建成功");
        setShowModal(false);
        setFormData({
          name: "",
          code: "",
          description: "",
          project_type: "研发",
          leader: "",
          start_date: new Date().toISOString().split("T")[0],
        });
        setProjectErrors({});
        loadProjects();
      } else {
        showNotification("error", response.message || "创建失败");
      }
    } catch (err) {
      showNotification("error", "创建项目失败");
      console.error("创建项目失败:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个项目吗？")) return;

    try {
      const response = await rsApi.deleteProject(id);
      if (response.success) {
        showNotification("success", "项目删除成功");
        loadProjects();
      } else {
        showNotification("error", response.message || "删除失败");
      }
    } catch (err) {
      showNotification("error", "删除项目失败");
      console.error("删除项目失败:", err);
    }
  };

  const handleEdit = async () => {
    if (!validateProjectForm()) {
      showNotification("error", "请修正表单错误后重试");
      return;
    }

    try {
      setCreating(true);
      const response = await rsApi.updateProject(selectedProject!.id, formData);
      if (response.success) {
        showNotification("success", "项目更新成功");
        setShowModal(false);
        setIsEditing(false);
        setFormData({
          name: "",
          code: "",
          description: "",
          project_type: "研发",
          leader: "",
          start_date: new Date().toISOString().split("T")[0],
        });
        setProjectErrors({});
        loadProjects();
      } else {
        showNotification("error", response.message || "更新失败");
      }
    } catch (err) {
      showNotification("error", "更新项目失败");
      console.error("更新项目失败:", err);
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      code: project.code,
      description: project.description,
      project_type: project.project_type,
      leader: project.leader,
      team_members: project.team_members,
      start_date: project.start_date.split("T")[0],
      end_date: project.end_date?.split("T")[0],
      budget: project.budget,
      project_config: project.project_config,
      benefit_target: project.benefit_target,
      risk_level: project.risk_level,
      priority: project.priority,
      tags: project.tags,
      parent_id: project.parent_id,
      workspace_id: project.workspace_id,
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const openDetailModal = (project: Project) => {
    setSelectedProject(project);
    setShowDetailModal(true);
  };

  const openExperimentModal = (project?: Project) => {
    setExperimentFormData({
      project_id: project?.id || "",
      name: "",
      code: "",
      experiment_type: "小试",
      phase: "小试",
      objective: "",
      method: "",
      experimenter: "",
    });
    setEditingExperiment(null);
    setIsEditingExperiment(false);
    setShowExperimentModal(true);
  };

  const openEditExperimentModal = (experiment: Experiment) => {
    setEditingExperiment(experiment);
    setExperimentFormData({
      project_id: experiment.project_id,
      name: experiment.name,
      code: experiment.code,
      formula_id: experiment.formula_id,
      experiment_type: experiment.experiment_type,
      phase: experiment.phase,
      objective: experiment.objective,
      method: experiment.method,
      experimenter: experiment.experimenter,
      batch_number: experiment.batch_number,
      scale: experiment.scale,
      scale_unit: experiment.scale_unit,
    });
    setIsEditingExperiment(true);
    setShowExperimentModal(true);
  };

  const openExperimentDetailModal = (experiment: Experiment) => {
    setSelectedExperiment(experiment);
    setShowExperimentDetailModal(true);
  };

  const handleCreateExperiment = async () => {
    if (!validateExperimentForm()) {
      showNotification("error", "请修正表单错误后重试");
      return;
    }

    try {
      setCreating(true);
      const response = await rsApi.createExperiment(experimentFormData);
      if (response.success) {
        showNotification("success", "试验记录创建成功");
        setShowExperimentModal(false);
        setExperimentErrors({});
        loadExperiments();
      } else {
        showNotification("error", response.message || "创建失败");
      }
    } catch (err) {
      showNotification("error", "创建试验记录失败");
      console.error("创建试验记录失败:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateExperiment = async () => {
    if (!editingExperiment) return;

    if (!validateExperimentForm()) {
      showNotification("error", "请修正表单错误后重试");
      return;
    }

    try {
      setCreating(true);
      const updateData: UpdateExperimentRequest = {
        name: experimentFormData.name,
        status: editingExperiment.status,
        results: editingExperiment.results,
        conclusions: editingExperiment.conclusions,
        completed_at: editingExperiment.completed_at,
        batch_number: experimentFormData.batch_number,
        scale: experimentFormData.scale,
        scale_unit: experimentFormData.scale_unit,
      };
      const response = await rsApi.updateExperiment(
        editingExperiment.id,
        updateData,
      );
      if (response.success) {
        showNotification("success", "试验记录更新成功");
        setShowExperimentModal(false);
        setIsEditingExperiment(false);
        setEditingExperiment(null);
        loadExperiments();
      } else {
        showNotification("error", response.message || "更新失败");
      }
    } catch (err) {
      showNotification("error", "更新试验记录失败");
      console.error("更新试验记录失败:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteExperiment = async (id: string) => {
    if (!confirm("确定要删除这个试验记录吗？")) return;

    try {
      const response = await rsApi.deleteExperiment(id);
      if (response.success) {
        showNotification("success", "试验记录删除成功");
        loadExperiments();
      } else {
        showNotification("error", response.message || "删除失败");
      }
    } catch (err) {
      showNotification("error", "删除试验记录失败");
      console.error("删除试验记录失败:", err);
    }
  };

  const openFormulaModal = (formula?: Formula) => {
    if (formula) {
      setFormulaFormData({
        project_id: formula.project_id,
        name: formula.name,
        code: formula.code,
        version: formula.version,
        category: formula.category,
        description: formula.description,
        ingredients: formula.ingredients || [],
        process_steps: formula.process_steps,
        status: formula.status,
        effective_date: formula.effective_date,
        expiration_date: formula.expiration_date,
      });
      setIsEditingFormula(true);
    } else {
      setFormulaFormData({
        project_id: "",
        name: "",
        code: "",
        version: "v1.0",
        category: "",
        description: "",
        ingredients: [],
        process_steps: "",
        status: "草稿",
        effective_date: "",
        expiration_date: "",
      });
      setIsEditingFormula(false);
    }
    setShowFormulaModal(true);
  };

  const openFormulaDetailModal = async (formula: Formula) => {
    setSelectedFormula(formula);
    setShowFormulaDetailModal(true);
    try {
      const response = await formulaApi.listFormulaVersions(formula.id);
      if (response.success && response.data) {
        const data = response.data as any;
        const versions = Array.isArray(data) ? data : data.versions || [];
        setFormulaVersions(versions);
      } else {
        setFormulaVersions([]);
      }
    } catch (err) {
      console.error("加载配方版本失败:", err);
      setFormulaVersions([]);
    }
  };

  const openFormulaVersionModal = (formula: Formula) => {
    setSelectedFormula(formula);
    setFormulaVersionFormData({ version: "", changes: "" });
    setShowFormulaVersionModal(true);
  };

  const handleCreateFormula = async () => {
    try {
      setCreating(true);
      const response = await formulaApi.createFormula(formulaFormData);
      if (response.success) {
        showNotification("success", "配方创建成功");
        setShowFormulaModal(false);
        loadFormulas();
      } else {
        showNotification("error", response.message || "创建失败");
      }
    } catch (err) {
      showNotification("error", "创建配方失败");
      console.error("创建配方失败:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateFormula = async () => {
    if (!selectedFormula) return;

    try {
      setCreating(true);
      const response = await formulaApi.updateFormula(
        selectedFormula.id,
        formulaFormData,
      );
      if (response.success) {
        showNotification("success", "配方更新成功");
        setShowFormulaModal(false);
        setIsEditingFormula(false);
        loadFormulas();
      } else {
        showNotification("error", response.message || "更新失败");
      }
    } catch (err) {
      showNotification("error", "更新配方失败");
      console.error("更新配方失败:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteFormula = async (id: string) => {
    if (!confirm("确定要删除这个配方吗？")) return;

    try {
      const response = await formulaApi.deleteFormula(id);
      if (response.success) {
        showNotification("success", "配方删除成功");
        loadFormulas();
      } else {
        showNotification("error", response.message || "删除失败");
      }
    } catch (err) {
      showNotification("error", "删除配方失败");
      console.error("删除配方失败:", err);
    }
  };

  const handleCreateFormulaVersion = async () => {
    if (!selectedFormula) return;
    if (!formulaVersionFormData.version.trim() || !formulaVersionFormData.changes.trim()) {
      showNotification("error", "请填写版本号和变更说明");
      return;
    }

    try {
      setCreating(true);
      const response = await formulaApi.createFormulaVersion(
        selectedFormula.id,
        formulaVersionFormData,
      );
      if (response.success) {
        showNotification("success", "配方版本创建成功");
        setShowFormulaVersionModal(false);
        setFormulaVersionFormData({ version: "", changes: "" });
        loadFormulas();
      } else {
        showNotification("error", response.message || "创建失败");
      }
    } catch (err) {
      showNotification("error", "创建配方版本失败");
      console.error("创建配方版本失败:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleApproveFormula = async (id: string) => {
    if (!confirm("确定要批准这个配方吗？")) return;

    try {
      const response = await formulaApi.approveFormula(id);
      if (response.success) {
        showNotification("success", "配方已批准");
        setShowFormulaDetailModal(false);
        loadFormulas();
      } else {
        showNotification("error", response.message || "批准失败");
      }
    } catch (err) {
      showNotification("error", "批准配方失败");
      console.error("批准配方失败:", err);
    }
  };

  const selectAllProjects = () => {
    setSelectedProjectIds(new Set(filteredProjects.map((p) => p.id)));
  };

  const deselectAllProjects = () => {
    setSelectedProjectIds(new Set());
  };

  const toggleProjectSelect = (id: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedProjectIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedProjectIds.size} 个项目吗？`)) return;

    try {
      const deletePromises = Array.from(selectedProjectIds).map((id) =>
        rsApi.deleteProject(id),
      );
      const results = await Promise.allSettled(deletePromises);
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      showNotification("success", `成功删除 ${successCount} 个项目`);
      setSelectedProjectIds(new Set());
      loadProjects();
    } catch (err) {
      showNotification("error", "批量删除失败");
      console.error("批量删除失败:", err);
    }
  };

  const addBatchCreateItem = () => {
    setBatchCreateData((prev) => [
      ...prev,
      {
        name: "",
        code: "",
        description: "",
        project_type: "研发",
        leader: "",
        start_date: new Date().toISOString().split("T")[0],
      },
    ]);
  };

  const removeBatchCreateItem = (index: number) => {
    setBatchCreateData((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBatchCreateItem = (
    index: number,
    field: keyof CreateProjectRequest,
    value: any,
  ) => {
    setBatchCreateData((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleBatchCreate = async () => {
    const validItems = batchCreateData.filter(
      (item) => item.name.trim() && item.code.trim() && item.leader.trim(),
    );
    if (validItems.length === 0) {
      showNotification("error", "请至少填写一个有效的项目");
      return;
    }

    try {
      setCreating(true);
      const promises = validItems.map((item) => rsApi.createProject(item));
      const results = await Promise.allSettled(promises);
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      showNotification("success", `成功创建 ${successCount} 个项目`);
      setShowBatchCreateModal(false);
      setBatchCreateData([
        {
          name: "",
          code: "",
          description: "",
          project_type: "研发",
          leader: "",
          start_date: new Date().toISOString().split("T")[0],
        },
      ]);
      loadProjects();
    } catch (err) {
      showNotification("error", "批量创建失败");
      console.error("批量创建失败:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleExportCurrentTab = () => {
    let data: any[] = [];
    let filename = "";
    if (activeTab === "projects") {
      data = filteredProjects;
      filename = "projects";
    } else if (activeTab === "experiments") {
      data = filteredExperiments;
      filename = "experiments";
    } else {
      data = safeFormulas;
      filename = "formulas";
    }

    if (data.length === 0) {
      showNotification("error", "没有数据可导出");
      return;
    }

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((item) =>
      Object.values(item)
        .map((v) =>
          typeof v === "string" && v.includes(",") ? `"${v}"` : String(v ?? ""),
        )
        .join(","),
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification("success", "导出成功");
  };

  const downloadTemplate = () => {
    const headers = "name,description,status";
    const example = "示例项目,项目描述,进行中";
    const csv = [headers, example].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rs_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      const preview = lines.slice(0, 5).map((l) => l.split(","));
      setImportPreview(preview);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importFile) return;
    showNotification("success", "导入功能开发中");
    setShowImportModal(false);
    setImportFile(null);
    setImportPreview(null);
  };

  const getProjectName = (projectId: string): string => {
    const project = safeProjects.find((p) => p.id === projectId);
    return project?.name || "-";
  };

  const getFormulaApprovalStatusIcon = (status: string) => {
    if (status === "已批准" || status === "approved") {
      return <CheckCircleOutline sx={{ fontSize: 20, color: "success.main" }} />;
    }
    if (status === "已拒绝" || status === "rejected") {
      return <Cancel sx={{ fontSize: 20, color: "error.main" }} />;
    }
    return <HourglassEmpty sx={{ fontSize: 20, color: "warning.main" }} />;
  };

  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeExperiments = Array.isArray(experiments) ? experiments : [];
  const safeFormulas = Array.isArray(formulas) ? formulas : [];

  const filteredProjects = safeProjects.filter(
    (p) =>
      !searchTerm ||
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredExperiments = safeExperiments.filter(
    (e) =>
      !searchTerm ||
      e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.code?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (!isServiceUp("rs") && !loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.50" }}>
        <Card sx={{ p: 4, textAlign: "center", maxWidth: 400 }}>
          <Science sx={{ fontSize: 64, color: "grey.300", mx: "auto", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            科研研发服务未启动
          </Typography>
          <Typography color="text.secondary">
            正在等待服务启动...
          </Typography>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <AppBar position="sticky" color="default" elevation={1} sx={{ bgcolor: "background.paper" }}>
        <Toolbar sx={{ maxWidth: 1280, mx: "auto", width: "100%", px: { xs: 2, md: 3 } }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ flexGrow: 1 }}>
            <IconButton onClick={() => navigate("/dashboard")}>
              <ChevronRight sx={{ transform: "rotate(180deg)" }} />
            </IconButton>
            <Avatar sx={{ background: "linear-gradient(135deg, #f97316, #ef4444)", width: 40, height: 40 }}>
              <Science sx={{ color: "white" }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                科研研发
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Research & Development
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            {activeTab === "projects" && (
              <>
                <ModuleGate module={MODULES.RS} action="write" showDisabled={true}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Add />}
                    onClick={() => setShowModal(true)}
                  >
                    新建项目
                  </Button>
                </ModuleGate>
                <ModuleGate module={MODULES.RS} action="write" showDisabled={true}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<Add />}
                    onClick={() => setShowBatchCreateModal(true)}
                  >
                    批量创建
                  </Button>
                </ModuleGate>
                <ModuleGate module={MODULES.RS} action="read" showDisabled={true}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Download />}
                    onClick={handleExportCurrentTab}
                    disabled={creating}
                  >
                    导出
                  </Button>
                </ModuleGate>
                <ModuleGate module={MODULES.RS} action="write" showDisabled={true}>
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<Upload />}
                    onClick={() => setShowImportModal(true)}
                  >
                    导入
                  </Button>
                </ModuleGate>
              </>
            )}
            {activeTab === "experiments" && (
              <Button
                variant="contained"
                color="warning"
                startIcon={<Biotech />}
                onClick={() => openExperimentModal()}
              >
                新建试验
              </Button>
            )}
            {activeTab === "formulas" && (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Add />}
                onClick={() => openFormulaModal()}
              >
                添加配方
              </Button>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      <Snackbar
        open={!!notification}
        autoHideDuration={3000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={notification?.type === "success" ? "success" : "error"} onClose={() => setNotification(null)}>
          {notification?.message}
        </Alert>
      </Snackbar>

      <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, md: 3 }, py: 4 }}>
        <TextField
          fullWidth
          placeholder="搜索项目..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <Search sx={{ color: "text.secondary", mr: 1 }} />
            ),
          }}
          sx={{ mb: 3, bgcolor: "background.paper" }}
        />

        <Card sx={{ mb: 3, boxShadow: 1 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="fullWidth"
            sx={{ minHeight: 48 }}
          >
            <Tab
              value="projects"
              label="项目列表"
              icon={<Science />}
              iconPosition="start"
              sx={{ minHeight: 48, fontWeight: 500 }}
            />
            <Tab
              value="experiments"
              label="试验记录"
              icon={<Biotech />}
              iconPosition="start"
              sx={{ minHeight: 48, fontWeight: 500 }}
            />
            <Tab
              value="formulas"
              label="配方管理"
              icon={<Code />}
              iconPosition="start"
              sx={{ minHeight: 48, fontWeight: 500 }}
            />
          </Tabs>
        </Card>

        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <MetricCard
              title="项目总数"
              value={stats.total_projects}
              icon={<Science />}
              gradient={["#8B5CF6", "#7C3AED"]}
              subtitle={`进行中: ${stats.in_progress_projects}`}
              trend={stats.in_progress_projects > 0 ? "up" : "neutral"}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <MetricCard
              title="试验总数"
              value={stats.total_experiments}
              icon={<Biotech />}
              gradient={["#6366F1", "#4F46E5"]}
              subtitle={`进行中: ${stats.in_progress_experiments}`}
              trend={stats.in_progress_experiments > 0 ? "up" : "neutral"}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <MetricCard
              title="配方总数"
              value={stats.total_formulas}
              icon={<Code />}
              gradient={["#F59E0B", "#D97706"]}
              subtitle={`已批准: ${stats.approved_formulas}`}
              trend="neutral"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <MetricCard
              title="已完成项目"
              value={stats.completed_projects}
              icon={<CheckCircle />}
              gradient={["#00C897", "#00A878"]}
              trend="up"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <MetricCard
              title="已完成试验"
              value={stats.completed_experiments}
              icon={<CheckCircleOutline />}
              gradient={["#14B8A6", "#0D9488"]}
              trend="up"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <MetricCard
              title="草稿配方"
              value={stats.draft_formulas}
              icon={<AccessTime />}
              gradient={["#EC4899", "#DB2777"]}
              trend="neutral"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} lg={6}>
            <StatsChart
              title="项目状态分布"
              type="pie"
              data={[
                { name: "进行中", value: stats.in_progress_projects, color: "#6366F1" },
                { name: "已完成", value: stats.completed_projects, color: "#00C897" },
                { name: "待开始", value: stats.pending_projects, color: "#F59E0B" },
                { name: "已取消", value: stats.cancelled_projects, color: "#6B7280" },
              ].filter((d) => d.value > 0)}
              dataKey="value"
              nameKey="name"
            />
          </Grid>
          <Grid item xs={12} lg={6}>
            <StatsChart
              title="试验状态分布"
              type="pie"
              data={[
                { name: "进行中", value: stats.in_progress_experiments, color: "#6366F1" },
                { name: "已完成", value: stats.completed_experiments, color: "#00C897" },
                { name: "待开始", value: stats.pending_experiments, color: "#F59E0B" },
              ].filter((d) => d.value > 0)}
              dataKey="value"
              nameKey="name"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            {
              label: activeTab === "projects" ? "项目总数" : activeTab === "experiments" ? "试验总数" : "配方总数",
              value: activeTab === "projects" ? safeProjects.length : activeTab === "experiments" ? safeExperiments.length : safeFormulas.length,
              icon: activeTab === "projects" ? <Science /> : activeTab === "experiments" ? <Biotech /> : <Code />,
              bg: "primary.50",
              color: activeTab === "formulas" ? "secondary.main" : "primary.main",
            },
            {
              label: "进行中",
              value:
                activeTab === "projects"
                  ? safeProjects.filter((p) => p.status === "进行中").length
                  : activeTab === "experiments"
                    ? safeExperiments.filter((e) => e.status === "进行中").length
                    : safeFormulas.filter((f) => f.status === "草稿").length,
              icon: <AccessTime />,
              bg: "warning.50",
              color: "warning.main",
            },
            {
              label: "已完成",
              value:
                activeTab === "projects"
                  ? safeProjects.filter((p) => p.status === "已完成").length
                  : activeTab === "experiments"
                    ? safeExperiments.filter((e) => e.status === "已完成").length
                    : safeFormulas.filter((f) => f.status === "已批准" || f.status === "已发布").length,
              icon: <CheckCircle />,
              bg: "success.50",
              color: "success.main",
            },
          ].map((stat) => (
            <Grid item xs={12} md={4} key={stat.label}>
              <Card sx={{ p: 3, boxShadow: 1, borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color={stat.color}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: stat.bg, color: stat.color, width: 48, height: 48 }}>
                    {stat.icon}
                  </Avatar>
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>

        {loading ? (
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={120} />
            <Skeleton variant="rounded" height={400} />
          </Stack>
        ) : activeTab === "projects" ? (
          <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, borderBottom: 1, borderColor: "divider", bgcolor: "grey.50" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedProjectIds.size === filteredProjects.length && filteredProjects.length > 0}
                    onChange={(e) => (e.target.checked ? selectAllProjects() : deselectAllProjects())}
                  />
                }
                label={selectedProjectIds.size > 0 ? `已选择 ${selectedProjectIds.size} 项` : "全部选择"}
              />
              {selectedProjectIds.size > 0 && (
                <ModuleGate module={MODULES.RS} action="delete" showDisabled={true}>
                  <Button
                    color="error"
                    size="small"
                    startIcon={<Delete />}
                    onClick={handleBatchDelete}
                    disabled={creating}
                  >
                    批量删除
                  </Button>
                </ModuleGate>
              )}
            </Box>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
              <Typography variant="h6" fontWeight="bold">项目列表</Typography>
            </Box>
            {filteredProjects.length === 0 ? (
              <Box sx={{ p: 6, textAlign: "center" }}>
                <Science sx={{ fontSize: 64, color: "grey.300", mx: "auto", mb: 2 }} />
                <Typography color="text.secondary">暂无项目</Typography>
              </Box>
            ) : (
              <Stack divider={<Divider />}>
                {filteredProjects.map((project) => (
                  <Box key={project.id} sx={{ p: 3, "&:hover": { bgcolor: "grey.50" }, transition: "background-color 0.2s" }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                      <Stack direction="row" alignItems="flex-start" spacing={2} sx={{ flex: 1 }}>
                        <Checkbox
                          checked={selectedProjectIds.has(project.id)}
                          onChange={() => toggleProjectSelect(project.id)}
                          sx={{ pt: 0.5 }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                            <Typography variant="h6" fontWeight="bold">
                              {project.name}
                            </Typography>
                            <StatusChip status={project.status} />
                          </Stack>
                          <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                            {project.description}
                          </Typography>
                          <Stack direction="row" alignItems="center" spacing={3}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <AccessTime sx={{ fontSize: 16 }} />
                              <Typography variant="body2" color="text.secondary">
                                开始时间: {new Date(project.start_date).toLocaleDateString("zh-CN")}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" color="primary" onClick={() => openDetailModal(project)}>
                          查看详情
                        </Button>
                        <Button size="small" color="warning" startIcon={<Biotech />} onClick={() => openExperimentModal(project)}>
                          添加试验
                        </Button>
                        <Tooltip title="编辑">
                          <IconButton size="small" onClick={() => openEditModal(project)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <IconButton size="small" color="error" onClick={() => handleDelete(project.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Card>
        ) : activeTab === "experiments" ? (
          <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
              <Typography variant="h6" fontWeight="bold">试验记录</Typography>
            </Box>
            {filteredExperiments.length === 0 ? (
              <Box sx={{ p: 6, textAlign: "center" }}>
                <Biotech sx={{ fontSize: 64, color: "grey.300", mx: "auto", mb: 2 }} />
                <Typography color="text.secondary">暂无试验记录</Typography>
              </Box>
            ) : (
              <Stack divider={<Divider />}>
                {filteredExperiments.map((experiment) => (
                  <Box key={experiment.id} sx={{ p: 3, "&:hover": { bgcolor: "grey.50" }, transition: "background-color 0.2s" }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                          <Typography variant="h6" fontWeight="bold">
                            {experiment.name}
                          </Typography>
                          <StatusChip status={experiment.status} />
                          <StatusChip status={experiment.experiment_type} type="experiment" />
                        </Stack>
                        <Typography color="text.secondary" sx={{ mb: 1 }}>
                          目标: {experiment.objective}
                        </Typography>
                        {experiment.results && (
                          <Typography variant="body2" sx={{ mb: 1.5 }}>
                            结果: {String(experiment.results)}
                          </Typography>
                        )}
                        <Stack direction="row" alignItems="center" spacing={3}>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <AccessTime sx={{ fontSize: 16 }} />
                            <Typography variant="body2" color="text.secondary">
                              开始日期: {new Date(experiment.started_at).toLocaleDateString("zh-CN")}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            试验员: {experiment.experimenter}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            项目: {getProjectName(experiment.project_id)}
                          </Typography>
                        </Stack>
                        {experiment.conclusions && (
                          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "success.50", borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight="medium" color="success.dark">
                              结论: {experiment.conclusions}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" color="primary" startIcon={<Visibility />} onClick={() => openExperimentDetailModal(experiment)}>
                          查看详情
                        </Button>
                        <Tooltip title="编辑">
                          <IconButton size="small" onClick={() => openEditExperimentModal(experiment)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <IconButton size="small" color="error" onClick={() => handleDeleteExperiment(experiment.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Card>
        ) : (
          <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
            <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider" }}>
              <Typography variant="h6" fontWeight="bold">配方列表</Typography>
            </Box>
            {safeFormulas.length === 0 ? (
              <Box sx={{ p: 6, textAlign: "center" }}>
                <Code sx={{ fontSize: 64, color: "grey.300", mx: "auto", mb: 2 }} />
                <Typography color="text.secondary">暂无配方</Typography>
              </Box>
            ) : (
              <Stack divider={<Divider />}>
                {safeFormulas.map((formula) => (
                  <Box key={formula.id} sx={{ p: 3, "&:hover": { bgcolor: "grey.50" }, transition: "background-color 0.2s" }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                      <Stack direction="row" alignItems="flex-start" spacing={2} sx={{ flex: 1 }}>
                        <Avatar sx={{ bgcolor: "secondary.50", color: "secondary.main", width: 48, height: 48 }}>
                          <Code />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                            <Typography variant="h6" fontWeight="bold">
                              {formula.name}
                            </Typography>
                            <StatusChip status={formula.status} />
                            <Chip size="small" label={formula.version} sx={{ bgcolor: "secondary.50", color: "secondary.dark" }} />
                            {formula.approval_status && (
                              <Box sx={{ display: "flex", alignItems: "center" }}>
                                {getFormulaApprovalStatusIcon(formula.approval_status)}
                              </Box>
                            )}
                          </Stack>
                          <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                            {formula.description || "暂无描述"}
                          </Typography>
                          <Stack direction="row" alignItems="center" spacing={3} sx={{ flexWrap: "wrap", gap: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                              编号: {formula.code}
                            </Typography>
                            {formula.category && (
                              <Typography variant="body2" color="text.secondary">
                                分类: {formula.category}
                              </Typography>
                            )}
                            {formula.ingredients && formula.ingredients.length > 0 && (
                              <Typography variant="body2" color="text.secondary">
                                配方成分: {formula.ingredients.length} 种
                              </Typography>
                            )}
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={3} sx={{ mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              项目: {getProjectName(formula.project_id)}
                            </Typography>
                            {formula.effective_date && (
                              <Typography variant="body2" color="text.secondary">
                                生效日期: {new Date(formula.effective_date).toLocaleDateString("zh-CN")}
                              </Typography>
                            )}
                          </Stack>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" color="primary" startIcon={<Visibility />} onClick={() => openFormulaDetailModal(formula)}>
                          详情
                        </Button>
                        <Button size="small" color="secondary" startIcon={<AccountTree />} onClick={() => openFormulaVersionModal(formula)}>
                          版本
                        </Button>
                        <Tooltip title="编辑">
                          <IconButton size="small" onClick={() => openFormulaModal(formula)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <IconButton size="small" color="error" onClick={() => handleDeleteFormula(formula.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Card>
        )}
      </Box>

      {/* Create/Edit Project Modal */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">{isEditing ? "编辑项目" : "新建项目"}</Typography>
            <IconButton onClick={() => { setShowModal(false); setIsEditing(false); }}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="项目名称 *"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                handleProjectFieldChange("name", e.target.value);
              }}
              onBlur={(e) => handleProjectFieldBlur("name", e.target.value)}
              placeholder="请输入项目名称"
              error={!!(projectErrors.name && touched.project_name)}
            />
            <FieldError
              error={projectErrors.name && touched.project_name ? projectErrors.name : undefined}
            />
            <TextField
              fullWidth
              label="项目编号 *"
              value={formData.code}
              onChange={(e) => {
                setFormData({ ...formData, code: e.target.value });
                handleProjectFieldChange("code", e.target.value);
              }}
              onBlur={(e) => handleProjectFieldBlur("code", e.target.value)}
              placeholder="请输入项目编号"
              error={!!(projectErrors.code && touched.project_code)}
            />
            <FieldError
              error={projectErrors.code && touched.project_code ? projectErrors.code : undefined}
            />
            <TextField
              fullWidth
              label="负责人 *"
              value={formData.leader}
              onChange={(e) => {
                setFormData({ ...formData, leader: e.target.value });
                handleProjectFieldChange("leader", e.target.value);
              }}
              onBlur={(e) => handleProjectFieldBlur("leader", e.target.value)}
              placeholder="请输入负责人"
              error={!!(projectErrors.leader && touched.project_leader)}
            />
            <FieldError
              error={projectErrors.leader && touched.project_leader ? projectErrors.leader : undefined}
            />
            <FormControl fullWidth>
              <InputLabel>项目类型</InputLabel>
              <Select
                value={formData.project_type}
                label="项目类型"
                onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
              >
                <MenuItem value="研发">研发</MenuItem>
                <MenuItem value="改进">改进</MenuItem>
                <MenuItem value="测试">测试</MenuItem>
                <MenuItem value="其他">其他</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="date"
              label="开始日期"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="项目描述"
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                handleProjectFieldChange("description", e.target.value);
              }}
              onBlur={(e) => handleProjectFieldBlur("description", e.target.value)}
              placeholder="请输入项目描述"
              multiline
              rows={4}
              error={!!(projectErrors.description && touched.project_description)}
            />
            <FieldError
              error={projectErrors.description && touched.project_description ? projectErrors.description : undefined}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowModal(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={isEditing ? handleEdit : handleCreate}
            disabled={creating}
          >
            {creating ? (isEditing ? "更新中..." : "创建中...") : isEditing ? "更新" : "创建"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Project Modal */}
      <Dialog open={showDetailModal && !!selectedProject} onClose={() => setShowDetailModal(false)} maxWidth="md" fullWidth>
        <DialogContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight="bold">项目详情</Typography>
            <IconButton onClick={() => setShowDetailModal(false)}>
              <Close />
            </IconButton>
          </Stack>

          {selectedProject && (
            <Stack spacing={3}>
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">{selectedProject.name}</Typography>
                  <StatusChip status={selectedProject.status} />
                </Stack>
                <Typography color="text.secondary">{selectedProject.description}</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>项目编号</Typography>
                  <Typography fontWeight="medium" sx={{ fontFamily: "monospace", fontSize: 14 }}>
                    {selectedProject.id}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>开始时间</Typography>
                  <Typography fontWeight="medium">
                    {new Date(selectedProject.start_date).toLocaleDateString("zh-CN")}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>创建时间</Typography>
                  <Typography fontWeight="medium">
                    {new Date(selectedProject.created_at).toLocaleString("zh-CN")}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>更新时间</Typography>
                  <Typography fontWeight="medium">
                    {new Date(selectedProject.updated_at).toLocaleString("zh-CN")}
                  </Typography>
                </Grid>
              </Grid>

              <Divider />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => { setShowDetailModal(false); openEditModal(selectedProject); }}
                >
                  编辑
                </Button>
                <Button variant="outlined" onClick={() => setShowDetailModal(false)}>
                  关闭
                </Button>
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* Experiment Create/Edit Modal */}
      <Dialog open={showExperimentModal} onClose={() => setShowExperimentModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">{isEditingExperiment ? "编辑试验记录" : "新建试验记录"}</Typography>
            <IconButton onClick={() => { setShowExperimentModal(false); setIsEditingExperiment(false); }}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth error={!!(experimentErrors.project_id && touched.experiment_project_id)}>
              <InputLabel>关联项目 *</InputLabel>
              <Select
                value={experimentFormData.project_id}
                label="关联项目 *"
                onChange={(e) => {
                  setExperimentFormData({ ...experimentFormData, project_id: e.target.value });
                  handleExperimentFieldChange("project_id", e.target.value);
                }}
                onBlur={(e) => handleExperimentFieldBlur("project_id", e.target.value)}
                disabled={isEditingExperiment}
              >
                <MenuItem value="">请选择项目</MenuItem>
                {safeProjects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FieldError
              error={experimentErrors.project_id && touched.experiment_project_id ? experimentErrors.project_id : undefined}
            />
            <TextField
              fullWidth
              label="试验名称 *"
              value={experimentFormData.name}
              onChange={(e) => {
                setExperimentFormData({ ...experimentFormData, name: e.target.value });
                handleExperimentFieldChange("name", e.target.value);
              }}
              onBlur={(e) => handleExperimentFieldBlur("name", e.target.value)}
              placeholder="请输入试验名称"
              error={!!(experimentErrors.name && touched.experiment_name)}
            />
            <FieldError
              error={experimentErrors.name && touched.experiment_name ? experimentErrors.name : undefined}
            />
            <TextField
              fullWidth
              label="试验编号 *"
              value={experimentFormData.code}
              onChange={(e) => {
                setExperimentFormData({ ...experimentFormData, code: e.target.value });
                handleExperimentFieldChange("code", e.target.value);
              }}
              onBlur={(e) => handleExperimentFieldBlur("code", e.target.value)}
              placeholder="请输入试验编号"
              error={!!(experimentErrors.code && touched.experiment_code)}
            />
            <FieldError
              error={experimentErrors.code && touched.experiment_code ? experimentErrors.code : undefined}
            />
            <FormControl fullWidth>
              <InputLabel>试验类型</InputLabel>
              <Select
                value={experimentFormData.experiment_type}
                label="试验类型"
                onChange={(e) => setExperimentFormData({ ...experimentFormData, experiment_type: e.target.value })}
              >
                <MenuItem value="小试">小试</MenuItem>
                <MenuItem value="中试">中试</MenuItem>
                <MenuItem value="量产">量产</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>试验阶段</InputLabel>
              <Select
                value={experimentFormData.phase}
                label="试验阶段"
                onChange={(e) => setExperimentFormData({ ...experimentFormData, phase: e.target.value })}
              >
                <MenuItem value="小试">小试</MenuItem>
                <MenuItem value="中试">中试</MenuItem>
                <MenuItem value="量产">量产</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="试验员"
              value={experimentFormData.experimenter}
              onChange={(e) => {
                setExperimentFormData({ ...experimentFormData, experimenter: e.target.value });
                handleExperimentFieldChange("experimenter", e.target.value);
              }}
              onBlur={(e) => handleExperimentFieldBlur("experimenter", e.target.value)}
              placeholder="请输入试验员姓名"
              error={!!(experimentErrors.experimenter && touched.experiment_experimenter)}
            />
            <FieldError
              error={experimentErrors.experimenter && touched.experiment_experimenter ? experimentErrors.experimenter : undefined}
            />
            <TextField
              fullWidth
              label="试验目标"
              value={experimentFormData.objective}
              onChange={(e) => {
                setExperimentFormData({ ...experimentFormData, objective: e.target.value });
                handleExperimentFieldChange("objective", e.target.value);
              }}
              onBlur={(e) => handleExperimentFieldBlur("objective", e.target.value)}
              placeholder="请输入试验目标"
              multiline
              rows={3}
              error={!!(experimentErrors.objective && touched.experiment_objective)}
            />
            <FieldError
              error={experimentErrors.objective && touched.experiment_objective ? experimentErrors.objective : undefined}
            />
            <TextField
              fullWidth
              label="试验方法"
              value={experimentFormData.method}
              onChange={(e) => {
                setExperimentFormData({ ...experimentFormData, method: e.target.value });
                handleExperimentFieldChange("method", e.target.value);
              }}
              onBlur={(e) => handleExperimentFieldBlur("method", e.target.value)}
              placeholder="请输入试验方法"
              multiline
              rows={4}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setShowExperimentModal(false); setIsEditingExperiment(false); }}>取消</Button>
          <Button
            variant="contained"
            onClick={isEditingExperiment ? handleUpdateExperiment : handleCreateExperiment}
            disabled={creating}
          >
            {creating ? (isEditingExperiment ? "更新中..." : "创建中...") : isEditingExperiment ? "更新" : "创建"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Experiment Detail Modal */}
      <Dialog open={showExperimentDetailModal && !!selectedExperiment} onClose={() => setShowExperimentDetailModal(false)} maxWidth="md" fullWidth>
        <DialogContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight="bold">试验记录详情</Typography>
            <IconButton onClick={() => setShowExperimentDetailModal(false)}>
              <Close />
            </IconButton>
          </Stack>

          {selectedExperiment && (
            <Stack spacing={3}>
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">{selectedExperiment.name}</Typography>
                  <Stack direction="row" spacing={1}>
                    <StatusChip status={selectedExperiment.status} />
                    <StatusChip status={selectedExperiment.experiment_type} type="experiment" />
                  </Stack>
                </Stack>
                <Typography color="text.secondary">目标: {selectedExperiment.objective}</Typography>
              </Box>

              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>试验方法</Typography>
                <Typography>{selectedExperiment.method}</Typography>
              </Card>

              {selectedExperiment.results && (
                <Card variant="outlined" sx={{ p: 2, bgcolor: "primary.50" }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary.dark" sx={{ mb: 1 }}>试验结果</Typography>
                  <Typography color="primary.dark">{String(selectedExperiment.results)}</Typography>
                </Card>
              )}

              {selectedExperiment.conclusions && (
                <Card variant="outlined" sx={{ p: 2, bgcolor: "success.50" }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="success.dark" sx={{ mb: 1 }}>试验结论</Typography>
                  <Typography color="success.dark">{selectedExperiment.conclusions}</Typography>
                </Card>
              )}

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>试验编号</Typography>
                  <Typography fontWeight="medium" sx={{ fontFamily: "monospace" }}>{selectedExperiment.code}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>关联项目</Typography>
                  <Typography fontWeight="medium">{getProjectName(selectedExperiment.project_id)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>开始日期</Typography>
                  <Typography fontWeight="medium">
                    {new Date(selectedExperiment.started_at).toLocaleDateString("zh-CN")}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>试验员</Typography>
                  <Typography fontWeight="medium">{selectedExperiment.experimenter}</Typography>
                </Grid>
              </Grid>

              <Divider />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => { setShowExperimentDetailModal(false); openEditExperimentModal(selectedExperiment); }}
                >
                  编辑
                </Button>
                <Button variant="outlined" onClick={() => setShowExperimentDetailModal(false)}>
                  关闭
                </Button>
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* Batch Create Modal */}
      <Dialog open={showBatchCreateModal} onClose={() => setShowBatchCreateModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">批量创建项目</Typography>
            <IconButton onClick={() => {
              setShowBatchCreateModal(false);
              setBatchCreateData([{
                name: "", code: "", description: "", project_type: "研发", leader: "",
                start_date: new Date().toISOString().split("T")[0],
              }]);
            }}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {batchCreateData.map((item, index) => (
              <Card key={index} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography fontWeight="medium">项目 {index + 1}</Typography>
                  {batchCreateData.length > 1 && (
                    <IconButton size="small" color="error" onClick={() => removeBatchCreateItem(index)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="项目名称 *"
                    value={item.name}
                    onChange={(e) => updateBatchCreateItem(index, "name", e.target.value)}
                    placeholder="请输入项目名称"
                  />
                  <TextField
                    fullWidth
                    label="项目编号 *"
                    value={item.code}
                    onChange={(e) => updateBatchCreateItem(index, "code", e.target.value)}
                    placeholder="请输入项目编号"
                  />
                  <TextField
                    fullWidth
                    label="负责人 *"
                    value={item.leader}
                    onChange={(e) => updateBatchCreateItem(index, "leader", e.target.value)}
                    placeholder="请输入负责人"
                  />
                  <FormControl fullWidth>
                    <InputLabel>项目类型</InputLabel>
                    <Select
                      value={item.project_type}
                      label="项目类型"
                      onChange={(e) => updateBatchCreateItem(index, "project_type", e.target.value)}
                    >
                      <MenuItem value="研发">研发</MenuItem>
                      <MenuItem value="改进">改进</MenuItem>
                      <MenuItem value="测试">测试</MenuItem>
                      <MenuItem value="其他">其他</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    type="date"
                    label="开始日期"
                    value={item.start_date}
                    onChange={(e) => updateBatchCreateItem(index, "start_date", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    label="项目描述"
                    value={item.description}
                    onChange={(e) => updateBatchCreateItem(index, "description", e.target.value)}
                    placeholder="请输入项目描述"
                    multiline
                    rows={2}
                  />
                </Stack>
              </Card>
            ))}
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={addBatchCreateItem}
              fullWidth
              sx={{ py: 1.5, borderStyle: "dashed" }}
            >
              添加项目
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowBatchCreateModal(false)}>取消</Button>
          <Button variant="contained" color="success" onClick={handleBatchCreate} disabled={creating}>
            {creating ? "创建中..." : "批量创建"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={showImportModal} onClose={() => setShowImportModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">导入项目</Typography>
            <IconButton onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview(null); }}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="medium">选择 CSV 文件</Typography>
                <Button size="small" startIcon={<Download />} onClick={downloadTemplate}>
                  下载模板
                </Button>
              </Stack>
              <Box
                sx={{
                  border: 2,
                  borderStyle: "dashed",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 3,
                  textAlign: "center",
                  cursor: "pointer",
                  "&:hover": { borderColor: "text.primary" },
                  transition: "border-color 0.2s",
                }}
              >
                <input
                  type="file"
                  accept=".csv"
                  id="rs-file-upload"
                  onChange={handleImportFileChange}
                  style={{ display: "none" }}
                />
                <label htmlFor="rs-file-upload" style={{ cursor: "pointer" }}>
                  <Upload sx={{ fontSize: 40, color: "text.secondary", mb: 1.5 }} />
                  <Typography sx={{ mb: 0.5 }}>点击或拖拽文件到这里</Typography>
                  <Typography variant="body2" color="text.secondary">支持 CSV 格式</Typography>
                </label>
              </Box>
              {importFile && (
                <Card variant="outlined" sx={{ mt: 2, p: 1.5 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Description color="warning" />
                      <Typography variant="body2">{importFile.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({(importFile.size / 1024).toFixed(1)} KB)
                      </Typography>
                    </Stack>
                    <IconButton size="small" onClick={() => { setImportFile(null); setImportPreview(null); }}>
                      <Close fontSize="small" />
                    </IconButton>
                  </Stack>
                </Card>
              )}
            </Box>

            {importPreview && (
              <Box>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1.5 }}>文件预览（前5行）</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableBody>
                      {importPreview.map((row, rowIndex) => (
                        <TableRow key={rowIndex} sx={{ bgcolor: rowIndex === 0 ? "grey.50" : "inherit" }}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex} sx={{ borderBottom: rowIndex === importPreview.length - 1 ? 0 : 1 }}>
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            <Alert severity="warning" variant="outlined">
              <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5 }}>CSV 格式说明</Typography>
              <Stack spacing={0.5}>
                <Typography variant="body2">• <code>name</code>：项目名称（必填）</Typography>
                <Typography variant="body2">• <code>description</code>：项目描述</Typography>
                <Typography variant="body2">• <code>status</code>：状态（立项、进行中、已完成、已终止）</Typography>
              </Stack>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setShowImportModal(false); setImportFile(null); setImportPreview(null); }}>取消</Button>
          <Button variant="contained" color="warning" onClick={handleImport} disabled={creating || !importFile}>
            {creating ? "导入中..." : "导入"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit Formula Modal */}
      <Dialog open={showFormulaModal} onClose={() => setShowFormulaModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">{isEditingFormula ? "编辑配方" : "添加配方"}</Typography>
            <IconButton onClick={() => { setShowFormulaModal(false); setIsEditingFormula(false); }}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="配方名称 *"
                  value={formulaFormData.name}
                  onChange={(e) => setFormulaFormData({ ...formulaFormData, name: e.target.value })}
                  placeholder="请输入配方名称"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="配方编号 *"
                  value={formulaFormData.code}
                  onChange={(e) => setFormulaFormData({ ...formulaFormData, code: e.target.value })}
                  placeholder="请输入配方编号"
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>关联项目 *</InputLabel>
                  <Select
                    value={formulaFormData.project_id}
                    label="关联项目 *"
                    onChange={(e) => setFormulaFormData({ ...formulaFormData, project_id: e.target.value })}
                    disabled={isEditingFormula}
                  >
                    <MenuItem value="">请选择项目</MenuItem>
                    {safeProjects.map((project) => (
                      <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="版本号"
                  value={formulaFormData.version}
                  onChange={(e) => setFormulaFormData({ ...formulaFormData, version: e.target.value })}
                  placeholder="如 v1.0"
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>分类</InputLabel>
                  <Select
                    value={formulaFormData.category}
                    label="分类"
                    onChange={(e) => setFormulaFormData({ ...formulaFormData, category: e.target.value })}
                  >
                    <MenuItem value="">请选择分类</MenuItem>
                    <MenuItem value="食品配方">食品配方</MenuItem>
                    <MenuItem value="药品配方">药品配方</MenuItem>
                    <MenuItem value="化妆品配方">化妆品配方</MenuItem>
                    <MenuItem value="化工配方">化工配方</MenuItem>
                    <MenuItem value="其他">其他</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={formulaFormData.status}
                    label="状态"
                    onChange={(e) => setFormulaFormData({ ...formulaFormData, status: e.target.value })}
                  >
                    <MenuItem value="草稿">草稿</MenuItem>
                    <MenuItem value="待审批">待审批</MenuItem>
                    <MenuItem value="已批准">已批准</MenuItem>
                    <MenuItem value="已发布">已发布</MenuItem>
                    <MenuItem value="已废弃">已废弃</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="生效日期"
                  value={formulaFormData.effective_date}
                  onChange={(e) => setFormulaFormData({ ...formulaFormData, effective_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="失效日期"
                  value={formulaFormData.expiration_date}
                  onChange={(e) => setFormulaFormData({ ...formulaFormData, expiration_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              label="配方描述"
              value={formulaFormData.description}
              onChange={(e) => setFormulaFormData({ ...formulaFormData, description: e.target.value })}
              placeholder="请输入配方描述"
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="工艺流程"
              value={formulaFormData.process_steps}
              onChange={(e) => setFormulaFormData({ ...formulaFormData, process_steps: e.target.value })}
              placeholder="请输入工艺流程步骤"
              multiline
              rows={4}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setShowFormulaModal(false); setIsEditingFormula(false); }}>取消</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={isEditingFormula ? handleUpdateFormula : handleCreateFormula}
            disabled={creating}
          >
            {creating ? (isEditingFormula ? "更新中..." : "创建中...") : isEditingFormula ? "更新" : "创建"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Formula Detail Modal */}
      <Dialog open={showFormulaDetailModal && !!selectedFormula} onClose={() => setShowFormulaDetailModal(false)} maxWidth="md" fullWidth>
        <DialogContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Typography variant="h5" fontWeight="bold">配方详情</Typography>
            <IconButton onClick={() => setShowFormulaDetailModal(false)}>
              <Close />
            </IconButton>
          </Stack>

          {selectedFormula && (
            <Stack spacing={3}>
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">{selectedFormula.name}</Typography>
                  <StatusChip status={selectedFormula.status} />
                </Stack>
                <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap", gap: 1 }}>
                  <Chip size="small" label={selectedFormula.version} sx={{ bgcolor: "secondary.50", color: "secondary.dark" }} />
                  {selectedFormula.category && (
                    <Chip size="small" label={selectedFormula.category} sx={{ bgcolor: "grey.100", color: "text.primary" }} />
                  )}
                  {selectedFormula.approval_status && (
                    <Chip
                      size="small"
                      icon={getFormulaApprovalStatusIcon(selectedFormula.approval_status)}
                      label={selectedFormula.approval_status}
                      sx={{ bgcolor: "grey.100", color: "text.primary" }}
                    />
                  )}
                </Stack>
                <Typography color="text.secondary">{selectedFormula.description || "暂无描述"}</Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>配方编号</Typography>
                  <Typography fontWeight="medium" sx={{ fontFamily: "monospace" }}>{selectedFormula.code}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>关联项目</Typography>
                  <Typography fontWeight="medium">{getProjectName(selectedFormula.project_id)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>生效日期</Typography>
                  <Typography fontWeight="medium">
                    {selectedFormula.effective_date ? new Date(selectedFormula.effective_date).toLocaleDateString("zh-CN") : "-"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>失效日期</Typography>
                  <Typography fontWeight="medium">
                    {selectedFormula.expiration_date ? new Date(selectedFormula.expiration_date).toLocaleDateString("zh-CN") : "-"}
                  </Typography>
                </Grid>
                {selectedFormula.approved_by && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>审批人</Typography>
                    <Typography fontWeight="medium">{selectedFormula.approved_by}</Typography>
                  </Grid>
                )}
                {selectedFormula.approved_at && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>审批时间</Typography>
                    <Typography fontWeight="medium">
                      {new Date(selectedFormula.approved_at).toLocaleString("zh-CN")}
                    </Typography>
                  </Grid>
                )}
              </Grid>

              {selectedFormula.ingredients && selectedFormula.ingredients.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>配方成分</Typography>
                  <Stack spacing={1}>
                    {selectedFormula.ingredients.map((ingredient, idx) => (
                      <Card key={idx} variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Typography fontWeight="medium">{ingredient.name}</Typography>
                          <Typography variant="body2" color="secondary.main">
                            {ingredient.quantity} {ingredient.unit || ""}
                          </Typography>
                        </Stack>
                        {ingredient.purity && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                            纯度: {ingredient.purity}
                          </Typography>
                        )}
                      </Card>
                    ))}
                  </Stack>
                </Box>
              )}

              {selectedFormula.process_steps && (
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>工艺流程</Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography sx={{ whiteSpace: "pre-wrap" }}>{selectedFormula.process_steps}</Typography>
                  </Card>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>版本历史</Typography>
                {formulaVersions.length === 0 ? (
                  <Typography color="text.secondary" sx={{ textAlign: "center", py: 2 }}>暂无版本记录</Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {formulaVersions.map((version) => (
                      <Card key={version.id} variant="outlined" sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                          <Typography fontWeight="medium" color="secondary.dark">{version.version}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(version.created_at).toLocaleDateString("zh-CN")}
                          </Typography>
                        </Stack>
                        <Typography sx={{ mb: 1 }}>{version.changes || "无变更说明"}</Typography>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">创建人: {version.created_by || "-"}</Typography>
                          {version.approved_by && (
                            <Typography variant="body2" color="text.secondary">审批人: {version.approved_by}</Typography>
                          )}
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Box>

              <Divider />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                {selectedFormula.status === "待审批" && (
                  <Button variant="contained" color="success" onClick={() => handleApproveFormula(selectedFormula.id)}>
                    审批通过
                  </Button>
                )}
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => { setShowFormulaDetailModal(false); openFormulaVersionModal(selectedFormula); }}
                >
                  新建版本
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => { setShowFormulaDetailModal(false); openFormulaModal(selectedFormula); }}
                >
                  编辑
                </Button>
                <Button variant="outlined" onClick={() => setShowFormulaDetailModal(false)}>
                  关闭
                </Button>
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* Formula Version Modal */}
      <Dialog open={showFormulaVersionModal} onClose={() => setShowFormulaVersionModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">新建配方版本</Typography>
            <IconButton onClick={() => setShowFormulaVersionModal(false)}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedFormula && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5 }}>配方名称</Typography>
                <Typography color="secondary.dark" fontWeight="medium">{selectedFormula.name}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5 }}>当前版本</Typography>
                <Typography>{selectedFormula.version}</Typography>
              </Box>
              <TextField
                fullWidth
                label="新版本号 *"
                value={formulaVersionFormData.version}
                onChange={(e) => setFormulaVersionFormData({ ...formulaVersionFormData, version: e.target.value })}
                placeholder="如 v2.0"
              />
              <TextField
                fullWidth
                label="变更说明 *"
                value={formulaVersionFormData.changes}
                onChange={(e) => setFormulaVersionFormData({ ...formulaVersionFormData, changes: e.target.value })}
                placeholder="请输入本次变更的详细说明"
                multiline
                rows={4}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowFormulaVersionModal(false)}>取消</Button>
          <Button variant="contained" color="secondary" onClick={handleCreateFormulaVersion} disabled={creating}>
            {creating ? "创建中..." : "创建版本"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Rspage;
