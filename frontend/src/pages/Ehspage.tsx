import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, Plus, Search, ChevronRight, 
  AlertCircle, ClipboardCheck, FileText, Activity,
  Loader2, X, Edit, Trash2, Check
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
  const [searchTerm, setSearchTerm] = useState('');

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

  const adaptItem = (item: any) => {
    if (item.status) {
      return { ...item, status: mapStatusToChinese(item.status) };
    }
    return item;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'hazards') {
        const response = await ehsApi.listHazards();
        if (response.success && response.data) {
          let data = response.data as any;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.hazards && Array.isArray(data.hazards)) {
            rawItems = data.hazards;
          } else {
            rawItems = [];
          }
          setHazards(rawItems.map(item => adaptItem(item)));
        } else {
          setHazards([]);
        }
      } else if (activeTab === 'checks') {
        const response = await ehsApi.listChecks();
        if (response.success && response.data) {
          let data = response.data as any;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.checks && Array.isArray(data.checks)) {
            rawItems = data.checks;
          } else {
            rawItems = [];
          }
          setChecks(rawItems.map(item => adaptItem(item)));
        } else {
          setChecks([]);
        }
      } else if (activeTab === 'plans') {
        const response = await ehsApi.listPlans();
        if (response.success && response.data) {
          let data = response.data as any;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.plans && Array.isArray(data.plans)) {
            rawItems = data.plans;
          } else {
            rawItems = [];
          }
          setPlans(rawItems.map(item => adaptItem(item)));
        } else {
          setPlans([]);
        }
      } else if (activeTab === 'drills') {
        const response = await ehsApi.listDrills();
        if (response.success && response.data) {
          let data = response.data as any;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.drills && Array.isArray(data.drills)) {
            rawItems = data.drills;
          } else {
            rawItems = [];
          }
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

  const handleDelete = async (id: string) => {
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

  const tabs = [
    { id: 'hazards', label: '危险源', icon: AlertCircle },
    { id: 'checks', label: '安全检查', icon: ClipboardCheck },
    { id: 'plans', label: '应急预案', icon: FileText },
    { id: 'drills', label: '演练记录', icon: Activity }
  ];

  const safeHazards = Array.isArray(hazards) ? hazards : [];
  const safeChecks = Array.isArray(checks) ? checks : [];
  const safePlans = Array.isArray(plans) ? plans : [];
  const safeDrills = Array.isArray(drills) ? drills : [];

  const getCurrentData = () => {
    switch (activeTab) {
      case 'hazards': return safeHazards;
      case 'checks': return safeChecks;
      case 'plans': return safePlans;
      case 'drills': return safeDrills;
      default: return [];
    }
  };

  const filteredData = getCurrentData().filter((item: any) => {
    const searchFields = Object.values(item).filter(v => typeof v === 'string').join(' ').toLowerCase();
    return searchFields.includes(searchTerm.toLowerCase());
  });

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="text-gray-500 hover:text-gray-700"
            >
              <ChevronRight className="w-6 h-6 rotate-180" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">环境健康安全</h1>
              <p className="text-gray-500">管理安全风险、检查和应急预案</p>
            </div>
          </div>
          <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            新建
          </button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {activeTab === 'hazards' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">编号</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类别</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">等级</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">位置</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </>
                  )}
                  {activeTab === 'checks' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">编号</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">检查人</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">位置</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">结果</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </>
                  )}
                  {activeTab === 'plans' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">编号</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">范围</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </>
                  )}
                  {activeTab === 'drills' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">编号</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">位置</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时长(h)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">参与人员</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {activeTab === 'hazards' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.hazard_no}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getLevelColor(item.level)}`}>{item.level}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>{item.status}</span>
                        </td>
                      </>
                    )}
                    {activeTab === 'checks' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.check_no}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.check_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.inspector}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.result}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>{item.status}</span>
                        </td>
                      </>
                    )}
                    {activeTab === 'plans' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.plan_no}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.plan_type}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{item.scope}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>{item.status}</span>
                        </td>
                      </>
                    )}
                    {activeTab === 'drills' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.drill_no}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.drill_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.duration_hours}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{item.participants?.join(', ')}</td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(item)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('确定要删除此项吗？')) {
                              handleDelete(item.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">暂无数据</p>
              </div>
            )}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {modalType === 'create' ? '新建' : '编辑'}
                </h3>
                <button onClick={resetModal} className="text-gray-400 hover:text-gray-500">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {activeTab === 'hazards' && (
                  <>
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
                    <div className="grid grid-cols-2 gap-4">
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">编号</label>
                      <input 
                        type="text" 
                        value={formData.check_no || ''}
                        onChange={(e) => setFormData({...formData, check_no: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">编号</label>
                      <input 
                        type="text" 
                        value={formData.plan_no || ''}
                        onChange={(e) => setFormData({...formData, plan_no: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
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

        {notification && (
          <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {notification.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Ehspage;
