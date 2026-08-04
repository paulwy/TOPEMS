/**
 * 办公用品管理页面 — Schema 驱动的 CRUD 页面
 */

import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { officeSuppliesSchema } from '@/schemas/erp/officeSupplies';
import { officeSupplyApi } from '@/api/erp';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { Package } from 'lucide-react';

const OfficeSuppliesStats: React.FC = () => {
  const { data } = useQuery({
    queryKey: [QUERY_KEYS.ERP.OFFICE_SUPPLIES, 'stats'],
    queryFn: async () => {
      const response = await officeSupplyApi.list({ page: 0, pagesize: 1000 });
      if (!response.success) throw new Error('加载办公用品统计失败');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const supplies = data?.items || [];
  const total = supplies.length;
  const inStock = supplies.filter((s) => s.status === 'in_stock').length;
  const lowStock = supplies.filter((s) => s.status === 'low_stock').length;
  const outOfStock = supplies.filter((s) => s.status === 'out_of_stock').length;

  const stats = [
    { label: '物品总数', value: total, color: 'secondary[100]', textColor: 'secondary.700' },
    { label: '在库', value: inStock, color: 'success.lighter', textColor: 'success.700' },
    { label: '库存不足', value: lowStock, color: 'warning.light', textColor: 'warning.700' },
    { label: '缺货', value: outOfStock, color: 'error.lighter', textColor: 'error.dark' },
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
            <Package
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

const officeSupplyApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await officeSupplyApi.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
      category: params?.category as string | undefined,
    });
    if (!response.success) {
      throw new Error('加载办公用品失败');
    }
    const data = response.data;
    return {
      data: (data?.items || []) as unknown as Record<string, unknown>[],
      total: data?.total || 0,
    };
  },

  create: async (data) => {
    const response = await officeSupplyApi.create(
      data as Parameters<typeof officeSupplyApi.create>[0]
    );
    if (!response.success) {
      throw new Error('创建办公用品失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await officeSupplyApi.update(
      id,
      data as Parameters<typeof officeSupplyApi.update>[1]
    );
    if (!response.success) {
      throw new Error('更新办公用品失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await officeSupplyApi.delete(id);
    if (!response.success) {
      throw new Error('删除办公用品失败');
    }
  },
};

const OfficeSuppliesPage: React.FC = () => {
  return (
    <CrudPage
      schema={officeSuppliesSchema}
      apiAdapter={officeSupplyApiAdapter}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: '办公用品管理' },
      ]}
      headerContent={<OfficeSuppliesStats />}
    />
  );
};

export default OfficeSuppliesPage;
