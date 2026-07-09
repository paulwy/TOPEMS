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
  Paper,
  Avatar,
  Divider,
  useTheme,
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
  ArrowRightLeft,
  UserPlus,
  PlayCircle,
  GitBranch,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Approval, ApprovalRecord } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { useAppStore } from '../../store';
import { apiLogger } from '@/utils/logger';
import { DetailPageTemplate } from '@/components/templates/DetailPageTemplate';
import type { TabConfig, SectionConfig } from '@/components/templates/DetailPageTemplate';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const FlowApprovalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const user = useAppStore((state) => state.user);
  const theme = useTheme();

  const [approval, setApproval] = useState<Approval | null>(null);
  const [records, setRecords] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [delegateTarget, setDelegateTarget] = useState('');
  const [delegateReason, setDelegateReason] = useState('');
  const [delegateLoading, setDelegateLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadApprovalDetails();
    }
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

  const handleDelegate = async () => {
    if (!approval || !delegateTarget.trim()) {
      addNotification({
        title: '提示',
        message: '请输入转办目标人员',
        type: 'info',
      });
      return;
    }

    try {
      setDelegateLoading(true);
      const response = await workflowApi.processApproval(approval.id, {
        action: 'delegate',
        comment: delegateReason || undefined,
        actor_id: user?.id || 'system-user-id',
        actor_name: user?.fullName || user?.username || 'Current User',
        delegate_to: delegateTarget,
        delegate_to_name: delegateTarget,
      });

      if (response.success) {
        addNotification({
          title: '成功',
          message: `已转办给 ${delegateTarget}`,
          type: 'success',
        });
        setShowDelegateModal(false);
        setDelegateTarget('');
        setDelegateReason('');
        loadApprovalDetails();
      } else {
        addNotification({
          title: '失败',
          message: response.message || '转办失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: '转办操作失败',
        type: 'error',
      });
      apiLogger.error('转办失败:', err);
    } finally {
      setDelegateLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <CheckCircle
            size={20}
            style={{ color: ct.success[600] }}
          />
        );
      case 'rejected':
        return (
          <XCircle
            size={20}
            style={{ color: ct.error[600] }}
          />
        );
      case 'pending':
        return (
          <Clock
            size={20}
            style={{ color: ct.warning[600] }}
          />
        );
      default:
        return (
          <AlertCircle
            size={20}
            style={{ color: ct.grey[500] }}
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
                      style={{ color: theme.palette.text.disabled, marginTop: 2 }}
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
                    color: theme.palette.grey[300],
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
                          style={{ color: ct.success[600] }}
                        />
                      ) : (
                        <XCircle
                          size={16}
                          style={{ color: ct.error[600] }}
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
      {
        id: 'timeline',
        label: '流程时间线',
        icon: <GitBranch size={16} />,
        content: (
          <Box>
            <Typography
              variant='body2'
              sx={{ color: 'grey.500', mb: 2 }}
            >
              完整流程审批轨迹追踪
            </Typography>
            {records.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <PlayCircle
                  size={48}
                  style={{
                    color: theme.palette.grey[300],
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    marginBottom: 8,
                  }}
                />
                <Typography sx={{ color: 'grey.500' }}>流程尚未开始处理</Typography>
              </Box>
            ) : (
              <Box sx={{ position: 'relative' }}>
                {/* 时间线竖线 */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: 19,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    bgcolor: 'grey.200',
                  }}
                />
                <Stack spacing={3}>
                  {/* 流程发起节点 */}
                  <Box sx={{ display: 'flex', gap: 2, position: 'relative' }}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: 'primary.main',
                        zIndex: 1,
                      }}
                    >
                      <PlayCircle size={20} />
                    </Avatar>
                    <Paper
                      sx={{
                        flex: 1,
                        p: 2,
                        bgcolor: 'primary.50',
                        border: 1,
                        borderColor: 'primary.100',
                      }}
                    >
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600 }}
                      >
                        流程发起
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ color: 'grey.500' }}
                      >
                        发起人: {approval?.assignee_id || '系统'}
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ display: 'block', color: 'grey.400' }}
                      >
                        {approval?.created_at ? new Date(approval.created_at).toLocaleString() : ''}
                      </Typography>
                    </Paper>
                  </Box>

                  {/* 各审批步骤 */}
                  {records.map((record, index) => {
                    const isLast = index === records.length - 1;
                    const isApproved = record.action === 'approve';
                    return (
                      <Box
                        key={record.id}
                        sx={{ display: 'flex', gap: 2, position: 'relative' }}
                      >
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: isApproved ? 'success.main' : 'error.main',
                            zIndex: 1,
                          }}
                        >
                          {isApproved ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                        </Avatar>
                        <Paper
                          sx={{
                            flex: 1,
                            p: 2,
                            bgcolor: isApproved ? 'success.50' : 'error.50',
                            border: 1,
                            borderColor: isApproved ? 'success.100' : 'error.100',
                          }}
                        >
                          <Stack
                            direction='row'
                            sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
                          >
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 600 }}
                            >
                              {isApproved ? '审批通过' : '审批拒绝'}
                            </Typography>
                            <Chip
                              size='small'
                              label={`步骤 ${index + 1}`}
                              color={isApproved ? 'success' : 'error'}
                              variant='outlined'
                            />
                          </Stack>
                          <Stack
                            direction='row'
                            spacing={0.5}
                            sx={{ alignItems: 'center', mb: 0.5 }}
                          >
                            <User
                              size={14}
                              style={{ color: theme.palette.grey[500] }}
                            />
                            <Typography
                              variant='caption'
                              sx={{ color: 'grey.600' }}
                            >
                              {record.actor_name || record.actor_id}
                            </Typography>
                          </Stack>
                          <Stack
                            direction='row'
                            spacing={0.5}
                            sx={{ alignItems: 'center', mb: 0.5 }}
                          >
                            <Clock
                              size={14}
                              style={{ color: theme.palette.grey[400] }}
                            />
                            <Typography
                              variant='caption'
                              sx={{ color: 'grey.500' }}
                            >
                              {new Date(record.created_at).toLocaleString()}
                            </Typography>
                          </Stack>
                          {record.comment && (
                            <Box
                              sx={{
                                mt: 1,
                                p: 1,
                                bgcolor: 'background.paper',
                                borderRadius: 1,
                                borderLeft: 2,
                                borderColor: isApproved ? 'success.main' : 'error.main',
                              }}
                            >
                              <Typography
                                variant='caption'
                                sx={{ color: 'grey.700', fontStyle: 'italic' }}
                              >
                                "{record.comment}"
                              </Typography>
                            </Box>
                          )}
                        </Paper>
                      </Box>
                    );
                  })}

                  {/* 当前待处理节点（如果还在进行中） */}
                  {approval?.status === 'pending' && (
                    <Box sx={{ display: 'flex', gap: 2, position: 'relative' }}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: 'warning.main',
                          zIndex: 1,
                        }}
                      >
                        <Clock size={20} />
                      </Avatar>
                      <Paper
                        sx={{
                          flex: 1,
                          p: 2,
                          bgcolor: 'warning.50',
                          border: 1,
                          borderColor: 'warning.100',
                          borderStyle: 'dashed',
                        }}
                      >
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 600 }}
                        >
                          当前待审批
                        </Typography>
                        <Typography
                          variant='caption'
                          sx={{ color: 'grey.500' }}
                        >
                          审批人: {approval.assignee_id || 'N/A'}
                        </Typography>
                        {approval.timeout_at && (
                          <Typography
                            variant='caption'
                            sx={{ display: 'block', color: 'warning.main', mt: 0.5 }}
                          >
                            超时时间: {new Date(approval.timeout_at).toLocaleString()}
                          </Typography>
                        )}
                      </Paper>
                    </Box>
                  )}
                </Stack>
              </Box>
            )}
          </Box>
        ),
      },
      {
        id: 'formData',
        label: '表单数据',
        icon: <FileText size={16} />,
        content: (
          <Box>
            <Typography
              variant='body2'
              sx={{ color: 'grey.500', mb: 2 }}
            >
              当前审批关联的表单数据
            </Typography>
            {(approval as any)?.form_data && Object.keys((approval as any).form_data).length > 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                {Object.entries((approval as any).form_data).map(([key, value]) => (
                  <Box
                    key={key}
                    sx={{
                      p: 2,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <Typography
                      variant='caption'
                      sx={{ color: 'grey.500', fontWeight: 600, display: 'block', mb: 0.5 }}
                    >
                      {key}
                    </Typography>
                    <Typography variant='body2'>{String(value ?? '-')}</Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <FileText
                  size={48}
                  style={{
                    color: theme.palette.grey[300],
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    marginBottom: 8,
                  }}
                />
                <Typography sx={{ color: 'grey.500' }}>暂无关联表单数据</Typography>
                <Typography
                  variant='caption'
                  sx={{ color: 'grey.400', display: 'block', mt: 0.5 }}
                >
                  表单数据将在流程发起后自动填充
                </Typography>
              </Box>
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
      {
        label: '转办',
        icon: <ArrowRightLeft size={18} />,
        onClick: () => {
          setDelegateTarget('');
          setDelegateReason('');
          setShowDelegateModal(true);
        },
        variant: 'outlined' as const,
        color: 'primary' as const,
      },
      {
        label: '委派',
        icon: <UserPlus size={18} />,
        onClick: () => {
          setDelegateTarget('');
          setDelegateReason('');
          setShowDelegateModal(true);
        },
        variant: 'outlined' as const,
        color: 'info' as const,
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

      {/* 转办/委派对话框 */}
      <Dialog
        open={showDelegateModal}
        onClose={() => setShowDelegateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>转办审批任务</DialogTitle>
        <DialogContent>
          <Typography
            variant='body2'
            sx={{ mb: 2 }}
          >
            将该审批任务转办给其他人员处理
          </Typography>
          {approval && (
            <Typography
              variant='body2'
              sx={{ color: 'grey.600', mb: 1 }}
            >
              当前任务: {approval.task_name}
            </Typography>
          )}
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              size='small'
              label='转办目标人员 *'
              value={delegateTarget}
              onChange={(e) => setDelegateTarget(e.target.value)}
              placeholder='请输入目标人员姓名或ID'
              fullWidth
            />
            <TextField
              size='small'
              label='转办原因'
              value={delegateReason}
              onChange={(e) => setDelegateReason(e.target.value)}
              placeholder='请输入转办原因'
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            color='inherit'
            onClick={() => setShowDelegateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleDelegate}
            disabled={delegateLoading || !delegateTarget.trim()}
            startIcon={
              delegateLoading ? (
                <Loader2
                  size={16}
                  className='animate-spin'
                />
              ) : (
                <ArrowRightLeft size={16} />
              )
            }
          >
            确认转办
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FlowApprovalDetailPage;
