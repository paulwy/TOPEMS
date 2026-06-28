import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Button,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
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
  Pause,
  StopCircle,
  RotateCcw,
  X,
  Activity,
  History,
  FileCheck,
  User,
  Calendar,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { WorkflowInstance, Workflow, Task } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { useAppStore } from '../../store';
import { apiLogger } from '@/utils/logger';
import { PageContainer } from '@/components/common';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/templates/ListPageTemplate';

type TabType = 'all' | 'mine' | 'running' | 'completed';

const FlowInstanceListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addNotification = useAppStore((state) => state.addNotification);
  const user = useAppStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [workflowFilter, setWorkflowFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [createFormData, setCreateFormData] = useState({
    workflow_id: '',
    initiator_id: '',
    data: {},
  });
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(undefined);

      const params: any = { page: 1, page_size: 100 };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (workflowFilter !== 'all') {
        params.workflow_id = workflowFilter;
      }
      if (activeTab === 'mine') {
        params.start_user_id = user?.id;
      }
      if (activeTab === 'running') {
        params.status = 'running';
      }
      if (activeTab === 'completed') {
        params.status = 'completed';
      }

      const [instanceRes, workflowRes] = await Promise.all([
        workflowApi.listInstances(params),
        workflowApi.listWorkflows({ isactive: true }),
      ]);

      if (instanceRes.success && instanceRes.data) {
        const data = instanceRes.data as any;
        setInstances(Array.isArray(data) ? data : data.items || []);
      } else {
        setInstances([]);
      }

      if (workflowRes.success && workflowRes.data) {
        const data = workflowRes.data as any;
        setWorkflows(Array.isArray(data) ? data : data.items || []);
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
  }, [statusFilter, workflowFilter, activeTab, user?.id, addNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const workflowId = searchParams.get('workflow_id');
    if (workflowId) {
      setCreateFormData({ ...createFormData, workflow_id: workflowId });
      setShowCreateModal(true);
    }
  }, [searchParams]);

  const handleStartInstance = async () => {
    if (!createFormData.workflow_id) {
      addNotification({ title: '提示', message: '请选择工作流', type: 'info' });
      return;
    }

    try {
      setCreating(true);
      const response = await workflowApi.startInstance({
        workflow_id: createFormData.workflow_id,
        initiator_id: createFormData.initiator_id || user?.id,
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

  const handleSuspend = async (instance: WorkflowInstance) => {
    try {
      setActionLoading(true);
      const res = await workflowApi.instances.suspendInstance(instance.id);
      if (res.success) {
        addNotification({ title: '成功', message: '实例已挂起', type: 'success' });
        setInstances((prev) =>
          prev.map((i) => (i.id === instance.id ? { ...i, status: 'suspended' } : i))
        );
      }
    } catch (err) {
      addNotification({ title: '错误', message: '挂起失败', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (instance: WorkflowInstance) => {
    try {
      setActionLoading(true);
      const res = await workflowApi.instances.activateInstance(instance.id);
      if (res.success) {
        addNotification({ title: '成功', message: '实例已激活', type: 'success' });
        setInstances((prev) =>
          prev.map((i) => (i.id === instance.id ? { ...i, status: 'running' } : i))
        );
      }
    } catch (err) {
      addNotification({ title: '错误', message: '激活失败', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminate = (instance: WorkflowInstance) => {
    setSelectedInstance(instance);
    setShowDeleteConfirm(true);
  };

  const confirmTerminate = async () => {
    if (!selectedInstance) return;
    try {
      setActionLoading(true);
      const res = await workflowApi.instances.deleteInstance(selectedInstance.id);
      if (res.success) {
        addNotification({ title: '成功', message: '实例已终止', type: 'success' });
        setInstances((prev) => prev.filter((i) => i.id !== selectedInstance.id));
        setShowDeleteConfirm(false);
        setSelectedInstance(null);
      }
    } catch (err) {
      addNotification({ title: '错误', message: '终止失败', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetail = (instance: WorkflowInstance) => {
    setSelectedInstance(instance);
    setShowDetailModal(true);
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
      case 'suspended':
        return 'default';
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
      suspended: '已挂起',
      terminated: '已终止',
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
      case 'suspended':
        return <Pause size={16} style={{ color: '#6b7280' }} />;
      default:
        return <AlertCircle size={16} style={{ color: '#6b7280' }} />;
    }
  };

  const filteredInstances = useMemo(() => {
    return instances.filter((instance) => {
      const matchesSearch =
        instance.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instance.name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [instances, searchTerm]);

  const statusCounts = useMemo(
    () => ({
      all: instances.length,
      running: instances.filter((i) => i.status === 'running').length,
      pending: instances.filter((i) => i.status === 'pending').length,
      completed: instances.filter((i) => i.status === 'completed').length,
      rejected: instances.filter((i) => i.status === 'rejected').length,
    }),
    [instances]
  );

  const columns = useMemo<ColumnDef<WorkflowInstance>[]>(
    () => [
      {
        id: 'name',
        label: '实例名称',
        width: 200,
        render: (row) => (
          <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor:
                  row.status === 'running'
                    ? 'info.light'
                    : row.status === 'completed'
                      ? 'success.light'
                      : 'grey.100',
              }}
            >
              <GitBranch
                size={18}
                color={
                  row.status === 'running'
                    ? '#1e40af'
                    : row.status === 'completed'
                      ? '#16a34a'
                      : '#6b7280'
                }
              />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {row.name || `实例-${row.id.substring(0, 8)}`}
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                {row.id.substring(0, 12)}...
              </Typography>
            </Box>
          </Stack>
        ),
      },
      {
        id: 'workflow',
        label: '流程定义',
        width: 150,
        render: (row) => {
          const workflow = workflows.find((w) => w.id === row.workflow_id);
          return (
            <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
              <FileText size={14} style={{ color: '#6b7280' }} />
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                {workflow?.name || '未知流程'}
              </Typography>
            </Stack>
          );
        },
      },
      {
        id: 'status',
        label: '状态',
        width: 110,
        render: (row) => (
          <Chip
            size='small'
            label={getStatusText(row.status)}
            color={getStatusBadgeVariant(row.status)}
            icon={getStatusIcon(row.status)}
          />
        ),
      },
      {
        id: 'currentnode',
        label: '当前节点',
        width: 130,
        render: (row) =>
          row.currentnode ? (
            <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
              <Activity size={14} style={{ color: '#6b7280' }} />
              <Typography variant='body2' color='text.secondary'>
                {row.currentnode}
              </Typography>
            </Stack>
          ) : (
            '-'
          ),
      },
      {
        id: 'initiator',
        label: '发起人',
        width: 100,
        render: (row) => (
          <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
            <User size={14} style={{ color: '#9ca3af' }} />
            <Typography variant='body2' color='text.secondary'>
              {row.start_user_name || row.initiator_id || '-'}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'created_at',
        label: '创建时间',
        width: 160,
        sortable: true,
        render: (row) => (
          <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
            <Calendar size={14} style={{ color: '#9ca3af' }} />
            <Typography variant='body2' color='text.secondary'>
              {new Date(row.created_at).toLocaleDateString('zh-CN')}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'duration',
        label: '耗时',
        width: 100,
        render: (row) => {
          if (!row.end_time) return '运行中';
          const start = new Date(row.created_at).getTime();
          const end = new Date(row.end_time).getTime();
          const hours = Math.round((end - start) / (1000 * 60 * 60));
          return `${hours} 小时`;
        },
      },
    ],
    [workflows]
  );

  const rowActions = useMemo<RowAction<WorkflowInstance>[]>(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
      {
        label: '流程图',
        icon: <GitBranch size={16} />,
        onClick: (row) => navigate(`/flow/monitor?instance_id=${row.id}`),
      },
      {
        label: '挂起',
        icon: <Pause size={16} />,
        onClick: (row) => handleSuspend(row),
        show: (row) => row.status === 'running',
      },
      {
        label: '激活',
        icon: <Play size={16} />,
        color: 'success',
        onClick: (row) => handleActivate(row),
        show: (row) => row.status === 'suspended',
      },
      {
        label: '终止',
        icon: <StopCircle size={16} />,
        color: 'error',
        onClick: (row) => handleTerminate(row),
        show: (row) => row.status === 'running' || row.status === 'suspended',
      },
    ],
    [navigate]
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'workflow',
        label: '流程定义',
        type: 'select',
        options: [
          { value: 'all', label: '全部流程' },
          ...workflows.map((w) => ({ label: w.name, value: w.id })),
        ],
        value: workflowFilter,
        onChange: (value) => setWorkflowFilter(value as string),
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '进行中', value: 'running' },
          { label: '待处理', value: 'pending' },
          { label: '已挂起', value: 'suspended' },
          { label: '已完成', value: 'completed' },
          { label: '已拒绝', value: 'rejected' },
        ],
        value: statusFilter,
        onChange: (value) => setStatusFilter(value as string),
      },
    ],
    [workflows, statusFilter, workflowFilter]
  );

  const tabHeaders = useMemo(
    () => (
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              minHeight: 48,
              fontWeight: 500,
            },
          }}
        >
          <Tab label='全部实例' value='all' />
          <Tab label='我发起的' value='mine' />
          <Tab label='运行中' value='running' />
          <Tab label='已完成' value='completed' />
        </Tabs>
      </Box>
    ),
    [activeTab]
  );

  const headerStats = useMemo(
    () => (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 2,
          mb: 3,
        }}
      >
        {[
          { key: 'all', label: '全部', count: statusCounts.all, icon: FileText, color: 'primary' },
          { key: 'running', label: '进行中', count: statusCounts.running, icon: Play, color: 'info' },
          { key: 'pending', label: '待处理', count: statusCounts.pending, icon: Clock, color: 'warning' },
          { key: 'completed', label: '已完成', count: statusCounts.completed, icon: CheckCircle, color: 'success' },
          { key: 'rejected', label: '已拒绝', count: statusCounts.rejected, icon: XCircle, color: 'error' },
        ].map((item) => (
          <Card
            key={item.key}
            sx={{
              cursor: 'pointer',
              border: statusFilter === item.key ? 2 : 0,
              borderColor: `${item.color}.main`,
              transition: 'all 0.2s',
              '&:hover': { boxShadow: 2 },
            }}
            onClick={() => setStatusFilter(item.key)}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: `${item.color}.light`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <item.icon size={20} />
                </Box>
                <Box>
                  <Typography variant='h4' sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {item.count}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {item.label}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
    ),
    [statusCounts, statusFilter]
  );

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
      title='流程实例'
      subtitle='管理和监控所有流程实例'
    >
      {tabHeaders}
      {headerStats}

      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredInstances}
        loading={loading}
        error={error}
        rowActions={rowActions}
        filters={filters}
        onRefresh={loadData}
        actions={actions}
        searchable
        searchPlaceholder='搜索实例名称、ID...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => !creating && setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Stack direction='row' sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='h6' sx={{ fontWeight: 600 }}>
              启动流程实例
            </Typography>
            <IconButton size='small' onClick={() => setShowCreateModal(false)} disabled={creating}>
              <X size={20} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
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
              placeholder='可选，默认为当前用户'
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowCreateModal(false)} disabled={creating}>
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleStartInstance}
            disabled={creating || !createFormData.workflow_id}
            startIcon={
              creating ? (
                <Loader2 size={16} className='animate-spin' />
              ) : (
                <Play size={16} />
              )
            }
          >
            {creating ? '启动中...' : '启动'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          <Stack direction='row' sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='h6' sx={{ fontWeight: 600 }}>
              实例详情
            </Typography>
            <IconButton size='small' onClick={() => setShowDetailModal(false)}>
              <X size={20} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {selectedInstance && (
            <Box sx={{ pt: 1 }}>
              <Stack direction='row' spacing={3} sx={{ mb: 3 }}>
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor:
                      selectedInstance.status === 'running'
                        ? 'info.light'
                        : selectedInstance.status === 'completed'
                          ? 'success.light'
                          : 'grey.100',
                  }}
                >
                  <GitBranch
                    size={28}
                    color={
                      selectedInstance.status === 'running'
                        ? '#1e40af'
                        : selectedInstance.status === 'completed'
                          ? '#16a34a'
                          : '#6b7280'
                    }
                  />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant='h6' sx={{ fontWeight: 600, mb: 0.5 }}>
                    {selectedInstance.name || `流程实例`}
                  </Typography>
                  <Stack direction='row' spacing={1}>
                    <Chip
                      size='small'
                      label={getStatusText(selectedInstance.status)}
                      color={getStatusBadgeVariant(selectedInstance.status)}
                      icon={getStatusIcon(selectedInstance.status)}
                    />
                  </Stack>
                </Box>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 1.5 }}>
                基本信息
              </Typography>
              <List dense sx={{ mb: 2 }}>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 100 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      实例ID
                    </Typography>
                  </ListItemIcon>
                  <ListItemText primary={selectedInstance.id} sx={{ my: 0 }} />
                </ListItem>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 100 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      流程定义
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={workflows.find((w) => w.id === selectedInstance.workflow_id)?.name || '未知'}
                    sx={{ my: 0 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 100 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      当前节点
                    </Typography>
                  </ListItemIcon>
                  <ListItemText primary={selectedInstance.currentnode || '-'} sx={{ my: 0 }} />
                </ListItem>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 100 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      发起人
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={selectedInstance.start_user_name || selectedInstance.initiator_id || '-'}
                    sx={{ my: 0 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 100 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      创建时间
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={new Date(selectedInstance.created_at).toLocaleString('zh-CN')}
                    sx={{ my: 0 }}
                  />
                </ListItem>
                {selectedInstance.end_time && (
                  <ListItem sx={{ px: 0, py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 100 }}>
                      <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                        结束时间
                      </Typography>
                    </ListItemIcon>
                    <ListItemText
                      primary={new Date(selectedInstance.end_time).toLocaleString('zh-CN')}
                      sx={{ my: 0 }}
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          {selectedInstance && (
            <>
              <Button
                variant='outlined'
                startIcon={<History size={16} />}
                onClick={() => {
                  setShowDetailModal(false);
                  navigate(`/flow/monitor?instance_id=${selectedInstance.id}`);
                }}
              >
                流程跟踪
              </Button>
              {(selectedInstance.status === 'running' || selectedInstance.status === 'suspended') && (
                <Button
                  variant='contained'
                  color='error'
                  startIcon={<StopCircle size={16} />}
                  onClick={() => {
                    setShowDetailModal(false);
                    handleTerminate(selectedInstance);
                  }}
                >
                  终止实例
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        maxWidth='sm'
      >
        <DialogTitle>
          <Typography variant='h6' sx={{ fontWeight: 600 }}>
            确认终止
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant='body2' sx={{ mb: 1 }}>
            确定要终止流程实例 <strong>{selectedInstance?.name || selectedInstance?.id.substring(0, 8)}</strong> 吗？
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            终止后该流程将无法继续执行，相关的待办任务也会被取消。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowDeleteConfirm(false)}>取消</Button>
          <Button
            variant='contained'
            color='error'
            startIcon={<StopCircle size={16} />}
            onClick={confirmTerminate}
            disabled={actionLoading}
          >
            {actionLoading ? '终止中...' : '确认终止'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FlowInstanceListPage;
