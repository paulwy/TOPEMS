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

const apiAdapter = createCrudPageAdapter(scmApi.deliveryAppointments);

const ENTITY_QUERY_KEY = ['deliveryAppointment'];

const StatsCards: React.FC = () => {
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
    { label: '预约总数', value: stats.total, color: 'primary.main' },
    { label: '即将到期', value: stats.upcoming, color: 'success.main' },
    { label: '已逾期', value: stats.overdue, color: 'error.main' },
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
        queryClient.invalidateQueries({ queryKey: ENTITY_QUERY_KEY });
        queryClient.invalidateQueries({
          queryKey: [...QUERY_KEYS.SCM.DELIVERY_APPOINTMENTS, 'stats'],
        });
        addNotification({ type: 'success', title: '操作成功', message: successMessage });
      } catch (err) {
        apiLogger.error(`${action}失败:`, err);
        addNotification({
          type: 'error',
          title: `${action}失败`,
          message: err instanceof Error ? err.message : `${action}失败`,
        });
      }
    },
    [queryClient, addNotification]
  );

  const customRowActions = React.useMemo<RowAction[]>(
    () => [
      {
        label: '审批通过',
        icon: <Check size={14} />,
        color: 'success',
        show: (row) => row.status === 'pending',
        onClick: (row) => {
          const apt = row as unknown as SupplierDeliveryAppointment;
          if (window.confirm(`确定要审批通过预约 "${apt.appointment_no}" 吗？`)) {
            void runStatusAction(
              '审批',
              apt,
              (id) => scmApi.deliveryAppointments.approve(id, { remarks: '审批通过' }),
              '预约已审批通过'
            );
          }
        },
      },
      {
        label: '驳回',
        icon: <XCircle size={14} />,
        color: 'error',
        show: (row) => row.status === 'pending',
        onClick: (row) => {
          const apt = row as unknown as SupplierDeliveryAppointment;
          if (window.confirm(`确定要驳回预约 "${apt.appointment_no}" 吗？`)) {
            void runStatusAction(
              '驳回',
              apt,
              (id) => scmApi.deliveryAppointments.reject(id, { remarks: '不符合送货要求' }),
              '预约已驳回'
            );
          }
        },
      },
      {
        label: '到货确认',
        icon: <CalendarCheck size={14} />,
        color: 'primary',
        show: (row) => row.status === 'approved',
        onClick: (row) => {
          const apt = row as unknown as SupplierDeliveryAppointment;
          if (window.confirm(`确定要确认预约 "${apt.appointment_no}" 已到货吗？`)) {
            void runStatusAction(
              '到货确认',
              apt,
              (id) => scmApi.deliveryAppointments.confirmArrival(id, { remarks: '已到货' }),
              '已确认到货'
            );
          }
        },
      },
      {
        label: '完成',
        icon: <PackageCheck size={14} />,
        color: 'success',
        show: (row) => row.status === 'arrived',
        onClick: (row) => {
          const apt = row as unknown as SupplierDeliveryAppointment;
          if (window.confirm(`确定要将预约 "${apt.appointment_no}" 标记为已完成吗？`)) {
            void runStatusAction(
              '完成',
              apt,
              (id) => scmApi.deliveryAppointments.complete(id, { remarks: '入库完成' }),
              '预约已完成'
            );
          }
        },
      },
      {
        label: '取消',
        icon: <Ban size={14} />,
        color: 'warning',
        show: (row) => row.status === 'pending' || row.status === 'approved',
        onClick: (row) => {
          const apt = row as unknown as SupplierDeliveryAppointment;
          if (window.confirm(`确定要取消预约 "${apt.appointment_no}" 吗？`)) {
            void runStatusAction(
              '取消',
              apt,
              (id) => scmApi.deliveryAppointments.cancel(id, { reason: '业务调整' }),
              '预约已取消'
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
      breadcrumbs={[{ label: 'SCM' }, { label: '供应商送货预约' }]}
    />
  );
};

export default ScmDeliveryAppointmentPage;
