import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  FileText,
  Play,
  Pause,
  Copy,
  History,
  GitBranch,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { Workflow } from '@/api/workflow';
import { workflowApi, CreateWorkflowRequest } from '@/api/workflow';
import { useAppStore } from '../../store';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable, BackButton } from '@/components/common';
import {
  Box,
  TextField,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  InputAdornment,
  IconButton,
  Switch,
  FormControlLabel,
  Tooltip,
  Skeleton,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import { Button } from '@mui/material';
import { apiLogger } from '@/utils/logger';

const FlowWorkflowPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    loadWorkflows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') {
        params.is_active = statusFilter === 'active';
      }

      const response = await workflowApi.listWorkflows(params);
      if (response.success && response.data) {
        const data = response.data as any;
        const workflowList = Array.isArray(data) ? data : data.items || [];
        setWorkflows(workflowList);
      } else {
        setWorkflows([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载工作流列表失败:', err);
      addNotification({
        title: '加载失败',
        message: '加载工作流列表失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async () => {
    if (!formData.name.trim()) {
      addNotification({
        title: '提示',
        message: '请输入工作流名称',
        type: 'info',
      });
      return;
    }

    try {
      setCreating(true);
      const response = await workflowApi.createWorkflow({
        name: formData.name,
        description: formData.description,
        is_active: formData.is_active,
      });

      if (response.success && response.data) {
        addNotification({
          title: '成功',
          message: '工作流创建成功',
          type: 'success',
        });
        setShowCreateDialog(false);
        setFormData({ name: '', description: '', is_active: true });
        loadWorkflows();
        navigate(`/flow/definitions`);
      } else {
        addNotification({
          title: '失败',
          message: response.message || '创建失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '失败',
        message: '创建工作流失败',
        type: 'error',
      });
      apiLogger.error('创建失败:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!window.confirm('确定要删除这个工作流吗？')) return;

    try {
      const response = await workflowApi.deleteWorkflow(id);
      if (response.success) {
        addNotification({
          title: '成功',
          message: '工作流已删除',
          type: 'success',
        });
        loadWorkflows();
      } else {
        addNotification({
          title: '失败',
          message: response.message || '删除失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '失败',
        message: '删除工作流失败',
        type: 'error',
      });
      apiLogger.error('删除失败:', err);
    }
  };

  const handleToggleActive = async (workflow: Workflow) => {
    try {
      const response = await workflowApi.updateWorkflow(workflow.id, {
        is_active: !workflow.is_active,
      });
      if (response.success) {
        addNotification({
          title: '成功',
          message: `工作流已${workflow.is_active ? '停用' : '启用'}`,
          type: 'success',
        });
        loadWorkflows();
      } else {
        addNotification({
          title: '失败',
          message: response.message || '操作失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({ title: '失败', message: '操作失败', type: 'error' });
      apiLogger.error('切换状态失败:', err);
    }
  };

  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = useMemo<ColumnDef<Workflow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: '工作流名称',
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <GitBranch sx={{ width: 16, height: 16, mr: 0.5, color: 'grey.400' }} />
            <Typography sx={{ fontWeight: 'medium' }}>{row.original.name}</Typography>
          </Box>
        ),
      },
      {
        accessorKey: 'description',
        header: '描述',
        cell: ({ row }) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.original.description || '-'}
          </Typography>
        ),
      },
      {
        accessorKey: 'is_active',
        header: '状态',
        cell: ({ row }) => (
          <Chip
            size='small'
            color={row.original.is_active ? 'success' : 'default'}
            label={row.original.is_active ? '已启用' : '已停用'}
          />
        ),
      },
      {
        accessorKey: 'created_at',
        header: '创建时间',
        cell: ({ row }) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {new Date(row.original.created_at).toLocaleString('zh-CN')}
          </Typography>
        ),
      },
      {
        accessorKey: 'updated_at',
        header: '更新时间',
        cell: ({ row }) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {new Date(row.original.updated_at).toLocaleString('zh-CN')}
          </Typography>
        ),
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title='编辑设计'>
              <IconButton
                size='small'
                onClick={() => navigate(`/flow/definitions`)}
              >
                <Edit sx={{ width: 16, height: 16 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title='版本历史'>
              <IconButton
                size='small'
                onClick={() => navigate(`/flow/history`)}
              >
                <History sx={{ width: 16, height: 16 }} />
              </IconButton>
            </Tooltip>

            <Tooltip title={row.original.is_active ? '停用' : '启用'}>
              <IconButton
                size='small'
                onClick={() => handleToggleActive(row.original)}
              >
                {row.original.is_active ? (
                  <Pause sx={{ width: 16, height: 16 }} />
                ) : (
                  <Play sx={{ width: 16, height: 16 }} />
                )}
              </IconButton>
            </Tooltip>

            <Tooltip title='删除'>
              <IconButton
                size='small'
                color='error'
                onClick={() => handleDeleteWorkflow(row.original.id)}
              >
                <Trash2 sx={{ width: 16, height: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate]
  );

  const stats = {
    total: workflows.length,
    active: workflows.filter((w) => w.is_active).length,
    inactive: workflows.filter((w) => !w.is_active).length,
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <BackButton href='/dashboard' />
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
                <GitBranch sx={{ width: 24, height: 24, color: 'primary.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 'bold' }}
                >
                  工作流管理
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  设计和管理审批流程
                </Typography>
              </Box>
            </Box>
            <Button
              variant='contained'
              startIcon={<Plus sx={{ width: 20, height: 20 }} />}
              onClick={() => setShowCreateDialog(true)}
            >
              创建工作流
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 2,
          mb: 3,
        }}
      >
        <Card
          sx={{
            cursor: 'pointer',
            border: statusFilter === 'all' ? 2 : 0,
            borderColor: 'primary.main',
          }}
          onClick={() => setStatusFilter('all')}
        >
          <CardContent>
            <Typography
              variant='h4'
              sx={{ fontWeight: 'bold' }}
            >
              {stats.total}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              全部工作流
            </Typography>
          </CardContent>
        </Card>
        <Card
          sx={{
            cursor: 'pointer',
            border: statusFilter === 'active' ? 2 : 0,
            borderColor: 'primary.main',
          }}
          onClick={() => setStatusFilter('active')}
        >
          <CardContent>
            <Typography
              variant='h4'
              color='success.main'
              sx={{ fontWeight: 'bold' }}
            >
              {stats.active}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              已启用
            </Typography>
          </CardContent>
        </Card>
        <Card
          sx={{
            cursor: 'pointer',
            border: statusFilter === 'inactive' ? 2 : 0,
            borderColor: 'primary.main',
          }}
          onClick={() => setStatusFilter('inactive')}
        >
          <CardContent>
            <Typography
              variant='h4'
              sx={{ fontWeight: 'bold' }}
              color='text.secondary'
            >
              {stats.inactive}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              已停用
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              size='small'
              placeholder='搜索工作流名称...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search sx={{ width: 20, height: 20, color: 'grey.400' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ flex: 1 }}
            />
            <Button
              variant='outlined'
              onClick={loadWorkflows}
            >
              {loading ? (
                <CircularProgress
                  size={16}
                  sx={{ mr: 1 }}
                />
              ) : null}
              刷新
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Box
                  key={i}
                  sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                >
                  <Skeleton
                    variant='circular'
                    width={48}
                    height={48}
                  />
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                    }}
                  >
                    <Skeleton
                      variant='text'
                      width='75%'
                    />
                    <Skeleton
                      variant='text'
                      width='50%'
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <DataTable
              columns={columns}
              data={filteredWorkflows}
              searchKey='name'
              searchPlaceholder='搜索工作流...'
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新建工作流</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              size='small'
              label='工作流名称 *'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder='请输入工作流名称'
              fullWidth
            />
            <TextField
              size='small'
              label='描述'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='请输入工作流描述'
              multiline
              rows={3}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label='启用工作流'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateDialog(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleCreateWorkflow}
            disabled={creating}
            startIcon={creating ? <CircularProgress size={16} /> : null}
          >
            创建并设计
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FlowWorkflowPage;
