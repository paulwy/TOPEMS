import React, { useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { workOrderSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';
import { useNotificationStore } from '@/store';
import { Play, Pause, CheckCircle, XCircle } from 'lucide-react';

const apiAdapter = createCrudPageAdapter(mesApi.workOrders, {
  itemsField: 'work_orders',
});

export default function WorkOrderPage() {
  const { addNotification } = useNotificationStore();
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
            throw new Error(`未知操作: ${action}`);
        }
        if (response.success) {
          addNotification({
            type: 'success',
            title: '状态更新成功',
            message: `工单状态已更新为"${response.data?.status ?? ''}"`,
          });
          queryClient.invalidateQueries({ queryKey: ['mes_work_order'] });
        } else {
          addNotification({
            type: 'error',
            title: '操作失败',
            message: response.message || '未知错误',
          });
        }
      } catch (err) {
        addNotification({
          type: 'error',
          title: '操作失败',
          message: err instanceof Error ? err.message : '未知错误',
        });
      }
    },
    [addNotification, queryClient]
  );

  const customRowActions = [
    {
      label: '开工',
      icon: <Play size={16} />,
      color: 'success' as const,
      onClick: (row: Record<string, unknown>) => handleStatusChange(String(row.id), 'start'),
    },
    {
      label: '暂停',
      icon: <Pause size={16} />,
      color: 'warning' as const,
      onClick: (row: Record<string, unknown>) => handleStatusChange(String(row.id), 'pause'),
    },
    {
      label: '完工',
      icon: <CheckCircle size={16} />,
      color: 'success' as const,
      onClick: (row: Record<string, unknown>) => handleStatusChange(String(row.id), 'complete'),
    },
    {
      label: '取消',
      icon: <XCircle size={16} />,
      color: 'error' as const,
      onClick: (row: Record<string, unknown>) => handleStatusChange(String(row.id), 'cancel'),
    },
    {
      label: '恢复',
      icon: <Play size={16} />,
      color: 'success' as const,
      onClick: (row: Record<string, unknown>) => handleStatusChange(String(row.id), 'resume'),
    },
  ];

  return (
    <CrudPage
      schema={workOrderSchema}
      apiAdapter={apiAdapter as CrudApiAdapter}
      breadcrumbs={[{ label: 'MES' }, { label: '工单管理' }]}
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
                总工单数
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
                待开工
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
                进行中
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
                已完成
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
                总数量
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
