/**
 * 资产管理页面 — Schema 驱动的 CRUD 页面
 */

import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { assetSchema } from '@/schemas/erp/asset';
import { assetApi } from '@/api/erp';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { Building2 } from 'lucide-react';
const AssetStats: React.FC = () => {
  const { data } = useQuery({
    queryKey: [QUERY_KEYS.ERP.ASSETS, 'stats'],
    queryFn: async () => {
      const response = await assetApi.list({ page: 0, pagesize: 1000 });
      if (!response.success) throw new Error('加载资产统计失败');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const assets = data?.items || [];
  const total = assets.length;
  const totalValue = assets.reduce((sum, a) => sum + (a.purchase_amount || 0), 0);
  const active = assets.filter((a) => a.status === 'active').length;
  const retired = assets.filter((a) => ['retired', 'transferred'].includes(a.status)).length;

  const stats = [
    { label: '资产总数', value: total, color: 'secondary[100]', textColor: 'secondary.700' },
    {
      label: '资产总值',
      value: `¥${totalValue.toFixed(2)}`,
      color: 'success.lighter',
      textColor: 'success.700',
    },
    { label: '在用资产', value: active, color: 'warning.light', textColor: 'warning.700' },
    { label: '报废/转移', value: retired, color: 'error.lighter', textColor: 'error.dark' },
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
      {stats.map((stat) => (
        <Box
          key={stat.label}
          sx={{ p: 2, bgcolor: stat.color, borderRadius: 3 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Building2
              size={18}
              sx={{ color: stat.textColor }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary', fontSize: 14 }}
            >
              {stat.label}
            </Typography>
          </Box>
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

const assetApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await assetApi.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
    });
    if (!response.success) {
      throw new Error('加载资产失败');
    }
    const data = response.data;
    return {
      data: (data?.items || []) as unknown as Record<string, unknown>[],
      total: data?.total || 0,
    };
  },

  create: async (data) => {
    const response = await assetApi.create(data as Parameters<typeof assetApi.create>[0]);
    if (!response.success) {
      throw new Error('创建资产失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await assetApi.update(id, data as Parameters<typeof assetApi.update>[1]);
    if (!response.success) {
      throw new Error('更新资产失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await assetApi.delete(id);
    if (!response.success) {
      throw new Error('删除资产失败');
    }
  },
};

const AssetManagementPage: React.FC = () => {
  return (
    <CrudPage
      schema={assetSchema}
      apiAdapter={assetApiAdapter}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: '资产管理' },
      ]}
      headerContent={<AssetStats />}
    />
  );
};

export default AssetManagementPage;
