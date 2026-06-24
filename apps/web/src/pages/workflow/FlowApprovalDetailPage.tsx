import {
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Box,
  Typography,
  Chip,
  Stack,
  IconButton,
  TextField,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeft,
  User,
  FileText,
  CheckCircle2,
  MessageSquare,
  Eye,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Approval, ApprovalRecord } from '@/api/flow';
import { flowApi } from '@/api/flow';
import { useAppStore } from '../../store';
import { apiLogger } from '@/utils/logger';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        addNotification({
          title: '错误',
          message: '加载审批详情失败',
          type: 'error',
        });
      }
    } catch (err) {
      apiLogger.error('加载审批详情失败:', err);
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
        addNotification({
          title: '失败',
          message: response.message || '操作失败',
          type: 'error',
        });
      }
    } catch (err) {
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
            style={{ color: '#4b5563' }}
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

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'grey.50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Loader2
          size={32}
          className='animate-spin'
          style={{ color: '#6366f1' }}
        />
      </Box>
    );
  }

  if (!approval) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', p: 3 }}>
        <Box sx={{ textAlign: 'center', py: 12 }}>
          <AlertCircle
            size={64}
            style={{ color: '#d1d5db', margin: '0 auto', marginBottom: 8 }}
          />
          <Typography sx={{ color: 'grey.500' }}>审批不存在</Typography>
          <Button
            onClick={() => navigate('/flow/approvals')}
            variant='contained'
            sx={{ mt: 2, bgcolor: 'primary.main' }}
          >
            返回列表
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', p: 3 }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderRadius: 1, boxShadow: 1, p: 3, mb: 3 }}>
        <Stack
          direction='row'
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Stack
            direction='row'
            sx={{ alignItems: 'center' }}
            spacing={1.5}
          >
            <IconButton onClick={() => navigate('/flow/approvals')}>
              <ArrowLeft size={20} />
            </IconButton>
            <Box
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'primary.light',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle
                size={24}
                style={{ color: '#6366f1' }}
              />
            </Box>
            <Box>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                审批详情
              </Typography>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                {approval.task_name}
              </Typography>
            </Box>
          </Stack>
          <Stack
            direction='row'
            sx={{ alignItems: 'center' }}
            spacing={1.5}
          >
            <Chip
              icon={getStatusIcon(approval.status)}
              label={getStatusText(approval.status)}
              color={getStatusColor(approval.status)}
            />
            {approval.status === 'pending' && (
              <Stack
                direction='row'
                spacing={1}
              >
                <Button
                  variant='contained'
                  color='success'
                  onClick={() => {
                    setApprovalAction('approve');
                    setComment('');
                    setShowApprovalModal(true);
                  }}
                  startIcon={<CheckCircle size={16} />}
                >
                  通过
                </Button>
                <Button
                  variant='contained'
                  color='error'
                  onClick={() => {
                    setApprovalAction('reject');
                    setComment('');
                    setShowApprovalModal(true);
                  }}
                  startIcon={<XCircle size={16} />}
                >
                  拒绝
                </Button>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
        {/* Main Content */}
        <Box sx={{ gridColumn: 'span 2' }}>
          {/* Approval Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                审批信息
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
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
                    sx={{ alignItems: 'center' }}
                    spacing={0.5}
                  >
                    <User size={16} />
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
                      sx={{ alignItems: 'flex-start' }}
                      spacing={1}
                    >
                      <MessageSquare
                        size={16}
                        style={{ color: '#9ca3af', marginTop: 2 }}
                      />
                      <Typography variant='body2'>{approval.comment}</Typography>
                    </Stack>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Instance Link */}
          {approval.workflow_instance_id && (
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600, mb: 2 }}
                >
                  关联实例
                </Typography>
                <Button
                  variant='contained'
                  onClick={() => navigate(`/flow/instances/${approval?.workflow_instance_id}`)}
                  startIcon={<Eye size={20} />}
                >
                  查看关联的工作流实例
                </Button>
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Sidebar - Records */}
        <Box>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                审批记录
              </Typography>
              {records.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <FileText
                    size={48}
                    style={{
                      color: '#d1d5db',
                      margin: '0 auto',
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
                      sx={{
                        borderLeft: 2,
                        borderColor: 'primary.light',
                        pl: 2,
                      }}
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
                          sx={{
                            color: 'grey.600',
                            fontStyle: 'italic',
                            display: 'block',
                            mt: 1,
                            bgcolor: 'grey.50',
                            p: 1,
                            borderRadius: 0.5,
                          }}
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
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Approval Modal */}
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
                sx={{ color: 'grey.600' }}
              >
                任务: {approval.task_name}
              </Typography>
              {approval.node_id && (
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.600' }}
                >
                  节点: {approval.node_id}
                </Typography>
              )}
            </>
          )}
          <Box sx={{ mt: 2 }}>
            <Typography
              variant='body2'
              sx={{ mb: 1 }}
            >
              {approvalAction === 'reject' ? '拒绝原因 *' : '备注'}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={approvalAction === 'reject' ? '请输入拒绝原因' : '可选备注'}
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
    </Box>
  );
};

export default FlowApprovalDetailPage;
