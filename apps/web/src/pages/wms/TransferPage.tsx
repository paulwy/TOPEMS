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
import i18n from '@/i18n';

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
      label: i18n.t('pages.transfer_page.k0'),
      value: stats.total,
      color: 'grey.700',
      bgColor: 'grey.100',
    },
    {
      label: i18n.t('pages.transfer_page.k1'),
      value: stats.pending,
      color: 'warning.dark',
      bgColor: 'warning.light',
    },
    {
      label: i18n.t('pages.transfer_page.k2'),
      value: stats.shipped,
      color: 'info.dark',
      bgColor: 'info.light',
    },
    {
      label: i18n.t('pages.transfer_page.k3'),
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
  pending: { label: i18n.t('pages.transfer_page.k4'), color: 'warning' },
  confirmed: { label: i18n.t('pages.transfer_page.k5'), color: 'info' },
  shipped: { label: i18n.t('pages.transfer_page.k6'), color: 'info' },
  received: { label: i18n.t('pages.transfer_page.k7'), color: 'success' },
  completed: { label: i18n.t('pages.transfer_page.k8'), color: 'success' },
  cancelled: { label: i18n.t('pages.transfer_page.k9'), color: 'error' },
};

const priorityConfig: Record<
  string,
  { label: string; color: 'error' | 'warning' | 'info' | 'default' }
> = {
  urgent: { label: i18n.t('pages.transfer_page.k10'), color: 'error' },
  high: { label: i18n.t('pages.transfer_page.k11'), color: 'warning' },
  normal: { label: i18n.t('pages.transfer_page.k12'), color: 'info' },
  low: { label: i18n.t('pages.transfer_page.k13'), color: 'default' },
};

