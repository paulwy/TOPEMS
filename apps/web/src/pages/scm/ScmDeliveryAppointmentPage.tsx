import React from 'react';
import { Box, Stack, Paper } from '@mui/material';
import { Check, XCircle, CalendarCheck, PackageCheck, Ban } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CrudPage from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { scmApi } from '@/api/scm';
import type { SupplierDeliveryAppointment, DeliveryAppointmentStats } from '@/api/scm';
import { deliveryAppointmentSchema } from '@/schemas/scm';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { apiLogger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter(scmApi.deliveryAppointments);

const ENTITY_QUERY_KEY = ['deliveryAppointment'];

const StatsCards: React.FC = () => {
  const { t } = useTranslation('scm');
  const { data: stats } = useQuery<DeliveryAppointmentStats | null>({
    queryKey: [...QUERY_KEYS.SCM.DELIVERY_APPOINTMENTS, 'stats'],
    queryFn: async () => {
      const response = await scmApi.deliveryAppointments.stats();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!stats) return null;

  const cards = [
    { label: t('scm.scm_delivery_appointment_page.k0'), value: stats.total, color: 'primary.main' },
    {
      label: t('scm.scm_delivery_appointment_page.k1'),
      value: stats.upcoming,
      color: 'success.main',
    },
    { label: t('scm.scm_delivery_appointment_page.k2'), value: stats.overdue, color: 'error.main' },
  ];

  return (
    <Stack
      direction='row'
      spacing={2}
      sx={{ mb: 2 }}
    >
      {cards.map((c) => (
        <Paper
          key={c.label}
          elevation={0}
          sx={{
            p: 2,
            flex: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 0.5 }}>{c.label}</Box>
          <Box sx={{ fontSize: 28, fontWeight: 600, color: c.color }}>{c.value}</Box>
        </Paper>
      ))}
    </Stack>
  );
};

const ScmDeliveryAppointmentPage: React.FC = () => {
  const { t } = useTranslation('scm');
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const runStatusAction = React.useCallback(
    async (
      action: string,
      appointment: SupplierDeliveryAppointment,
      fn: (id: string) => Promise<unknown>,
      successMessage: string
    ) => {
      try {
        await fn(appointment.id);
        queryClient.invalidateQueries({
          queryKey: ENTITY_QUERY_KEY,
          exact: false,
          refetchType: 'active',
        });
        queryClient.invalidateQueries({
          queryKey: [...QUERY_KEYS.SCM.DELIVERY_APPOINTMENTS, 'stats'],

          exact: false,
          refetchType: 'active',
        });
        addNotification({
          type: 'success',
          title: t('scm.scm_delivery_appointment_page.k3'),
          message: successMessage,
        });
      } catch (err) {
        apiLogger.error(t('scm.scm_delivery_appointment_page.e1'), err);
        addNotification({
          type: 'error',
          title: t('scm.scm_delivery_appointment_page.e2'),
          message:
            err instanceof Error ? err.message : i18n.t('scm.scm_delivery_appointment_page.e2'),
        });
      }
    },
    [queryClient, addNotification]
  );

  const customRowActions = React.useMemo<RowAction[]>(
    () => [
      {
        label: t('scm.scm_delivery_appointment_page.k4'),
        icon: <Check size={14} />,
        color: 'success',
        show: (row) => row.status === 'pending',
        onClick: (row) => {
          const apt = row as unknown as SupplierDeliveryAppointment;
          if (
            window.confirm(
              i18n.t('scm.scm_delivery_appointment_page.e4', { v1: apt.appointment_no })
            )
          ) {
            void runStatusAction(
              t('scm.scm_delivery_appointment_page.k5'),
              apt,
              (id) =>
                scmApi.deliveryAppointments.approve(id, {
                  remarks: t('scm.scm_delivery_appointment_page.k6'),
                }),
              t('scm.scm_delivery_appointment_page.k7')
            );
          }
        },
      },
      {
        label: t('scm.scm_delivery_appointment_page.k8'),
        icon: <XCircle size={14} />,
        color: 'error',
        show: (row) => row.status === 'pending',
        onClick: (row) => {
          const apt = row as unknown as SupplierDeliveryAppointment;
          if (
            window.confirm(
              i18n.t('scm.scm_delivery_appointment_page.e5', { v1: apt.appointment_no })
            )
          ) {
            void runStatusAction(
              t('scm.scm_delivery_appointment_page.k9'),
              apt,
              (id) =>
                scmApi.deliveryAppointments.reject(id, {
                  remarks: t('scm.scm_delivery_appointment_page.k10'),
                }),
              t('scm.scm_delivery_appointment_page.k11')
            );
          }
        },
      },
      {
        label: t('scm.scm_delivery_appointment_page.k12'),
        icon: <CalendarCheck size={14} />,
        color: 'primary',
        show: (row) => row.status === 'approved',
        onClick: (row) => {
          const apt = row as unknown as SupplierDeliveryAppointment;
          if (
            window.confirm(
              i18n.t('scm.scm_delivery_appointment_page.e6', { v1: apt.appointment_no })
            )
          ) {
            void runStatusAction(
              t('scm.scm_delivery_appointment_page.k13'),
              apt,
              (id) =>
                scmApi.deliveryAppointments.confirmArrival(id, {
                  remarks: t('scm.scm_delivery_appointment_page.k14'),
                }),
              t('scm.scm_delivery_appointment_page.k15')
            );
          }
        },
      },
      {
        label: t('scm.scm_delivery_appointment_page.k16'),
        icon: <PackageCheck size={14} />,
        color: 'success',
        show: (row) => row.status === 'arrived',
        onClick: (row) => {
          const apt = row as unknown as SupplierDeliveryAppointment;
          if (
            window.confirm(
              i18n.t('scm.scm_delivery_appointment_page.e7', { v1: apt.appointment_no })
            )
          ) {
            void runStatusAction(
              t('scm.scm_delivery_appointment_page.k17'),
              apt,
              (id) =>
                scmApi.deliveryAppointments.complete(id, {
                  remarks: t('scm.scm_delivery_appointment_page.k18'),
                }),
              t('scm.scm_delivery_appointment_page.k19')
            );
          }
        },
      },
      {
        label: t('scm.scm_delivery_appointment_page.k20'),
        icon: <Ban size={14} />,
        color: 'warning',
        show: (row) => row.status === 'pending' || row.status === 'approved',
        onClick: (row) => {
          const apt = row as unknown as SupplierDeliveryAppointment;
          if (
            window.confirm(
              i18n.t('scm.scm_delivery_appointment_page.e8', { v1: apt.appointment_no })
            )
          ) {
            void runStatusAction(
              t('scm.scm_delivery_appointment_page.k21'),
              apt,
              (id) =>
                scmApi.deliveryAppointments.cancel(id, {
                  reason: t('scm.scm_delivery_appointment_page.k22'),
                }),
              t('scm.scm_delivery_appointment_page.k23')
            );
          }
        },
      },
    ],
    [runStatusAction]
  );

  return (
    <CrudPage
      schema={deliveryAppointmentSchema}
      apiAdapter={apiAdapter}
      customRowActions={customRowActions}
      headerContent={<StatsCards />}
      breadcrumbs={[{ label: 'SCM' }, { label: t('scm.scm_delivery_appointment_page.k24') }]}
    />
  );
};

export default ScmDeliveryAppointmentPage;
