import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Stack,
  Typography,
  TextField,
  FormLabel,
  Chip,
  Button,
} from '@mui/material';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Users,
  FileText,
  Eye,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Approval } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { useAppStore } from '../../store';
import { apiLogger } from '@/utils/logger';
import { PageContainer } from '@/components/common';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/templates/ListPageTemplate';

const FlowApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const user = useAppStore((state) => state.user);

  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(undefined);

      const approvalParams = activeTab === 'pending' ? { status: 'pending' } : {};

      const approvalResponse = await workflowApi.listApprovals(approvalParams);
      if (approvalResponse.success && approvalResponse.data) {
        const data = approvalResponse.data as any;
        const approvalList = Array.isArray(data) ? data : data.items || [];
        setApprovals(approvalList);
      } else {
        setApprovals([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载数据失败:', err);
      setError('加载数据失败');
      addNotification({
        title: '错误',
        message: '加载数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessApproval = async () => {
    if (!selectedApproval) return;
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
      const response = await workflowApi.processApproval(selectedApproval.id, {
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
        setSelectedApproval(null);
        setComment('');
        loadData();
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
            size={16}
            style={{ color: '#16a34a' }}
          />
        );
      case 'rejected':
        return (
          <XCircle
            size={16}
            style={{ color: '#dc2626' }}
          />
        );
      case 'pending':
        return (
          <Clock
            size={16}
            style={{ color: '#ca8a04' }}
          />
        );
      default:
        return (
          <AlertCircle
            size={16}
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

  const filteredApprovals = useMemo(() => {
    return approvals.filter((a) => {
      const matchesSearch = a.task_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [approvals, searchTerm, statusFilter]);

  const pendingCount = useMemo(
    () => approvals.filter((a) => a.status === 'pending').length,
    [approvals]
  );

  const columns = useMemo<ColumnDef<Approval>[]>(
    () => [
      {
        id: 'task_name',
        label: '任务名称',
        render: (row) => (
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            {row.task_name}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => (
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ alignItems: 'center' }}
          >
            {getStatusIcon(row.status)}
            <Chip
              size='small'
              icon={getStatusIcon(row.status)}
              label={getStatusText(row.status)}
              color={getStatusColor(row.status)}
            />
          </Stack>
        ),
      },
      {
        id: 'node_id',
        label: '节点',
        width: 120,
        render: (row) =>
          row.node_id ? (
            <Stack
              direction='row'
              spacing={0.5}
              sx={{ alignItems: 'center' }}
            >
              <FileText
                size={14}
                style={{ color: 'text.secondary' }}
              />
              <Typography
                variant='body2'
                sx={{ color: 'grey.600' }}
              >
                {row.node_id}
              </Typography>
            </Stack>
          ) : (
            '-'
          ),
      },
      {
        id: 'approval_type',
        label: '审批类型',
        width: 100,
        render: (row) =>
          row.approval_type ? (
            <Stack
              direction='row'
              spacing={0.5}
              sx={{ alignItems: 'center' }}
            >
              <Users
                size={14}
                style={{ color: 'text.secondary' }}
              />
              <Typography
                variant='body2'
                sx={{ color: 'grey.600' }}
              >
                {row.approval_type === 'single'
                  ? '单人审批'
                  : row.approval_type === 'counter'
                    ? '会签审批'
                    : '或签审批'}
              </Typography>
            </Stack>
          ) : (
            '-'
          ),
      },
      {
        id: 'comment',
        label: '审批意见',
        render: (row) =>
          row.comment ? (
            <Stack
              direction='row'
              spacing={0.5}
              sx={{ alignItems: 'flex-start' }}
            >
              <MessageSquare
                size={14}
                style={{ color: 'text.disabled', marginTop: 2 }}
              />
              <Typography
                variant='body2'
                sx={{
                  color: 'grey.500',
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.comment}
              </Typography>
            </Stack>
          ) : (
            '-'
          ),
      },
      {
        id: 'created_at',
        label: '创建时间',
        width: 170,
        sortable: true,
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ color: 'grey.500' }}
          >
            {new Date(row.created_at).toLocaleString()}
          </Typography>
        ),
      },
      {
        id: 'approved_at',
        label: '处理时间',
        width: 170,
        render: (row) =>
          row.approved_at ? (
            <Typography
              variant='body2'
              sx={{ color: 'grey.500' }}
            >
              {new Date(row.approved_at).toLocaleString()}
            </Typography>
          ) : (
            '-'
          ),
      },
    ],
    []
  );

  const rowActions: RowAction<Approval>[] = [
    {
      label: '查看详情',
      icon: <Eye size={16} />,
      onClick: (row) => navigate(`'/flow/approvals'`),
      color: 'primary',
    },
    {
      label: '通过',
      icon: <CheckCircle size={16} />,
      onClick: (row) => {
        setSelectedApproval(row);
        setApprovalAction('approve');
        setComment('');
        setShowApprovalModal(true);
      },
      color: 'success',
      show: (row) => row.status === 'pending',
    },
    {
      label: '拒绝',
      icon: <XCircle size={16} />,
      onClick: (row) => {
        setSelectedApproval(row);
        setApprovalAction('reject');
        setComment('');
        setShowApprovalModal(true);
      },
      color: 'error',
      show: (row) => row.status === 'pending',
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '待审批', value: 'pending' },
        { label: '全部', value: 'all' },
      ],
      value: statusFilter,
      onChange: (value) => setStatusFilter(value || 'pending'),
    },
  ];

  return (
    <PageContainer
      title='审批管理'
      subtitle={pendingCount > 0 ? `${pendingCount} 项待审批` : '暂无待审批项'}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredApprovals}
        loading={loading}
        error={error}
        rowActions={rowActions}
        filters={activeTab === 'pending' ? filters : undefined}
        onRefresh={loadData}
        searchable
        searchPlaceholder='搜索审批任务...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        headerContent={
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <Button
              variant={activeTab === 'pending' ? 'contained' : 'outlined'}
              onClick={() => {
                setActiveTab('pending');
                setStatusFilter('pending');
              }}
              startIcon={<Clock size={16} />}
            >
              待我审批 ({pendingCount})
            </Button>
            <Button
              variant={activeTab === 'history' ? 'contained' : 'outlined'}
              onClick={() => {
                setActiveTab('history');
                setStatusFilter('all');
              }}
            >
              审批历史
            </Button>
          </Box>
        }
      />

      <Dialog
        open={showApprovalModal}
        onClose={() => {
          setShowApprovalModal(false);
          setSelectedApproval(null);
        }}
      >
        <DialogTitle>{approvalAction === 'approve' ? '通过审批' : '拒绝审批'}</DialogTitle>
        <DialogContent>
          <Typography
            variant='body2'
            sx={{ mb: 2 }}
          >
            {approvalAction === 'approve' ? '确认通过该审批任务' : '确认拒绝该审批任务'}
          </Typography>
          {selectedApproval && (
            <>
              <Typography
                variant='body2'
                sx={{ color: 'grey.600', mb: 1 }}
              >
                任务: {selectedApproval.task_name}
              </Typography>
              {selectedApproval.node_id && (
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.600', mb: 1 }}
                >
                  节点: {selectedApproval.node_id}
                </Typography>
              )}
            </>
          )}
          <Box sx={{ mt: 2 }}>
            <FormLabel>{approvalAction === 'reject' ? '拒绝原因 *' : '备注'}</FormLabel>
            <TextField
              size='small'
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
            onClick={() => {
              setShowApprovalModal(false);
              setSelectedApproval(null);
            }}
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

export default FlowApprovalPage;
