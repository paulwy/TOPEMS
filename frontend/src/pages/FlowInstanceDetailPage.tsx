import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeft,
  User,
  Users,
  FileText,
  Play,
  CheckCircle2,
  MessageSquare,
  Eye,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { flowApi, WorkflowInstance, Approval, ApprovalRecord } from '../api/flow';
import { useAppStore } from '../store';
import { Button } from '@/components/ui/button';

interface InstanceDetails {
  instance: WorkflowInstance;
  approvals: Approval[];
  records: ApprovalRecord[];
}

const FlowInstanceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const [details, setDetails] = useState<InstanceDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadInstanceDetails();
    }
  }, [id]);

  const loadInstanceDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await flowApi.getInstanceDetails(id);
      if (response.success && response.data) {
        const data = response.data as any;
        setDetails(data);
      } else {
        addNotification({ title: '错误', message: '加载实例详情失败', type: 'error' });
      }
    } catch (err) {
      console.error('加载实例详情失败:', err);
      addNotification({ title: '错误', message: '加载实例详情失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <CheckCircle className='w-5 h-5 text-green-600' />;
      case 'rejected':
        return <XCircle className='w-5 h-5 text-red-600' />;
      case 'running':
        return <Play className='w-5 h-5 text-blue-600' />;
      case 'pending':
        return <Clock className='w-5 h-5 text-yellow-600' />;
      default:
        return <AlertCircle className='w-5 h-5 text-gray-600' />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      completed: '已完成',
      rejected: '已拒绝',
      running: '进行中',
      pending: '待处理',
      approved: '已通过',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'running':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 p-6 flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
      </div>
    );
  }

  if (!details) {
    return (
      <div className='min-h-screen bg-gray-50 p-6'>
        <div className='text-center py-12'>
          <AlertCircle className='w-16 h-16 mx-auto text-gray-300 mb-4' />
          <p className='text-gray-500'>实例不存在</p>
          <Button onClick={() => navigate('/flow/instances')} className='mt-4'>
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  const { instance, approvals, records } = details;

  return (
    <div className='min-h-screen bg-gray-50 p-6'>
      {/* Header */}
      <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <Button variant='ghost' onClick={() => navigate('/flow/instances')}>
              <ArrowLeft className='w-5 h-5' />
            </Button>
            <div className='w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center'>
              <GitBranch className='w-6 h-6 text-blue-600' />
            </div>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>实例详情</h1>
              <p className='text-sm text-gray-500 font-mono'>{instance.id}</p>
            </div>
          </div>
          <span className={`px-3 py-1 text-sm rounded-full flex items-center ${getStatusColor(instance.status)}`}>
            {getStatusIcon(instance.status)}
            <span className='ml-1'>{getStatusText(instance.status)}</span>
          </span>
        </div>
      </div>

      <div className='grid grid-cols-3 gap-6'>
        {/* Instance Info */}
        <div className='col-span-2'>
          <div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>基本信息</h2>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <div className='text-sm text-gray-500 mb-1'>实例ID</div>
                <div className='font-mono text-sm'>{instance.id}</div>
              </div>
              <div>
                <div className='text-sm text-gray-500 mb-1'>工作流ID</div>
                <div className='font-mono text-sm'>{instance.workflow_id || 'N/A'}</div>
              </div>
              <div>
                <div className='text-sm text-gray-500 mb-1'>当前节点</div>
                <div className='text-sm'>{instance.current_node || 'N/A'}</div>
              </div>
              <div>
                <div className='text-sm text-gray-500 mb-1'>发起人</div>
                <div className='text-sm flex items-center'>
                  <User className='w-4 h-4 mr-1' />
                  {instance.initiator_id || '系统'}
                </div>
              </div>
              <div>
                <div className='text-sm text-gray-500 mb-1'>创建时间</div>
                <div className='text-sm'>{new Date(instance.created_at).toLocaleString()}</div>
              </div>
              <div>
                <div className='text-sm text-gray-500 mb-1'>启动时间</div>
                <div className='text-sm'>
                  {instance.started_at ? new Date(instance.started_at).toLocaleString() : 'N/A'}
                </div>
              </div>
              {instance.completed_at && (
                <div>
                  <div className='text-sm text-gray-500 mb-1'>完成时间</div>
                  <div className='text-sm'>{new Date(instance.completed_at).toLocaleString()}</div>
                </div>
              )}
            </div>
            {instance.data && Object.keys(instance.data).length > 0 && (
              <div className='mt-4'>
                <div className='text-sm text-gray-500 mb-2'>实例数据</div>
                <pre className='bg-gray-50 p-3 rounded text-xs overflow-auto'>
                  {JSON.stringify(instance.data, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Approval Timeline */}
          <div className='bg-white rounded-lg shadow-sm p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>审批节点</h2>
            {approvals.length === 0 ? (
              <div className='text-center py-8'>
                <Users className='w-12 h-12 mx-auto text-gray-300 mb-2' />
                <p className='text-gray-500'>暂无审批节点</p>
              </div>
            ) : (
              <div className='space-y-4'>
                {approvals.map((approval, index) => (
                  <div key={approval.id} className='border border-gray-200 rounded-lg p-4'>
                    <div className='flex items-start justify-between mb-2'>
                      <div className='flex items-center space-x-2'>
                        <div className='w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600'>
                          {index + 1}
                        </div>
                        <div>
                          <div className='font-medium text-gray-900'>{approval.task_name}</div>
                          {approval.node_id && <div className='text-xs text-gray-500'>节点: {approval.node_id}</div>}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full flex items-center ${getStatusColor(approval.status)}`}
                      >
                        {getStatusIcon(approval.status)}
                        <span className='ml-1'>{getStatusText(approval.status)}</span>
                      </span>
                    </div>
                    <div className='flex items-center space-x-4 text-xs text-gray-500 ml-8'>
                      <span className='flex items-center'>
                        <User className='w-3 h-3 mr-1' />
                        审批人: {approval.assignee_id || 'N/A'}
                      </span>
                      <span className='flex items-center'>
                        <Clock className='w-3 h-3 mr-1' />
                        创建: {new Date(approval.created_at).toLocaleString()}
                      </span>
                      {approval.approved_at && (
                        <span className='flex items-center'>
                          <CheckCircle className='w-3 h-3 mr-1' />
                          处理: {new Date(approval.approved_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {approval.comment && (
                      <div className='mt-2 ml-8 text-sm text-gray-600 flex items-start'>
                        <MessageSquare className='w-4 h-4 mr-1 mt-0.5 flex-shrink-0' />
                        {approval.comment}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Approval Records */}
        <div className='col-span-1'>
          <div className='bg-white rounded-lg shadow-sm p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>审批记录</h2>
            {records.length === 0 ? (
              <div className='text-center py-8'>
                <FileText className='w-12 h-12 mx-auto text-gray-300 mb-2' />
                <p className='text-gray-500'>暂无审批记录</p>
              </div>
            ) : (
              <div className='space-y-3'>
                {records.map((record) => (
                  <div key={record.id} className='border-l-2 border-gray-200 pl-4 py-2'>
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
                      <div>{record.actor_name || record.actor_id}</div>
                      <div>{new Date(record.created_at).toLocaleString()}</div>
                    </div>
                    {record.comment && <div className='mt-1 text-xs text-gray-600 italic'>"{record.comment}"</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlowInstanceDetailPage;
