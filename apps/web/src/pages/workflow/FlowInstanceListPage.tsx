import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from '@mui/material';
import { Button } from '@mui/material';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Plus,
  FileText,
  Users,
  Eye,
  GitBranch,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { WorkflowInstance, Workflow } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { useAppStore } from '../../store';
import { apiLogger } from '@/utils/logger';
import { PageContainer } from '@/components/common';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/templates/ListPageTemplate';

const FlowInstanceListPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [workflowFilter, setWorkflowFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    workflow_id: '',
    initiator_id: '',
    data: {},
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, workflowFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(undefined);

      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (workflowFilter !== 'all') {
        params.workflow_id = workflowFilter;
      }

      const instanceResponse = await workflowApi.listInstances(params);
      if (instanceResponse.success && instanceResponse.data) {
        const data = instanceResponse.data as any;
        const instanceList = Array.isArray(data) ? data : data.items || [];
        setInstances(instanceList);
      } else {
        setInstances([]);
      }

      const workflowResponse = await workflowApi.listWorkflows({ is_active: true });
      if (workflowResponse.success && workflowResponse.data) {
        const data = workflowResponse.data as any;
        const workflowList = Array.isArray(data) ? data : data.items || [];
        setWorkflows(workflowList);
      }
    } catch (err: unknown) {
      apiLogger.error('加载数据失败:', err);
      setError('加载数据失败');
      addNotification({
        title: '加载失败',
        message: '加载数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartInstance = async () => {
    if (!createFormData.workflow_id) {
      addNotification({ title: '提示', message: '请选择工作流', type: 'info' });
      return;
    }

    try {
      setCreating(true);
      const response = await workflowApi.startInstance({
        workflow_id: createFormData.workflow_id,
        initiator_id: createFormData.initiator_id || undefined,
        data: createFormData.data,
      });

      if (response.success) {
        addNotification({
          title: '成功',
          message: '工作流实例启动成功',
          type: 'success',
        });
        setShowCreateModal(false);
        setCreateFormData({ workflow_id: '', initiator_id: '', data: {} });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: response.message || '启动失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '失败',
        message: '启动工作流实例失败',
        type: 'error',
      });
      apiLogger.error('启动失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadgeVariant = (
    status: string
  ): 'success' | 'error' | 'info' | 'warning' | 'default' | 'primary' | 'secondary' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'rejected':
        return 'error';
      case 'running':
        return 'info';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      completed: '已完成',
      rejected: '已拒绝',
      running: '进行中',
      pending: '待处理',
    };
    return statusMap[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} style={{ color: '#16a34a' }} />;
      case 'rejected':
        return <XCircle size={16} style={{ color: '#dc2626' }} />;
      case 'running':
        return <Play size={16} style={{ color: '#1e40af' }} />;
      case 'pending':
        return <Clock size={16} style={{ color: '#ca8a04' }} />;
      default:
        return <AlertCircle size={16} style={{ color: '#6b7280' }} />;
    }
  };

  const statusCounts = useMemo(() => ({
    all: instances.length,
    running: instances.filter((i) => i.status === 'running').length,
    pending: instances.filter((i) => i.status === 'pending').length,
    completed: instances.filter((i) => i.status === 'completed').length,
    rejected: instances.filter((i) => i.status === 'rejected').length,
  }), [instances]);

  const columns = useMemo<ColumnDef<WorkflowInstance>[]>(
    () => [
      {
        id: 'id',
        label: '实例 ID',
        width: 120,
        render: (row) => (
          <Typography sx={{ fontWeight: 500, color: 'grey.900', fontFamily: 'monospace' }}>
            {row.id.substring(0, 8)}...
          </Typography>
        ),
      },
      {
        id: 'workflow_id',
        label: '工作流',
        render: (row) => {
          const workflow = workflows.find((w) => w.id === row.workflow_id);
          return (
            <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
              <FileText size={14} />
              <Typography variant='body2'>{workflow?.name || '未知'}</Typography>
            </Stack>
          );
        },
      },
      {
        id: 'status',
        label: '状态',
        width: 130,
        render: (row) => {
          const status = row.status;
          return (
            <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
              {getStatusIcon(status)}
              <Chip
                size='small'
                variant={getStatusBadgeVariant(status) === 'warning' ? 'outlined' : 'filled'}
                color={getStatusBadgeVariant(status)}
                label={getStatusText(status)}
              />
            </Stack>
          );
        },
      },
      {
        id: 'current_node',
        label: '当前节点',
        width: 120,
        render: (row) =>
          row.current_node ? (
            <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
              <Users size={14} />
              <Typography variant='body2' color='text.secondary'>
                {row.current_node}
              </Typography>
            </Stack>
          ) : (
            '-'
          ),
      },
      {
        id: 'created_at',
        label: '创建时间',
        width: 180,
        sortable: true,
        render: (row) => (
          <Typography variant='body2' color='text.secondary'>
            {new Date(row.created_at).toLocaleString()}
          </Typography>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflows]
  );

  const rowActions: RowAction<WorkflowInstance>[] = [
    {
      label: '查看详情',
      icon: <Eye size={16} />,
      onClick: (row) => navigate(`/flow/instances`),
      color: 'primary',
    },
  ];

  const filters: FilterConfig[] = [
    {
      id: 'workflow',
      label: '工作流',
      type: 'select',
      options: workflows.map((w) => ({ label: w.name, value: w.id })),
      value: workflowFilter === 'all' ? '' : workflowFilter,
      onChange: (value) => setWorkflowFilter(value || 'all'),
    },
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部', value: 'all' },
        { label: '进行中', value: 'running' },
        { label: '待处理', value: 'pending' },
        { label: '已完成', value: 'completed' },
        { label: '已拒绝', value: 'rejected' },
      ],
      value: statusFilter,
      onChange: (value) => setStatusFilter(value || 'all'),
    },
  ];

  const headerContent = useMemo(() => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 2,
        mb: 3,
      }}
    >
      {Object.entries(statusCounts).map(([status, count]) => (
        <Card
          key={status}
          sx={{
            cursor: 'pointer',
            border: statusFilter === status ? 2 : 0,
            borderColor: 'primary.main',
          }}
          onClick={() => setStatusFilter(status)}
        >
          <CardContent sx={{ p: 2 }}>
            <Typography variant='h4' sx={{ fontWeight: 700 }}>
              {count}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {status === 'all' ? '全部' : getStatusText(status)}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  ), [statusCounts, statusFilter]);

  const actions = [
    {
      label: '启动实例',
      icon: <Plus size={20} />,
      onClick: () => setShowCreateModal(true),
      variant: 'contained' as const,
    },
  ];

  return (
    <PageContainer
      title='工作流实例'
      subtitle='管理运行中的工作流实例'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={instances}
        loading={loading}
        error={error}
        rowActions={rowActions}
        filters={filters}
        onRefresh={loadData}
        actions={actions}
        searchable
        searchPlaceholder='搜索实例ID...'
        headerContent={headerContent}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>启动工作流实例</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth size='small'>
              <InputLabel>选择工作流 *</InputLabel>
              <Select
                value={createFormData.workflow_id}
                label='选择工作流 *'
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    workflow_id: e.target.value,
                  })
                }
              >
                {workflows.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size='small'
              label='发起人ID'
              value={createFormData.initiator_id}
              onChange={(e) =>
                setCreateFormData({
                  ...createFormData,
                  initiator_id: e.target.value,
                })
              }
              placeholder='可选'
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant='contained' onClick={() => setShowCreateModal(false)}>
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleStartInstance}
            disabled={creating || !createFormData.workflow_id}
            startIcon={
              creating ? (
                <Loader2 size={16} className='animate-spin' />
              ) : undefined
            }
          >
            启动
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FlowInstanceListPage;