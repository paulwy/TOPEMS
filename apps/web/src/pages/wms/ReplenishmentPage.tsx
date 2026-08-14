import React, { useState, useMemo } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ShoppingCart, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { designTokens } from '@/theme/tokens';
import { wmsApi } from '@/api/wms';
import type {
  ReplenishmentSuggestion,
  ReplenishmentOrder,
  CreateReplenishmentOrderRequest,
} from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import { replenishmentSchema } from '@/schemas/wms/replenishment';
import { suggestionSchema } from '@/schemas/wms/suggestion';


import { QUERY_KEYS } from '@/lib/reactQuery';

const ct= designTokens.colors;

type TabValue = 'suggestions' | 'orders';

const ReplenishmentPage: React.FC = () => {
  const { t } = useTranslation();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabValue>('orders');

  const statisticsQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.WMS_REPLENISHMENT_STATISTICS_BASE,
    queryFn: async () => {
      const response = await wmsApi.smartReplenishment.getStatistics();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });
  const statistics = statisticsQuery.data;

  const confirmOrderMutation = useMutation({
    mutationFn: (id: string) => wmsApi.smartReplenishment.confirmOrder(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.replenishment_page.success_1'),
        message: t('wms.replenishment_page.confirmed_1'),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRUD_WMS_REPLENISHMENT_ORDER_BASE ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WMS_REPLENISHMENT_STATISTICS_BASE ,
  exact: false,
  refetchType: 'active',
});
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: t('wms.replenishment_page.fail_6'),
        message: t('wms.replenishment_page.fail_7'),
      });
    },
  });

  const completeOrderMutation = useMutation({
    mutationFn: (id: string) => wmsApi.smartReplenishment.completeOrder(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.replenishment_page.success_2'),
        message: t('wms.replenishment_page.completed'),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRUD_WMS_REPLENISHMENT_ORDER_BASE ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WMS_REPLENISHMENT_STATISTICS_BASE ,
  exact: false,
  refetchType: 'active',
});
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: t('wms.replenishment_page.fail_9'),
        message: t('wms.replenishment_page.fail_10'),
      });
    },
  });

  const orderRowActions: RowAction[] = useMemo(
    () => [
      {
        label: t('wms.replenishment_page.confirm_1'),
        icon: <CheckCircle size={14} />,
        show: (row) => row.status === 'pending',
        onClick: (row) => {
          confirmOrderMutation.mutateAsync(row.id as string);
        },
      },
      {
        label: t('wms.replenishment_page.completed_1'),
        icon: <CheckCircle size={14} />,
        show: (row) => row.status === 'confirmed' || row.status === 'in_progress',
        onClick: (row) => {
          completeOrderMutation.mutateAsync(row.id as string);
        },
      },
    ],
    [confirmOrderMutation, completeOrderMutation, t]
  );

  const orderApiAdapter: CrudApiAdapter<ReplenishmentOrder> = useMemo(
    () => ({
      list: async (params) => {
        const response = await wmsApi.smartReplenishment.listOrders({
          page: params?.page ? params.page + 1 : 1,
          pagesize: params?.pageSize || 10,
          search: params?.search,
          status: params?.status as string | undefined,
          warehouse_id: params?.warehouse_id as string | undefined,
        });
        if (!response.success) {
          throw new Error('Failed to fetch replenishment orders');
        }
        return {
          data: response.data.items,
          total: response.data.total,
        };
      },
      create: async (data) => {
        const response = await wmsApi.smartReplenishment.createOrder(
          data as unknown as CreateReplenishmentOrderRequest
        );
        if (!response.success) {
          throw new Error('Failed to create replenishment order');
        }
        addNotification({
          type: 'success',
          title: t('wms.replenishment_page.create'),
          message: t('wms.replenishment_page.create_1'),
        });
        return response.data;
      },
      update: async (id, data) => {
        const response = await wmsApi.smartReplenishment.updateOrder(
          id,
          data as unknown as Partial<ReplenishmentOrder>
        );
        if (!response.success) {
          throw new Error('Failed to update replenishment order');
        }
        addNotification({
          type: 'success',
          title: t('common.update', '更新成功'),
          message: '补货单已更新',
        });
        return response.data;
      },
      delete: async (id) => {
        const response = await wmsApi.smartReplenishment.deleteOrder(id);
        if (!response.success) {
          throw new Error('Failed to delete replenishment order');
        }
        addNotification({
          type: 'success',
          title: t('wms.replenishment_page.delete_success'),
          message: t('wms.replenishment_page.deleted'),
        });
      },
    }),
    [addNotification, t]
  );

  const generateSuggestionsMutation = useMutation({
    mutationFn: () => wmsApi.smartReplenishment.generateSuggestions(),
    onSuccess: (response) => {
      addNotification({
        type: 'success',
        title: t('wms.replenishment_page.success'),
        message: `已生成 ${response.data?.count || 0} 条补货建议`,
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRUD_WMS_REPLENISHMENT_SUGGESTION_BASE ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WMS_REPLENISHMENT_STATISTICS_BASE ,
  exact: false,
  refetchType: 'active',
});
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: t('wms.replenishment_page.fail_3'),
        message: t('wms.replenishment_page.fail_4'),
      });
    },
  });

  const createOrderFromSuggestionMutation = useMutation({
    mutationFn: (data: CreateReplenishmentOrderRequest) =>
      wmsApi.smartReplenishment.createOrder(data),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.replenishment_page.create'),
        message: t('wms.replenishment_page.create_1'),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRUD_WMS_REPLENISHMENT_SUGGESTION_BASE ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.CRUD_WMS_REPLENISHMENT_ORDER_BASE ,
  exact: false,
  refetchType: 'active',
});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.WMS_REPLENISHMENT_STATISTICS_BASE ,
  exact: false,
  refetchType: 'active',
});
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: t('wms.replenishment_page.create_3'),
        message: t('wms.replenishment_page.create_4'),
      });
    },
  });

  const suggestionRowActions: RowAction[] = useMemo(
    () => [
      {
        label: t('wms.replenishment_page.create_6'),
        icon: <ShoppingCart size={16} />,
        show: (row) => row.status === 'pending',
        onClick: async (row) => {
          const suggestion = row as unknown as ReplenishmentSuggestion;
          await createOrderFromSuggestionMutation.mutateAsync({
            warehouse_id: suggestion.warehouse_id,
            supplier_id: suggestion.supplier_id,
            supplier_name: suggestion.supplier_name,
            expected_date: '',
            priority: suggestion.priority,
            remarks: `根据建议 ${suggestion.suggestion_number} 创建`,
            items: [
              {
                sku: suggestion.sku,
                material_name: suggestion.material_name,
                specification: suggestion.specification,
                unit: suggestion.unit,
                quantity: suggestion.suggested_quantity,
                unit_price: suggestion.unit_price,
              },
            ],
          });
        },
      },
    ],
    [createOrderFromSuggestionMutation, t]
  );

  const suggestionApiAdapter: CrudApiAdapter<ReplenishmentSuggestion> = useMemo(
    () => ({
      list: async (params) => {
        const response = await wmsApi.smartReplenishment.listSuggestions({
          page: params?.page ? params.page + 1 : 1,
          pagesize: params?.pageSize || 10,
          search: params?.search,
          status:
            (params?.status as string | undefined) === 'all'
              ? undefined
              : (params?.status as string | undefined),
          warehouse_id:
            (params?.warehouse_id as string | undefined) === 'all'
              ? undefined
              : (params?.warehouse_id as string | undefined),
          priority:
            (params?.priority as string | undefined) === 'all'
              ? undefined
              : (params?.priority as string | undefined),
        });
        if (!response.success) {
          throw new Error('Failed to fetch replenishment suggestions');
        }
        return {
          data: response.data.items,
          total: response.data.total,
        };
      },
      create: async () => {
        throw new Error('补货建议不支持直接创建，请通过生成功能创建');
      },
      update: async () => {
        throw new Error('补货建议不支持修改');
      },
      delete: async () => {
        throw new Error('补货建议不支持删除');
      },
    }),
    []
  );

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          建议总数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {statistics?.total_suggestions || 0}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center', mb: 0.5 }}
        >
          <AlertTriangle
            size={14}
            color='warning.700'
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            待处理建议
          </Typography>
        </Stack>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'warning.dark' }}
        >
          {statistics?.pending_suggestions || 0}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          补货单总数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'info.dark' }}
        >
          {statistics?.total_orders || 0}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已完成
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'success.dark' }}
        >
          {statistics?.completed_orders || 0}
        </Typography>
      </Box>
    </Box>
  );

  const suggestionHeaderContent = (
    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
      <Button
        variant='outlined'
        startIcon={<RefreshCw size={16} />}
        onClick={() => generateSuggestionsMutation.mutateAsync()}
        disabled={generateSuggestionsMutation.isPending}
      >
        生成补货建议
      </Button>
    </Box>
  );

  return (
    <PageContainer
      title={t('wms.replenishment_page.breadcrumb_current')}
      subtitle={t('wms.replenishment_page.text_7bf91a')}
      headerProps={{
        pageIcon: <ShoppingCart style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main}, ${ct.warning.dark})`,
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Stack
          direction='row'
          spacing={4}
        >
          <Button
            variant={activeTab === 'suggestions' ? 'contained' : 'text'}
            onClick={() => setActiveTab('suggestions')}
            startIcon={<AlertTriangle size={16} />}
          >
            补货建议
          </Button>
          <Button
            variant={activeTab === 'orders' ? 'contained' : 'text'}
            onClick={() => setActiveTab('orders')}
            startIcon={<ShoppingCart size={16} />}
          >
            补货单
          </Button>
        </Stack>
      </Box>

      {statsContent}

      {activeTab === 'suggestions' ? (
        <CrudPage
          schema={suggestionSchema}
          apiAdapter={suggestionApiAdapter}
          customRowActions={suggestionRowActions}
          headerContent={suggestionHeaderContent}
          breadcrumbs={[
            { label: t('wms.replenishment_page.breadcrumb_home'), href: '/dashboard' },
            { label: t('wms.replenishment_page.breadcrumb_module'), href: WMS_PATHS.root },
            {
              label: t('wms.replenishment_page.breadcrumb_current'),
              href: WMS_PATHS.replenishment,
            },
            { label: '补货建议' },
          ]}
          idField='id'
        />
      ) : (
        <CrudPage
          schema={replenishmentSchema}
          apiAdapter={orderApiAdapter}
          customRowActions={orderRowActions}
          breadcrumbs={[
            { label: t('wms.replenishment_page.breadcrumb_home'), href: '/dashboard' },
            { label: t('wms.replenishment_page.breadcrumb_module'), href: WMS_PATHS.root },
            {
              label: t('wms.replenishment_page.breadcrumb_current'),
              href: WMS_PATHS.replenishment,
            },
            { label: '补货单' },
          ]}
          idField='id'
        />
      )}
    </PageContainer>
  );
};

export default ReplenishmentPage;
