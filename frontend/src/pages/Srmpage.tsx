import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  ChevronRight,
  Star,
  ClipboardList,
  FileText,
  TrendingUp,
  X,
  Edit,
  Trash2,
  Check,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Building2,
  Award,
  DollarSign,
  ScrollText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  srmApi,
  Supplier,
  SupplierEvaluation,
  PurchaseOrder,
  SupplierContract,
  SrmStatistics,
  SrmDetailedStatistics,
  CreateSupplierRequest,
  CreateSupplierEvaluationRequest,
  CreatePurchaseOrderRequest,
  CreateSupplierContractRequest,
} from '../api/srm';
import { DataTable } from '../components/DataTable';
import { MetricCard } from '../components/MetricCard';
import { StatsChart } from '../components/StatsChart';
import { ColumnDef } from '@tanstack/react-table';

type TabType = 'dashboard' | 'suppliers' | 'evaluations' | 'orders' | 'contracts';
type ModalType = 'create' | 'edit' | null;

const Srmpage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [evaluations, setEvaluations] = useState<SupplierEvaluation[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [contracts, setContracts] = useState<SupplierContract[]>([]);
  const [statistics, setStatistics] = useState<SrmDetailedStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const mapStatusToChinese = (status: string) => {
    const statusMap: Record<string, string> = {
      active: '启用',
      inactive: '禁用',
      pending: '待处理',
      completed: '已完成',
      delivered: '已交付',
      cancelled: '已取消',
      processing: '处理中',
      draft: '草稿',
      expired: '已过期',
    };
    return statusMap[status] || status;
  };

  const mapStatusToEnglish = (status: string): string => {
    const statusMap: Record<string, string> = {
      启用: 'active',
      禁用: 'inactive',
      待处理: 'pending',
      已完成: 'completed',
      已交付: 'delivered',
      已取消: 'cancelled',
      处理中: 'processing',
      草稿: 'draft',
      已过期: 'expired',
    };
    return statusMap[status] || status;
  };

  const adaptSupplier = (item: any): any => ({
    ...item,
    supplier_no: item.supplier_no || item.supplierNo || '',
    contact_phone: item.phone || item.contactPhone || item.contact_phone || '',
    status: mapStatusToChinese(item.status),
  });

  const adaptEvaluation = (item: any): any => ({
    ...item,
    eval_no: item.evaluation_no || item.evalNo || '',
    evaluation_no: item.evaluation_no || item.evalNo || '',
    evaluation_date: item.evaluation_date || item.evalDate || item.updated_at,
    status: mapStatusToChinese(item.status),
  });

  const adaptOrder = (item: any): any => ({
    ...item,
    po_no: item.po_no || item.orderNo || '',
    expected_date: item.expected_date || item.deliveryDate || item.delivery_date,
    status: mapStatusToChinese(item.status),
  });

  const adaptContract = (item: any): any => ({
    ...item,
    contract_no: item.contract_no || '',
    status: mapStatusToChinese(item.status),
  });

  const loadData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'dashboard') {
        const response = await srmApi.getDetailedStatistics();
        if (response.success && response.data) {
          setStatistics(response.data);
        }
      } else if (activeTab === 'suppliers') {
        const response = await srmApi.listSuppliers();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = Array.isArray(data) ? data : data.suppliers || [];
          setSuppliers(rawItems.map((item) => adaptSupplier(item)));
        } else {
          setSuppliers([]);
        }
      } else if (activeTab === 'evaluations') {
        const response = await srmApi.listEvaluations();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = Array.isArray(data) ? data : data.evaluations || [];
          setEvaluations(rawItems.map((item) => adaptEvaluation(item)));
        } else {
          setEvaluations([]);
        }
      } else if (activeTab === 'orders') {
        const response = await srmApi.listPurchaseOrders();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = Array.isArray(data) ? data : data.purchase_orders || [];
          setOrders(rawItems.map((item) => adaptOrder(item)));
        } else {
          setOrders([]);
        }
      } else if (activeTab === 'contracts') {
        const response = await srmApi.listContracts();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = Array.isArray(data) ? data : data.contracts || [];
          setContracts(rawItems.map((item) => adaptContract(item)));
        } else {
          setContracts([]);
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
          risk_level: formData.risk_level || 'medium',
          legal_name: formData.name || '',
          tax_id: formData.tax_id || '',
          website: formData.website || '',
          credit_rating: formData.credit_rating || '',
        };
        await srmApi.createSupplier(req);
      } else if (activeTab === 'evaluations') {
        const req: CreateSupplierEvaluationRequest = {
          evaluation_no: formData.evaluation_no || '',
          supplier_id: formData.supplier_id || suppliers[0]?.id || '',
          evaluator: formData.evaluator || '',
          quality_score: parseFloat(formData.quality_score || '0'),
          delivery_score: parseFloat(formData.delivery_score || '0'),
          service_score: parseFloat(formData.service_score || '0'),
          price_score: parseFloat(formData.price_score || '0'),
          overall_score: parseFloat(formData.overall_score || '0'),
          comments: formData.comments || '',
          status: mapStatusToEnglish(formData.status || 'completed'),
        };
        await srmApi.createEvaluation(req);
      } else if (activeTab === 'orders') {
        const req: CreatePurchaseOrderRequest = {
          po_no: formData.po_no || '',
          supplier_id: formData.supplier_id || suppliers[0]?.id || '',
          expected_date: formData.expected_date,
          total_amount: parseFloat(formData.total_amount || '0'),
          currency: 'CNY',
          status: mapStatusToEnglish(formData.status || 'pending'),
          remarks: formData.remarks || '',
        };
        await srmApi.createPurchaseOrder(req);
      } else if (activeTab === 'contracts') {
        const req: CreateSupplierContractRequest = {
          contract_no: formData.contract_no || '',
          supplier_id: formData.supplier_id || suppliers[0]?.id || '',
          supplier_name: formData.supplier_name || '',
          title: formData.title || '',
          contract_type: formData.contract_type || 'purchase',
          total_amount: parseFloat(formData.total_amount || '0'),
          currency: formData.currency || 'CNY',
          sign_date: formData.sign_date,
          start_date: formData.start_date,
          end_date: formData.end_date,
          status: mapStatusToEnglish(formData.status || 'active'),
          remarks: formData.remarks || '',
        };
        await srmApi.createContract(req);
      }
      showNotification('success', '创建成功');
      resetModal();
      loadData();
    } catch (err) {
      showNotification('error', '创建失败: ' + (err as Error).message);
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
          phone: formData.contact_phone || editingItem.phone,
          email: formData.email || editingItem.email,
          address: formData.address || editingItem.address,
          category: formData.category || editingItem.category,
          status: mapStatusToEnglish(formData.status || editingItem.status),
          risk_level: formData.risk_level || editingItem.risk_level || 'medium',
          legal_name: formData.legal_name || editingItem.legal_name || formData.name || editingItem.name,
          tax_id: formData.tax_id || editingItem.tax_id || '',
          website: formData.website || editingItem.website || '',
          credit_rating: formData.credit_rating || editingItem.credit_rating || '',
        };
        await srmApi.updateSupplier(editingItem.id, req);
      } else if (activeTab === 'evaluations') {
        const req: CreateSupplierEvaluationRequest = {
          evaluation_no: formData.evaluation_no || editingItem.evaluation_no,
          supplier_id: formData.supplier_id || editingItem.supplier_id,
          evaluator: formData.evaluator || editingItem.evaluator || '',
          quality_score: parseFloat(formData.quality_score || editingItem.quality_score?.toString() || '0'),
          delivery_score: parseFloat(formData.delivery_score || editingItem.delivery_score?.toString() || '0'),
          service_score: parseFloat(formData.service_score || editingItem.service_score?.toString() || '0'),
          price_score: parseFloat(formData.price_score || editingItem.price_score?.toString() || '0'),
          overall_score: parseFloat(formData.overall_score || editingItem.overall_score?.toString() || '0'),
          comments: formData.comments || editingItem.comments,
          status: mapStatusToEnglish(formData.status || editingItem.status),
        };
        await srmApi.updateEvaluation(editingItem.id, req);
      } else if (activeTab === 'orders') {
        const req: CreatePurchaseOrderRequest = {
          po_no: formData.po_no || editingItem.po_no,
          supplier_id: formData.supplier_id || editingItem.supplier_id,
          expected_date: formData.expected_date || editingItem.expected_date,
          total_amount: parseFloat(formData.total_amount || editingItem.total_amount?.toString() || '0'),
          currency: 'CNY',
          status: mapStatusToEnglish(formData.status || editingItem.status),
          remarks: formData.remarks || editingItem.remarks,
        };
        await srmApi.updatePurchaseOrder(editingItem.id, req);
      } else if (activeTab === 'contracts') {
        const req: CreateSupplierContractRequest = {
          contract_no: formData.contract_no || editingItem.contract_no,
          supplier_id: formData.supplier_id || editingItem.supplier_id,
          supplier_name: formData.supplier_name || editingItem.supplier_name || '',
          title: formData.title || editingItem.title,
          contract_type: formData.contract_type || editingItem.contract_type || 'purchase',
          total_amount: parseFloat(formData.total_amount || editingItem.total_amount?.toString() || '0'),
          currency: formData.currency || editingItem.currency || 'CNY',
          sign_date: formData.sign_date || editingItem.sign_date,
          start_date: formData.start_date || editingItem.start_date,
          end_date: formData.end_date || editingItem.end_date,
          status: mapStatusToEnglish(formData.status || editingItem.status),
          remarks: formData.remarks || editingItem.remarks,
        };
        await srmApi.updateContract(editingItem.id, req);
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
      } else if (activeTab === 'contracts') {
        await srmApi.deleteContract(id);
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
      expected_date: item.expected_date || item.delivery_date,
    });
    setShowModal(true);
  };

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    const s = status.toLowerCase();
    if (
      s.includes('active') ||
      s.includes('completed') ||
      s.includes('delivered') ||
      s.includes('启用') ||
      s.includes('完成')
    )
      return 'bg-green-100 text-green-800';
    if (s.includes('pending') || s.includes('待处理') || s.includes('processing') || s.includes('处理中'))
      return 'bg-yellow-100 text-yellow-800';
    if (
      s.includes('inactive') ||
      s.includes('cancelled') ||
      s.includes('禁用') ||
      s.includes('取消') ||
      s.includes('expired') ||
      s.includes('过期')
    )
      return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getScoreColor = (score: number | undefined) => {
    if (!score) return 'bg-gray-100 text-gray-800';
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const matchSearch =
      !searchQuery ||
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.supplier_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contact_person?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredEvaluations = evaluations.filter((e) => {
    const matchSearch = !searchQuery || e.evaluation_no?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredOrders = orders.filter((o) => {
    const matchSearch = !searchQuery || o.po_no?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredContracts = contracts.filter((c) => {
    const matchSearch =
      !searchQuery ||
      c.contract_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const supplierColumns: ColumnDef<any>[] = [
    { accessorKey: 'supplier_no', header: '编号' },
    { accessorKey: 'name', header: '名称' },
    { accessorKey: 'contact_person', header: '联系人' },
    { accessorKey: 'contact_phone', header: '电话' },
    { accessorKey: 'category', header: '类别' },
    {
      accessorKey: 'risk_level',
      header: '风险等级',
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.original.risk_level === 'low'
              ? 'bg-green-100 text-green-800'
              : row.original.risk_level === 'medium'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
          }`}
        >
          {row.original.risk_level === 'low' ? '低' : row.original.risk_level === 'medium' ? '中' : '高'}
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
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <button
            onClick={() => openEditModal(row.original)}
            className='p-2 text-purple-600 hover:bg-purple-50 rounded-lg'
          >
            <Edit className='w-4 h-4' />
          </button>
          <button
            onClick={() => handleDelete(row.original.id, row.original.name)}
            className='p-2 text-red-600 hover:bg-red-50 rounded-lg'
          >
            <Trash2 className='w-4 h-4' />
          </button>
        </div>
      ),
    },
  ];

  const evaluationColumns: ColumnDef<any>[] = [
    { accessorKey: 'evaluation_no', header: '编号' },
    {
      accessorKey: 'supplier_id',
      header: '供应商ID',
      cell: ({ row }) => <span className='text-xs'>{row.original.supplier_id?.slice(0, 8)}...</span>,
    },
    {
      accessorKey: 'overall_score',
      header: '综合评分',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(row.original.overall_score)}`}>
          {row.original.overall_score?.toFixed(1) || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'quality_score',
      header: '质量',
      cell: ({ row }) => <span>{row.original.quality_score?.toFixed(1) || '-'}</span>,
    },
    {
      accessorKey: 'delivery_score',
      header: '交付',
      cell: ({ row }) => <span>{row.original.delivery_score?.toFixed(1) || '-'}</span>,
    },
    {
      accessorKey: 'evaluation_date',
      header: '评估日期',
      cell: ({ row }) => <span>{new Date(row.original.evaluation_date).toLocaleDateString()}</span>,
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
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <button
            onClick={() => openEditModal(row.original)}
            className='p-2 text-purple-600 hover:bg-purple-50 rounded-lg'
          >
            <Edit className='w-4 h-4' />
          </button>
          <button
            onClick={() => handleDelete(row.original.id, row.original.evaluation_no)}
            className='p-2 text-red-600 hover:bg-red-50 rounded-lg'
          >
            <Trash2 className='w-4 h-4' />
          </button>
        </div>
      ),
    },
  ];

  const orderColumns: ColumnDef<any>[] = [
    { accessorKey: 'po_no', header: '订单号' },
    {
      accessorKey: 'supplier_id',
      header: '供应商ID',
      cell: ({ row }) => <span className='text-xs'>{row.original.supplier_id?.slice(0, 8)}...</span>,
    },
    {
      accessorKey: 'total_amount',
      header: '总金额',
      cell: ({ row }) => <span className='font-medium'>¥{row.original.total_amount?.toFixed(2) || '0.00'}</span>,
    },
    {
      accessorKey: 'expected_date',
      header: '预计交付',
      cell: ({ row }) => (
        <span>{row.original.expected_date ? new Date(row.original.expected_date).toLocaleDateString() : '-'}</span>
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
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <button
            onClick={() => openEditModal(row.original)}
            className='p-2 text-purple-600 hover:bg-purple-50 rounded-lg'
          >
            <Edit className='w-4 h-4' />
          </button>
          <button
            onClick={() => handleDelete(row.original.id, row.original.po_no)}
            className='p-2 text-red-600 hover:bg-red-50 rounded-lg'
          >
            <Trash2 className='w-4 h-4' />
          </button>
        </div>
      ),
    },
  ];

  const contractColumns: ColumnDef<any>[] = [
    { accessorKey: 'contract_no', header: '合同号' },
    { accessorKey: 'title', header: '合同标题' },
    { accessorKey: 'contract_type', header: '类型' },
    {
      accessorKey: 'total_amount',
      header: '金额',
      cell: ({ row }) => <span className='font-medium'>¥{row.original.total_amount?.toFixed(2) || '0.00'}</span>,
    },
    {
      accessorKey: 'start_date',
      header: '开始日期',
      cell: ({ row }) => (
        <span>{row.original.start_date ? new Date(row.original.start_date).toLocaleDateString() : '-'}</span>
      ),
    },
    {
      accessorKey: 'end_date',
      header: '结束日期',
      cell: ({ row }) => (
        <span>{row.original.end_date ? new Date(row.original.end_date).toLocaleDateString() : '-'}</span>
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
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <button
            onClick={() => openEditModal(row.original)}
            className='p-2 text-purple-600 hover:bg-purple-50 rounded-lg'
          >
            <Edit className='w-4 h-4' />
          </button>
          <button
            onClick={() => handleDelete(row.original.id, row.original.title)}
            className='p-2 text-red-600 hover:bg-red-50 rounded-lg'
          >
            <Trash2 className='w-4 h-4' />
          </button>
        </div>
      ),
    },
  ];

  const tabs = [
    { id: 'dashboard', label: '统计面板', icon: BarChart3 },
    { id: 'suppliers', label: '供应商', icon: Users },
    { id: 'evaluations', label: '供应商评估', icon: Star },
    { id: 'orders', label: '采购订单', icon: ClipboardList },
    { id: 'contracts', label: '供应商合同', icon: FileText },
  ];

  const getModalTitle = () => {
    const action = modalType === 'create' ? '新建' : '编辑';
    if (activeTab === 'suppliers') return action + '供应商';
    if (activeTab === 'evaluations') return action + '供应商评估';
    if (activeTab === 'orders') return action + '采购订单';
    if (activeTab === 'contracts') return action + '供应商合同';
    return action;
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-purple-50'>
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
                <div className='w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center'>
                  <Users className='w-6 h-6 text-white' />
                </div>
                <div>
                  <h1 className='text-xl font-bold text-slate-900'>供应商关系管理</h1>
                  <p className='text-xs text-slate-500'>Supplier Relationship Management</p>
                </div>
              </div>
            </div>
            <div className='flex items-center space-x-3'>
              <button
                onClick={openCreateModal}
                className='flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors'
              >
                <Plus className='w-4 h-4' />
                <span>新建</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {notification && (
        <div
          className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-2 ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          {notification.type === 'success' && <Check className='w-5 h-5' />}
          {notification.type === 'error' && <AlertTriangle className='w-5 h-5' />}
          <span>{notification.message}</span>
        </div>
      )}

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-6 bg-white rounded-lg shadow-sm p-1 flex space-x-1 overflow-x-auto'>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className='flex items-center justify-center space-x-2'>
                  <Icon className='w-5 h-5' />
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {activeTab === 'dashboard' && statistics && (
          <div>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8'>
              <MetricCard
                title='供应商总数'
                value={statistics.basic.total_suppliers}
                icon={<Users />}
                gradient={['#6366F1', '#8B5CF6']}
                subtitle={`${statistics.basic.active_suppliers} 个启用中`}
              />
              <MetricCard
                title='平均评分'
                value={statistics.basic.avg_score.toFixed(1)}
                icon={<Award />}
                gradient={['#F59E0B', '#D97706']}
                subtitle={`${statistics.basic.total_evaluations} 次评估`}
              />
              <MetricCard
                title='采购订单'
                value={statistics.basic.total_orders}
                icon={<ClipboardList />}
                gradient={['#10B981', '#059669']}
                subtitle={`${statistics.basic.pending_orders} 个待处理`}
              />
              <MetricCard
                title='订单总额'
                value={`¥${statistics.basic.total_order_amount.toLocaleString()}`}
                icon={<DollarSign />}
                gradient={['#14B8A6', '#0D9488']}
                subtitle={`${statistics.basic.completed_orders} 个已完成`}
              />
              <MetricCard
                title='合同总数'
                value={statistics.basic.total_contracts}
                icon={<ScrollText />}
                gradient={['#EC4899', '#DB2777']}
                subtitle={`${statistics.basic.active_contracts} 个有效`}
              />
              <MetricCard
                title='供应商分类'
                value={statistics.supplier_by_category.length}
                icon={<Building2 />}
                gradient={['#8B5CF6', '#7C3AED']}
                subtitle='类别数量'
              />
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
              <StatsChart
                title='供应商状态分布'
                type='pie'
                data={statistics.supplier_by_status.map(s => ({
                  name: mapStatusToChinese(s.status),
                  value: s.count,
                  color: s.status === 'active' ? '#10B981' : '#6B7280'
                }))}
                yKey='value'
                xKey='name'
              />
              <StatsChart
                title='订单状态分布'
                type='pie'
                data={statistics.order_by_status.map(s => ({
                  name: mapStatusToChinese(s.status),
                  value: s.count
                }))}
                yKey='value'
                xKey='name'
              />
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
              <StatsChart
                title='评估分数分布'
                type='bar'
                data={statistics.evaluation_score_distribution.map(s => ({
                  name: s.range,
                  value: s.count
                }))}
                yKey='value'
                xKey='name'
              />
              <StatsChart
                title='月度订单趋势'
                type='line'
                data={statistics.monthly_order_trend.map(t => ({
                  name: t.month,
                  value: t.order_count,
                  amount: t.total_amount
                }))}
                yKey='value'
                xKey='name'
              />
            </div>

            {statistics.contract_by_status.length > 0 && (
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                <StatsChart
                  title='合同状态分布'
                  type='pie'
                  data={statistics.contract_by_status.map(s => ({
                    name: mapStatusToChinese(s.status),
                    value: s.count
                  }))}
                  yKey='value'
                  xKey='name'
                />
              </div>
            )}
          </div>
        )}

        {activeTab !== 'dashboard' && (
          <div className='bg-white rounded-xl shadow-sm border border-slate-200'>
            <div className='p-4 border-b border-slate-200'>
              <div className='flex items-center justify-between flex-wrap gap-4'>
                <h2 className='text-lg font-semibold text-slate-900'>
                  {activeTab === 'suppliers' && '供应商列表'}
                  {activeTab === 'evaluations' && '供应商评估记录'}
                  {activeTab === 'orders' && '采购订单列表'}
                  {activeTab === 'contracts' && '供应商合同列表'}
                </h2>
                <div className='flex items-center space-x-3'>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className='px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm'
                  >
                    <option value='all'>全部状态</option>
                    <option value='启用'>启用</option>
                    <option value='禁用'>禁用</option>
                    <option value='待处理'>待处理</option>
                    <option value='已完成'>已完成</option>
                    <option value='处理中'>处理中</option>
                  </select>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400' />
                    <input
                      type='text'
                      placeholder='搜索...'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className='w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg'
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className='p-4'>
              {activeTab === 'suppliers' && (
                <DataTable
                  columns={supplierColumns}
                  data={filteredSuppliers}
                  searchKey='name'
                  searchPlaceholder='搜索供应商名称...'
                  loading={loading}
                  exportFileName='srm-suppliers'
                />
              )}
              {activeTab === 'evaluations' && (
                <DataTable
                  columns={evaluationColumns}
                  data={filteredEvaluations}
                  searchKey='evaluation_no'
                  searchPlaceholder='搜索评估编号...'
                  loading={loading}
                  exportFileName='srm-evaluations'
                />
              )}
              {activeTab === 'orders' && (
                <DataTable
                  columns={orderColumns}
                  data={filteredOrders}
                  searchKey='po_no'
                  searchPlaceholder='搜索订单编号...'
                  loading={loading}
                  exportFileName='srm-orders'
                />
              )}
              {activeTab === 'contracts' && (
                <DataTable
                  columns={contractColumns}
                  data={filteredContracts}
                  searchKey='title'
                  searchPlaceholder='搜索合同标题...'
                  loading={loading}
                  exportFileName='srm-contracts'
                />
              )}
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
            <div className='px-6 py-4 border-b border-gray-200 flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-gray-900'>{getModalTitle()}</h3>
              <button onClick={resetModal} className='text-gray-400 hover:text-gray-500'>
                <X className='w-6 h-6' />
              </button>
            </div>
            <div className='p-6 space-y-4'>
              {activeTab === 'suppliers' && (
                <>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>编号 *</label>
                      <input
                        type='text'
                        value={formData.supplier_no || ''}
                        onChange={(e) => setFormData({ ...formData, supplier_no: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>名称 *</label>
                      <input
                        type='text'
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>联系人</label>
                      <input
                        type='text'
                        value={formData.contact_person || ''}
                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>电话</label>
                      <input
                        type='text'
                        value={formData.contact_phone || ''}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>邮箱</label>
                      <input
                        type='email'
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>类别 *</label>
                      <input
                        type='text'
                        value={formData.category || ''}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>风险等级</label>
                      <select
                        value={formData.risk_level || 'medium'}
                        onChange={(e) => setFormData({ ...formData, risk_level: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      >
                        <option value='low'>低风险</option>
                        <option value='medium'>中风险</option>
                        <option value='high'>高风险</option>
                      </select>
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>状态</label>
                      <select
                        value={formData.status || '启用'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      >
                        <option value='启用'>启用</option>
                        <option value='禁用'>禁用</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>地址</label>
                    <textarea
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      rows={2}
                    />
                  </div>
                </>
              )}

              {activeTab === 'evaluations' && (
                <>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>评估编号 *</label>
                      <input
                        type='text'
                        value={formData.evaluation_no || ''}
                        onChange={(e) => setFormData({ ...formData, evaluation_no: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>供应商 *</label>
                      <select
                        value={formData.supplier_id || ''}
                        onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      >
                        <option value=''>请选择供应商</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>质量评分</label>
                      <input
                        type='number'
                        min='0'
                        max='100'
                        value={formData.quality_score || ''}
                        onChange={(e) => setFormData({ ...formData, quality_score: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>交付评分</label>
                      <input
                        type='number'
                        min='0'
                        max='100'
                        value={formData.delivery_score || ''}
                        onChange={(e) => setFormData({ ...formData, delivery_score: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>服务评分</label>
                      <input
                        type='number'
                        min='0'
                        max='100'
                        value={formData.service_score || ''}
                        onChange={(e) => setFormData({ ...formData, service_score: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>价格评分</label>
                      <input
                        type='number'
                        min='0'
                        max='100'
                        value={formData.price_score || ''}
                        onChange={(e) => setFormData({ ...formData, price_score: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>综合评分</label>
                      <input
                        type='number'
                        min='0'
                        max='100'
                        value={formData.overall_score || ''}
                        onChange={(e) => setFormData({ ...formData, overall_score: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>状态</label>
                      <select
                        value={formData.status || '已完成'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      >
                        <option value='草稿'>草稿</option>
                        <option value='已完成'>已完成</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>备注</label>
                    <textarea
                      value={formData.comments || ''}
                      onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      rows={3}
                    />
                  </div>
                </>
              )}

              {activeTab === 'orders' && (
                <>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>订单号 *</label>
                      <input
                        type='text'
                        value={formData.po_no || ''}
                        onChange={(e) => setFormData({ ...formData, po_no: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>供应商 *</label>
                      <select
                        value={formData.supplier_id || ''}
                        onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      >
                        <option value=''>请选择供应商</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>总金额</label>
                      <input
                        type='number'
                        value={formData.total_amount || ''}
                        onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>预计交付日期</label>
                      <input
                        type='date'
                        value={formData.expected_date?.split('T')[0] || ''}
                        onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>状态</label>
                      <select
                        value={formData.status || '待处理'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      >
                        <option value='待处理'>待处理</option>
                        <option value='处理中'>处理中</option>
                        <option value='已完成'>已完成</option>
                        <option value='已交付'>已交付</option>
                        <option value='已取消'>已取消</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>备注</label>
                    <textarea
                      value={formData.remarks || ''}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      rows={3}
                    />
                  </div>
                </>
              )}

              {activeTab === 'contracts' && (
                <>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>合同号 *</label>
                      <input
                        type='text'
                        value={formData.contract_no || ''}
                        onChange={(e) => setFormData({ ...formData, contract_no: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>供应商 *</label>
                      <select
                        value={formData.supplier_id || ''}
                        onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      >
                        <option value=''>请选择供应商</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className='col-span-2'>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>合同标题 *</label>
                      <input
                        type='text'
                        value={formData.title || ''}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>合同类型</label>
                      <select
                        value={formData.contract_type || 'purchase'}
                        onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      >
                        <option value='purchase'>采购合同</option>
                        <option value='service'>服务合同</option>
                        <option value='framework'>框架协议</option>
                      </select>
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>合同金额</label>
                      <input
                        type='number'
                        value={formData.total_amount || ''}
                        onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>签订日期</label>
                      <input
                        type='date'
                        value={formData.sign_date?.split('T')[0] || ''}
                        onChange={(e) => setFormData({ ...formData, sign_date: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>生效日期</label>
                      <input
                        type='date'
                        value={formData.start_date?.split('T')[0] || ''}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>到期日期</label>
                      <input
                        type='date'
                        value={formData.end_date?.split('T')[0] || ''}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>状态</label>
                      <select
                        value={formData.status || '启用'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      >
                        <option value='启用'>启用</option>
                        <option value='草稿'>草稿</option>
                        <option value='已过期'>已过期</option>
                        <option value='已取消'>已取消</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>备注</label>
                    <textarea
                      value={formData.remarks || ''}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>
            <div className='px-6 py-4 border-t border-gray-200 flex gap-3 justify-end'>
              <button
                onClick={resetModal}
                className='px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50'
              >
                取消
              </button>
              <button
                onClick={modalType === 'create' ? handleCreate : handleEdit}
                className='px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2'
              >
                <Check className='w-4 h-4' />
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
