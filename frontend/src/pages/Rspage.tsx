import React, { useEffect, useState, useCallback } from 'react';
import { 
  FlaskConical, Plus, Search, Clock, ChevronRight, 
  FileText, Edit, Trash2, Loader2, X, CheckCircle,
  Beaker, Eye, Download, Upload
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { rsApi, Project, CreateProjectRequest, ExperimentRecord, CreateExperimentRequest, UpdateExperimentRequest, BatchCreateProjectsRequest, BatchDeleteProjectsRequest, BatchOperationResult } from '../api/rs';
import { FieldError, ValidationHint } from '../components/ValidationError';
import { patterns } from '../utils/validation';
import { ModuleGate } from '../components/PermissionGate';
import { MODULES } from '../config/permissions';

const Rspage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'projects' | 'experiments'>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [experiments, setExperiments] = useState<ExperimentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showExperimentModal, setShowExperimentModal] = useState(false);
  const [showExperimentDetailModal, setShowExperimentDetailModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedExperiment, setSelectedExperiment] = useState<ExperimentRecord | null>(null);
  const [selectedProjectForExperiment, setSelectedProjectForExperiment] = useState<Project | null>(null);
  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    description: '',
    status: '立项'
  });
  const [experimentFormData, setExperimentFormData] = useState<CreateExperimentRequest>({
    project_id: '',
    title: '',
    description: '',
    experiment_type: '小试',
    result: '',
    status: '待开始',
    experimenter: ''
  });
  const [editingExperiment, setEditingExperiment] = useState<ExperimentRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingExperiment, setIsEditingExperiment] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [projectErrors, setProjectErrors] = useState<Record<string, string>>({});
  const [experimentErrors, setExperimentErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [showBatchCreateModal, setShowBatchCreateModal] = useState(false);
  const [batchCreateData, setBatchCreateData] = useState<CreateProjectRequest[]>([
    { name: '', description: '', status: '立项' }
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
      case 'description':
        if (value.length > 1000) return '描述不能超过1000个字符';
        return null;
      default:
        return null;
    }
  };

  const validateExperimentField = (field: string, value: string): string | null => {
    switch (field) {
      case 'title':
        if (!value.trim()) return '试验标题不能为空';
        if (value.length < 2) return '试验标题至少需要2个字符';
        if (value.length > 200) return '试验标题不能超过200个字符';
        return null;
      case 'project_id':
        if (!value) return '请选择关联项目';
        return null;
      case 'experimenter':
        if (value.length > 50) return '试验员姓名不能超过50个字符';
        return null;
      case 'description':
        if (value.length > 2000) return '描述不能超过2000个字符';
        return null;
      case 'result':
        if (value.length > 5000) return '结果不能超过5000个字符';
        return null;
      default:
        return null;
    }
  };

  const handleProjectFieldChange = (field: string, value: string) => {
    const error = validateProjectField(field, value);
    setProjectErrors(prev => {
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
    setExperimentErrors(prev => {
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
    setTouched(prev => ({ ...prev, [`project_${field}`]: true }));
    const error = validateProjectField(field, value);
    setProjectErrors(prev => {
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
    setTouched(prev => ({ ...prev, [`experiment_${field}`]: true }));
    const error = validateExperimentField(field, value);
    setExperimentErrors(prev => {
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

    if (formData.description.length > 1000) {
      errors.description = '描述不能超过1000个字符';
    }

    setProjectErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateExperimentForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!experimentFormData.title.trim()) {
      errors.title = '试验标题不能为空';
    } else if (experimentFormData.title.length < 2) {
      errors.title = '试验标题至少需要2个字符';
    } else if (experimentFormData.title.length > 200) {
      errors.title = '试验标题不能超过200个字符';
    }

    if (!experimentFormData.project_id) {
      errors.project_id = '请选择关联项目';
    }

    if (experimentFormData.experimenter.length > 50) {
      errors.experimenter = '试验员姓名不能超过50个字符';
    }

    setExperimentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    loadProjects();
    loadExperiments();
  }, []);

  // 数据适配函数：处理后端返回的数据字段与前端期望不匹配的问题
  const adaptProject = (p: any): Project => {
    return {
      ...p,
      // 确保 start_date 存在，没有时使用 created_at
      start_date: p.start_date || p.created_at
    };
  };

  const adaptExperiment = (e: any): ExperimentRecord => {
    return {
      ...e,
      // 将 name 映射到 title（兼容两种字段名）
      title: e.title || e.name,
      // 将 conclusions 映射到 conclusion（兼容两种字段名）
      conclusion: e.conclusion || e.conclusions,
      // 确保 experiment_date 存在
      experiment_date: e.experiment_date || e.started_at || e.created_at
    };
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
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
        const adaptedProjects = rawProjects.map(p => adaptProject(p));
        setProjects(adaptedProjects);
      } else {
        setProjects([]);
      }
    } catch (err) {
      showNotification('error', '加载项目列表失败');
      console.error('加载项目失败:', err);
      setProjects([]);
    } finally {
      setLoading(false);
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
        const adaptedExperiments = rawExperiments.map(e => adaptExperiment(e));
        setExperiments(adaptedExperiments);
      } else {
        setExperiments([]);
      }
    } catch (err) {
      console.error('加载试验记录失败:', err);
      setExperiments([]);
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
        setFormData({ name: '', description: '', status: '立项' });
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
        setFormData({ name: '', description: '', status: '立项' });
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
      description: project.description,
      status: project.status
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const openDetailModal = (project: Project) => {
    setSelectedProject(project);
    setShowDetailModal(true);
  };

  const openExperimentModal = (project?: Project) => {
    setSelectedProjectForExperiment(project || null);
    setExperimentFormData({
      project_id: project?.id || '',
      title: '',
      description: '',
      experiment_type: '小试',
      result: '',
      status: '待开始',
      experimenter: ''
    });
    setEditingExperiment(null);
    setIsEditingExperiment(false);
    setShowExperimentModal(true);
  };

  const openEditExperimentModal = (experiment: ExperimentRecord) => {
    setEditingExperiment(experiment);
    setExperimentFormData({
      project_id: experiment.project_id,
      title: experiment.title,
      description: experiment.description,
      experiment_type: experiment.experiment_type,
      result: experiment.result,
      status: experiment.status,
      experimenter: experiment.experimenter
    });
    setIsEditingExperiment(true);
    setShowExperimentModal(true);
  };

  const openExperimentDetailModal = (experiment: ExperimentRecord) => {
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
        title: experimentFormData.title,
        description: experimentFormData.description,
        experiment_type: experimentFormData.experiment_type,
        result: experimentFormData.result,
        status: experimentFormData.status,
        experimenter: experimentFormData.experimenter
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

  const filteredProjects = safeProjects.filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExperiments = safeExperiments.filter(e => 
    (e.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.experimenter || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 批量操作相关
  const toggleProjectSelect = useCallback((id: string) => {
    setSelectedProjectIds(prev => {
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
    setSelectedProjectIds(new Set(filteredProjects.map(p => p.id)));
  }, [filteredProjects]);

  const deselectAllProjects = useCallback(() => {
    setSelectedProjectIds(new Set());
  }, []);

  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除 ${selectedProjectIds.size} 个项目吗？`)) return;

    try {
      setCreating(true);
      const response = await rsApi.batchDeleteProjects({
        ids: Array.from(selectedProjectIds)
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
    setBatchCreateData(prev => [...prev, { name: '', description: '', status: '立项' }]);
  };

  const removeBatchCreateItem = (index: number) => {
    setBatchCreateData(prev => prev.filter((_, i) => i !== index));
  };

  const updateBatchCreateItem = (index: number, field: keyof CreateProjectRequest, value: string) => {
    setBatchCreateData(prev => {
      const newData = [...prev];
      newData[index] = { ...newData[index], [field]: value };
      return newData;
    });
  };

  const handleBatchCreate = async () => {
    const validProjects = batchCreateData.filter(item => item.name.trim() !== '');
    if (validProjects.length === 0) {
      showNotification('error', '请至少填写一个项目的名称');
      return;
    }

    try {
      setCreating(true);
      const response = await rsApi.batchCreateProjects({ projects: validProjects });

      if (response.success) {
        const result = response.data!;
        showNotification('success', `批量创建完成：成功 ${result.success} 个，失败 ${result.failed} 个`);
        setShowBatchCreateModal(false);
        setBatchCreateData([{ name: '', description: '', status: '立项' }]);
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

  const handleExport = async () => {
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
        const preview = lines.map(line => line.split(','));
        setImportPreview(preview);
      } catch {
        setImportPreview(null);
      }
    }
  };

  const downloadTemplate = () => {
    const headers = ['name', 'description', 'status'];
    const sampleRow = ['项目1', '项目描述', '立项'];
    const content = [headers, sampleRow].map(row => row.join(',')).join('\n');
    
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
    const project = safeProjects.find(p => p.id === projectId);
    return project ? project.name : '未知项目';
  };

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status) {
      case '进行中': return 'bg-blue-100 text-blue-700';
      case '已完成': return 'bg-green-100 text-green-700';
      case '已终止': return 'bg-red-100 text-red-700';
      case '待开始': return 'bg-gray-100 text-gray-700';
      case '待测试': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getExperimentTypeColor = (type: string) => {
    switch (type) {
      case '小试': return 'bg-purple-100 text-purple-700';
      case '中试': return 'bg-blue-100 text-blue-700';
      case '量产': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <FlaskConical className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">科研研发</h1>
                  <p className="text-xs text-slate-500">Research & Development</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {activeTab === 'projects' && (
                <>
                  <ModuleGate module={MODULES.RS} action="write" showDisabled={true}>
                    <button
                      onClick={() => setShowModal(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>新建项目</span>
                    </button>
                  </ModuleGate>
                  <ModuleGate module={MODULES.RS} action="write" showDisabled={true}>
                    <button
                      onClick={() => setShowBatchCreateModal(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>批量创建</span>
                    </button>
                  </ModuleGate>
                  <ModuleGate module={MODULES.RS} action="read" showDisabled={true}>
                    <button
                      onClick={handleExport}
                      disabled={creating}
                      className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>导出</span>
                    </button>
                  </ModuleGate>
                  <ModuleGate module={MODULES.RS} action="write" showDisabled={true}>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span>导入</span>
                    </button>
                  </ModuleGate>
                </>
              )}
              {activeTab === 'projects' === false && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>新建项目</span>
                </button>
              )}
              {activeTab === 'experiments' && (
                <button
                  onClick={() => openExperimentModal()}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Beaker className="w-4 h-4" />
                  <span>新建试验</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索项目..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-1 flex space-x-1">
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'projects'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <FlaskConical className="w-5 h-5" />
              <span>项目列表</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('experiments')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'experiments'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Beaker className="w-5 h-5" />
              <span>试验记录</span>
            </div>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">{activeTab === 'projects' ? '项目总数' : '试验总数'}</p>
                <p className="text-3xl font-bold text-slate-900">{activeTab === 'projects' ? safeProjects.length : safeExperiments.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                {activeTab === 'projects' ? (
                  <FlaskConical className="w-6 h-6 text-blue-600" />
                ) : (
                  <Beaker className="w-6 h-6 text-blue-600" />
                )}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">进行中</p>
                <p className="text-3xl font-bold text-blue-600">
                  {activeTab === 'projects'
                    ? safeProjects.filter(p => p.status === '进行中').length
                    : safeExperiments.filter(e => e.status === '进行中').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">已完成</p>
                <p className="text-3xl font-bold text-green-600">
                  {activeTab === 'projects'
                    ? safeProjects.filter(p => p.status === '已完成').length
                    : safeExperiments.filter(e => e.status === '已完成').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        {activeTab === 'projects' ? (
          /* Projects List */
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm">
              {/* 批量操作栏 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center space-x-3">
                  <label className="flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedProjectIds.size === filteredProjects.length && filteredProjects.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAllProjects();
                        } else {
                          deselectAllProjects();
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-slate-600">
                      {selectedProjectIds.size > 0 
                        ? `已选择 ${selectedProjectIds.size} 项` 
                        : '全部选择'}
                    </span>
                  </label>
                </div>
                {selectedProjectIds.size > 0 && (
                  <ModuleGate module={MODULES.RS} action="delete" showDisabled={true}>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleBatchDelete()}
                        disabled={creating}
                        className="flex items-center space-x-2 px-3 py-1.5 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>批量删除</span>
                      </button>
                    </div>
                  </ModuleGate>
                )}
              </div>
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">项目列表</h2>
              </div>
              <div className="divide-y divide-slate-200">
                {filteredProjects.length === 0 ? (
                  <div className="p-12 text-center">
                    <FlaskConical className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">暂无项目</p>
                  </div>
                ) : (
                  filteredProjects.map((project) => (
                    <div key={project.id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <label className="flex items-center cursor-pointer select-none pt-1">
                            <input
                              type="checkbox"
                              checked={selectedProjectIds.has(project.id)}
                              onChange={() => toggleProjectSelect(project.id)}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                          </label>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                                {project.status}
                              </span>
                            </div>
                            <p className="text-slate-600 mb-3">{project.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-slate-500">
                              <span className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                开始时间: {new Date(project.start_date).toLocaleDateString('zh-CN')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openDetailModal(project)}
                            className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="查看详情"
                          >
                            <span className="flex items-center">查看详情</span>
                          </button>
                          <button
                            onClick={() => openExperimentModal(project)}
                            className="px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg"
                            title="添加试验"
                          >
                            <span className="flex items-center"><Beaker className="w-4 h-4 mr-1" />添加试验</span>
                          </button>
                          <button 
                            onClick={() => openEditModal(project)}
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                            title="编辑"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(project.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            title="删除"
                          >
                            <Trash2 className="w-5 h-5" />
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
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">试验记录</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {filteredExperiments.length === 0 ? (
                <div className="p-12 text-center">
                  <Beaker className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">暂无试验记录</p>
                </div>
              ) : (
                filteredExperiments.map((experiment) => (
                  <div key={experiment.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{experiment.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(experiment.status)}`}>
                            {experiment.status}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getExperimentTypeColor(experiment.experiment_type)}`}>
                            {experiment.experiment_type}
                          </span>
                        </div>
                        <p className="text-slate-600 mb-2">{experiment.description}</p>
                        <p className="text-sm text-slate-700 mb-3">结果: {experiment.result}</p>
                        <div className="flex items-center space-x-4 text-sm text-slate-500">
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            试验日期: {new Date(experiment.experiment_date).toLocaleDateString('zh-CN')}
                          </span>
                          <span>试验员: {experiment.experimenter}</span>
                          <span>项目: {getProjectName(experiment.project_id)}</span>
                        </div>
                        {experiment.conclusion && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg">
                            <p className="text-sm font-medium text-green-800">结论: {experiment.conclusion}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openExperimentDetailModal(experiment)}
                          className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="查看详情"
                        >
                          <span className="flex items-center"><Eye className="w-4 h-4 mr-1" />查看详情</span>
                        </button>
                        <button
                          onClick={() => openEditExperimentModal(experiment)}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                          title="编辑"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExperiment(experiment.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          title="删除"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">{isEditing ? '编辑项目' : '新建项目'}</h3>
              <button 
                onClick={() => { setShowModal(false); setIsEditing(false); }}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  项目名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    handleProjectFieldChange('name', e.target.value);
                  }}
                  onBlur={(e) => handleProjectFieldBlur('name', e.target.value)}
                  placeholder="请输入项目名称"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    projectErrors.name && touched.project_name ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <FieldError error={projectErrors.name && touched.project_name ? projectErrors.name : undefined} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  项目描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    handleProjectFieldChange('description', e.target.value);
                  }}
                  onBlur={(e) => handleProjectFieldBlur('description', e.target.value)}
                  placeholder="请输入项目描述"
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    projectErrors.description && touched.project_description ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <FieldError error={projectErrors.description && touched.project_description ? projectErrors.description : undefined} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  项目状态
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="立项">立项</option>
                  <option value="进行中">进行中</option>
                  <option value="已完成">已完成</option>
                  <option value="已终止">已终止</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={isEditing ? handleEdit : handleCreate}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {creating ? (
                  <span className="flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {isEditing ? '更新中...' : '创建中...'}
                  </span>
                ) : (
                  isEditing ? '更新' : '创建'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-900">项目详情</h3>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-slate-800">{selectedProject.name}</h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedProject.status)}`}>
                      {selectedProject.status}
                    </span>
                  </div>
                  <p className="text-slate-600">{selectedProject.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">项目编号</p>
                    <p className="font-medium text-slate-800 font-mono text-sm">{selectedProject.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">开始时间</p>
                    <p className="font-medium text-slate-800">{new Date(selectedProject.start_date).toLocaleDateString('zh-CN')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">创建时间</p>
                    <p className="font-medium text-slate-800">{new Date(selectedProject.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">更新时间</p>
                    <p className="font-medium text-slate-800">{new Date(selectedProject.updated_at).toLocaleString('zh-CN')}</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openEditModal(selectedProject);
                    }}
                    className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-slate-900">{isEditingExperiment ? '编辑试验记录' : '新建试验记录'}</h3>
              <button
                onClick={() => { setShowExperimentModal(false); setIsEditingExperiment(false); }}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  关联项目 *
                </label>
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
                  <option value="">请选择项目</option>
                  {safeProjects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
                <FieldError error={experimentErrors.project_id && touched.experiment_project_id ? experimentErrors.project_id : undefined} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  试验标题 *
                </label>
                <input
                  type="text"
                  value={experimentFormData.title}
                  onChange={(e) => {
                    setExperimentFormData({ ...experimentFormData, title: e.target.value });
                    handleExperimentFieldChange('title', e.target.value);
                  }}
                  onBlur={(e) => handleExperimentFieldBlur('title', e.target.value)}
                  placeholder="请输入试验标题"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    experimentErrors.title && touched.experiment_title ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <FieldError error={experimentErrors.title && touched.experiment_title ? experimentErrors.title : undefined} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  试验类型
                </label>
                <select
                  value={experimentFormData.experiment_type}
                  onChange={(e) => setExperimentFormData({ ...experimentFormData, experiment_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="小试">小试</option>
                  <option value="中试">中试</option>
                  <option value="量产">量产</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  试验状态
                </label>
                <select
                  value={experimentFormData.status}
                  onChange={(e) => setExperimentFormData({ ...experimentFormData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="待开始">待开始</option>
                  <option value="进行中">进行中</option>
                  <option value="已完成">已完成</option>
                  <option value="已终止">已终止</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  试验员
                </label>
                <input
                  type="text"
                  value={experimentFormData.experimenter}
                  onChange={(e) => {
                    setExperimentFormData({ ...experimentFormData, experimenter: e.target.value });
                    handleExperimentFieldChange('experimenter', e.target.value);
                  }}
                  onBlur={(e) => handleExperimentFieldBlur('experimenter', e.target.value)}
                  placeholder="请输入试验员姓名"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    experimentErrors.experimenter && touched.experiment_experimenter ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <FieldError error={experimentErrors.experimenter && touched.experiment_experimenter ? experimentErrors.experimenter : undefined} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  试验描述
                </label>
                <textarea
                  value={experimentFormData.description}
                  onChange={(e) => {
                    setExperimentFormData({ ...experimentFormData, description: e.target.value });
                    handleExperimentFieldChange('description', e.target.value);
                  }}
                  onBlur={(e) => handleExperimentFieldBlur('description', e.target.value)}
                  placeholder="请输入试验描述"
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    experimentErrors.description && touched.experiment_description ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <FieldError error={experimentErrors.description && touched.experiment_description ? experimentErrors.description : undefined} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  试验结果
                </label>
                <textarea
                  value={experimentFormData.result}
                  onChange={(e) => {
                    setExperimentFormData({ ...experimentFormData, result: e.target.value });
                    handleExperimentFieldChange('result', e.target.value);
                  }}
                  onBlur={(e) => handleExperimentFieldBlur('result', e.target.value)}
                  placeholder="请输入试验结果"
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    experimentErrors.result && touched.experiment_result ? 'border-red-500' : 'border-slate-200'
                  }`}
                />
                <FieldError error={experimentErrors.result && touched.experiment_result ? experimentErrors.result : undefined} />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => { setShowExperimentModal(false); setIsEditingExperiment(false); }}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={isEditingExperiment ? handleUpdateExperiment : handleCreateExperiment}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {creating ? (
                  <span className="flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {isEditingExperiment ? '更新中...' : '创建中...'}
                  </span>
                ) : (
                  isEditingExperiment ? '更新' : '创建'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Experiment Detail Modal */}
      {showExperimentDetailModal && selectedExperiment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-900">试验记录详情</h3>
                <button
                  onClick={() => setShowExperimentDetailModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-slate-800">{selectedExperiment.title}</h4>
                    <div className="flex space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedExperiment.status)}`}>
                        {selectedExperiment.status}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getExperimentTypeColor(selectedExperiment.experiment_type)}`}>
                        {selectedExperiment.experiment_type}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 mb-3">{selectedExperiment.description}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h5 className="font-semibold text-slate-800 mb-2">试验结果</h5>
                  <p className="text-slate-700">{selectedExperiment.result}</p>
                </div>

                {selectedExperiment.conclusion && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h5 className="font-semibold text-green-800 mb-2">试验结论</h5>
                    <p className="text-green-700">{selectedExperiment.conclusion}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">试验编号</p>
                    <p className="font-medium text-slate-800 font-mono text-sm">{selectedExperiment.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">关联项目</p>
                    <p className="font-medium text-slate-800">{getProjectName(selectedExperiment.project_id)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">试验日期</p>
                    <p className="font-medium text-slate-800">{new Date(selectedExperiment.experiment_date).toLocaleDateString('zh-CN')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">试验员</p>
                    <p className="font-medium text-slate-800">{selectedExperiment.experimenter}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">创建时间</p>
                    <p className="font-medium text-slate-800">{new Date(selectedExperiment.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">更新时间</p>
                    <p className="font-medium text-slate-800">{new Date(selectedExperiment.updated_at).toLocaleString('zh-CN')}</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setShowExperimentDetailModal(false);
                      openEditExperimentModal(selectedExperiment);
                    }}
                    className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => setShowExperimentDetailModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">批量创建项目</h3>
              <button
                onClick={() => { 
                  setShowBatchCreateModal(false); 
                  setBatchCreateData([{ name: '', description: '', status: '立项' }]);
                }}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {batchCreateData.map((item, index) => (
                <div key={index} className="p-4 border border-slate-200 rounded-lg relative">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-700">项目 {index + 1}</h4>
                    {batchCreateData.length > 1 && (
                      <button
                        onClick={() => removeBatchCreateItem(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        项目名称 *
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateBatchCreateItem(index, 'name', e.target.value)}
                        placeholder="请输入项目名称"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        项目状态
                      </label>
                      <select
                        value={item.status}
                        onChange={(e) => updateBatchCreateItem(index, 'status', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="立项">立项</option>
                        <option value="进行中">进行中</option>
                        <option value="已完成">已完成</option>
                        <option value="已终止">已终止</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        项目描述
                      </label>
                      <textarea
                        value={item.description}
                        onChange={(e) => updateBatchCreateItem(index, 'description', e.target.value)}
                        placeholder="请输入项目描述"
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={addBatchCreateItem}
                className="flex items-center space-x-2 w-full justify-center py-3 border border-dashed border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>添加项目</span>
              </button>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => { 
                  setShowBatchCreateModal(false); 
                  setBatchCreateData([{ name: '', description: '', status: '立项' }]);
                }}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBatchCreate}
                disabled={creating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {creating ? (
                  <span className="flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">导入项目</h3>
              <button
                onClick={() => { 
                  setShowImportModal(false); 
                  setImportFile(null);
                  setImportPreview(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-slate-700">
                    选择 CSV 文件
                  </label>
                  <button
                    onClick={downloadTemplate}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>下载模板</span>
                  </button>
                </div>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    id="rs-file-upload"
                    onChange={handleImportFileChange}
                    className="hidden"
                  />
                  <label htmlFor="rs-file-upload" className="cursor-pointer">
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-700 mb-1">点击或拖拽文件到这里</p>
                    <p className="text-sm text-slate-500">支持 CSV 格式</p>
                  </label>
                </div>
                {importFile && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-orange-600" />
                      <span className="text-sm text-slate-700">{importFile.name}</span>
                      <span className="text-xs text-slate-500">({(importFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button
                      onClick={() => {
                        setImportFile(null);
                        setImportPreview(null);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 文件预览 */}
              {importPreview && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">文件预览（前5行）</h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody>
                        {importPreview.map((row, rowIndex) => (
                          <tr key={rowIndex} className={rowIndex === 0 ? 'bg-slate-50' : ''}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className={`px-3 py-2 border-b border-slate-200 ${rowIndex === importPreview.length - 1 ? 'border-b-0' : ''}`}>
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
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-orange-900 mb-2">CSV 格式说明</h4>
                <div className="text-sm text-orange-800 space-y-1">
                  <p>• <code className="bg-orange-100 px-1 rounded">name</code>：项目名称（必填）</p>
                  <p>• <code className="bg-orange-100 px-1 rounded">description</code>：项目描述</p>
                  <p>• <code className="bg-orange-100 px-1 rounded">status</code>：状态（立项、进行中、已完成、已终止）</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => { 
                  setShowImportModal(false); 
                  setImportFile(null);
                  setImportPreview(null);
                }}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={creating || !importFile}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {creating ? (
                  <span className="flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
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
    </div>
  );
};

export default Rspage;
