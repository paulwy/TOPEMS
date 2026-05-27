import React, { useState, useEffect } from 'react';
import { 
  GitBranch, Plus, Clock, CheckCircle, 
  XCircle, ChevronRight, User, Settings,
  Filter, Search, X, AlertCircle,
  MessageSquare, History, Eye, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { flowApi, Approval, ApprovalRecord, Comment } from '../api/flow';

interface Workflow {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'approved' | 'rejected';
  initiator: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowsPage: React.FC = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [approvalComments, setApprovalComments] = useState<Comment[]>([]);
  const [approvalRecords, setApprovalRecords] = useState<ApprovalRecord[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'delegate'>('approve');
  const [actionComment, setActionComment] = useState('');
  const [delegateTo, setDelegateTo] = useState({ id: '', name: '' });

  useEffect(() => {
    loadWorkflows();
    loadApprovals();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const response = await flowApi.listWorkflows();
      if (response.success && response.data) {
        const mappedWorkflows: Workflow[] = response.data.map((wf: any) => ({
          id: wf.id,
          title: wf.name,
          description: wf.description || '暂无描述',
          status: 'pending',
          initiator: '系统',
          createdAt: new Date(wf.created_at),
          updatedAt: new Date(wf.updated_at)
        }));
        setWorkflows(mappedWorkflows);
      }
    } catch (err) {
      console.error('加载工作流失败:', err);
      showNotification('error', '加载工作流列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadApprovals = async () => {
    try {
      const response = await flowApi.listApprovals();
      if (response.success && response.data) {
        setApprovals(response.data);
      }
    } catch (err) {
      console.error('加载审批列表失败:', err);
    }
  };

  const loadApprovalDetails = async (approvalId: string) => {
    try {
      const [commentsRes, recordsRes] = await Promise.all([
        flowApi.getComments(approvalId),
        flowApi.getRecordsByApproval(approvalId)
      ]);
      
      if (commentsRes.success && commentsRes.data) {
        setApprovalComments(commentsRes.data);
      }
      if (recordsRes.success && recordsRes.data) {
        setApprovalRecords(recordsRes.data);
      }
    } catch (err) {
      console.error('加载审批详情失败:', err);
    }
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;
    
    setLoading(true);
    try {
      const response = await flowApi.approve(selectedApproval.id, {
        comment: actionComment,
        user_id: 'current_user',
        user_name: '当前用户'
      });
      
      if (response.success) {
        showNotification('success', '审批已通过');
        setShowApprovalModal(false);
        setActionComment('');
        loadApprovals();
      } else {
        showNotification('error', response.message || '审批失败');
      }
    } catch (err: any) {
      console.error('审批失败:', err);
      showNotification('error', err.response?.data?.message || '审批失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;
    
    setLoading(true);
    try {
      const response = await flowApi.reject(selectedApproval.id, {
        comment: actionComment,
        user_id: 'current_user',
        user_name: '当前用户'
      });
      
      if (response.success) {
        showNotification('success', '审批已拒绝');
        setShowApprovalModal(false);
        setActionComment('');
        loadApprovals();
      } else {
        showNotification('error', response.message || '审批失败');
      }
    } catch (err: any) {
      console.error('审批失败:', err);
      showNotification('error', err.response?.data?.message || '审批失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelegate = async () => {
    if (!selectedApproval || !delegateTo.id) {
      showNotification('error', '请选择转交对象');
      return;
    }
    
    setLoading(true);
    try {
      const response = await flowApi.delegate(selectedApproval.id, {
        delegate_to: delegateTo.id,
        delegate_to_name: delegateTo.name,
        reason: actionComment,
        user_id: 'current_user',
        user_name: '当前用户'
      });
      
      if (response.success) {
        showNotification('success', '审批已转交');
        setShowApprovalModal(false);
        setActionComment('');
        setDelegateTo({ id: '', name: '' });
        loadApprovals();
      } else {
        showNotification('error', response.message || '转交失败');
      }
    } catch (err: any) {
      console.error('转交失败:', err);
      showNotification('error', err.response?.data?.message || '转交失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedApproval || !actionComment.trim()) {
      showNotification('error', '请输入评论内容');
      return;
    }
    
    setLoading(true);
    try {
      const response = await flowApi.addComment(selectedApproval.id, {
        content: actionComment,
        user_id: 'current_user',
        user_name: '当前用户'
      });
      
      if (response.success) {
        showNotification('success', '评论添加成功');
        setActionComment('');
        loadApprovalDetails(selectedApproval.id);
      } else {
        showNotification('error', response.message || '评论添加失败');
      }
    } catch (err: any) {
      console.error('评论添加失败:', err);
      showNotification('error', err.response?.data?.message || '评论添加失败');
    } finally {
      setLoading(false);
    }
  };

  const openApprovalModal = (approval: Approval, action: 'approve' | 'reject' | 'delegate') => {
    setSelectedApproval(approval);
    setApprovalAction(action);
    setShowApprovalModal(true);
    loadApprovalDetails(approval.id);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateWorkflow = async () => {
    if (!newWorkflow.name.trim()) {
      showNotification('error', '请输入工作流名称');
      return;
    }

    setLoading(true);
    try {
      const response = await flowApi.createWorkflow({
        name: newWorkflow.name,
        description: newWorkflow.description
      });
      if (response.success) {
        showNotification('success', '工作流创建成功！');
        setShowCreateModal(false);
        setNewWorkflow({ name: '', description: '' });
        loadWorkflows();
      } else {
        showNotification('error', response.message || '创建失败');
      }
    } catch (err: any) {
      console.error('创建工作流失败:', err);
      showNotification('error', err.response?.data?.message || '创建工作流失败');
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkflows = workflows.filter(wf => {
    const matchesFilter = activeFilter === 'all' || wf.status === activeFilter;
    const matchesSearch = wf.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        wf.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const completedApprovals = approvals.filter(a => a.status === 'approved' || a.status === 'rejected');

  const stats = {
    all: workflows.length,
    pending: pendingApprovals.length,
    inProgress: workflows.filter(wf => wf.status === 'in-progress').length,
    approved: completedApprovals.filter(a => a.status === 'approved').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'in-progress':
        return <GitBranch className="w-6 h-6 text-blue-500" />;
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-500" />;
      default:
        return <Clock className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'in-progress': 'bg-blue-100 text-blue-700',
      'approved': 'bg-green-100 text-green-700',
      'rejected': 'bg-red-100 text-red-700',
    };

    const labels: Record<string, string> = {
      'pending': '待处理',
      'in-progress': '进行中',
      'approved': '已通过',
      'rejected': '已拒绝',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getApprovalTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'single': '单人审批',
      'counter': '会签审批',
      'or': '或签审批',
    };
    return labels[type] || type;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'approved': '通过',
      'rejected': '拒绝',
      'delegate': '转交',
      'timeout': '超时',
    };
    return labels[action] || action;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate('/dashboard')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                工作流管理
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索工作流..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <button 
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-4 h-4" />
                <span>新建工作流</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
          notification.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-900' 
            : 'bg-red-50 border border-red-200 text-red-900'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="ml-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Approval Action Modal */}
      {showApprovalModal && selectedApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900">
                  {approvalAction === 'approve' ? '通过审批' : 
                   approvalAction === 'reject' ? '拒绝审批' : '转交审批'}
                </h3>
                <button 
                  onClick={() => {
                    setShowApprovalModal(false);
                    setActionComment('');
                    setDelegateTo({ id: '', name: '' });
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-6">
                {/* Approval Info */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-800 mb-3">审批信息</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">任务名称：</span>
                      <span className="font-medium">{selectedApproval.task_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">审批类型：</span>
                      <span className="font-medium">{getApprovalTypeLabel(selectedApproval.approval_type)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">当前状态：</span>
                      {getStatusBadge(selectedApproval.status)}
                    </div>
                    <div>
                      <span className="text-slate-500">审批人：</span>
                      <span className="font-medium">{selectedApproval.assignee_id || '未分配'}</span>
                    </div>
                  </div>
                </div>

                {/* Action Form */}
                {approvalAction !== 'delegate' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      审批意见 {approvalAction === 'approve' ? '(可选)' : '(必填)'}
                    </label>
                    <textarea
                      value={actionComment}
                      onChange={(e) => setActionComment(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={approvalAction === 'approve' ? '请输入审批意见（可选）' : '请输入拒绝原因'}
                    />
                  </div>
                )}

                {approvalAction === 'delegate' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">转交给 *</label>
                      <input
                        type="text"
                        value={delegateTo.name}
                        onChange={(e) => setDelegateTo({ id: e.target.value, name: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="请输入转交对象姓名或ID"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">转交原因</label>
                      <textarea
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="请输入转交原因（可选）"
                      />
                    </div>
                  </>
                )}

                {/* Comments Section */}
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    审批意见 ({approvalComments.length})
                  </h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
                    {approvalComments.length === 0 ? (
                      <p className="text-slate-500 text-sm">暂无意见</p>
                    ) : (
                      approvalComments.map((comment) => (
                        <div key={comment.id} className="bg-slate-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{comment.user_name}</span>
                            <span className="text-xs text-slate-500">{formatDate(comment.created_at)}</span>
                          </div>
                          <p className="text-sm text-slate-700">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={actionComment}
                      onChange={(e) => setActionComment(e.target.value)}
                      className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="输入评论..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                    />
                    <button
                      onClick={handleAddComment}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      评论
                    </button>
                  </div>
                </div>

                {/* History Section */}
                <div>
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                    <History className="w-5 h-5 mr-2" />
                    审批历史 ({approvalRecords.length})
                  </h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {approvalRecords.length === 0 ? (
                      <p className="text-slate-500 text-sm">暂无历史记录</p>
                    ) : (
                      approvalRecords.map((record) => (
                        <div key={record.id} className="flex items-start gap-3">
                          <div className="mt-1">
                            <ArrowRight className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{record.user_name}</span>
                              <span className="text-xs text-slate-500">{formatDate(record.created_at)}</span>
                            </div>
                            <p className="text-sm text-slate-700">
                              执行操作：<span className="font-medium">{getActionLabel(record.action)}</span>
                              {record.comment && <span className="text-slate-600"> - {record.comment}</span>}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setActionComment('');
                    setDelegateTo({ id: '', name: '' });
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  取消
                </button>
                {approvalAction === 'approve' && (
                  <button
                    onClick={handleApprove}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? '处理中...' : '确认通过'}
                  </button>
                )}
                {approvalAction === 'reject' && (
                  <button
                    onClick={handleReject}
                    disabled={loading || !actionComment.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? '处理中...' : '确认拒绝'}
                  </button>
                )}
                {approvalAction === 'delegate' && (
                  <button
                    onClick={handleDelegate}
                    disabled={loading || !delegateTo.id}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? '处理中...' : '确认转交'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-900">新建工作流</h3>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">工作流名称 *</label>
                  <input
                    type="text"
                    value={newWorkflow.name}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="请输入工作流名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">描述</label>
                  <textarea
                    value={newWorkflow.description}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="请输入工作流描述（可选）"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateWorkflow}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? '创建中...' : '创建'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Detail Modal */}
      {selectedWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-900">工作流详情</h3>
                <button 
                  onClick={() => setSelectedWorkflow(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-slate-800">{selectedWorkflow.title}</h4>
                    {getStatusBadge(selectedWorkflow.status)}
                  </div>
                  <p className="text-slate-600">{selectedWorkflow.description}</p>
                </div>

                {/* Timeline/Info Grid */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">发起人</p>
                    <p className="font-medium text-slate-800">{selectedWorkflow.initiator}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">创建时间</p>
                    <p className="font-medium text-slate-800">{formatDate(selectedWorkflow.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">更新时间</p>
                    <p className="font-medium text-slate-800">{formatDate(selectedWorkflow.updatedAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">ID</p>
                    <p className="font-medium text-slate-800 text-sm font-mono">{selectedWorkflow.id}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setSelectedWorkflow(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-slate-500 mb-6">
          <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/dashboard')}>首页</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900">工作流管理</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="全部流程" value={String(stats.all)} icon={GitBranch} color="blue" />
          <StatCard title="待处理" value={String(stats.pending)} icon={Clock} color="yellow" />
          <StatCard title="进行中" value={String(stats.inProgress)} icon={GitBranch} color="green" />
          <StatCard title="已通过" value={String(stats.approved)} icon={CheckCircle} color="purple" />
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 bg-white p-4 rounded-xl shadow-sm">
            <Filter className="w-5 h-5 text-slate-400" />
            <div className="flex space-x-2">
              {['all', 'pending', 'in-progress', 'approved', 'rejected'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter === 'all' ? '全部' : 
                   filter === 'pending' ? '待处理' : 
                   filter === 'in-progress' ? '进行中' : 
                   filter === 'approved' ? '已通过' : '已拒绝'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Workflow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkflows.map((workflow) => (
            <div
              key={workflow.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(workflow.status)}
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">{workflow.title}</h4>
                      <p className="text-sm text-slate-500">{workflow.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(workflow.status)}
                    <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>发起人：{workflow.initiator}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(workflow.updatedAt)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      最新更新：{formatDate(workflow.updatedAt)}
                    </div>
                    <button 
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                      onClick={() => setSelectedWorkflow(workflow)}
                    >
                      <span>查看详情</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Approval Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">审批任务</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={loadApprovals}
                className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                刷新
              </button>
            </div>
          </div>

          {/* Approval Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">待处理审批</p>
                  <p className="text-3xl font-bold text-slate-900">{pendingApprovals.length}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">已完成审批</p>
                  <p className="text-3xl font-bold text-slate-900">{completedApprovals.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">总审批数</p>
                  <p className="text-3xl font-bold text-slate-900">{approvals.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <GitBranch className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Pending Approvals */}
          {pendingApprovals.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">待处理审批</h3>
              <div className="space-y-4">
                {pendingApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          {getStatusIcon(approval.status)}
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900">
                              {approval.task_name}
                            </h4>
                            <p className="text-sm text-slate-500">
                              节点ID: {approval.node_id}
                            </p>
                          </div>
                          {getStatusBadge(approval.status)}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">审批类型：</span>
                            <span className="font-medium">{getApprovalTypeLabel(approval.approval_type)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">审批人：</span>
                            <span className="font-medium">{approval.assignee_id || '未分配'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">创建时间：</span>
                            <span className="font-medium">{formatDate(approval.created_at)}</span>
                          </div>
                          {approval.timeout_at && (
                            <div>
                              <span className="text-slate-500">超时时间：</span>
                              <span className="font-medium text-orange-600">{formatDate(approval.timeout_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => openApprovalModal(approval, 'approve')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                        >
                          通过
                        </button>
                        <button
                          onClick={() => openApprovalModal(approval, 'reject')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                        >
                          拒绝
                        </button>
                        <button
                          onClick={() => openApprovalModal(approval, 'delegate')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          转交
                        </button>
                        <button
                          onClick={() => {
                            setSelectedApproval(approval);
                            loadApprovalDetails(approval.id);
                            setShowApprovalModal(true);
                            setApprovalAction('approve');
                          }}
                          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Approvals */}
          {completedApprovals.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">已完成审批</h3>
              <div className="space-y-4">
                {completedApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className="bg-white rounded-xl shadow-sm p-6 opacity-75"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          {getStatusIcon(approval.status)}
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900">
                              {approval.task_name}
                            </h4>
                            <p className="text-sm text-slate-500">
                              节点ID: {approval.node_id}
                            </p>
                          </div>
                          {getStatusBadge(approval.status)}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">审批类型：</span>
                            <span className="font-medium">{getApprovalTypeLabel(approval.approval_type)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">审批人：</span>
                            <span className="font-medium">{approval.assignee_id || '未分配'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">处理人：</span>
                            <span className="font-medium">{approval.approved_by || '未处理'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">处理时间：</span>
                            <span className="font-medium">{approval.approved_at ? formatDate(approval.approved_at) : '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">创建时间：</span>
                            <span className="font-medium">{formatDate(approval.created_at)}</span>
                          </div>
                        </div>

                        {approval.comment && (
                          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-700">
                              <span className="font-medium">审批意见：</span>
                              {approval.comment}
                            </p>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setSelectedApproval(approval);
                          loadApprovalDetails(approval.id);
                          setShowApprovalModal(true);
                          setApprovalAction('approve');
                        }}
                        className="ml-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {approvals.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <GitBranch className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">暂无审批任务</h3>
              <p className="text-slate-500">当前没有待处理或已完成的审批任务</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: any;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
  const colors = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`w-12 h-12 ${colors[color as keyof typeof colors]} rounded-lg flex items-center justify-center text-white`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default WorkflowsPage;
