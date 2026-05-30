import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, Clock, AlertCircle,
  Loader2, ArrowLeft, User, Users, FileText,
  CheckCircle2, MessageSquare, Eye
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { flowApi, Approval, ApprovalRecord } from '../api/flow';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from '../components/NotificationContainer';

const FlowApprovalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();
  const [approval, setApproval] = useState<Approval | null>(null);
  const [records, setRecords] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      loadApprovalDetails();
    }
  }, [id]);

  const loadApprovalDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      
      // Load approval
      const approvalResponse = await flowApi.getApproval(id);
      if (approvalResponse.success && approvalResponse.data) {
        const data = approvalResponse.data as any;
        setApproval(data);
        
        // Load records
        const recordsResponse = await flowApi.getRecordsByApproval(id);
        if (recordsResponse.success && recordsResponse.data) {
          const recordsData = recordsResponse.data as any;
          const recordsList = Array.isArray(recordsData) ? recordsData : (recordsData.items || []);
          setRecords(recordsList);
        }
      } else {
        showError('加载审批详情失败');
      }
    } catch (err) {
      console.error('加载审批详情失败:', err);
      showError('加载审批详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessApproval = async () => {
    if (!approval) return;
    if (!comment.trim() && approvalAction === 'reject') {
      showError('请输入拒绝原因');
      return;
    }

    try {
      setProcessing(true);
      const response = await flowApi.processApproval(approval.id, {
        action: approvalAction,
        comment: comment || undefined,
        actor_id: 'system-user-id', // TODO: Get from auth context
        actor_name: 'Current User',
      });

      if (response.success) {
        success(`审批${approvalAction === 'approve' ? '通过' : '拒绝'}成功`);
        setShowApprovalModal(false);
        setComment('');
        loadApprovalDetails();
      } else {
        showError(response.message || '操作失败');
      }
    } catch (err) {
      showError('处理审批失败');
      console.error('处理审批失败:', err);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'approved': '已通过',
      'rejected': '已拒绝',
      'pending': '待审批',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <NotificationContainer notifications={[]} onClose={() => {}} />
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">审批不存在</p>
          <button
            onClick={() => navigate('/flow/approvals')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <NotificationContainer notifications={[]} onClose={() => {}} />
      
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/flow/approvals')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">审批详情</h1>
              <p className="text-sm text-gray-500">{approval.task_name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 text-sm rounded-full flex items-center ${getStatusColor(approval.status)}`}>
              {getStatusIcon(approval.status)}
              <span className="ml-1">{getStatusText(approval.status)}</span>
            </span>
            {approval.status === 'pending' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setApprovalAction('approve');
                    setComment('');
                    setShowApprovalModal(true);
                  }}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  通过
                </button>
                <button
                  onClick={() => {
                    setApprovalAction('reject');
                    setComment('');
                    setShowApprovalModal(true);
                  }}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  拒绝
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Approval Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">审批信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">审批ID</div>
                <div className="font-mono text-sm">{approval.id}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">任务名称</div>
                <div className="text-sm">{approval.task_name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">节点ID</div>
                <div className="font-mono text-sm">{approval.node_id || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">审批类型</div>
                <div className="text-sm">
                  {approval.approval_type === 'single' ? '单人审批' : 
                   approval.approval_type === 'counter' ? '会签审批' : 
                   approval.approval_type === 'or' ? '或签审批' : 
                   approval.approval_type || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">审批人</div>
                <div className="text-sm flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  {approval.assignee_id || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">创建时间</div>
                <div className="text-sm">{new Date(approval.created_at).toLocaleString()}</div>
              </div>
              {approval.approved_by && (
                <>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">审批人</div>
                    <div className="text-sm">{approval.approved_by}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">审批时间</div>
                    <div className="text-sm">
                      {approval.approved_at ? new Date(approval.approved_at).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </>
              )}
              {approval.timeout_at && (
                <>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">超时时间</div>
                    <div className="text-sm">{new Date(approval.timeout_at).toLocaleString()}</div>
                  </div>
                </>
              )}
            </div>
            {approval.comment && (
              <div className="mt-4">
                <div className="text-sm text-gray-500 mb-2">审批意见</div>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <MessageSquare className="w-4 h-4 inline mr-2 text-gray-400" />
                  {approval.comment}
                </div>
              </div>
            )}
          </div>

          {/* Instance Link */}
          {approval.workflow_instance_id && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">关联实例</h2>
              <button
                onClick={() => navigate(`/flow/instances/${approval?.workflow_instance_id}`)}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Eye className="w-5 h-5 mr-2" />
                查看关联的工作流实例
              </button>
            </div>
          )}
        </div>

        {/* Sidebar - Records */}
        <div className="col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">审批记录</h2>
            {records.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">暂无审批记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                {records.map((record, index) => (
                  <div key={record.id} className="border-l-2 border-indigo-200 pl-4">
                    <div className="flex items-center space-x-2 mb-1">
                      {record.action === 'approve' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {record.action === 'approve' ? '通过' : '拒绝'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      <div className="flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        {record.actor_name || record.actor_id}
                      </div>
                      <div className="flex items-center mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(record.created_at).toLocaleString()}
                      </div>
                    </div>
                    {record.comment && (
                      <div className="mt-2 text-xs text-gray-600 italic bg-gray-50 p-2 rounded">
                        "{record.comment}"
                      </div>
                    )}
                    {index < records.length - 1 && (
                      <div className="mt-2 text-xs text-gray-400">
                        状态变更: {record.previous_status} → {record.new_status}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {approvalAction === 'approve' ? '通过审批' : '拒绝审批'}
            </h2>
            <div className="mb-4">
              <p className="text-gray-600 mb-2">任务: {approval.task_name}</p>
              {approval.node_id && (
                <p className="text-gray-600 mb-2">节点: {approval.node_id}</p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {approvalAction === 'reject' ? '拒绝原因 *' : '备注'}
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={4}
                placeholder={approvalAction === 'reject' ? '请输入拒绝原因' : '可选备注'}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleProcessApproval}
                disabled={processing || (approvalAction === 'reject' && !comment.trim())}
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${
                  approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {approvalAction === 'approve' ? '确认通过' : '确认拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowApprovalDetailPage;
