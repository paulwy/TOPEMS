import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Box,
  Typography,
  Chip,
  Stack,
  TextField,
  FormLabel,
  Button,
} from '@mui/material';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  User,
  FileText,
  CheckCircle2,
  MessageSquare,
  Eye,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Approval, ApprovalRecord } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { useAppStore } from '../../store';
import { apiLogger } from '@/utils/logger';
import { DetailPageTemplate } from '@/components/templates/DetailPageTemplate';
import type { TabConfig, SectionConfig } from '@/components/templates/DetailPageTemplate';
import { PageContainer } from '@/components/common';

const FlowApprovalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const user = useAppStore((state) => state.user);

  const [approval, setApproval] = useState<Approval | null>(null);
  const [records, setRecords] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      loadApprovalDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadApprovalDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(undefined);

      const approvalResponse = await workflowApi.getApproval(id);
      if (approvalResponse.success && approvalResponse.data) {
        const data = approvalResponse.data as any;
        setApproval(data);

        const recordsResponse = await workflowApi.getRecordsByApproval(id);
        if (recordsResponse.success && recordsResponse.data) {
          const recordsData = recordsResponse.data as any;
          const recordsList = Array.isArray(recordsData) ? recordsData : recordsData.items || [];
          setRecords(recordsList);
        }
      } else {
        setError('加载审批详情失败');
      }
    } catch (err: unknown) {
      apiLogger.error('加载审批详情失败:', err);
      setError('加载审批详情失败');
      addNotification({
        title: '错误',
        message: '加载审批详情失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessApproval = async () => {
    if (!approval) return;
    if (!comment.trim() && approvalAction === 'reject') {
      addNotification({
        title: '提示',
        message: '请输入拒绝原因',
        type: 'info',
      });
      return;
    }

    try {
      setProcessing(true);
      const response = await workflowApi.processApproval(approval.id, {
        action: approvalAction,
        comment: comment || undefined,
        actor_id: user?.id || 'system-user-id',
        actor_name: user?.fullName || user?.username || 'Current User',
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
        addNotification({
          title: '失败',
          message: response.message || '操作失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: '处理审批失败',
        type: 'error',
      });
      apiLogger.error('处理审批失败:', err);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <CheckCircle
            size={20}
            style={{ color: '#16a34a' }}
          />
        );
      case 'rejected':
        return (
          <XCircle
            size={20}
            style={{ color: '#dc2626' }}
          />
        );
      case 'pending':
        return (
          <Clock
            size={20}
            style={{ color: '#ca8a04' }}
          />
        );
      default:
        return (
          <AlertCircle
            size={20}
            style={{ color: '#6b7280' }}
          />
        );
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

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const tabs = useMemo<TabConfig[]>(() => {
    if (!approval) return [];

    return [
      {
        id: 'info',
        label: '审批信息',
        content: (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  审批ID
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontFamily: 'monospace' }}
                >
                  {approval.id}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  任务名称
                </Typography>
                <Typography variant='body2'>{approval.task_name}</Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  节点ID
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontFamily: 'monospace' }}
                >
                  {approval.node_id || 'N/A'}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  审批类型
                </Typography>
                <Typography variant='body2'>
                  {approval.approval_type === 'single'
                    ? '单人审批'
                    : approval.approval_type === 'counter'
                      ? '会签审批'
                      : approval.approval_type === 'or'
                        ? '或签审批'
                        : approval.approval_type || 'N/A'}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  审批人
                </Typography>
                <Stack
                  direction='row'
                  spacing={0.5}
                  sx={{ alignItems: 'center' }}
                >
                  <User size={14} />
                  <Typography variant='body2'>{approval.assignee_id || 'N/A'}</Typography>
                </Stack>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 0.5 }}
                >
                  创建时间
                </Typography>
                <Typography variant='body2'>
                  {new Date(approval.created_at).toLocaleString()}
                </Typography>
              </Box>
              {approval.approved_by && (
                <>
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'grey.500', mb: 0.5 }}
                    >
                      审批人
                    </Typography>
                    <Typography variant='body2'>{approval.approved_by}</Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ color: 'grey.500', mb: 0.5 }}
                    >
                      审批时间
                    </Typography>
                    <Typography variant='body2'>
                      {approval.approved_at
                        ? new Date(approval.approved_at).toLocaleString()
                        : 'N/A'}
                    </Typography>
                  </Box>
                </>
              )}
              {approval.timeout_at && (
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500', mb: 0.5 }}
                  >
                    超时时间
                  </Typography>
                  <Typography variant='body2'>
                    {new Date(approval.timeout_at).toLocaleString()}
                  </Typography>
                </Box>
              )}
            </Box>
            {approval.comment && (
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500', mb: 1 }}
                >
                  审批意见
                </Typography>
                <Box sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1 }}>
                  <Stack
                    direction='row'
                    spacing={1}
                    sx={{ alignItems: 'flex-start' }}
                  >
                    <MessageSquare
                      size={16}
                      style={{ color: 'text.disabled', marginTop: 2 }}
                    />
                    <Typography variant='body2'>{approval.comment}</Typography>
                  </Stack>
                </Box>
              </Box>
            )}
          </Box>
        ),
      },
      {
        id: 'records',
        label: '审批记录',
        badge: records.length,
        content: (
          <Box>
            {records.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <FileText
                  size={48}
                  style={{
                    color: 'grey.300',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    marginBottom: 4,
                  }}
                />
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  暂无审批记录
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {records.map((record, index) => (
                  <Box
                    key={record.id}
                    sx={{ borderLeft: 2, borderColor: 'primary.light', pl: 2 }}
                  >
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ mb: 0.5 }}
                    >
                      {record.action === 'approve' ? (
                        <CheckCircle2
                          size={16}
                          style={{ color: '#16a34a' }}
                        />
                      ) : (
                        <XCircle
                          size={16}
                          style={{ color: '#dc2626' }}
                        />
                      )}
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {record.action === 'approve' ? '通过' : '拒绝'}
                      </Typography>
                    </Stack>
                    <Stack
                      direction='row'
                      spacing={0.5}
                      sx={{ mb: 0.5 }}
                    >
                      <User size={12} />
                      <Typography
                        variant='caption'
                        sx={{ color: 'grey.500' }}
                      >
                        {record.actor_name || record.actor_id}
                      </Typography>
                    </Stack>
                    <Stack
                      direction='row'
                      spacing={0.5}
                    >
                      <Clock size={12} />
                      <Typography
                        variant='caption'
                        sx={{ color: 'grey.500' }}
                      >
                        {new Date(record.created_at).toLocaleString()}
                      </Typography>
                    </Stack>
                    {record.comment && (
                      <Typography
                        variant='caption'
                        sx={{ color: 'grey.600', fontStyle: 'italic', display: 'block', mt: 1 }}
                      >
                        "{record.comment}"
                      </Typography>
                    )}
                    {index < records.length - 1 && (
                      <Typography
                        variant='caption'
                        sx={{ color: 'grey.400', display: 'block', mt: 1 }}
                      >
                        状态变更: {record.previous_status} → {record.new_status}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        ),
      },
    ];
  }, [approval, records]);

  const actions = useMemo(() => {
    if (!approval || approval.status !== 'pending') return [];

    return [
      {
        label: '通过',
        icon: <CheckCircle size={18} />,
        onClick: () => {
          setApprovalAction('approve');
          setComment('');
          setShowApprovalModal(true);
        },
        variant: 'contained' as const,
        color: 'success' as const,
      },
      {
        label: '拒绝',
        icon: <XCircle size={18} />,
        onClick: () => {
          setApprovalAction('reject');
          setComment('');
          setShowApprovalModal(true);
        },
        variant: 'contained' as const,
        color: 'error' as const,
      },
    ];
  }, [approval]);

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <DetailPageTemplate
        title='审批详情'
        subtitle={approval?.task_name}
        loading={loading}
        error={error}
        backHref='/flow/approvals'
        tabs={tabs}
        actions={actions}
        infoCard={
          approval
            ? {
                title: approval.task_name,
                subtitle: `审批ID: ${approval.id}`,
                tags: [getStatusText(approval.status)],
              }
            : undefined
        }
      />

      <Dialog
        open={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
      >
        <DialogTitle>{approvalAction === 'approve' ? '通过审批' : '拒绝审批'}</DialogTitle>
        <DialogContent>
          <Typography
            variant='body2'
            sx={{ mb: 2 }}
          >
            {approvalAction === 'approve' ? '确认通过该审批任务' : '确认拒绝该审批任务'}
          </Typography>
          {approval && (
            <>
              <Typography
                variant='body2'
                sx={{ color: 'grey.600', mb: 1 }}
              >
                任务: {approval.task_name}
              </Typography>
              {approval.node_id && (
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.600', mb: 1 }}
                >
                  节点: {approval.node_id}
                </Typography>
              )}
            </>
          )}
          <Box sx={{ mt: 2 }}>
            <FormLabel>{approvalAction === 'reject' ? '拒绝原因 *' : '备注'}</FormLabel>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={approvalAction === 'reject' ? '请输入拒绝原因' : '可选备注'}
              sx={{ mt: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            color='inherit'
            onClick={() => setShowApprovalModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleProcessApproval}
            disabled={processing || (approvalAction === 'reject' && !comment.trim())}
            color={approvalAction === 'approve' ? 'success' : 'error'}
            startIcon={
              processing ? (
                <Loader2
                  size={16}
                  className='animate-spin'
                />
              ) : undefined
            }
          >
            {approvalAction === 'approve' ? '确认通过' : '确认拒绝'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FlowApprovalDetailPage;
