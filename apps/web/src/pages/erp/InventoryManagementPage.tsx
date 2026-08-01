import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { Package, AlertTriangle, DollarSign, CheckCircle } from 'lucide-react';
import { PageContainer } from '@/components/common';
import CrudPage from '@/components/templates/CrudPage';
import { inventorySchema } from '@/schemas/erp';
import { erpApi } from '@/api/erp';
import type { Inventory } from '@/api/erp';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const inventoryAdapter = {
  list: async (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    warehouse?: string;
  }) => {
    const queryParams: Record<string, unknown> = {
      page: params?.page,
      pagesize: params?.pageSize,
    };
    if (params?.search) queryParams.search = params.search;
    if (params?.warehouse && params.warehouse !== 'all') {
      queryParams.warehouse = params.warehouse;
    }

    const response = await erpApi.inventory.list(queryParams);
    if (response.success && response.data) {
      return {
        data: response.data.items || [],
        total: response.data.total || 0,
      };
    }
    return { data: [], total: 0 };
  },
  create: async (data: Partial<Inventory>) => {
    const response = await erpApi.inventory.create(data as Parameters<typeof erpApi.inventory.create>[0]);
    if (!response.success || !response.data) {
      throw new Error(response.message || '创建库存失败');
    }
    return response.data;
  },
  update: async (id: string, data: Partial<Inventory>) => {
    const response = await erpApi.inventory.update(id, data as Parameters<typeof erpApi.inventory.update>[1]);
    if (!response.success || !response.data) {
      throw new Error(response.message || '更新库存失败');
    }
    return response.data;
  },
  delete: async (id: string) => {
    const response = await erpApi.inventory.delete(id);
    if (!response.success) {
      throw new Error(response.message || '删除库存失败');
    }
  },
};

const StatCard: React.FC<{
  label: string;
  value: number | string;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
  gradient?: boolean;
}> = ({ label, value, icon, bgColor, iconColor, gradient }) => (
  <Box sx={{ p: 2, bgcolor: bgColor, borderRadius: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          bgcolor: gradient ? undefined : iconColor,
          background: gradient
            ? `linear-gradient(135deg, ${iconColor}, ${ct.primary.dark})`
            : undefined,
          borderRadius: gradient ? '50%' : 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ color: gradient ? ct.background.paper : iconColor, display: 'flex' }}>
          {icon}
        </Box>
      </Box>
      <Box component='span' sx={{ color: 'text.secondary', fontSize: 14 }}>
        {label}
      </Box>
    </Box>
    <Typography variant='h5' sx={{ fontWeight: 700 }}>
      {value}
    </Typography>
  </Box>
);

const InventoryManagementPage: React.FC = () => {
  const headerContent = (rows: Record<string, unknown>[], total: number) => {
    const items = rows as unknown as Inventory[];
    const totalValue = items.reduce(
      (sum: number, item: Inventory) => sum + (item.total_cost || 0),
      0
    );
    const lowStock = items.filter(
      (i: Inventory) => i.safety_stock && i.quantity < i.safety_stock
    ).length;
    const inStock = items.filter((i: Inventory) => i.quantity > 0).length;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <StatCard
          label='物料总数'
          value={total}
          icon={<Package size={18} />}
          bgColor='primary.lighter'
          iconColor='primary.main'
        />
        <StatCard
          label='库存总金额'
          value={`¥${totalValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`}
          icon={<DollarSign size={18} />}
          bgColor='success.lighter'
          iconColor='success.main'
          gradient
        />
        <StatCard
          label='低于安全库存'
          value={lowStock}
          icon={<AlertTriangle size={18} />}
          bgColor='warning.light'
          iconColor='warning.main'
        />
        <StatCard
          label='有库存物料'
          value={inStock}
          icon={<CheckCircle size={18} />}
          bgColor={ct.secondary[100]}
          iconColor='secondary.700'
        />
      </Box>
    );
  };

  return (
    <PageContainer
      title='库存管理'
      subtitle='管理库存信息，包括物料、数量、仓库、库位等'
    >
      <CrudPage
        schema={inventorySchema}
        apiAdapter={inventoryAdapter}
        headerContent={headerContent}
      />
    </PageContainer>
  );
};

export default InventoryManagementPage;
