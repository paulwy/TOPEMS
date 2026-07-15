import React, { useState, useMemo } from 'react';
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
} from '@mui/material';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import type {
  ReplenishmentSuggestion,
  ReplenishmentOrder,
  Warehouse,
  ReplenishmentStatistics,
} from '@/api/wms';
import { wmsApi } from '@/api/wms';
import { WMS_PATHS } from '@/modules/wms/config';
import { useNotificationStore } from '@/store';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  ShoppingCart,
  AlertTriangle,
  Check,
  RefreshCw,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ConfirmDialog, PageContainer, StatusBadge } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const suggestionStatusConfig: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }
> = {
  pending: { label: '待处理', color: 'warning' },
  approved: { label: '已批准', color: 'info' },
  rejected: { label: '已拒绝', color: 'error' },
  converted: { label: '已转化', color: 'success' },
};

const orderStatusConfig: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }
> = {
  draft: { label: '草稿', color: 'default' },
  pending: { label: '待确认', color: 'warning' },
  confirmed: { label: '已确认', color: 'info' },
  in_progress: { label: '进行中', color: 'info' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'error' },
};

const priorityConfig: Record<
  string,
  { label: string; color: 'error' | 'warning' | 'info' | 'default' }
> = {
  urgent: { label: '紧急', color: 'error' },
  high: { label: '高', color: 'warning' },
  normal: { label: '普通', color: 'info' },
  low: { label: '低', color: 'default' },
};

type TabValue = 'suggestions' | 'orders';

const ReplenishmentPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabValue>('suggestions');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Dialog states
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ReplenishmentSuggestion | null>(
    null
  );
  const [selectedOrder, setSelectedOrder] = useState<ReplenishmentOrder | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const invalidateReplenishment = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WMS.REPLENISHMENT_SUGGESTIONS] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WMS.REPLENISHMENT_ORDERS] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WMS.REPLENISHMENT_STATISTICS] });
  };

  const { data: suggestionsResponse, isLoading: suggestionsLoading } = useQuery({
    queryKey: [
      QUERY_KEYS.WMS.REPLENISHMENT_SUGGESTIONS,
      currentPage,
      pageSize,
      searchTerm,
      statusFilter,
      warehouseFilter,
    ],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouse_id = warehouseFilter;

      const response = await wmsApi.smartReplenishment.listSuggestions(params);
      if (!response.success) {
        throw new Error('Failed to fetch replenishment suggestions');
      }
      return response.data;
    },
    enabled: activeTab === 'suggestions',
  });

  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: [
      QUERY_KEYS.WMS.REPLENISHMENT_ORDERS,
      currentPage,
      pageSize,
      searchTerm,
      statusFilter,
      warehouseFilter,
    ],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouse_id = warehouseFilter;

      const response = await wmsApi.smartReplenishment.listOrders(params);
      if (!response.success) {
        throw new Error('Failed to fetch replenishment orders');
      }
      return response.data;
    },
    enabled: activeTab === 'orders',
  });

  const { data: warehousesResponse } = useQuery({
    queryKey: [QUERY_KEYS.WMS.WAREHOUSES, 'replenishment'],
    queryFn: async () => {
      const response = await wmsApi.warehouses.list({ page: 1, pagesize: 100 });
      if (!response.success) {
        throw new Error('Failed to fetch warehouses');
      }
      return response.data;
    },
  });

  const { data: statistics } = useQuery<ReplenishmentStatistics | undefined>({
    queryKey: [QUERY_KEYS.WMS.REPLENISHMENT_STATISTICS, warehouseFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (warehouseFilter) params.warehouse_id = warehouseFilter;
      const response = await wmsApi.smartReplenishment.getStatistics(params);
      if (!response.success) {
        throw new Error('Failed to fetch replenishment statistics');
      }
      return response.data;
    },
  });

  const warehouses: Warehouse[] = warehousesResponse?.items || [];
  const suggestions: ReplenishmentSuggestion[] = suggestionsResponse?.items || [];
  const orders: ReplenishmentOrder[] = ordersResponse?.items || [];
  const loading = activeTab === 'suggestions' ? suggestionsLoading : ordersLoading;
  const total =
    activeTab === 'suggestions' ? suggestionsResponse?.total || 0 : ordersResponse?.total || 0;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await wmsApi.smartReplenishment.generateSuggestions();
      if (!response.success) {
        throw new Error('Failed to generate suggestions');
      }
      return response;
    },
    onSuccess: (response) => {
      addNotification({
        type: 'success',
        title: '生成成功',
        message: `已生成 ${response.data?.count || 0} 条补货建议`,
      });
      invalidateReplenishment();
    },
    onError: (error) => {
      apiLogger.error('生成补货建议失败:', error);
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (suggestion: ReplenishmentSuggestion) => {
      const response = await wmsApi.smartReplenishment.createOrder({
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
      if (!response.success) {
        throw new Error('Failed to create replenishment order');
      }
      return response;
    },
    onSuccess: () => {
      invalidateReplenishment();
    },
    onError: (error) => {
      apiLogger.error('创建补货单失败:', error);
    },
  });

  const confirmOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await wmsApi.smartReplenishment.confirmOrder(id);
      if (!response.success) {
        throw new Error('Failed to confirm replenishment order');
      }
      return response;
    },
    onSuccess: () => {
      invalidateReplenishment();
    },
    onError: (error) => {
      apiLogger.error('确认补货单失败:', error);
    },
  });

  const completeOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await wmsApi.smartReplenishment.completeOrder(id);
      if (!response.success) {
        throw new Error('Failed to complete replenishment order');
      }
      return response;
    },
    onSuccess: () => {
      invalidateReplenishment();
    },
    onError: (error) => {
      apiLogger.error('完成补货单失败:', error);
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await wmsApi.smartReplenishment.deleteOrder(id);
      if (!response.success) {
        throw new Error('Failed to delete replenishment order');
      }
      return response;
    },
    onSuccess: () => {
      invalidateReplenishment();
      setShowDeleteConfirm(false);
      setDeleteItemId(null);
    },
    onError: (error) => {
      apiLogger.error('删除补货单失败:', error);
    },
  });

  const handleGenerateSuggestions = async () => {
    await generateMutation.mutateAsync();
  };

  const handleCreateOrderFromSuggestion = async (suggestion: ReplenishmentSuggestion) => {
    await createOrderMutation.mutateAsync(suggestion);
  };

  const handleConfirmOrder = async (id: string) => {
    await confirmOrderMutation.mutateAsync(id);
  };

  const handleCompleteOrder = async (id: string) => {
    await completeOrderMutation.mutateAsync(id);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteItemId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deleteItemId) return;
    await deleteOrderMutation.mutateAsync(deleteItemId);
  };

  const handleViewSuggestionDetail = (item: ReplenishmentSuggestion) => {
    setSelectedSuggestion(item);
    setShowDetailDialog(true);
  };

  const handleViewOrderDetail = (item: ReplenishmentOrder) => {
    setSelectedOrder(item);
    setShowDetailDialog(true);
  };

  const getStatusBadge = (status: string, type: 'suggestion' | 'order') => {
    const config =
      type === 'suggestion'
        ? suggestionStatusConfig[status] || { label: status, color: 'default' as const }
        : orderStatusConfig[status] || { label: status, color: 'default' as const };
    return (
      <StatusBadge
        status={status}
        label={config.label}
        color={config.color}
        size='sm'
        variant='outlined'
      />
    );
  };

  const getPriorityBadge = (priority: string) => {
    const config = priorityConfig[priority] || { label: priority, color: 'default' as const };
    return (
      <StatusBadge
        status={priority}
        label={config.label}
        color={config.color}
        size='sm'
      />
    );
  };

  const getWarehouseName = useMemo(() => {
    return (warehouseId: string) => {
      return warehouses.find((w) => w.id === warehouseId)?.name || warehouseId;
    };
  }, [warehouses]);

  const suggestionColumns: ColumnDef<ReplenishmentSuggestion>[] = useMemo(
    () => [
      { id: 'suggestion_number', label: '建议编号', sortable: true },
      { id: 'sku', label: '物料编码' },
      { id: 'material_name', label: '物料名称', sortable: true },
      {
        id: 'warehouse_id',
        label: '仓库',
        render: (row) => getWarehouseName(row.warehouse_id),
      },
      { id: 'current_quantity', label: '当前库存' },
      { id: 'suggested_quantity', label: '建议数量' },
      {
        id: 'priority',
        label: '优先级',
        render: (row) => getPriorityBadge(row.priority),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status, 'suggestion'),
      },
    ],
    [getWarehouseName]
  );

  const orderColumns: ColumnDef<ReplenishmentOrder>[] = useMemo(
    () => [
      { id: 'order_number', label: '补货单号', sortable: true },
      {
        id: 'warehouse_id',
        label: '仓库',
        render: (row) => getWarehouseName(row.warehouse_id),
      },
      { id: 'supplier_name', label: '供应商' },
      { id: 'total_quantity', label: '总数量' },
      { id: 'total_amount', label: '总金额' },
      {
        id: 'priority',
        label: '优先级',
        render: (row) => getPriorityBadge(row.priority || 'normal'),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status, 'order'),
      },
      { id: 'expected_date', label: '预计日期' },
    ],
    [getWarehouseName]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options:
          activeTab === 'suggestions'
            ? [
                { label: '全部状态', value: '' },
                { label: '待处理', value: 'pending' },
                { label: '已批准', value: 'approved' },
                { label: '已拒绝', value: 'rejected' },
                { label: '已转化', value: 'converted' },
              ]
            : [
                { label: '全部状态', value: '' },
                { label: '草稿', value: 'draft' },
                { label: '待确认', value: 'pending' },
                { label: '已确认', value: 'confirmed' },
                { label: '进行中', value: 'in_progress' },
                { label: '已完成', value: 'completed' },
                { label: '已取消', value: 'cancelled' },
              ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
      {
        id: 'warehouse_id',
        label: '仓库',
        type: 'select',
        options: [
          { label: '全部仓库', value: '' },
          ...warehouses.map((w) => ({ label: w.name, value: w.id })),
        ],
        value: warehouseFilter,
        onChange: (value) => {
          setWarehouseFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter, warehouseFilter, warehouses, activeTab]
  );

  const suggestionRowActions: RowAction<ReplenishmentSuggestion>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: handleViewSuggestionDetail,
      },
      {
        label: '创建补货单',
        icon: <ShoppingCart size={16} />,
        onClick: handleCreateOrderFromSuggestion,
      },
    ],
    []
  );

  const orderRowActions: RowAction<ReplenishmentOrder>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: handleViewOrderDetail,
      },
      {
        label: '确认',
        icon: <Check size={16} />,
        onClick: (row) => handleConfirmOrder(row.id),
      },
      {
        label: '完成',
        icon: <Check size={16} />,
        onClick: (row) => handleCompleteOrder(row.id),
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDeleteClick(row.id),
      },
    ],
    []
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleTabChange = (tab: TabValue) => {
    setActiveTab(tab);
    setStatusFilter('');
    setCurrentPage(1);
  };

  const currentColumns = (activeTab === 'suggestions' ? suggestionColumns : orderColumns) as any;
  const currentData = (activeTab === 'suggestions' ? suggestions : orders) as any;

  const currentRowActions = (
    activeTab === 'suggestions' ? suggestionRowActions : orderRowActions
  ) as any;

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

  const currentTitle = activeTab === 'suggestions' ? '补货建议' : '补货单';
  const currentBreadcrumb = activeTab === 'suggestions' ? '补货建议' : '补货单';

  return (
    <PageContainer
      title='补货管理'
      subtitle='智能补货建议和补货单管理'
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
            onClick={() => handleTabChange('suggestions')}
            startIcon={<AlertTriangle size={16} />}
          >
            补货建议
          </Button>
          <Button
            variant={activeTab === 'orders' ? 'contained' : 'text'}
            onClick={() => handleTabChange('orders')}
            startIcon={<ShoppingCart size={16} />}
          >
            补货单
          </Button>
        </Stack>
      </Box>

      {activeTab === 'suggestions' && (
        <Box sx={{ mb: 2 }}>
          <Button
            variant='outlined'
            startIcon={<RefreshCw size={16} />}
            onClick={handleGenerateSuggestions}
          >
            生成补货建议
          </Button>
        </Box>
      )}

      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '仓储', href: WMS_PATHS.root },
          { label: '补货管理', href: WMS_PATHS.replenishment },
          { label: currentBreadcrumb },
        ]}
        columns={currentColumns}
        data={currentData}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={`搜索${currentTitle}...`}
        onSearch={handleSearch}
        searchValue={searchTerm}
        pagination={{
          page: currentPage,
          pageSize,
          total,
          onPageChange: setCurrentPage,
        }}
        rowActions={currentRowActions}
        headerContent={statsContent}
        emptyMessage={`暂无${currentTitle}数据`}
        getRowId={(row) => (row as { id: string }).id}
      />

      {/* 建议详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{activeTab === 'suggestions' ? '补货建议详情' : '补货单详情'}</DialogTitle>
        <DialogContent>
          {activeTab === 'suggestions' && selectedSuggestion && (
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
                    建议编号
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedSuggestion.suggestion_number}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    物料编码
                  </Typography>
                  <Typography variant='body1'>{selectedSuggestion.sku}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    物料名称
                  </Typography>
                  <Typography variant='body1'>{selectedSuggestion.material_name}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    规格
                  </Typography>
                  <Typography variant='body1'>{selectedSuggestion.specification || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    仓库
                  </Typography>
                  <Typography variant='body1'>
                    {getWarehouseName(selectedSuggestion.warehouse_id)}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    优先级
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getPriorityBadge(selectedSuggestion.priority)}</Box>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    当前库存
                  </Typography>
                  <Typography variant='body1'>{selectedSuggestion.current_quantity}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    可用库存
                  </Typography>
                  <Typography variant='body1'>{selectedSuggestion.available_quantity}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    安全库存
                  </Typography>
                  <Typography variant='body1'>{selectedSuggestion.safety_stock}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    建议补货量
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 700, color: 'primary.main' }}
                  >
                    {selectedSuggestion.suggested_quantity} {selectedSuggestion.unit}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    供应商
                  </Typography>
                  <Typography variant='body1'>{selectedSuggestion.supplier_name || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    单价
                  </Typography>
                  <Typography variant='body1'>
                    {selectedSuggestion.unit_price ? `¥${selectedSuggestion.unit_price}` : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    预计总成本
                  </Typography>
                  <Typography variant='body1'>
                    {selectedSuggestion.total_cost ? `¥${selectedSuggestion.total_cost}` : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {getStatusBadge(selectedSuggestion.status, 'suggestion')}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}

          {activeTab === 'orders' && selectedOrder && (
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
                    补货单号
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
                    供应商
                  </Typography>
                  <Typography variant='body1'>{selectedOrder.supplier_name || '-'}</Typography>
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
                  <Typography variant='body1'>
                    {selectedOrder.total_amount ? `¥${selectedOrder.total_amount}` : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    优先级
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getPriorityBadge(selectedOrder.priority || 'normal')}</Box>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedOrder.status, 'order')}</Box>
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
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    备注
                  </Typography>
                  <Typography variant='body1'>{selectedOrder.remarks || '-'}</Typography>
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
          {activeTab === 'suggestions' && selectedSuggestion && (
            <Button
              variant='contained'
              onClick={() => {
                handleCreateOrderFromSuggestion(selectedSuggestion);
                setShowDetailDialog(false);
              }}
              startIcon={<ShoppingCart size={16} />}
            >
              创建补货单
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title='确认删除'
        message='确定要删除这个补货单吗？此操作不可撤销。'
        danger
      />
    </PageContainer>
  );
};

export default ReplenishmentPage;
