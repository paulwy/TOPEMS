/**
 * 用户管理页面（Schema 驱动版本）
 *
 * 原版: 865 行手写表格、模态框、角色管理
 * Schema 版: ~240 行（减少 72%+）
 *
 * 使用 CrudPage + EntitySchema 实现：
 * - 列表、创建、编辑、删除、批量操作由 CrudPage 自动处理
 * - 角色管理通过 customRowActions 注入独立的角色管理弹窗
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
} from '@mui/material';
import { Shield, UserPlus, UserMinus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { authApi, type User, type Role } from '@/api/iam';
import { userSchema } from '@/schemas/iam';
import { useNotificationStore } from '@/store';

// ── API 适配器 ──
const apiAdapter: CrudApiAdapter<User> = {
  list: async (params) => {
    const res = await authApi.listUsers({
      page: params?.page ?? 1,
      pagesize: params?.pageSize ?? 20,
      search: params?.search || undefined,
    });
    if (res.success && res.data) {
      return {
        data: res.data.users || [],
        total: res.data.total || 0,
      };
    }
    return { data: [], total: 0 };
  },
  create: async (data) => {
    const res = await authApi.createUser({
      username: data.username || '',
      email: data.email || '',
      password: (data as Partial<User> & { password?: string }).password || '',
      full_name: data.full_name,
    });
    if (!res.success) throw new Error(res.message || '创建用户失败');
    return res.data as unknown as User;
  },
  update: async (id, data) => {
    const res = await authApi.updateUser(id, {
      full_name: data.full_name,
      email: data.email,
      isactive: data.isactive,
    });
    if (!res.success) throw new Error(res.message || '更新用户失败');
    return res.data as unknown as User;
  },
  delete: async (id) => {
    const res = await authApi.deleteUser(id);
    if (!res.success) throw new Error(res.message || '删除用户失败');
  },
};

// ── 角色管理对话框 ──
interface UserRoleDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onChanged: () => void;
}

const UserRoleDialog: React.FC<UserRoleDialogProps> = ({ open, user, onClose, onChanged }) => {
  const addNotification = useNotificationStore((s) => s.addNotification);

  const { data: allRoles = [] } = useQuery<Role[]>({
    queryKey: ['iam-all-roles'],
    queryFn: async () => {
      const res = await authApi.listRoles();
      return res.success && res.data ? res.data : [];
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const { data: userRoles = [], refetch: refetchUserRoles } = useQuery<Role[]>({
    queryKey: ['iam-user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await authApi.getUserRoles(user.id);
      const data = res.success && res.data ? (res.data as unknown as Role[]) : [];
      return data;
    },
    enabled: !!user?.id && open,
    staleTime: 0,
  });

  const handleAddRole = async (roleId: string) => {
    if (!user?.id) return;
    try {
      const res = await authApi.addUserRole(user.id, roleId);
      if (res.success) {
        addNotification({ title: '成功', message: '角色添加成功', type: 'success' });
        await refetchUserRoles();
        onChanged();
      }
    } catch {
      addNotification({ title: '失败', message: '添加角色失败', type: 'error' });
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!user?.id) return;
    try {
      const res = await authApi.removeUserRole(user.id, roleId);
      if (res.success) {
        addNotification({ title: '成功', message: '角色移除成功', type: 'success' });
        await refetchUserRoles();
        onChanged();
      }
    } catch {
      addNotification({ title: '失败', message: '移除角色失败', type: 'error' });
    }
  };

  const assignedIds = new Set(userRoles.map((r) => r.id));
  const availableRoles = allRoles.filter((r) => !assignedIds.has(r.id));

  if (!user) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
    >
      <DialogTitle>用户角色管理 - {user.full_name || user.username}</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography
            variant='subtitle2'
            sx={{ mb: 2, fontWeight: 600 }}
          >
            已有角色
          </Typography>
          <Stack
            spacing={1}
            sx={{ mb: 3 }}
          >
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
                  <Stack
                    direction='row'
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    <Shield
                      size={16}
                      color='success.dark'
                    />
                    <Typography sx={{ fontWeight: 500, color: 'success.main' }}>
                      {role.name}
                    </Typography>
                  </Stack>
                  <IconButton
                    size='small'
                    sx={{ color: 'error.main' }}
                    onClick={() => handleRemoveRole(role.id)}
                    title='移除角色'
                  >
                    <UserMinus size={16} />
                  </IconButton>
                </Box>
              ))
            )}
          </Stack>

          <Typography
            variant='subtitle2'
            sx={{ mb: 2, fontWeight: 600 }}
          >
            可用角色
          </Typography>
          <Stack spacing={1}>
            {availableRoles.length === 0 ? (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                所有角色已分配
              </Typography>
            ) : (
              availableRoles.map((role) => (
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
                  <Stack
                    direction='row'
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    <Shield
                      size={16}
                      color='grey.500'
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
                  </Stack>
                  <IconButton
                    size='small'
                    onClick={() => handleAddRole(role.id)}
                    title='添加角色'
                  >
                    <UserPlus size={16} />
                  </IconButton>
                </Box>
              ))
            )}
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          variant='contained'
          onClick={onClose}
        >
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── 主页面 ──
const UserManagementPage: React.FC = () => {
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [roleDialogOpen, setRoleDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [rolesVersion, setRolesVersion] = React.useState(0);

  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  const closeRoleDialog = () => {
    setRoleDialogOpen(false);
  };

  // 自定义行操作：管理角色
  const customRowActions: RowAction[] = React.useMemo(
    () => [
      {
        key: 'manage-roles',
        label: '管理角色',
        icon: <Shield size={16} />,
        onClick: (row: Record<string, unknown>) => openRoleDialog(row as unknown as User),
      },
    ],
    [rolesVersion]
  );

  return (
    <>
      <CrudPage
        schema={userSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        breadcrumbs={[{ label: '系统管理' }, { label: '用户管理' }]}
      />
      <UserRoleDialog
        open={roleDialogOpen}
        user={selectedUser}
        onClose={closeRoleDialog}
        onChanged={() => {
          setRolesVersion((v) => v + 1);
          addNotification({ title: '成功', message: '角色已更新', type: 'success' });
        }}
      />
    </>
  );
};

export default UserManagementPage;
