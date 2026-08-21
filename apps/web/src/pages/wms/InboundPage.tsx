import React, { useMemo } from 'react';
import { Box, Typography, Card, CardContent, Stack } from '@mui/material';
import { Download, Check, Package, ClipboardCheck } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import type { RowAction } from '@/components/templates/list/types';
import type { CrudOperations } from '@/hooks';
import { getColumns, getFormFields } from '@/schema';
import type { EntitySchema } from '@/schema';
import { FormBuilder } from '@/components/common';
import { inboundOrderSchema } from '@/schemas/wms';
import { wmsApi } from '@/api/wms';
import type { InboundOrder, PaginationParams } from '@/api/wms';
import { designTokens } from '@/theme/tokens';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const ct = designTokens.colors;

const inboundCrudApi: CrudOperations<InboundOrder> = {
  list: (params) =>
    wmsApi.inboundOrders.list(params as PaginationParams) as ReturnType<
      CrudOperations<InboundOrder>['list']
    >,
  get: (id) => wmsApi.inboundOrders.get(id) as ReturnType<CrudOperations<InboundOrder>['get']>,
  create: (data) =>
    wmsApi.inboundOrders.create(data as Parameters<typeof wmsApi.inboundOrders.create>[0]) as ReturnType<
      CrudOperations<InboundOrder>['create']
    >,
  update: (id, data) =>
    wmsApi.inboundOrders.update(id, data as Partial<InboundOrder>) as ReturnType<
      CrudOperations<InboundOrder>['update']
    >,
  delete: (id) =>
    wmsApi.inboundOrders.delete(id) as ReturnType<CrudOperations<InboundOrder>['delete']>,
};

const InboundStats: React.FC = () => {
  const { data: orders = [] } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.WMS_INBOUND_ORDERS_STATS_BASE,
    queryFn: async () => {
      const response = await wmsApi.inboundOrders.list({ page: 1, pagesize: 100 });
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
      receiving: orders.filter(
        (o: { status: string }) => o.status === 'receiving' || o.status === 'confirmed'
      ).length,
      completed: orders.filter((o: { status: string }) => o.status === 'completed').length,
    }),
    [orders]
  );

  const statCards = [
    {
      label: i18n.t('pages.inbound_page.k0'),
      value: stats.total,
      color: ct.success.main,
      bgColor: 'grey.100',
      icon: <Download size={20} color={ct.success.main} />,
    },
    {
      label: i18n.t('pages.inbound_page.k1'),
      value: stats.pending,
      color: 'warning.dark',
      bgColor: 'warning.light',
      icon: <Check size={20} color='warning.dark' />,
    },
    {
      label: i18n.t('pages.inbound_page.k2'),
      value: stats.receiving,
      color: 'info.dark',
      bgColor: 'info.light',
      icon: <Package size={20} color='info.dark' />,
    },
    {
      label: i18n.t('pages.inbound_page.k3'),
      value: stats.completed,
      color: 'success.dark',
      bgColor: 'success.light',
      icon: <ClipboardCheck size={20} color='success.dark' />,
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
            <Stack direction='row' spacing={1.5} sx={{ alignItems: 'center' }}>
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
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {card.label}
                </Typography>
                <Typography variant='h5' sx={{ fontWeight: 700 }}>
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

export default function InboundPage() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const handleConfirm = React.useCallback(
    async (id: string) => {
      try {
        const response = await wmsApi.inboundOrders.confirm(id);
        if (response.success) {
          addNotification({
            type: 'success',
            title: i18n.t('pages.inbound_page.k5'),
            message: i18n.t('pages.inbound_page.k4'),
          });
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AD_HOC.WMS_INBOUND_ORDERS_BASE,
            exact: false,
            refetchType: 'active',
          });
        }
      } catch {
        addNotification({
          type: 'error',
          title: i18n.t('pages.inbound_page.k7'),
          message: i18n.t('pages.inbound_page.k6'),
        });
      }
    },
    [queryClient, addNotification]
  );

  const handleComplete = React.useCallback(
    async (id: string) => {
      try {
        const response = await wmsApi.inboundOrders.complete(id);
        if (response.success) {
          addNotification({
            type: 'success',
            title: i18n.t('pages.inbound_page.k9'),
            message: i18n.t('pages.inbound_page.k8'),
          });
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AD_HOC.WMS_INBOUND_ORDERS_BASE,
            exact: false,
            refetchType: 'active',
          });
        }
      } catch {
        addNotification({
          type: 'error',
          title: i18n.t('pages.inbound_page.k11'),
          message: i18n.t('pages.inbound_page.k10'),
        });
      }
    },
    [queryClient, addNotification]
  );

  const customRowActions: RowAction<InboundOrder>[] = useMemo(
    () => [
      {
        label: i18n.t('pages.inbound_page.k16'),
        icon: <Check size={16} />,
        onClick: (row) => handleConfirm(row.id as string),
        color: 'info',
        show: (row) => row.status === 'pending',
      },
      {
        label: i18n.t('pages.inbound_page.k17'),
        icon: <ClipboardCheck size={16} />,
        onClick: (row) => handleComplete(row.id as string),
        color: 'success',
        show: (row) => row.status === 'receiving' || row.status === 'quality_check',
      },
    ],
    [handleConfirm, handleComplete]
  );

  const columns = useMemo(
    () => getColumns<InboundOrder>((inboundOrderSchema as unknown) as EntitySchema<InboundOrder>),
    []
  );

  return (
    <ListPageTemplate<InboundOrder>
      title={i18n.t('pages.inbound_page.k18')}
      breadcrumbs={[{ label: 'WMS' }, { label: i18n.t('pages.inbound_page.k18') }]}
      columns={columns}
      data={[]}
      headerContent={<InboundStats />}
      crud={{
        api: inboundCrudApi,
        queryKey: 'wms-inbound-orders',
        entityName: i18n.t('pages.inbound_page.k18'),
        renderForm: ({ mode, record, onSubmit, onClose }) => {
          const fields = getFormFields<InboundOrder>(
            (inboundOrderSchema as unknown) as EntitySchema<InboundOrder>,
            mode === 'view' ? 'view' : mode
          );
          return (
            <FormBuilder
              fields={fields}
              mode={mode}
              initialValues={((record as unknown) as Record<string, unknown>) || {}}
              colCount={inboundOrderSchema.formColCount || 2}
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
                const ok = await onSubmit(values as Partial<InboundOrder>);
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
