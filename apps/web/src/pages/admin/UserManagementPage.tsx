import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  IconButton,
  Avatar,
  Box,
  TextField,
  Typography,
  FormControlLabel,
} from '@mui/material';
import { Button } from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Shield, UserPlus, UserMinus } from 'lucide-react';
import { authApi, type User, type Role } from '@/api/iam';
import { useAppStore } from '../../store';
import { RoleBadge } from '@/components/PermissionGate';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';

interface UserManagementPageProps {
  onNavigate?: (page: string) => void;
}

const UserManagementPage: React.FC<UserManagementPageProps> = ({ onNavigate: _onNavigate }) => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<Role[]>([]);

  // 批量选择状态
  const [selectedUserIds, setSelectedUserIds] = useState<(string | number)[]>([]);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        authApi.listUsers({
          page: currentPage,
          page_size: pageSize,
          search: debouncedSearch || undefined,
        }),
        authApi.listRoles(),
      ]);

      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data.users || []);
        setTotalUsers(usersRes.data.total || 0);
      }
      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
      }
    } catch (_err: unknown) {
      const errorMsg = extractErrorMessage(_err, '加载数据失败');
      setError(errorMsg);
      addNotification({ title: '加载失败', message: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 批量启用/禁用用户
  const handleBatchUpdateStatus = async (isActive: boolean) => {
    if (selectedUserIds.length === 0) {
      addNotification({
        title: '提示',
        message: '请先选择要操作的用户',
        type: 'info',
      });
      return;
    }

    try {
      const res = await authApi.batchUpdateUsers({
        user_ids: selectedUserIds.map(String),
        is_active: isActive,
      });
      if (res.success) {
        addNotification({
          title: '成功',
          message: `已${isActive ? '启用' : '禁用'} ${selectedUserIds.length} 个用户`,
          type: 'success',
        });
        setSelectedUserIds([]);
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '操作失败',
          type: 'error',
        });
      }
    } catch (_err: unknown) {
      addNotification({
        title: '失败',
        message: extractErrorMessage(_err, '操作失败'),
        type: 'error',
      });
    }
  };

  // 批量删除用户
  const handleBatchDelete = async () => {
    if (selectedUserIds.length === 0) {
      addNotification({
        title: '提示',
        message: '请先选择要删除的用户',
        type: 'info',
      });
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedUserIds.length} 个用户吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const res = await authApi.batchDeleteUsers({
        user_ids: selectedUserIds.map(String),
      });
      if (res.success) {
        addNotification({
          title: '成功',
          message: `已删除 ${selectedUserIds.length} 个用户`,
          type: 'success',
        });
        setSelectedUserIds([]);
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '删除失败',
          type: 'error',
        });
      }
    } catch (_err: unknown) {
      addNotification({
        title: '失败',
        message: extractErrorMessage(_err, '删除失败'),
        type: 'error',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除这个用户吗？')) return;
    try {
      const res = await authApi.deleteUser(userId);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '用户删除成功',
          type: 'success',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '删除用户失败',
          type: 'error',
        });
      }
    } catch (_err: unknown) {
      addNotification({
        title: '失败',
        message: extractErrorMessage(_err, '删除用户失败'),
        type: 'error',
      });
    }
  };

  const openRolesModal = async (user: User) => {
    setSelectedUser(user);
    await loadUserRoles(user.id);
    setShowRolesModal(true);
  };

  const loadUserRoles = async (userId: string) => {
    try {
      const res = await authApi.getUserRoles(userId);
      if (res.success && res.data) {
        setUserRoles(res.data);
      }
    } catch (_err: unknown) {
      addNotification({
        title: '加载失败',
        message: '加载用户角色失败',
        type: 'error',
      });
    }
  };

  const handleAddRoleToUser = async (userId: string, roleId: string) => {
    try {
      const res = await authApi.addUserRole(userId, roleId);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '角色添加成功',
          type: 'success',
        });
        await loadUserRoles(userId);
      } else {
        addNotification({
          title: '失败',
          message: res.message || '添加角色失败',
          type: 'error',
        });
      }
    } catch (_err: unknown) {
      addNotification({
        title: '失败',
        message: extractErrorMessage(_err, '添加角色失败'),
        type: 'error',
      });
    }
  };

  const handleRemoveRoleFromUser = async (userId: string, roleId: string) => {
    try {
      const res = await authApi.removeUserRole(userId, roleId);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '角色移除成功',
          type: 'success',
        });
        await loadUserRoles(userId);
      } else {
        addNotification({
          title: '失败',
          message: res.message || '移除角色失败',
          type: 'error',
        });
      }
    } catch (_err: unknown) {
      addNotification({
        title: '失败',
        message: extractErrorMessage(_err, '移除角色失败'),
        type: 'error',
      });
    }
  };

  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        id: 'username',
        label: '用户',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: 'primary.main',
                width: 32,
                height: 32,
                fontSize: '0.875rem',
              }}
            >
              {row.username.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {row.full_name || row.username}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {row.email}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: 'role',
        label: '角色',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RoleBadge
              role={row.role || 'user'}
              size='sm'
            />
            {row.roles && row.roles.length > 1 && (
              <Typography
                variant='caption'
                color='text.secondary'
              >
                +{row.roles.length - 1}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        id: 'permissions',
        label: '权限',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.permissions ? row.permissions.length : 0} 个权限
          </Typography>
        ),
      },
      {
        id: 'is_active',
        label: '状态',
        render: (row) => {
          const isActive = row.is_active !== false;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isActive ? (
                <Box
                  component='span'
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                  }}
                />
              ) : (
                <Box
                  component='span'
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'error.main',
                  }}
                />
              )}
              <Typography variant='body2'>{isActive ? '活跃' : '禁用'}</Typography>
            </Box>
          );
        },
      },
      {
        id: 'created_at',
        label: '创建时间',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {new Date(row.created_at).toLocaleDateString('zh-CN')}
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
        onClick: (row: User) => {
          setSelectedUser(row);
          setShowEditModal(true);
        },
      },
      {
        label: '管理角色',
        icon: <Shield size={16} />,
        onClick: (row: User) => openRolesModal(row),
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error' as const,
        onClick: (row: User) => handleDeleteUser(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个用户吗？',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: '普通用户',
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authApi.createUser({
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.full_name,
      });
      if (res.success) {
        addNotification({
          title: '成功',
          message: '用户创建成功',
          type: 'success',
        });
        setShowCreateModal(false);
        setNewUser({
          username: '',
          email: '',
          password: '',
          full_name: '',
          role: '普通用户',
        });
        // 重置分页到第一页，确保新数据显示在列表中
        setCurrentPage(1);
      } else {
        addNotification({
          title: '失败',
          message: res.message || '创建用户失败',
          type: 'error',
        });
      }
    } catch (_err: unknown) {
      const errorMsg = extractErrorMessage(_err, '创建用户失败');
      addNotification({ title: '失败', message: errorMsg, type: 'error' });
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await authApi.updateUser(selectedUser.id, {
        full_name: selectedUser.full_name || undefined,
        email: selectedUser.email,
        is_active: selectedUser.is_active,
      });
      if (res.success) {
        addNotification({
          title: '成功',
          message: '用户更新成功',
          type: 'success',
        });
        setShowEditModal(false);
        setSelectedUser(null);
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '更新用户失败',
          type: 'error',
        });
      }
    } catch (_err: unknown) {
      addNotification({
        title: '失败',
        message: extractErrorMessage(_err, '更新用户失败'),
        type: 'error',
      });
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      <ListPageTemplate
        title='用户管理'
        subtitle='管理平台用户账户、角色和权限'
        columns={columns}
        data={users}
        loading={loading}
        error={error || undefined}
        rowActions={rowActions}
        selectable
        selection={{
          selected: selectedUserIds,
          onChange: setSelectedUserIds,
        }}
        batchActions={[
          {
            label: '批量启用',
            onClick: () => handleBatchUpdateStatus(true),
          },
          {
            label: '批量禁用',
            onClick: () => handleBatchUpdateStatus(false),
          },
          {
            label: '批量删除',
            icon: <Trash2 size={16} />,
            color: 'error',
            onClick: handleBatchDelete,
            confirm: true,
            confirmMessage: '确定要删除选中的用户吗？此操作不可恢复。',
          },
        ]}
        searchable
        searchPlaceholder='搜索用户名、邮箱...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        pagination={{
          page: currentPage,
          pageSize: pageSize,
          total: totalUsers,
          onPageChange: setCurrentPage,
        }}
        actions={[
          {
            label: '创建用户',
            icon: <Plus size={20} />,
            onClick: () => setShowCreateModal(true),
          },
        ]}
        onRefresh={loadData}
        backButton={{
          href: '/dashboard',
        }}
      />

      {/* Create User Dialog */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>创建新用户</DialogTitle>
        <form onSubmit={handleCreateUser}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
              <TextField
                label='用户名 *'
                required
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder='输入用户名'
                fullWidth
              />
              <TextField
                label='邮箱 *'
                type='email'
                required
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder='输入邮箱'
                fullWidth
              />
              <TextField
                label='密码 *'
                type='password'
                required
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder='输入密码'
                fullWidth
              />
              <TextField
                label='姓名'
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                placeholder='输入姓名'
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setShowCreateModal(false);
                setNewUser({
                  username: '',
                  email: '',
                  password: '',
                  full_name: '',
                  role: '普通用户',
                });
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

      {/* Edit User Dialog */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑用户</DialogTitle>
        {selectedUser && (
          <form onSubmit={handleEditUser}>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
                <TextField
                  label='用户名'
                  value={selectedUser.username}
                  disabled
                  fullWidth
                />
                <TextField
                  label='邮箱 *'
                  type='email'
                  required
                  value={selectedUser.email}
                  onChange={(e) =>
                    setSelectedUser({
                      ...selectedUser,
                      email: e.target.value,
                    })
                  }
                  fullWidth
                />
                <TextField
                  label='姓名'
                  value={selectedUser.full_name || ''}
                  onChange={(e) =>
                    setSelectedUser({
                      ...selectedUser,
                      full_name: e.target.value,
                    })
                  }
                  placeholder='输入姓名'
                  fullWidth
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedUser.is_active}
                      onChange={(e) =>
                        setSelectedUser({
                          ...selectedUser,
                          is_active: e.target.checked,
                        })
                      }
                    />
                  }
                  label='启用账户'
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
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

      {/* Roles Management Dialog */}
      <Dialog
        open={showRolesModal}
        onClose={() => setShowRolesModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          用户角色管理 - {selectedUser?.full_name || selectedUser?.username}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography
              variant='subtitle2'
              sx={{ mb: 2, fontWeight: 600 }}
            >
              已有角色
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
              {userRoles.length === 0 ? (
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  暂无分配角色
                </Typography>
              ) : (
                userRoles.map((role) => (
                  <Box
                    key={role.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      bgcolor: 'success.light',
                      borderRadius: 2,
                      border: 1,
                      borderColor: 'success.main',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Shield
                        size={16}
                        color='success.dark'
                      />
                      <Typography sx={{ fontWeight: 500, color: 'success.main' }}>
                        {role.name}
                      </Typography>
                    </Box>
                    <IconButton
                      size='small'
                      sx={{ color: 'error.main' }}
                      onClick={() =>
                        selectedUser && handleRemoveRoleFromUser(selectedUser.id, role.id)
                      }
                      title='移除角色'
                    >
                      <UserMinus size={16} />
                    </IconButton>
                  </Box>
                ))
              )}
            </Box>
            <Typography
              variant='subtitle2'
              sx={{ mb: 2, fontWeight: 600 }}
            >
              可用角色
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {roles
                .filter((r) => !userRoles.some((ur) => ur.id === r.id))
                .map((role) => (
                  <Box
                    key={role.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      bgcolor: 'grey.100',
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Shield
                        size={16}
                        color='#9e9e9e'
                      />
                      <Box>
                        <Typography sx={{ fontWeight: 500 }}>{role.name}</Typography>
                        {role.description && (
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            - {role.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <IconButton
                      size='small'
                      onClick={() => selectedUser && handleAddRoleToUser(selectedUser.id, role.id)}
                      title='添加角色'
                    >
                      <UserPlus size={16} />
                    </IconButton>
                  </Box>
                ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='contained'
            onClick={() => setShowRolesModal(false)}
          >
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagementPage;
