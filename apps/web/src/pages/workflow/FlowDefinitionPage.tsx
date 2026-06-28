import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiLogger } from '@/utils/logger';
import { workflowApi } from '@/api/workflow';
import type { Workflow, WorkflowCategory } from '@/api/workflow';
import { useNotification } from '@/hooks/useNotification';
import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Button,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Tooltip,
} from '@mui/material';
import { FileUpload, PageContainer } from '@/components/common';
import {
  Eye,
  Plus,
  Edit,
  Send,
  Ban,
  Upload,
  Download,
  Trash2,
  Copy,
  GitBranch,
  PlayCircle,
  PauseCircle,
  Clock,
  Users,
  Settings,
  X,
  Check,
  History,
  Layers,
  FileText,
} from 'lucide-react';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/templates';

const getStatusColor = (status: boolean): 'success' | 'default' | 'warning' | 'error' => {
  if (status) return 'success';
  return 'default';
};

const getStatusText = (status: boolean) => {
  return status ? '已发布' : '已停用';
};

const getTypeText = (type: string) => {
  switch (type) {
    case 'approval':
      return '审批流程';
    case 'reimbursement':
      return '报销流程';
    case 'contract':
      return '合同流程';
    case 'purchase':
      return '采购流程';
    case 'travel':
      return '差旅流程';
    case 'leave':
      return '请假流程';
    case 'custom':
      return '自定义流程';
    default:
      return type;
  }
};

const FlowDefinitionPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [data, setData] = useState<Workflow[]>([]);
  const [categories, setCategories] = useState<WorkflowCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<Workflow | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    type: 'approval',
    category: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [workflowsRes, categoriesRes] = await Promise.all([
        workflowApi.listWorkflows(),
        workflowApi.categories.listCategories(),
      ]);
      if (workflowsRes.success && workflowsRes.data) {
        const items = workflowsRes.data.items || [];
        setData(items);
        setStats({
          total: items.length,
          active: items.filter((w) => w.isactive).length,
          inactive: items.filter((w) => !w.isactive).length,
        });
      }
      if (categoriesRes.success && categoriesRes.data) {
        setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : (categoriesRes.data as any).items || []);
      }
    } catch (err: unknown) {
      apiLogger.error('Error loading workflows:', err);
      error('加载流程定义失败');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !typeFilter || item.data?.type === typeFilter;
      const matchesCategory = !categoryFilter || item.data?.category === categoryFilter;
      const matchesStatus = !statusFilter || String(item.isactive) === statusFilter;
      return matchesSearch && matchesType && matchesCategory && matchesStatus;
    });
  }, [data, searchTerm, typeFilter, categoryFilter, statusFilter]);

  const handleView = (flow: Workflow) => {
    setSelectedFlow(flow);
    setShowDetailModal(true);
  };

  const handleEdit = (flow: Workflow) => {
    navigate(`/flow/flow-designer?id=${flow.id}`);
  };

  const handleCreate = () => {
    setCreateForm({ name: '', description: '', type: 'approval', category: '' });
    setShowCreateModal(true);
  };

  const handleSubmitCreate = async () => {
    if (!createForm.name.trim()) {
      error('请输入流程名称');
      return;
    }
    try {
      setSubmitting(true);
      const res = await workflowApi.createWorkflow({
        name: createForm.name,
        description: createForm.description,
        isactive: false,
        created_by: 'current-user',
        data: {
          type: createForm.type,
          category: createForm.category,
        },
      });
      if (res.success) {
        success('流程创建成功');
        setShowCreateModal(false);
        loadData();
        if (res.data && (res.data as any).id) {
          navigate(`/flow/flow-designer?id=${(res.data as any).id}`);
        }
      } else {
        error(res.message || '创建失败');
      }
    } catch (err: unknown) {
      apiLogger.error('Error creating workflow:', err);
      error('创建流程失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (flow: Workflow) => {
    try {
      await workflowApi.deployWorkflow(flow.id);
      setData((prev) => prev.map((f) => (f.id === flow.id ? { ...f, isactive: true } : f)));
      setStats((prev) => ({
        ...prev,
        active: prev.active + 1,
        inactive: Math.max(0, prev.inactive - 1),
      }));
      success('流程已发布');
    } catch (err: unknown) {
      apiLogger.error('Error publishing workflow:', err);
      error('发布流程失败');
    }
  };

  const handleDisable = async (flow: Workflow) => {
    try {
      await workflowApi.deactivateWorkflow(flow.id);
      setData((prev) => prev.map((f) => (f.id === flow.id ? { ...f, isactive: false } : f)));
      setStats((prev) => ({
        ...prev,
        active: Math.max(0, prev.active - 1),
        inactive: prev.inactive + 1,
      }));
      success('流程已停用');
    } catch (err: unknown) {
      apiLogger.error('Error disabling workflow:', err);
      error('停用流程失败');
    }
  };

  const handleCopy = async (flow: Workflow) => {
    try {
      const res = await workflowApi.templates.copyTemplate(flow.id, {
        name: `${flow.name} - 副本`,
      });
      if (res.success) {
        success('流程复制成功');
        loadData();
      }
    } catch (err: unknown) {
      apiLogger.error('Error copying workflow:', err);
      error('复制流程失败');
    }
  };

  const handleDelete = (flow: Workflow) => {
    setSelectedFlow(flow);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedFlow) return;
    try {
      await workflowApi.deleteWorkflow(selectedFlow.id);
      setData((prev) => prev.filter((f) => f.id !== selectedFlow.id));
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        active: selectedFlow.isactive ? Math.max(0, prev.active - 1) : prev.active,
        inactive: !selectedFlow.isactive ? Math.max(0, prev.inactive - 1) : prev.inactive,
      }));
      success('流程已删除');
      setShowDeleteConfirm(false);
      setSelectedFlow(null);
    } catch (err: unknown) {
      apiLogger.error('Error deleting workflow:', err);
      error('删除流程失败');
    }
  };

  const handleExport = async (flow: Workflow) => {
    try {
      const res = await workflowApi.workflows.exportWorkflow?.(flow.id);
      success('导出成功');
    } catch (err: unknown) {
      apiLogger.error('Error exporting workflow:', err);
      error('导出流程失败');
    }
  };

  const handleStartInstance = (flow: Workflow) => {
    navigate(`/flow/instances?workflow_id=${flow.id}&action=start`);
  };

  const handleViewVersions = (flow: Workflow) => {
    navigate(`/flow/history?workflow_id=${flow.id}`);
  };

  const columns = useMemo<ColumnDef<Workflow>[]>(
    () => [
      {
        id: 'name',
        label: '流程名称',
        width: 200,
        render: (row) => (
          <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: row.isactive ? 'primary.light' : 'grey.200',
              }}
            >
              <GitBranch
                size={18}
                color={row.isactive ? 'primary' : 'grey.500'}
              />
            </Avatar>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600, color: 'text.primary' }}
              >
                {row.name}
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary' }}
              >
                {row.description || '暂无描述'}
              </Typography>
            </Box>
          </Stack>
        ),
      },
      {
        id: 'type',
        label: '流程类型',
        width: 100,
        render: (row) => (
          <Chip
            size='small'
            label={getTypeText(row.data?.type || 'approval')}
            variant='outlined'
            sx={{ bgcolor: 'background.paper' }}
          />
        ),
      },
      {
        id: 'version',
        label: '版本',
        width: 80,
        render: (row) => (
          <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
            <Layers size={14} style={{ color: '#6b7280' }} />
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {row.definition?.version || 'v1.0'}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => (
          <Chip
            size='small'
            label={getStatusText(row.isactive)}
            color={getStatusColor(row.isactive)}
            icon={
              row.isactive ? (
                <PlayCircle size={14} />
              ) : (
                <PauseCircle size={14} />
              )
            }
          />
        ),
      },
      {
        id: 'nodes',
        label: '节点数',
        width: 80,
        render: (row) => (
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {row.definition?.nodes?.length || 0} 个
          </Typography>
        ),
      },
      {
        id: 'creator',
        label: '创建人',
        width: 100,
        render: (row) => row.created_by || '-',
      },
      {
        id: 'usage',
        label: '使用次数',
        width: 90,
        render: (row) => (
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {row.data?.usageCount || 0} 次
          </Typography>
        ),
      },
      {
        id: 'createdAt',
        label: '更新时间',
        width: 160,
        render: (row) => (
          <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
            <Clock size={14} style={{ color: '#9ca3af' }} />
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {new Date(row.updated_at || row.created_at).toLocaleDateString('zh-CN')}
            </Typography>
          </Stack>
        ),
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<Workflow>[]>(
    () => [
      {
        label: '查看',
        icon: <Eye size={16} />,
        onClick: (row) => handleView(row),
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row) => handleEdit(row),
      },
      {
        label: '启动流程',
        icon: <PlayCircle size={16} />,
        color: 'success',
        onClick: (row) => handleStartInstance(row),
        show: (row) => row.isactive,
      },
      {
        label: '发布',
        icon: <Send size={16} />,
        color: 'primary',
        onClick: (row) => handlePublish(row),
        show: (row) => !row.isactive,
      },
      {
        label: '停用',
        icon: <Ban size={16} />,
        color: 'warning',
        onClick: (row) => handleDisable(row),
        show: (row) => row.isactive,
      },
      {
        label: '复制',
        icon: <Copy size={16} />,
        onClick: (row) => handleCopy(row),
      },
      {
        label: '版本历史',
        icon: <History size={16} />,
        onClick: (row) => handleViewVersions(row),
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row),
      },
    ],
    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'category',
        label: '流程分类',
        type: 'select',
        options: [
          { value: '', label: '全部分类' },
          ...categories.map((c) => ({ value: c.id, label: c.name })),
        ],
        value: categoryFilter,
        onChange: (value) => {
          setCategoryFilter(value as string);
        },
      },
      {
        id: 'type',
        label: '流程类型',
        type: 'select',
        options: [
          { value: '', label: '全部类型' },
          { value: 'approval', label: '审批流程' },
          { value: 'reimbursement', label: '报销流程' },
          { value: 'contract', label: '合同流程' },
          { value: 'purchase', label: '采购流程' },
          { value: 'travel', label: '差旅流程' },
          { value: 'leave', label: '请假流程' },
          { value: 'custom', label: '自定义流程' },
        ],
        value: typeFilter,
        onChange: (value) => {
          setTypeFilter(value as string);
        },
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部状态' },
          { value: 'true', label: '已发布' },
          { value: 'false', label: '已停用' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value as string);
        },
      },
    ],
    [typeFilter, categoryFilter, statusFilter, categories]
  );

  const headerStats = useMemo(
    () => (
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Box
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 1,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                bgcolor: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={20} style={{ color: 'primary.main' }} />
            </Box>
            <Box>
              <Typography variant='h4' sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {stats.total}
              </Typography>
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                全部流程
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Box
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 1,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                bgcolor: 'success.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={20} style={{ color: '#16a34a' }} />
            </Box>
            <Box>
              <Typography variant='h4' sx={{ fontWeight: 700, lineHeight: 1.2, color: 'success.main' }}>
                {stats.active}
              </Typography>
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                已发布
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Box
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 1,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                bgcolor: 'grey.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PauseCircle size={20} style={{ color: '#6b7280' }} />
            </Box>
            <Box>
              <Typography variant='h4' sx={{ fontWeight: 700, lineHeight: 1.2, color: 'text.secondary' }}>
                {stats.inactive}
              </Typography>
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                已停用
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>
    ),
    [stats]
  );

  return (
    <PageContainer
      title='流程定义管理'
      subtitle='管理和配置所有工作流程定义'
    >
      {headerStats}

      <ListPageTemplate<Workflow>
        title=''
        subtitle=''
        columns={columns}
        data={filteredData}
        loading={loading}
        searchable
        searchPlaceholder='搜索流程名称、描述...'
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
        }}
        filters={filters}
        rowActions={rowActions}
        actions={[
          {
            label: '导入',
            icon: <Upload size={18} />,
            onClick: () => setShowUploadModal(true),
            variant: 'outlined',
          },
          {
            label: '导出',
            icon: <Download size={18} />,
            onClick: () => {},
            variant: 'outlined',
          },
          {
            label: '新建流程',
            icon: <Plus size={18} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        onRefresh={loadData}
      />

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          <Stack direction='row' sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='h6' sx={{ fontWeight: 600 }}>
              流程详情
            </Typography>
            <IconButton
              size='small'
              onClick={() => setShowDetailModal(false)}
            >
              <X size={20} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {selectedFlow && (
            <Box sx={{ pt: 1 }}>
              <Stack direction='row' spacing={3} sx={{ mb: 3 }}>
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: selectedFlow.isactive ? 'primary.light' : 'grey.200',
                  }}
                >
                  <GitBranch size={32} color={selectedFlow.isactive ? 'primary' : 'grey.500'} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant='h6' sx={{ fontWeight: 600, mb: 0.5 }}>
                    {selectedFlow.name}
                  </Typography>
                  <Typography variant='body2' sx={{ color: 'text.secondary', mb: 1 }}>
                    {selectedFlow.description || '暂无描述'}
                  </Typography>
                  <Stack direction='row' spacing={1}>
                    <Chip
                      size='small'
                      label={getTypeText(selectedFlow.data?.type || 'approval')}
                      variant='outlined'
                    />
                    <Chip
                      size='small'
                      label={getStatusText(selectedFlow.isactive)}
                      color={getStatusColor(selectedFlow.isactive)}
                    />
                    <Chip
                      size='small'
                      label={`版本 ${selectedFlow.definition?.version || 'v1.0'}`}
                      variant='outlined'
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
                  <ListItemIcon sx={{ minWidth: 120 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      流程ID
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={selectedFlow.id}
                    sx={{ my: 0 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 120 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      创建人
                    </Typography>
                  </ListItemIcon>
                  <ListItemText primary={selectedFlow.created_by || '-'} sx={{ my: 0 }} />
                </ListItem>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 120 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      节点数量
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={`${selectedFlow.definition?.nodes?.length || 0} 个`}
                    sx={{ my: 0 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 120 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      使用次数
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={`${selectedFlow.data?.usageCount || 0} 次`}
                    sx={{ my: 0 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 120 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      创建时间
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={new Date(selectedFlow.created_at).toLocaleString('zh-CN')}
                    sx={{ my: 0 }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 120 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                      更新时间
                    </Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={new Date(
                      selectedFlow.updated_at || selectedFlow.created_at
                    ).toLocaleString('zh-CN')}
                    sx={{ my: 0 }}
                  />
                </ListItem>
              </List>

              <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 1.5 }}>
                流程节点
              </Typography>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {selectedFlow.definition?.nodes?.map((node, index) => (
                    <Chip
                      key={node.node_id}
                      size='small'
                      label={node.name || node.node_id}
                      sx={{ mb: 0.5 }}
                    />
                  ))}
                </Stack>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
          {selectedFlow && (
            <>
              <Button
                variant='outlined'
                startIcon={<Edit size={16} />}
                onClick={() => {
                  setShowDetailModal(false);
                  handleEdit(selectedFlow);
                }}
              >
                编辑流程
              </Button>
              <Button
                variant='contained'
                startIcon={<PlayCircle size={16} />}
                disabled={!selectedFlow.isactive}
                onClick={() => {
                  setShowDetailModal(false);
                  handleStartInstance(selectedFlow);
                }}
              >
                启动流程
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={showCreateModal}
        onClose={() => !submitting && setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Stack direction='row' sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='h6' sx={{ fontWeight: 600 }}>
              新建流程
            </Typography>
            <IconButton
              size='small'
              onClick={() => !submitting && setShowCreateModal(false)}
              disabled={submitting}
            >
              <X size={20} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              label='流程名称 *'
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder='请输入流程名称'
              size='small'
              fullWidth
              autoFocus
            />
            <TextField
              label='流程描述'
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder='请输入流程描述（可选）'
              size='small'
              fullWidth
              multiline
              rows={2}
            />
            <FormControl size='small' fullWidth>
              <InputLabel>流程类型</InputLabel>
              <Select
                value={createForm.type}
                label='流程类型'
                onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
              >
                <MenuItem value='approval'>审批流程</MenuItem>
                <MenuItem value='reimbursement'>报销流程</MenuItem>
                <MenuItem value='contract'>合同流程</MenuItem>
                <MenuItem value='purchase'>采购流程</MenuItem>
                <MenuItem value='travel'>差旅流程</MenuItem>
                <MenuItem value='leave'>请假流程</MenuItem>
                <MenuItem value='custom'>自定义流程</MenuItem>
              </Select>
            </FormControl>
            {categories.length > 0 && (
              <FormControl size='small' fullWidth>
                <InputLabel>流程分类</InputLabel>
                <Select
                  value={createForm.category}
                  label='流程分类'
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                >
                  <MenuItem value=''>未分类</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setShowCreateModal(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSubmitCreate}
            disabled={submitting || !createForm.name.trim()}
            startIcon={submitting ? <Box className='animate-spin'>⏳</Box> : <Plus size={16} />}
          >
            {submitting ? '创建中...' : '创建流程'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          <Stack direction='row' sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='h6' sx={{ fontWeight: 600 }}>
              导入流程
            </Typography>
            <IconButton
              size='small'
              onClick={() => setShowUploadModal(false)}
            >
              <X size={20} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ py: 2 }}>
            <Typography variant='body2' sx={{ color: 'text.secondary', mb: 2 }}>
              支持 BPMN、XML、JSON 格式的流程定义文件
            </Typography>
            <FileUpload
              value={attachments}
              onChange={setAttachments}
              accept={['bpmn', 'xml', 'json']}
              maxCount={5}
              maxSize={10}
              maxTotalSize={50}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowUploadModal(false)}>取消</Button>
          <Button
            variant='contained'
            startIcon={<Upload size={16} />}
            onClick={() => {
              success('导入成功');
              setShowUploadModal(false);
              loadData();
            }}
          >
            确认导入
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        maxWidth='sm'
      >
        <DialogTitle>
          <Typography variant='h6' sx={{ fontWeight: 600 }}>
            确认删除
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant='body2' sx={{ mb: 1 }}>
            确定要删除流程 <strong>{selectedFlow?.name}</strong> 吗？
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            删除后该流程将无法恢复，相关的流程实例和历史数据可能会受影响。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowDeleteConfirm(false)}>取消</Button>
          <Button
            variant='contained'
            color='error'
            startIcon={<Trash2 size={16} />}
            onClick={confirmDelete}
          >
            确认删除
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FlowDefinitionPage;
