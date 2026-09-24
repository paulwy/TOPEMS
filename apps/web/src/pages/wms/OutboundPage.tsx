import React, { useMemo } from 'react';
import { Box, Typography, Card, CardContent, Stack } from '@mui/material';
import { Upload, Check, ClipboardList, Truck, Package } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import type { RowAction } from '@/components/templates/list/types';
import type { CrudOperations } from '@/hooks';
import { getColumns, getFormFields } from '@/schema';
import type { EntitySchema } from '@/schema';
import { FormBuilder } from '@/components/common';
import { outboundOrderSchema } from '@/schemas/wms';
import { wmsApi } from '@/api/wms';
import type { OutboundOrder, PaginationParams } from '@/api/wms';
import { designTokens } from '@/theme/tokens';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const ct = designTokens.colors;

const outboundCrudApi: CrudOperations<OutboundOrder> = {
  list: (params) =>
    wmsApi.outboundOrders.list(params as PaginationParams) as ReturnType<
      CrudOperations<OutboundOrder>['list']
    >,
  get: (id) => wmsApi.outboundOrders.get(id) as ReturnType<CrudOperations<OutboundOrder>['get']>,
  create: (data) =>
    wmsApi.outboundOrders.create(
      data as Parameters<typeof wmsApi.outboundOrders.create>[0]
    ) as ReturnType<CrudOperations<OutboundOrder>['create']>,
  update: (id, data) =>
    wmsApi.outboundOrders.update(id, data as Partial<OutboundOrder>) as ReturnType<
      CrudOperations<OutboundOrder>['update']
    >,
  delete: (id) =>
    wmsApi.outboundOrders.delete(id) as ReturnType<CrudOperations<OutboundOrder>['delete']>,
};

const OutboundStats: React.FC = () => {
  const { data: orders = [] } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.WMS_OUTBOUND_ORDERS_STATS_BASE,
    queryFn: async () => {
      const response = await wmsApi.outboundOrders.list({ page: 1, page_size: 100 });
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
      label: i18n.t('pages.outbound_page.k0'),
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
      label: i18n.t('pages.outbound_page.k1'),
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
      label: i18n.t('pages.outbound_page.k2'),
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
      label: i18n.t('pages.outbound_page.k3'),
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
          addNotification({
            type: 'success',
            title: i18n.t('pages.outbound_page.k5'),
            message: i18n.t('pages.outbound_page.k4'),
          });
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AD_HOC.WMS_OUTBOUND_ORDERS_BASE,
            exact: false,
            refetchType: 'active',
          });
        }
      } catch {
        addNotification({
          type: 'error',
          title: i18n.t('pages.outbound_page.k7'),
          message: i18n.t('pages.outbound_page.k6'),
        });
      }
    },
    [queryClient, addNotification]
  );

  const handlePick = React.useCallback(
    async (id: string) => {
      try {
        const response = await wmsApi.outboundOrders.pick(id);
        if (response.success) {
          addNotification({
            type: 'success',
            title: i18n.t('pages.outbound_page.k9'),
            message: i18n.t('pages.outbound_page.k8'),
          });
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AD_HOC.WMS_OUTBOUND_ORDERS_BASE,
            exact: false,
            refetchType: 'active',
          });
        }
      } catch {
        addNotification({
          type: 'error',
          title: i18n.t('pages.outbound_page.k11'),
          message: i18n.t('pages.outbound_page.k10'),
        });
      }
    },
    [queryClient, addNotification]
  );

  const handleShip = React.useCallback(
    async (id: string) => {
      try {
        const response = await wmsApi.outboundOrders.ship(id, []);
        if (response.success) {
          addNotification({
            type: 'success',
            title: i18n.t('pages.outbound_page.k13'),
            message: i18n.t('pages.outbound_page.k12'),
          });
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AD_HOC.WMS_OUTBOUND_ORDERS_BASE,
            exact: false,
            refetchType: 'active',
          });
        }
      } catch {
        addNotification({
          type: 'error',
          title: i18n.t('pages.outbound_page.k15'),
          message: i18n.t('pages.outbound_page.k14'),
        });
      }
    },
    [queryClient, addNotification]
  );

  const handleComplete = React.useCallback(
    async (id: string) => {
      try {
        const response = await wmsApi.outboundOrders.complete(id);
        if (response.success) {
          addNotification({
            type: 'success',
            title: i18n.t('pages.outbound_page.k17'),
            message: i18n.t('pages.outbound_page.k16'),
          });
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AD_HOC.WMS_OUTBOUND_ORDERS_BASE,
            exact: false,
            refetchType: 'active',
          });
        }
      } catch {
        addNotification({
          type: 'error',
          title: i18n.t('pages.outbound_page.k19'),
          message: i18n.t('pages.outbound_page.k18'),
        });
      }
    },
    [queryClient, addNotification]
  );

  const customRowActions: RowAction<OutboundOrder>[] = useMemo(
    () => [
      {
        label: i18n.t('pages.outbound_page.k24'),
        icon: <Check size={16} />,
        onClick: (row) => handleConfirm(row.id as string),
        color: 'info',
        show: (row) => row.status === 'pending',
      },
      {
        label: i18n.t('pages.outbound_page.k25'),
        icon: <ClipboardList size={16} />,
        onClick: (row) => handlePick(row.id as string),
        color: 'info',
        show: (row) => row.status === 'confirmed' || row.status === 'picking',
      },
      {
        label: i18n.t('pages.outbound_page.k26'),
        icon: <Truck size={16} />,
        onClick: (row) => handleShip(row.id as string),
        color: 'warning',
        show: (row) => row.status === 'picked' || row.status === 'packing',
      },
      {
        label: i18n.t('pages.outbound_page.k27'),
        icon: <Package size={16} />,
        onClick: (row) => handleComplete(row.id as string),
        color: 'success',
        show: (row) => row.status === 'shipped',
      },
    ],
    [handleConfirm, handlePick, handleShip, handleComplete]
  );

  const columns = useMemo(
    () => getColumns<OutboundOrder>(outboundOrderSchema as unknown as EntitySchema<OutboundOrder>),
    []
  );

  return (
    <ListPageTemplate<OutboundOrder>
      title={i18n.t('pages.outbound_page.k28')}
      breadcrumbs={[{ label: 'WMS' }, { label: i18n.t('pages.outbound_page.k28') }]}
      columns={columns}
      data={[]}
      headerContent={<OutboundStats />}
      crud={{
        api: outboundCrudApi,
        queryKey: 'wms-outbound-orders',
        entityName: i18n.t('pages.outbound_page.k28'),
        renderForm: ({ mode, record, onSubmit, onClose }) => {
          const fields = getFormFields<OutboundOrder>(
            outboundOrderSchema as unknown as EntitySchema<OutboundOrder>,
            mode === 'view' ? 'view' : mode
          );
          return (
            <FormBuilder
              fields={fields}
              mode={mode}
              initialValues={(record as unknown as Record<string, unknown>) || {}}
              colCount={outboundOrderSchema.formColCount || 2}
              showReset={mode !== 'view'}
              submitLabel={
                mode === 'create'
                  ? i18n.t('common.create')
                  : mode === 'edit'
                    ? i18n.t('common.save')
                    : undefined
              }
              resetLabel={i18n.t('common.cancel')}
              onSubmit={async (values) => {
                const ok = await onSubmit(values as Partial<OutboundOrder>);
                if (!ok) {
                  throw new Error(i18n.t('common.submit_failed'));
                }
              }}
              onReset={onClose}
            />
          );
        },
        rowActions: customRowActions,
      }}
    />
  );
}
