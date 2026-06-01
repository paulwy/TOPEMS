import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, Plus, Search, ChevronRight, 
  AlertCircle, ClipboardCheck, FileText, Activity,
  Loader2, X, Edit, Trash2, Check, Download, Upload
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  ehsApi, 
  SafetyHazard, 
  SafetyCheck, 
  EmergencyPlan, 
  DrillRecord,
  CreateSafetyHazardRequest,
  CreateSafetyCheckRequest,
  CreateEmergencyPlanRequest,
  CreateDrillRecordRequest
} from '../api/ehs';
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';

type TabType = 'hazards' | 'checks' | 'plans' | 'drills';
type ModalType = 'create' | 'edit' | null;

const Ehspage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('hazards');
  const [hazards, setHazards] = useState<SafetyHazard[]>([]);
  const [checks, setChecks] = useState<SafetyCheck[]>([]);
  const [plans, setPlans] = useState<EmergencyPlan[]>([]);
  const [drills, setDrills] = useState<DrillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<{[key: string]: string}>({});
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const mapStatusToChinese = (status: string) => {
    const statusMap: Record<string, string> = {
      'active': '启用',
      'inactive': '禁用',
      'pending': '待处理',
      'in_progress': '进行中',
      'completed': '已完成',
      'closed': '已关闭',
      'identified': '已识别',
      'controlled': '已管控'
    };
    return statusMap[status] || status;
  };

  const adaptItem = (item: any) => ({
    ...item,
    status: mapStatusToChinese(item.status)
  });

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'hazards') {
        const response = await ehsApi.listHazards();
        if (response.success && response.data) {
          let data = response.data as any;
          let rawItems: any[] = Array.isArray(data) ? data : (data.hazards || []);
          setHazards(rawItems.map(item => adaptItem(item)));
        } else {
          setHazards([]);
        }
      } else if (activeTab === 'checks') {
        const response = await ehsApi.listChecks();
        if (response.success && response.data) {
          let data = response.data as any;
          let rawItems: any[] = Array.isArray(data) ? data : (data.checks || []);
          setChecks(rawItems.map(item => adaptItem(item)));
        } else {
          setChecks([]);
        }
      } else if (activeTab === 'plans') {
        const response = await ehsApi.listPlans();
        if (response.success && response.data) {
          let data = response.data as any;
          let rawItems: any[] = Array.isArray(data) ? data : (data.plans || []);
          setPlans(rawItems.map(item => adaptItem(item)));
        } else {
          setPlans([]);
        }
      } else if (activeTab === 'drills') {
        const response = await ehsApi.listDrills();
        if (response.success && response.data) {
          let data = response.data as any;
          let rawItems: any[] = Array.isArray(data) ? data : (data.drills || []);
          setDrills(rawItems.map(item => adaptItem(item)));
        } else {
          setDrills([]);
        }
      }
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const resetModal = () => {
    setShowModal(false);
    setModalType(null);
    setEditingItem(null);
    setFormData({});
  };

  const handleCreate = async () => {
    try {
      if (activeTab === 'hazards') {
        const req: CreateSafetyHazardRequest = {
          hazard_no: formData.hazard_no || '',
          name: formData.name || '',
          category: formData.category || '',
          level: formData.level || '中',
          description: formData.description || '',
          location: formData.location || '',
          control_measures: (formData.control_measures || '').split(',').map(s => s.trim()),
          status: formData.status || '已识别'
        };
        await ehsApi.createHazard(req);
      } else if (activeTab === 'checks') {
        const req: CreateSafetyCheckRequest = {
          check_no: formData.check_no || '',
          check_type: formData.check_type || '',
          inspector: formData.inspector || '',
          location: formData.location || '',
          result: formData.result || '',
          issues: (formData.issues || '').split(',').map(s => s.trim()),
          status: formData.status || '进行中'
        };
        await ehsApi.createCheck(req);
      } else if (activeTab === 'plans') {
        const req: CreateEmergencyPlanRequest = {
          plan_no: formData.plan_no || '',
          name: formData.name || '',
          plan_type: formData.plan_type || '',
          scope: formData.scope || '',
          trigger_conditions: formData.trigger_conditions || '',
          response_procedures: formData.response_procedures || '',
          responsible_persons: (formData.responsible_persons || '').split(',').map(s => s.trim()),
          contact_info: formData.contact_info || '',
          status: formData.status || '启用'
        };
        await ehsApi.createPlan(req);
      } else if (activeTab === 'drills') {
        const req: CreateDrillRecordRequest = {
          drill_no: formData.drill_no || '',
          plan_id: formData.plan_id,
          drill_name: formData.drill_name || '',
          participants: (formData.participants || '').split(',').map(s => s.trim()),
          duration_hours: parseFloat(formData.duration_hours || '1'),
          location: formData.location || '',
          summary: formData.summary || '',
          issues_found: formData.issues_found || '',
          improvements: formData.improvements || ''
        };
        await ehsApi.createDrill(req);
      }
      showNotification('success', '创建成功');
      resetModal();
      loadData();
    } catch (err) {
      showNotification('error', '创建失败');
      console.error('创建失败:', err);
    }
  };

  const handleEdit = async () => {
    try {
      if (!editingItem) return;
      
      if (activeTab === 'hazards') {
        const req: CreateSafetyHazardRequest = {
          hazard_no: formData.hazard_no || editingItem.hazard_no,
          name: formData.name || editingItem.name,
          category: formData.category || editingItem.category,
          level: formData.level || editingItem.level,
          description: formData.description || editingItem.description,
          location: formData.location || editingItem.location,
          control_measures: (formData.control_measures || editingItem.control_measures?.join(',')).split(',').map(s => s.trim()),
          status: formData.status || editingItem.status
        };
        await ehsApi.updateHazard(editingItem.id, req);
      } else if (activeTab === 'checks') {
        const req: CreateSafetyCheckRequest = {
          check_no: formData.check_no || editingItem.check_no,
          check_type: formData.check_type || editingItem.check_type,
          inspector: formData.inspector || editingItem.inspector,
          location: formData.location || editingItem.location,
          result: formData.result || editingItem.result,
          issues: (formData.issues || editingItem.issues?.join(',')).split(',').map(s => s.trim()),
          status: formData.status || editingItem.status
        };
        await ehsApi.updateCheck(editingItem.id, req);
      } else if (activeTab === 'plans') {
        const req: CreateEmergencyPlanRequest = {
          plan_no: formData.plan_no || editingItem.plan_no,
          name: formData.name || editingItem.name,
          plan_type: formData.plan_type || editingItem.plan_type,
          scope: formData.scope || editingItem.scope,
          trigger_conditions: formData.trigger_conditions || editingItem.trigger_conditions,
          response_procedures: formData.response_procedures || editingItem.response_procedures,
          responsible_persons: (formData.responsible_persons || editingItem.responsible_persons?.join(',')).split(',').map(s => s.trim()),
          contact_info: formData.contact_info || editingItem.contact_info,
          status: formData.status || editingItem.status
        };
        await ehsApi.updatePlan(editingItem.id, req);
      } else if (activeTab === 'drills') {
        const req: CreateDrillRecordRequest = {
          drill_no: formData.drill_no || editingItem.drill_no,
          plan_id: formData.plan_id || editingItem.plan_id,
          drill_name: formData.drill_name || editingItem.drill_name,
          participants: (formData.participants || editingItem.participants?.join(',')).split(',').map(s => s.trim()),
          duration_hours: parseFloat(formData.duration_hours || editingItem.duration_hours?.toString() || '1'),
          location: formData.location || editingItem.location,
          summary: formData.summary || editingItem.summary,
          issues_found: formData.issues_found || editingItem.issues_found,
          improvements: formData.improvements || editingItem.improvements
        };
        await ehsApi.updateDrill(editingItem.id, req);
      }
      showNotification('success', '更新成功');
      resetModal();
      loadData();
    } catch (err) {
      showNotification('error', '更新失败');
      console.error('更新失败:', err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除 "${name}" 吗？`)) return;
    
    try {
      if (activeTab === 'hazards') {
        await ehsApi.deleteHazard(id);
      } else if (activeTab === 'checks') {
        await ehsApi.deleteCheck(id);
      } else if (activeTab === 'plans') {
        await ehsApi.deletePlan(id);
      } else if (activeTab === 'drills') {
        await ehsApi.deleteDrill(id);
      }
      showNotification('success', '删除成功');
      loadData();
    } catch (err) {
      showNotification('error', '删除失败');
      console.error('删除失败:', err);
    }
  };

  const openCreateModal = () => {
    setModalType('create');
    setFormData({});
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setModalType('edit');
    setEditingItem(item);
    setFormData({
      ...item,
      control_measures: item.control_measures?.join(', '),
      issues: item.issues?.join(', '),
      responsible_persons: item.responsible_persons?.join(', '),
      participants: item.participants?.join(', ')
    });
    setShowModal(true);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      showNotification('error', '没有数据可导出');
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
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

  const handleExport = () => {
    const data = activeTab === 'hazards' ? hazards :
                 activeTab === 'checks' ? checks :
                 activeTab === 'plans' ? plans : drills;
    exportToCSV(data, `ehs-${activeTab}`);
  };

  const handleImport = () => {
    showNotification('success', '导入功能即将上线');
  };

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    const s = status.toLowerCase();
    if (s.includes('已') || s.includes('complete') || s.includes('pass')) return 'bg-green-100 text-green-800';
    if (s.includes('进行') || s.includes('process') || s.includes('pending')) return 'bg-blue-100 text-blue-800';
    if (s.includes('高') || s.includes('高风险') || s.includes('严重')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getLevelColor = (level: string) => {
    const l = level.toLowerCase();
    if (l.includes('高') || l.includes('critical')) return 'bg-red-100 text-red-800';
    if (l.includes('中') || l.includes('medium')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const hazardColumns: ColumnDef<SafetyHazard>[] = [
    { accessorKey: 'hazard_no', header: '编号' },
    { accessorKey: 'name', header: '名称' },
    { accessorKey: 'category', header: '类别' },
    { 
      accessorKey: 'level', 
      header: '等级',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(row.original.level)}`}>
          {row.original.level}
        </span>
      )
    },
    { accessorKey: 'location', header: '位置' },
    { 
      accessorKey: 'status', 
      header: '状态',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.original.status)}`}>
          {row.original.status}
        </span>
      )
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => openEditModal(row.original)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDelete(row.original.id, row.original.name)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const checkColumns: ColumnDef<SafetyCheck>[] = [
    { accessorKey: 'check_no', header: '编号' },
    { accessorKey: 'check_type', header: '类型' },
    { accessorKey: 'inspector', header: '检查人' },
    { accessorKey: 'location', header: '位置' },
    { accessorKey: 'result', header: '结果' },
    { 
      accessorKey: 'status', 
      header: '状态',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.original.status)}`}>
          {row.original.status}
        </span>
      )
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => openEditModal(row.original)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDelete(row.original.id, row.original.check_no)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const planColumns: ColumnDef<EmergencyPlan>[] = [
    { accessorKey: 'plan_no', header: '编号' },
    { accessorKey: 'name', header: '名称' },
    { accessorKey: 'plan_type', header: '类型' },
    { accessorKey: 'scope', header: '范围' },
    { 
      accessorKey: 'status', 
      header: '状态',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.original.status)}`}>
          {row.original.status}
        </span>
      )
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => openEditModal(row.original)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDelete(row.original.id, row.original.name)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const drillColumns: ColumnDef<DrillRecord>[] = [
    { accessorKey: 'drill_no', header: '编号' },
    { accessorKey: 'drill_name', header: '名称' },
    { accessorKey: 'location', header: '位置' },
    { accessorKey: 'duration_hours', header: '时长(h)' },
    { 
      accessorKey: 'participants', 
      header: '参与人员',
      cell: ({ row }) => (
        <span className="truncate max-w-[150px]" title={row.original.participants?.join(', ')}>
          {row.original.participants?.join(', ')}
        </span>
      )
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => openEditModal(row.original)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDelete(row.original.id, row.original.drill_name)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const tabs = [
    { id: 'hazards', label: '危险源', icon: AlertCircle },
    { id: 'checks', label: '安全检查', icon: ClipboardCheck },
    { id: 'plans', label: '应急预案', icon: FileText },
    { id: 'drills', label: '演练记录', icon: Activity }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
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
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">环境健康安全</h1>
                  <p className="text-xs text-slate-500">EHS Management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleImport}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>导入</span>
              </button>
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>导出</span>
              </button>
              <button
                onClick={openCreateModal}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>新建</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {notification && (
        <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' && <Check className="w-5 h-5" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 bg-white rounded-lg shadow-sm p-1 flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {activeTab === 'hazards' && '危险源列表'}
                {activeTab === 'checks' && '安全检查记录'}
                {activeTab === 'plans' && '应急预案列表'}
                {activeTab === 'drills' && '演练记录'}
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索..."
                  className="w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="p-4">
            {activeTab === 'hazards' && (
              <DataTable
                columns={hazardColumns}
                data={hazards}
                searchKey="name"
                searchPlaceholder="搜索危险源名称..."
                loading={loading}
                exportFileName="ehs-hazards"
              />
            )}
            {activeTab === 'checks' && (
              <DataTable
                columns={checkColumns}
                data={checks}
                searchKey="check_no"
                searchPlaceholder="搜索检查编号..."
                loading={loading}
                exportFileName="ehs-checks"
              />
            )}
            {activeTab === 'plans' && (
              <DataTable
                columns={planColumns}
                data={plans}
                searchKey="name"
                searchPlaceholder="搜索预案名称..."
                loading={loading}
                exportFileName="ehs-plans"
              />
            )}
            {activeTab === 'drills' && (
              <DataTable
                columns={drillColumns}
                data={drills}
                searchKey="drill_name"
                searchPlaceholder="搜索演练名称..."
                loading={loading}
                exportFileName="ehs-drills"
              />
            )}
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalType === 'create' ? '新建' : '编辑'}
                {activeTab === 'hazards' && '危险源'}
                {activeTab === 'checks' && '安全检查'}
                {activeTab === 'plans' && '应急预案'}
                {activeTab === 'drills' && '演练记录'}
              </h3>
              <button onClick={resetModal} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {activeTab === 'hazards' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">编号</label>
                      <input 
                        type="text" 
                        value={formData.hazard_no || ''}
                        onChange={(e) => setFormData({...formData, hazard_no: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                      <input 
                        type="text" 
                        value={formData.name || ''}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">类别</label>
                      <input 
                        type="text" 
                        value={formData.category || ''}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">等级</label>
                      <select 
                        value={formData.level || ''}
                        onChange={(e) => setFormData({...formData, level: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="低">低</option>
                        <option value="中">中</option>
                        <option value="高">高</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">位置</label>
                    <input 
                      type="text" 
                      value={formData.location || ''}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">控制措施 (逗号分隔)</label>
                    <textarea 
                      value={formData.control_measures || ''}
                      onChange={(e) => setFormData({...formData, control_measures: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                    <textarea 
                      value={formData.description || ''}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                    <select 
                      value={formData.status || ''}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="已识别">已识别</option>
                      <option value="已管控">已管控</option>
                      <option value="已关闭">已关闭</option>
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'checks' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">编号</label>
                      <input 
                        type="text" 
                        value={formData.check_no || ''}
                        onChange={(e) => setFormData({...formData, check_no: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                      <input 
                        type="text" 
                        value={formData.check_type || ''}
                        onChange={(e) => setFormData({...formData, check_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">检查人</label>
                      <input 
                        type="text" 
                        value={formData.inspector || ''}
                        onChange={(e) => setFormData({...formData, inspector: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">位置</label>
                      <input 
                        type="text" 
                        value={formData.location || ''}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">结果</label>
                    <input 
                      type="text" 
                      value={formData.result || ''}
                      onChange={(e) => setFormData({...formData, result: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">发现问题 (逗号分隔)</label>
                    <textarea 
                      value={formData.issues || ''}
                      onChange={(e) => setFormData({...formData, issues: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                    <select 
                      value={formData.status || ''}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="进行中">进行中</option>
                      <option value="已完成">已完成</option>
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'plans' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">编号</label>
                      <input 
                        type="text" 
                        value={formData.plan_no || ''}
                        onChange={(e) => setFormData({...formData, plan_no: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                      <input 
                        type="text" 
                        value={formData.name || ''}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                      <input 
                        type="text" 
                        value={formData.plan_type || ''}
                        onChange={(e) => setFormData({...formData, plan_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">范围</label>
                    <textarea 
                      value={formData.scope || ''}
                      onChange={(e) => setFormData({...formData, scope: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">触发条件</label>
                    <textarea 
                      value={formData.trigger_conditions || ''}
                      onChange={(e) => setFormData({...formData, trigger_conditions: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">响应程序</label>
                    <textarea 
                      value={formData.response_procedures || ''}
                      onChange={(e) => setFormData({...formData, response_procedures: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">负责人 (逗号分隔)</label>
                    <input 
                      type="text" 
                      value={formData.responsible_persons || ''}
                      onChange={(e) => setFormData({...formData, responsible_persons: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">联系方式</label>
                    <input 
                      type="text" 
                      value={formData.contact_info || ''}
                      onChange={(e) => setFormData({...formData, contact_info: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                    <select 
                      value={formData.status || ''}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="启用">启用</option>
                      <option value="禁用">禁用</option>
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'drills' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">编号</label>
                      <input 
                        type="text" 
                        value={formData.drill_no || ''}
                        onChange={(e) => setFormData({...formData, drill_no: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">演练名称</label>
                      <input 
                        type="text" 
                        value={formData.drill_name || ''}
                        onChange={(e) => setFormData({...formData, drill_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">位置</label>
                      <input 
                        type="text" 
                        value={formData.location || ''}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">时长 (小时)</label>
                      <input 
                        type="number" 
                        value={formData.duration_hours || ''}
                        onChange={(e) => setFormData({...formData, duration_hours: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">参与人员 (逗号分隔)</label>
                    <input 
                      type="text" 
                      value={formData.participants || ''}
                      onChange={(e) => setFormData({...formData, participants: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">总结</label>
                    <textarea 
                      value={formData.summary || ''}
                      onChange={(e) => setFormData({...formData, summary: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">发现问题</label>
                    <textarea 
                      value={formData.issues_found || ''}
                      onChange={(e) => setFormData({...formData, issues_found: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">改进措施</label>
                    <textarea 
                      value={formData.improvements || ''}
                      onChange={(e) => setFormData({...formData, improvements: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button 
                onClick={resetModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button 
                onClick={modalType === 'create' ? handleCreate : handleEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {modalType === 'create' ? '创建' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ehspage;