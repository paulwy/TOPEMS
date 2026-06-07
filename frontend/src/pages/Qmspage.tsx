import React, { useEffect, useState } from 'react';
import {
  Shield,
  Plus,
  Search,
  ChevronRight,
  FileText,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  X,
  Edit,
  Trash2,
  Check,
  Download,
  Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  qmsApi,
  QualityStandard,
  QualityCheck,
  QualityIssue,
  QualityImprovement,
  CreateQualityStandardRequest,
  CreateQualityCheckRequest,
  CreateQualityIssueRequest,
  CreateQualityImprovementRequest,
  QmsStatistics,
} from '../api/qms';
import { DataTable } from '../components/DataTable';
import { MetricCard } from '../components/MetricCard';
import { StatsChart } from '../components/StatsChart';
import { ColumnDef } from '@tanstack/react-table';

type TabType = 'standards' | 'checks' | 'issues' | 'improvements';
type ModalType = 'create' | 'edit' | null;

const Qmspage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('standards');
  const [standards, setStandards] = useState<QualityStandard[]>([]);
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [improvements, setImprovements] = useState<QualityImprovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statistics, setStatistics] = useState<QmsStatistics>({
    total_standards: 0,
    active_standards: 0,
    inactive_standards: 0,
    total_inspections: 0,
    pending_inspections: 0,
    in_progress_inspections: 0,
    completed_inspections: 0,
    total_issues: 0,
    open_issues: 0,
    resolved_issues: 0,
    critical_issues: 0,
    total_actions: 0,
    pending_actions: 0,
    in_progress_actions: 0,
    completed_actions: 0,
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setStatsLoading(true);
      const response = await qmsApi.getStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Failed to load QMS statistics:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const mapStatusToChinese = (status: string): string => {
    const statusMap: Record<string, string> = {
      active: '启用',
      inactive: '禁用',
      pending: '待处理',
      in_progress: '进行中',
      completed: '已完成',
      closed: '已关闭',
      proposed: '提议',
      implementing: '实施中',
    };
    return statusMap[status] || status;
  };

  const adaptStandard = (item: any): QualityStandard => ({
    ...item,
    status: mapStatusToChinese(item.status),
  });

  const adaptCheck = (item: any): QualityCheck => ({
    id: item.id,
    check_no: item.title || '',
    check_type: item.inspection_type || '',
    inspector: item.inspector || '',
    check_date: item.inspected_at || '',
    location: '',
    result: item.result || '',
    conclusion: item.findings || '',
    status: mapStatusToChinese(item.status),
    created_at: item.created_at || '',
    updated_at: item.updated_at || '',
  });

  const adaptIssue = (item: any): QualityIssue => ({
    ...item,
    status: mapStatusToChinese(item.status),
  });

  const adaptImprovement = (item: any): QualityImprovement => ({
    id: item.id,
    improvement_no: item.title || '',
    title: item.title || '',
    description: item.description || '',
    category: '',
    status: mapStatusToChinese(item.status),
    proposer: item.verified_by || '',
    assignee: item.assigned_to || '',
    improvement_effect: item.verification_result || '',
    created_at: item.created_at || '',
    updated_at: item.updated_at || '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'standards') {
        const response = await qmsApi.listStandards();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = Array.isArray(data) ? data : data.standards || [];
          setStandards(rawItems.map((item) => adaptStandard(item)));
        } else {
          setStandards([]);
        }
      } else if (activeTab === 'checks') {
        const response = await qmsApi.listChecks();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = Array.isArray(data) ? data : data.inspections || [];
          setChecks(rawItems.map((item) => adaptCheck(item)));
        } else {
          setChecks([]);
        }
      } else if (activeTab === 'issues') {
        const response = await qmsApi.listIssues();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = Array.isArray(data) ? data : data.issues || [];
          setIssues(rawItems.map((item) => adaptIssue(item)));
        } else {
          setIssues([]);
        }
      } else if (activeTab === 'improvements') {
        const response = await qmsApi.listImprovements();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = Array.isArray(data) ? data : data.actions || [];
          setImprovements(rawItems.map((item) => adaptImprovement(item)));
        } else {
          setImprovements([]);
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

  const handleCreate = async () => {
    try {
      if (activeTab === 'standards') {
        const req: CreateQualityStandardRequest = {
          name: formData.name || '',
          code: formData.code || '',
          category: formData.category || '',
          version: formData.version || '',
          description: formData.description || '',
          content: formData.content || '',
          status: formData.status || '启用',
        };
        await qmsApi.createStandard(req);
      } else if (activeTab === 'checks') {
        const req: CreateQualityCheckRequest = {
          check_no: formData.check_no || '',
          check_type: formData.check_type || '',
          inspector: formData.inspector || '',
          check_date: new Date().toISOString(),
          location: formData.location || '',
          result: formData.result || '',
          conclusion: formData.conclusion || '',
          status: formData.status || '进行中',
        };
        await qmsApi.createCheck(req);
      } else if (activeTab === 'issues') {
        const req: CreateQualityIssueRequest = {
          issue_no: formData.issue_no || '',
          title: formData.title || '',
          description: formData.description || '',
          severity: formData.severity || '一般',
          category: formData.category || '',
          status: formData.status || '待处理',
          assignee: formData.assignee || '',
        };
        await qmsApi.createIssue(req);
      } else if (activeTab === 'improvements') {
        const req: CreateQualityImprovementRequest = {
          improvement_no: formData.improvement_no || '',
          title: formData.title || '',
          description: formData.description || '',
          category: formData.category || '',
          status: formData.status || '提议',
          proposer: formData.proposer || '',
          assignee: formData.assignee || '',
        };
        await qmsApi.createImprovement(req);
      }
      showNotification('success', '创建成功');
      resetModal();
      loadData();
      loadStatistics();
    } catch (err) {
      showNotification('error', '创建失败');
      console.error('创建失败:', err);
    }
  };

  const handleEdit = async () => {
    try {
      if (!editingItem) return;

      if (activeTab === 'standards') {
        const req: CreateQualityStandardRequest = {
          name: formData.name || editingItem.name,
          code: formData.code || editingItem.code,
          category: formData.category || editingItem.category,
          version: formData.version || editingItem.version,
          description: formData.description || editingItem.description,
          content: formData.content || editingItem.content,
          status: formData.status || editingItem.status,
        };
        await qmsApi.updateStandard(editingItem.id, req);
      } else if (activeTab === 'checks') {
        const req: CreateQualityCheckRequest = {
          check_no: formData.check_no || editingItem.check_no,
          check_type: formData.check_type || editingItem.check_type,
          inspector: formData.inspector || editingItem.inspector,
          check_date: new Date().toISOString(),
          location: formData.location || editingItem.location,
          result: formData.result || editingItem.result,
          conclusion: formData.conclusion || editingItem.conclusion,
          status: formData.status || editingItem.status,
        };
        await qmsApi.updateCheck(editingItem.id, req);
      } else if (activeTab === 'issues') {
        const req: CreateQualityIssueRequest = {
          issue_no: formData.issue_no || editingItem.issue_no,
          title: formData.title || editingItem.title,
          description: formData.description || editingItem.description,
          severity: formData.severity || editingItem.severity,
          category: formData.category || editingItem.category,
          status: formData.status || editingItem.status,
          assignee: formData.assignee || editingItem.assignee,
        };
        await qmsApi.updateIssue(editingItem.id, req);
      } else if (activeTab === 'improvements') {
        const req: CreateQualityImprovementRequest = {
          improvement_no: formData.improvement_no || editingItem.improvement_no,
          title: formData.title || editingItem.title,
          description: formData.description || editingItem.description,
          category: formData.category || editingItem.category,
          status: formData.status || editingItem.status,
          proposer: formData.proposer || editingItem.proposer,
          assignee: formData.assignee || editingItem.assignee,
        };
        await qmsApi.updateImprovement(editingItem.id, req);
      }
      showNotification('success', '更新成功');
      resetModal();
      loadData();
      loadStatistics();
    } catch (err) {
      showNotification('error', '更新失败');
      console.error('更新失败:', err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除 "${name}" 吗？`)) return;

    try {
      if (activeTab === 'standards') {
        await qmsApi.deleteStandard(id);
      } else if (activeTab === 'checks') {
        await qmsApi.deleteCheck(id);
      } else if (activeTab === 'issues') {
        await qmsApi.deleteIssue(id);
      } else if (activeTab === 'improvements') {
        await qmsApi.deleteImprovement(id);
      }
      showNotification('success', '删除成功');
      loadData();
      loadStatistics();
    } catch (err) {
      showNotification('error', '删除失败');
      console.error('删除失败:', err);
    }
  };

  const openCreateModal = () => {
    setModalType('create');
    setEditingItem(null);
    setFormData({});
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setModalType('edit');
    setEditingItem(item);
    setFormData({ ...item });
    setShowModal(true);
  };

  const resetModal = () => {
    setShowModal(false);
    setModalType(null);
    setEditingItem(null);
    setFormData({});
  };

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status) {
      case '启用':
        return 'bg-green-100 text-green-700';
      case '禁用':
        return 'bg-red-100 text-red-700';
      case '已完成':
        return 'bg-green-100 text-green-700';
      case '进行中':
        return 'bg-blue-100 text-blue-700';
      case '待处理':
        return 'bg-yellow-100 text-yellow-700';
      case '处理中':
        return 'bg-orange-100 text-orange-700';
      case '已关闭':
        return 'bg-gray-100 text-gray-700';
      case '实施中':
        return 'bg-blue-100 text-blue-700';
      case '提议':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case '严重':
        return 'bg-red-100 text-red-700';
      case '一般':
        return 'bg-yellow-100 text-yellow-700';
      case '轻微':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
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

  const handleExport = () => {
    const data =
      activeTab === 'standards'
        ? standards
        : activeTab === 'checks'
          ? checks
          : activeTab === 'issues'
            ? issues
            : improvements;
    exportToCSV(data, `qms-${activeTab}`);
  };

  const handleImport = () => {
    showNotification('success', '导入功能即将上线');
  };

  const standardColumns: ColumnDef<QualityStandard>[] = [
    { accessorKey: 'code', header: '标准编号' },
    { accessorKey: 'name', header: '标准名称' },
    { accessorKey: 'category', header: '类别' },
    { accessorKey: 'version', header: '版本' },
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
            className='p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg'
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

  const checkColumns: ColumnDef<QualityCheck>[] = [
    { accessorKey: 'check_no', header: '检测单号' },
    { accessorKey: 'check_type', header: '检测类型' },
    { accessorKey: 'inspector', header: '检验员' },
    { accessorKey: 'location', header: '检测地点' },
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
            className='p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg'
          >
            <Edit className='w-4 h-4' />
          </button>
          <button
            onClick={() => handleDelete(row.original.id, row.original.check_no)}
            className='p-2 text-red-600 hover:bg-red-50 rounded-lg'
          >
            <Trash2 className='w-4 h-4' />
          </button>
        </div>
      ),
    },
  ];

  const issueColumns: ColumnDef<QualityIssue>[] = [
    { accessorKey: 'issue_no', header: '异常编号' },
    { accessorKey: 'title', header: '标题' },
    {
      accessorKey: 'severity',
      header: '严重程度',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(row.original.severity)}`}>
          {row.original.severity}
        </span>
      ),
    },
    { accessorKey: 'category', header: '类别' },
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
            className='p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg'
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

  const improvementColumns: ColumnDef<QualityImprovement>[] = [
    { accessorKey: 'improvement_no', header: '改进编号' },
    { accessorKey: 'title', header: '标题' },
    { accessorKey: 'category', header: '类别' },
    { accessorKey: 'proposer', header: '提议人' },
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
            className='p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg'
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

  const renderFormFields = () => {
    if (activeTab === 'standards') {
      return (
        <>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>标准名称 *</label>
              <input
                type='text'
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>标准编号 *</label>
              <input
                type='text'
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>类别</label>
              <select
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              >
                <option value=''>请选择类别</option>
                <option value='国际标准'>国际标准</option>
                <option value='行业标准'>行业标准</option>
                <option value='企业标准'>企业标准</option>
                <option value='检验标准'>检验标准</option>
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>版本号</label>
              <input
                type='text'
                value={formData.version || ''}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              />
            </div>
          </div>
          <div>
            <label className='block text-sm font-medium text-slate-700 mb-2'>描述</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className='w-full px-3 py-2 border border-slate-200 rounded-lg'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-slate-700 mb-2'>内容</label>
            <textarea
              value={formData.content || ''}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              className='w-full px-3 py-2 border border-slate-200 rounded-lg'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-slate-700 mb-2'>状态</label>
            <select
              value={formData.status || '启用'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className='w-full px-3 py-2 border border-slate-200 rounded-lg'
            >
              <option value='启用'>启用</option>
              <option value='禁用'>禁用</option>
            </select>
          </div>
        </>
      );
    } else if (activeTab === 'checks') {
      return (
        <>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>检测单号 *</label>
              <input
                type='text'
                value={formData.check_no || ''}
                onChange={(e) => setFormData({ ...formData, check_no: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>检测类型</label>
              <select
                value={formData.check_type || ''}
                onChange={(e) => setFormData({ ...formData, check_type: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              >
                <option value=''>请选择类型</option>
                <option value='原材料检验'>原材料检验</option>
                <option value='过程检验'>过程检验</option>
                <option value='成品检验'>成品检验</option>
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>检验员</label>
              <input
                type='text'
                value={formData.inspector || ''}
                onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>检测地点</label>
              <input
                type='text'
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              />
            </div>
          </div>
          <div>
            <label className='block text-sm font-medium text-slate-700 mb-2'>检测结果</label>
            <textarea
              value={formData.result || ''}
              onChange={(e) => setFormData({ ...formData, result: e.target.value })}
              rows={3}
              className='w-full px-3 py-2 border border-slate-200 rounded-lg'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-slate-700 mb-2'>结论</label>
            <input
              type='text'
              value={formData.conclusion || ''}
              onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
              className='w-full px-3 py-2 border border-slate-200 rounded-lg'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-slate-700 mb-2'>状态</label>
            <select
              value={formData.status || '进行中'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className='w-full px-3 py-2 border border-slate-200 rounded-lg'
            >
              <option value='进行中'>进行中</option>
              <option value='已完成'>已完成</option>
            </select>
          </div>
        </>
      );
    } else if (activeTab === 'issues') {
      return (
        <>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>异常编号 *</label>
              <input
                type='text'
                value={formData.issue_no || ''}
                onChange={(e) => setFormData({ ...formData, issue_no: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>标题 *</label>
              <input
                type='text'
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>严重程度</label>
              <select
                value={formData.severity || '一般'}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              >
                <option value='严重'>严重</option>
                <option value='一般'>一般</option>
                <option value='轻微'>轻微</option>
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>类别</label>
              <input
                type='text'
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>负责人</label>
              <input
                type='text'
                value={formData.assignee || ''}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>状态</label>
              <select
                value={formData.status || '待处理'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              >
                <option value='待处理'>待处理</option>
                <option value='处理中'>处理中</option>
                <option value='已关闭'>已关闭</option>
              </select>
            </div>
          </div>
          <div>
            <label className='block text-sm font-medium text-slate-700 mb-2'>描述</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className='w-full px-3 py-2 border border-slate-200 rounded-lg'
            />
          </div>
        </>
      );
    } else if (activeTab === 'improvements') {
      return (
        <>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>改进编号 *</label>
              <input
                type='text'
                value={formData.improvement_no || ''}
                onChange={(e) => setFormData({ ...formData, improvement_no: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>标题 *</label>
              <input
                type='text'
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>类别</label>
              <select
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              >
                <option value=''>请选择类别</option>
                <option value='流程优化'>流程优化</option>
                <option value='体系建设'>体系建设</option>
                <option value='技术改进'>技术改进</option>
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>提议人</label>
              <input
                type='text'
                value={formData.proposer || ''}
                onChange={(e) => setFormData({ ...formData, proposer: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>负责人</label>
              <input
                type='text'
                value={formData.assignee || ''}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-slate-700 mb-2'>状态</label>
              <select
                value={formData.status || '提议'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className='w-full px-3 py-2 border border-slate-200 rounded-lg'
              >
                <option value='提议'>提议</option>
                <option value='实施中'>实施中</option>
                <option value='已完成'>已完成</option>
              </select>
            </div>
          </div>
          <div>
            <label className='block text-sm font-medium text-slate-700 mb-2'>描述</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className='w-full px-3 py-2 border border-slate-200 rounded-lg'
            />
          </div>
        </>
      );
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100'>
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
                <div className='w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center'>
                  <Shield className='w-6 h-6 text-white' />
                </div>
                <div>
                  <h1 className='text-xl font-bold text-slate-900'>质量管理</h1>
                  <p className='text-xs text-slate-500'>Quality Management System</p>
                </div>
              </div>
            </div>
            <div className='flex items-center space-x-3'>
              <button
                onClick={handleImport}
                className='flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors'
              >
                <Upload className='w-4 h-4' />
                <span>导入</span>
              </button>
              <button
                onClick={handleExport}
                className='flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
              >
                <Download className='w-4 h-4' />
                <span>导出</span>
              </button>
              <button
                onClick={openCreateModal}
                className='flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'
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
          className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          <div className='flex items-center space-x-2'>
            {notification.type === 'success' && <Check className='w-5 h-5' />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-6 bg-white rounded-lg shadow-sm p-1 flex space-x-1'>
          {[
            { key: 'standards' as TabType, label: '质量标准', icon: FileText },
            { key: 'checks' as TabType, label: '质量检测', icon: CheckCircle },
            { key: 'issues' as TabType, label: '质量异常', icon: AlertTriangle },
            { key: 'improvements' as TabType, label: '质量改进', icon: TrendingUp },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className='flex items-center justify-center space-x-2'>
                <tab.icon className='w-5 h-5' />
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* 统计面板 */}
        {!statsLoading && (
          <>
            {/* 统计卡片 */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
              <MetricCard
                title='质量标准'
                value={statistics.total_standards}
                icon={<FileText className='w-6 h-6' />}
                gradient={['#6366F1', '#8B5CF6']}
                subtitle={`启用: ${statistics.active_standards} | 禁用: ${statistics.inactive_standards}`}
              />
              <MetricCard
                title='质量检测'
                value={statistics.total_inspections}
                icon={<CheckCircle className='w-6 h-6' />}
                gradient={['#10B981', '#059669']}
                subtitle={`进行中: ${statistics.in_progress_inspections} | 已完成: ${statistics.completed_inspections}`}
              />
              <MetricCard
                title='质量异常'
                value={statistics.total_issues}
                icon={<AlertTriangle className='w-6 h-6' />}
                gradient={['#F59E0B', '#D97706']}
                subtitle={`待处理: ${statistics.open_issues} | 严重: ${statistics.critical_issues}`}
              />
              <MetricCard
                title='质量改进'
                value={statistics.total_actions}
                icon={<TrendingUp className='w-6 h-6' />}
                gradient={['#EC4899', '#DB2777']}
                subtitle={`实施中: ${statistics.in_progress_actions} | 已完成: ${statistics.completed_actions}`}
              />
            </div>

            {/* 统计图表 */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6'>
              <StatsChart
                title='质量检测状态分布'
                type='pie'
                data={[
                  { name: '已完成', value: statistics.completed_inspections, color: '#10B981' },
                  { name: '进行中', value: statistics.in_progress_inspections, color: '#3B82F6' },
                  { name: '待处理', value: statistics.pending_inspections, color: '#F59E0B' },
                ].filter(item => item.value > 0)}
                dataKey='value'
                nameKey='name'
              />
              <StatsChart
                title='质量异常状态分布'
                type='pie'
                data={[
                  { name: '已关闭', value: statistics.resolved_issues, color: '#10B981' },
                  { name: '待处理', value: statistics.open_issues, color: '#F59E0B' },
                  { name: '严重', value: statistics.critical_issues, color: '#EF4444' },
                ].filter(item => item.value > 0)}
                dataKey='value'
                nameKey='name'
              />
            </div>

            {/* 质量改进状态图表 */}
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6'>
              <StatsChart
                title='质量标准状态分布'
                type='pie'
                data={[
                  { name: '启用', value: statistics.active_standards, color: '#10B981' },
                  { name: '禁用', value: statistics.inactive_standards, color: '#6B7280' },
                ].filter(item => item.value > 0)}
                dataKey='value'
                nameKey='name'
              />
              <StatsChart
                title='质量改进状态分布'
                type='pie'
                data={[
                  { name: '已完成', value: statistics.completed_actions, color: '#10B981' },
                  { name: '实施中', value: statistics.in_progress_actions, color: '#3B82F6' },
                  { name: '提议', value: statistics.pending_actions, color: '#8B5CF6' },
                ].filter(item => item.value > 0)}
                dataKey='value'
                nameKey='name'
              />
            </div>
          </>
        )}

        <div className='bg-white rounded-xl shadow-sm border border-slate-200'>
          <div className='p-4 border-b border-slate-200'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-slate-900'>
                {activeTab === 'standards' && '质量标准列表'}
                {activeTab === 'checks' && '质量检测记录'}
                {activeTab === 'issues' && '质量异常记录'}
                {activeTab === 'improvements' && '质量改进记录'}
              </h2>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400' />
                <input
                  type='text'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder='搜索...'
                  className='w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg'
                />
              </div>
            </div>
          </div>

          <div className='p-4'>
            {activeTab === 'standards' && (
              <DataTable
                columns={standardColumns}
                data={standards}
                searchKey='name'
                searchPlaceholder='搜索标准名称...'
                loading={loading}
                exportFileName='qms-standards'
              />
            )}
            {activeTab === 'checks' && (
              <DataTable
                columns={checkColumns}
                data={checks}
                searchKey='check_no'
                searchPlaceholder='搜索检测单号...'
                loading={loading}
                exportFileName='qms-checks'
              />
            )}
            {activeTab === 'issues' && (
              <DataTable
                columns={issueColumns}
                data={issues}
                searchKey='title'
                searchPlaceholder='搜索异常标题...'
                loading={loading}
                exportFileName='qms-issues'
              />
            )}
            {activeTab === 'improvements' && (
              <DataTable
                columns={improvementColumns}
                data={improvements}
                searchKey='title'
                searchPlaceholder='搜索改进标题...'
                loading={loading}
                exportFileName='qms-improvements'
              />
            )}
          </div>
        </div>
      </main>

      {showModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto'>
            <div className='p-6 border-b border-slate-200 flex justify-between items-center'>
              <h3 className='text-lg font-semibold text-slate-900'>
                {modalType === 'create' ? '新建' : '编辑'}
                {activeTab === 'standards' && '质量标准'}
                {activeTab === 'checks' && '质量检测'}
                {activeTab === 'issues' && '质量异常'}
                {activeTab === 'improvements' && '质量改进'}
              </h3>
              <button onClick={resetModal} className='p-2 text-slate-400 hover:text-slate-600'>
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='p-6 space-y-4'>{renderFormFields()}</div>
            <div className='p-6 border-t border-slate-200 flex justify-end space-x-3'>
              <button
                onClick={resetModal}
                className='px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors'
              >
                取消
              </button>
              <button
                onClick={modalType === 'create' ? handleCreate : handleEdit}
                className='px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'
              >
                {modalType === 'create' ? '创建' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Qmspage;
