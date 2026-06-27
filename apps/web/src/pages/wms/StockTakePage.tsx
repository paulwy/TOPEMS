import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Button,
} from '@mui/material';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import type {
  StockTake,
  StockTakeItem,
  CreateStockTakeRequest,
  CountItemRequest,
  Warehouse,
} from '@/api/wms';
import { wmsApi } from '@/api/wms';
import { useAppStore } from '@/store';
import { Plus, Edit, Trash2, Play, CheckCircle2, Eye, Package } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { PageContainer } from '@/components/common';

const statusConfig: Record<
  string,
  { label: string; color: 'default' | 'success' | 'warning' | 'error' }
> = {
  planned: { label: '计划中', color: 'warning' },
  in_progress: { label: '进行中', color: 'default' },
  completed: { label: '已完成', color: 'success' },
};

const discrepancyTypeConfig: Record<
  string,
  { label: string; color: 'default' | 'success' | 'error' }
> = {
  over: { label: '盘盈', color: 'success' },
  under: { label: '盘亏', color: 'error' },
  none: { label: '无差异', color: 'default' },
};

const StockTakePage: React.FC = () => {
  const { addNotification } = useAppStore();

  const [stockTakes, setStockTakes] = useState<StockTake[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCountDialog, setShowCountDialog] = useState(false);
  const [selectedStockTake, setSelectedStockTake] = useState<StockTake | null>(null);
  const [stockTakeItems, setStockTakeItems] = useState<StockTakeItem[]>([]);
  const [countValues, setCountValues] = useState<Record<string, number>>({});

  // Form states
  const [newStockTake, setNewStockTake] = useState<CreateStockTakeRequest>({
    stock_take_number: '',
    warehouse_id: '',
    remarks: '',
  });

  const fetchStockTakes = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        page_size: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await wmsApi.stockTakes.list(params);
      if (response.success && response.data) {
        setStockTakes(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('获取盘点单失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载盘点单',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, addNotification]);

  useEffect(() => {
    fetchStockTakes();
    fetchWarehouses();
  }, [fetchStockTakes]);

  const fetchWarehouses = async () => {
    try {
      const response = await wmsApi.warehouses.list({ page: 1, page_size: 100 });
      if (response.success && response.data) {
        setWarehouses(response.data.items || []);
      }
    } catch (error: unknown) {
      apiLogger.error('获取仓库列表失败:', error);
    }
  };

  const handleCreateStockTake = async () => {
    if (!newStockTake.stock_take_number || !newStockTake.warehouse_id) {
      addNotification({
        type: 'warning',
        title: '验证错误',
        message: '请填写完整信息（盘点单号、仓库）',
      });
      return;
    }

    try {
      const response = await wmsApi.stockTakes.create(newStockTake);
      if (response.success) {
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '盘点单创建成功',
        });
        setShowCreateDialog(false);
        setNewStockTake({ stock_take_number: '', warehouse_id: '', remarks: '' });
        fetchStockTakes();
      }
    } catch (error: unknown) {
      apiLogger.error('创建盘点单失败:', error);
      addNotification({
        type: 'error',
        title: '创建失败',
        message: '创建盘点单失败',
      });
    }
  };

  const handleDeleteStockTake = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这个盘点单吗？')) {
        return;
      }

      try {
        const response = await wmsApi.stockTakes.delete(id);
        if (response.success) {
          addNotification({
            type: 'success',
            title: '删除成功',
            message: '盘点单删除成功',
          });
          fetchStockTakes();
        }
      } catch (error: unknown) {
        apiLogger.error('删除盘点单失败:', error);
        addNotification({
          type: 'error',
          title: '删除失败',
          message: '删除盘点单失败',
        });
      }
    },
    [addNotification, fetchStockTakes]
  );

  const handleStartStockTake = useCallback(
    async (id: string) => {
      try {
        const response = await wmsApi.stockTakes.start(id);
        if (response.success) {
          addNotification({
            type: 'success',
            title: '操作成功',
            message: '盘点单已开始',
          });
          fetchStockTakes();
        }
      } catch (error: unknown) {
        apiLogger.error('开始盘点失败:', error);
        addNotification({
          type: 'error',
          title: '操作失败',
          message: '开始盘点失败',
        });
      }
    },
    [addNotification, fetchStockTakes]
  );

  const handleViewDetail = useCallback(
    async (stockTake: StockTake) => {
      setSelectedStockTake(stockTake);
      try {
        const response = await wmsApi.stockTakes.listItems(stockTake.id);
        if (response.success && response.data) {
          setStockTakeItems(response.data.items || []);
        }
      } catch (error: unknown) {
        apiLogger.error('获取盘点明细失败:', error);
        addNotification({
          type: 'error',
          title: '加载失败',
          message: '获取盘点明细失败',
        });
      }
      setShowDetailDialog(true);
    },
    [addNotification]
  );

  const handleCompleteStockTake = async () => {
    if (!selectedStockTake) return;

    try {
      const response = await wmsApi.stockTakes.complete(selectedStockTake.id);
      if (response.success) {
        addNotification({
          type: 'success',
          title: '操作成功',
          message: '盘点单已完成',
        });
        setShowDetailDialog(false);
        fetchStockTakes();
      }
    } catch (error: unknown) {
      apiLogger.error('完成盘点失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '完成盘点失败',
      });
    }
  };

  const handleAdjustStockTake = async () => {
    if (!selectedStockTake) return;

    try {
      const response = await wmsApi.stockTakes.adjust(selectedStockTake.id);
      if (response.success) {
        addNotification({
          type: 'success',
          title: '操作成功',
          message: '库存已调整',
        });
        setShowDetailDialog(false);
        fetchStockTakes();
      }
    } catch (error: unknown) {
      apiLogger.error('调整库存失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '调整库存失败',
      });
    }
  };

  const handleCountItems = async () => {
    if (!selectedStockTake) return;

    const items: CountItemRequest[] = stockTakeItems.map((item) => ({
      item_id: item.id,
      counted_quantity: countValues[item.id] || item.counted_quantity || 0,
      discrepancy_reason: item.discrepancy_reason || '',
    }));

    try {
      const response = await wmsApi.stockTakes.count(selectedStockTake.id, items);
      if (response.success) {
        addNotification({
          type: 'success',
          title: '操作成功',
          message: '盘点数量已更新',
        });
        setShowCountDialog(false);
        // Refresh detail
        const detailResponse = await wmsApi.stockTakes.listItems(selectedStockTake.id);
        if (detailResponse.success && detailResponse.data) {
          setStockTakeItems(detailResponse.data.items || []);
        }
      }
    } catch (error: unknown) {
      apiLogger.error('更新盘点数量失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '更新盘点数量失败',
      });
    }
  };

  const handleOpenCountDialog = () => {
    // Initialize count values from current items
    const initialValues: Record<string, number> = {};
    stockTakeItems.forEach((item) => {
      initialValues[item.id] = item.counted_quantity || 0;
    });
    setCountValues(initialValues);
    setShowCountDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, color: 'default' as const };
    return (
      <Chip
        size='small'
        color={config.color}
        label={config.label}
        variant='outlined'
      />
    );
  };

  const getDiscrepancyTypeBadge = (type: string) => {
    const config = discrepancyTypeConfig[type] || { label: type, color: 'default' as const };
    return (
      <Chip
        size='small'
        color={config.color}
        label={config.label}
        variant='outlined'
      />
    );
  };

  const getWarehouseName = useMemo(() => {
    return (warehouseId: string) => {
      return warehouses.find((w) => w.id === warehouseId)?.name || warehouseId;
    };
  }, [warehouses]);

  const columns: ColumnDef<StockTake>[] = useMemo(
    () => [
      { id: 'stock_take_number', label: '盘点单号', sortable: true },
      {
        id: 'warehouse_id',
        label: '仓库',
        render: (row) => getWarehouseName(row.warehouse_id),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'accuracy_rate',
        label: '准确率',
        render: (row) => (row.accuracy_rate ? `${row.accuracy_rate.toFixed(1)}%` : '-'),
      },
      { id: 'created_at', label: '创建时间' },
    ],
    [getWarehouseName]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: '' },
          { label: '计划中', value: 'planned' },
          { label: '进行中', value: 'in_progress' },
          { label: '已完成', value: 'completed' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const rowActions: RowAction<StockTake>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: '开始',
        icon: <Play size={16} />,
        onClick: (row) => handleStartStockTake(row.id),
        visible: (row: StockTake) => row.status === 'planned',
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDeleteStockTake(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个盘点单吗？',
        visible: (row: StockTake) => row.status === 'planned',
      },
    ],
    [handleViewDetail, handleStartStockTake, handleDeleteStockTake]
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleOpenCreate = () => {
    setNewStockTake({ stock_take_number: '', warehouse_id: '', remarks: '' });
    setShowCreateDialog(true);
  };

  return (
    <PageContainer
      title='盘点管理'
      subtitle='管理库存盘点，记录盘点结果并进行库存调整'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '仓储', href: '/wms' },
          { label: '盘点管理' },
        ]}
        columns={columns}
        data={stockTakes}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索盘点单号...'
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
            label: '创建盘点单',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        emptyMessage='暂无盘点单'
        getRowId={(row) => row.id}
      />

      {/* 新增对话框 */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>创建盘点单</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr' },
              gap: 2,
              py: 2,
            }}
          >
            <TextField
              label='盘点单号 *'
              value={newStockTake.stock_take_number}
              onChange={(e) =>
                setNewStockTake({ ...newStockTake, stock_take_number: e.target.value })
              }
              fullWidth
              size='small'
              placeholder='输入盘点单号'
            />
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>仓库 *</InputLabel>
              <Select
                value={newStockTake.warehouse_id}
                label='仓库 *'
                onChange={(e) => setNewStockTake({ ...newStockTake, warehouse_id: e.target.value })}
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
              label='备注'
              multiline
              rows={3}
              value={newStockTake.remarks || ''}
              onChange={(e) => setNewStockTake({ ...newStockTake, remarks: e.target.value })}
              fullWidth
              size='small'
              placeholder='输入备注信息'
            />
          </Box>
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
            onClick={handleCreateStockTake}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Package size={20} />
          {selectedStockTake?.stock_take_number}
        </DialogTitle>
        <DialogContent sx={{ maxHeight: '80vh', overflow: 'auto' }}>
          {selectedStockTake && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* 统计卡片 */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    仓库
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {getWarehouseName(selectedStockTake.warehouse_id)}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedStockTake.status)}</Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    准确率
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedStockTake.accuracy_rate
                      ? `${selectedStockTake.accuracy_rate.toFixed(1)}%`
                      : '-'}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    差异数量
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                    color={
                      selectedStockTake.discrepancy_quantity !== undefined &&
                      selectedStockTake.discrepancy_quantity !== 0
                        ? selectedStockTake.discrepancy_quantity > 0
                          ? 'success.main'
                          : 'error.main'
                        : 'text.primary'
                    }
                  >
                    {selectedStockTake.discrepancy_quantity || 0}
                  </Typography>
                </Box>
              </Box>

              {/* 盘点明细表格 */}
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant='h6'>盘点明细</Typography>
                  {selectedStockTake.status === 'in_progress' && (
                    <Button
                      variant='outlined'
                      size='small'
                      startIcon={<Edit size={16} />}
                      onClick={handleOpenCountDialog}
                    >
                      录入盘点数量
                    </Button>
                  )}
                </Box>

                <Box sx={{ overflowX: 'auto' }}>
                  <Box sx={{ minWidth: 800 }}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(10, 1fr)',
                        gap: 1,
                        p: 1,
                        bgcolor: 'grey.200',
                        borderRadius: 1,
                      }}
                    >
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        序号
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        物料编码
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        物料名称
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        规格
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        批次
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        系统数量
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        盘点数量
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        差异
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        差异类型
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        差异原因
                      </Typography>
                    </Box>
                    {stockTakeItems.length === 0 ? (
                      <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          暂无盘点明细
                        </Typography>
                      </Box>
                    ) : (
                      stockTakeItems.map((item) => (
                        <Box
                          key={item.id}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(10, 1fr)',
                            gap: 1,
                            p: 1,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            alignItems: 'center',
                          }}
                        >
                          <Typography variant='body2'>{item.line_number}</Typography>
                          <Typography variant='body2'>{item.material_code}</Typography>
                          <Typography variant='body2'>{item.material_name}</Typography>
                          <Typography variant='body2'>{item.specification || '-'}</Typography>
                          <Typography variant='body2'>{item.batch_number || '-'}</Typography>
                          <Typography variant='body2'>{item.system_quantity}</Typography>
                          <Typography variant='body2'>{item.counted_quantity ?? '-'}</Typography>
                          <Typography
                            variant='body2'
                            sx={{
                              color:
                                item.discrepancy_quantity !== undefined
                                  ? item.discrepancy_quantity > 0
                                    ? 'success.main'
                                    : item.discrepancy_quantity < 0
                                      ? 'error.main'
                                      : 'text.primary'
                                  : 'text.primary',
                            }}
                          >
                            {item.discrepancy_quantity !== undefined
                              ? item.discrepancy_quantity
                              : '-'}
                          </Typography>
                          <Box>
                            {item.discrepancy_type
                              ? getDiscrepancyTypeBadge(item.discrepancy_type)
                              : '-'}
                          </Box>
                          <Typography variant='body2'>{item.discrepancy_reason || '-'}</Typography>
                        </Box>
                      ))
                    )}
                  </Box>
                </Box>
              </Box>

              {/* 操作按钮 */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                {selectedStockTake.status === 'in_progress' && (
                  <Button
                    variant='contained'
                    color='success'
                    startIcon={<CheckCircle2 size={16} />}
                    onClick={handleCompleteStockTake}
                  >
                    完成盘点
                  </Button>
                )}
                {selectedStockTake.status === 'completed' && !selectedStockTake.stock_adjusted && (
                  <Button
                    variant='contained'
                    color='warning'
                    startIcon={<Edit size={16} />}
                    onClick={handleAdjustStockTake}
                  >
                    调整库存
                  </Button>
                )}
                {selectedStockTake.status === 'completed' && selectedStockTake.stock_adjusted && (
                  <Chip
                    label='库存已调整'
                    color='success'
                  />
                )}
                <Button
                  variant='outlined'
                  onClick={() => setShowDetailDialog(false)}
                >
                  关闭
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* 录入盘点数量对话框 */}
      <Dialog
        open={showCountDialog}
        onClose={() => setShowCountDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>录入盘点数量</DialogTitle>
        <DialogContent sx={{ maxHeight: '80vh', overflow: 'auto' }}>
          <Box sx={{ minWidth: 600 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 1,
                p: 1,
                bgcolor: 'grey.200',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                物料编码
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                物料名称
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                规格
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                系统数量
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                盘点数量
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600 }}
              >
                差异原因
              </Typography>
            </Box>
            {stockTakeItems.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 1,
                  p: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  alignItems: 'center',
                }}
              >
                <Typography variant='body2'>{item.material_code}</Typography>
                <Typography variant='body2'>{item.material_name}</Typography>
                <Typography variant='body2'>{item.specification || '-'}</Typography>
                <Typography variant='body2'>{item.system_quantity}</Typography>
                <TextField
                  type='number'
                  size='small'
                  defaultValue={item.counted_quantity || ''}
                  onChange={(e) =>
                    setCountValues({
                      ...countValues,
                      [item.id]: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder='输入盘点数量'
                />
                <FormControl size='small'>
                  <Select
                    value={item.discrepancy_reason || ''}
                    onChange={(e) => {
                      const newItems = stockTakeItems.map((i) =>
                        i.id === item.id ? { ...i, discrepancy_reason: e.target.value } : i
                      );
                      setStockTakeItems(newItems);
                    }}
                    displayEmpty
                  >
                    <MenuItem value=''>无</MenuItem>
                    <MenuItem value='damaged'>损坏</MenuItem>
                    <MenuItem value='lost'>丢失</MenuItem>
                    <MenuItem value='miscount'>计数错误</MenuItem>
                    <MenuItem value='other'>其他</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCountDialog(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleCountItems}
          >
            确认盘点
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default StockTakePage;
