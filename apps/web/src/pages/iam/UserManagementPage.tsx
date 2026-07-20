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
import { useUrlListState } from '@/hooks';
import { RoleBadge } from '@/components/PermissionGate';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { apiLogger } from '@/utils/logger';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { designTokens } from '@/theme/tokens';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { IAM_PATHS } from '@/modules/iam/config';

const ct = designTokens.colors;

interface UserManagementPageProps {
  onNavigate?: (page: string) => void;
}

const UserManagementPage: React.FC<UserManagementPageProps> = ({ onNavigate: _onNavigate }) => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const { searchQuery, setSearchQuery, debouncedSearch, currentPage, pageSize, setCurrentPage, setPageSize } =
    useUrlListState({
      baseIndex: 1,
      defaultPageSize: 20,
      historyMode: 'replace',
    });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  // 批量选择状态
  const [selectedUserIds, setSelectedUserIds] = useState<(string | number)[]>([]);

  const { data: usersData, isLoading: loading } = useQuery({
    queryKey: [...QUERY_KEYS.IAM.USERS, { page: currentPage, search: debouncedSearch }],
    queryFn: async () => {
      const res = await authApi.listUsers({
        page: currentPage,
        pagesize: pageSize,
        search: debouncedSearch || undefined,
      });
      if (!res.success) {
        throw new Error(res.message || '加载用户失败');
      }
      return res.data;
    },
  });

  const users = usersData?.users ?? [];
  const totalUsers = usersData?.total ?? 0;

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: QUERY_KEYS.IAM.ROLES,
    queryFn: async () => {
      const res = await authApi.listRoles();
      if (!res.success) {
        throw new Error(res.message || '加载角色失败');
      }
      return res.data ?? [];
    },
  });

  const { data: fetchedUserRoles } = useQuery<Role[]>({
    queryKey: QUERY_KEYS.IAM.USER_ROLES(selectedUser?.id || ''),
    queryFn: async () => {
      if (!selectedUser) return [];
      const res = await authApi.getUserRoles(selectedUser.id);
      if (!res.success) {
        throw new Error(res.message || '加载用户角色失败');
      }
      return res.data ?? [];
    },
    enabled: !!selectedUser && showRolesModal,
  });

  useEffect(() => {
    if (fetchedUserRoles) {
      setUserRoles(fetchedUserRoles);
    }
  }, [fetchedUserRoles]);

  // 批量启用/禁用用户
  const batchUpdateStatusMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const res = await authApi.batchUpdateUsers({
        user_ids: selectedUserIds.map(String),
        isactive: isActive,
      });
      if (!res.success) {
        throw new Error(res.message || '操作失败');
      }
      return res.data;
    },
    onSuccess: (_data, isActive) => {
      addNotification({
        title: '成功',
        message: `已${isActive ? '启用' : '禁用'} ${selectedUserIds.length} 个用户`,
        type: 'success',
      });
      setSelectedUserIds([]);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.IAM.USERS });
    },
    onError: (err: unknown) => {
      apiLogger.error('批量更新用户状态失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '操作失败'),
        type: 'error',
      });
    },
  });

  const handleBatchUpdateStatus = (isActive: boolean) => {
    if (selectedUserIds.length === 0) {
      addNotification({
        title: '提示',
        message: '请先选择要操作的用户',
        type: 'info',
      });
      return;
    }
    batchUpdateStatusMutation.mutate(isActive);
  };

  const openConfirmDialog = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }) => {
    setConfirmDialogConfig(config);
    setConfirmDialogOpen(true);
  };

  const batchDeleteMutation = useMutation({
    mutationFn: async () => {
      const res = await authApi.batchDeleteUsers({
        user_ids: selectedUserIds.map(String),
      });
      if (!res.success) {
        throw new Error(res.message || '删除失败');
      }
      return res.data;
    },
    onSuccess: () => {
      addNotification({
        title: '成功',
        message: `已删除 ${selectedUserIds.length} 个用户`,
        type: 'success',
      });
      setSelectedUserIds([]);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.IAM.USERS });
    },
    onError: (err: unknown) => {
      apiLogger.error('批量删除用户失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '删除失败'),
        type: 'error',
      });
    },
  });

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
        batchDeleteMutation.mutate();
      },
      danger: true,
    });
  };

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await authApi.deleteUser(userId);
      if (!res.success) {
        throw new Error(res.message || '删除用户失败');
      }
      return res.data;
    },
    onSuccess: () => {
      addNotification({
        title: '成功',
        message: '用户删除成功',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.IAM.USERS });
    },
    onError: (err: unknown) => {
      apiLogger.error('删除用户失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '删除用户失败'),
        type: 'error',
      });
    },
  });

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

  const addUserRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const res = await authApi.addUserRole(userId, roleId);
      if (!res.success) {
        throw new Error(res.message || '添加角色失败');
      }
      return res.data;
    },
    onSuccess: (_data, { userId }) => {
      addNotification({
        title: '成功',
        message: '角色添加成功',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.IAM.USER_ROLES(userId) });
    },
    onError: (err: unknown) => {
      apiLogger.error('添加用户角色失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '添加角色失败'),
        type: 'error',
      });
    },
  });

  const handleAddRoleToUser = (userId: string, roleId: string) => {
    addUserRoleMutation.mutate({ userId, roleId });
  };

  const removeUserRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const res = await authApi.removeUserRole(userId, roleId);
      if (!res.success) {
        throw new Error(res.message || '移除角色失败');
      }
      return res.data;
    },
    onSuccess: (_data, { userId }) => {
      addNotification({
        title: '成功',
        message: '角色移除成功',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.IAM.USER_ROLES(userId) });
    },
    onError: (err: unknown) => {
      apiLogger.error('移除用户角色失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '移除角色失败'),
        type: 'error',
      });
    },
  });

  const handleRemoveRoleFromUser = (userId: string, roleId: string) => {
    removeUserRoleMutation.mutate({ userId, roleId });
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

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: '普通用户',
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: {
      username: string;
      email: string;
      password: string;
      full_name: string;
    }) => {
      const res = await authApi.createUser(data);
      if (!res.success) {
        throw new Error(res.message || '创建用户失败');
      }
      return res.data;
    },
    onSuccess: () => {
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.IAM.USERS });
    },
    onError: (err: unknown) => {
      apiLogger.error('创建用户失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '创建用户失败'),
        type: 'error',
      });
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate({
      username: newUser.username,
      email: newUser.email,
      password: newUser.password,
      full_name: newUser.full_name,
    });
  };

  const updateUserMutation = useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: { full_name?: string; email: string; isactive: boolean };
    }) => {
      const res = await authApi.updateUser(userId, data);
      if (!res.success) {
        throw new Error(res.message || '更新用户失败');
      }
      return res.data;
    },
    onSuccess: () => {
      addNotification({
        title: '成功',
        message: '用户更新成功',
        type: 'success',
      });
      setShowEditModal(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.IAM.USERS });
    },
    onError: (err: unknown) => {
      apiLogger.error('更新用户失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '更新用户失败'),
        type: 'error',
      });
    },
  });

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    updateUserMutation.mutate({
      userId: selectedUser.id,
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
          pageSize,
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
        onRefresh={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.IAM.USERS })}
        backButton={{
          href: IAM_PATHS.dashboard,
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
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogOpen(false);
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default UserManagementPage;
