import React, { useEffect, useState } from 'react';
import { 
  Users, Plus, Search, ChevronRight, 
  Star, ClipboardList, TrendingUp, Loader2, X, Edit, Trash2, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  srmApi, 
  Supplier, 
  SupplierEvaluation, 
  PurchaseOrder,
  CreateSupplierRequest,
  CreateSupplierEvaluationRequest,
  CreatePurchaseOrderRequest
} from '../api/srm';

type TabType = 'suppliers' | 'evaluations' | 'orders';

type ModalType = 'create' | 'edit' | null;

const Srmpage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [evaluations, setEvaluations] = useState<SupplierEvaluation[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
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
      'completed': '已完成',
      'delivered': '已交付',
      'cancelled': '已取消',
      'processing': '处理中'
    };
    return statusMap[status] || status;
  };

  const adaptSupplier = (item: any): any => {
    return {
      ...item,
      supplier_no: item.supplier_no || item.supplierNo || '',
      contact_phone: item.phone || item.contactPhone || item.contact_phone || '',
      status: mapStatusToChinese(item.status)
    };
  };

  const adaptEvaluation = (item: any): any => {
    return {
      ...item,
      eval_no: item.evaluation_no || item.evalNo || '',
      eval_date: item.evaluation_date || item.evalDate || item.updated_at,
      status: mapStatusToChinese(item.status)
    };
  };

  const adaptOrder = (item: any): any => {
    return {
      ...item,
      po_no: item.po_no || item.orderNo || '',
      delivery_date: item.expected_date || item.deliveryDate || item.delivery_date,
      status: mapStatusToChinese(item.status)
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'suppliers') {
        const response = await srmApi.listSuppliers();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.suppliers && Array.isArray(data.suppliers)) {
            rawItems = data.suppliers;
          }
          const adapted = rawItems.map(item => adaptSupplier(item));
          setSuppliers(adapted);
        } else {
          setSuppliers([]);
        }
      } else if (activeTab === 'evaluations') {
        const response = await srmApi.listEvaluations();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.evaluations && Array.isArray(data.evaluations)) {
            rawItems = data.evaluations;
          }
          const adapted = rawItems.map(item => adaptEvaluation(item));
          setEvaluations(adapted);
        } else {
          setEvaluations([]);
        }
      } else if (activeTab === 'orders') {
        const response = await srmApi.listPurchaseOrders();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.orders && Array.isArray(data.orders)) {
            rawItems = data.orders;
          }
          const adapted = rawItems.map(item => adaptOrder(item));
          setOrders(adapted);
        } else {
          setOrders([]);
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
      if (activeTab === 'suppliers') {
        const req: CreateSupplierRequest = {
          supplier_no: formData.supplier_no || '',
          name: formData.name || '',
          contact_person: formData.contact_person || '',
          phone: formData.contact_phone || '',
          email: formData.email || '',
          address: formData.address || '',
          category: formData.category || '',
          status: formData.status || 'active',
          risk_level: 'medium',
          legal_name: formData.name || '',
          tax_id: '',
          website: '',
          credit_rating: ''
        };
        await srmApi.createSupplier(req);
      } else if (activeTab === 'evaluations') {
        const req: CreateSupplierEvaluationRequest = {
          evaluation_no: formData.eval_no || '',
          supplier_id: formData.supplier_id,
          evaluator: '',
          quality_score: parseFloat(formData.quality_score || '0'),
          delivery_score: parseFloat(formData.delivery_score || '0'),
          service_score: parseFloat(formData.service_score || '0'),
          price_score: parseFloat(formData.price_score || '0'),
          overall_score: parseFloat(formData.overall_score || '0'),
          comments: formData.comments || '',
          status: formData.status || 'completed'
        };
        await srmApi.createEvaluation(req);
      } else if (activeTab === 'orders') {
        const req: CreatePurchaseOrderRequest = {
          po_no: formData.po_no || '',
          supplier_id: formData.supplier_id,
          expected_date: formData.delivery_date,
          total_amount: parseFloat(formData.total_amount || '0'),
          currency: 'CNY',
          status: formData.status || 'pending',
          remarks: formData.comments || ''
        };
        await srmApi.createPurchaseOrder(req);
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
      
      if (activeTab === 'suppliers') {
        const req: CreateSupplierRequest = {
          supplier_no: formData.supplier_no || editingItem.supplier_no,
          name: formData.name || editingItem.name,
          contact_person: formData.contact_person || editingItem.contact_person,
          phone: formData.contact_phone || editingItem.contact_phone || editingItem.phone,
          email: formData.email || editingItem.email,
          address: formData.address || editingItem.address,
          category: formData.category || editingItem.category,
          status: formData.status || editingItem.status,
          risk_level: 'medium',
          legal_name: formData.name || editingItem.name,
          tax_id: '',
          website: '',
          credit_rating: ''
        };
        await srmApi.updateSupplier(editingItem.id, req);
      } else if (activeTab === 'evaluations') {
        const req: CreateSupplierEvaluationRequest = {
          evaluation_no: formData.eval_no || editingItem.eval_no || editingItem.evaluation_no,
          supplier_id: formData.supplier_id || editingItem.supplier_id,
          evaluator: '',
          quality_score: parseFloat(formData.quality_score || editingItem.quality_score?.toString() || '0'),
          delivery_score: parseFloat(formData.delivery_score || editingItem.delivery_score?.toString() || '0'),
          service_score: parseFloat(formData.service_score || editingItem.service_score?.toString() || '0'),
          price_score: parseFloat(formData.price_score || editingItem.price_score?.toString() || '0'),
          overall_score: parseFloat(formData.overall_score || editingItem.overall_score?.toString() || '0'),
          comments: formData.comments || editingItem.comments,
          status: formData.status || editingItem.status
        };
        await srmApi.updateEvaluation(editingItem.id, req);
      } else if (activeTab === 'orders') {
        const req: CreatePurchaseOrderRequest = {
          po_no: formData.po_no || editingItem.po_no,
          supplier_id: formData.supplier_id || editingItem.supplier_id,
          expected_date: formData.delivery_date || editingItem.delivery_date,
          total_amount: parseFloat(formData.total_amount || editingItem.total_amount?.toString() || '0'),
          currency: 'CNY',
          status: formData.status || editingItem.status,
          remarks: formData.comments || editingItem.remarks
        };
        await srmApi.updatePurchaseOrder(editingItem.id, req);
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
      if (activeTab === 'suppliers') {
        await srmApi.deleteSupplier(id);
      } else if (activeTab === 'evaluations') {
        await srmApi.deleteEvaluation(id);
      } else if (activeTab === 'orders') {
        await srmApi.deletePurchaseOrder(id);
      }
      showNotification('success', '删除成功');
      loadData();
    } catch (err) {
      showNotification('error', '删除失败');
      console.error('删除失败:', err);
    }
  };

  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
  const safeEvaluations = Array.isArray(evaluations) ? evaluations : [];
  const safeOrders = Array.isArray(orders) ? orders : [];

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
      items: item.items ? JSON.stringify(item.items) : ''
    });
    setShowModal(true);
  };

  const tabs = [
    { id: 'suppliers', label: '供应商', icon: Users },
    { id: 'evaluations', label: '供应商评估', icon: Star },
    { id: 'orders', label: '采购订单', icon: ClipboardList }
  ];

  const getCurrentData = () => {
    switch (activeTab) {
      case 'suppliers': return safeSuppliers;
      case 'evaluations': return safeEvaluations;
      case 'orders': return safeOrders;
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
    if (s.includes('active') || s.includes('completed') || s.includes('delivered') || s.includes('启用') || s.includes('完成')) return 'bg-green-100 text-green-800';
    if (s.includes('pending') || s.includes('待处理')) return 'bg-yellow-100 text-yellow-800';
    if (s.includes('inactive') || s.includes('cancelled') || s.includes('禁用') || s.includes('取消')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
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
              <h1 className="text-3xl font-bold text-gray-900">供应商关系管理</h1>
              <p className="text-gray-500">管理供应商信息、评估和采购订单</p>
            </div>
          </div>
          <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
                    ? 'border-purple-600 text-purple-600' 
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {activeTab === 'suppliers' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">编号</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">联系人</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">电话</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类别</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </>
                  )}
                  {activeTab === 'evaluations' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">编号</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">供应商ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">综合评分</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">评估日期</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </>
                  )}
                  {activeTab === 'orders' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">编号</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">供应商ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">总金额</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">交付日期</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {activeTab === 'suppliers' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.supplier_no}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.contact_person}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.contact_phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>{item.status}</span>
                        </td>
                      </>
                    )}
                    {activeTab === 'evaluations' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.eval_no}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.supplier_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getScoreColor(item.overall_score)}`}>{item.overall_score}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.eval_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>{item.status}</span>
                        </td>
                      </>
                    )}
                    {activeTab === 'orders' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.po_no}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.supplier_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">¥{item.total_amount?.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.delivery_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}>{item.status}</span>
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(item)}
                          className="text-purple-600 hover:text-purple-900"
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
                {activeTab === 'suppliers' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">编号</label>
                      <input 
                        type="text" 
                        value={formData.supplier_no || ''}
                        onChange={(e) => setFormData({...formData, supplier_no: e.target.value})}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
                        <input 
                          type="text" 
                          value={formData.contact_person || ''}
                          onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
                        <input 
                          type="text" 
                          value={formData.contact_phone || ''}
                          onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                      <input 
                        type="email" 
                        value={formData.email || ''}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
                      <textarea 
                        value={formData.address || ''}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={2}
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

                {activeTab === 'evaluations' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">编号</label>
                      <input 
                        type="text" 
                        value={formData.eval_no || ''}
                        onChange={(e) => setFormData({...formData, eval_no: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">供应商ID</label>
                      <input 
                        type="text" 
                        value={formData.supplier_id || ''}
                        onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">质量评分</label>
                        <input 
                          type="number" 
                          value={formData.quality_score || ''}
                          onChange={(e) => setFormData({...formData, quality_score: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">交付评分</label>
                        <input 
                          type="number" 
                          value={formData.delivery_score || ''}
                          onChange={(e) => setFormData({...formData, delivery_score: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">服务评分</label>
                        <input 
                          type="number" 
                          value={formData.service_score || ''}
                          onChange={(e) => setFormData({...formData, service_score: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">价格评分</label>
                        <input 
                          type="number" 
                          value={formData.price_score || ''}
                          onChange={(e) => setFormData({...formData, price_score: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">综合评分</label>
                      <input 
                        type="number" 
                        value={formData.overall_score || ''}
                        onChange={(e) => setFormData({...formData, overall_score: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                      <textarea 
                        value={formData.comments || ''}
                        onChange={(e) => setFormData({...formData, comments: e.target.value})}
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
                        <option value="pending">pending</option>
                        <option value="completed">completed</option>
                      </select>
                    </div>
                  </>
                )}

                {activeTab === 'orders' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">编号</label>
                      <input 
                        type="text" 
                        value={formData.po_no || ''}
                        onChange={(e) => setFormData({...formData, po_no: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">供应商ID</label>
                      <input 
                        type="text" 
                        value={formData.supplier_id || ''}
                        onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">总金额</label>
                      <input 
                        type="number" 
                        value={formData.total_amount || ''}
                        onChange={(e) => setFormData({...formData, total_amount: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">交付日期</label>
                      <input 
                        type="date" 
                        value={formData.delivery_date?.split('T')[0] || ''}
                        onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">明细 (JSON)</label>
                      <textarea 
                        value={formData.items || ''}
                        onChange={(e) => setFormData({...formData, items: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                        rows={4}
                        placeholder='[{"name": "材料A", "quantity": 100, "price": 10}]'
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                      <select 
                        value={formData.status || ''}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="pending">pending</option>
                        <option value="processing">processing</option>
                        <option value="delivered">delivered</option>
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
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
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

export default Srmpage;
