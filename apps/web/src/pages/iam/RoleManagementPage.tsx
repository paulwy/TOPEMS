<<<<<<< Updated upstream
// V66.7 P2-1 双实现说明：
// - 本文件是 pages/iam/ 目录的主实现（由 Admin 控制台 /admin/iam 路由统一调度）
// - 旧的兼容实现位于 src/iam/ 目录（由 App 根路由 /iam 访问，保留向后兼容）
// - 如非必要，请优先修改 pages/iam/ 中的新页面版本
=======
// V66.7 P2-1 注：此文件为 pages/iam/ 下完整业务实现，src/iam/ 下另有旧占位符版本，两者并非简单重复。
// 若后续重构，建议删除旧占位符版本或抽取 shared/common 组件统一。
>>>>>>> Stashed changes
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { Key, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { roleSchema } from '@/schemas/iam';
import { authApi, type Role, type Permission } from '@/api/iam';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';
import { apiLogger } from '@/utils/logger';

const roleApiAdapter: CrudApiAdapter = {
  list: async () => {
    const response = await authApi.listRoles();
    if (!response.success) {
      throw new Error(response.message || '加载角色失败');
    }
    const data = response.data ?? [];
    return {
      data: data as unknown as Record<string, unknown>[],
      total: data.length,
    };
  },
  create: async (data) => {
    const response = await authApi.createRole({
      name: String(data.name),
      description: data.description ? String(data.description) : undefined,
    });
    if (!response.success) {
      throw new Error(response.message || '创建角色失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const response = await authApi.updateRole(id, {
      name: String(data.name),
      description: data.description ? String(data.description) : undefined,
    });
    if (!response.success) {
      throw new Error(response.message || '更新角色失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    const response = await authApi.deleteRole(id);
    if (!response.success) {
      throw new Error(response.message || '删除角色失败');
    }
  },
};

const RoleManagementPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);

  const { data: allPermissions = [] } = useQuery<Permission[]>({
    queryKey: ['iam-all-permissions'],
    queryFn: async () => {
      const res = await authApi.listPermissions();
      if (!res.success) {
        throw new Error(res.message || '加载权限失败');
      }
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: fetchedRolePermissions } = useQuery<Permission[]>({
    queryKey: ['iam-role-permissions', selectedRole?.id],
    queryFn: async () => {
      if (!selectedRole) return [];
      const res = await authApi.getRolePermissions(selectedRole.id);
      if (!res.success) {
        throw new Error(res.message || '加载角色权限失败');
      }
      return res.data ?? [];
    },
    enabled: !!selectedRole && permissionsDialogOpen,
  });

  React.useEffect(() => {
    if (fetchedRolePermissions) {
      setRolePermissions(fetchedRolePermissions);
    }
  }, [fetchedRolePermissions]);

  const addPermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId }: { roleId: string; permissionId: string }) => {
      const res = await authApi.addRolePermission(roleId, permissionId);
      if (!res.success) {
        throw new Error(res.message || '添加权限失败');
      }
      return res.data;
    },
    onSuccess: (_data, { roleId }) => {
      addNotification({
        title: '成功',
        message: '权限添加成功',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['iam-role-permissions', roleId] });
    },
    onError: (err: unknown) => {
      apiLogger.error('添加权限失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '添加权限失败'),
        type: 'error',
      });
    },
  });

  const removePermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId }: { roleId: string; permissionId: string }) => {
      const res = await authApi.removeRolePermission(roleId, permissionId);
      if (!res.success) {
        throw new Error(res.message || '移除权限失败');
      }
      return res.data;
    },
    onSuccess: (_data, { roleId }) => {
      addNotification({
        title: '成功',
        message: '权限移除成功',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['iam-role-permissions', roleId] });
    },
    onError: (err: unknown) => {
      apiLogger.error('移除权限失败:', err);
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '移除权限失败'),
        type: 'error',
      });
    },
  });

  const handleOpenPermissions = (row: Record<string, unknown>) => {
    const role = row as unknown as Role;
    setSelectedRole(role);
    setRolePermissions([]);
    setPermissionsDialogOpen(true);
  };

  const handleAddPermission = (roleId: string, permissionId: string) => {
    addPermissionMutation.mutate({ roleId, permissionId });
  };

  const handleRemovePermission = (roleId: string, permissionId: string) => {
    removePermissionMutation.mutate({ roleId, permissionId });
  };

  return (
    <>
      <CrudPage
        schema={roleSchema}
        apiAdapter={roleApiAdapter}
        breadcrumbs={[{ label: 'IAM' }, { label: '角色管理' }]}
        customRowActions={[
          {
            label: '管理权限',
            icon: <Key size={16} />,
            onClick: (row) => handleOpenPermissions(row),
          },
        ]}
      />

      <Dialog
        open={permissionsDialogOpen}
        onClose={() => setPermissionsDialogOpen(false)}
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
          <Button onClick={() => setPermissionsDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RoleManagementPage;
