import { useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { workOrderSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';
import { useNotificationStore } from '@/store';
import { Play, Pause, CheckCircle, XCircle } from 'lucide-react';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter(mesApi.workOrders, {
  itemsField: 'work_orders',
});

export default function WorkOrderPage() {
  const { addNotification } = useNotificationStore();
  const { t } = useTranslation('mes');
  const queryClient = useQueryClient();

  const handleStatusChange = useCallback(
    async (id: string, action: string) => {
      try {
        let response;
        switch (action) {
          case 'start':
            response = await mesApi.workOrders.start(id);
            break;
          case 'complete':
            response = await mesApi.workOrders.complete(id);
            break;
          case 'cancel':
            response = await mesApi.workOrders.cancel(id);
            break;
          case 'pause':
            response = await mesApi.workOrders.pause(id);
            break;
          case 'resume':
            response = await mesApi.workOrders.resume(id);
            break;
          default:
            throw new Error(`${i18n.t('pages.work_order_page.k0')}${action}`);
        }
        if (response.success) {
          addNotification({
            type: 'success',
            title: t('mes.work_order_page.k0'),
            message: `${i18n.t('pages.work_order_page.k1')}${response.data?.status ?? ''}"`,
          });
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AD_HOC.MES_WORK_ORDER_BASE,
            exact: false,
            refetchType: 'active',
          });
        } else {
          addNotification({
            type: 'error',
            title: t('mes.work_order_page.k1'),
            message: response.message || t('mes.work_order_page.k2'),
          });
        }
      } catch (err) {
        addNotification({
          type: 'error',
          title: t('mes.work_order_page.k3'),
          message: err instanceof Error ? err.message : t('mes.work_order_page.k4'),
        });
      }
    },
    [addNotification, queryClient]
  );

  const customRowActions = [
    {
      label: t('mes.work_order_page.k5'),
      icon: <Play size={16} />,
      color: 'success' as const,
      onClick: (row: Record<string, unknown>) => handleStatusChange(String(row.id), 'start'),
    },
    {
      label: t('mes.work_order_page.k6'),
      icon: <Pause size={16} />,
      color: 'warning' as const,
      onClick: (row: Record<string, unknown>) => handleStatusChange(String(row.id), 'pause'),
    },
    {
      label: t('mes.work_order_page.k7'),
      icon: <CheckCircle size={16} />,
      color: 'success' as const,
      onClick: (row: Record<string, unknown>) => handleStatusChange(String(row.id), 'complete'),
    },
    {
      label: t('mes.work_order_page.k8'),
      icon: <XCircle size={16} />,
      color: 'error' as const,
      onClick: (row: Record<string, unknown>) => handleStatusChange(String(row.id), 'cancel'),
    },
    {
      label: t('mes.work_order_page.k9'),
      icon: <Play size={16} />,
      color: 'success' as const,
      onClick: (row: Record<string, unknown>) => handleStatusChange(String(row.id), 'resume'),
    },
  ];

  return (
    <CrudPage
      schema={workOrderSchema}
      apiAdapter={apiAdapter as CrudApiAdapter}
      breadcrumbs={[{ label: 'MES' }, { label: t('mes.work_order_page.k10') }]}
      customRowActions={customRowActions}
      headerContent={(rows) => {
        const total = rows.length;
        const pending = rows.filter((o) => o.status === 'pending').length;
        const inProgress = rows.filter((o) => o.status === 'in_progress').length;
        const completed = rows.filter((o) => o.status === 'completed').length;
        const totalQuantity = rows.reduce((sum, o) => sum + (Number(o.quantity) || 0), 0);

        return (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                {i18n.t('pages.work_order_page.k0')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {total}
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                {i18n.t('pages.work_order_page.k1')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {pending}
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                {i18n.t('pages.work_order_page.k2')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {inProgress}
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                {i18n.t('pages.work_order_page.k3')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {completed}
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'secondary.100', borderRadius: 3 }}>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                {i18n.t('pages.work_order_page.k4')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'secondary.700' }}
              >
                {totalQuantity}
              </Typography>
            </Box>
          </Box>
        );
      }}
    />
  );
}
