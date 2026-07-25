import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Chip,
} from '@mui/material';
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { Key, CheckCircle } from 'lucide-react';
import { roleApi, permissionApi, type Role, type Permission } from '@/api/iam';
import { useNotificationStore } from '@/store';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { roleSchema } from '@/schemas/iam';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer } from '@/components/common';

interface RoleManagementPageProps {
  onNavigate?: (page: string) => void;
}

const RoleManagementPage: React.FC<RoleManagementPageProps> = ({ onNavigate: _onNavigate }) => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const roleAdapter: CrudApiAdapter<Role> = useMemo(
    () => ({
      list: async () => {
        const res = await roleApi.listRoles();
        if (res.success && res.data) {
          return { data: res.data, total: res.data.length };
        }
        throw new Error(res.message || '加载数据失败');
      },
      create: async (data) => {
        const res = await roleApi.createRole({
          name: data.name as string,
          description: data.description as string,
        });
        if (!res.success) {
          throw new Error(res.message || '创建角色失败');
        }
        return res.data;
      },
      update: async (id, data) => {
        const res = await roleApi.updateRole(id, {
          name: data.name as string,
          description: data.description as string,
        });
        if (!res.success) {
          throw new Error(res.message || '更新角色失败');
        }
        return res.data;
      },
      delete: async (id) => {
        const res = await roleApi.deleteRole(id);
        if (!res.success) {
          throw new Error(res.message || '删除角色失败');
        }
      },
    }),
    []
  );

  const permissionsQuery = useQuery({
    queryKey: QUERY_KEYS.IAM.PERMISSIONS,
    queryFn: async () => {
      const res = await permissionApi.listPermissions();
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.message || '加载数据失败');
    },
  });

  const rolePermissionsQuery = useQuery({
    queryKey: QUERY_KEYS.IAM.ROLE_PERMISSIONS(selectedRole?.id ?? ''),
    queryFn: async () => {
      if (!selectedRole) return [];
      const res = await roleApi.getRolePermissions(selectedRole.id);
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.message || '加载角色权限失败');
    },
    enabled: showPermissionsModal && !!selectedRole,
  });

  const allPermissions = permissionsQuery.data || [];
  const rolePermissions = rolePermissionsQuery.data || [];

  const addPermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId }: { roleId: string; permissionId: string }) => {
      const res = await roleApi.addRolePermission(roleId, permissionId);
      if (!res.success) {
        throw new Error(res.message || '添加权限失败');
      }
      return res.data;
    },
    onSuccess: () => {
      if (selectedRole) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.IAM.ROLE_PERMISSIONS(selectedRole.id),
        });
      }
      addNotification({
        title: '成功',
        message: '权限添加成功',
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '添加权限失败'),
        type: 'error',
      });
    },
  });

  const removePermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId }: { roleId: string; permissionId: string }) => {
      const res = await roleApi.removeRolePermission(roleId, permissionId);
      if (!res.success) {
        throw new Error(res.message || '移除权限失败');
      }
      return res.data;
    },
    onSuccess: () => {
      if (selectedRole) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.IAM.ROLE_PERMISSIONS(selectedRole.id),
        });
      }
      addNotification({
        title: '成功',
        message: '权限移除成功',
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '移除权限失败'),
        type: 'error',
      });
    },
  });

  const handleAddPermission = useCallback(
    (roleId: string, permissionId: string) => {
      addPermissionMutation.mutate({ roleId, permissionId });
    },
    [addPermissionMutation]
  );

  const handleRemovePermission = useCallback(
    (roleId: string, permissionId: string) => {
      removePermissionMutation.mutate({ roleId, permissionId });
    },
    [removePermissionMutation]
  );

  const openPermissionsModal = useCallback((role: Role) => {
    setSelectedRole(role);
    setShowPermissionsModal(true);
  }, []);

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        label: '管理权限',
        icon: <Key size={16} />,
        onClick: (row: Record<string, unknown>) => openPermissionsModal(row as Role),
      },
    ],
    [openPermissionsModal]
  );

  return (
    <PageContainer
      title='角色管理'
      subtitle='管理用户角色、权限配置'
    >
      <CrudPage
        schema={roleSchema}
        apiAdapter={roleAdapter}
        customRowActions={customRowActions}
        breadcrumbs={[{ label: 'Admin' }, { label: '角色管理' }]}
      />

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
