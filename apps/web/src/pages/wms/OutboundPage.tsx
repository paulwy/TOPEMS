import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { outboundOrderSchema } from '@/schemas/wms';
import { wmsApi } from '@/api/wms';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Card, CardContent, Stack } from '@mui/material';
import { Upload, Check, ClipboardList, Truck, Package } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import { useNotificationStore } from '@/store';


import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const OutboundStats: React.FC = () => {
  const { data: orders = [] } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.WMS_OUTBOUND_ORDERS_STATS_BASE,
    queryFn: async () => {
      const response = await wmsApi.outboundOrders.list({ page: 1, pagesize: 100 });
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = React.useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((o: { status: string }) => o.status === 'pending').length,
      picking: orders.filter(
        (o: { status: string }) => o.status === 'picking' || o.status === 'picked'
      ).length,
      completed: orders.filter(
        (o: { status: string }) => o.status === 'completed' || o.status === 'shipped'
      ).length,
    }),
    [orders]
  );

  const statCards = [
    {
      label: '出库单总数',
      value: stats.total,
      color: ct.warning.main,
      bgColor: 'grey.100',
      icon: (
        <Upload
          size={20}
          color={ct.warning.main}
        />
      ),
    },
    {
      label: '待确认',
      value: stats.pending,
      color: 'warning.dark',
      bgColor: 'warning.light',
      icon: (
        <Check
          size={20}
          color='warning.dark'
        />
      ),
    },
    {
      label: '拣货中',
      value: stats.picking,
      color: 'info.dark',
      bgColor: 'info.light',
      icon: (
        <ClipboardList
          size={20}
          color='info.dark'
        />
      ),
    },
    {
      label: '已完成',
      value: stats.completed,
      color: 'success.dark',
      bgColor: 'success.light',
      icon: (
        <Package
          size={20}
          color='success.dark'
        />
      ),
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 4,
      }}
    >
      {statCards.map((card) => (
        <Card key={card.label}>
          <CardContent sx={{ p: 2 }}>
            <Stack
              direction='row'
              spacing={1.5}
              sx={{ alignItems: 'center' }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: card.bgColor,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {card.icon}
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {card.label}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {card.value}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default function OutboundPage() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const handleConfirm = React.useCallback(
    async (id: string) => {
      try {
        const response = await wmsApi.outboundOrders.confirm(id);
        if (response.success) {
          addNotification({ type: 'success', title: '成功', message: '出库单已确认' });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WMS_OUTBOUND_ORDERS_BASE ,
  exact: false,
  refetchType: 'active',
});
        }
      } catch {
        addNotification({ type: 'error', title: '失败', message: '确认出库单失败' });
      }
    },
    [queryClient, addNotification]
  );

  const handlePick = React.useCallback(
    async (id: string) => {
      try {
        const response = await wmsApi.outboundOrders.pick(id);
        if (response.success) {
          addNotification({ type: 'success', title: '成功', message: '已开始拣货' });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WMS_OUTBOUND_ORDERS_BASE ,
  exact: false,
  refetchType: 'active',
});
        }
      } catch {
        addNotification({ type: 'error', title: '失败', message: '拣货失败' });
      }
    },
    [queryClient, addNotification]
  );

  const handleShip = React.useCallback(
    async (id: string) => {
      try {
        const response = await wmsApi.outboundOrders.ship(id, []);
        if (response.success) {
          addNotification({ type: 'success', title: '成功', message: '出库单已发货' });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WMS_OUTBOUND_ORDERS_BASE ,
  exact: false,
  refetchType: 'active',
});
        }
      } catch {
        addNotification({ type: 'error', title: '失败', message: '发货失败' });
      }
    },
    [queryClient, addNotification]
  );

  const handleComplete = React.useCallback(
    async (id: string) => {
      try {
        const response = await wmsApi.outboundOrders.complete(id);
        if (response.success) {
          addNotification({ type: 'success', title: '成功', message: '出库单已完成' });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WMS_OUTBOUND_ORDERS_BASE ,
  exact: false,
  refetchType: 'active',
});
        }
      } catch {
        addNotification({ type: 'error', title: '失败', message: '完成出库单失败' });
      }
    },
    [queryClient, addNotification]
  );

  const outboundApiAdapter: CrudApiAdapter = {
    list: async (params) => {
      const response = await wmsApi.outboundOrders.list(
        params as Parameters<typeof wmsApi.outboundOrders.list>[0]
      );
      if (!response.success) throw new Error('加载出库单列表失败');
      const items = response.data?.items || [];
      const total = response.data?.total || 0;
      return { data: items as unknown as Record<string, unknown>[], total };
    },

    create: async (data) => {
      const response = await wmsApi.outboundOrders.create(
        data as unknown as Parameters<typeof wmsApi.outboundOrders.create>[0]
      );
      if (!response.success) throw new Error('创建出库单失败');
      return response.data as unknown as Record<string, unknown>;
    },

    update: async (id, data) => {
      const response = await wmsApi.outboundOrders.update(
        id,
        data as Parameters<typeof wmsApi.outboundOrders.update>[1]
      );
      if (!response.success) throw new Error('更新出库单失败');
      return response.data as unknown as Record<string, unknown>;
    },

    delete: async (id) => {
      const response = await wmsApi.outboundOrders.delete(id);
      if (!response.success) throw new Error('删除出库单失败');
    },
  };

  const customRowActions: RowAction[] = [
    {
      label: '确认',
      icon: <Check size={16} />,
      onClick: (row: Record<string, unknown>) => handleConfirm(row.id as string),
      color: 'info',
      show: (row: Record<string, unknown>) => row.status === 'pending',
    },
    {
      label: '拣货',
      icon: <ClipboardList size={16} />,
      onClick: (row: Record<string, unknown>) => handlePick(row.id as string),
      color: 'info',
      show: (row: Record<string, unknown>) =>
        row.status === 'confirmed' || row.status === 'picking',
    },
    {
      label: '发货',
      icon: <Truck size={16} />,
      onClick: (row: Record<string, unknown>) => handleShip(row.id as string),
      color: 'warning',
      show: (row: Record<string, unknown>) => row.status === 'picked' || row.status === 'packing',
    },
    {
      label: '完成',
      icon: <Package size={16} />,
      onClick: (row: Record<string, unknown>) => handleComplete(row.id as string),
      color: 'success',
      show: (row: Record<string, unknown>) => row.status === 'shipped',
    },
  ];

  return (
    <CrudPage
      schema={outboundOrderSchema}
      apiAdapter={outboundApiAdapter}
      customRowActions={customRowActions}
      breadcrumbs={[{ label: 'WMS' }, { label: '出库管理' }]}
      headerContent={<OutboundStats />}
    />
  );
}
