import React, { useEffect, useState, useCallback } from 'react';
import {
  FlaskConical,
  Plus,
  Search,
  Clock,
  ChevronRight,
  FileText,
  Edit,
  Trash2,
  Loader2,
  X,
  CheckCircle,
  Beaker,
  Eye,
  Download,
  Upload,
  FileCode,
  GitBranch,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  rsApi,
  formulaApi,
  Project,
  CreateProjectRequest,
  Experiment,
  CreateExperimentRequest,
  UpdateExperimentRequest,
  Formula,
  CreateFormulaRequest,
  FormulaVersion,
  RsStatistics,
} from '../api/rs';
import { FieldError } from '../components/ValidationError';
import { ModuleGate } from '../components/PermissionGate';
import { MODULES } from '../config/permissions';
import { ColumnDef } from '@tanstack/react-table';
import { MetricCard } from '../components/MetricCard';
import { StatsChart } from '../components/StatsChart';

const Rspage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'projects' | 'experiments' | 'formulas'>('projects');
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
  const [serviceStatuses, setServiceStatuses] = useState<{ [key: string]: boolean }>({
    rs: false,
  });

  // Check if a specific service is up
  const isServiceUp = (serviceName: string): boolean => {
    return serviceStatuses[serviceName] || false;
  };

  // Check service status
  const checkServiceStatus = async (serviceName: string, port: number, setStatus: (up: boolean) => void) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`http://localhost:${port}/health`, {
        signal: controller.signal,
        method: 'GET',
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
      checkServiceStatus('rs', 8020, (up) => setServiceStatuses((prev) => ({ ...prev, rs: up })));
    };

    checkAllServices();
    const intervalId = setInterval(checkAllServices, 10000);

    return () => clearInterval(intervalId);
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showExperimentModal, setShowExperimentModal] = useState(false);
  const [showExperimentDetailModal, setShowExperimentDetailModal] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [showFormulaDetailModal, setShowFormulaDetailModal] = useState(false);
  const [showFormulaVersionModal, setShowFormulaVersionModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [formulaVersions, setFormulaVersions] = useState<FormulaVersion[]>([]);
  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    code: '',
    description: '',
    project_type: '研发',
    leader: '',
    start_date: new Date().toISOString().split('T')[0],
  });
  const [formulaFormData, setFormulaFormData] = useState<CreateFormulaRequest>({
    project_id: '',
    name: '',
    code: '',
    version: 'v1.0',
    category: '',
    description: '',
    ingredients: [],
    process_steps: '',
    status: '草稿',
    effective_date: '',
    expiration_date: '',
  });
  const [formulaVersionFormData, setFormulaVersionFormData] = useState({
    version: '',
    changes: '',
  });
  const [experimentFormData, setExperimentFormData] = useState<CreateExperimentRequest>({
    project_id: '',
    name: '',
    code: '',
    experiment_type: '小试',
    phase: '小试',
    objective: '',
    method: '',
    experimenter: '',
  });
  const [editingExperiment, setEditingExperiment] = useState<Experiment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingExperiment, setIsEditingExperiment] = useState(false);
  const [isEditingFormula, setIsEditingFormula] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [projectErrors, setProjectErrors] = useState<Record<string, string>>({});
  const [experimentErrors, setExperimentErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [showBatchCreateModal, setShowBatchCreateModal] = useState(false);
  const [batchCreateData, setBatchCreateData] = useState<CreateProjectRequest[]>([
    {
      name: '',
      code: '',
      description: '',
      project_type: '研发',
      leader: '',
      start_date: new Date().toISOString().split('T')[0],
    },
  ]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<string[][] | null>(null);

  const validateProjectField = (field: string, value: string): string | null => {
    switch (field) {
      case 'name':
        if (!value.trim()) return '项目名称不能为空';
        if (value.length < 2) return '项目名称至少需要2个字符';
        if (value.length > 100) return '项目名称不能超过100个字符';
        return null;
      case 'code':
        if (!value.trim()) return '项目编号不能为空';
        return null;
      case 'leader':
        if (!value.trim()) return '负责人不能为空';
        return null;
      case 'description':
        if (value.length > 1000) return '描述不能超过1000个字符';
        return null;
      default:
        return null;
    }
  };

  const validateExperimentField = (field: string, value: string): string | null => {
    switch (field) {
      case 'name':
        if (!value.trim()) return '试验名称不能为空';
        if (value.length < 2) return '试验名称至少需要2个字符';
        if (value.length > 200) return '试验名称不能超过200个字符';
        return null;
      case 'code':
        if (!value.trim()) return '试验编号不能为空';
        return null;
      case 'project_id':
        if (!value) return '请选择关联项目';
        return null;
      case 'experimenter':
        if (value.length > 50) return '试验员姓名不能超过50个字符';
        return null;
      case 'objective':
        if (value.length > 2000) return '目标不能超过2000个字符';
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
      errors.name = '项目名称不能为空';
    } else if (formData.name.length < 2) {
      errors.name = '项目名称至少需要2个字符';
    } else if (formData.name.length > 100) {
      errors.name = '项目名称不能超过100个字符';
    }

    if (!formData.code.trim()) {
      errors.code = '项目编号不能为空';
    }

    if (!formData.leader.trim()) {
      errors.leader = '负责人不能为空';
    }

    if (formData.description && formData.description.length > 1000) {
      errors.description = '描述不能超过1000个字符';
    }

    setProjectErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateExperimentForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!experimentFormData.name.trim()) {
      errors.name = '试验名称不能为空';
    } else if (experimentFormData.name.length < 2) {
      errors.name = '试验名称至少需要2个字符';
    } else if (experimentFormData.name.length > 200) {
      errors.name = '试验名称不能超过200个字符';
    }

    if (!experimentFormData.code.trim()) {
      errors.code = '试验编号不能为空';
    }

    if (!experimentFormData.project_id) {
      errors.project_id = '请选择关联项目';
    }

    if (experimentFormData.experimenter && experimentFormData.experimenter.length > 50) {
      errors.experimenter = '试验员姓名不能超过50个字符';
    }

    setExperimentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    if (isServiceUp('rs')) {
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
      console.error('加载统计数据失败:', err);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadProjects(),
        loadExperiments(),
        loadFormulas(),
        loadStatistics()
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 数据适配函数：处理后端返回的数据字段与前端期望不匹配的问题
  const adaptProject = (p: any): Project => {
    return {
      ...p,
      // 确保 start_date 存在，没有时使用 created_at
      start_date: p.start_date || p.created_at,
    };
  };

  const adaptExperiment = (e: any): Experiment => {
    return {
      ...e,
      // 确保 started_at 存在
      started_at: e.started_at || e.created_at,
    };
  };

  const loadProjects = async () => {
    try {
      const response = await rsApi.listProjects();
      if (response.success && response.data) {
        // 检查数据格式，兼容不同的响应结构
        let projectData = response.data as any;
        let rawProjects: any[] = [];

        if (Array.isArray(projectData)) {
          rawProjects = projectData;
        } else if (projectData.projects && Array.isArray(projectData.projects)) {
          rawProjects = projectData.projects;
        }

        // 适配项目数据
        const adaptedProjects = rawProjects.map((p) => adaptProject(p));
        setProjects(adaptedProjects);
      } else {
        setProjects([]);
      }
    } catch (err) {
      showNotification('error', '加载项目列表失败');
      console.error('加载项目失败:', err);
      setProjects([]);
    }
  };

  const loadExperiments = async () => {
    try {
      const response = await rsApi.listExperiments();
      if (response.success && response.data) {
        // 检查数据格式，兼容不同的响应结构
        let expData = response.data as any;
        let rawExperiments: any[] = [];

        if (Array.isArray(expData)) {
          rawExperiments = expData;
        } else if (expData.experiments && Array.isArray(expData.experiments)) {
          rawExperiments = expData.experiments;
        }

        // 适配试验数据
        const adaptedExperiments = rawExperiments.map((e) => adaptExperiment(e));
        setExperiments(adaptedExperiments);
      } else {
        setExperiments([]);
      }
    } catch (err) {
      console.error('加载试验记录失败:', err);
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
      console.error('加载配方失败:', err);
      setFormulas([]);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreate = async () => {
    if (!validateProjectForm()) {
      showNotification('error', '请修正表单错误后重试');
      return;
    }

    try {
      setCreating(true);
      const response = await rsApi.createProject(formData);
      if (response.success) {
        showNotification('success', '项目创建成功');
        setShowModal(false);
        setFormData({
          name: '',
          code: '',
          description: '',
          project_type: '研发',
          leader: '',
          start_date: new Date().toISOString().split('T')[0],
        });
        setProjectErrors({});
        loadProjects();
      } else {
        showNotification('error', response.message || '创建失败');
      }
    } catch (err) {
      showNotification('error', '创建项目失败');
      console.error('创建项目失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个项目吗？')) return;

    try {
      const response = await rsApi.deleteProject(id);
      if (response.success) {
        showNotification('success', '项目删除成功');
        loadProjects();
      } else {
        showNotification('error', response.message || '删除失败');
      }
    } catch (err) {
      showNotification('error', '删除项目失败');
      console.error('删除项目失败:', err);
    }
  };

  const handleEdit = async () => {
    if (!validateProjectForm()) {
      showNotification('error', '请修正表单错误后重试');
      return;
    }

    try {
      setCreating(true);
      const response = await rsApi.updateProject(selectedProject!.id, formData);
      if (response.success) {
        showNotification('success', '项目更新成功');
        setShowModal(false);
        setIsEditing(false);
        setFormData({
          name: '',
          code: '',
          description: '',
          project_type: '研发',
          leader: '',
          start_date: new Date().toISOString().split('T')[0],
        });
        setProjectErrors({});
        loadProjects();
      } else {
        showNotification('error', response.message || '更新失败');
      }
    } catch (err) {
      showNotification('error', '更新项目失败');
      console.error('更新项目失败:', err);
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
      start_date: project.start_date.split('T')[0],
      end_date: project.end_date?.split('T')[0],
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
      project_id: project?.id || '',
      name: '',
      code: '',
      experiment_type: '小试',
      phase: '小试',
      objective: '',
      method: '',
      experimenter: '',
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
      showNotification('error', '请修正表单错误后重试');
      return;
    }

    try {
      setCreating(true);
      const response = await rsApi.createExperiment(experimentFormData);
      if (response.success) {
        showNotification('success', '试验记录创建成功');
        setShowExperimentModal(false);
        setExperimentErrors({});
        loadExperiments();
      } else {
        showNotification('error', response.message || '创建失败');
      }
    } catch (err) {
      showNotification('error', '创建试验记录失败');
      console.error('创建试验记录失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateExperiment = async () => {
    if (!editingExperiment) return;

    if (!validateExperimentForm()) {
      showNotification('error', '请修正表单错误后重试');
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
      const response = await rsApi.updateExperiment(editingExperiment.id, updateData);
      if (response.success) {
        showNotification('success', '试验记录更新成功');
        setShowExperimentModal(false);
        setIsEditingExperiment(false);
        setExperimentErrors({});
        loadExperiments();
      } else {
        showNotification('error', response.message || '更新失败');
      }
    } catch (err) {
      showNotification('error', '更新试验记录失败');
      console.error('更新试验记录失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteExperiment = async (id: string) => {
    if (!confirm('确定要删除这个试验记录吗？')) return;

    try {
      const response = await rsApi.deleteExperiment(id);
      if (response.success) {
        showNotification('success', '试验记录删除成功');
        loadExperiments();
      } else {
        showNotification('error', response.message || '删除失败');
      }
    } catch (err) {
      showNotification('error', '删除试验记录失败');
      console.error('删除试验记录失败:', err);
    }
  };

  // 确保 projects 和 experiments 是数组，避免 filter 错误
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeExperiments = Array.isArray(experiments) ? experiments : [];
  const safeFormulas = Array.isArray(formulas) ? formulas : [];

  // 配方管理相关函数
  const openFormulaModal = (formula?: Formula) => {
    if (formula) {
      setSelectedFormula(formula);
      setFormulaFormData({
        project_id: formula.project_id,
        name: formula.name,
        code: formula.code,
        version: formula.version,
        category: formula.category || '',
        description: formula.description || '',
        ingredients: formula.ingredients || [],
        process_steps: formula.process_steps || '',
        status: formula.status,
        effective_date: formula.effective_date || '',
        expiration_date: formula.expiration_date || '',
      });
      setIsEditingFormula(true);
    } else {
      setSelectedFormula(null);
      setFormulaFormData({
        project_id: '',
        name: '',
        code: '',
        version: 'v1.0',
        category: '',
        description: '',
        ingredients: [],
        process_steps: '',
        status: '草稿',
        effective_date: '',
        expiration_date: '',
      });
      setIsEditingFormula(false);
    }
    setShowFormulaModal(true);
  };

  const openFormulaDetailModal = async (formula: Formula) => {
    setSelectedFormula(formula);
    await loadFormulaVersions(formula.id);
    setShowFormulaDetailModal(true);
  };

  const loadFormulaVersions = async (formulaId: string) => {
    try {
      const response = await formulaApi.listVersions(formulaId);
      if (response.success && response.data) {
        setFormulaVersions(Array.isArray(response.data) ? response.data : []);
      } else {
        setFormulaVersions([]);
      }
    } catch (err) {
      console.error('加载配方版本失败:', err);
      setFormulaVersions([]);
    }
  };

  const handleCreateFormula = async () => {
    if (!formulaFormData.name.trim() || !formulaFormData.code.trim() || !formulaFormData.project_id) {
      showNotification('error', '请填写必填信息（配方名称、配方编号、关联项目）');
      return;
    }

    try {
      setCreating(true);
      const response = await formulaApi.createFormula(formulaFormData);
      if (response.success) {
        showNotification('success', '配方创建成功');
        setShowFormulaModal(false);
        loadFormulas();
      } else {
        showNotification('error', response.message || '创建失败');
      }
    } catch (err) {
      showNotification('error', '创建配方失败');
      console.error('创建配方失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateFormula = async () => {
    if (!selectedFormula) return;

    if (!formulaFormData.name.trim() || !formulaFormData.code.trim()) {
      showNotification('error', '请填写必填信息（配方名称、配方编号）');
      return;
    }

    try {
      setCreating(true);
      const response = await formulaApi.updateFormula(selectedFormula.id, formulaFormData);
      if (response.success) {
        showNotification('success', '配方更新成功');
        setShowFormulaModal(false);
        loadFormulas();
      } else {
        showNotification('error', response.message || '更新失败');
      }
    } catch (err) {
      showNotification('error', '更新配方失败');
      console.error('更新配方失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteFormula = async (id: string) => {
    if (!confirm('确定要删除这个配方吗？')) return;

    try {
      const response = await formulaApi.deleteFormula(id);
      if (response.success) {
        showNotification('success', '配方删除成功');
        loadFormulas();
      } else {
        showNotification('error', response.message || '删除失败');
      }
    } catch (err) {
      showNotification('error', '删除配方失败');
      console.error('删除配方失败:', err);
    }
  };

  const openFormulaVersionModal = (formula: Formula) => {
    setSelectedFormula(formula);
    setFormulaVersionFormData({
      version: '',
      changes: '',
    });
    setShowFormulaVersionModal(true);
  };

  const handleCreateFormulaVersion = async () => {
    if (!selectedFormula || !formulaVersionFormData.version.trim() || !formulaVersionFormData.changes.trim()) {
      showNotification('error', '请填写版本号和变更说明');
      return;
    }

    try {
      setCreating(true);
      const response = await formulaApi.createVersion(selectedFormula.id, formulaVersionFormData);
      if (response.success) {
        showNotification('success', '配方版本创建成功');
        setShowFormulaVersionModal(false);
        loadFormulaVersions(selectedFormula.id);
        loadFormulas();
      } else {
        showNotification('error', response.message || '创建失败');
      }
    } catch (err) {
      showNotification('error', '创建配方版本失败');
      console.error('创建配方版本失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleApproveFormula = async (id: string) => {
    try {
      const response = await formulaApi.approveFormula(id);
      if (response.success) {
        showNotification('success', '配方审批通过');
        loadFormulas();
        setShowFormulaDetailModal(false);
      } else {
        showNotification('error', response.message || '审批失败');
      }
    } catch (err) {
      showNotification('error', '审批配方失败');
      console.error('审批配方失败:', err);
    }
  };

  const getFormulaStatusColor = (status: string) => {
    switch (status) {
      case '草稿':
        return 'bg-gray-100 text-gray-700';
      case '待审批':
        return 'bg-yellow-100 text-yellow-700';
      case '已批准':
        return 'bg-green-100 text-green-700';
      case '已拒绝':
        return 'bg-red-100 text-red-700';
      case '已发布':
        return 'bg-blue-100 text-blue-700';
      case '已废弃':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getFormulaApprovalStatusIcon = (status: string) => {
    switch (status) {
      case '已批准':
        return <CheckCircle2 className='w-5 h-5 text-green-600' />;
      case '已拒绝':
        return <XCircle className='w-5 h-5 text-red-600' />;
      case '待审批':
        return <Clock className='w-5 h-5 text-yellow-600' />;
      default:
        return <Clock className='w-5 h-5 text-gray-400' />;
    }
  };

  const filteredProjects = safeProjects.filter(
    (p) =>
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExperiments = safeExperiments.filter(
    (e) =>
      (e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.objective || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.experimenter || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 批量操作相关
  const toggleProjectSelect = useCallback((id: string) => {
    setSelectedProjectIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAllProjects = useCallback(() => {
    setSelectedProjectIds(new Set(filteredProjects.map((p) => p.id)));
  }, [filteredProjects]);

  const deselectAllProjects = useCallback(() => {
    setSelectedProjectIds(new Set());
  }, []);

  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除 ${selectedProjectIds.size} 个项目吗？`)) return;

    try {
      setCreating(true);
      const response = await rsApi.batchDeleteProjects({
        ids: Array.from(selectedProjectIds),
      });

      if (response.success) {
        const result = response.data!;
        showNotification('success', `批量删除完成：成功 ${result.success} 个，失败 ${result.failed} 个`);
        deselectAllProjects();
        loadProjects();
      } else {
        showNotification('error', response.message || '批量删除失败');
      }
    } catch (err) {
      showNotification('error', '批量删除失败');
      console.error('批量删除失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const addBatchCreateItem = () => {
    setBatchCreateData((prev) => [
      ...prev,
      {
        name: '',
        code: '',
        description: '',
        project_type: '研发',
        leader: '',
        start_date: new Date().toISOString().split('T')[0],
      },
    ]);
  };

  const removeBatchCreateItem = (index: number) => {
    setBatchCreateData((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBatchCreateItem = (index: number, field: keyof CreateProjectRequest, value: string) => {
    setBatchCreateData((prev) => {
      const newData = [...prev];
      newData[index] = { ...newData[index], [field]: value };
      return newData;
    });
  };

  const handleBatchCreate = async () => {
    const validProjects = batchCreateData.filter(
      (item) => item.name.trim() !== '' && item.code.trim() !== '' && item.leader.trim() !== ''
    );
    if (validProjects.length === 0) {
      showNotification('error', '请至少填写一个项目的名称、编号和负责人');
      return;
    }

    try {
      setCreating(true);
      const response = await rsApi.batchCreateProjects({ projects: validProjects });

      if (response.success) {
        const result = response.data!;
        showNotification('success', `批量创建完成：成功 ${result.success} 个，失败 ${result.failed} 个`);
        setShowBatchCreateModal(false);
        setBatchCreateData([
          {
            name: '',
            code: '',
            description: '',
            project_type: '研发',
            leader: '',
            start_date: new Date().toISOString().split('T')[0],
          },
        ]);
        loadProjects();
      } else {
        showNotification('error', response.message || '批量创建失败');
      }
    } catch (err) {
      showNotification('error', '批量创建失败');
      console.error('批量创建失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const _handleExport = async () => {
    try {
      setCreating(true);
      const blob = await rsApi.exportProjects();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projects_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showNotification('success', '导出成功');
    } catch (err) {
      showNotification('error', '导出失败');
      console.error('导出失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImportFile(file);

      // 预览 CSV 文件
      try {
        const content = await file.text();
        const lines = content.split('\n').slice(0, 6); // 只预览前5行
        const preview = lines.map((line) => line.split(','));
        setImportPreview(preview);
      } catch {
        setImportPreview(null);
      }
    }
  };

  const downloadTemplate = () => {
    const headers = ['name', 'code', 'leader', 'project_type', 'description', 'status'];
    const sampleRow = ['项目1', 'PRJ001', '张三', '研发', '项目描述', '立项'];
    const content = [headers, sampleRow].map((row) => row.join(',')).join('\n');

    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects_template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importFile) {
      showNotification('error', '请选择要导入的文件');
      return;
    }

    try {
      setCreating(true);
      const response = await rsApi.importProjects(importFile);

      if (response.success) {
        const result = response.data!;
        let message = `导入完成：成功 ${result.success} 个`;
        if (result.failed > 0) {
          message += `，失败 ${result.failed} 个`;
          if (result.errors && result.errors.length > 0) {
            message += ` - ${result.errors.slice(0, 2).join('; ')}`;
          }
        }
        showNotification('success', message);
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview(null);
        loadProjects();
      } else {
        showNotification('error', response.message || '导入失败');
      }
    } catch (err) {
      showNotification('error', '导入失败');
      console.error('导入失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const getProjectName = (projectId: string) => {
    const project = safeProjects.find((p) => p.id === projectId);
    return project ? project.name : '未知项目';
  };

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status) {
      case '进行中':
        return 'bg-blue-100 text-blue-700';
      case '已完成':
        return 'bg-green-100 text-green-700';
      case '已终止':
        return 'bg-red-100 text-red-700';
      case '待开始':
        return 'bg-gray-100 text-gray-700';
      case '待测试':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getExperimentTypeColor = (type: string) => {
    switch (type) {
      case '小试':
        return 'bg-purple-100 text-purple-700';
      case '中试':
        return 'bg-blue-100 text-blue-700';
      case '量产':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      showNotification('error', '没有数据可导出');
      return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map((row) => headers.map((h) => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('success', '导出成功');
  };

  const handleExportCurrentTab = () => {
    const data = activeTab === 'projects' ? safeProjects : activeTab === 'experiments' ? safeExperiments : safeFormulas;
    exportToCSV(data, `rs-${activeTab}`);
  };

  const projectColumns: ColumnDef<Project>[] = [
    { accessorKey: 'code', header: '项目编号' },
    { accessorKey: 'name', header: '项目名称' },
    { accessorKey: 'leader', header: '负责人' },
    { accessorKey: 'project_type', header: '项目类型' },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
    },
    { accessorKey: 'description', header: '描述' },
    {
      accessorKey: 'start_date',
      header: '开始时间',
      cell: ({ row }) => <span>{new Date(row.original.start_date).toLocaleDateString('zh-CN')}</span>,
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <button
            onClick={() => openDetailModal(row.original)}
            className='px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg'
          >
            详情
          </button>
          <button
            onClick={() => openEditModal(row.original)}
            className='p-2 text-slate-500 hover:bg-slate-100 rounded-lg'
          >
            <Edit className='w-4 h-4' />
          </button>
          <button onClick={() => handleDelete(row.original.id)} className='p-2 text-red-500 hover:bg-red-50 rounded-lg'>
            <Trash2 className='w-4 h-4' />
          </button>
        </div>
      ),
    },
  ];

  const experimentColumns: ColumnDef<Experiment>[] = [
    { accessorKey: 'code', header: '试验编号' },
    { accessorKey: 'name', header: '试验名称' },
    { accessorKey: 'phase', header: '阶段' },
    {
      accessorKey: 'experiment_type',
      header: '类型',
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getExperimentTypeColor(row.original.experiment_type)}`}
        >
          {row.original.experiment_type}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
    },
    { accessorKey: 'experimenter', header: '试验员' },
    {
      accessorKey: 'started_at',
      header: '开始日期',
      cell: ({ row }) => <span>{new Date(row.original.started_at).toLocaleDateString('zh-CN')}</span>,
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <button
            onClick={() => openExperimentDetailModal(row.original)}
            className='px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg'
          >
            详情
          </button>
          <button
            onClick={() => openEditExperimentModal(row.original)}
            className='p-2 text-slate-500 hover:bg-slate-100 rounded-lg'
          >
            <Edit className='w-4 h-4' />
          </button>
          <button
            onClick={() => handleDeleteExperiment(row.original.id)}
            className='p-2 text-red-500 hover:bg-red-50 rounded-lg'
          >
            <Trash2 className='w-4 h-4' />
          </button>
        </div>
      ),
    },
  ];

  const _formulaColumns: ColumnDef<Formula>[] = [
    { accessorKey: 'name', header: '配方名称' },
    { accessorKey: 'code', header: '编号' },
    { accessorKey: 'version', header: '版本' },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFormulaStatusColor(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
    },
    { accessorKey: 'category', header: '分类' },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <button
            onClick={() => openFormulaDetailModal(row.original)}
            className='px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg'
          >
            详情
          </button>
          <button
            onClick={() => openFormulaModal(row.original)}
            className='p-2 text-slate-500 hover:bg-slate-100 rounded-lg'
          >
            <Edit className='w-4 h-4' />
          </button>
          <button
            onClick={() => handleDeleteFormula(row.original.id)}
            className='p-2 text-red-500 hover:bg-red-50 rounded-lg'
          >
            <Trash2 className='w-4 h-4' />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100'>
        <div className='text-center'>
          <Loader2 className='w-12 h-12 text-blue-600 animate-spin mx-auto mb-4' />
          <p className='text-slate-600'>加载中...</p>
        </div>
      </div>
    );
  }

  if (!isServiceUp('rs')) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100'>
        <div className='text-center max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg'>
          <div className='w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6'>
            <FlaskConical className='w-8 h-8 text-orange-600' />
          </div>
          <h2 className='text-2xl font-bold text-slate-900 mb-4'>科研研发服务未启动</h2>
          <p className='text-slate-600 mb-6'>RS服务正在启动中，请稍后刷新页面，或者联系管理员启动服务。</p>
          <button
            onClick={() => navigate('/dashboard')}
            className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100'>
      {/* Header */}
      <header className='bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center h-16'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={() => navigate('/dashboard')}
                className='p-2 text-slate-500 hover:bg-slate-100 rounded-lg'
              >
                <ChevronRight className='w-5 h-5 rotate-180' />
              </button>
              <div className='flex items-center space-x-3'>
                <div className='w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center'>
                  <FlaskConical className='w-6 h-6 text-white' />
                </div>
                <div>
                  <h1 className='text-xl font-bold text-slate-900'>科研研发</h1>
                  <p className='text-xs text-slate-500'>Research & Development</p>
                </div>
              </div>
            </div>
            <div className='flex items-center space-x-4'>
              {activeTab === 'projects' && (
                <>
                  <ModuleGate module={MODULES.RS} action='write' showDisabled={true}>
                    <button
                      onClick={() => setShowModal(true)}
                      className='flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                    >
                      <Plus className='w-4 h-4' />
                      <span>新建项目</span>
                    </button>
                  </ModuleGate>
                  <ModuleGate module={MODULES.RS} action='write' showDisabled={true}>
                    <button
                      onClick={() => setShowBatchCreateModal(true)}
                      className='flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors'
                    >
                      <Plus className='w-4 h-4' />
                      <span>批量创建</span>
                    </button>
                  </ModuleGate>
                  <ModuleGate module={MODULES.RS} action='read' showDisabled={true}>
                    <button
                      onClick={handleExportCurrentTab}
                      disabled={creating}
                      className='flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50'
                    >
                      <Download className='w-4 h-4' />
                      <span>导出</span>
                    </button>
                  </ModuleGate>
                  <ModuleGate module={MODULES.RS} action='write' showDisabled={true}>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className='flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors'
                    >
                      <Upload className='w-4 h-4' />
                      <span>导入</span>
                    </button>
                  </ModuleGate>
                </>
              )}
              {(activeTab === 'projects') === false && (
                <button
                  onClick={() => setShowModal(true)}
                  className='flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                >
                  <Plus className='w-4 h-4' />
                  <span>新建项目</span>
                </button>
              )}
              {activeTab === 'experiments' && (
                <button
                  onClick={() => openExperimentModal()}
                  className='flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors'
                >
                  <Beaker className='w-4 h-4' />
                  <span>新建试验</span>
                </button>
              )}
              {activeTab === 'formulas' && (
                <>
                  <button
                    onClick={() => openFormulaModal()}
                    className='flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'
                  >
                    <Plus className='w-4 h-4' />
                    <span>添加配方</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          <div className='flex items-center space-x-2'>
            {notification.type === 'success' && <CheckCircle className='w-5 h-5' />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Search Bar */}
        <div className='mb-6'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400' />
            <input
              type='text'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder='搜索项目...'
              className='w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
          </div>
        </div>

        {/* Tabs */}
        <div className='mb-6 bg-white rounded-lg shadow-sm p-1 flex space-x-1'>
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'projects' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className='flex items-center justify-center space-x-2'>
              <FlaskConical className='w-5 h-5' />
              <span>项目列表</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('experiments')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'experiments' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className='flex items-center justify-center space-x-2'>
              <Beaker className='w-5 h-5' />
              <span>试验记录</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('formulas')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'formulas' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className='flex items-center justify-center space-x-2'>
              <FileCode className='w-5 h-5' />
              <span>配方管理</span>
            </div>
          </button>
        </div>

        {/* 主要统计卡片 */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8'>
          <MetricCard
            title='项目总数'
            value={stats.total_projects}
            icon={<FlaskConical className='w-6 h-6' />}
            gradient={['#8B5CF6', '#7C3AED']}
            subtitle={`进行中: ${stats.in_progress_projects}`}
            trend={stats.in_progress_projects > 0 ? 'up' : 'neutral'}
          />
          <MetricCard
            title='试验总数'
            value={stats.total_experiments}
            icon={<Beaker className='w-6 h-6' />}
            gradient={['#6366F1', '#4F46E5']}
            subtitle={`进行中: ${stats.in_progress_experiments}`}
            trend={stats.in_progress_experiments > 0 ? 'up' : 'neutral'}
          />
          <MetricCard
            title='配方总数'
            value={stats.total_formulas}
            icon={<FileCode className='w-6 h-6' />}
            gradient={['#F59E0B', '#D97706']}
            subtitle={`已批准: ${stats.approved_formulas}`}
            trend='neutral'
          />
          <MetricCard
            title='已完成项目'
            value={stats.completed_projects}
            icon={<CheckCircle className='w-6 h-6' />}
            gradient={['#00C897', '#00A878']}
            trend='up'
          />
          <MetricCard
            title='已完成试验'
            value={stats.completed_experiments}
            icon={<CheckCircle2 className='w-6 h-6' />}
            gradient={['#14B8A6', '#0D9488']}
            trend='up'
          />
          <MetricCard
            title='草稿配方'
            value={stats.draft_formulas}
            icon={<Clock className='w-6 h-6' />}
            gradient={['#EC4899', '#DB2777']}
            trend='neutral'
          />
        </div>

        {/* 图表区域 */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
          <StatsChart
            title='项目状态分布'
            type='pie'
            data={[
              { name: '进行中', value: stats.in_progress_projects, color: '#6366F1' },
              { name: '已完成', value: stats.completed_projects, color: '#00C897' },
              { name: '待开始', value: stats.pending_projects, color: '#F59E0B' },
              { name: '已取消', value: stats.cancelled_projects, color: '#6B7280' },
            ].filter(d => d.value > 0)}
            dataKey='value'
            nameKey='name'
          />
          <StatsChart
            title='试验状态分布'
            type='pie'
            data={[
              { name: '进行中', value: stats.in_progress_experiments, color: '#6366F1' },
              { name: '已完成', value: stats.completed_experiments, color: '#00C897' },
              { name: '待开始', value: stats.pending_experiments, color: '#F59E0B' },
            ].filter(d => d.value > 0)}
            dataKey='value'
            nameKey='name'
          />
        </div>

        {/* 标签页特定统计 */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
          <div className='bg-white rounded-xl shadow-sm p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-slate-600 mb-1'>
                  {activeTab === 'projects' ? '项目总数' : activeTab === 'experiments' ? '试验总数' : '配方总数'}
                </p>
                <p className='text-3xl font-bold text-slate-900'>
                  {activeTab === 'projects'
                    ? safeProjects.length
                    : activeTab === 'experiments'
                      ? safeExperiments.length
                      : safeFormulas.length}
                </p>
              </div>
              <div className='w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center'>
                {activeTab === 'projects' ? (
                  <FlaskConical className='w-6 h-6 text-blue-600' />
                ) : activeTab === 'experiments' ? (
                  <Beaker className='w-6 h-6 text-blue-600' />
                ) : (
                  <FileCode className='w-6 h-6 text-indigo-600' />
                )}
              </div>
            </div>
          </div>
          <div className='bg-white rounded-xl shadow-sm p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-slate-600 mb-1'>进行中</p>
                <p className='text-3xl font-bold text-blue-600'>
                  {activeTab === 'projects'
                    ? safeProjects.filter((p) => p.status === '进行中').length
                    : activeTab === 'experiments'
                      ? safeExperiments.filter((e) => e.status === '进行中').length
                      : safeFormulas.filter((f) => f.status === '草稿').length}
                </p>
              </div>
              <div className='w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center'>
                <Clock className='w-6 h-6 text-orange-600' />
              </div>
            </div>
          </div>
          <div className='bg-white rounded-xl shadow-sm p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-slate-600 mb-1'>已完成</p>
                <p className='text-3xl font-bold text-green-600'>
                  {activeTab === 'projects'
                    ? safeProjects.filter((p) => p.status === '已完成').length
                    : activeTab === 'experiments'
                      ? safeExperiments.filter((e) => e.status === '已完成').length
                      : safeFormulas.filter((f) => f.status === '已批准' || f.status === '已发布').length}
                </p>
              </div>
              <div className='w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center'>
                <CheckCircle className='w-6 h-6 text-green-600' />
              </div>
            </div>
          </div>
          {activeTab === 'formulas' && (
            <div className='bg-white rounded-xl shadow-sm p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-slate-600 mb-1'>待审批</p>
                  <p className='text-3xl font-bold text-yellow-600'>
                    {safeFormulas.filter((f) => f.status === '待审批').length}
                  </p>
                </div>
                <div className='w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center'>
                  <FileCode className='w-6 h-6 text-yellow-600' />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* List */}
        {activeTab === 'projects' ? (
          /* Projects List */
          <div className='space-y-6'>
            <div className='bg-white rounded-xl shadow-sm'>
              {/* 批量操作栏 */}
              <div className='flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50'>
                <div className='flex items-center space-x-3'>
                  <label className='flex items-center cursor-pointer select-none'>
                    <input
                      type='checkbox'
                      checked={selectedProjectIds.size === filteredProjects.length && filteredProjects.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAllProjects();
                        } else {
                          deselectAllProjects();
                        }
                      }}
                      className='w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500'
                    />
                    <span className='ml-2 text-sm text-slate-600'>
                      {selectedProjectIds.size > 0 ? `已选择 ${selectedProjectIds.size} 项` : '全部选择'}
                    </span>
                  </label>
                </div>
                {selectedProjectIds.size > 0 && (
                  <ModuleGate module={MODULES.RS} action='delete' showDisabled={true}>
                    <div className='flex items-center space-x-2'>
                      <button
                        onClick={() => handleBatchDelete()}
                        disabled={creating}
                        className='flex items-center space-x-2 px-3 py-1.5 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50'
                      >
                        <Trash2 className='w-4 h-4' />
                        <span>批量删除</span>
                      </button>
                    </div>
                  </ModuleGate>
                )}
              </div>
              <div className='p-6 border-b border-slate-200'>
                <h2 className='text-lg font-semibold text-slate-900'>项目列表</h2>
              </div>
              <div className='divide-y divide-slate-200'>
                {filteredProjects.length === 0 ? (
                  <div className='p-12 text-center'>
                    <FlaskConical className='w-16 h-16 text-slate-300 mx-auto mb-4' />
                    <p className='text-slate-500'>暂无项目</p>
                  </div>
                ) : (
                  filteredProjects.map((project) => (
                    <div key={project.id} className='p-6 hover:bg-slate-50 transition-colors'>
                      <div className='flex items-start justify-between'>
                        <div className='flex items-start space-x-4'>
                          <label className='flex items-center cursor-pointer select-none pt-1'>
                            <input
                              type='checkbox'
                              checked={selectedProjectIds.has(project.id)}
                              onChange={() => toggleProjectSelect(project.id)}
                              className='w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500'
                            />
                          </label>
                          <div className='flex-1'>
                            <div className='flex items-center space-x-3 mb-2'>
                              <h3 className='text-lg font-semibold text-slate-900'>{project.name}</h3>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}
                              >
                                {project.status}
                              </span>
                            </div>
                            <p className='text-slate-600 mb-3'>{project.description}</p>
                            <div className='flex items-center space-x-4 text-sm text-slate-500'>
                              <span className='flex items-center'>
                                <Clock className='w-4 h-4 mr-1' />
                                开始时间: {new Date(project.start_date).toLocaleDateString('zh-CN')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className='flex items-center space-x-2'>
                          <button
                            onClick={() => openDetailModal(project)}
                            className='px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg'
                            title='查看详情'
                          >
                            <span className='flex items-center'>查看详情</span>
                          </button>
                          <button
                            onClick={() => openExperimentModal(project)}
                            className='px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg'
                            title='添加试验'
                          >
                            <span className='flex items-center'>
                              <Beaker className='w-4 h-4 mr-1' />
                              添加试验
                            </span>
                          </button>
                          <button
                            onClick={() => openEditModal(project)}
                            className='p-2 text-slate-500 hover:bg-slate-100 rounded-lg'
                            title='编辑'
                          >
                            <Edit className='w-5 h-5' />
                          </button>
                          <button
                            onClick={() => handleDelete(project.id)}
                            className='p-2 text-red-500 hover:bg-red-50 rounded-lg'
                            title='删除'
                          >
                            <Trash2 className='w-5 h-5' />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Experiments List */
          <div className='bg-white rounded-xl shadow-sm'>
            <div className='p-6 border-b border-slate-200'>
              <h2 className='text-lg font-semibold text-slate-900'>试验记录</h2>
            </div>
            <div className='divide-y divide-slate-200'>
              {filteredExperiments.length === 0 ? (
                <div className='p-12 text-center'>
                  <Beaker className='w-16 h-16 text-slate-300 mx-auto mb-4' />
                  <p className='text-slate-500'>暂无试验记录</p>
                </div>
              ) : (
                filteredExperiments.map((experiment) => (
                  <div key={experiment.id} className='p-6 hover:bg-slate-50 transition-colors'>
                    <div className='flex items-start justify-between'>
                      <div className='flex-1'>
                        <div className='flex items-center space-x-3 mb-2'>
                          <h3 className='text-lg font-semibold text-slate-900'>{experiment.name}</h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(experiment.status)}`}
                          >
                            {experiment.status}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getExperimentTypeColor(experiment.experiment_type)}`}
                          >
                            {experiment.experiment_type}
                          </span>
                        </div>
                        <p className='text-slate-600 mb-2'>目标: {experiment.objective}</p>
                        {experiment.results && (
                          <p className='text-sm text-slate-700 mb-3'>结果: {String(experiment.results)}</p>
                        )}
                        <div className='flex items-center space-x-4 text-sm text-slate-500'>
                          <span className='flex items-center'>
                            <Clock className='w-4 h-4 mr-1' />
                            开始日期: {new Date(experiment.started_at).toLocaleDateString('zh-CN')}
                          </span>
                          <span>试验员: {experiment.experimenter}</span>
                          <span>项目: {getProjectName(experiment.project_id)}</span>
                        </div>
                        {experiment.conclusions && (
                          <div className='mt-3 p-3 bg-green-50 rounded-lg'>
                            <p className='text-sm font-medium text-green-800'>结论: {experiment.conclusions}</p>
                          </div>
                        )}
                      </div>
                      <div className='flex items-center space-x-2'>
                        <button
                          onClick={() => openExperimentDetailModal(experiment)}
                          className='px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg'
                          title='查看详情'
                        >
                          <span className='flex items-center'>
                            <Eye className='w-4 h-4 mr-1' />
                            查看详情
                          </span>
                        </button>
                        <button
                          onClick={() => openEditExperimentModal(experiment)}
                          className='p-2 text-slate-500 hover:bg-slate-100 rounded-lg'
                          title='编辑'
                        >
                          <Edit className='w-5 h-5' />
                        </button>
                        <button
                          onClick={() => handleDeleteExperiment(experiment.id)}
                          className='p-2 text-red-500 hover:bg-red-50 rounded-lg'
                          title='删除'
                        >
                          <Trash2 className='w-5 h-5' />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Formulas List */}
        {activeTab === 'formulas' && (
          <div className='space-y-6'>
            <div className='bg-white rounded-xl shadow-sm'>
              <div className='p-6 border-b border-slate-200'>
                <h2 className='text-lg font-semibold text-slate-900'>配方列表</h2>
              </div>
              <div className='divide-y divide-slate-200'>
                {safeFormulas.length === 0 ? (
                  <div className='p-12 text-center'>
                    <FileCode className='w-16 h-16 text-slate-300 mx-auto mb-4' />
                    <p className='text-slate-500'>暂无配方</p>
                  </div>
                ) : (
                  safeFormulas.map((formula) => (
                    <div key={formula.id} className='p-6 hover:bg-slate-50 transition-colors'>
                      <div className='flex items-start justify-between'>
                        <div className='flex items-start space-x-4'>
                          <div className='w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600'>
                            <FileCode className='w-6 h-6' />
                          </div>
                          <div className='flex-1'>
                            <div className='flex items-center space-x-3 mb-2'>
                              <h3 className='text-lg font-semibold text-slate-900'>{formula.name}</h3>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getFormulaStatusColor(formula.status)}`}
                              >
                                {formula.status}
                              </span>
                              <span className='px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium'>
                                {formula.version}
                              </span>
                              {formula.approval_status && (
                                <span className='flex items-center'>
                                  {getFormulaApprovalStatusIcon(formula.approval_status)}
                                </span>
                              )}
                            </div>
                            <p className='text-slate-600 mb-3'>{formula.description || '暂无描述'}</p>
                            <div className='flex flex-wrap items-center gap-3 text-sm text-slate-500'>
                              <span className='font-mono'>编号: {formula.code}</span>
                              {formula.category && <span>分类: {formula.category}</span>}
                              {formula.ingredients && formula.ingredients.length > 0 && (
                                <span>配方成分: {formula.ingredients.length} 种</span>
                              )}
                            </div>
                            <div className='flex items-center space-x-4 text-sm text-slate-500 mt-2'>
                              <span>项目: {getProjectName(formula.project_id)}</span>
                              {formula.effective_date && (
                                <span>生效日期: {new Date(formula.effective_date).toLocaleDateString('zh-CN')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className='flex items-center space-x-2'>
                          <button
                            onClick={() => openFormulaDetailModal(formula)}
                            className='px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg'
                            title='查看详情'
                          >
                            <span className='flex items-center'>
                              <Eye className='w-4 h-4 mr-1' />
                              详情
                            </span>
                          </button>
                          <button
                            onClick={() => openFormulaVersionModal(formula)}
                            className='px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg'
                            title='版本管理'
                          >
                            <span className='flex items-center'>
                              <GitBranch className='w-4 h-4 mr-1' />
                              版本
                            </span>
                          </button>
                          <button
                            onClick={() => openFormulaModal(formula)}
                            className='p-2 text-slate-500 hover:bg-slate-100 rounded-lg'
                            title='编辑'
                          >
                            <Edit className='w-5 h-5' />
                          </button>
                          <button
                            onClick={() => handleDeleteFormula(formula.id)}
                            className='p-2 text-red-500 hover:bg-red-50 rounded-lg'
                            title='删除'
                          >
                            <Trash2 className='w-5 h-5' />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-xl shadow-xl w-full max-w-md mx-4'>
            <div className='p-6 border-b border-slate-200 flex justify-between items-center'>
              <h3 className='text-lg font-semibold text-slate-900'>{isEditing ? '编辑项目' : '新建项目'}</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setIsEditing(false);
                }}
                className='p-2 text-slate-400 hover:text-slate-600'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='p-6 space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>项目名称 *</label>
                <input
                  type='text'
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    handleProjectFieldChange('name', e.target.value);
                  }}
                  onBlur={(e) => handleProjectFieldBlur('name', e.target.value)}
                  placeholder='请输入项目名称'
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    projectErrors.name && touched.project_name ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <FieldError error={projectErrors.name && touched.project_name ? projectErrors.name : undefined} />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>项目编号 *</label>
                <input
                  type='text'
                  value={formData.code}
                  onChange={(e) => {
                    setFormData({ ...formData, code: e.target.value });
                    handleProjectFieldChange('code', e.target.value);
                  }}
                  onBlur={(e) => handleProjectFieldBlur('code', e.target.value)}
                  placeholder='请输入项目编号'
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    projectErrors.code && touched.project_code ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <FieldError error={projectErrors.code && touched.project_code ? projectErrors.code : undefined} />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>负责人 *</label>
                <input
                  type='text'
                  value={formData.leader}
                  onChange={(e) => {
                    setFormData({ ...formData, leader: e.target.value });
                    handleProjectFieldChange('leader', e.target.value);
                  }}
                  onBlur={(e) => handleProjectFieldBlur('leader', e.target.value)}
                  placeholder='请输入负责人'
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    projectErrors.leader && touched.project_leader ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <FieldError error={projectErrors.leader && touched.project_leader ? projectErrors.leader : undefined} />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>项目类型</label>
                <select
                  value={formData.project_type}
                  onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                  className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500'
                >
                  <option value='研发'>研发</option>
                  <option value='改进'>改进</option>
                  <option value='测试'>测试</option>
                  <option value='其他'>其他</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>开始日期</label>
                <input
                  type='date'
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>项目描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    handleProjectFieldChange('description', e.target.value);
                  }}
                  onBlur={(e) => handleProjectFieldBlur('description', e.target.value)}
                  placeholder='请输入项目描述'
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    projectErrors.description && touched.project_description ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <FieldError
                  error={
                    projectErrors.description && touched.project_description ? projectErrors.description : undefined
                  }
                />
              </div>
            </div>
            <div className='p-6 border-t border-slate-200 flex justify-end space-x-3'>
              <button
                onClick={() => setShowModal(false)}
                className='px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors'
              >
                取消
              </button>
              <button
                onClick={isEditing ? handleEdit : handleCreate}
                disabled={creating}
                className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50'
              >
                {creating ? (
                  <span className='flex items-center'>
                    <Loader2 className='w-4 h-4 animate-spin mr-2' />
                    {isEditing ? '更新中...' : '创建中...'}
                  </span>
                ) : isEditing ? (
                  '更新'
                ) : (
                  '创建'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedProject && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-xl shadow-xl max-w-2xl w-full'>
            <div className='p-6'>
              <div className='flex items-center justify-between mb-6'>
                <h3 className='text-xl font-semibold text-slate-900'>项目详情</h3>
                <button onClick={() => setShowDetailModal(false)} className='text-slate-400 hover:text-slate-600'>
                  <X className='w-6 h-6' />
                </button>
              </div>

              <div className='space-y-6'>
                <div>
                  <div className='flex items-center justify-between mb-4'>
                    <h4 className='text-lg font-semibold text-slate-800'>{selectedProject.name}</h4>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedProject.status)}`}
                    >
                      {selectedProject.status}
                    </span>
                  </div>
                  <p className='text-slate-600'>{selectedProject.description}</p>
                </div>

                <div className='grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg'>
                  <div>
                    <p className='text-sm text-slate-500 mb-1'>项目编号</p>
                    <p className='font-medium text-slate-800 font-mono text-sm'>{selectedProject.id}</p>
                  </div>
                  <div>
                    <p className='text-sm text-slate-500 mb-1'>开始时间</p>
                    <p className='font-medium text-slate-800'>
                      {new Date(selectedProject.start_date).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm text-slate-500 mb-1'>创建时间</p>
                    <p className='font-medium text-slate-800'>
                      {new Date(selectedProject.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm text-slate-500 mb-1'>更新时间</p>
                    <p className='font-medium text-slate-800'>
                      {new Date(selectedProject.updated_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>

                <div className='flex justify-end space-x-3 pt-4 border-t border-slate-200'>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openEditModal(selectedProject);
                    }}
                    className='px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50'
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className='px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200'
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Experiment Create/Edit Modal */}
      {showExperimentModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto'>
            <div className='p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white'>
              <h3 className='text-lg font-semibold text-slate-900'>
                {isEditingExperiment ? '编辑试验记录' : '新建试验记录'}
              </h3>
              <button
                onClick={() => {
                  setShowExperimentModal(false);
                  setIsEditingExperiment(false);
                }}
                className='p-2 text-slate-400 hover:text-slate-600'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='p-6 space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>关联项目 *</label>
                <select
                  value={experimentFormData.project_id}
                  onChange={(e) => {
                    setExperimentFormData({ ...experimentFormData, project_id: e.target.value });
                    handleExperimentFieldChange('project_id', e.target.value);
                  }}
                  onBlur={(e) => handleExperimentFieldBlur('project_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    experimentErrors.project_id && touched.experiment_project_id ? 'border-red-500' : 'border-slate-200'
                  }`}
                  disabled={isEditingExperiment}
                >
                  <option value=''>请选择项目</option>
                  {safeProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <FieldError
                  error={
                    experimentErrors.project_id && touched.experiment_project_id
                      ? experimentErrors.project_id
                      : undefined
                  }
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>试验名称 *</label>
                <input
                  type='text'
                  value={experimentFormData.name}
                  onChange={(e) => {
                    setExperimentFormData({ ...experimentFormData, name: e.target.value });
                    handleExperimentFieldChange('name', e.target.value);
                  }}
                  onBlur={(e) => handleExperimentFieldBlur('name', e.target.value)}
                  placeholder='请输入试验名称'
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    experimentErrors.name && touched.experiment_name ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <FieldError
                  error={experimentErrors.name && touched.experiment_name ? experimentErrors.name : undefined}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>试验编号 *</label>
                <input
                  type='text'
                  value={experimentFormData.code}
                  onChange={(e) => {
                    setExperimentFormData({ ...experimentFormData, code: e.target.value });
                    handleExperimentFieldChange('code', e.target.value);
                  }}
                  onBlur={(e) => handleExperimentFieldBlur('code', e.target.value)}
                  placeholder='请输入试验编号'
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    experimentErrors.code && touched.experiment_code ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <FieldError
                  error={experimentErrors.code && touched.experiment_code ? experimentErrors.code : undefined}
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>试验类型</label>
                <select
                  value={experimentFormData.experiment_type}
                  onChange={(e) => setExperimentFormData({ ...experimentFormData, experiment_type: e.target.value })}
                  className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500'
                >
                  <option value='小试'>小试</option>
                  <option value='中试'>中试</option>
                  <option value='量产'>量产</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>试验阶段</label>
                <select
                  value={experimentFormData.phase}
                  onChange={(e) => setExperimentFormData({ ...experimentFormData, phase: e.target.value })}
                  className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500'
                >
                  <option value='小试'>小试</option>
                  <option value='中试'>中试</option>
                  <option value='量产'>量产</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>试验员</label>
                <input
                  type='text'
                  value={experimentFormData.experimenter}
                  onChange={(e) => {
                    setExperimentFormData({ ...experimentFormData, experimenter: e.target.value });
                    handleExperimentFieldChange('experimenter', e.target.value);
                  }}
                  onBlur={(e) => handleExperimentFieldBlur('experimenter', e.target.value)}
                  placeholder='请输入试验员姓名'
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    experimentErrors.experimenter && touched.experiment_experimenter
                      ? 'border-red-500'
                      : 'border-slate-200'
                  }`}
                />
                <FieldError
                  error={
                    experimentErrors.experimenter && touched.experiment_experimenter
                      ? experimentErrors.experimenter
                      : undefined
                  }
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>试验目标</label>
                <textarea
                  value={experimentFormData.objective}
                  onChange={(e) => {
                    setExperimentFormData({ ...experimentFormData, objective: e.target.value });
                    handleExperimentFieldChange('objective', e.target.value);
                  }}
                  onBlur={(e) => handleExperimentFieldBlur('objective', e.target.value)}
                  placeholder='请输入试验目标'
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    experimentErrors.objective && touched.experiment_objective ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <FieldError
                  error={
                    experimentErrors.objective && touched.experiment_objective ? experimentErrors.objective : undefined
                  }
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>试验方法</label>
                <textarea
                  value={experimentFormData.method}
                  onChange={(e) => {
                    setExperimentFormData({ ...experimentFormData, method: e.target.value });
                    handleExperimentFieldChange('method', e.target.value);
                  }}
                  onBlur={(e) => handleExperimentFieldBlur('method', e.target.value)}
                  placeholder='请输入试验方法'
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    experimentErrors.method && touched.experiment_method ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <FieldError
                  error={experimentErrors.method && touched.experiment_method ? experimentErrors.method : undefined}
                />
              </div>
            </div>
            <div className='p-6 border-t border-slate-200 flex justify-end space-x-3'>
              <button
                onClick={() => {
                  setShowExperimentModal(false);
                  setIsEditingExperiment(false);
                }}
                className='px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors'
              >
                取消
              </button>
              <button
                onClick={isEditingExperiment ? handleUpdateExperiment : handleCreateExperiment}
                disabled={creating}
                className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50'
              >
                {creating ? (
                  <span className='flex items-center'>
                    <Loader2 className='w-4 h-4 animate-spin mr-2' />
                    {isEditingExperiment ? '更新中...' : '创建中...'}
                  </span>
                ) : isEditingExperiment ? (
                  '更新'
                ) : (
                  '创建'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Experiment Detail Modal */}
      {showExperimentDetailModal && selectedExperiment && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto'>
            <div className='p-6'>
              <div className='flex items-center justify-between mb-6'>
                <h3 className='text-xl font-semibold text-slate-900'>试验记录详情</h3>
                <button
                  onClick={() => setShowExperimentDetailModal(false)}
                  className='text-slate-400 hover:text-slate-600'
                >
                  <X className='w-6 h-6' />
                </button>
              </div>

              <div className='space-y-6'>
                <div>
                  <div className='flex items-center justify-between mb-4'>
                    <h4 className='text-lg font-semibold text-slate-800'>{selectedExperiment.name}</h4>
                    <div className='flex space-x-2'>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedExperiment.status)}`}
                      >
                        {selectedExperiment.status}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getExperimentTypeColor(selectedExperiment.experiment_type)}`}
                      >
                        {selectedExperiment.experiment_type}
                      </span>
                    </div>
                  </div>
                  <p className='text-slate-600 mb-3'>目标: {selectedExperiment.objective}</p>
                </div>

                <div className='p-4 bg-slate-50 rounded-lg'>
                  <h5 className='font-semibold text-slate-800 mb-2'>试验方法</h5>
                  <p className='text-slate-700'>{selectedExperiment.method}</p>
                </div>

                {selectedExperiment.results && (
                  <div className='p-4 bg-blue-50 rounded-lg'>
                    <h5 className='font-semibold text-blue-800 mb-2'>试验结果</h5>
                    <p className='text-blue-700'>{String(selectedExperiment.results)}</p>
                  </div>
                )}

                {selectedExperiment.conclusions && (
                  <div className='p-4 bg-green-50 rounded-lg'>
                    <h5 className='font-semibold text-green-800 mb-2'>试验结论</h5>
                    <p className='text-green-700'>{selectedExperiment.conclusions}</p>
                  </div>
                )}

                <div className='grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg'>
                  <div>
                    <p className='text-sm text-slate-500 mb-1'>试验编号</p>
                    <p className='font-medium text-slate-800 font-mono text-sm'>{selectedExperiment.code}</p>
                  </div>
                  <div>
                    <p className='text-sm text-slate-500 mb-1'>关联项目</p>
                    <p className='font-medium text-slate-800'>{getProjectName(selectedExperiment.project_id)}</p>
                  </div>
                  <div>
                    <p className='text-sm text-slate-500 mb-1'>开始日期</p>
                    <p className='font-medium text-slate-800'>
                      {new Date(selectedExperiment.started_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm text-slate-500 mb-1'>试验员</p>
                    <p className='font-medium text-slate-800'>{selectedExperiment.experimenter}</p>
                  </div>
                  <div>
                    <p className='text-sm text-slate-500 mb-1'>创建时间</p>
                    <p className='font-medium text-slate-800'>
                      {new Date(selectedExperiment.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm text-slate-500 mb-1'>更新时间</p>
                    <p className='font-medium text-slate-800'>
                      {new Date(selectedExperiment.updated_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>

                <div className='flex justify-end space-x-3 pt-4 border-t border-slate-200'>
                  <button
                    onClick={() => {
                      setShowExperimentDetailModal(false);
                      openEditExperimentModal(selectedExperiment);
                    }}
                    className='px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50'
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => setShowExperimentDetailModal(false)}
                    className='px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200'
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Create Modal */}
      {showBatchCreateModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col'>
            <div className='p-6 border-b border-slate-200 flex justify-between items-center'>
              <h3 className='text-lg font-semibold text-slate-900'>批量创建项目</h3>
              <button
                onClick={() => {
                  setShowBatchCreateModal(false);
                  setBatchCreateData([{ name: '', code: '', description: '', project_type: '研发', leader: '', start_date: new Date().toISOString().split('T')[0] }]);
                }}
                className='p-2 text-slate-400 hover:text-slate-600'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='p-6 space-y-4 overflow-y-auto flex-1'>
              {batchCreateData.map((item, index) => (
                <div key={index} className='p-4 border border-slate-200 rounded-lg relative'>
                  <div className='flex items-center justify-between mb-3'>
                    <h4 className='font-medium text-slate-700'>项目 {index + 1}</h4>
                    {batchCreateData.length > 1 && (
                      <button
                        onClick={() => removeBatchCreateItem(index)}
                        className='p-1 text-red-500 hover:bg-red-50 rounded'
                      >
                        <Trash2 className='w-4 h-4' />
                      </button>
                    )}
                  </div>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium text-slate-700 mb-2'>项目名称 *</label>
                      <input
                        type='text'
                        value={item.name}
                        onChange={(e) => updateBatchCreateItem(index, 'name', e.target.value)}
                        placeholder='请输入项目名称'
                        className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-slate-700 mb-2'>项目编号 *</label>
                      <input
                        type='text'
                        value={item.code}
                        onChange={(e) => updateBatchCreateItem(index, 'code', e.target.value)}
                        placeholder='请输入项目编号'
                        className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-slate-700 mb-2'>负责人 *</label>
                      <input
                        type='text'
                        value={item.leader}
                        onChange={(e) => updateBatchCreateItem(index, 'leader', e.target.value)}
                        placeholder='请输入负责人'
                        className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-slate-700 mb-2'>项目类型</label>
                      <select
                        value={item.project_type}
                        onChange={(e) => updateBatchCreateItem(index, 'project_type', e.target.value)}
                        className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500'
                      >
                        <option value='研发'>研发</option>
                        <option value='改进'>改进</option>
                        <option value='测试'>测试</option>
                        <option value='其他'>其他</option>
                      </select>
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-slate-700 mb-2'>开始日期</label>
                      <input
                        type='date'
                        value={item.start_date}
                        onChange={(e) => updateBatchCreateItem(index, 'start_date', e.target.value)}
                        className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-slate-700 mb-2'>项目描述</label>
                      <textarea
                        value={item.description}
                        onChange={(e) => updateBatchCreateItem(index, 'description', e.target.value)}
                        placeholder='请输入项目描述'
                        rows={2}
                        className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500'
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={addBatchCreateItem}
                className='flex items-center space-x-2 w-full justify-center py-3 border border-dashed border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors'
              >
                <Plus className='w-4 h-4' />
                <span>添加项目</span>
              </button>
            </div>
            <div className='p-6 border-t border-slate-200 flex justify-end space-x-3'>
              <button
                onClick={() => {
                  setShowBatchCreateModal(false);
                  setBatchCreateData([
                    {
                      name: '',
                      code: '',
                      description: '',
                      project_type: '研发',
                      leader: '',
                      start_date: new Date().toISOString().split('T')[0],
                    },
                  ]);
                }}
                className='px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors'
              >
                取消
              </button>
              <button
                onClick={handleBatchCreate}
                disabled={creating}
                className='px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50'
              >
                {creating ? (
                  <span className='flex items-center'>
                    <Loader2 className='w-4 h-4 animate-spin mr-2' />
                    创建中...
                  </span>
                ) : (
                  '批量创建'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col'>
            <div className='p-6 border-b border-slate-200 flex justify-between items-center'>
              <h3 className='text-lg font-semibold text-slate-900'>导入项目</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview(null);
                }}
                className='p-2 text-slate-400 hover:text-slate-600'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='p-6 overflow-y-auto flex-1'>
              <div className='mb-6'>
                <div className='flex items-center justify-between mb-4'>
                  <label className='block text-sm font-medium text-slate-700'>选择 CSV 文件</label>
                  <button
                    onClick={downloadTemplate}
                    className='text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1'
                  >
                    <Download className='w-3 h-3' />
                    <span>下载模板</span>
                  </button>
                </div>
                <div className='border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors cursor-pointer'>
                  <input
                    type='file'
                    accept='.csv'
                    id='rs-file-upload'
                    onChange={handleImportFileChange}
                    className='hidden'
                  />
                  <label htmlFor='rs-file-upload' className='cursor-pointer'>
                    <Upload className='w-10 h-10 text-slate-400 mx-auto mb-3' />
                    <p className='text-slate-700 mb-1'>点击或拖拽文件到这里</p>
                    <p className='text-sm text-slate-500'>支持 CSV 格式</p>
                  </label>
                </div>
                {importFile && (
                  <div className='mt-4 p-3 bg-slate-50 rounded-lg flex items-center justify-between'>
                    <div className='flex items-center space-x-2'>
                      <FileText className='w-5 h-5 text-orange-600' />
                      <span className='text-sm text-slate-700'>{importFile.name}</span>
                      <span className='text-xs text-slate-500'>({(importFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      onClick={() => {
                        setImportFile(null);
                        setImportPreview(null);
                      }}
                      className='text-slate-400 hover:text-slate-600'
                    >
                      <X className='w-4 h-4' />
                    </button>
                  </div>
                )}
              </div>

              {/* 文件预览 */}
              {importPreview && (
                <div className='mb-6'>
                  <h4 className='text-sm font-medium text-slate-700 mb-3'>文件预览（前5行）</h4>
                  <div className='border border-slate-200 rounded-lg overflow-hidden'>
                    <table className='w-full text-sm'>
                      <tbody>
                        {importPreview.map((row, rowIndex) => (
                          <tr key={rowIndex} className={rowIndex === 0 ? 'bg-slate-50' : ''}>
                            {row.map((cell, cellIndex) => (
                              <td
                                key={cellIndex}
                                className={`px-3 py-2 border-b border-slate-200 ${rowIndex === importPreview.length - 1 ? 'border-b-0' : ''}`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 格式说明 */}
              <div className='bg-orange-50 border border-orange-200 rounded-lg p-4'>
                <h4 className='text-sm font-medium text-orange-900 mb-2'>CSV 格式说明</h4>
                <div className='text-sm text-orange-800 space-y-1'>
                  <p>
                    • <code className='bg-orange-100 px-1 rounded'>name</code>：项目名称（必填）
                  </p>
                  <p>
                    • <code className='bg-orange-100 px-1 rounded'>description</code>：项目描述
                  </p>
                  <p>
                    • <code className='bg-orange-100 px-1 rounded'>status</code>：状态（立项、进行中、已完成、已终止）
                  </p>
                </div>
              </div>
            </div>
            <div className='p-6 border-t border-slate-200 flex justify-end space-x-3'>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview(null);
                }}
                className='px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors'
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={creating || !importFile}
                className='px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50'
              >
                {creating ? (
                  <span className='flex items-center'>
                    <Loader2 className='w-4 h-4 animate-spin mr-2' />
                    导入中...
                  </span>
                ) : (
                  '导入'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Formula Modal */}
      {showFormulaModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]'>
          <div className='bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto'>
            <div className='p-6 border-b border-slate-200 flex justify-between items-center'>
              <h3 className='text-lg font-semibold text-slate-900'>{isEditingFormula ? '编辑配方' : '添加配方'}</h3>
              <button
                onClick={() => {
                  setShowFormulaModal(false);
                  setIsEditingFormula(false);
                }}
                className='p-2 text-slate-400 hover:text-slate-600'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='p-6 space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-slate-700 mb-2'>配方名称 *</label>
                  <input
                    type='text'
                    value={formulaFormData.name}
                    onChange={(e) => setFormulaFormData({ ...formulaFormData, name: e.target.value })}
                    placeholder='请输入配方名称'
                    className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700 mb-2'>配方编号 *</label>
                  <input
                    type='text'
                    value={formulaFormData.code}
                    onChange={(e) => setFormulaFormData({ ...formulaFormData, code: e.target.value })}
                    placeholder='请输入配方编号'
                    className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500'
                  />
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-slate-700 mb-2'>关联项目 *</label>
                  <select
                    value={formulaFormData.project_id}
                    onChange={(e) => setFormulaFormData({ ...formulaFormData, project_id: e.target.value })}
                    className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500'
                    disabled={isEditingFormula}
                  >
                    <option value=''>请选择项目</option>
                    {safeProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700 mb-2'>版本号</label>
                  <input
                    type='text'
                    value={formulaFormData.version}
                    onChange={(e) => setFormulaFormData({ ...formulaFormData, version: e.target.value })}
                    placeholder='如 v1.0'
                    className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500'
                  />
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-slate-700 mb-2'>分类</label>
                  <select
                    value={formulaFormData.category}
                    onChange={(e) => setFormulaFormData({ ...formulaFormData, category: e.target.value })}
                    className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500'
                  >
                    <option value=''>请选择分类</option>
                    <option value='食品配方'>食品配方</option>
                    <option value='药品配方'>药品配方</option>
                    <option value='化妆品配方'>化妆品配方</option>
                    <option value='化工配方'>化工配方</option>
                    <option value='其他'>其他</option>
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700 mb-2'>状态</label>
                  <select
                    value={formulaFormData.status}
                    onChange={(e) => setFormulaFormData({ ...formulaFormData, status: e.target.value })}
                    className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500'
                  >
                    <option value='草稿'>草稿</option>
                    <option value='待审批'>待审批</option>
                    <option value='已批准'>已批准</option>
                    <option value='已发布'>已发布</option>
                    <option value='已废弃'>已废弃</option>
                  </select>
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-slate-700 mb-2'>生效日期</label>
                  <input
                    type='date'
                    value={formulaFormData.effective_date}
                    onChange={(e) => setFormulaFormData({ ...formulaFormData, effective_date: e.target.value })}
                    className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-slate-700 mb-2'>失效日期</label>
                  <input
                    type='date'
                    value={formulaFormData.expiration_date}
                    onChange={(e) => setFormulaFormData({ ...formulaFormData, expiration_date: e.target.value })}
                    className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500'
                  />
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>配方描述</label>
                <textarea
                  value={formulaFormData.description}
                  onChange={(e) => setFormulaFormData({ ...formulaFormData, description: e.target.value })}
                  placeholder='请输入配方描述'
                  rows={3}
                  className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>工艺流程</label>
                <textarea
                  value={formulaFormData.process_steps}
                  onChange={(e) => setFormulaFormData({ ...formulaFormData, process_steps: e.target.value })}
                  placeholder='请输入工艺流程步骤'
                  rows={4}
                  className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500'
                />
              </div>
            </div>
            <div className='p-6 border-t border-slate-200 flex justify-end space-x-3'>
              <button
                onClick={() => {
                  setShowFormulaModal(false);
                  setIsEditingFormula(false);
                }}
                className='px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors'
              >
                取消
              </button>
              <button
                onClick={isEditingFormula ? handleUpdateFormula : handleCreateFormula}
                disabled={creating}
                className='px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50'
              >
                {creating ? (
                  <span className='flex items-center'>
                    <Loader2 className='w-4 h-4 animate-spin mr-2' />
                    {isEditingFormula ? '更新中...' : '创建中...'}
                  </span>
                ) : isEditingFormula ? (
                  '更新'
                ) : (
                  '创建'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formula Detail Modal */}
      {showFormulaDetailModal && selectedFormula && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4'>
          <div className='bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto'>
            <div className='p-6'>
              <div className='flex items-center justify-between mb-6'>
                <h3 className='text-xl font-semibold text-slate-900'>配方详情</h3>
                <button
                  onClick={() => setShowFormulaDetailModal(false)}
                  className='text-slate-400 hover:text-slate-600'
                >
                  <X className='w-6 h-6' />
                </button>
              </div>

              <div className='space-y-6'>
                <div>
                  <div className='flex items-center justify-between mb-4'>
                    <h4 className='text-lg font-semibold text-slate-800'>{selectedFormula.name}</h4>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getFormulaStatusColor(selectedFormula.status)}`}
                    >
                      {selectedFormula.status}
                    </span>
                  </div>
                  <div className='flex gap-2 mb-3'>
                    <span className='px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium'>
                      {selectedFormula.version}
                    </span>
                    {selectedFormula.category && (
                      <span className='px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium'>
                        {selectedFormula.category}
                      </span>
                    )}
                    {selectedFormula.approval_status && (
                      <span className='flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium'>
                        {getFormulaApprovalStatusIcon(selectedFormula.approval_status)}
                        {selectedFormula.approval_status}
                      </span>
                    )}
                  </div>
                  <p className='text-slate-600'>{selectedFormula.description || '暂无描述'}</p>
                </div>

                <div className='grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg'>
                  <div>
                    <p className='text-sm text-slate-500 mb-1'>配方编号</p>
                    <p className='font-medium text-slate-800 font-mono'>{selectedFormula.code}</p>
                  </div>
                  <div>
                    <p className='text-sm text-slate-500 mb-1'>关联项目</p>
                    <p className='font-medium text-slate-800'>{getProjectName(selectedFormula.project_id)}</p>
                  </div>
                  <div>
                    <p className='text-sm text-slate-500 mb-1'>生效日期</p>
                    <p className='font-medium text-slate-800'>
                      {selectedFormula.effective_date
                        ? new Date(selectedFormula.effective_date).toLocaleDateString('zh-CN')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm text-slate-500 mb-1'>失效日期</p>
                    <p className='font-medium text-slate-800'>
                      {selectedFormula.expiration_date
                        ? new Date(selectedFormula.expiration_date).toLocaleDateString('zh-CN')
                        : '-'}
                    </p>
                  </div>
                  {selectedFormula.approved_by && (
                    <div>
                      <p className='text-sm text-slate-500 mb-1'>审批人</p>
                      <p className='font-medium text-slate-800'>{selectedFormula.approved_by}</p>
                    </div>
                  )}
                  {selectedFormula.approved_at && (
                    <div>
                      <p className='text-sm text-slate-500 mb-1'>审批时间</p>
                      <p className='font-medium text-slate-800'>
                        {new Date(selectedFormula.approved_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className='text-sm text-slate-500 mb-1'>创建时间</p>
                    <p className='font-medium text-slate-800'>
                      {new Date(selectedFormula.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm text-slate-500 mb-1'>更新时间</p>
                    <p className='font-medium text-slate-800'>
                      {new Date(selectedFormula.updated_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>

                {selectedFormula.ingredients && selectedFormula.ingredients.length > 0 && (
                  <div>
                    <h5 className='font-semibold text-slate-800 mb-3'>配方成分</h5>
                    <div className='space-y-2'>
                      {selectedFormula.ingredients.map((ingredient, idx) => (
                        <div key={idx} className='p-3 bg-white border border-slate-200 rounded-lg'>
                          <div className='flex items-center justify-between'>
                            <span className='font-medium text-slate-700'>{ingredient.name}</span>
                            <span className='text-sm text-indigo-600'>
                              {ingredient.quantity} {ingredient.unit || ''}
                            </span>
                          </div>
                          {ingredient.purity && (
                            <p className='text-xs text-slate-500 mt-1'>纯度: {ingredient.purity}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedFormula.process_steps && (
                  <div>
                    <h5 className='font-semibold text-slate-800 mb-3'>工艺流程</h5>
                    <div className='p-4 bg-white border border-slate-200 rounded-lg'>
                      <p className='text-slate-700 whitespace-pre-wrap'>{selectedFormula.process_steps}</p>
                    </div>
                  </div>
                )}

                <div>
                  <h5 className='font-semibold text-slate-800 mb-3'>版本历史</h5>
                  {formulaVersions.length === 0 ? (
                    <p className='text-slate-500 text-center py-4'>暂无版本记录</p>
                  ) : (
                    <div className='space-y-3'>
                      {formulaVersions.map((version) => (
                        <div key={version.id} className='p-4 bg-white border border-slate-200 rounded-lg'>
                          <div className='flex items-center justify-between mb-2'>
                            <span className='font-medium text-indigo-700'>{version.version}</span>
                            <span className='text-sm text-slate-500'>
                              {new Date(version.created_at).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                          <p className='text-slate-700 mb-2'>{version.changes || '无变更说明'}</p>
                          <div className='flex items-center justify-between text-sm text-slate-500'>
                            <span>创建人: {version.created_by || '-'}</span>
                            {version.approved_by && <span>审批人: {version.approved_by}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className='flex justify-end space-x-3 pt-4 border-t border-slate-200'>
                  {selectedFormula.status === '待审批' && (
                    <button
                      onClick={() => handleApproveFormula(selectedFormula.id)}
                      className='px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700'
                    >
                      审批通过
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowFormulaDetailModal(false);
                      openFormulaVersionModal(selectedFormula);
                    }}
                    className='px-4 py-2 text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50'
                  >
                    新建版本
                  </button>
                  <button
                    onClick={() => {
                      setShowFormulaDetailModal(false);
                      openFormulaModal(selectedFormula);
                    }}
                    className='px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50'
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => setShowFormulaDetailModal(false)}
                    className='px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200'
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formula Version Modal */}
      {showFormulaVersionModal && selectedFormula && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]'>
          <div className='bg-white rounded-xl shadow-xl w-full max-w-md mx-4'>
            <div className='p-6 border-b border-slate-200 flex justify-between items-center'>
              <h3 className='text-lg font-semibold text-slate-900'>新建配方版本</h3>
              <button
                onClick={() => setShowFormulaVersionModal(false)}
                className='p-2 text-slate-400 hover:text-slate-600'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='p-6 space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>配方名称</label>
                <p className='text-indigo-700 font-medium'>{selectedFormula.name}</p>
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>当前版本</label>
                <p className='text-slate-700'>{selectedFormula.version}</p>
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>新版本号 *</label>
                <input
                  type='text'
                  value={formulaVersionFormData.version}
                  onChange={(e) => setFormulaVersionFormData({ ...formulaVersionFormData, version: e.target.value })}
                  placeholder='如 v2.0'
                  className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-2'>变更说明 *</label>
                <textarea
                  value={formulaVersionFormData.changes}
                  onChange={(e) => setFormulaVersionFormData({ ...formulaVersionFormData, changes: e.target.value })}
                  placeholder='请输入本次变更的详细说明'
                  rows={4}
                  className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500'
                />
              </div>
            </div>
            <div className='p-6 border-t border-slate-200 flex justify-end space-x-3'>
              <button
                onClick={() => setShowFormulaVersionModal(false)}
                className='px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors'
              >
                取消
              </button>
              <button
                onClick={handleCreateFormulaVersion}
                disabled={creating}
                className='px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50'
              >
                {creating ? (
                  <span className='flex items-center'>
                    <Loader2 className='w-4 h-4 animate-spin mr-2' />
                    创建中...
                  </span>
                ) : (
                  '创建版本'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rspage;
