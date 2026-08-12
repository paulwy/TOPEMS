import React, { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { Play, CheckCircle, XCircle } from 'lucide-react';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { productionOrderSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';
import type { ProductionOrder } from '@/api/mes/types';
import { useTranslation } from 'react-i18next';
import { designTokens } from '@/theme/tokens';


import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const ProductionOrderManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const handleStatusChange = useCallback(
    async (id: string, action: string) => {
      try {
        let response;
        switch (action) {
          case 'release':
            response = await mesApi.orders.release(id);
            break;
          case 'start':
            response = await mesApi.orders.start(id);
            break;
          case 'complete':
            response = await mesApi.orders.complete(id);
            break;
          case 'cancel':
            response = await mesApi.orders.cancel(id);
            break;
          default:
            throw new Error('无效操作');
        }
        if (response.success && response.data) {
          addNotification({
            type: 'success',
            title: t('mes.production_order_management_page.update_4'),
            message: `订单状态已更新为"${response.data.status}"`,
          });
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AD_HOC.MES_PRODUCTION_ORDERS_BASE,
          
  exact: false,
  refetchType: 'active',
});
        }
      } catch (error: unknown) {
        addNotification({
          type: 'error',
          title: t('mes.production_order_management_page.update_3'),
          message: t('mes.production_order_management_page.order_status'),
        });
      }
    },
    [addNotification, queryClient, t]
  );

  const productionOrderApiAdapter: CrudApiAdapter<ProductionOrder> = {
    list: async (params) => {
      const response = await mesApi.orders.list({
        page: params?.page !== undefined ? params.page - 1 : 0,
        pagesize: params?.pageSize ?? 10,
        search: params?.search as string | undefined,
        status: params?.status && params.status !== 'all' ? (params.status as string) : undefined,
      });
      if (!response.success || !response.data) {
        throw new Error('加载生产订单失败');
      }
      return {
        data: response.data.orders,
        total: response.data.total,
      };
    },

    create: async (data) => {
      const response = await mesApi.orders.create(
        data as Parameters<typeof mesApi.orders.create>[0]
      );
      if (!response.success) {
        throw new Error(response.message || '创建生产订单失败');
      }
      return response.data as unknown as ProductionOrder;
    },

    update: async (id, data) => {
      const response = await mesApi.orders.update(
        id,
        data as Parameters<typeof mesApi.orders.update>[1]
      );
      if (!response.success) {
        throw new Error(response.message || '更新生产订单失败');
      }
      return response.data as unknown as ProductionOrder;
    },

    delete: async (id) => {
      const response = await mesApi.orders.delete(id);
      if (!response.success) {
        throw new Error(response.message || '删除生产订单失败');
      }
    },
  };

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'release',
        label: t('mes.production_order_management_page.order_1'),
        icon: <Play size={14} />,
        color: 'success',
        onClick: (row: Record<string, unknown>) => handleStatusChange(String(row.id), 'release'),
        show: (row: Record<string, unknown>) => row.status === 'pending',
      },
      {
        key: 'start',
        label: t('mes.production_order_management_page.production_1'),
        icon: <Play size={14} />,
        color: 'success',
        onClick: (row: Record<string, unknown>) => handleStatusChange(String(row.id), 'start'),
        show: (row: Record<string, unknown>) =>
          row.status === 'released' || row.status === 'paused',
      },
      {
        key: 'complete',
        label: t('mes.production_order_management_page.completed_4'),
        icon: <CheckCircle size={14} />,
        color: 'success',
        onClick: (row: Record<string, unknown>) => handleStatusChange(String(row.id), 'complete'),
        show: (row: Record<string, unknown>) =>
          row.status === 'released' || row.status === 'in_progress',
      },
      {
        key: 'cancel',
        label: t('mes.production_order_management_page.action_cancel'),
        icon: <XCircle size={14} />,
        color: 'error',
        onClick: (row: Record<string, unknown>) => handleStatusChange(String(row.id), 'cancel'),
        show: (row: Record<string, unknown>) => row.status === 'pending' || row.status === 'paused',
      },
    ],
    [handleStatusChange, t]
  );

  return (
    <PageContainer
      title={t('mes.production_order_management_page.production_2')}
      subtitle={t('mes.production_order_management_page.order_number_1')}
      headerProps={{
        pageIcon: <Play style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={productionOrderSchema}
        apiAdapter={productionOrderApiAdapter}
        customRowActions={customRowActions}
        breadcrumbs={[
          {
            label: t('mes.production_order_management_page.breadcrumb_home', '首页'),
            href: '/dashboard',
          },
          {
            label: 'MES',
            href: '/mes',
          },
          {
            label: t('mes.production_order_management_page.production_2'),
          },
        ]}
        headerContent={(rows) => {
          const items = rows as unknown as ProductionOrder[];
          const stats = {
            total: items.length,
            pending: items.filter((o) => o.status === 'pending').length,
            released: items.filter((o) => o.status === 'released').length,
            in_progress: items.filter((o) => o.status === 'in_progress').length,
            completed: items.filter((o) => o.status === 'completed').length,
          };

          return (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  md: 'repeat(5, 1fr)',
                },
                gap: 2,
                mb: 3,
              }}
            >
              <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  待下达
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {stats.pending}
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 2,
                  bgcolor: ct.secondary[100],
                  borderRadius: 3,
                }}
              >
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  已下达
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'secondary.700' }}
                >
                  {stats.released}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  生产中
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {stats.in_progress}
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
                  {stats.completed}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  总数
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {stats.total}
                </Typography>
              </Box>
            </Box>
          );
        }}
        idField='id'
      />
    </PageContainer>
  );
};

export default ProductionOrderManagementPage;
