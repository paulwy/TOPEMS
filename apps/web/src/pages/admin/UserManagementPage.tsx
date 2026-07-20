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
  Button,
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Shield, UserPlus, UserMinus } from 'lucide-react';
import { authApi, type User, type Role } from '@/api/iam';
import { useNotificationStore } from '../../store';
import { RoleBadge } from '@/components/PermissionGate';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog, useUrlListState } from '@/hooks';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

interface UserManagementPageProps {
  onNavigate?: (page: string) => void;
}

const UserManagementPage: React.FC<UserManagementPageProps> = ({ onNavigate: _onNavigate }) => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  const queryClient = useQueryClient();

  const listState = useUrlListState({
    defaultSearch: '',
    defaultPageSize: 10,
    baseIndex: 1,
    historyMode: 'replace',
  });
  const {
    searchQuery,
    debouncedSearch,
    currentPage,
    pageSize,
    setSearchQuery,
    setCurrentPage,
  } = listState;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  // 批量选择状态
  const [selectedUserIds, setSelectedUserIds] = useState<(string | number)[]>([]);

  // 表单状态
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: '普通用户',
  });

  const usersQuery = useQuery<{ items: User[]; total: number }>({
    queryKey: ['admin-users', currentPage, debouncedSearch],
    queryFn: async () => {
      const res = await authApi.listUsers({
        page: currentPage,
        pagesize: pageSize,
        search: debouncedSearch || undefined,
      });
      if (res.success && res.data) {
        return {
          items: res.data.users || [],
          total: res.data.total || 0,
        };
      }
      return { items: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const rolesQuery = useQuery<Role[]>({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await authApi.listRoles();
      return res.success && res.data ? res.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const userRolesQuery = useQuery<Role[]>({
    queryKey: ['admin-user-roles', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return [];
      const res = await authApi.getUserRoles(selectedUser.id);
      return res.success && res.data ? res.data : [];
    },
    enabled: !!selectedUser?.id && showRolesModal,
    staleTime: 5 * 60 * 1000,
  });

  const users = usersQuery.data?.items ?? [];
  const roles = rolesQuery.data ?? [];
  const userRoles = userRolesQuery.data ?? [];
  const loading = usersQuery.isLoading;
  const totalUsers = usersQuery.data?.total ?? 0;
  const error = usersQuery.isError ? extractErrorMessage(usersQuery.error, '加载数据失败') : null;

  useEffect(() => {
    if (usersQuery.isError) {
      addNotification({
        title: '加载失败',
        message: extractErrorMessage(usersQuery.error, '加载数据失败'),
        type: 'error',
      });
    }
  }, [usersQuery.isError, usersQuery.error, addNotification]);

  useEffect(() => {
    if (rolesQuery.isError) {
      addNotification({
        title: '加载失败',
        message: '加载角色列表失败',
        type: 'error',
      });
    }
  }, [rolesQuery.isError, rolesQuery.error, addNotification]);

  useEffect(() => {
    if (userRolesQuery.isError) {
      addNotification({
        title: '加载失败',
        message: '加载用户角色失败',
        type: 'error',
      });
    }
  }, [userRolesQuery.isError, userRolesQuery.error, addNotification]);

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  const invalidateUserRoles = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });

  const createUserMutation = useMutation({
    mutationFn: (data: { username: string; email: string; password: string; full_name: string }) =>
      authApi.createUser(data),
    onSuccess: () => {
      invalidateUsers();
      addNotification({ title: '成功', message: '用户创建成功', type: 'success' });
      setShowCreateModal(false);
      setNewUser({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: '普通用户',
      });
      setCurrentPage(1);
    },
    onError: (err: unknown) => {
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '创建用户失败'),
        type: 'error',
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: (params: {
      id: string;
      data: { full_name?: string; email: string; isactive?: boolean };
    }) => authApi.updateUser(params.id, params.data),
    onSuccess: () => {
      invalidateUsers();
      addNotification({ title: '成功', message: '用户更新成功', type: 'success' });
      setShowEditModal(false);
      setSelectedUser(null);
    },
    onError: (err: unknown) => {
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '更新用户失败'),
        type: 'error',
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => authApi.deleteUser(userId),
    onSuccess: () => {
      invalidateUsers();
      addNotification({ title: '成功', message: '用户删除成功', type: 'success' });
    },
    onError: (err: unknown) => {
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '删除用户失败'),
        type: 'error',
      });
    },
  });

  const batchUpdateMutation = useMutation({
    mutationFn: (data: { user_ids: string[]; isactive: boolean }) => authApi.batchUpdateUsers(data),
    onSuccess: (_data, variables) => {
      invalidateUsers();
      addNotification({
        title: '成功',
        message: `已${variables.isactive ? '启用' : '禁用'} ${variables.user_ids.length} 个用户`,
        type: 'success',
      });
      setSelectedUserIds([]);
    },
    onError: (err: unknown) => {
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '操作失败'),
        type: 'error',
      });
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: (data: { user_ids: string[] }) => authApi.batchDeleteUsers(data),
    onSuccess: (_data, variables) => {
      invalidateUsers();
      addNotification({
        title: '成功',
        message: `已删除 ${variables.user_ids.length} 个用户`,
        type: 'success',
      });
      setSelectedUserIds([]);
    },
    onError: (err: unknown) => {
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '删除失败'),
        type: 'error',
      });
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: (params: { userId: string; roleId: string }) =>
      authApi.addUserRole(params.userId, params.roleId),
    onSuccess: () => {
      invalidateUserRoles();
      addNotification({ title: '成功', message: '角色添加成功', type: 'success' });
    },
    onError: (err: unknown) => {
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '添加角色失败'),
        type: 'error',
      });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: (params: { userId: string; roleId: string }) =>
      authApi.removeUserRole(params.userId, params.roleId),
    onSuccess: () => {
      invalidateUserRoles();
      addNotification({ title: '成功', message: '角色移除成功', type: 'success' });
    },
    onError: (err: unknown) => {
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '移除角色失败'),
        type: 'error',
      });
    },
  });

  // 批量启用/禁用用户
  const handleBatchUpdateStatus = (isActive: boolean) => {
    if (selectedUserIds.length === 0) {
      addNotification({
        title: '提示',
        message: '请先选择要操作的用户',
        type: 'info',
      });
      return;
    }
    batchUpdateMutation.mutate({
      user_ids: selectedUserIds.map(String),
      isactive: isActive,
    });
  };

  const handleBatchDelete = () => {
    if (selectedUserIds.length === 0) {
      addNotification({
        title: '提示',
        message: '请先选择要删除的用户',
        type: 'info',
      });
      return;
    }

    openConfirmDialog({
      title: '确认批量删除',
      message: `确定要删除选中的 ${selectedUserIds.length} 个用户吗？此操作不可恢复。`,
      onConfirm: () => {
        batchDeleteMutation.mutate({
          user_ids: selectedUserIds.map(String),
        });
      },
      danger: true,
    });
  };

  const handleDeleteUser = (userId: string) => {
    openConfirmDialog({
      title: '确认删除',
      message: '确定要删除这个用户吗？',
      onConfirm: () => {
        deleteUserMutation.mutate(userId);
      },
      danger: true,
    });
  };

  const openRolesModal = (user: User) => {
    setSelectedUser(user);
    setShowRolesModal(true);
  };

  const handleAddRoleToUser = (userId: string, roleId: string) => {
    addRoleMutation.mutate({ userId, roleId });
  };

  const handleRemoveRoleFromUser = (userId: string, roleId: string) => {
    removeRoleMutation.mutate({ userId, roleId });
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
        id: 'isactive',
        label: '状态',
        render: (row) => {
          const isActive = row.isactive !== false;
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

    []
  );

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate({
      username: newUser.username,
      email: newUser.email,
      password: newUser.password,
      full_name: newUser.full_name,
    });
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    updateUserMutation.mutate({
      id: selectedUser.id,
      data: {
        full_name: selectedUser.full_name || undefined,
        email: selectedUser.email,
        isactive: selectedUser.isactive,
      },
    });
  };

  return (
    <PageContainer
      title='用户管理'
      subtitle='管理平台用户账户、角色和权限'
    >
      <ListPageTemplate
        title=''
        subtitle=''
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
          page: currentPage - 1,
          pageSize,
          total: totalUsers,
          onPageChange: (p) => setCurrentPage(p + 1),
        }}
        actions={[
          {
            label: '创建用户',
            icon: <Plus size={20} />,
            onClick: () => setShowCreateModal(true),
          },
        ]}
        onRefresh={() => usersQuery.refetch()}
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
                      checked={selectedUser.isactive}
                      onChange={(e) =>
                        setSelectedUser({
                          ...selectedUser,
                          isactive: e.target.checked,
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
                        color={ct.grey[400]}
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

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={setConfirmDialogClosed}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogClosed();
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default UserManagementPage;
