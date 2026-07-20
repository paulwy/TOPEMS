import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Stack,
  Button,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import type {
  OutboundOrder,
  OutboundOrderItem,
  CreateOutboundOrderRequest,
  Warehouse,
  WavePick,
  WavePickItem,
} from '@/api/wms';
import { wmsApi } from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import { useNotificationStore } from '@/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Upload,
  Check,
  Package,
  Truck,
  ClipboardList,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ConfirmDialog, PageContainer, StatusBadge } from '@/components/common';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;




const OutboundPage: React.FC = () => {
  const { t } = useTranslation();
  const statusConfig: Record<
    string,
    { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }
  > = {
    pending: { label: t('wms.outbound_page.stat_pending'), color: 'warning' },
    confirmed: { label: t('wms.outbound_page.status_confirmed'), color: 'info' },
    picking: { label: t('wms.outbound_page.stat_picking'), color: 'info' },
    picked: { label: t('wms.outbound_page.status_picked'), color: 'info' },
    packing: { label: t('wms.outbound_page.status_packing'), color: 'warning' },
    shipped: { label: t('wms.outbound_page.status_shipped'), color: 'success' },
    completed: { label: t('wms.outbound_page.stat_completed'), color: 'success' },
    cancelled: { label: t('wms.outbound_page.wave_status_cancelled'), color: 'error' },
  };
  const wavePickStatusConfig: Record<
    string,
    { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }
  > = {
    pending: { label: t('wms.outbound_page.wave_status_pending'), color: 'warning' },
    assigned: { label: t('wms.outbound_page.wave_status_assigned'), color: 'info' },
    picking: { label: t('wms.outbound_page.stat_picking'), color: 'info' },
    completed: { label: t('wms.outbound_page.stat_completed'), color: 'success' },
    cancelled: { label: t('wms.outbound_page.wave_status_cancelled'), color: 'error' },
  };

  const orderTypeConfig: Record<string, string> = {
    sale: t('wms.outbound_page.type_sale'),
    return: t('wms.outbound_page.type_return'),
    transfer: t('wms.outbound_page.type_transfer'),
    production: t('wms.outbound_page.type_production'),
    other: t('wms.outbound_page.type_other'),
  };

  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState(0);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [wavePicksPage, setWavePicksPage] = useState(1);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OutboundOrder | null>(null);
  const [orderItems, setOrderItems] = useState<OutboundOrderItem[]>([]);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  // Form states
  const [newItem, setNewItem] = useState<CreateOutboundOrderRequest>({
    order_number: '',
    order_type: 'sale',
    warehouse_id: '',
    customer_id: '',
    customer_name: '',
    shipping_address: '',
    expected_date: '',
    order_date: '',
    expected_delivery: '',
    total_amount: 0,
    remarks: '',
    items: [],
  });

  const warehousesQuery = useQuery({
    queryKey: ['wms-warehouses'],
    queryFn: async () => {
      const response = await wmsApi.warehouses.list({ page: 1, pagesize: 100 });
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const warehouses = warehousesQuery.data || [];

  useEffect(() => {
    if (warehousesQuery.isError && warehousesQuery.error) {
      apiLogger.error(t('wms.outbound_page.list'), warehousesQuery.error);
    }
  }, [warehousesQuery.isError, warehousesQuery.error]);

  const ordersQuery = useQuery({
    queryKey: ['wms-outbound-orders', searchTerm, statusFilter, warehouseFilter, currentPage, pageSize],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouse_id = warehouseFilter;

      const response = await wmsApi.outboundOrders.list(params as unknown as Record<string, unknown>);
      if (response.success && response.data) {
        return { orders: response.data.items || [], total: response.data.total || 0 };
      }
      return { orders: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });
  const orders = ordersQuery.data?.orders || [];
  const total = ordersQuery.data?.total || 0;
  const loading = ordersQuery.isLoading;

  useEffect(() => {
    if (ordersQuery.isError && ordersQuery.error) {
      apiLogger.error(t('wms.outbound_page.list_1'), ordersQuery.error);
      addNotification({
        type: 'error',
        title: t('wms.outbound_page.fail'),
        message: t('wms.outbound_page.list_2'),
      });
    }
  }, [ordersQuery.isError, ordersQuery.error, addNotification]);

  const wavePicksQuery = useQuery({
    queryKey: ['wms-wave-picks', wavePicksPage, pageSize],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: wavePicksPage,
        pagesize: pageSize,
      };

      const response = await wmsApi.wavePicks.list(params as unknown as Record<string, unknown>);
      if (response.success && response.data) {
        return { wavePicks: response.data.items || [], total: response.data.total || 0 };
      }
      return { wavePicks: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
    enabled: currentTab === 1,
  });
  const wavePicks = wavePicksQuery.data?.wavePicks || [];
  const wavePicksTotal = wavePicksQuery.data?.total || 0;
  const wavePicksLoading = wavePicksQuery.isLoading;

  useEffect(() => {
    if (wavePicksQuery.isError && wavePicksQuery.error) {
      apiLogger.error(t('wms.outbound_page.list_3'), wavePicksQuery.error);
    }
  }, [wavePicksQuery.isError, wavePicksQuery.error]);

  const createOrderMutation = useMutation({
    mutationFn: (data: CreateOutboundOrderRequest) => wmsApi.outboundOrders.create(data),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.outbound_page.create'),
        message: t('wms.outbound_page.create_1'),
      });
      queryClient.invalidateQueries({ queryKey: ['wms-outbound-orders'] });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.outbound_page.create_2'), error);
      addNotification({
        type: 'error',
        title: t('wms.outbound_page.create_3'),
        message: t('wms.outbound_page.create_4'),
      });
    },
  });

  const confirmOrderMutation = useMutation({
    mutationFn: (id: string) => wmsApi.outboundOrders.confirm(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.outbound_page.success'),
        message: t('wms.outbound_page.confirmed'),
      });
      queryClient.invalidateQueries({ queryKey: ['wms-outbound-orders'] });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.outbound_page.fail_1'), error);
      addNotification({
        type: 'error',
        title: t('wms.outbound_page.fail_2'),
        message: t('wms.outbound_page.fail_3'),
      });
    },
  });

  const pickOrderMutation = useMutation({
    mutationFn: (id: string) => wmsApi.outboundOrders.pick(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.outbound_page.success_1'),
        message: t('wms.outbound_page.outbound'),
      });
      queryClient.invalidateQueries({ queryKey: ['wms-outbound-orders'] });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.outbound_page.fail_4'), error);
      addNotification({
        type: 'error',
        title: t('wms.outbound_page.fail_5'),
        message: t('wms.outbound_page.fail_5'),
      });
    },
  });

  const shipOrderMutation = useMutation({
    mutationFn: (id: string) => wmsApi.outboundOrders.ship(id, []),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.outbound_page.success_2'),
        message: t('wms.outbound_page.outbound_1'),
      });
      queryClient.invalidateQueries({ queryKey: ['wms-outbound-orders'] });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.outbound_page.fail_6'), error);
      addNotification({
        type: 'error',
        title: t('wms.outbound_page.fail_7'),
        message: t('wms.outbound_page.fail_7'),
      });
    },
  });

  const completeOrderMutation = useMutation({
    mutationFn: (id: string) => wmsApi.outboundOrders.complete(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.outbound_page.success_3'),
        message: t('wms.outbound_page.completed'),
      });
      queryClient.invalidateQueries({ queryKey: ['wms-outbound-orders'] });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.outbound_page.fail_8'), error);
      addNotification({
        type: 'error',
        title: t('wms.outbound_page.fail_9'),
        message: t('wms.outbound_page.fail_10'),
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (id: string) => wmsApi.outboundOrders.delete(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('wms.outbound_page.delete_success'),
        message: t('wms.outbound_page.deleted'),
      });
      queryClient.invalidateQueries({ queryKey: ['wms-outbound-orders'] });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.outbound_page.delete'), error);
      addNotification({
        type: 'error',
        title: t('wms.outbound_page.delete_1'),
        message: t('wms.outbound_page.delete_2'),
      });
    },
  });

  const fetchOrderItems = async (orderId: string) => {
    try {
      const response = await wmsApi.outboundOrders.listItems(orderId);
      if (response.success && response.data) {
        setOrderItems(response.data.items || []);
      }
    } catch (error: unknown) {
      apiLogger.error(t('wms.outbound_page.fail_11'), error);
    }
  };

  const handleCreate = async () => {
    if (!newItem.order_number || !newItem.warehouse_id) {
      addNotification({
        type: 'warning',
        title: t('wms.outbound_page.error'),
        message: t('wms.outbound_page.please_fill'),
      });
      return;
    }

    await createOrderMutation.mutateAsync(newItem);
    setShowCreateDialog(false);
    resetNewItem();
  };

  const handleConfirm = async (id: string) => {
    await confirmOrderMutation.mutateAsync(id);
  };

  const handlePick = async (id: string) => {
    await pickOrderMutation.mutateAsync(id);
  };

  const handleShip = async (id: string) => {
    await shipOrderMutation.mutateAsync(id);
  };

  const handleComplete = async (id: string) => {
    await completeOrderMutation.mutateAsync(id);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteOrderId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = useCallback(async () => {
    if (!deleteOrderId) return;
    await deleteOrderMutation.mutateAsync(deleteOrderId);
  }, [deleteOrderId, deleteOrderMutation]);

  const handleViewDetail = async (order: OutboundOrder) => {
    setSelectedOrder(order);
    await fetchOrderItems(order.id);
    setShowDetailDialog(true);
  };

  const resetNewItem = () => {
    setNewItem({
      order_number: '',
      order_type: 'sale',
      warehouse_id: '',
      customer_id: '',
      customer_name: '',
      shipping_address: '',
      expected_date: '',
      order_date: '',
      expected_delivery: '',
      total_amount: 0,
      remarks: '',
      items: [],
    });
  };

  const getStatusBadge = (status: string, config: typeof statusConfig = statusConfig) => {
    const statusStyle = config[status] || { label: status, color: 'default' as const };
    return (
      <StatusBadge
        status={status}
        label={statusStyle.label}
        color={statusStyle.color}
        size='sm'
        variant='outlined'
      />
    );
  };

  const getWarehouseName = useMemo(() => {
    return (warehouseId: string) => {
      return warehouses.find((w) => w.id === warehouseId)?.name || warehouseId;
    };
  }, [warehouses]);

  const orderColumns: ColumnDef<OutboundOrder>[] = useMemo(
    () => [
      { id: 'order_number', label: t('wms.outbound_page.detail_order_number'), sortable: true },
      {
        id: 'order_type',
        label: t('wms.outbound_page.detail_order_type'),
        render: (row) => orderTypeConfig[row.order_type] || row.order_type,
      },
      {
        id: 'warehouse_id',
        label: t('wms.outbound_page.detail_warehouse'),
        render: (row) => getWarehouseName(row.warehouse_id),
      },
      { id: 'customer_name', label: t('wms.outbound_page.detail_customer') },
      { id: 'total_quantity', label: t('wms.outbound_page.detail_total_quantity') },
      { id: 'expected_date', label: t('wms.outbound_page.detail_expected_date') },
      {
        id: 'status',
        label: t('wms.outbound_page.detail_col_status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    [getWarehouseName]
  );

  const wavePickColumns: ColumnDef<WavePick>[] = useMemo(
    () => [
      { id: 'wave_number', label: t('wms.outbound_page.column_wave_number'), sortable: true },
      {
        id: 'warehouse_id',
        label: t('wms.outbound_page.detail_warehouse'),
        render: (row) => getWarehouseName(row.warehouse_id),
      },
      { id: 'wave_type', label: t('wms.outbound_page.column_wave_type') },
      { id: 'total_orders', label: t('wms.outbound_page.column_total_orders') },
      { id: 'totalitems', label: t('wms.outbound_page.column_total_items') },
      { id: 'total_quantity', label: t('wms.outbound_page.detail_total_quantity') },
      {
        id: 'status',
        label: t('wms.outbound_page.detail_col_status'),
        render: (row) => getStatusBadge(row.status, wavePickStatusConfig),
      },
      { id: 'picker_name', label: t('wms.outbound_page.column_picker_name') },
    ],
    [getWarehouseName]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('wms.outbound_page.detail_col_status'),
        type: 'select',
        options: [
          { label: t('wms.outbound_page.filter_option_all_status'), value: '' },
          { label: t('wms.outbound_page.stat_pending'), value: 'pending' },
          { label: t('wms.outbound_page.status_confirmed'), value: 'confirmed' },
          { label: t('wms.outbound_page.stat_picking'), value: 'picking' },
          { label: t('wms.outbound_page.status_picked'), value: 'picked' },
          { label: t('wms.outbound_page.status_packing'), value: 'packing' },
          { label: t('wms.outbound_page.status_shipped'), value: 'shipped' },
          { label: t('wms.outbound_page.stat_completed'), value: 'completed' },
          { label: t('wms.outbound_page.wave_status_cancelled'), value: 'cancelled' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
      {
        id: 'warehouse_id',
        label: t('wms.outbound_page.detail_warehouse'),
        type: 'select',
        options: [
          { label: t('wms.outbound_page.filter_option_all_warehouse'), value: '' },
          ...warehouses.map((w) => ({ label: w.name, value: w.id })),
        ],
        value: warehouseFilter,
        onChange: (value) => {
          setWarehouseFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter, warehouseFilter, warehouses]
  );

  const renderRowActions = useCallback(
    (row: OutboundOrder): React.ReactNode => {
      const actions: RowAction<OutboundOrder>[] = [
        {
          label: t('wms.outbound_page.action_view_detail'),
          icon: <Eye size={16} />,
          onClick: () => handleViewDetail(row),
        },
      ];

      if (row.status === 'pending') {
        actions.push({
          label: t('wms.outbound_page.action_confirm'),
          icon: <Check size={16} />,
          onClick: () => handleConfirm(row.id),
        });
      }

      if (row.status === 'confirmed' || row.status === 'picking') {
        actions.push({
          label: t('wms.outbound_page.action_pick'),
          icon: <ClipboardList size={16} />,
          onClick: () => handlePick(row.id),
        });
      }

      if (row.status === 'picked' || row.status === 'packing') {
        actions.push({
          label: t('wms.outbound_page.action_ship'),
          icon: <Truck size={16} />,
          onClick: () => handleShip(row.id),
        });
      }

      if (row.status === 'shipped') {
        actions.push({
          label: t('wms.outbound_page.action_complete'),
          icon: <Check size={16} />,
          onClick: () => handleComplete(row.id),
        });
      }

      if (row.status === 'pending' || row.status === 'cancelled') {
        actions.push({
          label: t('wms.outbound_page.action_delete'),
          icon: <Trash2 size={16} />,
          color: 'error',
          onClick: () => handleDeleteClick(row.id),
        });
      }

      return (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {actions.map((action, index) => (
            <IconButton
              key={index}
              size='small'
              color={action.color as 'primary' | 'secondary' | 'error' | 'inherit' | 'default'}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                if (action.onClick) action.onClick(row);
              }}
            >
              {action.icon}
            </IconButton>
          ))}
        </Box>
      );
    },
    [handleConfirm, handlePick, handleShip, handleComplete, handleDeleteClick]
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleOpenCreate = () => {
    resetNewItem();
    setShowCreateDialog(true);
  };

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
          出库单总数
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
          待确认
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'warning.dark' }}
        >
          {orders.filter((o) => o.status === 'pending').length}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          拣货中
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'info.dark' }}
        >
          {orders.filter((o) => o.status === 'picking' || o.status === 'picked').length}
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
          {orders.filter((o) => o.status === 'completed' || o.status === 'shipped').length}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title={t('wms.outbound_page.breadcrumb_current')}
      subtitle={t('wms.outbound_page.subtitle')}
      headerProps={{
        pageIcon: <Upload style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main}, ${ct.warning.dark})`,
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
        >
          <Tab label={t('wms.outbound_page.tab_orders')} />
          <Tab label={t('wms.outbound_page.tab_wave_picking')} />
        </Tabs>
      </Box>

      {currentTab === 0 && (
        <ListPageTemplate
          title=''
          subtitle=''
          breadcrumbs={[
            { label: t('wms.outbound_page.breadcrumb_home'), href: '/dashboard' },
            { label: t('wms.outbound_page.breadcrumb_module'), href: WMS_PATHS.root },
            { label: t('wms.outbound_page.breadcrumb_current') },
          ]}
          columns={orderColumns}
          data={orders}
          loading={loading}
          filters={filters}
          searchable
          searchPlaceholder={t('wms.outbound_page.search_placeholder')}
          onSearch={handleSearch}
          searchValue={searchTerm}
          pagination={{
            page: currentPage,
            pageSize,
            total,
            onPageChange: setCurrentPage,
          }}
          actions={[
            {
              label: t('wms.outbound_page.dialog_create_title'),
              icon: <Plus size={16} />,
              onClick: handleOpenCreate,
            },
          ]}
          renderRowActions={renderRowActions}
          headerContent={statsContent}
          emptyMessage={t('wms.outbound_page.empty_message')}
          getRowId={(row) => row.id}
          mobileCardTitleKey='order_number'
          mobileCardSubtitleKey='customer_name'
          mobileCardDisplayFields={['order_type', 'status', 'expected_date', 'total_quantity']}
          mobileCardFieldLabels={{
            order_type: t('wms.outbound_page.detail_order_type'),
            status: t('wms.outbound_page.detail_col_status'),
            expected_date: t('wms.outbound_page.detail_expected_date'),
            total_quantity: t('wms.outbound_page.mobile_field_total_quantity'),
          }}
        />
      )}

      {currentTab === 1 && (
        <ListPageTemplate
          title=''
          subtitle=''
          breadcrumbs={[
            { label: t('wms.outbound_page.breadcrumb_home'), href: '/dashboard' },
            { label: t('wms.outbound_page.breadcrumb_module'), href: WMS_PATHS.root },
            { label: t('wms.outbound_page.breadcrumb_current'), href: WMS_PATHS.outbound },
            { label: t('wms.outbound_page.tab_wave_picking') },
          ]}
          columns={wavePickColumns}
          data={wavePicks}
          loading={wavePicksLoading}
          filters={[]}
          searchable
          searchPlaceholder={t('wms.outbound_page.search_wave_placeholder')}
          onSearch={() => {}}
          searchValue=''
          pagination={{
            page: wavePicksPage,
            pageSize,
            total: wavePicksTotal,
            onPageChange: setWavePicksPage,
          }}
          actions={[]}
          emptyMessage={t('wms.outbound_page.empty_wave_message')}
          getRowId={(row) => row.id}
          mobileCardTitleKey='wave_number'
          mobileCardDisplayFields={['status', 'total_items', 'picked_items', 'assigned_to']}
          mobileCardFieldLabels={{
            status: t('wms.outbound_page.detail_col_status'),
            total_items: t('wms.outbound_page.mobile_wave_field_total_items'),
            picked_items: t('wms.outbound_page.mobile_wave_field_picked_items'),
            assigned_to: t('wms.outbound_page.mobile_wave_field_assigned_to'),
          }}
        />
      )}

      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增出库单</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 2,
              py: 2,
            }}
          >
            <TextField
              label={t('wms.outbound_page.field_order_number_required')}
              value={newItem.order_number}
              onChange={(e) => setNewItem({ ...newItem, order_number: e.target.value })}
              fullWidth
              required
              size='small'
            />
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>出库类型</InputLabel>
              <Select
                value={newItem.order_type}
                label={t('wms.outbound_page.detail_order_type')}
                onChange={(e) => setNewItem({ ...newItem, order_type: e.target.value })}
              >
                {Object.entries(orderTypeConfig).map(([key, label]) => (
                  <MenuItem
                    key={key}
                    value={key}
                  >
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>仓库 *</InputLabel>
              <Select
                value={newItem.warehouse_id}
                label={t('wms.outbound_page.field_warehouse_required')}
                onChange={(e) => setNewItem({ ...newItem, warehouse_id: e.target.value })}
              >
                {warehouses.map((w) => (
                  <MenuItem
                    key={w.id}
                    value={w.id}
                  >
                    {w.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t('wms.outbound_page.detail_customer')}
              value={newItem.customer_name}
              onChange={(e) => setNewItem({ ...newItem, customer_name: e.target.value })}
              fullWidth
              size='small'
            />
            <TextField
              label={t('wms.outbound_page.detail_expected_date')}
              type='date'
              value={newItem.expected_date}
              onChange={(e) => setNewItem({ ...newItem, expected_date: e.target.value })}
              fullWidth
              size='small'
              slotProps={{ inputLabel: { shrink: true } } as const}
            />
            <TextField
              label={t('wms.outbound_page.field_shipping_address')}
              value={newItem.shipping_address}
              onChange={(e) => setNewItem({ ...newItem, shipping_address: e.target.value })}
              fullWidth
              size='small'
            />
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                label={t('wms.outbound_page.field_remark')}
                value={newItem.remarks}
                onChange={(e) => setNewItem({ ...newItem, remarks: e.target.value })}
                fullWidth
                size='small'
                multiline
                rows={2}
              />
            </Box>
          </Box>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 2 }}
          >
            提示：出库单物料需要在详情页中添加
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateDialog(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleCreate}
            disabled={createOrderMutation.isPending}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>出库单详情</DialogTitle>
        <DialogContent>
          {selectedOrder && (
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
                    出库单号
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedOrder.order_number}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    出库类型
                  </Typography>
                  <Typography variant='body1'>
                    {orderTypeConfig[selectedOrder.order_type] || selectedOrder.order_type}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    仓库
                  </Typography>
                  <Typography variant='body1'>
                    {getWarehouseName(selectedOrder.warehouse_id)}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    客户
                  </Typography>
                  <Typography variant='body1'>{selectedOrder.customer_name || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    预计日期
                  </Typography>
                  <Typography variant='body1'>
                    {selectedOrder.expected_date
                      ? new Date(selectedOrder.expected_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedOrder.status)}</Box>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    总数量
                  </Typography>
                  <Typography variant='body1'>{selectedOrder.total_quantity || 0}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    总金额
                  </Typography>
                  <Typography variant='body1'>{selectedOrder.total_amount || 0}</Typography>
                </Box>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ mb: 1 }}
                >
                  出库明细
                </Typography>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '50px 1fr 1fr 80px 80px 80px 80px',
                      gap: 1,
                      p: 1,
                      bgcolor: 'grey.100',
                      borderRadius: '4px 4px 0 0',
                    }}
                  >
                    <Typography variant='caption'>行号</Typography>
                    <Typography variant='caption'>物料编码</Typography>
                    <Typography variant='caption'>物料名称</Typography>
                    <Typography variant='caption'>单位</Typography>
                    <Typography variant='caption'>需求数量</Typography>
                    <Typography variant='caption'>已拣数量</Typography>
                    <Typography variant='caption'>状态</Typography>
                  </Box>
                  {orderItems.map((item, index) => (
                    <Box
                      key={item.id || index}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '50px 1fr 1fr 80px 80px 80px 80px',
                        gap: 1,
                        p: 1,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant='caption'>{item.line_number}</Typography>
                      <Typography variant='caption'>{item.material_code}</Typography>
                      <Typography variant='caption'>{item.material_name}</Typography>
                      <Typography variant='caption'>{item.unit}</Typography>
                      <Typography variant='caption'>{item.requested_quantity}</Typography>
                      <Typography variant='caption'>{item.picked_quantity}</Typography>
                      <Typography variant='caption'>
                        {item.status === 'shipped' ? t('wms.outbound_page.status_shipped') : item.status}
                      </Typography>
                    </Box>
                  ))}
                  {orderItems.length === 0 && (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        暂无明细数据
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowDetailDialog(false)}
          >
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('wms.outbound_page.dialog_delete_title')}
        message={t('wms.outbound_page.dialog_delete_message')}
        danger
      />
    </PageContainer>
  );
};

export default OutboundPage;