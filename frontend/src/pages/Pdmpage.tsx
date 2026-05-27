import React, { useEffect, useState } from 'react';
import { 
  Package, Plus, Search, ChevronRight, 
  Factory, ClipboardList, TrendingUp, Activity, Loader2, X, Edit, Trash2, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  pdmApi, 
  ProductionProcess, 
  ProductionStep, 
  ProductionFormula, 
  ProductionBatch,
  CreateProductionProcessRequest,
  CreateProductionStepRequest,
  CreateProductionFormulaRequest,
  CreateProductionBatchRequest
} from '../api/pdm';

type TabType = 'processes' | 'steps' | 'formulas' | 'batches' | 'stats';

type ModalType = 'create' | 'edit' | null;

const Pdmpage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('processes');
  const [processes, setProcesses] = useState<ProductionProcess[]>([]);
  const [steps, setSteps] = useState<ProductionStep[]>([]);
  const [formulas, setFormulas] = useState<ProductionFormula[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
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
      'active': 'active',
      'inactive': 'inactive',
      'planning': 'planning',
      'in_progress': 'in_progress',
      'paused': 'paused',
      'completed': 'completed',
      'cancelled': 'cancelled'
    };
    return statusMap[status] || status;
  };

  const adaptProcess = (item: any): any => {
    return {
      ...item,
      version: item.version || '1.0'
    };
  };

  const adaptStep = (item: any): any => {
    return {
      ...item,
      sort_order: item.sort_order || item.order || 0,
      duration: item.duration || 0
    };
  };

  const adaptFormula = (item: any): any => {
    return {
      ...item,
      product_name: item.name || '',
      version: item.version || '1.0'
    };
  };

  const adaptBatch = (item: any): any => {
    return {
      ...item,
      quantity: item.planned_quantity || item.actual_quantity || 0,
      start_date: item.start_date || item.created_at,
      status: mapStatusToChinese(item.status)
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'processes') {
        const response = await pdmApi.listProcesses();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.processes && Array.isArray(data.processes)) {
            rawItems = data.processes;
          }
          const adapted = rawItems.map(item => adaptProcess(item));
          setProcesses(adapted);
        } else {
          setProcesses([]);
        }
      } else if (activeTab === 'steps') {
        const response = await pdmApi.listSteps();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.steps && Array.isArray(data.steps)) {
            rawItems = data.steps;
          }
          const adapted = rawItems.map(item => adaptStep(item));
          setSteps(adapted);
        } else {
          setSteps([]);
        }
      } else if (activeTab === 'formulas') {
        const response = await pdmApi.listFormulas();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.formulas && Array.isArray(data.formulas)) {
            rawItems = data.formulas;
          }
          const adapted = rawItems.map(item => adaptFormula(item));
          setFormulas(adapted);
        } else {
          setFormulas([]);
        }
      } else if (activeTab === 'batches') {
        const response = await pdmApi.listBatches();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.batches && Array.isArray(data.batches)) {
            rawItems = data.batches;
          }
          const adapted = rawItems.map(item => adaptBatch(item));
          setBatches(adapted);
        } else {
          setBatches([]);
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
      if (activeTab === 'processes') {
        const req: any = {
          process_no: formData.process_no || '',
          name: formData.name || '',
          description: formData.description || null,
          version: formData.version || '1.0',
          status: formData.status || 'active'
        };
        await pdmApi.createProcess(req);
      } else if (activeTab === 'steps') {
        const req: any = {
          step_no: formData.step_no || '',
          process_id: formData.process_id,
          name: formData.name || '',
          description: null,
          duration: null,
          equipment_required: null,
          sort_order: parseInt(formData.order || '0')
        };
        await pdmApi.createStep(req);
      } else if (activeTab === 'formulas') {
        const req: any = {
          formula_no: formData.formula_no || '',
          name: formData.name || '',
          description: null,
          version: formData.version || '1.0',
          process_id: null,
          status: formData.status || 'active'
        };
        await pdmApi.createFormula(req);
      } else if (activeTab === 'batches') {
        const req: any = {
          batch_no: formData.batch_no || '',
          product_name: '产品',
          formula_id: formData.formula_id || null,
          process_id: null,
          planned_quantity: parseFloat(formData.quantity || '0'),
          unit: formData.unit || null,
          status: formData.status || 'planning',
          operator: null,
          remarks: null
        };
        await pdmApi.createBatch(req);
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
      
      if (activeTab === 'processes') {
        const req: any = {
          process_no: formData.process_no || editingItem.process_no,
          name: formData.name || editingItem.name,
          description: formData.description || editingItem.description,
          version: formData.version || editingItem.version,
          status: formData.status || editingItem.status
        };
        await pdmApi.updateProcess(editingItem.id, req);
      } else if (activeTab === 'steps') {
        const req: any = {
          step_no: formData.step_no || editingItem.step_no,
          name: formData.name || editingItem.name,
          description: formData.description || editingItem.description,
          duration_hours: formData.duration_hours || editingItem.duration_hours,
          equipment_required: formData.equipment_required || editingItem.equipment_required,
          sort_order: formData.sort_order || editingItem.sort_order
        };
        await pdmApi.updateStep(editingItem.id, req);
      } else if (activeTab === 'formulas') {
        const req: any = {
          formula_no: formData.formula_no || editingItem.formula_no,
          name: formData.name || editingItem.name,
          description: formData.description || editingItem.description,
          version: formData.version || editingItem.version,
          status: formData.status || editingItem.status
        };
        await pdmApi.updateFormula(editingItem.id, req);
      } else if (activeTab === 'batches') {
        const req: any = {
          batch_no: formData.batch_no || editingItem.batch_no,
          status: formData.status || editingItem.status
        };
        await pdmApi.updateBatch(editingItem.id, req);
      }
      showNotification('success', '更新成功');
      resetModal();
      loadData();
    } catch (err) {
      showNotification('error', '更新失败');
      console.error('更新失败:', err);
    }
  };

  const safeProcesses = Array.isArray(processes) ? processes : [];
  const safeSteps = Array.isArray(steps) ? steps : [];
  const safeFormulas = Array.isArray(formulas) ? formulas : [];
  const safeBatches = Array.isArray(batches) ? batches : [];

  const handleDelete = async (id: string) => {
    try {
      if (activeTab === 'processes') {
        await pdmApi.deleteProcess(id);
      } else if (activeTab === 'steps') {
        await pdmApi.deleteStep(id);
      } else if (activeTab === 'formulas') {
        await pdmApi.deleteFormula(id);
      } else if (activeTab === 'batches') {
        await pdmApi.deleteBatch(id);
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
      parameters: item.parameters ? JSON.stringify(item.parameters, null, 2) : '',
      components: item.components ? JSON.stringify(item.components, null, 2) : ''
    });
    setShowModal(true);
  };

  const tabs = [
    { id: 'processes', label: '生产工艺', icon: Factory },
    { id: 'steps', label: '生产工序', icon: ClipboardList },
    { id: 'formulas', label: '生产配方', icon: Package },
    { id: 'batches', label: '生产批次', icon: Activity },
    { id: 'stats', label: '生产统计', icon: TrendingUp }
  ];

  const getCurrentData = () => {
    switch (activeTab) {
      case 'processes': return safeProcesses;
      case 'steps': return safeSteps;
      case 'formulas': return safeFormulas;
      case 'batches': return safeBatches;
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
    if (s.includes('active') || s.includes('completed') || s.includes('完成')) return 'bg-green-100 text-green-800';
    if (s.includes('inactive') || s.includes('cancelled') || s.includes('取消')) return 'bg-red-100 text-red-800';
    if (s.includes('planning') || s.includes('in_progress') || s.includes('进行中')) return 'bg-blue-100 text-blue-800';
    if (s.includes('paused') || s.includes('暂停')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">总工艺数</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{safeProcesses.length}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Factory className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">总配方数</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{safeFormulas.length}</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <Package className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">总批次</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{safeBatches.length}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Activity className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">已完成批次</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {safeBatches.filter(b => b.status === 'completed').length}
            </p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Check className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50">
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
              <h1 className="text-3xl font-bold text-gray-900">生产数据管理</h1>
              <p className="text-gray-500">管理生产工艺、工序、配方和批次</p>
            </div>
          </div>
          {activeTab !== 'stats' && (
            <button 
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              新建
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200 flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-teal-600 text-teal-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'stats' ? (
          renderStats()
        ) : (
          <>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {activeTab === 'processes' && (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">编号</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">描述</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </>
                      )}
                      {activeTab === 'steps' && (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">编号</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">工艺ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">顺序</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </>
                      )}
                      {activeTab === 'formulas' && (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">编号</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">产品</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">版本</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </>
                      )}
                      {activeTab === 'batches' && (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">编号</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">配方ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数量</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">开始日期</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredData.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        {activeTab === 'processes' && (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.process_no}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{item.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>{item.status}</span>
                            </td>
                          </>
                        )}
                        {activeTab === 'steps' && (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.step_no}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.process_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.sort_order}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>{item.status}</span>
                            </td>
                          </>
                        )}
                        {activeTab === 'formulas' && (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.formula_no}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.product_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.version}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>{item.status}</span>
                            </td>
                          </>
                        )}
                        {activeTab === 'batches' && (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.batch_no}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.formula_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity} {item.unit}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.start_date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>{item.status}</span>
                            </td>
                          </>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => openEditModal(item)}
                              className="text-teal-600 hover:text-teal-900"
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
          </>
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
                {activeTab === 'processes' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">编号</label>
                      <input 
                        type="text" 
                        value={formData.process_no || ''}
                        onChange={(e) => setFormData({...formData, process_no: e.target.value})}
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
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'steps' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">编号</label>
                      <input 
                        type="text" 
                        value={formData.step_no || ''}
                        onChange={(e) => setFormData({...formData, step_no: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">工艺ID</label>
                      <input 
                        type="text" 
                        value={formData.process_id || ''}
                        onChange={(e) => setFormData({...formData, process_id: e.target.value})}
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">顺序</label>
                      <input 
                        type="number" 
                        value={formData.order || ''}
                        onChange={(e) => setFormData({...formData, order: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">参数 (JSON)</label>
                      <textarea 
                        value={formData.parameters || ''}
                        onChange={(e) => setFormData({...formData, parameters: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                        rows={4}
                        placeholder='{"temperature": 100, "time": 30}'
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                      <select 
                        value={formData.status || ''}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'formulas' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">编号</label>
                      <input 
                        type="text" 
                        value={formData.formula_no || ''}
                        onChange={(e) => setFormData({...formData, formula_no: e.target.value})}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">产品</label>
                        <input 
                          type="text" 
                          value={formData.product_name || ''}
                          onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">版本</label>
                      <input 
                        type="text" 
                        value={formData.version || ''}
                        onChange={(e) => setFormData({...formData, version: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">成分 (JSON)</label>
                      <textarea 
                        value={formData.components || ''}
                        onChange={(e) => setFormData({...formData, components: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                        rows={4}
                        placeholder='[{"name": "材料A", "quantity": 100, "unit": "kg"}]'
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">操作说明</label>
                      <textarea 
                        value={formData.instructions || ''}
                        onChange={(e) => setFormData({...formData, instructions: e.target.value})}
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
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'batches' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">编号</label>
                      <input 
                        type="text" 
                        value={formData.batch_no || ''}
                        onChange={(e) => setFormData({...formData, batch_no: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">配方ID</label>
                      <input 
                        type="text" 
                        value={formData.formula_id || ''}
                        onChange={(e) => setFormData({...formData, formula_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                        <input 
                          type="number" 
                          value={formData.quantity || ''}
                          onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
                        <input 
                          type="text" 
                          value={formData.unit || ''}
                          onChange={(e) => setFormData({...formData, unit: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                      <select 
                        value={formData.status || ''}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="planning">planning</option>
                        <option value="in_progress">in_progress</option>
                        <option value="paused">paused</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                      </select>
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
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2"
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

export default Pdmpage;
