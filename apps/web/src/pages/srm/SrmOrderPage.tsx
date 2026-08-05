import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { orderSchema } from '@/schemas/srm/order';
import { srmApi } from '@/api/srm';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { ClipboardList, ShoppingCart } from 'lucide-react';

const SrmOrderStats: React.FC = () => {
  const { data } = useQuery({
    queryKey: [QUERY_KEYS.SRM.ORDERS, 'stats'],
    queryFn: async () => {
      const response = await srmApi.listPurchaseOrders();
      if (!response.success) throw new Error('加载订单统计失败');
      const items = (response.data || []) as Array<{
        id?: string;
        status?: string;
        total_amount?: number;
        amount?: number;
      }>;
      return items.map((item) => ({
        ...item,
        total_amount: item.total_amount || item.amount || 0,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const orders = data || [];
  const total = orders.length;
  const pending = orders.filter((o) => o.status === 'pending').length;
  const processing = orders.filter((o) => o.status === 'processing').length;
  const completed = orders.filter((o) => o.status === 'completed').length;
  const totalAmount = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const statCards = [
    {
      label: '订单总数',
      value: total,
      color: 'primary.lighter',
      textColor: 'text.secondary',
      icon: (
        <ClipboardList
          size={20}
          color='primary.dark'
        />
      ),
    },
    {
      label: '待处理',
      value: pending,
      color: 'warning.lighter',
      textColor: 'warning.dark',
      icon: (
        <ClipboardList
          size={20}
          color='warning.dark'
        />
      ),
    },
    {
      label: '处理中',
      value: processing,
      color: 'primary.100',
      textColor: 'primary.dark',
      icon: (
        <ClipboardList
          size={20}
          color='primary.dark'
        />
      ),
    },
    {
      label: '已完成',
      value: completed,
      color: 'success.lighter',
      textColor: 'success.dark',
      icon: (
        <ClipboardList
          size={20}
          color='success.dark'
        />
      ),
    },
    {
      label: '订单总额',
      value: `¥${totalAmount.toLocaleString()}`,
      color: 'secondary.light',
      textColor: 'primary.light',
      icon: (
        <ShoppingCart
          size={20}
          color='primary.light'
        />
      ),
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(1, 1fr)',
          md: 'repeat(2, 1fr)',
          lg: 'repeat(5, 1fr)',
        },
        gap: 2,
        mb: 3,
      }}
    >
      {statCards.map((stat) => (
        <Box
          key={stat.label}
          sx={{ p: 2, bgcolor: stat.color, borderRadius: 3 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'action.hover',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {stat.icon}
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
              >
                {stat.label}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stat.value}
              </Typography>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const orderApiAdapter: CrudApiAdapter = {
  list: async (_params) => {
    const response = await srmApi.listPurchaseOrders();
    if (!response.success) {
      throw new Error('加载订单失败');
    }
    const items = (response.data || []) as unknown as Array<Record<string, unknown>>;
    const adapted = items.map((item) => ({
      ...item,
      total_amount: (item.total_amount as number) || (item.amount as number) || 0,
    }));
    return {
      data: adapted,
      total: adapted.length,
    };
  },

  create: async (data) => {
    const response = await srmApi.createPurchaseOrder(
      data as unknown as Parameters<typeof srmApi.createPurchaseOrder>[0]
    );
    if (!response.success) {
      throw new Error('创建订单失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await srmApi.updatePurchaseOrder(
      id,
      data as unknown as Parameters<typeof srmApi.updatePurchaseOrder>[1]
    );
    if (!response.success) {
      throw new Error('更新订单失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await srmApi.deletePurchaseOrder(id);
    if (!response.success) {
      throw new Error('删除订单失败');
    }
  },
};

const SrmOrderPage: React.FC = () => {
  return (
    <CrudPage
      schema={orderSchema}
      apiAdapter={orderApiAdapter}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: 'SRM', href: '/srm' },
        { label: '采购订单' },
      ]}
      headerContent={<SrmOrderStats />}
    />
  );
};

export default SrmOrderPage;
