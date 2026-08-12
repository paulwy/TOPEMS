import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { type RowAction } from '@/components/templates';
import { transferSchema } from '@/schemas/wms';
import { wmsApi } from '@/api/wms';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Stack, Chip } from '@mui/material';
import { Check, Truck, Package } from 'lucide-react';
import { useNotificationStore } from '@/store';


import { QUERY_KEYS } from '@/lib/reactQuery';

const TransferStats: React.FC = () => {
  const { data: transfers = [] } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.WMS_TRANSFERS_STATS_BASE,
    queryFn: async () => {
      const response = await wmsApi.transfers.list({ page: 1, pagesize: 100 });
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = React.useMemo(
    () => ({
      total: transfers.length,
      pending: transfers.filter((t: { status: string }) => t.status === 'pending').length,
      shipped: transfers.filter((t: { status: string }) => t.status === 'shipped').length,
      completed: transfers.filter((t: { status: string }) => t.status === 'completed').length,
    }),
    [transfers]
  );

  const statCards = [
    {
      label: '调拨单总数',
      value: stats.total,
      color: 'grey.700',
      bgColor: 'grey.100',
    },
    {
      label: '待处理',
      value: stats.pending,
      color: 'warning.dark',
      bgColor: 'warning.light',
    },
    {
      label: '已发货',
      value: stats.shipped,
      color: 'info.dark',
      bgColor: 'info.light',
    },
    {
      label: '已完成',
      value: stats.completed,
      color: 'success.dark',
      bgColor: 'success.light',
    },
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
      {statCards.map((card) => (
        <Box
          key={card.label}
          sx={{
            p: 2,
            bgcolor: card.bgColor,
            borderRadius: 3,
          }}
        >
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {card.label}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: card.color }}
          >
            {card.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const statusConfig: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }
> = {
  pending: { label: '待处理', color: 'warning' },
  confirmed: { label: '已确认', color: 'info' },
  shipped: { label: '已发货', color: 'info' },
  received: { label: '已收货', color: 'success' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'error' },
};

const priorityConfig: Record<
  string,
  { label: string; color: 'error' | 'warning' | 'info' | 'default' }
> = {
  urgent: { label: '紧急', color: 'error' },
  high: { label: '高', color: 'warning' },
  normal: { label: '普通', color: 'info' },
  low: { label: '低', color: 'default' },
};

const transferTypeConfig: Record<string, string> = {
  internal: '内部调拨',
  external: '外部调拨',
  return: '退回复检',
};

const TransferDetail: React.FC<{ row: Record<string, unknown> }> = ({ row }) => {
  const { data: warehouses = [] } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.WMS_WAREHOUSES_FOR_DETAIL_BASE,
    queryFn: async () => {
      const response = await wmsApi.warehouses.list({ page: 1, pagesize: 100 });
      return response.success && response.data ? response.data.items || [] : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const getWarehouseName = (id: string) => {
    return warehouses.find((w: { id: string }) => w.id === id)?.name || id;
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, color: 'default' as const };
    return (
      <Chip
        size='small'
        color={config.color}
        label={config.label}
        variant='outlined'
      />
    );
  };

  const getPriorityBadge = (priority: string) => {
    const config = priorityConfig[priority] || { label: priority, color: 'default' as const };
    return (
      <Chip
        size='small'
        color={config.color}
        label={config.label}
        variant='filled'
      />
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            调拨单号
          </Typography>
          <Typography
            variant='body1'
            sx={{ fontWeight: 500 }}
          >
            {row.order_number as string}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            调拨类型
          </Typography>
          <Typography variant='body1'>
            {transferTypeConfig[row.transfer_type as string] || (row.transfer_type as string)}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            源仓库
          </Typography>
          <Typography variant='body1'>
            {getWarehouseName(row.from_warehouse_id as string)}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            源库位
          </Typography>
          <Typography variant='body1'>{(row.from_location_code as string) || '-'}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            目标仓库
          </Typography>
          <Typography variant='body1'>{getWarehouseName(row.to_warehouse_id as string)}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            目标库位
          </Typography>
          <Typography variant='body1'>{(row.to_location_code as string) || '-'}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            优先级
          </Typography>
          <Box sx={{ mt: 0.5 }}>{getPriorityBadge((row.priority as string) || 'normal')}</Box>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            状态
          </Typography>
          <Box sx={{ mt: 0.5 }}>{getStatusBadge(row.status as string)}</Box>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            总数量
          </Typography>
          <Typography variant='body1'>
            {row.total_quantity ? String(row.total_quantity) : 0}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            计划日期
          </Typography>
          <Typography variant='body1'>
            {row.planned_date
              ? new Date(row.planned_date as string).toLocaleDateString('zh-CN')
              : '-'}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            承运人
          </Typography>
          <Typography variant='body1'>{(row.transporter as string) || '-'}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            物流单号
          </Typography>
          <Typography variant='body1'>{(row.tracking_number as string) || '-'}</Typography>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            备注
          </Typography>
          <Typography variant='body1'>{(row.remarks as string) || '-'}</Typography>
        </Box>
      </Box>

      {(row.shipped_at != null || row.received_at != null || row.approved_at != null) && (
        <Box sx={{ mt: 2 }}>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1 }}
          >
            操作记录
          </Typography>
          <Stack spacing={1}>
            {row.approved_at != null && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {new Date(row.approved_at as string).toLocaleString('zh-CN')}
                </Typography>
                <Typography variant='caption'>已确认</Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  by {(row.approved_by as string) || '-'}
                </Typography>
              </Box>
            )}
            {row.shipped_at != null && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {new Date(row.shipped_at as string).toLocaleString('zh-CN')}
                </Typography>
                <Typography variant='caption'>已发货</Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  by {(row.shipped_by as string) || '-'}
                </Typography>
              </Box>
            )}
            {row.received_at != null && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {new Date(row.received_at as string).toLocaleString('zh-CN')}
                </Typography>
                <Typography variant='caption'>已收货</Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  by {(row.received_by as string) || '-'}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default function TransferPage() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const handleConfirm = React.useCallback(
    async (id: string) => {
      try {
        const response = await wmsApi.transfers.confirm(id);
        if (response.success) {
          addNotification({ type: 'success', title: '成功', message: '调拨单已确认' });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WMS_TRANSFERS_BASE ,
  exact: false,
  refetchType: 'active',
});
        }
      } catch {
        addNotification({ type: 'error', title: '失败', message: '确认调拨单失败' });
      }
    },
    [queryClient, addNotification]
  );

  const handleShip = React.useCallback(
    async (id: string) => {
      try {
        const response = await wmsApi.transfers.ship(id);
        if (response.success) {
          addNotification({ type: 'success', title: '成功', message: '调拨单已发货' });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WMS_TRANSFERS_BASE ,
  exact: false,
  refetchType: 'active',
});
        }
      } catch {
        addNotification({ type: 'error', title: '失败', message: '发货操作失败' });
      }
    },
    [queryClient, addNotification]
  );

  const handleReceive = React.useCallback(
    async (id: string) => {
      try {
        const response = await wmsApi.transfers.receive(id);
        if (response.success) {
          addNotification({ type: 'success', title: '成功', message: '调拨单已收货' });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WMS_TRANSFERS_BASE ,
  exact: false,
  refetchType: 'active',
});
        }
      } catch {
        addNotification({ type: 'error', title: '失败', message: '收货操作失败' });
      }
    },
    [queryClient, addNotification]
  );

  const handleComplete = React.useCallback(
    async (id: string) => {
      try {
        const response = await wmsApi.transfers.complete(id);
        if (response.success) {
          addNotification({ type: 'success', title: '成功', message: '调拨单已完成' });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WMS_TRANSFERS_BASE ,
  exact: false,
  refetchType: 'active',
});
        }
      } catch {
        addNotification({ type: 'error', title: '失败', message: '完成操作失败' });
      }
    },
    [queryClient, addNotification]
  );

  const transferApiAdapter: CrudApiAdapter = {
    list: async (params) => {
      const response = await wmsApi.transfers.list(
        params as Parameters<typeof wmsApi.transfers.list>[0]
      );
      if (!response.success) throw new Error('加载调拨单列表失败');
      const items = response.data?.items || [];
      const total = response.data?.total || 0;
      return { data: items as unknown as Record<string, unknown>[], total };
    },

    create: async (data) => {
      const response = await wmsApi.transfers.create(
        data as unknown as Parameters<typeof wmsApi.transfers.create>[0]
      );
      if (!response.success) throw new Error('创建调拨单失败');
      return response.data as unknown as Record<string, unknown>;
    },

    update: async (id, data) => {
      const response = await wmsApi.transfers.update(
        id,
        data as unknown as Parameters<typeof wmsApi.transfers.update>[1]
      );
      if (!response.success) throw new Error('更新调拨单失败');
      return response.data as unknown as Record<string, unknown>;
    },

    delete: async (id) => {
      const response = await wmsApi.transfers.delete(id);
      if (!response.success) throw new Error('删除调拨单失败');
    },
  };

  const customRowActions: RowAction[] = [
    {
      label: '确认',
      icon: <Check size={16} />,
      color: 'info',
      onClick: (row: Record<string, unknown>) => handleConfirm(row.id as string),
      show: (row: Record<string, unknown>) => row.status === 'pending',
    },
    {
      label: '发货',
      icon: <Truck size={16} />,
      color: 'info',
      onClick: (row: Record<string, unknown>) => handleShip(row.id as string),
      show: (row: Record<string, unknown>) => row.status === 'confirmed',
    },
    {
      label: '收货',
      icon: <Package size={16} />,
      color: 'success',
      onClick: (row: Record<string, unknown>) => handleReceive(row.id as string),
      show: (row: Record<string, unknown>) => row.status === 'shipped',
    },
    {
      label: '完成',
      icon: <Check size={16} />,
      color: 'success',
      onClick: (row: Record<string, unknown>) => handleComplete(row.id as string),
      show: (row: Record<string, unknown>) => row.status === 'received',
    },
  ];

  return (
    <CrudPage
      schema={transferSchema}
      apiAdapter={transferApiAdapter}
      customRowActions={customRowActions}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: 'WMS', href: '/wms' },
        { label: '调拨管理' },
      ]}
      headerContent={<TransferStats />}
      detailContent={(row) => <TransferDetail row={row} />}
      detailMaxWidth='md'
      idField='id'
    />
  );
}
