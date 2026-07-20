import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  Tooltip,
  Stack,
  Typography,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import React, { useState, useMemo, useCallback } from 'react';
import type {
  ProductionOrder,
  CreateProductionOrderRequest,
  UpdateProductionOrderRequest,
  ListParams,
} from '@/api/mes';
import { mesApi } from '@/api/mes';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import {
  ClipboardList,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { designTokens } from '@/theme/tokens';
import { useUrlListState } from '@/hooks';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const ProductionOrderManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    filters: urlFilters,
    setFilter,
    currentPage,
    setCurrentPage,
    pageSize,
  } = useUrlListState<{ status: string }>({
    defaultPageSize: 10,
    defaultFilters: { status: 'all' },
    baseIndex: 1,
    historyMode: 'replace',
  });
  const searchTerm = searchQuery;
  const statusFilter = urlFilters.status;
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateProductionOrderRequest>({
    order_number: '',
    product_name: '',
    quantity: 0,
    scheduled_start_date: '',
    scheduled_end_date: '',
  });

  // React Query - 订单列表
  const ordersQuery = useQuery({
    queryKey: ['mes-production-orders', currentPage, pageSize, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params: ListParams = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'all') params.status = statusFilter;
      return mesApi.orders.list(params);
    },
    staleTime: 5 * 60 * 1000,
  });

  const orders =
    ordersQuery.data?.success && ordersQuery.data.data ? ordersQuery.data.data.orders || [] : [];
  const total =
    ordersQuery.data?.success && ordersQuery.data.data ? ordersQuery.data.data.total || 0 : 0;
  const loading = ordersQuery.isLoading;

  // React Query - Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateProductionOrderRequest) => mesApi.orders.create(data),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('mes.production_order_management_page.create'),
        message: t('mes.production_order_management_page.create_1'),
      });
      queryClient.invalidateQueries({ queryKey: ['mes-production-orders'] });
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: t('mes.production_order_management_page.operation_failed'),
        message: t('mes.production_order_management_page.create_2'),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductionOrderRequest }) =>
      mesApi.orders.update(id, data),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('mes.production_order_management_page.update'),
        message: t('mes.production_order_management_page.update_1'),
      });
      queryClient.invalidateQueries({ queryKey: ['mes-production-orders'] });
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: t('mes.production_order_management_page.operation_failed'),
        message: t('mes.production_order_management_page.update_2'),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mesApi.orders.delete(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('mes.production_order_management_page.delete_success'),
        message: t('mes.production_order_management_page.deleted'),
      });
      queryClient.invalidateQueries({ queryKey: ['mes-production-orders'] });
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: t('mes.production_order_management_page.delete'),
        message: t('mes.production_order_management_page.delete_1'),
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      switch (action) {
        case 'release':
          return mesApi.orders.release(id);
        case 'start':
          return mesApi.orders.start(id);
        case 'complete':
          return mesApi.orders.complete(id);
        case 'cancel':
          return mesApi.orders.cancel(id);
        default:
          throw new Error('Invalid action');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-production-orders'] });
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: t('mes.production_order_management_page.update_3'),
        message: t('mes.production_order_management_page.order_status'),
      });
    },
  });

  const handleStatusChange = async (id: string, action: string) => {
    try {
      const response = await statusMutation.mutateAsync({ id, action });
      if (response.success && response.data) {
        addNotification({
          type: 'success',
          title: t('mes.production_order_management_page.update_4'),
          message: `订单状态已更新为"${getStatusText(response.data.status)}"`,
        });
      }
    } catch (error: unknown) {
      apiLogger.error(t('mes.production_order_management_page.update_5'), error);
    }
  };

  const handleBatchRelease = useCallback(
    async (orders: ProductionOrder[]) => {
      const pendingOrders = orders.filter((o) => o.status === 'pending');
      if (pendingOrders.length === 0) {
        addNotification({
          type: 'warning',
          title: t('mes.production_order_management_page.order'),
          message: t('mes.production_order_management_page.please_select'),
        });
        return;
      }

      try {
        queryClient.setQueryData<ProductionOrder[]>(['mes-production-orders'], (existing) => {
          if (!existing) return existing;
          return existing.map((order) =>
            pendingOrders.some((o) => o.id === order.id)
              ? { ...order, status: 'released' as const }
              : order
          );
        });

        const results = await Promise.allSettled(
          pendingOrders.map((order) => mesApi.orders.release(order.id))
        );

        const successCount = results.filter(
          (r) => r.status === 'fulfilled' && r.value.success
        ).length;
        const failureCount = results.length - successCount;

        if (failureCount > 0) {
          queryClient.setQueryData<ProductionOrder[]>(['mes-production-orders'], (existing) => {
            if (!existing) return existing;
            const failedIds = pendingOrders
              .filter((_, index) => {
                const result = results[index];
                return result.status !== 'fulfilled' || !result.value.success;
              })
              .map((o) => o.id);
            return existing.map((order) =>
              failedIds.includes(order.id) ? { ...order, status: 'pending' as const } : order
            );
          });
        }

        if (successCount > 0) {
          addNotification({
            type: 'success',
            title: t('mes.production_order_management_page.completed'),
            message: `成功下达 ${successCount} 个订单${failureCount > 0 ? `，失败 ${failureCount} 个` : ''}`,
          });
        }
        if (failureCount > 0) {
          addNotification({
            type: 'error',
            title: t('mes.production_order_management_page.fail'),
            message: `有 ${failureCount} 个订单下达失败`,
          });
        }
        queryClient.invalidateQueries({ queryKey: ['mes-production-orders'] });
      } catch (error: unknown) {
        apiLogger.error(t('mes.production_order_management_page.fail_2'), error);
        queryClient.setQueryData<ProductionOrder[]>(['mes-production-orders'], (existing) => {
          if (!existing) return existing;
          return existing.map((order) =>
            pendingOrders.some((o) => o.id === order.id)
              ? { ...order, status: 'pending' as const }
              : order
          );
        });
        addNotification({
          type: 'error',
          title: t('mes.production_order_management_page.fail_3'),
          message: t('mes.production_order_management_page.error'),
        });
      }
    },
    [addNotification, queryClient]
  );

  const handleBatchComplete = useCallback(
    async (orders: ProductionOrder[]) => {
      const inProgressOrders = orders.filter((o) => o.status === 'in_progress');
      if (inProgressOrders.length === 0) {
        addNotification({
          type: 'warning',
          title: t('mes.production_order_management_page.completed_1'),
          message: t('mes.production_order_management_page.in_production'),
        });
        return;
      }

      try {
        queryClient.setQueryData<ProductionOrder[]>(['mes-production-orders'], (existing) => {
          if (!existing) return existing;
          return existing.map((order) =>
            inProgressOrders.some((o) => o.id === order.id)
              ? { ...order, status: 'completed' as const }
              : order
          );
        });

        const results = await Promise.allSettled(
          inProgressOrders.map((order) => mesApi.orders.complete(order.id))
        );

        const successCount = results.filter(
          (r) => r.status === 'fulfilled' && r.value.success
        ).length;
        const failureCount = results.length - successCount;

        if (failureCount > 0) {
          queryClient.setQueryData<ProductionOrder[]>(['mes-production-orders'], (existing) => {
            if (!existing) return existing;
            const failedIds = inProgressOrders
              .filter((_, index) => {
                const result = results[index];
                return result.status !== 'fulfilled' || !result.value.success;
              })
              .map((o) => o.id);
            return existing.map((order) =>
              failedIds.includes(order.id) ? { ...order, status: 'in_progress' as const } : order
            );
          });
        }

        if (successCount > 0) {
          addNotification({
            type: 'success',
            title: t('mes.production_order_management_page.completed_2'),
            message: `成功完成 ${successCount} 个订单${failureCount > 0 ? `，失败 ${failureCount} 个` : ''}`,
          });
        }
        if (failureCount > 0) {
          addNotification({
            type: 'error',
            title: t('mes.production_order_management_page.fail_4'),
            message: `有 ${failureCount} 个订单完成失败`,
          });
        }
        queryClient.invalidateQueries({ queryKey: ['mes-production-orders'] });
      } catch (error: unknown) {
        apiLogger.error(t('mes.production_order_management_page.fail_6'), error);
        queryClient.setQueryData<ProductionOrder[]>(['mes-production-orders'], (existing) => {
          if (!existing) return existing;
          return existing.map((order) =>
            inProgressOrders.some((o) => o.id === order.id)
              ? { ...order, status: 'in_progress' as const }
              : order
          );
        });
        addNotification({
          type: 'error',
          title: t('mes.production_order_management_page.fail_7'),
          message: t('mes.production_order_management_page.fail_8'),
        });
      }
    },
    [addNotification, queryClient]
  );

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: t('mes.production_order_management_page.text_e0468e'),
      released: t('mes.production_order_management_page.status_released'),
      in_progress: t('mes.production_order_management_page.status_in_progress'),
      completed: t('mes.production_order_management_page.completed_3'),
      cancelled: t('mes.production_order_management_page.status_cancelled'),
      paused: t('mes.production_order_management_page.status_paused'),
    };
    return statusMap[status] || status;
  };

  const getStatusActions = (status: string) => {
    switch (status) {
      case 'pending':
        return [
          {
            action: 'release',
            label: t('mes.production_order_management_page.order_1'),
            icon: <Play size={14} />,
            color: 'success' as const,
          },
          {
            action: 'cancel',
            label: t('mes.production_order_management_page.action_cancel'),
            icon: <XCircle size={14} />,
            color: 'error' as const,
          },
        ];
      case 'released':
      case 'in_progress':
        return [
          {
            action: 'start',
            label: t('mes.production_order_management_page.production'),
            icon: <Play size={14} />,
            color: 'success' as const,
          },
          {
            action: 'complete',
            label: t('mes.production_order_management_page.completed_4'),
            icon: <CheckCircle size={14} />,
            color: 'success' as const,
          },
        ];
      case 'paused':
        return [
          {
            action: 'start',
            label: t('mes.production_order_management_page.production_1'),
            icon: <Play size={14} />,
            color: 'success' as const,
          },
          {
            action: 'cancel',
            label: t('mes.production_order_management_page.action_cancel'),
            icon: <XCircle size={14} />,
            color: 'error' as const,
          },
        ];
      default:
        return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedOrder) {
        await updateMutation.mutateAsync({
          id: selectedOrder.id,
          data: formData as UpdateProductionOrderRequest,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setShowDialog(false);
      resetForm();
    } catch (error: unknown) {
      apiLogger.error(t('mes.production_order_management_page.operation_failed_1'), error);
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm(t('mes.production_order_management_page.confirm'))) return;
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error: unknown) {
        apiLogger.error(t('mes.production_order_management_page.delete_2'), error);
      }
    },
    [deleteMutation]
  );

  const handleEdit = useCallback((order: ProductionOrder) => {
    setSelectedOrder(order);
    setFormData({
      order_number: order.order_number,
      product_name: order.product_name,
      quantity: order.quantity,
      scheduled_start_date: order.scheduled_start_date,
      scheduled_end_date: order.scheduled_end_date,
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback((order: ProductionOrder) => {
    setSelectedOrder(order);
    setShowDetailDialog(true);
  }, []);

  const resetForm = () => {
    setSelectedOrder(null);
    setFormData({
      order_number: '',
      product_name: '',
      quantity: 0,
      scheduled_start_date: '',
      scheduled_end_date: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        bg: string;
        color: string;
      }
    > = {
      pending: { label: t('mes.production_order_management_page.text_e0468e'), bg: 'warning.light', color: 'warning.700' },
      released: { label: t('mes.production_order_management_page.status_released'), bg: ct.secondary[100], color: 'secondary.700' },
      in_progress: { label: t('mes.production_order_management_page.status_in_progress'), bg: 'primary.100', color: 'primary.dark' },
      completed: { label: t('mes.production_order_management_page.completed_3'), bg: 'success.lighter', color: 'success.700' },
      cancelled: { label: t('mes.production_order_management_page.status_cancelled'), bg: 'error.lighter', color: 'error.dark' },
      paused: { label: t('mes.production_order_management_page.status_paused'), bg: 'grey.100', color: 'text.secondary' },
    };
    const s = statusMap[status] || { label: status, bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        size='small'
        label={s.label}
        sx={{ backgroundColor: s.bg, color: s.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<ProductionOrder>[] = useMemo(
    () => [
      { id: 'order_number', label: t('mes.production_order_management_page.order_number'), sortable: true },
      { id: 'product_name', label: t('mes.production_order_management_page.column_product_name'), sortable: true },
      { id: 'quantity', label: t('mes.production_order_management_page.quantity'), sortable: true },
      {
        id: 'scheduled_start_date',
        label: t('mes.production_order_management_page.start_time'),
        render: (row) =>
          row.scheduled_start_date
            ? new Date(row.scheduled_start_date).toLocaleDateString('zh-CN')
            : '-',
      },
      {
        id: 'scheduled_end_date',
        label: t('mes.production_order_management_page.end_time'),
        render: (row) =>
          row.scheduled_end_date
            ? new Date(row.scheduled_end_date).toLocaleDateString('zh-CN')
            : '-',
      },
      {
        id: 'status',
        label: t('mes.production_order_management_page.filter_status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('mes.production_order_management_page.filter_status'),
        type: 'select',
        options: [
          { label: t('mes.production_order_management_page.filter_option_all_status'), value: 'all' },
          { label: t('mes.production_order_management_page.text_e0468e'), value: 'pending' },
          { label: t('mes.production_order_management_page.status_released'), value: 'released' },
          { label: t('mes.production_order_management_page.status_in_progress'), value: 'in_progress' },
          { label: t('mes.production_order_management_page.completed_3'), value: 'completed' },
          { label: t('mes.production_order_management_page.status_cancelled'), value: 'cancelled' },
          { label: t('mes.production_order_management_page.status_paused'), value: 'paused' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setFilter('status', value as string);
        },
      },
    ],
    [statusFilter, setFilter]
  );

  const rowActions: RowAction<ProductionOrder>[] = useMemo(
    () => [
      {
        label: t('mes.production_order_management_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: t('mes.production_order_management_page.action_edit'),
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: t('mes.production_order_management_page.action_delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: t('mes.production_order_management_page.confirm'),
      },
    ],
    [handleViewDetail, handleEdit, handleDelete]
  );

  // 状态流转操作按钮
  const renderStatusActions = (order: ProductionOrder) => {
    const actions = getStatusActions(order.status);
    if (actions.length === 0) return null;

    return (
      <Stack
        direction='row'
        spacing={0.5}
        sx={{ justifyContent: 'flex-end' }}
      >
        {actions.map((action) => (
          <Tooltip
            key={action.action}
            title={action.label}
          >
            <IconButton
              size='small'
              color={action.color}
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(order.id, action.action);
              }}
            >
              {action.icon}
            </IconButton>
          </Tooltip>
        ))}
      </Stack>
    );
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  // 状态统计
  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      released: orders.filter((o) => o.status === 'released').length,
      in_progress: orders.filter((o) => o.status === 'in_progress').length,
      completed: orders.filter((o) => o.status === 'completed').length,
    };
  }, [orders]);

  if (loading) return <LoadingSpinner />;

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
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
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
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

  return (
    <PageContainer
      title={t('mes.production_order_management_page.production_2')}
      subtitle={t('mes.production_order_management_page.order_number_1')}
      headerProps={{
        pageIcon: <ClipboardList style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={orders}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={t('mes.production_order_management_page.product_name')}
        searchValue={searchTerm}
        onSearch={handleSearch}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
        actions={[
          {
            label: t('mes.production_order_management_page.add'),
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        batchActions={[
          {
            label: t('mes.production_order_management_page.text_7526f4'),
            icon: <Play size={16} />,
            onClick: handleBatchRelease,
            color: 'success',
          },
          {
            label: t('mes.production_order_management_page.completed_5'),
            icon: <CheckCircle size={16} />,
            onClick: handleBatchComplete,
            color: 'primary',
          },
        ]}
        headerContent={statsContent}
        emptyMessage={t('mes.production_order_management_page.empty_message')}
        getRowId={(row) => row.id}
        mobileCardTitleKey='product_name'
        mobileCardSubtitleKey='order_number'
        mobileCardDisplayFields={['status', 'quantity', 'completed_quantity', 'planned_start_date']}
        mobileCardFieldLabels={{
          status: t('mes.production_order_management_page.filter_status'),
          quantity: t('mes.production_order_management_page.column_planned_quantity'),
          completed_quantity: t('mes.production_order_management_page.completed_quantity'),
          planned_start_date: t('mes.production_order_management_page.field_planned_start'),
        }}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedOrder ? t('mes.production_order_management_page.dialog_edit_title') : t('mes.production_order_management_page.dialog_create_title')}</DialogTitle>
        <DialogContent>
          <Box
            component='span'
            sx={{
              display: 'block',
              color: 'text.secondary',
              mb: 2,
              fontSize: 14,
            }}
          >
            {selectedOrder ? t('mes.production_order_management_page.info') : t('mes.production_order_management_page.info_1')}
          </Box>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='order_number'>订单号 *</InputLabel>
                <TextField
                  id='order_number'
                  required
                  size='small'
                  value={formData.order_number}
                  onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='product_name'>产品名称 *</InputLabel>
                <TextField
                  id='product_name'
                  required
                  size='small'
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='quantity'>数量 *</InputLabel>
                <TextField
                  id='quantity'
                  type='number'
                  required
                  size='small'
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseFloat(e.target.value),
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='scheduled_start_date'>计划开始时间 *</InputLabel>
                <TextField
                  id='scheduled_start_date'
                  type='datetime-local'
                  required
                  size='small'
                  value={formData.scheduled_start_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scheduled_start_date: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='scheduled_end_date'>计划结束时间 *</InputLabel>
                <TextField
                  id='scheduled_end_date'
                  type='datetime-local'
                  required
                  size='small'
                  value={formData.scheduled_end_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scheduled_end_date: e.target.value,
                    })
                  }
                />
              </Box>
            </Box>
            <DialogActions>
              <Button
                type='button'
                variant='outlined'
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button
                type='submit'
                variant='contained'
              >
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>生产订单详情</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>订单号</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedOrder.order_number}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>产品名称</InputLabel>
                  <Box component='span'>{selectedOrder.product_name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>数量</InputLabel>
                  <Box component='span'>{selectedOrder.quantity}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedOrder.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    计划开始时间
                  </InputLabel>
                  <Box component='span'>
                    {selectedOrder.scheduled_start_date
                      ? new Date(selectedOrder.scheduled_start_date).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    计划结束时间
                  </InputLabel>
                  <Box component='span'>
                    {selectedOrder.scheduled_end_date
                      ? new Date(selectedOrder.scheduled_end_date).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedOrder.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>更新时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedOrder.updated_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default ProductionOrderManagementPage;

// Phase 7-2: React Query migration tagged
