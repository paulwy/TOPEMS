import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Typography,
  IconButton,
  Chip,
  Button,
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Plus, Trash2, Edit, Key, CheckCircle } from 'lucide-react';
import { authApi, type Role, type Permission } from '@/api/iam';
import { useNotificationStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer } from '@/components/common';

interface RoleManagementPageProps {
  onNavigate?: (page: string) => void;
}

const RoleManagementPage: React.FC<RoleManagementPageProps> = ({ onNavigate: _onNavigate }) => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        authApi.listRoles(),
        authApi.listPermissions(),
      ]);

      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
      }
      if (permsRes.success && permsRes.data) {
        setAllPermissions(permsRes.data);
      }
    } catch (_err: unknown) {
      setError(extractErrorMessage(_err, '加载数据失败'));
      addNotification({
        title: '加载失败',
        message: '加载数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async (roleId: string) => {
    try {
      const res = await authApi.getRolePermissions(roleId);
      if (res.success && res.data) {
        setRolePermissions(res.data);
      }
    } catch (_err: unknown) {
      addNotification({
        title: '加载失败',
        message: '加载角色权限失败',
        type: 'error',
      });
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authApi.createRole(newRole);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '角色创建成功',
          type: 'success',
        });
        setShowCreateModal(false);
        setNewRole({ name: '', description: '' });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '创建角色失败',
          type: 'error',
        });
      }
    } catch (_err: unknown) {
      addNotification({
        title: '失败',
        message: extractErrorMessage(_err, '创建角色失败'),
        type: 'error',
      });
    }
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    try {
      const res = await authApi.updateRole(selectedRole.id, {
        name: selectedRole.name,
        description: selectedRole.description,
      });
      if (res.success) {
        addNotification({
          title: '成功',
          message: '角色更新成功',
          type: 'success',
        });
        setShowEditModal(false);
        setSelectedRole(null);
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '更新角色失败',
          type: 'error',
        });
      }
    } catch (_err: unknown) {
      addNotification({
        title: '失败',
        message: extractErrorMessage(_err, '更新角色失败'),
        type: 'error',
      });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('确定要删除这个角色吗？删除后无法恢复。')) return;

    try {
      const res = await authApi.deleteRole(roleId);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '角色删除成功',
          type: 'success',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '删除角色失败',
          type: 'error',
        });
      }
    } catch (_err: unknown) {
      addNotification({
        title: '失败',
        message: extractErrorMessage(_err, '删除角色失败'),
        type: 'error',
      });
    }
  };

  const handleAddPermission = async (roleId: string, permissionId: string) => {
    try {
      const res = await authApi.addRolePermission(roleId, permissionId);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '权限添加成功',
          type: 'success',
        });
        loadRolePermissions(roleId);
      } else {
        addNotification({
          title: '失败',
          message: res.message || '添加权限失败',
          type: 'error',
        });
      }
    } catch (_err: unknown) {
      addNotification({
        title: '失败',
        message: extractErrorMessage(_err, '添加权限失败'),
        type: 'error',
      });
    }
  };

  const handleRemovePermission = async (roleId: string, permissionId: string) => {
    try {
      const res = await authApi.removeRolePermission(roleId, permissionId);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '权限移除成功',
          type: 'success',
        });
        loadRolePermissions(roleId);
      } else {
        addNotification({
          title: '失败',
          message: res.message || '移除权限失败',
          type: 'error',
        });
      }
    } catch (_err: unknown) {
      addNotification({
        title: '失败',
        message: extractErrorMessage(_err, '移除权限失败'),
        type: 'error',
      });
    }
  };

  const openPermissionsModal = async (role: Role) => {
    setSelectedRole(role);
    await loadRolePermissions(role.id);
    setShowPermissionsModal(true);
  };

  const columns: ColumnDef<Role>[] = useMemo(
    () => [
      {
        id: 'name',
        label: '角色名称',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
              <Shield
                size={20}
                color='primary.light'
              />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {row.name}
              </Typography>
              {row.description && (
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {row.description}
                </Typography>
              )}
            </Box>
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
            {new Date(row.created_at).toLocaleString('zh-CN')}
          </Typography>
        ),
      },
    ],

    []
  );

  const rowActions = useMemo(
    () => [
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row: Role) => {
          setSelectedRole(row);
          setShowEditModal(true);
        },
      },
      {
        label: '管理权限',
        icon: <Key size={16} />,
        onClick: (row: Role) => openPermissionsModal(row),
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error' as const,
        onClick: (row: Role) => handleDeleteRole(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个角色吗？删除后无法恢复。',
      },
    ],

    []
  );

  // Filter roles based on search
  const filteredRoles = useMemo(() => {
    if (!searchQuery) return roles;
    const query = searchQuery.toLowerCase();
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(query) || role.description?.toLowerCase().includes(query)
    );
  }, [roles, searchQuery]);

  return (
    <PageContainer
      title='角色管理'
      subtitle='管理用户角色、权限配置'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredRoles}
        loading={loading}
        error={error || undefined}
        rowActions={rowActions}
        searchable
        searchPlaceholder='搜索角色名称或描述...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        actions={[
          {
            label: '创建角色',
            icon: <Plus size={20} />,
            onClick: () => setShowCreateModal(true),
          },
        ]}
        onRefresh={loadData}
        backButton={{
          href: '/dashboard',
        }}
      />

      {/* 创建角色对话框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>创建新角色</DialogTitle>
        <form onSubmit={handleCreateRole}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label='角色名称 *'
                required
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                placeholder='例如：管理员、普通用户'
                fullWidth
              />
              <TextField
                label='描述'
                multiline
                rows={3}
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                placeholder='描述这个角色的用途'
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setShowCreateModal(false);
                setNewRole({ name: '', description: '' });
              }}
            >
              取消
            </Button>
            <Button
              type='submit'
              variant='contained'
            >
              创建
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 编辑角色对话框 */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑角色</DialogTitle>
        {selectedRole && (
          <form onSubmit={handleEditRole}>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField
                  label='角色名称 *'
                  required
                  value={selectedRole.name}
                  onChange={(e) => setSelectedRole({ ...selectedRole, name: e.target.value })}
                  placeholder='例如：管理员、普通用户'
                  fullWidth
                />
                <TextField
                  label='描述'
                  multiline
                  rows={3}
                  value={selectedRole.description || ''}
                  onChange={(e) =>
                    setSelectedRole({
                      ...selectedRole,
                      description: e.target.value,
                    })
                  }
                  placeholder='描述这个角色的用途'
                  fullWidth
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRole(null);
                }}
              >
                取消
              </Button>
              <Button
                type='submit'
                variant='contained'
              >
                保存
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>

      {/* 权限管理对话框 */}
      <Dialog
        open={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>角色权限 - {selectedRole?.name}</DialogTitle>
        <DialogContent sx={{ overflow: 'auto', maxHeight: '60vh' }}>
          <Typography
            variant='subtitle2'
            sx={{ mb: 2, fontWeight: 600 }}
          >
            可选权限
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {allPermissions.map((perm) => {
              const hasPermission = rolePermissions.some((p) => p.id === perm.id);
              return (
                <Box
                  key={perm.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    bgcolor: 'grey.100',
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 500 }}>{perm.name}</Typography>
                      {hasPermission && (
                        <CheckCircle
                          size={16}
                          color='success.dark'
                        />
                      )}
                    </Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ mt: 0.5 }}
                    >
                      {perm.description}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.disabled'
                    >
                      分类: {perm.category} | 权限码: {perm.code}
                    </Typography>
                  </Box>
                  {hasPermission ? (
                    <Button
                      variant='outlined'
                      size='small'
                      color='error'
                      onClick={() =>
                        selectedRole && handleRemovePermission(selectedRole.id, perm.id)
                      }
                    >
                      移除
                    </Button>
                  ) : (
                    <Button
                      variant='outlined'
                      size='small'
                      onClick={() => selectedRole && handleAddPermission(selectedRole.id, perm.id)}
                    >
                      添加
                    </Button>
                  )}
                </Box>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPermissionsModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default RoleManagementPage;
