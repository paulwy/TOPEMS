// V66.7 P2-1 双实现说明：
// - 本文件是 pages/iam/ 目录的主实现（由 Admin 控制台 /admin/iam 路由统一调度）
// - 旧的兼容实现位于 src/iam/ 目录（由 App 根路由 /iam 访问，保留向后兼容）
// - 如非必要，请优先修改 pages/iam/ 中的新页面版本
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Key, Plus, RefreshCw, Search, Shield, Trash2 } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  Drawer,
  FilterChip,
  Input,
  ListPageTemplate,
  Modal,
  ToastContainer,
} from '@/components/redesign';
import type { DataTableColumn, Toast } from '@/components/redesign';
import { authApi } from '@/api/iam';
import type { Permission, Role } from '@/api/iam';
import { IAM_PATHS } from '@/modules/iam/config';
import i18n from '@/i18n';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['iam', 'roles'];
const PERMISSIONS_QUERY_KEY = ['iam', 'role-permissions'];

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

const RoleManagementPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [permissionsDrawerOpen, setPermissionsDrawerOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, debouncedSearch],
    queryFn: async () => {
      const response = await authApi.listRoles();
      if (!response.success) {
        throw new Error(response.message || i18n.t('iam.role_management_page.k0'));
      }
      const allRoles = response.data ?? [];
      const filtered = debouncedSearch
        ? allRoles.filter(
            (r) =>
              r.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
              (r.description ?? '').toLowerCase().includes(debouncedSearch.toLowerCase())
          )
        : allRoles;
      return {
        roles: filtered,
        total: filtered.length,
      };
    },
  });

  const { data: allPermissions } = useQuery({
    queryKey: ['iam', 'permissions'],
    queryFn: async () => {
      const response = await authApi.listPermissions();
      if (!response.success) {
        throw new Error(response.message || i18n.t('iam.role_management_page.k4'));
      }
      return response.data ?? [];
    },
  });

  const { data: fetchedRolePermissions, isLoading: loadingRolePermissions } = useQuery({
    queryKey: [...PERMISSIONS_QUERY_KEY, selectedRole?.id],
    queryFn: async () => {
      if (!selectedRole) return [];
      const response = await authApi.getRolePermissions(selectedRole.id);
      if (!response.success) {
        throw new Error(response.message || i18n.t('iam.role_management_page.k5'));
      }
      return response.data ?? [];
    },
    enabled: !!selectedRole && permissionsDrawerOpen,
  });

  React.useEffect(() => {
    if (fetchedRolePermissions) {
      setRolePermissions(fetchedRolePermissions);
    }
  }, [fetchedRolePermissions]);

  const createMutation = useMutation({
    mutationFn: authApi.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDrawerOpen(false);
      pushToast('success', i18n.t('iam.role_management_page.k1'));
    },
    onError: (err: Error) => pushToast('error', err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof authApi.updateRole>[1] }) =>
      authApi.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDrawerOpen(false);
      setEditingRole(null);
      pushToast('success', i18n.t('iam.role_management_page.k2'));
    },
    onError: (err: Error) => pushToast('error', err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: authApi.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDeleteTarget(null);
      pushToast('success', i18n.t('iam.role_management_page.k3'));
    },
    onError: (err: Error) => pushToast('error', err.message),
  });

  const addPermissionMutation = useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      authApi.addRolePermission(roleId, permissionId),
    onSuccess: (_data, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: [...PERMISSIONS_QUERY_KEY, roleId] });
      pushToast('success', i18n.t('iam.role_management_page.k7'));
    },
    onError: (err: Error) => pushToast('error', err.message),
  });

  const removePermissionMutation = useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      authApi.removeRolePermission(roleId, permissionId),
    onSuccess: (_data, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: [...PERMISSIONS_QUERY_KEY, roleId] });
      pushToast('success', i18n.t('iam.role_management_page.k12'));
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

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setEditingRole(null);
    setDrawerOpen(true);
  };

  const handleSubmit = (formData: RoleFormData) => {
    if (editingRole) {
      updateMutation.mutate({
        id: editingRole.id,
        data: {
          name: formData.name,
          description: formData.description,
        },
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        description: formData.description,
      });
    }
  };

  const handleOpenPermissions = (role: Role) => {
    setSelectedRole(role);
    setRolePermissions([]);
    setPermissionsDrawerOpen(true);
  };

  const handleTogglePermission = (roleId: string, permissionId: string, hasPermission: boolean) => {
    if (hasPermission) {
      removePermissionMutation.mutate({ roleId, permissionId });
    } else {
      addPermissionMutation.mutate({ roleId, permissionId });
    }
  };

  const columns: DataTableColumn<Role>[] = useMemo(
    () => [
      {
        key: 'name',
        header: i18n.t('iam.role_management_page.k19'),
        render: (row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Shield
              size={16}
              style={{ color: 'var(--accent-primary)' }}
            />
            <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              {row.name}
            </span>
          </div>
        ),
      },
      {
        key: 'description',
        header: i18n.t('iam.role_management_page.k20'),
        render: (row) => (
          <span style={{ color: 'var(--text-secondary)' }}>{row.description || '-'}</span>
        ),
      },
      {
        key: 'created_at',
        header: i18n.t('iam.role_management_page.k21'),
        render: (row) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
            {formatDateTime(row.created_at)}
          </span>
        ),
      },
      {
        key: 'actions',
        header: i18n.t('iam.role_management_page.k22'),
        align: 'right',
        render: (row) => (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => handleOpenPermissions(row)}
              aria-label='Manage permissions'
            >
              <Key size={14} />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => handleEdit(row)}
              aria-label='Edit role'
            >
              <Edit2 size={14} />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setDeleteTarget(row)}
              aria-label='Delete role'
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const toolbar = (
    <>
      <div
        style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}
      >
        <div style={{ width: '260px' }}>
          <Input
            placeholder={i18n.t('iam.role_management_page.k23')}
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
            label={i18n.t('iam.role_management.all_with_count', { count: data?.total ?? 0 })}
            active={!debouncedSearch}
            onClick={() => setSearch('')}
          />
          {debouncedSearch && (
            <FilterChip
              label={i18n.t('iam.role_management.search_filter', { keyword: debouncedSearch })}
              active
              onRemove={() => setSearch('')}
              onClick={() => {}}
            />
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Button
          variant='secondary'
          leftIcon={<RefreshCw size={16} />}
          onClick={() => refetch()}
        >
          {i18n.t('iam.role_management_page.k24')}
        </Button>
        <Button
          variant='primary'
          leftIcon={<Plus size={16} />}
          onClick={handleCreate}
        >
          {i18n.t('iam.role_management_page.k25')}
        </Button>
      </div>
    </>
  );

  return (
    <>
      <ListPageTemplate<Role>
        header={{
          title: i18n.t('iam.role_management_page.k16'),
          subtitle: i18n.t('iam.role_management_page.k26'),
          breadcrumbs: [
            { label: i18n.t('iam.role_management_page.k27'), href: '/dashboard' },
            { label: i18n.t('iam.role_management_page.k28'), href: IAM_PATHS.root },
            { label: i18n.t('iam.role_management_page.k16') },
          ],
        }}
        toolbar={toolbar}
        columns={columns}
        data={data?.roles || []}
        rowKey='id'
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        emptyTitle={i18n.t('iam.role_management_page.k29')}
        emptyDescription={i18n.t('iam.role_management_page.k30')}
        emptyAction={{ label: i18n.t('iam.role_management_page.k25'), onClick: handleCreate }}
      />

      <RoleDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        role={editingRole}
        onSubmit={handleSubmit}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <PermissionsDrawer
        open={permissionsDrawerOpen}
        onClose={() => setPermissionsDrawerOpen(false)}
        role={selectedRole}
        permissions={allPermissions || []}
        rolePermissions={rolePermissions}
        loading={loadingRolePermissions}
        togglingPermissionId={
          addPermissionMutation.isPending
            ? addPermissionMutation.variables?.permissionId
            : removePermissionMutation.isPending
              ? removePermissionMutation.variables?.permissionId
              : undefined
        }
        onToggle={handleTogglePermission}
      />

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={i18n.t('iam.role_management_page.k31')}
        description={
          deleteTarget
            ? i18n.t('iam.role_management.confirm_delete', { name: deleteTarget.name })
            : ''
        }
        size='sm'
        footer={
          <>
            <Button
              variant='secondary'
              onClick={() => setDeleteTarget(null)}
            >
              {i18n.t('iam.role_management_page.k33')}
            </Button>
            <Button
              variant='danger'
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {i18n.t('iam.role_management_page.k34')}
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

interface RoleFormData {
  name: string;
  description: string;
}

const RoleDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  role: Role | null;
  onSubmit: (data: RoleFormData) => void;
  loading: boolean;
}> = ({ open, onClose, role, onSubmit, loading }) => {
  const [formData, setFormData] = useState<RoleFormData>({ name: '', description: '' });

  React.useEffect(() => {
    if (role) {
      setFormData({ name: role.name, description: role.description || '' });
    } else {
      setFormData({ name: '', description: '' });
    }
  }, [role, open]);

  const isEdit = !!role;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        isEdit ? i18n.t('iam.role_management_page.k35') : i18n.t('iam.role_management_page.k36')
      }
      description={
        isEdit ? i18n.t('iam.role_management_page.k37') : i18n.t('iam.role_management_page.k38')
      }
      size='md'
      footer={
        <>
          <Button
            variant='secondary'
            onClick={onClose}
          >
            {i18n.t('iam.role_management_page.k33')}
          </Button>
          <Button
            variant='primary'
            loading={loading}
            onClick={() => onSubmit(formData)}
          >
            {isEdit
              ? i18n.t('iam.role_management_page.k39')
              : i18n.t('iam.role_management_page.k40')}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              label={i18n.t('iam.role_management_page.k41')}
              value={formData.name}
              onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
            />
            <Input
              label={i18n.t('iam.role_management_page.k42')}
              value={formData.description}
              onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))}
            />
          </div>
        </Card>
      </div>
    </Drawer>
  );
};

const PermissionsDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  role: Role | null;
  permissions: Permission[];
  rolePermissions: Permission[];
  loading: boolean;
  togglingPermissionId?: string;
  onToggle: (roleId: string, permissionId: string, hasPermission: boolean) => void;
}> = ({
  open,
  onClose,
  role,
  permissions,
  rolePermissions,
  loading,
  togglingPermissionId,
  onToggle,
}) => {
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    for (const perm of permissions) {
      const category = perm.category || i18n.t('iam.role_management_page.k43');
      if (!groups[category]) groups[category] = [];
      groups[category].push(perm);
    }
    return groups;
  }, [permissions]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={i18n.t('iam.role_management_page.k44')}
      description={role ? `${role.name} — ${role.description || ''}` : ''}
      size='lg'
      footer={
        <Button
          variant='secondary'
          onClick={onClose}
        >
          {i18n.t('iam.role_management_page.k33')}
        </Button>
      }
    >
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '64px',
                backgroundColor: 'var(--surface-2)',
                borderRadius: 'var(--radius-sm)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <div key={category}>
              <h4
                style={{
                  margin: '0 0 var(--space-3) 0',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-bold)',
                  letterSpacing: 'var(--tracking-wide)',
                  textTransform: 'uppercase',
                  color: 'var(--text-tertiary)',
                }}
              >
                {category}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {perms.map((perm) => {
                  const hasPermission = rolePermissions.some((p) => p.id === perm.id);
                  const isToggling = togglingPermissionId === perm.id;
                  return (
                    <Card
                      key={perm.id}
                      padding='md'
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--space-4)',
                        borderColor: hasPermission
                          ? 'color-mix(in srgb, var(--accent-primary) 30%, transparent)'
                          : undefined,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                        >
                          <span
                            style={{
                              fontWeight: 'var(--font-semibold)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {perm.name}
                          </span>
                          {hasPermission && (
                            <Badge variant='success'>
                              {i18n.t('iam.role_management_page.k45')}
                            </Badge>
                          )}
                        </div>
                        {perm.description && (
                          <p
                            style={{
                              margin: 'var(--space-1) 0 0',
                              color: 'var(--text-secondary)',
                              fontSize: 'var(--text-sm)',
                            }}
                          >
                            {perm.description}
                          </p>
                        )}
                        <p
                          style={{
                            margin: 'var(--space-1) 0 0',
                            color: 'var(--text-tertiary)',
                            fontSize: 'var(--text-xs)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {perm.code}
                        </p>
                      </div>
                      <Button
                        variant={hasPermission ? 'danger' : 'secondary'}
                        size='sm'
                        loading={isToggling}
                        onClick={() => role && onToggle(role.id, perm.id, hasPermission)}
                      >
                        {hasPermission
                          ? i18n.t('iam.role_management_page.k46')
                          : i18n.t('iam.role_management_page.k47')}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}

          {permissions.length === 0 && !loading && (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-8)',
                color: 'var(--text-secondary)',
              }}
            >
              {i18n.t('iam.role_management_page.k48')}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};

export default RoleManagementPage;
