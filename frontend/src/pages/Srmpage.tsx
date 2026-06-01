import React, { useEffect, useState } from 'react';
import { 
  Users, Plus, Search, ChevronRight, 
  Star, ClipboardList, TrendingUp, Loader2, X, Edit, Trash2, Check, Download, Upload
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
import { DataTable } from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';

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

  const adaptSupplier = (item: any): any => ({
    ...item,
    supplier_no: item.supplier_no || item.supplierNo || '',
    contact_phone: item.phone || item.contactPhone || item.contact_phone || '',
    status: mapStatusToChinese(item.status)
  });

  const mapStatusToEnglish = (status: string): string => {
    const statusMap: Record<string, string> = {
      '启用': 'active',
      '禁用': 'inactive',
      '待处理': 'pending',
      '已完成': 'completed',
      '已交付': 'delivered',
      '已取消': 'cancelled',
      '处理中': 'processing'
    };
    return statusMap[status] || status;
  };

  const adaptEvaluation = (item: any): any => ({
    ...item,
    eval_no: item.evaluation_no || item.evalNo || '',
    eval_date: item.evaluation_date || item.evalDate || item.updated_at,
    evaluation_no: item.evaluation_no || item.evalNo || '',
    evaluation_date: item.evaluation_date || item.evalDate || item.updated_at,
    status: mapStatusToChinese(item.status)
  });

  const adaptOrder = (item: any): any => ({
    ...item,
    po_no: item.po_no || item.orderNo || '',
    delivery_date: item.expected_date || item.deliveryDate || item.delivery_date,
    expected_date: item.expected_date || item.deliveryDate || item.delivery_date,
    status: mapStatusToChinese(item.status)
  });

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'suppliers') {
        const response = await srmApi.listSuppliers();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = Array.isArray(data) ? data : (data.suppliers || []);
          setSuppliers(rawItems.map(item => adaptSupplier(item)));
        } else {
          setSuppliers([]);
        }
      } else if (activeTab === 'evaluations') {
        const response = await srmApi.listEvaluations();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = Array.isArray(data) ? data : (data.evaluations || []);
          setEvaluations(rawItems.map(item => adaptEvaluation(item)));
        } else {
          setEvaluations([]);
        }
      } else if (activeTab === 'orders') {
        const response = await srmApi.listPurchaseOrders();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = Array.isArray(data) ? data : (data.orders || []);
          setOrders(rawItems.map(item => adaptOrder(item)));
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
          status: mapStatusToEnglish(formData.status || 'active'),
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
          status: mapStatusToEnglish(formData.status || editingItem.status),
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

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除 "${name}" 吗？`)) return;
    
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
      contact_phone: item.contact_phone || item.phone,
      items: item.items ? JSON.stringify(item.items) : ''
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
    const data = activeTab === 'suppliers' ? suppliers :
                 activeTab === 'evaluations' ? evaluations : orders;
    exportToCSV(data, `srm-${activeTab}`);
  };

  const handleImport = () => {
    showNotification('success', '导入功能即将上线');
  };

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

  const supplierColumns: ColumnDef<Supplier>[] = [
    { accessorKey: 'supplier_no', header: '编号' },
    { accessorKey: 'name', header: '名称' },
    { accessorKey: 'contact_person', header: '联系人' },
    { accessorKey: 'contact_phone', header: '电话' },
    { accessorKey: 'category', header: '类别' },
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
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
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

  const evaluationColumns: ColumnDef<SupplierEvaluation>[] = [
    { accessorKey: 'evaluation_no', header: '编号' },
    { accessorKey: 'supplier_id', header: '供应商ID' },
    { 
      accessorKey: 'overall_score', 
      header: '综合评分',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(row.original.overall_score)}`}>
          {row.original.overall_score}
        </span>
      )
    },
    { 
      accessorKey: 'evaluation_date', 
      header: '评估日期',
      cell: ({ row }) => (
        <span>{new Date(row.original.evaluation_date).toLocaleDateString()}</span>
      )
    },
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
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDelete(row.original.id, row.original.evaluation_no)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const orderColumns: ColumnDef<PurchaseOrder>[] = [
    { accessorKey: 'po_no', header: '编号' },
    { accessorKey: 'supplier_id', header: '供应商ID' },
    { 
      accessorKey: 'total_amount', 
      header: '总金额',
      cell: ({ row }) => (
        <span>¥{row.original.total_amount?.toFixed(2)}</span>
      )
    },
    { 
      accessorKey: 'expected_date', 
      header: '交付日期',
      cell: ({ row }) => (
        <span>{new Date(row.original.expected_date).toLocaleDateString()}</span>
      )
    },
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
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDelete(row.original.id, row.original.po_no)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const tabs = [
    { id: 'suppliers', label: '供应商', icon: Users },
    { id: 'evaluations', label: '供应商评估', icon: Star },
    { id: 'orders', label: '采购订单', icon: ClipboardList }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
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
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">供应商关系管理</h1>
                  <p className="text-xs text-slate-500">Supplier Relationship Management</p>
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
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
                    ? 'bg-purple-600 text-white'
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
                {activeTab === 'suppliers' && '供应商列表'}
                {activeTab === 'evaluations' && '供应商评估记录'}
                {activeTab === 'orders' && '采购订单列表'}
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
            {activeTab === 'suppliers' && (
              <DataTable
                columns={supplierColumns}
                data={suppliers}
                searchKey="name"
                searchPlaceholder="搜索供应商名称..."
                loading={loading}
                exportFileName="srm-suppliers"
              />
            )}
            {activeTab === 'evaluations' && (
              <DataTable
                columns={evaluationColumns}
                data={evaluations}
                searchKey="eval_no"
                searchPlaceholder="搜索评估编号..."
                loading={loading}
                exportFileName="srm-evaluations"
              />
            )}
            {activeTab === 'orders' && (
              <DataTable
                columns={orderColumns}
                data={orders}
                searchKey="po_no"
                searchPlaceholder="搜索订单编号..."
                loading={loading}
                exportFileName="srm-orders"
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
                {activeTab === 'suppliers' && '供应商'}
                {activeTab === 'evaluations' && '供应商评估'}
                {activeTab === 'orders' && '采购订单'}
              </h3>
              <button onClick={resetModal} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {activeTab === 'suppliers' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
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
                      <option value="启用">启用</option>
                      <option value="禁用">禁用</option>
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
    </div>
  );
};

export default Srmpage;