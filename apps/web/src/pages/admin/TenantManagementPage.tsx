import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import {
  Box,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Building2,
  Users,
  HardDrive,
  Activity,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { tenantApi } from '@/api/tenant';
import type { Tenant, TenantStatus, TenantPlan } from '@/api/tenant/types';
import { logger } from '@/utils/logger';
import { ADMIN_PATHS } from '@/modules/admin/config';
import { useConfirmDialog, useUrlListState } from '@/hooks';

const statusColors: Record<TenantStatus, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  trial: 'warning',
  suspended: 'error',
  deleted: 'default',
};

const statusLabels: Record<TenantStatus, string> = {
  active: '已激活',
  trial: '试用中',
  suspended: '已停用',
  deleted: '已删除',
};

const planLabels: Record<TenantPlan, string> = {
  free: '免费版',
  basic: '基础版',
  professional: '专业版',
  enterprise: '企业版',
};

const planColors: Record<TenantPlan, 'default' | 'primary' | 'secondary' | 'success'> = {
  free: 'default',
  basic: 'primary',
  professional: 'secondary',
  enterprise: 'success',
};

const TenantManagementPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const listState = useUrlListState<{ status: string; plan: string }>({
    defaultSearch: '',
    defaultPageSize: 10,
    defaultFilters: { status: 'all', plan: 'all' },
    baseIndex: 1,
    historyMode: 'replace',
  });
  const {
    searchQuery,
    debouncedSearch,
    currentPage,
    pageSize,
    filters: urlFilters,
    setSearchQuery,
    setFilter,
    setCurrentPage,
    setPageSize,
  } = listState;
  const statusFilter = urlFilters.status;
  const planFilter = urlFilters.plan;
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    plan: 'professional' as TenantPlan,
  });

  const tenantsQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.TENANT.TENANTS,
      currentPage,
      pageSize,
      debouncedSearch,
      statusFilter,
      planFilter,
    ],
    queryFn: async () => {
      const res = await tenantApi.listTenants({
        page: currentPage,
        pageSize,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        plan: planFilter !== 'all' ? planFilter : undefined,
      });
      if (res.success && res.data) {
        return { items: res.data.items, total: res.data.total };
      }
      throw new Error(res.message || '加载租户列表失败');
    },
  });

  const tenants = tenantsQuery.data?.items || [];
  const total = tenantsQuery.data?.total || 0;
  const loading = tenantsQuery.isLoading;
  const error = tenantsQuery.error ? '加载租户列表失败' : null;

  const loadTenants = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT.TENANTS });
  };

  const createTenantMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; plan: TenantPlan }) => {
      const res = await tenantApi.createTenant(data);
      if (!res.success) {
        throw new Error(res.message || '创建租户失败');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT.TENANTS });
      setShowCreateDialog(false);
      setFormData({ name: '', slug: '', plan: 'professional' });
    },
    onError: (err: unknown) => {
      logger.error('Failed to create tenant:', err);
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; slug: string; plan: TenantPlan };
    }) => {
      const res = await tenantApi.updateTenant(id, data);
      if (!res.success) {
        throw new Error(res.message || '更新租户失败');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT.TENANTS });
      setShowEditDialog(false);
      setSelectedTenant(null);
    },
    onError: (err: unknown) => {
      logger.error('Failed to update tenant:', err);
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await tenantApi.deleteTenant(id);
      if (!res.success) {
        throw new Error(res.message || '删除租户失败');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT.TENANTS });
      setConfirmDialogClosed();
    },
    onError: (err: unknown) => {
      logger.error('Failed to delete tenant:', err);
    },
  });

  const suspendTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await tenantApi.suspendTenant(id);
      if (!res.success) {
        throw new Error(res.message || '停用租户失败');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT.TENANTS });
      setConfirmDialogClosed();
    },
    onError: (err: unknown) => {
      logger.error('Failed to suspend tenant:', err);
    },
  });

  const activateTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await tenantApi.activateTenant(id);
      if (!res.success) {
        throw new Error(res.message || '激活租户失败');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT.TENANTS });
    },
    onError: (err: unknown) => {
      logger.error('Failed to activate tenant:', err);
    },
  });

  const handleCreateTenant = () => {
    createTenantMutation.mutate(formData);
  };

  const handleUpdateTenant = () => {
    if (!selectedTenant) return;
    updateTenantMutation.mutate({ id: selectedTenant.id, data: formData });
  };

  const handleDeleteTenant = useCallback(
    (tenant: Tenant) => {
      openConfirmDialog({
        title: '确认删除租户',
        message: `确定要删除租户"${tenant.name}"吗？此操作不可恢复。`,
        danger: true,
        onConfirm: () => deleteTenantMutation.mutate(tenant.id),
      });
    },
    [deleteTenantMutation, openConfirmDialog]
  );

  const handleSuspendTenant = useCallback(
    (tenant: Tenant) => {
      openConfirmDialog({
        title: '确认停用租户',
        message: `确定要停用租户"${tenant.name}"吗？停用后该租户的所有用户将无法登录。`,
        danger: true,
        onConfirm: () => suspendTenantMutation.mutate(tenant.id),
      });
    },
    [suspendTenantMutation, openConfirmDialog]
  );

  const handleActivateTenant = useCallback(
    (tenant: Tenant) => {
      activateTenantMutation.mutate(tenant.id);
    },
    [activateTenantMutation]
  );

  const openEditDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
    });
    setShowEditDialog(true);
  };

  const columns: ColumnDef<Tenant>[] = useMemo(
    () => [
      {
        id: 'name',
        label: '租户名称',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 3,
                bgcolor: row.settings?.branding?.primary_color
                  ? `${row.settings.branding.primary_color}20`
                  : 'primary.main10',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2
                size={20}
                style={{
                  color: row.settings?.branding?.primary_color || theme.palette.primary.main,
                }}
              />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {row.name}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {row.slug}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => (
          <Chip
            label={statusLabels[row.status as TenantStatus]}
            color={statusColors[row.status as TenantStatus]}
            size='small'
          />
        ),
      },
      {
        id: 'plan',
        label: '套餐',
        render: (row) => (
          <Chip
            label={planLabels[row.plan as TenantPlan]}
            color={planColors[row.plan as TenantPlan]}
            size='small'
            variant='outlined'
          />
        ),
      },
      {
        id: 'max_users',
        label: '用户数',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Users
              size={16}
              style={{ opacity: 0.5 }}
            />
            <Typography variant='body2'>{row.settings?.max_users || '-'}</Typography>
          </Box>
        ),
      },
      {
        id: 'max_storage',
        label: '存储配额',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HardDrive
              size={16}
              style={{ opacity: 0.5 }}
            />
            <Typography variant='body2'>
              {row.settings?.max_storage_gb ? `${row.settings.max_storage_gb} GB` : '-'}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'created_at',
        label: '创建时间',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.created_at ? new Date(row.created_at).toLocaleDateString('zh-CN') : '-'}
          </Typography>
        ),
      },
    ],
    []
  );

  const rowActions: RowAction<Tenant>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: (row) => navigate(ADMIN_PATHS.tenantDetail.replace(':id', row.id)),
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row) => openEditDialog(row),
      },
      {
        label: '停用',
        icon: <Activity size={16} />,
        color: 'warning',
        show: (row) => row.status === 'active',
        onClick: (row) => handleSuspendTenant(row),
        confirm: true,
        confirmMessage: '确定要停用该租户吗？',
      },
      {
        label: '激活',
        icon: <Activity size={16} />,
        color: 'success',
        show: (row) => row.status === 'suspended',
        onClick: (row) => handleActivateTenant(row),
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDeleteTenant(row),
        divider: true,
        confirm: true,
        confirmMessage: '确定要删除该租户吗？此操作不可恢复。',
      },
    ],
    [navigate, handleSuspendTenant, handleActivateTenant, handleDeleteTenant]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '已激活', value: 'active' },
          { label: '试用中', value: 'trial' },
          { label: '已停用', value: 'suspended' },
        ],
      },
      {
        id: 'plan',
        label: '套餐',
        type: 'select',
        options: [
          { label: '全部套餐', value: 'all' },
          { label: '免费版', value: 'free' },
          { label: '基础版', value: 'basic' },
          { label: '专业版', value: 'professional' },
          { label: '企业版', value: 'enterprise' },
        ],
      },
    ],
    []
  );

  const statsCards = useMemo(
    () => [
      { label: '总租户', value: total, icon: Building2, color: 'primary' },
      {
        label: '活跃租户',
        value: tenants.filter((t) => t.status === 'active').length,
        icon: Activity,
        color: 'success',
      },
      {
        label: '试用租户',
        value: tenants.filter((t) => t.status === 'trial').length,
        icon: Search,
        color: 'warning',
      },
      {
        label: '已停用',
        value: tenants.filter((t) => t.status === 'suspended').length,
        icon: Users,
        color: 'error',
      },
    ],
    [total, tenants]
  );

  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    if (filters.status !== undefined) {
      setFilter('status', filters.status);
    }
    if (filters.plan !== undefined) {
      setFilter('plan', filters.plan);
    }
  }, [setFilter]);

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Building2 size={20} />,
      }}
    >
      <ListPageTemplate
        columns={columns}
        data={tenants}
        loading={loading}
        error={error || undefined}
        rowActions={rowActions}
        searchable
        searchPlaceholder='搜索租户名称或标识...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        filtersValue={{ status: statusFilter, plan: planFilter }}
        onFilterChange={handleFilterChange}
        pagination={{
          page: currentPage,
          pageSize,
          total,
          onPageChange: setCurrentPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
        }}
        actions={[
          {
            label: '创建租户',
            icon: <Plus size={20} />,
            onClick: () => setShowCreateDialog(true),
          },
        ]}
        onRefresh={loadTenants}
        headerContent={
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 2 }}>
            {statsCards.map((stat, index) => (
              <Card
                variant='outlined'
                key={index}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 3,
                        bgcolor: `${stat.color}.main10`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <stat.icon size={24} />
                    </Box>
                    <Box>
                      <Typography
                        variant='h4'
                        sx={{ fontWeight: 700 }}
                      >
                        {stat.value}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {stat.label}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        }
      />

      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>创建租户</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label='租户名称'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label='租户标识 (Slug)'
              value={formData.slug}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                })
              }
              fullWidth
              helperText='仅支持小写字母、数字和连字符'
            />
            <FormControl fullWidth>
              <InputLabel>套餐</InputLabel>
              <Select
                value={formData.plan}
                label='套餐'
                onChange={(e) => setFormData({ ...formData, plan: e.target.value as TenantPlan })}
              >
                <MenuItem value='free'>免费版</MenuItem>
                <MenuItem value='basic'>基础版</MenuItem>
                <MenuItem value='professional'>专业版</MenuItem>
                <MenuItem value='enterprise'>企业版</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleCreateTenant}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑租户</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label='租户名称'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label='租户标识 (Slug)'
              value={formData.slug}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                })
              }
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>套餐</InputLabel>
              <Select
                value={formData.plan}
                label='套餐'
                onChange={(e) => setFormData({ ...formData, plan: e.target.value as TenantPlan })}
              >
                <MenuItem value='free'>免费版</MenuItem>
                <MenuItem value='basic'>基础版</MenuItem>
                <MenuItem value='professional'>专业版</MenuItem>
                <MenuItem value='enterprise'>企业版</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleUpdateTenant}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {confirmConfig && (
        <ConfirmDialog
          isOpen={confirmDialogOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          danger={confirmConfig.danger}
          onConfirm={confirmConfig.onConfirm}
          onClose={setConfirmDialogClosed}
        />
      )}
    </PageContainer>
  );
};

export default TenantManagementPage;
