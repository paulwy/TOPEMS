// V66.7 P2-1 双实现说明：
// - 本文件是 pages/iam/ 目录的主实现（由 Admin 控制台 /admin/iam 路由统一调度）
// - 旧的兼容实现位于 src/iam/ 目录（由 App 根路由 /iam 访问，保留向后兼容）
// - 如非必要，请优先修改 pages/iam/ 中的新页面版本
import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { AlertCircle } from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { permissionSchema } from '@/schemas/iam';
import { authApi, type Permission } from '@/api/iam';
import i18n from '@/i18n';

const apiAdapter: CrudApiAdapter<Permission> = {
  list: async () => {
    const res = await authApi.listPermissions();
    if (res.success === false) {
      throw new Error(res.message || i18n.t('iam.permission_management_page.k0'));
    }
    const items = res.data ?? [];
    return { data: items, total: items.length };
  },
  create: async (data) => {
    const res = await authApi.createPermission({
      name: data.name as string,
      code: data.code as string,
      category: data.category as string,
      module: data.category as string,
      description: data.description as string | undefined,
    });
    if (res.success === false) {
      throw new Error(res.message || i18n.t('iam.permission_management_page.k1'));
    }
    return (res.data ?? {}) as Permission;
  },
  update: async (id, data) => {
    const res = await authApi.updatePermission(id, {
      name: data.name as string | undefined,
      description: data.description as string | undefined,
    });
    if (res.success === false) {
      throw new Error(res.message || i18n.t('iam.permission_management_page.k2'));
    }
    return (res.data ?? {}) as Permission;
  },
  delete: async (id) => {
    const res = await authApi.deletePermission(id);
    if (res.success === false) {
      throw new Error(res.message || i18n.t('iam.permission_management_page.k3'));
    }
  },
};

const headerContent = (
  <Box
    sx={{
      bgcolor: 'blue.50',
      border: 1,
      borderColor: 'blue.200',
      borderRadius: 1,
      p: 2,
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
        {i18n.t('pages.permission_management_page.k0')}
      </Typography>
    </Stack>
    <Typography
      variant='body2'
      color='blue.700'
      sx={{ mt: 1 }}
    >
      {i18n.t('pages.permission_management_page.k1')}
      {i18n.t('pages.permission_management_page.k2')}
    </Typography>
  </Box>
);

const PermissionManagementPage: React.FC = () => {
  return (
    <CrudPage
      schema={permissionSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[
        { label: i18n.t('iam.permission_management_page.k6'), href: '/' },
        { label: i18n.t('iam.permission_management_page.k5') },
        { label: i18n.t('iam.permission_management_page.k4') },
      ]}
      headerContent={headerContent}
    />
  );
};

export default PermissionManagementPage;
