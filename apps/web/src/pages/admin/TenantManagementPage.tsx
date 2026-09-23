import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle,
  Clock,
  XCircle,
  Edit2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';

import {
  Avatar,
  Badge,
  Button,
  Card,
  Drawer,
  FilterChip,
  Input,
  ListPageTemplate,
  Modal,
  Select,
  StatTile,
  ToastContainer,
} from '@/components/redesign';
import type { DataTableColumn, Toast } from '@/components/redesign';
import { tenantApi } from '@/api/tenant';
import type { Tenant, TenantStatus, TenantPlan } from '@/api/tenant/types';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['admin', 'tenants'];

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  try {
    const d = new Date(value);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return value;
  }
};

const statusConfig: Record<
  TenantStatus,
  { labelKey: string; variant: 'success' | 'warning' | 'error' | 'info' }
> = {
  active: { labelKey: 'admin.tenant_management_page.status_active', variant: 'success' },
  trial: { labelKey: 'admin.tenant_management_page.status_trial', variant: 'info' },
  suspended: { labelKey: 'admin.tenant_management_page.status_suspended', variant: 'warning' },
  expired: { labelKey: 'admin.tenant_management_page.status_expired', variant: 'error' },
};

const planConfig: Record<TenantPlan, { labelKey: string; variant: 'default' | 'info' | 'cyan' }> = {
  basic: { labelKey: 'admin.tenantOnboarding.基础版', variant: 'default' },
  professional: { labelKey: 'admin.tenantOnboarding.专业版', variant: 'info' },
  enterprise: { labelKey: 'admin.tenantOnboarding.企业版', variant: 'cyan' },
};

const TenantManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TenantStatus>('all');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const pushToast = (type: Toast['variant'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, variant: type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, debouncedSearch, statusFilter],
    queryFn: async () => {
      const response = await tenantApi.listTenants({
        page: 1,
        pageSize: 100,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      if (!response.success) {
        throw new Error(response.message || t('admin.tenant_management_page.load_failed'));
      }
      return {
        tenants: response.data?.items || [],
        total: response.data?.total || 0,
      };
    },
  });

  const createMutation = useMutation({
    mutationFn: tenantApi.createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDrawerOpen(false);
      pushToast('success', t('admin.tenant_management_page.created'));
    },
    onError: (err: Error) => pushToast('error', err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tenant> }) =>
      tenantApi.updateTenant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDrawerOpen(false);
      setEditingTenant(null);
      pushToast('success', t('admin.tenant_management_page.updated'));
    },
    onError: (err: Error) => pushToast('error', err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tenantApi.deleteTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDeleteTarget(null);
      pushToast('success', t('admin.tenant_management_page.deleted'));
    },
    onError: (err: Error) => pushToast('error', err.message),
  });

  const stats = useMemo(() => {
    const tenants = data?.tenants || [];
    return {
      total: tenants.length,
      active: tenants.filter((t) => t.status === 'active').length,
      trial: tenants.filter((t) => t.status === 'trial').length,
      expired: tenants.filter((t) => t.status === 'expired').length,
    };
  }, [data]);

  const columns: DataTableColumn<Tenant>[] = [
    {
      key: 'name',
      header: t('admin.tenant_management_page.col_name'),
      sortable: true,
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Avatar
            name={row.name}
            size='sm'
            variant='rounded'
          />
          <div>
            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.code}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: t('admin.tenant_management_page.col_plan'),
      sortable: true,
      render: (row) => {
        const config = planConfig[row.plan] || planConfig.basic;
        return <Badge variant={config.variant}>{t(config.labelKey)}</Badge>;
      },
    },
    {
      key: 'status',
      header: t('admin.tenant_management_page.col_status'),
      sortable: true,
      render: (row) => {
        const config = statusConfig[row.status] || statusConfig.active;
        return <Badge variant={config.variant}>{t(config.labelKey)}</Badge>;
      },
    },
    {
      key: 'quota_users',
      header: t('admin.tenant_management_page.col_quota'),
      align: 'right',
      render: (row) => <span>{row.quota_users || '-'}</span>,
    },
    {
      key: 'created_at',
      header: t('admin.tenant_management_page.col_created'),
      sortable: true,
      render: (row) => (
        <span style={{ color: 'var(--text-secondary)' }}>{formatDateTime(row.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: t('admin.tenant_management_page.col_actions'),
      align: 'right',
      width: 120,
      render: (row) => (
        <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
          <Button
            size='sm'
            variant='ghost'
            leftIcon={<Edit2 size={14} />}
            onClick={() => {
              setEditingTenant(row);
              setDrawerOpen(true);
            }}
          >
            {t('admin.tenant_management_page.btn_edit')}
          </Button>
          <Button
            size='sm'
            variant='ghost'
            leftIcon={<Trash2 size={14} />}
            onClick={() => setDeleteTarget(row)}
            style={{ color: 'var(--error-500)' }}
          >
            {t('admin.tenant_management_page.btn_delete')}
          </Button>
        </div>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingTenant(null);
    setDrawerOpen(true);
  };

  const handleSubmit = (formData: Partial<Tenant>) => {
    if (editingTenant) {
      updateMutation.mutate({ id: editingTenant.id, data: formData });
    } else {
      createMutation.mutate(formData as any);
    }
  };

  return (
    <>
      <ListPageTemplate<Tenant>
        header={{
          title: t('admin.tenant_management_page.title'),
          subtitle: t('admin.tenant_management_page.subtitle'),
        }}
        toolbar={
          <>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <Input
                placeholder={t('admin.tenant_management_page.search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                options={[
                  { value: 'all', label: t('admin.tenant_management_page.filter_status_all') },
                  { value: 'active', label: t('admin.tenant_management_page.status_active') },
                  { value: 'trial', label: t('admin.tenant_management_page.status_trial') },
                  { value: 'suspended', label: t('admin.tenant_management_page.status_suspended') },
                  { value: 'expired', label: t('admin.tenant_management_page.status_expired') },
                ]}
                style={{ width: 140 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                variant='ghost'
                leftIcon={<RefreshCw size={16} />}
                onClick={() => refetch()}
              >
                {t('admin.tenant_management_page.btn_refresh')}
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={handleCreate}
              >
                {t('admin.tenant_management_page.btn_new')}
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={data?.tenants || []}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle={t('admin.tenant_management_page.empty_title')}
        emptyDescription={t('admin.tenant_management_page.empty_description')}
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <StatTile
              label={t('admin.tenant_management_page.stat_total')}
              value={stats.total}
              icon={Building2}
              accent='amber'
            />
            <StatTile
              label={t('admin.tenant_management_page.stat_active')}
              value={stats.active}
              icon={CheckCircle}
              accent='success'
            />
            <StatTile
              label={t('admin.tenant_management_page.stat_trial')}
              value={stats.trial}
              icon={Clock}
              accent='cyan'
            />
            <StatTile
              label={t('admin.tenant_management_page.stat_expired')}
              value={stats.expired}
              icon={XCircle}
              accent='error'
            />
          </div>
        }
      />

      {/* 编辑/新建抽屉 */}
      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingTenant(null);
        }}
        title={
          editingTenant
            ? t('admin.tenant_management_page.drawer_edit_title')
            : t('admin.tenant_management_page.drawer_new_title')
        }
        size='md'
      >
        <TenantForm
          initialData={editingTenant}
          onSubmit={handleSubmit}
          onCancel={() => {
            setDrawerOpen(false);
            setEditingTenant(null);
          }}
          submitting={createMutation.isPending || updateMutation.isPending}
        />
      </Drawer>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('admin.tenant_management_page.modal_delete_title')}
        size='sm'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setDeleteTarget(null)}
            >
              {t('admin.tenant_management_page.btn_cancel')}
            </Button>
            <Button
              variant='danger'
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              loading={deleteMutation.isPending}
            >
              {t('admin.tenant_management_page.btn_confirm_delete')}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          {t('admin.tenant_management_page.delete_confirm', { name: deleteTarget?.name })}
        </p>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

// 租户表单组件
interface TenantFormProps {
  initialData: Tenant | null;
  onSubmit: (data: Partial<Tenant>) => void;
  onCancel: () => void;
  submitting: boolean;
}

const TenantForm: React.FC<TenantFormProps> = ({ initialData, onSubmit, onCancel, submitting }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<Tenant>>({
    name: initialData?.name || '',
    code: initialData?.code || '',
    plan: initialData?.plan || 'basic',
    status: initialData?.status || 'active',
    quota_users: initialData?.quota_users || 10,
  });

  const handleChange = (field: keyof Tenant, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
    >
      <div>
        <label
          htmlFor='tenant-name'
          style={{
            display: 'block',
            marginBottom: 'var(--space-1)',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {t('admin.tenant_management_page.form_name')} *
        </label>
        <Input
          id='tenant-name'
          value={formData.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder={t('admin.tenant_management_page.ph_name')}
          required
        />
      </div>

      <div>
        <label
          htmlFor='tenant-code'
          style={{
            display: 'block',
            marginBottom: 'var(--space-1)',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {t('admin.tenant_management_page.form_code')} *
        </label>
        <Input
          id='tenant-code'
          value={formData.code || ''}
          onChange={(e) => handleChange('code', e.target.value)}
          placeholder={t('admin.tenant_management_page.ph_code')}
          required
          disabled={!!initialData}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <div>
          <label
            htmlFor='tenant-plan'
            style={{
              display: 'block',
              marginBottom: 'var(--space-1)',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {t('admin.tenant_management_page.form_plan')}
          </label>
          <Select
            id='tenant-plan'
            value={formData.plan || 'basic'}
            onChange={(e) => handleChange('plan', e.target.value)}
            options={[
              { value: 'basic', label: t('admin.tenantOnboarding.基础版') },
              { value: 'professional', label: t('admin.tenantOnboarding.专业版') },
              { value: 'enterprise', label: t('admin.tenantOnboarding.企业版') },
            ]}
          />
        </div>
        <div>
          <label
            htmlFor='tenant-status'
            style={{
              display: 'block',
              marginBottom: 'var(--space-1)',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {t('admin.tenant_management_page.form_status')}
          </label>
          <Select
            id='tenant-status'
            value={formData.status || 'active'}
            onChange={(e) => handleChange('status', e.target.value)}
            options={[
              { value: 'active', label: t('admin.tenant_management_page.status_active') },
              { value: 'trial', label: t('admin.tenant_management_page.status_trial') },
              { value: 'suspended', label: t('admin.tenant_management_page.status_suspended') },
              { value: 'expired', label: t('admin.tenant_management_page.status_expired') },
            ]}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor='tenant-quota'
          style={{
            display: 'block',
            marginBottom: 'var(--space-1)',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {t('admin.tenant_management_page.form_quota')}
        </label>
        <Input
          id='tenant-quota'
          type='number'
          value={formData.quota_users?.toString() || '10'}
          onChange={(e) => handleChange('quota_users', parseInt(e.target.value) || 0)}
          min={1}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          justifyContent: 'flex-end',
          marginTop: 'var(--space-4)',
        }}
      >
        <Button
          type='button'
          variant='ghost'
          onClick={onCancel}
        >
          {t('admin.tenant_management_page.btn_cancel')}
        </Button>
        <Button
          type='submit'
          variant='primary'
          loading={submitting}
        >
          {initialData
            ? t('admin.tenant_management_page.btn_save_edit')
            : t('admin.tenantOnboarding.创建租户')}
        </Button>
      </div>
    </form>
  );
};

export default TenantManagementPage;
