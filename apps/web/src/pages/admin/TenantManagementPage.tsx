import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
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
} from '@mui/material';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Building2,
  Users,
  HardDrive,
  Activity,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, DataTable, Grid } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { tenantApi } from '@/api/tenant';
import type { Tenant, TenantStatus, TenantPlan } from '@/api/tenant/types';
import type { ColumnDef } from '@tanstack/react-table';

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
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    plan: 'professional' as TenantPlan,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadTenants();
  }, [currentPage, debouncedSearch, statusFilter, planFilter]);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const res = await tenantApi.listTenants({
        page: currentPage,
        pageSize,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        plan: planFilter || undefined,
      });
      if (res.success && res.data) {
        setTenants(res.data.items);
        setTotal(res.data.total);
      }
    } catch (error) {
      console.error('Failed to load tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    try {
      const res = await tenantApi.createTenant(formData);
      if (res.success) {
        setShowCreateDialog(false);
        setFormData({ name: '', slug: '', plan: 'professional' });
        loadTenants();
      }
    } catch (error) {
      console.error('Failed to create tenant:', error);
    }
  };

  const handleUpdateTenant = async () => {
    if (!selectedTenant) return;
    try {
      const res = await tenantApi.updateTenant(selectedTenant.id, formData);
      if (res.success) {
        setShowEditDialog(false);
        setSelectedTenant(null);
        loadTenants();
      }
    } catch (error) {
      console.error('Failed to update tenant:', error);
    }
  };

  const handleDeleteTenant = (tenant: Tenant) => {
    setConfirmConfig({
      title: '确认删除租户',
      message: `确定要删除租户"${tenant.name}"吗？此操作不可恢复。`,
      danger: true,
      onConfirm: async () => {
        try {
          await tenantApi.deleteTenant(tenant.id);
          setConfirmDialogOpen(false);
          loadTenants();
        } catch (error) {
          console.error('Failed to delete tenant:', error);
        }
      },
    });
    setConfirmDialogOpen(true);
  };

  const handleSuspendTenant = (tenant: Tenant) => {
    setConfirmConfig({
      title: '确认停用租户',
      message: `确定要停用租户"${tenant.name}"吗？停用后该租户的所有用户将无法登录。`,
      danger: true,
      onConfirm: async () => {
        try {
          await tenantApi.suspendTenant(tenant.id);
          setConfirmDialogOpen(false);
          loadTenants();
        } catch (error) {
          console.error('Failed to suspend tenant:', error);
        }
      },
    });
    setConfirmDialogOpen(true);
  };

  const handleActivateTenant = async (tenant: Tenant) => {
    try {
      await tenantApi.activateTenant(tenant.id);
      loadTenants();
    } catch (error) {
      console.error('Failed to activate tenant:', error);
    }
  };

  const openEditDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
    });
    setShowEditDialog(true);
  };

  const columns: ColumnDef<Tenant>[] = [
    {
      accessorKey: 'name',
      header: '租户名称',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: row.original.settings.branding.primary_color + '20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building2 size={20} style={{ color: row.original.settings.branding.primary_color }} />
          </Box>
          <Box>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {row.original.name}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {row.original.slug}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <Chip
          label={statusLabels[row.original.status as TenantStatus]}
          color={statusColors[row.original.status as TenantStatus]}
          size='small'
        />
      ),
    },
    {
      accessorKey: 'plan',
      header: '套餐',
      cell: ({ row }) => (
        <Chip
          label={planLabels[row.original.plan as TenantPlan]}
          color={planColors[row.original.plan as TenantPlan]}
          size='small'
          variant='outlined'
        />
      ),
    },
    {
      accessorKey: 'settings.max_users',
      header: '用户数',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Users size={16} style={{ opacity: 0.5 }} />
          <Typography variant='body2'>
            {row.original.settings.max_users}
          </Typography>
        </Box>
      ),
    },
    {
      accessorKey: 'settings.max_storage_gb',
      header: '存储配额',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HardDrive size={16} style={{ opacity: 0.5 }} />
          <Typography variant='body2'>
            {row.original.settings.max_storage_gb} GB
          </Typography>
        </Box>
      ),
    },
    {
      accessorKey: 'created_at',
      header: '创建时间',
      cell: ({ row }) => (
        <Typography variant='body2' color='text.secondary'>
          {new Date(row.original.created_at).toLocaleDateString('zh-CN')}
        </Typography>
      ),
    },
    {
      accessorKey: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            size='small'
            onClick={() => navigate(`/admin/tenants/${row.original.id}`)}
            title='查看详情'
          >
            <Eye size={16} />
          </IconButton>
          <IconButton
            size='small'
            onClick={() => openEditDialog(row.original)}
            title='编辑'
          >
            <Edit size={16} />
          </IconButton>
          {row.original.status === 'active' ? (
            <IconButton
              size='small'
              onClick={() => handleSuspendTenant(row.original)}
              title='停用'
              color='warning'
            >
              <Activity size={16} />
            </IconButton>
          ) : row.original.status === 'suspended' ? (
            <IconButton
              size='small'
              onClick={() => handleActivateTenant(row.original)}
              title='激活'
              color='success'
            >
              <Activity size={16} />
            </IconButton>
          ) : null}
          <IconButton
            size='small'
            onClick={() => handleDeleteTenant(row.original)}
            title='删除'
            color='error'
          >
            <Trash2 size={16} />
          </IconButton>
        </Box>
      ),
    },
  ];

  const statsCards = [
    { label: '总租户', value: total, icon: Building2, color: 'primary' },
    { label: '活跃租户', value: tenants.filter(t => t.status === 'active').length, icon: Activity, color: 'success' },
    { label: '试用租户', value: tenants.filter(t => t.status === 'trial').length, icon: Search, color: 'warning' },
    { label: '已停用', value: tenants.filter(t => t.status === 'suspended').length, icon: Users, color: 'error' },
  ];

  return (
    <PageContainer
      title='租户管理'
      subtitle='管理所有租户，包括创建、配置和监控'
      headerProps={{
        actions: [
          {
            label: '创建租户',
            icon: <Plus size={18} />,
            onClick: () => setShowCreateDialog(true),
            variant: 'contained' as const,
          },
        ],
      }}
    >
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: `${stat.color}.main10`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <stat.icon size={24} />
                  </Box>
                  <Box>
                    <Typography variant='h4' sx={{ fontWeight: 700 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {stat.label}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder='搜索租户名称或标识...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size='small'
          sx={{ minWidth: 280 }}
          slotProps={{
            input: {
              startAdornment: <Search size={18} style={{ marginRight: 8, opacity: 0.5 }} />,
            },
          }}
        />
        <FormControl size='small' sx={{ minWidth: 140 }}>
          <InputLabel>状态</InputLabel>
          <Select
            value={statusFilter}
            label='状态'
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <MenuItem value=''>全部状态</MenuItem>
            <MenuItem value='active'>已激活</MenuItem>
            <MenuItem value='trial'>试用中</MenuItem>
            <MenuItem value='suspended'>已停用</MenuItem>
          </Select>
        </FormControl>
        <FormControl size='small' sx={{ minWidth: 140 }}>
          <InputLabel>套餐</InputLabel>
          <Select
            value={planFilter}
            label='套餐'
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <MenuItem value=''>全部套餐</MenuItem>
            <MenuItem value='free'>免费版</MenuItem>
            <MenuItem value='basic'>基础版</MenuItem>
            <MenuItem value='professional'>专业版</MenuItem>
            <MenuItem value='enterprise'>企业版</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <DataTable<Tenant, unknown>
        columns={columns}
        data={tenants}
        loading={loading}
        showSearch={false}
        showFilters={false}
        enablePagination
        totalItems={total}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth='sm' fullWidth>
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
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
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
          <Button variant='contained' onClick={handleCreateTenant}>创建</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} maxWidth='sm' fullWidth>
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
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
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
          <Button variant='contained' onClick={handleUpdateTenant}>保存</Button>
        </DialogActions>
      </Dialog>

      {confirmConfig && (
        <ConfirmDialog
          isOpen={confirmDialogOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          danger={confirmConfig.danger}
          onConfirm={confirmConfig.onConfirm}
          onClose={() => setConfirmDialogOpen(false)}
        />
      )}
    </PageContainer>
  );
};

export default TenantManagementPage;
