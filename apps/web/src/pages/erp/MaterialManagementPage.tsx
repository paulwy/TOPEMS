/**
 * 物料管理页面 — Schema 驱动的 CRUD 页面
 *
 * 使用 materialSchema 配置 + CrudPage 组件，
 * 代码量从 ~700 行缩减到 ~120 行，减少约 83%。
 */

import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { materialSchema } from '@/schemas/erp/material';
import { erpApi } from '@/api/erp';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';

/**
 * 物料统计卡片组件
 */
const MaterialStats: React.FC = () => {
  const { data } = useQuery({
    queryKey: [QUERY_KEYS.ERP.MATERIALS, 'stats'],
    queryFn: async () => {
      const response = await erpApi.materials.list({ page: 0, pageSize: 1000 });
      if (!response.success) throw new Error('加载物料统计失败');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const materials = data?.materials || [];
  const total = materials.length;
  const active = materials.filter((m) => m.status === 'active').length;
  const inactive = materials.filter((m) => m.status === 'inactive').length;
  const obsolete = materials.filter((m) => m.status === 'obsolete').length;

  const statCards = [
    { label: '物料总数', value: total, color: 'primary.lighter', textColor: 'text.secondary' },
    { label: '启用中', value: active, color: 'success.lighter', textColor: 'success.dark' },
    { label: '已停用', value: inactive, color: 'grey.100', textColor: 'text.secondary' },
    { label: '已淘汰', value: obsolete, color: 'error.lighter', textColor: 'error.dark' },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      {statCards.map((stat) => (
        <Box
          key={stat.label}
          sx={{ p: 2, bgcolor: stat.color, borderRadius: 3 }}
        >
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {stat.label}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: stat.textColor }}
          >
            {stat.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

/**
 * 物料管理 API 适配器
 */
const materialApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await erpApi.materials.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
      category: params?.category as string | undefined,
    } as Parameters<typeof erpApi.materials.list>[0]);
    if (!response.success) {
      throw new Error('加载物料失败');
    }
    const data = response.data;
    return {
      data: (data?.materials || []) as unknown as Record<string, unknown>[],
      total: data?.total || 0,
    };
  },

  create: async (data) => {
    const response = await erpApi.materials.create(
      data as unknown as Parameters<typeof erpApi.materials.create>[0]
    );
    if (!response.success) {
      throw new Error('创建物料失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await erpApi.materials.update(
      id,
      data as unknown as Parameters<typeof erpApi.materials.update>[1]
    );
    if (!response.success) {
      throw new Error('更新物料失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await erpApi.materials.delete(id);
    if (!response.success) {
      throw new Error('删除物料失败');
    }
  },
};

/**
 * 物料管理页面组件
 */
const MaterialManagementPage: React.FC = () => {
  return (
    <CrudPage
      schema={materialSchema}
      apiAdapter={materialApiAdapter}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: '物料管理' },
      ]}
      headerContent={<MaterialStats />}
    />
  );
};

export default MaterialManagementPage;
