import React, { useEffect, useState } from 'react';
import { 
  Shield, Plus, Search, ChevronRight, 
  FileText, CheckCircle, AlertTriangle, TrendingUp, 
  Loader2, X, Edit, Trash2, Check
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
  CreateQualityImprovementRequest
} from '../api/qms';

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
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<{[key: string]: string}>({});
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const mapStatusToChinese = (status: string): string => {
    const statusMap: Record<string, string> = {
      'active': '启用',
      'inactive': '禁用',
      'pending': '待处理',
      'in_progress': '进行中',
      'completed': '已完成',
      'closed': '已关闭',
      'proposed': '提议',
      'implementing': '实施中'
    };
    return statusMap[status] || status;
  };

  const adaptStandard = (item: any): QualityStandard => {
    return {
      ...item,
      status: mapStatusToChinese(item.status)
    };
  };

  const adaptCheck = (item: any): QualityCheck => {
    return {
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
      updated_at: item.updated_at || ''
    };
  };

  const adaptIssue = (item: any): QualityIssue => {
    return {
      ...item,
      status: mapStatusToChinese(item.status)
    };
  };

  const adaptImprovement = (item: any): QualityImprovement => {
    return {
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
      updated_at: item.updated_at || ''
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'standards') {
        const response = await qmsApi.listStandards();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.standards && Array.isArray(data.standards)) {
            rawItems = data.standards;
          }
          const adapted = rawItems.map(item => adaptStandard(item));
          setStandards(adapted);
        } else {
          setStandards([]);
        }
      } else if (activeTab === 'checks') {
        const response = await qmsApi.listChecks();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.inspections && Array.isArray(data.inspections)) {
            rawItems = data.inspections;
          }
          const adapted = rawItems.map(item => adaptCheck(item));
          setChecks(adapted);
        } else {
          setChecks([]);
        }
      } else if (activeTab === 'issues') {
        const response = await qmsApi.listIssues();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.issues && Array.isArray(data.issues)) {
            rawItems = data.issues;
          }
          const adapted = rawItems.map(item => adaptIssue(item));
          setIssues(adapted);
        } else {
          setIssues([]);
        }
      } else if (activeTab === 'improvements') {
        const response = await qmsApi.listImprovements();
        if (response.success && response.data) {
          let data: any = response.data;
          let rawItems: any[] = [];
          if (Array.isArray(data)) {
            rawItems = data;
          } else if (data.actions && Array.isArray(data.actions)) {
            rawItems = data.actions;
          }
          const adapted = rawItems.map(item => adaptImprovement(item));
          setImprovements(adapted);
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
          status: formData.status || '启用'
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
          status: formData.status || '进行中'
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
          assignee: formData.assignee || ''
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
          assignee: formData.assignee || ''
        };
        await qmsApi.createImprovement(req);
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
      
      if (activeTab === 'standards') {
        const req: CreateQualityStandardRequest = {
          name: formData.name || editingItem.name,
          code: formData.code || editingItem.code,
          category: formData.category || editingItem.category,
          version: formData.version || editingItem.version,
          description: formData.description || editingItem.description,
          content: formData.content || editingItem.content,
          status: formData.status || editingItem.status
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
          status: formData.status || editingItem.status
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
          assignee: formData.assignee || editingItem.assignee
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
          assignee: formData.assignee || editingItem.assignee
        };
        await qmsApi.updateImprovement(editingItem.id, req);
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
      case '启用': return 'bg-green-100 text-green-700';
      case '禁用': return 'bg-red-100 text-red-700';
      case '已完成': return 'bg-green-100 text-green-700';
      case '进行中': return 'bg-blue-100 text-blue-700';
      case '待处理': return 'bg-yellow-100 text-yellow-700';
      case '处理中': return 'bg-orange-100 text-orange-700';
      case '已关闭': return 'bg-gray-100 text-gray-700';
      case '实施中': return 'bg-blue-100 text-blue-700';
      case '提议': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case '严重': return 'bg-red-100 text-red-700';
      case '一般': return 'bg-yellow-100 text-yellow-700';
      case '轻微': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const safeStandards = Array.isArray(standards) ? standards : [];
  const safeChecks = Array.isArray(checks) ? checks : [];
  const safeIssues = Array.isArray(issues) ? issues : [];
  const safeImprovements = Array.isArray(improvements) ? improvements : [];

  const filteredData = () => {
    const data = activeTab === 'standards' ? safeStandards :
                 activeTab === 'checks' ? safeChecks :
                 activeTab === 'issues' ? safeIssues : safeImprovements;
    return data.filter((item: any) => {
      const search = searchTerm.toLowerCase();
      return (item.name?.toLowerCase().includes(search) || 
              item.title?.toLowerCase().includes(search) || 
              item.code?.toLowerCase().includes(search) ||
              item.check_no?.toLowerCase().includes(search) ||
              item.issue_no?.toLowerCase().includes(search) ||
              item.improvement_no?.toLowerCase().includes(search));
    });
  };

  const renderFormFields = () => {
    if (activeTab === 'standards') {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">标准名称 *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">标准编号 *</label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">类别</label>
              <select
                value={formData.category || ''}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="">请选择类别</option>
                <option value="国际标准">国际标准</option>
                <option value="行业标准">行业标准</option>
                <option value="企业标准">企业标准</option>
                <option value="检验标准">检验标准</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">版本号</label>
              <input
                type="text"
                value={formData.version || ''}
                onChange={(e) => setFormData({...formData, version: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">描述</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">内容</label>
            <textarea
              value={formData.content || ''}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">状态</label>
            <select
              value={formData.status || '启用'}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            >
              <option value="启用">启用</option>
              <option value="禁用">禁用</option>
            </select>
          </div>
        </>
      );
    } else if (activeTab === 'checks') {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">检测单号 *</label>
              <input
                type="text"
                value={formData.check_no || ''}
                onChange={(e) => setFormData({...formData, check_no: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">检测类型</label>
              <select
                value={formData.check_type || ''}
                onChange={(e) => setFormData({...formData, check_type: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="">请选择类型</option>
                <option value="原材料检验">原材料检验</option>
                <option value="过程检验">过程检验</option>
                <option value="成品检验">成品检验</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">检验员</label>
              <input
                type="text"
                value={formData.inspector || ''}
                onChange={(e) => setFormData({...formData, inspector: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">检测地点</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">检测结果</label>
            <textarea
              value={formData.result || ''}
              onChange={(e) => setFormData({...formData, result: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">结论</label>
            <input
              type="text"
              value={formData.conclusion || ''}
              onChange={(e) => setFormData({...formData, conclusion: e.target.value})}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">状态</label>
            <select
              value={formData.status || '进行中'}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            >
              <option value="进行中">进行中</option>
              <option value="已完成">已完成</option>
            </select>
          </div>
        </>
      );
    } else if (activeTab === 'issues') {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">异常编号 *</label>
              <input
                type="text"
                value={formData.issue_no || ''}
                onChange={(e) => setFormData({...formData, issue_no: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">标题 *</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">严重程度</label>
              <select
                value={formData.severity || '一般'}
                onChange={(e) => setFormData({...formData, severity: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="严重">严重</option>
                <option value="一般">一般</option>
                <option value="轻微">轻微</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">类别</label>
              <input
                type="text"
                value={formData.category || ''}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">负责人</label>
              <input
                type="text"
                value={formData.assignee || ''}
                onChange={(e) => setFormData({...formData, assignee: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">状态</label>
              <select
                value={formData.status || '待处理'}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="待处理">待处理</option>
                <option value="处理中">处理中</option>
                <option value="已关闭">已关闭</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">描述</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
        </>
      );
    } else if (activeTab === 'improvements') {
      return (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">改进编号 *</label>
              <input
                type="text"
                value={formData.improvement_no || ''}
                onChange={(e) => setFormData({...formData, improvement_no: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">标题 *</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">类别</label>
              <select
                value={formData.category || ''}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="">请选择类别</option>
                <option value="流程优化">流程优化</option>
                <option value="体系建设">体系建设</option>
                <option value="技术改进">技术改进</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">提议人</label>
              <input
                type="text"
                value={formData.proposer || ''}
                onChange={(e) => setFormData({...formData, proposer: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">负责人</label>
              <input
                type="text"
                value={formData.assignee || ''}
                onChange={(e) => setFormData({...formData, assignee: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">状态</label>
              <select
                value={formData.status || '提议'}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              >
                <option value="提议">提议</option>
                <option value="实施中">实施中</option>
                <option value="已完成">已完成</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">描述</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>
        </>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
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
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">质量管理</h1>
                  <p className="text-xs text-slate-500">Quality Management System</p>
                </div>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>新建</span>
            </button>
          </div>
        </div>
      </header>

      {/* Notification */}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-1 flex space-x-1">
          {[
            { key: 'standards' as TabType, label: '质量标准', icon: FileText },
            { key: 'checks' as TabType, label: '质量检测', icon: CheckCircle },
            { key: 'issues' as TabType, label: '质量异常', icon: AlertTriangle },
            { key: 'improvements' as TabType, label: '质量改进', icon: TrendingUp },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'standards' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">质量标准列表</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {filteredData().length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">暂无质量标准</p>
                </div>
              ) : (
                filteredData().map((standard: QualityStandard) => (
                  <div key={standard.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{standard.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(standard.status)}`}>
                            {standard.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mb-2">编号：{standard.code} | 版本：{standard.version}</p>
                        <p className="text-slate-600 mb-2">{standard.description}</p>
                        <p className="text-sm text-slate-500">类别：{standard.category}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => openEditModal(standard)}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(standard.id, standard.name)}
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
        )}

        {activeTab === 'checks' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">质量检测记录</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {filteredData().length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">暂无检测记录</p>
                </div>
              ) : (
                filteredData().map((check: QualityCheck) => (
                  <div key={check.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{check.check_no}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(check.status)}`}>
                            {check.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mb-2">类型：{check.check_type} | 检验员：{check.inspector}</p>
                        <p className="text-slate-600 mb-2">地点：{check.location}</p>
                        <p className="text-slate-600 mb-2">结果：{check.result}</p>
                        <p className="text-sm text-slate-500">结论：{check.conclusion}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => openEditModal(check)}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(check.id, check.check_no)}
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
        )}

        {activeTab === 'issues' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">质量异常记录</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {filteredData().length === 0 ? (
                <div className="p-12 text-center">
                  <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">暂无异常记录</p>
                </div>
              ) : (
                filteredData().map((issue: QualityIssue) => (
                  <div key={issue.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{issue.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                            {issue.severity}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                            {issue.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mb-2">编号：{issue.issue_no} | 类别：{issue.category}</p>
                        <p className="text-slate-600 mb-2">{issue.description}</p>
                        <p className="text-sm text-slate-500">负责人：{issue.assignee}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => openEditModal(issue)}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(issue.id, issue.title)}
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
        )}

        {activeTab === 'improvements' && (
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">质量改进记录</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {filteredData().length === 0 ? (
                <div className="p-12 text-center">
                  <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">暂无改进记录</p>
                </div>
              ) : (
                filteredData().map((improvement: QualityImprovement) => (
                  <div key={improvement.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{improvement.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(improvement.status)}`}>
                            {improvement.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mb-2">编号：{improvement.improvement_no} | 类别：{improvement.category}</p>
                        <p className="text-slate-600 mb-2">{improvement.description}</p>
                        <p className="text-sm text-slate-500">提议人：{improvement.proposer} | 负责人：{improvement.assignee}</p>
                        {improvement.improvement_effect && (
                          <p className="text-sm text-green-600 mt-2">改进效果：{improvement.improvement_effect}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => openEditModal(improvement)}
                          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(improvement.id, improvement.title)}
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
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900">
                {modalType === 'create' ? '新建' : '编辑'}
                {activeTab === 'standards' && '质量标准'}
                {activeTab === 'checks' && '质量检测'}
                {activeTab === 'issues' && '质量异常'}
                {activeTab === 'improvements' && '质量改进'}
              </h3>
              <button 
                onClick={resetModal}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {renderFormFields()}
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={resetModal}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={modalType === 'create' ? handleCreate : handleEdit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
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
