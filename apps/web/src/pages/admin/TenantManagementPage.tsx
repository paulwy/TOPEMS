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
  { label: string; variant: 'success' | 'warning' | 'error' | 'info' }
> = {
  active: { label: '活跃', variant: 'success' },
  trial: { label: '试用', variant: 'info' },
  suspended: { label: '已暂停', variant: 'warning' },
  expired: { label: '已过期', variant: 'error' },
};

const planConfig: Record<TenantPlan, { label: string; variant: 'default' | 'info' | 'cyan' }> = {
  basic: { label: '基础版', variant: 'default' },
  professional: { label: '专业版', variant: 'info' },
  enterprise: { label: '企业版', variant: 'cyan' },
};

const TenantManagementPage: React.FC = () => {
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
        throw new Error(response.message || '加载租户列表失败');
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
      pushToast('success', '租户创建成功');
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
      pushToast('success', '租户更新成功');
    },
    onError: (err: Error) => pushToast('error', err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tenantApi.deleteTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDeleteTarget(null);
      pushToast('success', '租户删除成功');
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
      header: '租户名称',
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
      header: '订阅计划',
      sortable: true,
      render: (row) => {
        const config = planConfig[row.plan] || planConfig.basic;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'status',
      header: '状态',
      sortable: true,
      render: (row) => {
        const config = statusConfig[row.status] || statusConfig.active;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'quota_users',
      header: '用户配额',
      align: 'right',
      render: (row) => <span>{row.quota_users || '-'}</span>,
    },
    {
      key: 'created_at',
      header: '创建时间',
      sortable: true,
      render: (row) => (
        <span style={{ color: 'var(--text-secondary)' }}>{formatDateTime(row.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: '操作',
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
            编辑
          </Button>
          <Button
            size='sm'
            variant='ghost'
            leftIcon={<Trash2 size={14} />}
            onClick={() => setDeleteTarget(row)}
            style={{ color: 'var(--error-500)' }}
          >
            删除
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
          title: '租户管理',
          subtitle: '管理系统中的所有租户，包括创建、编辑、删除和状态管理',
        }}
        toolbar={
          <>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <Input
                placeholder='搜索租户名称或编码...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                options={[
                  { value: 'all', label: '全部状态' },
                  { value: 'active', label: '活跃' },
                  { value: 'trial', label: '试用' },
                  { value: 'suspended', label: '已暂停' },
                  { value: 'expired', label: '已过期' },
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
                刷新
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={handleCreate}
              >
                新建租户
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={data?.tenants || []}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无租户'
        emptyDescription='点击右上角「新建租户」按钮创建第一个租户'
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <StatTile
              label='租户总数'
              value={stats.total}
              icon={Building2}
              accent='amber'
            />
            <StatTile
              label='活跃租户'
              value={stats.active}
              icon={CheckCircle}
              accent='success'
            />
            <StatTile
              label='试用租户'
              value={stats.trial}
              icon={Clock}
              accent='cyan'
            />
            <StatTile
              label='过期租户'
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
        title={editingTenant ? '编辑租户' : '新建租户'}
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
        title='确认删除'
        size='sm'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setDeleteTarget(null)}
            >
              取消
            </Button>
            <Button
              variant='danger'
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              loading={deleteMutation.isPending}
            >
              确认删除
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          确定要删除租户「{deleteTarget?.name}」吗？此操作不可撤销，租户下的所有数据将被清除。
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
          租户名称 *
        </label>
        <Input
          id='tenant-name'
          value={formData.name || ''}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder='请输入租户名称'
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
          租户编码 *
        </label>
        <Input
          id='tenant-code'
          value={formData.code || ''}
          onChange={(e) => handleChange('code', e.target.value)}
          placeholder='请输入租户编码（英文小写）'
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
            订阅计划
          </label>
          <Select
            id='tenant-plan'
            value={formData.plan || 'basic'}
            onChange={(e) => handleChange('plan', e.target.value)}
            options={[
              { value: 'basic', label: '基础版' },
              { value: 'professional', label: '专业版' },
              { value: 'enterprise', label: '企业版' },
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
            状态
          </label>
          <Select
            id='tenant-status'
            value={formData.status || 'active'}
            onChange={(e) => handleChange('status', e.target.value)}
            options={[
              { value: 'active', label: '活跃' },
              { value: 'trial', label: '试用' },
              { value: 'suspended', label: '已暂停' },
              { value: 'expired', label: '已过期' },
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
          用户配额
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
          取消
        </Button>
        <Button
          type='submit'
          variant='primary'
          loading={submitting}
        >
          {initialData ? '保存修改' : '创建租户'}
        </Button>
      </div>
    </form>
  );
};

export default TenantManagementPage;
