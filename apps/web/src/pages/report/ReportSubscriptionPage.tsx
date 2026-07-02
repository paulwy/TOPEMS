import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Chip,
  Tooltip,
  Button, useTheme} from '@mui/material';
import {
  Plus as PlusIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Mail,
  Calendar,
  User,
  FileText,
} from 'lucide-react';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import {
  reportApi,
  type ReportSubscription,
  type ReportTemplate,
  type CreateSubscriptionRequest,
  type UpdateSubscriptionRequest,
  type SubscriptionFrequency,
} from '@/api/report';

const FREQUENCY_OPTIONS: { value: SubscriptionFrequency; label: string }[] = [
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季度' },
];

const STATUS_OPTIONS = [
  { label: '已启用', value: 'enabled' },
  { label: '已禁用', value: 'disabled' },
];

const ReportSubscriptionPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<ReportSubscription[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<ReportSubscription | null>(null);

  // 搜索和筛选状态
  const [searchValue, setSearchValue] = useState('');
  const [filtersValue, setFiltersValue] = useState<Record<string, any>>({});

  const [formData, setFormData] = useState<CreateSubscriptionRequest | UpdateSubscriptionRequest>({
    template_id: '',
    user_id: '',
    email: '',
    frequency: 'weekly',
    enabled: true,
  });

  useEffect(() => {
    fetchSubscriptions();
    fetchTemplates();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await reportApi.listSubscriptions();
      if (response.success && response.data) {
        setSubscriptions(response.data);
      } else {
        setError(response.message || '获取订阅列表失败');
      }
    } catch (err: unknown) {
      setError('获取订阅列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await reportApi.listTemplates();
      if (response.success && response.data) {
        setTemplates(response.data);
      }
    } catch (err: unknown) {
      console.error('获取报表模板失败', err);
    }
  };

  // 筛选和搜索后的数据
  const filteredData = useMemo(() => {
    let result = [...subscriptions];

    if (searchValue) {
      const query = searchValue.toLowerCase();
      result = result.filter(
        (item) =>
          (item.template_name || item.template_id).toLowerCase().includes(query) ||
          (item.email || '').toLowerCase().includes(query) ||
          (item.user_id || '').toLowerCase().includes(query)
      );
    }

    if (filtersValue.frequency) {
      result = result.filter((item) => item.frequency === filtersValue.frequency);
    }

    if (filtersValue.status) {
      const enabled = filtersValue.status === 'enabled';
      result = result.filter((item) => item.enabled === enabled);
    }

    return result;
  }, [subscriptions, searchValue, filtersValue]);

  const handleOpenCreateDialog = () => {
    setEditMode(false);
    setCurrentSubscription(null);
    setFormData({
      template_id: '',
      user_id: '',
      email: '',
      frequency: 'weekly',
      enabled: true,
    });
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (subscription: ReportSubscription) => {
    setEditMode(true);
    setCurrentSubscription(subscription);
    setFormData({
      template_id: subscription.template_id,
      user_id: subscription.user_id,
      email: subscription.email,
      frequency: subscription.frequency,
      enabled: subscription.enabled,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({
      template_id: '',
      user_id: '',
      email: '',
      frequency: 'weekly',
      enabled: true,
    });
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError('');
    try {
      if (editMode && currentSubscription) {
        const response = await reportApi.updateSubscription(
          currentSubscription.id,
          formData as UpdateSubscriptionRequest
        );
        if (response.success) {
          setDialogOpen(false);
          fetchSubscriptions();
        } else {
          setError(response.message || '更新订阅失败');
        }
      } else {
        const response = await reportApi.createSubscription(formData as CreateSubscriptionRequest);
        if (response.success) {
          setDialogOpen(false);
          fetchSubscriptions();
        } else {
          setError(response.message || '创建订阅失败');
        }
      }
    } catch (err: unknown) {
      setError(editMode ? '更新订阅失败' : '创建订阅失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个订阅吗？')) return;
    setError('');
    try {
      const response = await reportApi.deleteSubscription(id);
      if (response.success) {
        fetchSubscriptions();
      } else {
        setError(response.message || '删除订阅失败');
      }
    } catch (err: unknown) {
      setError('删除订阅失败');
    }
  };

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    setError('');
    try {
      const response = await reportApi.updateSubscription(id, {
        enabled: !currentEnabled,
      });
      if (response.success) {
        fetchSubscriptions();
      } else {
        setError(response.message || '切换订阅状态失败');
      }
    } catch (err: unknown) {
      setError('切换订阅状态失败');
    }
  };

  const getFrequencyLabel = (frequency: SubscriptionFrequency) => {
    return FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label || frequency;
  };

  const columns: ColumnDef<ReportSubscription>[] = useMemo(
    () => [
      {
        id: 'template_name',
        label: '报表模板',
        minWidth: 180,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FileText style={{ width: 16, height: 16, color: theme.palette.primary.main }} />
            <span>{row.template_name || row.template_id}</span>
          </Box>
        ),
      },
      {
        id: 'user_id',
        label: '用户ID',
        minWidth: 120,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <User style={{ width: 14, height: 14, color: theme.palette.text.secondary }} />
            <span>{row.user_id}</span>
          </Box>
        ),
      },
      {
        id: 'email',
        label: '邮箱',
        minWidth: 200,
        render: (row) =>
          row.email ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Mail style={{ width: 14, height: 14, color: theme.palette.text.secondary }} />
              <span>{row.email}</span>
            </Box>
          ) : (
            '-'
          ),
      },
      {
        id: 'frequency',
        label: '订阅频率',
        minWidth: 100,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Calendar style={{ width: 14, height: 14, color: theme.palette.text.secondary }} />
            <span>{getFrequencyLabel(row.frequency)}</span>
          </Box>
        ),
      },
      {
        id: 'enabled',
        label: '状态',
        minWidth: 120,
        render: (row) => (
          <Chip
            label={row.enabled ? '已启用' : '已禁用'}
            color={row.enabled ? 'success' : 'default'}
            size='small'
            onClick={(e) => {
              e.stopPropagation();
              handleToggle(row.id, row.enabled);
            }}
            sx={{ cursor: 'pointer' }}
          />
        ),
      },
      {
        id: 'created_at',
        label: '创建时间',
        minWidth: 160,
        render: (row) => (row.created_at ? new Date(row.created_at).toLocaleString('zh-CN') : '-'),
      },
    ],
    []
  );

  const rowActions: RowAction<ReportSubscription>[] = useMemo(
    () => [
      {
        label: '编辑',
        icon: <EditIcon style={{ width: 16, height: 16 }} />,
        color: 'primary',
        onClick: (row) => handleOpenEditDialog(row),
      },
      {
        label: '删除',
        icon: <DeleteIcon style={{ width: 16, height: 16 }} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个订阅吗？',
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'frequency',
        label: '订阅频率',
        type: 'select',
        options: FREQUENCY_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: STATUS_OPTIONS,
      },
    ],
    []
  );

  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    setFiltersValue(filters);
  }, []);

  return (
    <PageContainer
      title='报表订阅管理'
      subtitle='管理报表订阅，设置订阅者、订阅方式和订阅频率'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredData}
        loading={loading}
        error={error}
        searchable
        searchPlaceholder='搜索模板名称、邮箱或用户ID...'
        onSearch={handleSearch}
        filters={filters}
        onFilterChange={handleFilterChange}
        rowActions={rowActions}
        actions={[
          {
            label: '新建订阅',
            icon: <PlusIcon style={{ width: 16, height: 16 }} />,
            onClick: handleOpenCreateDialog,
            variant: 'contained',
          },
        ]}
        onRefresh={fetchSubscriptions}
        emptyMessage='暂无订阅数据'
      />

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{editMode ? '编辑订阅' : '新建订阅'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl
              fullWidth
              required
            >
              <InputLabel>报表模板</InputLabel>
              <Select
                value={(formData as CreateSubscriptionRequest).template_id as string}
                onChange={(e) => handleFormChange('template_id', e.target.value)}
                label='报表模板'
              >
                {templates.map((template) => (
                  <MenuItem
                    key={template.id}
                    value={template.id}
                  >
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label='用户ID'
              value={(formData as CreateSubscriptionRequest).user_id as string}
              onChange={(e) => handleFormChange('user_id', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label='邮箱'
              value={formData.email as string}
              onChange={(e) => handleFormChange('email', e.target.value)}
              fullWidth
              type='email'
              placeholder='接收报表的邮箱地址'
            />
            <FormControl
              fullWidth
              required
            >
              <InputLabel>订阅频率</InputLabel>
              <Select
                value={formData.frequency as SubscriptionFrequency}
                onChange={(e) => handleFormChange('frequency', e.target.value)}
                label='订阅频率'
              >
                {FREQUENCY_OPTIONS.map((option) => (
                  <MenuItem
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={((formData as CreateSubscriptionRequest).enabled as boolean) || false}
                  onChange={(e) => handleFormChange('enabled', e.target.checked)}
                />
              }
              label='启用订阅'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button
            onClick={handleSubmit}
            variant='contained'
          >
            {editMode ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ReportSubscriptionPage;
