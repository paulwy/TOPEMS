import React, { useMemo, useCallback } from 'react';
import { Box, Typography, Stack, Alert } from '@mui/material';
import { AlertCircle } from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { permissionSchema } from '@/schemas/iam';
import { permissionApi } from '@/api/iam/permission';
import type { Permission, CreatePermissionRequest, UpdatePermissionRequest } from '@/api/iam/types';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';
import { DASHBOARD_PATHS } from '@/routes/dashboard';

const PermissionManagementPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  const apiAdapter: CrudApiAdapter = useMemo(
    () => ({
      list: async (params) => {
        const search = (params?.search as string) || '';
        const categoryFilter = (params?.category as string) || '';

        const response = await permissionApi.listPermissions();
        if (!response.success || !response.data) {
          return { data: [], total: 0 };
        }

        let permissions = response.data;

        if (search) {
          const searchLower = search.toLowerCase();
          permissions = permissions.filter(
            (perm) =>
              perm.name.toLowerCase().includes(searchLower) ||
              perm.code.toLowerCase().includes(searchLower) ||
              perm.category.toLowerCase().includes(searchLower) ||
              perm.description?.toLowerCase().includes(searchLower)
          );
        }

        if (categoryFilter && categoryFilter !== 'all') {
          permissions = permissions.filter((perm) => perm.category === categoryFilter);
        }

        return {
          data: permissions as unknown as Record<string, unknown>[],
          total: permissions.length,
        };
      },
      create: async (data) => {
        const requestData = data as Partial<Permission>;
        const createData: CreatePermissionRequest = {
          name: requestData.name || '',
          code: requestData.code || '',
          category: requestData.category || '',
          module: requestData.category || '',
          description: requestData.description,
        };

        const response = await permissionApi.createPermission(createData);
        if (!response.success) {
          throw new Error(response.message || '创建权限失败');
        }
        addNotification({
          title: '成功',
          message: '权限创建成功',
          type: 'success',
        });
        return response.data as unknown as Record<string, unknown>;
      },
      update: async (id, data) => {
        const requestData = data as Partial<Permission>;
        const updateData: UpdatePermissionRequest = {
          name: requestData.name,
          description: requestData.description,
        };

        const response = await permissionApi.updatePermission(String(id), updateData);
        if (!response.success) {
          throw new Error(response.message || '更新权限失败');
        }
        addNotification({
          title: '成功',
          message: '权限更新成功',
          type: 'success',
        });
        return response.data as unknown as Record<string, unknown>;
      },
      delete: async (id) => {
        const response = await permissionApi.deletePermission(String(id));
        if (!response.success) {
          throw new Error(response.message || '删除权限失败');
        }
        addNotification({
          title: '成功',
          message: '权限删除成功',
          type: 'success',
        });
      },
    }),
    [addNotification]
  );

  const headerContent = useCallback(
    () => (
      <Box
        sx={{
          bgcolor: 'blue.50',
          border: 1,
          borderColor: 'blue.200',
          borderRadius: 1,
          p: 2,
          mb: 2,
        }}
      >
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <AlertCircle sx={{ width: 16, height: 16, color: 'blue.700' }} />
          <Typography
            variant='subtitle2'
            color='blue.900'
          >
            关于权限管理
          </Typography>
        </Stack>
        <Typography
          variant='body2'
          color='blue.700'
          sx={{ mt: 1 }}
        >
          权限是系统级配置，通常由开发人员在后端代码中预先定义。
          您可以在这里查看所有可用权限，并通过角色管理页面将权限分配给不同的角色。
        </Typography>
      </Box>
    ),
    []
  );

  return (
    <CrudPage
      schema={permissionSchema}
      apiAdapter={apiAdapter}
      headerContent={headerContent}
      breadcrumbs={[
        { label: '首页', href: DASHBOARD_PATHS.dashboard },
        { label: '系统管理' },
        { label: '权限管理' },
      ]}
    />
  );
};

export default PermissionManagementPage;