const transferTypeConfig: Record<string, string> = {
  internal: i18n.t('pages.transfer_page.k14'),
  external: i18n.t('pages.transfer_page.k15'),
  return: i18n.t('pages.transfer_page.k16'),
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
            {i18n.t('pages.transfer_page.k0')}
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
            {i18n.t('pages.transfer_page.k1')}
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
            {i18n.t('pages.transfer_page.k2')}
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
            {i18n.t('pages.transfer_page.k3')}
          </Typography>
          <Typography variant='body1'>{(row.from_location_code as string) || '-'}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.transfer_page.k4')}
          </Typography>
          <Typography variant='body1'>{getWarehouseName(row.to_warehouse_id as string)}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.transfer_page.k5')}
          </Typography>
          <Typography variant='body1'>{(row.to_location_code as string) || '-'}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.transfer_page.k6')}
          </Typography>
          <Box sx={{ mt: 0.5 }}>{getPriorityBadge((row.priority as string) || 'normal')}</Box>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.transfer_page.k7')}
          </Typography>
          <Box sx={{ mt: 0.5 }}>{getStatusBadge(row.status as string)}</Box>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.transfer_page.k8')}
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
            {i18n.t('pages.transfer_page.k9')}
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
            {i18n.t('pages.transfer_page.k10')}
          </Typography>
          <Typography variant='body1'>{(row.transporter as string) || '-'}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.transfer_page.k11')}
          </Typography>
          <Typography variant='body1'>{(row.tracking_number as string) || '-'}</Typography>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.transfer_page.k12')}
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
            {i18n.t('pages.transfer_page.k13')}
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
                <Typography variant='caption'>{i18n.t('pages.transfer_page.k17')}</Typography>
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
                <Typography variant='caption'>{i18n.t('pages.transfer_page.k18')}</Typography>
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
                <Typography variant='caption'>{i18n.t('pages.transfer_page.k19')}</Typography>
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
          addNotification({ type: 'success', title: i18n.t('pages.transfer_page.k21'), message: i18n.t('pages.transfer_page.k20') });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WMS_TRANSFERS_BASE ,
  exact: false,
  refetchType: 'active',
});
        }
      } catch {
        addNotification({ type: 'error', title: i18n.t('pages.transfer_page.k23'), message: i18n.t('pages.transfer_page.k22') });
      }
    },
    [queryClient, addNotification]
  );

  const handleShip = React.useCallback(
    async (id: string) => {
      try {
        const response = await wmsApi.transfers.ship(id);
        if (response.success) {
          addNotification({ type: 'success', title: i18n.t('pages.transfer_page.k25'), message: i18n.t('pages.transfer_page.k24') });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WMS_TRANSFERS_BASE ,
  exact: false,
  refetchType: 'active',
});
        }
      } catch {
        addNotification({ type: 'error', title: i18n.t('pages.transfer_page.k27'), message: i18n.t('pages.transfer_page.k26') });
      }
    },
    [queryClient, addNotification]
  );

  const handleReceive = React.useCallback(
    async (id: string) => {
      try {
        const response = await wmsApi.transfers.receive(id);
        if (response.success) {
          addNotification({ type: 'success', title: i18n.t('pages.transfer_page.k29'), message: i18n.t('pages.transfer_page.k28') });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WMS_TRANSFERS_BASE ,
  exact: false,
  refetchType: 'active',
});
        }
      } catch {
        addNotification({ type: 'error', title: i18n.t('pages.transfer_page.k31'), message: i18n.t('pages.transfer_page.k30') });
      }
    },
    [queryClient, addNotification]
  );

  const handleComplete = React.useCallback(
    async (id: string) => {
      try {
        const response = await wmsApi.transfers.complete(id);
        if (response.success) {
          addNotification({ type: 'success', title: i18n.t('pages.transfer_page.k33'), message: i18n.t('pages.transfer_page.k32') });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WMS_TRANSFERS_BASE ,
  exact: false,
  refetchType: 'active',
});
        }
      } catch {
        addNotification({ type: 'error', title: i18n.t('pages.transfer_page.k35'), message: i18n.t('pages.transfer_page.k34') });
      }
    },
    [queryClient, addNotification]
  );

  const transferApiAdapter: CrudApiAdapter = {
    list: async (params) => {
      const response = await wmsApi.transfers.list(
        params as Parameters<typeof wmsApi.transfers.list>[0]
      );
      if (!response.success) throw new Error(i18n.t('pages.transfer_page.k36'));
      const items = response.data?.items || [];
      const total = response.data?.total || 0;
      return { data: items as unknown as Record<string, unknown>[], total };
    },

    create: async (data) => {
      const response = await wmsApi.transfers.create(
        data as unknown as Parameters<typeof wmsApi.transfers.create>[0]
      );
      if (!response.success) throw new Error(i18n.t('pages.transfer_page.k37'));
      return response.data as unknown as Record<string, unknown>;
    },

    update: async (id, data) => {
      const response = await wmsApi.transfers.update(
        id,
        data as unknown as Parameters<typeof wmsApi.transfers.update>[1]
      );
      if (!response.success) throw new Error(i18n.t('pages.transfer_page.k38'));
      return response.data as unknown as Record<string, unknown>;
    },

    delete: async (id) => {
      const response = await wmsApi.transfers.delete(id);
      if (!response.success) throw new Error(i18n.t('pages.transfer_page.k39'));
    },
  };

  const customRowActions: RowAction[] = [
    {
      label: i18n.t('pages.transfer_page.k40'),
      icon: <Check size={16} />,
      color: 'info',
      onClick: (row: Record<string, unknown>) => handleConfirm(row.id as string),
      show: (row: Record<string, unknown>) => row.status === 'pending',
    },
    {
      label: i18n.t('pages.transfer_page.k41'),
      icon: <Truck size={16} />,
      color: 'info',
      onClick: (row: Record<string, unknown>) => handleShip(row.id as string),
      show: (row: Record<string, unknown>) => row.status === 'confirmed',
    },
    {
      label: i18n.t('pages.transfer_page.k42'),
      icon: <Package size={16} />,
      color: 'success',
      onClick: (row: Record<string, unknown>) => handleReceive(row.id as string),
      show: (row: Record<string, unknown>) => row.status === 'shipped',
    },
    {
      label: i18n.t('pages.transfer_page.k43'),
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
        { label: i18n.t('pages.transfer_page.k44'), href: '/dashboard' },
        { label: 'WMS', href: '/wms' },
        { label: i18n.t('pages.transfer_page.k45') },
      ]}
      headerContent={<TransferStats />}
      detailContent={(row) => <TransferDetail row={row} />}
      detailMaxWidth='md'
      idField='id'
    />
  );
}
