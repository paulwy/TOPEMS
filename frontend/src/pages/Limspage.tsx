import React, { useEffect, useState, useCallback } from 'react';
import { 
  ClipboardList, Plus, Search, Clock, ChevronRight, 
  Beaker, Edit, Trash2, Loader2, X, CheckCircle, Filter,
  Play, FileText, ClipboardCheck, Download, Upload
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { limsApi, Sample, CreateSampleRequest, InspectionProcess, InspectionTask, InspectionRecord, CreateInspectionTaskRequest, CreateInspectionRecordRequest, BatchCreateSamplesRequest, BatchDeleteSamplesRequest, BatchOperationResult } from '../api/lims';
import { ModuleGate } from '../components/PermissionGate';
import { MODULES } from '../config/permissions';

const Limspage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'samples' | 'processes' | 'tasks'>('samples');
  const [samples, setSamples] = useState<Sample[]>([]);
  const [processes, setProcesses] = useState<InspectionProcess[]>([]);
  const [tasks, setTasks] = useState<InspectionTask[]>([]);
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<InspectionProcess | null>(null);
  const [selectedTask, setSelectedTask] = useState<InspectionTask | null>(null);
  const [selectedTaskRecords, setSelectedTaskRecords] = useState<InspectionRecord[]>([]);
  const [formData, setFormData] = useState<CreateSampleRequest>({
    name: '',
    description: '',
    status: '待测试'
  });
  const [taskFormData, setTaskFormData] = useState<CreateInspectionTaskRequest>({
    sample_id: '',
    process_id: '',
    inspector: ''
  });
  const [recordFormData, setRecordFormData] = useState<CreateInspectionRecordRequest>({
    task_id: '',
    step_id: '',
    step_name: '',
    result: '',
    conclusion: '',
    inspector: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [selectedSampleIds, setSelectedSampleIds] = useState<Set<string>>(new Set());
  const [showBatchCreateModal, setShowBatchCreateModal] = useState(false);
  const [batchCreateData, setBatchCreateData] = useState<CreateSampleRequest[]>([
    { name: '', description: '', status: '待测试' }
  ]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<string[][] | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSamples(),
        loadProcesses(),
        loadTasks()
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 数据适配函数：处理后端返回的数据字段与前端期望不匹配的问题
  const adaptSample = (s: any): Sample => {
    return {
      ...s,
      // 确保字段兼容
      received_date: s.received_date || s.created_at
    };
  };

  const adaptProcess = (p: any): InspectionProcess => {
    return {
      ...p
    };
  };

  const adaptTask = (t: any): InspectionTask => {
    return {
      ...t,
      // 状态映射：后端英文状态映射到前端中文
      status: mapStatusToChinese(t.status)
    };
  };

  const mapStatusToChinese = (status: string): string => {
    const statusMap: Record<string, string> = {
      'pending': '待测试',
      'in_progress': '进行中',
      'completed': '已完成',
      'cancelled': '已终止',
      'received': '待测试'
    };
    return statusMap[status] || status;
  };

  const loadSamples = async () => {
    try {
      const response = await limsApi.listSamples();
      if (response.success && response.data) {
        // 检查数据格式，兼容不同的响应结构
        let sampleData = response.data as any;
        let rawSamples: any[] = [];
        
        if (Array.isArray(sampleData)) {
          rawSamples = sampleData;
        } else if (sampleData.samples && Array.isArray(sampleData.samples)) {
          rawSamples = sampleData.samples;
        }
        
        // 适配数据
        const adaptedSamples = rawSamples.map(s => adaptSample(s));
        setSamples(adaptedSamples);
      } else {
        setSamples([]);
      }
    } catch (err) {
      console.error('加载样品失败:', err);
      setSamples([]);
    }
  };

  const loadProcesses = async () => {
    try {
      const response = await limsApi.listProcesses();
      if (response.success && response.data) {
        // 检查数据格式，兼容不同的响应结构
        let processData = response.data as any;
        let rawProcesses: any[] = [];
        
        if (Array.isArray(processData)) {
          rawProcesses = processData;
        } else if (processData.processes && Array.isArray(processData.processes)) {
          rawProcesses = processData.processes;
        }
        
        // 适配数据
        const adaptedProcesses = rawProcesses.map(p => adaptProcess(p));
        setProcesses(adaptedProcesses);
      } else {
        setProcesses([]);
      }
    } catch (err) {
      console.error('加载检验流程失败:', err);
      setProcesses([]);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await limsApi.listTasks();
      if (response.success && response.data) {
        // 检查数据格式，兼容不同的响应结构
        let taskData = response.data as any;
        let rawTasks: any[] = [];
        
        if (Array.isArray(taskData)) {
          rawTasks = taskData;
        } else if (taskData.tasks && Array.isArray(taskData.tasks)) {
          rawTasks = taskData.tasks;
        }
        
        // 适配数据
        const adaptedTasks = rawTasks.map(t => adaptTask(t));
        setTasks(adaptedTasks);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error('加载检验任务失败:', err);
      setTasks([]);
    }
  };

  const loadTaskRecords = async (taskId: string) => {
    try {
      const response = await limsApi.listRecordsByTask(taskId);
      if (response.success && response.data) {
        // 检查数据格式，兼容不同的响应结构
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
      console.error('加载检验记录失败:', err);
      setSelectedTaskRecords([]);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      showNotification('error', '请输入样品名称');
      return;
    }

    try {
      setCreating(true);
      const response = await limsApi.createSample(formData);
      if (response.success) {
        showNotification('success', '样品创建成功');
        setShowModal(false);
        setFormData({ name: '', description: '', status: '待测试' });
        loadSamples();
      } else {
        showNotification('error', response.message || '创建失败');
      }
    } catch (err) {
      showNotification('error', '创建样品失败');
      console.error('创建样品失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个样品吗？')) return;

    try {
      const response = await limsApi.deleteSample(id);
      if (response.success) {
        showNotification('success', '样品删除成功');
        loadSamples();
      } else {
        showNotification('error', response.message || '删除失败');
      }
    } catch (err) {
      showNotification('error', '删除样品失败');
      console.error('删除样品失败:', err);
    }
  };

  const handleEdit = async () => {
    if (!formData.name.trim()) {
      showNotification('error', '请输入样品名称');
      return;
    }

    try {
      setCreating(true);
      const response = await limsApi.updateSample(selectedSample!.id, formData);
      if (response.success) {
        showNotification('success', '样品更新成功');
        setShowModal(false);
        setIsEditing(false);
        setFormData({ name: '', description: '', status: '待测试' });
        loadSamples();
      } else {
        showNotification('error', response.message || '更新失败');
      }
    } catch (err) {
      showNotification('error', '更新样品失败');
      console.error('更新样品失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (sample: Sample) => {
    setSelectedSample(sample);
    setFormData({
      name: sample.name,
      description: sample.description,
      status: sample.status
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
      sample_id: sample?.id || '',
      process_id: process?.id || '',
      inspector: ''
    });
    setShowTaskModal(true);
  };

  const openRecordModal = (task: InspectionTask) => {
    const process = processes.find(p => p.id === task.process_id);
    const currentStepObj = process?.steps.find((_, idx) => idx + 1 === task.current_step);
    
    setRecordFormData({
      task_id: task.id,
      step_id: currentStepObj?.id || '',
      step_name: currentStepObj?.name || '',
      result: '',
      conclusion: '',
      inspector: ''
    });
    setShowRecordModal(true);
  };

  const handleCreateTask = async () => {
    if (!taskFormData.sample_id || !taskFormData.process_id || !taskFormData.inspector.trim()) {
      showNotification('error', '请填写完整信息');
      return;
    }

    try {
      setCreating(true);
      const response = await limsApi.createTask(taskFormData);
      if (response.success) {
        showNotification('success', '检验任务创建成功');
        setShowTaskModal(false);
        loadTasks();
      } else {
        showNotification('error', response.message || '创建失败');
      }
    } catch (err) {
      showNotification('error', '创建检验任务失败');
      console.error('创建检验任务失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCompleteStep = async () => {
    if (!recordFormData.result.trim()) {
      showNotification('error', '请输入检验结果');
      return;
    }

    try {
      setCreating(true);
      const response = await limsApi.completeStep(selectedTask!.id, recordFormData);
      if (response.success) {
        showNotification('success', '检验步骤完成');
        setShowRecordModal(false);
        loadTasks();
        if (selectedTask) {
          loadTaskRecords(selectedTask.id);
        }
      } else {
        showNotification('error', response.message || '操作失败');
      }
    } catch (err) {
      showNotification('error', '完成检验步骤失败');
      console.error('完成检验步骤失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const openTaskDetailModal = async (task: InspectionTask) => {
    setSelectedTask(task);
    await loadTaskRecords(task.id);
    setShowDetailModal(true);
  };

  // 确保所有数组都是安全的，避免 filter 错误
  const safeSamples = Array.isArray(samples) ? samples : [];
  const safeProcesses = Array.isArray(processes) ? processes : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeRecords = Array.isArray(records) ? records : [];

  const getSampleName = (sampleId: string) => {
    const sample = safeSamples.find(s => s.id === sampleId);
    return sample ? sample.name : '未知样品';
  };

  const getProcessName = (processId: string) => {
    const process = safeProcesses.find(p => p.id === processId);
    return process ? process.name : '未知流程';
  };

  const getCurrentStepName = (task: InspectionTask) => {
    const process = safeProcesses.find(p => p.id === task.process_id);
    if (!process) return '未知步骤';
    const step = process.steps[task.current_step - 1];
    return step ? step.name : '已完成';
  };

  const filteredSamples = safeSamples.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTasks = safeTasks.filter(t => 
    getSampleName(t.sample_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getProcessName(t.process_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 批量操作相关
  const toggleSampleSelect = useCallback((id: string) => {
    setSelectedSampleIds(prev => {
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
    setSelectedSampleIds(new Set(filteredSamples.map(s => s.id)));
  }, [filteredSamples]);

  const deselectAllSamples = useCallback(() => {
    setSelectedSampleIds(new Set());
  }, []);

  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除 ${selectedSampleIds.size} 个样品吗？`)) return;

    try {
      setCreating(true);
      const response = await limsApi.batchDeleteSamples({
        ids: Array.from(selectedSampleIds)
      });

      if (response.success) {
        const result = response.data!;
        showNotification('success', `批量删除完成：成功 ${result.success} 个，失败 ${result.failed} 个`);
        deselectAllSamples();
        loadSamples();
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
    setBatchCreateData(prev => [...prev, { name: '', description: '', status: '待测试' }]);
  };

  const removeBatchCreateItem = (index: number) => {
    setBatchCreateData(prev => prev.filter((_, i) => i !== index));
  };

  const updateBatchCreateItem = (index: number, field: keyof CreateSampleRequest, value: string) => {
    setBatchCreateData(prev => {
      const newData = [...prev];
      newData[index] = { ...newData[index], [field]: value };
      return newData;
    });
  };

  const handleBatchCreate = async () => {
    // 过滤掉没有名称的项
    const validSamples = batchCreateData.filter(item => item.name.trim() !== '');
    if (validSamples.length === 0) {
      showNotification('error', '请至少填写一个样品的名称');
      return;
    }

    try {
      setCreating(true);
      const response = await limsApi.batchCreateSamples({ samples: validSamples });

      if (response.success) {
        const result = response.data!;
        showNotification('success', `批量创建完成：成功 ${result.success} 个，失败 ${result.failed} 个`);
        setShowBatchCreateModal(false);
        setBatchCreateData([{ name: '', description: '', status: '待测试' }]);
        loadSamples();
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
      const blob = await limsApi.exportSamples();
      // 下载文件
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `samples_${new Date().toISOString().split('T')[0]}.csv`;
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
    const headers = ['name', 'description', 'status', 'project_id'];
    const sampleRow = ['样品1', '样品描述', '待测试', ''];
    const content = [headers, sampleRow].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'samples_template.csv';
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
      const response = await limsApi.importSamples(importFile);

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
        loadSamples();
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

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status) {
      case '进行中': return 'bg-blue-100 text-blue-700';
      case '已完成': return 'bg-green-100 text-green-700';
      case '已终止': return 'bg-red-100 text-red-700';
      case '待测试': return 'bg-yellow-100 text-yellow-700';
      case '测试中': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
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
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">检验管理</h1>
                  <p className="text-xs text-slate-500">Laboratory Information Management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {activeTab === 'samples' && (
                <>
                  <ModuleGate module={MODULES.LIMS} action="write" showDisabled={true}>
                    <button
                      onClick={() => setShowModal(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>新建样品</span>
                    </button>
                  </ModuleGate>
                  <ModuleGate module={MODULES.LIMS} action="write" showDisabled={true}>
                    <button
                      onClick={() => setShowBatchCreateModal(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>批量创建</span>
                    </button>
                  </ModuleGate>
                  <ModuleGate module={MODULES.LIMS} action="read" showDisabled={true}>
                    <button
                      onClick={handleExport}
                      disabled={creating}
                      className="flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>导出</span>
                    </button>
                  </ModuleGate>
                  <ModuleGate module={MODULES.LIMS} action="write" showDisabled={true}>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span>导入</span>
                    </button>
                  </ModuleGate>
                </>
              )}
              {activeTab === 'tasks' && (
                <button
                  onClick={() => openTaskModal()}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>新建任务</span>
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
        {/* Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-1 flex space-x-1">
          <button
            onClick={() => setActiveTab('samples')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'samples'
                ? 'bg-purple-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Beaker className="w-5 h-5" />
              <span>样品管理</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('processes')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'processes'
                ? 'bg-purple-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>检验流程</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'tasks'
                ? 'bg-purple-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <ClipboardCheck className="w-5 h-5" />
              <span>检验任务</span>
            </div>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">
                  {activeTab === 'samples' ? '样品总数' : activeTab === 'processes' ? '流程总数' : '任务总数'}
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {activeTab === 'samples' ? safeSamples.length : activeTab === 'processes' ? safeProcesses.length : safeTasks.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                {activeTab === 'samples' ? (
                  <Beaker className="w-6 h-6 text-purple-600" />
                ) : activeTab === 'processes' ? (
                  <FileText className="w-6 h-6 text-purple-600" />
                ) : (
                  <ClipboardCheck className="w-6 h-6 text-purple-600" />
                )}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">进行中</p>
                <p className="text-3xl font-bold text-blue-600">
                  {activeTab === 'tasks' ? safeTasks.filter(t => t.status === '进行中').length : '-'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">已完成</p>
                <p className="text-3xl font-bold text-green-600">
                  {activeTab === 'tasks' ? safeTasks.filter(t => t.status === '已完成').length : '-'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'samples' && (
          /* Samples List */
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm">
              {/* 批量操作栏 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center space-x-3">
                  <label className="flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedSampleIds.size === filteredSamples.length && filteredSamples.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAllSamples();
                        } else {
                          deselectAllSamples();
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-slate-600">
                      {selectedSampleIds.size > 0 
                        ? `已选择 ${selectedSampleIds.size} 项` 
                        : '全部选择'}
                    </span>
                  </label>
                </div>
                {selectedSampleIds.size > 0 && (
                  <ModuleGate module={MODULES.LIMS} action="delete" showDisabled={true}>
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
                <h2 className="text-lg font-semibold text-slate-900">样品列表</h2>
              </div>
              <div className="divide-y divide-slate-200">
                {filteredSamples.length === 0 ? (
                  <div className="p-12 text-center">
                    <Beaker className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">暂无样品</p>
                  </div>
                ) : (
                  filteredSamples.map((sample) => (
                    <div key={sample.id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <label className="flex items-center cursor-pointer select-none pt-1">
                            <input
                              type="checkbox"
                              checked={selectedSampleIds.has(sample.id)}
                              onChange={() => toggleSampleSelect(sample.id)}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                          </label>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-slate-900">{sample.name}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sample.status)}`}>
                                {sample.status}
                              </span>
                            </div>
                            <p className="text-slate-600 mb-3">{sample.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-slate-500">
                              <span className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                接收日期: {new Date(sample.received_date).toLocaleDateString('zh-CN')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openDetailModal(sample)}
                            className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <span className="flex items-center">查看详情</span>
                          </button>
                          <button
                            onClick={() => openTaskModal(sample, undefined)}
                            className="px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg"
                          >
                            <span className="flex items-center"><Play className="w-4 h-4 mr-1" />发起检验</span>
                          </button>
                          <button
                            onClick={() => openEditModal(sample)}
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(sample.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
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
        )}

        {activeTab === 'processes' && (
          /* Processes List */
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">检验流程</h2>
              </div>
              <div className="divide-y divide-slate-200">
                {safeProcesses.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">暂无检验流程</p>
                  </div>
                ) : (
                  safeProcesses.map((process) => (
                    <div key={process.id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900 mb-2">{process.name}</h3>
                          <p className="text-slate-600 mb-4">{process.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {(process.steps || []).map((step, idx) => (
                              <div key={step.id} className="flex items-center space-x-2">
                                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-medium flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <span className="text-sm text-slate-700">{step.name}</span>
                                {idx < process.steps.length - 1 && (
                                  <span className="text-slate-300">→</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openTaskModal(undefined, process)}
                            className="px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg"
                          >
                            <span className="flex items-center"><Play className="w-4 h-4 mr-1" />使用此流程</span>
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

        {activeTab === 'tasks' && (
          /* Tasks List */
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">检验任务</h2>
              </div>
              <div className="divide-y divide-slate-200">
                {filteredTasks.length === 0 ? (
                  <div className="p-12 text-center">
                    <ClipboardCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">暂无检验任务</p>
                  </div>
                ) : (
                  filteredTasks.map((task) => (
                    <div key={task.id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900">{getSampleName(task.sample_id)}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          </div>
                          <p className="text-slate-600 mb-2">检验流程: {getProcessName(task.process_id)}</p>
                          <p className="text-sm text-purple-700 mb-3">当前步骤: {getCurrentStepName(task)}</p>
                          <div className="flex items-center space-x-4 text-sm text-slate-500">
                            <span>检验员: {task.inspector}</span>
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              开始: {new Date(task.started_at).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openTaskDetailModal(task)}
                            className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <span className="flex items-center">查看详情</span>
                          </button>
                          {task.status === '进行中' && (
                            <button
                              onClick={() => openRecordModal(task)}
                              className="px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg"
                            >
                              <span className="flex items-center"><CheckCircle className="w-4 h-4 mr-1" />完成步骤</span>
                            </button>
                          )}
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

      {/* Create/Edit Sample Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">{isEditing ? '编辑样品' : '新建样品'}</h3>
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
                  样品名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入样品名称"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  样品描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="请输入样品描述"
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  样品状态
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="待测试">待测试</option>
                  <option value="测试中">测试中</option>
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
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
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

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">新建检验任务</h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  样品 *
                </label>
                <select
                  value={taskFormData.sample_id}
                  onChange={(e) => setTaskFormData({ ...taskFormData, sample_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">请选择样品</option>
                  {safeSamples.map(sample => (
                    <option key={sample.id} value={sample.id}>{sample.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  检验流程 *
                </label>
                <select
                  value={taskFormData.process_id}
                  onChange={(e) => setTaskFormData({ ...taskFormData, process_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">请选择流程</option>
                  {safeProcesses.map(process => (
                    <option key={process.id} value={process.id}>{process.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  检验员 *
                </label>
                <input
                  type="text"
                  value={taskFormData.inspector}
                  onChange={(e) => setTaskFormData({ ...taskFormData, inspector: e.target.value })}
                  placeholder="请输入检验员姓名"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowTaskModal(false)}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateTask}
                disabled={creating}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {creating ? (
                  <span className="flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    创建中...
                  </span>
                ) : (
                  '创建任务'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Modal */}
      {showRecordModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">完成检验步骤</h3>
              <button
                onClick={() => setShowRecordModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  当前步骤
                </label>
                <p className="text-purple-700 font-medium">{recordFormData.step_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  检验结果 *
                </label>
                <textarea
                  value={recordFormData.result}
                  onChange={(e) => setRecordFormData({ ...recordFormData, result: e.target.value })}
                  placeholder="请输入检验结果"
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  结论
                </label>
                <textarea
                  value={recordFormData.conclusion}
                  onChange={(e) => setRecordFormData({ ...recordFormData, conclusion: e.target.value })}
                  placeholder="请输入检验结论"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  检验员 *
                </label>
                <input
                  type="text"
                  value={recordFormData.inspector}
                  onChange={(e) => setRecordFormData({ ...recordFormData, inspector: e.target.value })}
                  placeholder="请输入检验员姓名"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowRecordModal(false)}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCompleteStep}
                disabled={creating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {creating ? (
                  <span className="flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    处理中...
                  </span>
                ) : (
                  '完成步骤'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-900">检验任务详情</h3>
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
                    <h4 className="text-lg font-semibold text-slate-800">{getSampleName(selectedTask.sample_id)}</h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedTask.status)}`}>
                      {selectedTask.status}
                    </span>
                  </div>
                  <p className="text-slate-600 mb-2">检验流程: {getProcessName(selectedTask.process_id)}</p>
                  <p className="text-purple-700 font-medium">当前步骤: {getCurrentStepName(selectedTask)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">任务编号</p>
                    <p className="font-medium text-slate-800 font-mono text-sm">{selectedTask.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">检验员</p>
                    <p className="font-medium text-slate-800">{selectedTask.inspector}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">开始时间</p>
                    <p className="font-medium text-slate-800">{new Date(selectedTask.started_at).toLocaleString('zh-CN')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">完成时间</p>
                    <p className="font-medium text-slate-800">
                      {selectedTask.completed_at ? new Date(selectedTask.completed_at).toLocaleString('zh-CN') : '-'}
                    </p>
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold text-slate-800 mb-3">检验记录</h5>
                  {selectedTaskRecords.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">暂无检验记录</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedTaskRecords.map((record, idx) => (
                        <div key={record.id} className="p-4 bg-white border border-slate-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-purple-700">步骤 {idx + 1}: {record.step_name}</span>
                            <span className="text-sm text-slate-500">{new Date(record.recorded_at).toLocaleString('zh-CN')}</span>
                          </div>
                          <p className="text-slate-700 mb-2">结果: {record.result}</p>
                          {record.conclusion && (
                            <p className="text-sm text-green-700">结论: {record.conclusion}</p>
                          )}
                          <p className="text-sm text-slate-500 mt-2">检验员: {record.inspector}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
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

      {/* Batch Create Modal */}
      {showBatchCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">批量创建样品</h3>
              <button
                onClick={() => { 
                  setShowBatchCreateModal(false); 
                  setBatchCreateData([{ name: '', description: '', status: '待测试' }]);
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
                    <h4 className="font-medium text-slate-700">样品 {index + 1}</h4>
                    {batchCreateData.length > 1 && (
                      <button
                        onClick={() => removeBatchCreateItem(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        样品名称 *
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateBatchCreateItem(index, 'name', e.target.value)}
                        placeholder="请输入样品名称"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        状态
                      </label>
                      <select
                        value={item.status}
                        onChange={(e) => updateBatchCreateItem(index, 'status', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="待测试">待测试</option>
                        <option value="测试中">测试中</option>
                        <option value="已完成">已完成</option>
                        <option value="已终止">已终止</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      样品描述
                    </label>
                    <textarea
                      value={item.description}
                      onChange={(e) => updateBatchCreateItem(index, 'description', e.target.value)}
                      placeholder="请输入样品描述"
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addBatchCreateItem}
                className="flex items-center space-x-2 w-full justify-center py-3 border border-dashed border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>添加样品</span>
              </button>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => { 
                  setShowBatchCreateModal(false); 
                  setBatchCreateData([{ name: '', description: '', status: '待测试' }]);
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
              <h3 className="text-lg font-semibold text-slate-900">导入样品</h3>
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
                    id="file-upload"
                    onChange={handleImportFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-700 mb-1">点击或拖拽文件到这里</p>
                    <p className="text-sm text-slate-500">支持 CSV 格式</p>
                  </label>
                </div>
                {importFile && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-cyan-600" />
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">CSV 格式说明</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• <code className="bg-blue-100 px-1 rounded">name</code>：样品名称（必填）</p>
                  <p>• <code className="bg-blue-100 px-1 rounded">description</code>：样品描述</p>
                  <p>• <code className="bg-blue-100 px-1 rounded">status</code>：状态（待测试、测试中、已完成、已终止）</p>
                  <p>• <code className="bg-blue-100 px-1 rounded">project_id</code>：关联项目ID</p>
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
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50"
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

export default Limspage;
