import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeft,
  User,
  Users,
  FileText,
  CheckCircle2,
  MessageSquare,
  Eye,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { flowApi, Approval, ApprovalRecord } from '../api/flow';
import { useAppStore } from '../store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const FlowApprovalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
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
          const recordsList = Array.isArray(recordsData) ? recordsData : recordsData.items || [];
          setRecords(recordsList);
        }
      } else {
        addNotification({ title: '错误', message: '加载审批详情失败', type: 'error' });
      }
    } catch (err) {
      console.error('加载审批详情失败:', err);
      addNotification({ title: '错误', message: '加载审批详情失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessApproval = async () => {
    if (!approval) return;
    if (!comment.trim() && approvalAction === 'reject') {
      addNotification({ title: '提示', message: '请输入拒绝原因', type: 'info' });
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
        addNotification({
          title: '成功',
          message: `审批${approvalAction === 'approve' ? '通过' : '拒绝'}成功`,
          type: 'success',
        });
        setShowApprovalModal(false);
        setComment('');
        loadApprovalDetails();
      } else {
        addNotification({ title: '失败', message: response.message || '操作失败', type: 'error' });
      }
    } catch (err) {
      addNotification({ title: '错误', message: '处理审批失败', type: 'error' });
      console.error('处理审批失败:', err);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className='w-5 h-5 text-green-600' />;
      case 'rejected':
        return <XCircle className='w-5 h-5 text-red-600' />;
      case 'pending':
        return <Clock className='w-5 h-5 text-yellow-600' />;
      default:
        return <AlertCircle className='w-5 h-5 text-gray-600' />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      approved: '已通过',
      rejected: '已拒绝',
      pending: '待审批',
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
      <div className='min-h-screen bg-gray-50 p-6 flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-indigo-600' />
      </div>
    );
  }

  if (!approval) {
    return (
      <div className='min-h-screen bg-gray-50 p-6'>
        <div className='text-center py-12'>
          <AlertCircle className='w-16 h-16 mx-auto text-gray-300 mb-4' />
          <p className='text-gray-500'>审批不存在</p>
          <Button onClick={() => navigate('/flow/approvals')} className='mt-4 bg-indigo-600 hover:bg-indigo-700'>
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 p-6'>
      {/* Header */}
      <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <Button variant='ghost' onClick={() => navigate('/flow/approvals')}>
              <ArrowLeft className='w-5 h-5' />
            </Button>
            <div className='w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center'>
              <CheckCircle className='w-6 h-6 text-indigo-600' />
            </div>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>审批详情</h1>
              <p className='text-sm text-gray-500'>{approval.task_name}</p>
            </div>
          </div>
          <div className='flex items-center space-x-3'>
            <span className={`px-3 py-1 text-sm rounded-full flex items-center ${getStatusColor(approval.status)}`}>
              {getStatusIcon(approval.status)}
              <span className='ml-1'>{getStatusText(approval.status)}</span>
            </span>
            {approval.status === 'pending' && (
              <div className='flex items-center space-x-2'>
                <Button onClick={() => {
                    setApprovalAction('approve');
                    setComment('');
                    setShowApprovalModal(true);
                  }} className='bg-green-600 hover:bg-green-700'>
                  <CheckCircle className='w-5 h-5 mr-2' />
                  通过
                </Button>
                <Button onClick={() => {
                    setApprovalAction('reject');
                    setComment('');
                    setShowApprovalModal(true);
                  }} className='bg-red-600 hover:bg-red-700'>
                  <XCircle className='w-5 h-5 mr-2' />
                  拒绝
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-3 gap-6'>
        {/* Main Content */}
        <div className='col-span-2 space-y-6'>
          {/* Approval Info */}
          <div className='bg-white rounded-lg shadow-sm p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>审批信息</h2>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <div className='text-sm text-gray-500 mb-1'>审批ID</div>
                <div className='font-mono text-sm'>{approval.id}</div>
              </div>
              <div>
                <div className='text-sm text-gray-500 mb-1'>任务名称</div>
                <div className='text-sm'>{approval.task_name}</div>
              </div>
              <div>
                <div className='text-sm text-gray-500 mb-1'>节点ID</div>
                <div className='font-mono text-sm'>{approval.node_id || 'N/A'}</div>
              </div>
              <div>
                <div className='text-sm text-gray-500 mb-1'>审批类型</div>
                <div className='text-sm'>
                  {approval.approval_type === 'single'
                    ? '单人审批'
                    : approval.approval_type === 'counter'
                      ? '会签审批'
                      : approval.approval_type === 'or'
                        ? '或签审批'
                        : approval.approval_type || 'N/A'}
                </div>
              </div>
              <div>
                <div className='text-sm text-gray-500 mb-1'>审批人</div>
                <div className='text-sm flex items-center'>
                  <User className='w-4 h-4 mr-1' />
                  {approval.assignee_id || 'N/A'}
                </div>
              </div>
              <div>
                <div className='text-sm text-gray-500 mb-1'>创建时间</div>
                <div className='text-sm'>{new Date(approval.created_at).toLocaleString()}</div>
              </div>
              {approval.approved_by && (
                <>
                  <div>
                    <div className='text-sm text-gray-500 mb-1'>审批人</div>
                    <div className='text-sm'>{approval.approved_by}</div>
                  </div>
                  <div>
                    <div className='text-sm text-gray-500 mb-1'>审批时间</div>
                    <div className='text-sm'>
                      {approval.approved_at ? new Date(approval.approved_at).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </>
              )}
              {approval.timeout_at && (
                <>
                  <div>
                    <div className='text-sm text-gray-500 mb-1'>超时时间</div>
                    <div className='text-sm'>{new Date(approval.timeout_at).toLocaleString()}</div>
                  </div>
                </>
              )}
            </div>
            {approval.comment && (
              <div className='mt-4'>
                <div className='text-sm text-gray-500 mb-2'>审批意见</div>
                <div className='bg-gray-50 p-3 rounded text-sm'>
                  <MessageSquare className='w-4 h-4 inline mr-2 text-gray-400' />
                  {approval.comment}
                </div>
              </div>
            )}
          </div>

          {/* Instance Link */}
          {approval.workflow_instance_id && (
            <div className='bg-white rounded-lg shadow-sm p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>关联实例</h2>
              <button
                onClick={() => navigate(`/flow/instances/${approval?.workflow_instance_id}`)}
                className='flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors'
              >
                <Eye className='w-5 h-5 mr-2' />
                查看关联的工作流实例
              </button>
            </div>
          )}
        </div>

        {/* Sidebar - Records */}
        <div className='col-span-1'>
          <div className='bg-white rounded-lg shadow-sm p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>审批记录</h2>
            {records.length === 0 ? (
              <div className='text-center py-8'>
                <FileText className='w-12 h-12 mx-auto text-gray-300 mb-2' />
                <p className='text-gray-500'>暂无审批记录</p>
              </div>
            ) : (
              <div className='space-y-4'>
                {records.map((record, index) => (
                  <div key={record.id} className='border-l-2 border-indigo-200 pl-4'>
                    <div className='flex items-center space-x-2 mb-1'>
                      {record.action === 'approve' ? (
                        <CheckCircle2 className='w-4 h-4 text-green-600' />
                      ) : (
                        <XCircle className='w-4 h-4 text-red-600' />
                      )}
                      <span className='text-sm font-medium text-gray-900'>
                        {record.action === 'approve' ? '通过' : '拒绝'}
                      </span>
                    </div>
                    <div className='text-xs text-gray-500'>
                      <div className='flex items-center'>
                        <User className='w-3 h-3 mr-1' />
                        {record.actor_name || record.actor_id}
                      </div>
                      <div className='flex items-center mt-1'>
                        <Clock className='w-3 h-3 mr-1' />
                        {new Date(record.created_at).toLocaleString()}
                      </div>
                    </div>
                    {record.comment && (
                      <div className='mt-2 text-xs text-gray-600 italic bg-gray-50 p-2 rounded'>"{record.comment}"</div>
                    )}
                    {index < records.length - 1 && (
                      <div className='mt-2 text-xs text-gray-400'>
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
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approvalAction === 'approve' ? '通过审批' : '拒绝审批'}</DialogTitle>
            <DialogDescription>
              {approvalAction === 'approve' ? '确认通过该审批任务' : '确认拒绝该审批任务'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            {approval && (
              <>
                <p className='text-gray-600'>任务: {approval.task_name}</p>
                {approval.node_id && <p className='text-gray-600'>节点: {approval.node_id}</p>}
              </>
            )}
            <div className='space-y-2'>
              <Label htmlFor='comment'>{approvalAction === 'reject' ? '拒绝原因 *' : '备注'}</Label>
              <Textarea
                id='comment'
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder={approvalAction === 'reject' ? '请输入拒绝原因' : '可选备注'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='secondary' onClick={() => setShowApprovalModal(false)}>
              取消
            </Button>
            <Button
              onClick={handleProcessApproval}
              disabled={processing || (approvalAction === 'reject' && !comment.trim())}
              className={approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {processing && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
              {approvalAction === 'approve' ? '确认通过' : '确认拒绝'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlowApprovalDetailPage;
