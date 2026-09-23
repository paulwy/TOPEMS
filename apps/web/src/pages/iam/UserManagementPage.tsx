import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

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
  Pagination,
  Select,
  ToastContainer,
} from '@/components/redesign';
import type { DataTableColumn, Toast } from '@/components/redesign';
import { authApi } from '@/api/iam';
import type { User } from '@/api/iam';
import { IAM_PATHS } from '@/modules/iam/config';
import i18n from '@/i18n';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['iam', 'users'];

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

const UserManagementPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, debouncedSearch, statusFilter],
    queryFn: async () => {
      const response = await authApi.listUsers({
        page: 1,
        pagesize: 50,
        search: debouncedSearch || undefined,
      });
      if (!response.success) {
        throw new Error(response.message || i18n.t('iam.user_management_page.k0'));
      }
      const allUsers = response.data?.users || [];
      const filtered =
        statusFilter === 'all'
          ? allUsers
          : allUsers.filter((u) => (statusFilter === 'active' ? u.isactive : !u.isactive));
      return {
        users: filtered,
        total: response.data?.total || 0,
      };
    },
  });

  const createMutation = useMutation({
    mutationFn: authApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDrawerOpen(false);
      pushToast('success', i18n.t('iam.user_management_page.k1'));
    },
    onError: (err: Error) => pushToast('error', err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof authApi.updateUser>[1] }) =>
      authApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDrawerOpen(false);
      setEditingUser(null);
      pushToast('success', i18n.t('iam.user_management_page.k2'));
    },
    onError: (err: Error) => pushToast('error', err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: authApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDeleteTarget(null);
      pushToast('success', i18n.t('iam.user_management_page.k3'));
    },
    onError: (err: Error) => pushToast('error', err.message),
  });

  const pushToast = (variant: Toast['variant'], message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, variant, message }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setDrawerOpen(true);
  };

  const handleSubmit = (formData: UserFormData) => {
    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        data: {
          full_name: formData.full_name,
          email: formData.email,
          isactive: formData.isactive,
        },
      });
    } else {
      createMutation.mutate({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
      });
    }
  };

  const columns: DataTableColumn<User>[] = useMemo(
    () => [
      {
        key: 'username',
        header: i18n.t('iam.user_management_page.k7'),
        render: (row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Avatar
              name={row.full_name || row.username}
              size='sm'
              status={row.isactive ? 'online' : 'offline'}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                {row.username}
              </span>
              {row.full_name && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  {row.full_name}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'email',
        header: i18n.t('iam.user_management_page.k8'),
      },
      {
        key: 'isactive',
        header: i18n.t('iam.user_management_page.k9'),
        align: 'center',
        render: (row) => (
          <Badge variant={row.isactive ? 'success' : 'default'}>
            {row.isactive
              ? i18n.t('iam.user_management.status_active')
              : i18n.t('iam.user_management.status_inactive')}
          </Badge>
        ),
      },
      {
        key: 'created_at',
        header: i18n.t('iam.user_management_page.k10'),
        render: (row) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
            {formatDateTime(row.created_at)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: i18n.t('iam.user_management_page.k11'),
        align: 'right',
        render: (row) => (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => handleEdit(row)}
              aria-label='Edit user'
            >
              <Edit2 size={14} />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setDeleteTarget(row)}
              aria-label='Delete user'
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  // 分页数据计算
  const allUsers = data?.users || [];
  const totalPages = Math.max(1, Math.ceil(allUsers.length / pageSize));
  const pagedUsers = allUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 搜索或筛选变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter]);

  const toolbar = (
    <>
      <div
        style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}
      >
        <div style={{ width: '260px' }}>
          <Input
            placeholder={i18n.t('iam.user_management_page.k12')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={
              <Search
                size={16}
                style={{ color: 'var(--text-tertiary)' }}
              />
            }
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <FilterChip
            label={i18n.t('iam.user_management.filter_all')}
            active={statusFilter === 'all'}
            onRemove={statusFilter === 'all' ? undefined : () => setStatusFilter('all')}
            onClick={() => setStatusFilter('all')}
          />
          <FilterChip
            label={i18n.t('iam.user_management.status_active')}
            active={statusFilter === 'active'}
            onRemove={statusFilter === 'active' ? undefined : () => setStatusFilter('all')}
            onClick={() => setStatusFilter('active')}
          />
          <FilterChip
            label={i18n.t('iam.user_management.status_inactive')}
            active={statusFilter === 'inactive'}
            onRemove={statusFilter === 'inactive' ? undefined : () => setStatusFilter('all')}
            onClick={() => setStatusFilter('inactive')}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Button
          variant='secondary'
          leftIcon={<RefreshCw size={16} />}
          onClick={() => refetch()}
        >
          {i18n.t('iam.user_management_page.k13')}
        </Button>
        <Button
          variant='primary'
          leftIcon={<Plus size={16} />}
          onClick={handleCreate}
        >
          {i18n.t('iam.user_management_page.k14')}
        </Button>
      </div>
    </>
  );

  return (
    <>
      <ListPageTemplate<User>
        header={{
          title: i18n.t('iam.user_management_page.k6'),
          subtitle: i18n.t('iam.user_management_page.k15'),
          breadcrumbs: [
            { label: i18n.t('iam.user_management_page.k4'), href: '/dashboard' },
            { label: i18n.t('iam.user_management_page.k5'), href: IAM_PATHS.root },
            { label: i18n.t('iam.user_management_page.k6') },
          ],
        }}
        toolbar={toolbar}
        columns={columns}
        data={pagedUsers}
        rowKey='id'
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        emptyTitle={i18n.t('iam.user_management_page.k16')}
        emptyDescription={i18n.t('iam.user_management_page.k17')}
        emptyAction={{ label: i18n.t('iam.user_management_page.k14'), onClick: handleCreate }}
      />

      {allUsers.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Pagination
            current={currentPage}
            total={totalPages}
            pageSize={pageSize}
            totalItems={allUsers.length}
            onChange={setCurrentPage}
            showSizeChanger
            pageSizeOptions={[10, 20, 50]}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      <UserDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={editingUser}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={i18n.t('iam.user_management_page.k18')}
        description={
          deleteTarget
            ? i18n.t('iam.user_management.confirm_delete', { name: deleteTarget.username })
            : ''
        }
        size='sm'
        footer={
          <>
            <Button
              variant='secondary'
              onClick={() => setDeleteTarget(null)}
            >
              {i18n.t('iam.user_management_page.k20')}
            </Button>
            <Button
              variant='danger'
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {i18n.t('iam.user_management_page.k21')}
            </Button>
          </>
        }
      >
        <></>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        position='top-right'
      />
    </>
  );
};

interface UserFormData {
  username: string;
  email: string;
  password: string;
  full_name: string;
  isactive: boolean;
}

const UserDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSubmit: (data: UserFormData) => void;
  loading: boolean;
}> = ({ open, onClose, user, onSubmit, loading }) => {
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    password: '',
    full_name: '',
    isactive: true,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        full_name: user.full_name || '',
        isactive: user.isactive,
      });
    } else {
      setFormData({ username: '', email: '', password: '', full_name: '', isactive: true });
    }
  }, [user, open]);

  const isEdit = !!user;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        isEdit ? i18n.t('iam.user_management_page.k22') : i18n.t('iam.user_management_page.k23')
      }
      description={
        isEdit ? i18n.t('iam.user_management_page.k24') : i18n.t('iam.user_management_page.k25')
      }
      size='md'
      footer={
        <>
          <Button
            variant='secondary'
            onClick={onClose}
          >
            {i18n.t('iam.user_management_page.k20')}
          </Button>
          <Button
            variant='primary'
            loading={loading}
            onClick={() => onSubmit(formData)}
          >
            {isEdit
              ? i18n.t('iam.user_management_page.k26')
              : i18n.t('iam.user_management_page.k27')}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              label={i18n.t('iam.user_management_page.k28')}
              value={formData.username}
              disabled={isEdit}
              onChange={(e) => setFormData((d) => ({ ...d, username: e.target.value }))}
            />
            <Input
              label={i18n.t('iam.user_management_page.k29')}
              value={formData.email}
              onChange={(e) => setFormData((d) => ({ ...d, email: e.target.value }))}
            />
            <Input
              label={i18n.t('iam.user_management_page.k30')}
              value={formData.full_name}
              onChange={(e) => setFormData((d) => ({ ...d, full_name: e.target.value }))}
            />
            {!isEdit && (
              <Input
                label={i18n.t('iam.user_management_page.k31')}
                type='password'
                value={formData.password}
                onChange={(e) => setFormData((d) => ({ ...d, password: e.target.value }))}
              />
            )}
            <Select
              label={i18n.t('iam.user_management_page.k32')}
              value={formData.isactive ? 'active' : 'inactive'}
              options={[
                { value: 'active', label: i18n.t('iam.user_management.status_active') },
                { value: 'inactive', label: i18n.t('iam.user_management.status_inactive') },
              ]}
              onChange={(e) =>
                setFormData((d) => ({ ...d, isactive: e.target.value === 'active' }))
              }
            />
          </div>
        </Card>
      </div>
    </Drawer>
  );
};

export default UserManagementPage;
