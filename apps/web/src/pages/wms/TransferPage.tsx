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
  Stack,
  Button,
  IconButton,
} from '@mui/material';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import type { TransferOrder, CreateTransferOrderRequest, Warehouse } from '@/api/wms';
import { wmsApi } from '@/api/wms';
import { useAppStore } from '@/store';
import { Plus, Edit, Trash2, Eye, ArrowRightLeft, Check, Truck, Package } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ConfirmDialog, PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const statusConfig: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }
> = {
  pending: { label: '待处理', color: 'warning' },
  confirmed: { label: '已确认', color: 'info' },
  shipped: { label: '已发货', color: 'info' },
  received: { label: '已收货', color: 'success' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'error' },
};

const transferTypeConfig: Record<string, string> = {
  internal: '内部调拨',
  external: '外部调拨',
  return: '退货调拨',
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

const TransferPage: React.FC = () => {
  const { addNotification } = useAppStore();

  const [transfers, setTransfers] = useState<TransferOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferOrder | null>(null);
  const [deleteTransferId, setDeleteTransferId] = useState<string | null>(null);

  // Form states
  const [newItem, setNewItem] = useState<CreateTransferOrderRequest>({
    transfer_type: 'internal',
    from_warehouse_id: '',
    from_location_id: '',
    to_warehouse_id: '',
    to_location_id: '',
    planned_date: '',
    transporter: '',
    priority: 'normal',
    remarks: '',
    items: [],
  });

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouse_id = warehouseFilter;

      const response = await wmsApi.transfers.list(params);
      if (response.success && response.data) {
        setTransfers(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('获取调拨单列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载调拨单列表',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, warehouseFilter, addNotification]);

  const fetchWarehouses = async () => {
    try {
      const response = await wmsApi.warehouses.list({ page: 1, pagesize: 100 });
      if (response.success && response.data) {
        setWarehouses(response.data.items || []);
      }
    } catch (error: unknown) {
      apiLogger.error('获取仓库列表失败:', error);
    }
  };

  useEffect(() => {
    fetchTransfers();
    fetchWarehouses();
  }, [fetchTransfers]);

  const handleCreate = async () => {
    if (!newItem.from_warehouse_id || !newItem.to_warehouse_id) {
      addNotification({
        type: 'warning',
        title: '验证错误',
        message: '请填写必要信息（源仓库、目标仓库）',
      });
      return;
    }

    try {
      const response = await wmsApi.transfers.create(newItem);
      if (response.success) {
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '调拨单已创建',
        });
        setShowCreateDialog(false);
        resetNewItem();
        fetchTransfers();
      }
    } catch (error: unknown) {
      apiLogger.error('创建调拨单失败:', error);
      addNotification({
        type: 'error',
        title: '创建失败',
        message: '创建调拨单失败',
      });
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      const response = await wmsApi.transfers.confirm(id);
      if (response.success) {
        addNotification({
          type: 'success',
          title: '确认成功',
          message: '调拨单已确认',
        });
        fetchTransfers();
      }
    } catch (error: unknown) {
      apiLogger.error('确认调拨单失败:', error);
      addNotification({
        type: 'error',
        title: '确认失败',
        message: '确认调拨单失败',
      });
    }
  };

  const handleShip = async (id: string) => {
    try {
      const response = await wmsApi.transfers.ship(id);
      if (response.success) {
        addNotification({
          type: 'success',
          title: '发货成功',
          message: '调拨单已发货',
        });
        fetchTransfers();
      }
    } catch (error: unknown) {
      apiLogger.error('发货失败:', error);
      addNotification({
        type: 'error',
        title: '发货失败',
        message: '发货失败',
      });
    }
  };

  const handleReceive = async (id: string) => {
    try {
      const response = await wmsApi.transfers.receive(id);
      if (response.success) {
        addNotification({
          type: 'success',
          title: '收货成功',
          message: '调拨单已收货',
        });
        fetchTransfers();
      }
    } catch (error: unknown) {
      apiLogger.error('收货失败:', error);
      addNotification({
        type: 'error',
        title: '收货失败',
        message: '收货失败',
      });
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const response = await wmsApi.transfers.complete(id);
      if (response.success) {
        addNotification({
          type: 'success',
          title: '完成成功',
          message: '调拨单已完成',
        });
        fetchTransfers();
      }
    } catch (error: unknown) {
      apiLogger.error('完成调拨单失败:', error);
      addNotification({
        type: 'error',
        title: '完成失败',
        message: '完成调拨单失败',
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTransferId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = useCallback(async () => {
    if (!deleteTransferId) return;

    try {
      const response = await wmsApi.transfers.delete(deleteTransferId);
      if (response.success) {
        addNotification({
          type: 'success',
          title: '删除成功',
          message: '调拨单已删除',
        });
        fetchTransfers();
      }
    } catch (error: unknown) {
      apiLogger.error('删除调拨单失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '删除调拨单失败',
      });
    }
  }, [addNotification, fetchTransfers, deleteTransferId]);

  const handleViewDetail = (item: TransferOrder) => {
    setSelectedTransfer(item);
    setShowDetailDialog(true);
  };

  const resetNewItem = () => {
    setNewItem({
      transfer_type: 'internal',
      from_warehouse_id: '',
      from_location_id: '',
      to_warehouse_id: '',
      to_location_id: '',
      planned_date: '',
      transporter: '',
      priority: 'normal',
      remarks: '',
      items: [],
    });
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

  const getPriorityBadge = (priority: string) => {
    const config = priorityConfig[priority] || { label: priority, color: 'default' as const };
    return (
      <Chip
        size='small'
        color={config.color}
        label={config.label}
        variant='filled'
      />
    );
  };

  const getWarehouseName = useMemo(() => {
    return (warehouseId: string) => {
      return warehouses.find((w) => w.id === warehouseId)?.name || warehouseId;
    };
  }, [warehouses]);

  const columns: ColumnDef<TransferOrder>[] = useMemo(
    () => [
      { id: 'order_number', label: '调拨单号', sortable: true },
      {
        id: 'transfer_type',
        label: '调拨类型',
        render: (row) => transferTypeConfig[row.transfer_type] || row.transfer_type,
      },
      {
        id: 'from_warehouse_id',
        label: '源仓库',
        render: (row) => getWarehouseName(row.from_warehouse_id),
      },
      {
        id: 'to_warehouse_id',
        label: '目标仓库',
        render: (row) => getWarehouseName(row.to_warehouse_id),
      },
      { id: 'total_quantity', label: '总数量' },
      {
        id: 'priority',
        label: '优先级',
        render: (row) => getPriorityBadge(row.priority || 'normal'),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
      { id: 'planned_date', label: '计划日期' },
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
          { label: '待处理', value: 'pending' },
          { label: '已确认', value: 'confirmed' },
          { label: '已发货', value: 'shipped' },
          { label: '已收货', value: 'received' },
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
        onChange: (value: unknown) => {
          setWarehouseFilter((value as string) ?? '');
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter, warehouseFilter, warehouses]
  );

  const renderRowActions = useCallback(
    (row: TransferOrder): React.ReactNode => {
      const actions: RowAction<TransferOrder>[] = [
        {
          label: '查看详情',
          icon: <Eye size={16} />,
          onClick: () => handleViewDetail(row),
        },
      ];

      if (row.status === 'pending') {
        actions.push({
          label: '确认',
          icon: <Check size={16} />,
          onClick: () => handleConfirm(row.id),
        });
      }

      if (row.status === 'confirmed') {
        actions.push({
          label: '发货',
          icon: <Truck size={16} />,
          onClick: () => handleShip(row.id),
        });
      }

      if (row.status === 'shipped') {
        actions.push({
          label: '收货',
          icon: <Package size={16} />,
          onClick: () => handleReceive(row.id),
        });
      }

      if (row.status === 'received') {
        actions.push({
          label: '完成',
          icon: <Check size={16} />,
          onClick: () => handleComplete(row.id),
        });
      }

      if (row.status === 'pending' || row.status === 'cancelled') {
        actions.push({
          label: '删除',
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
    [handleConfirm, handleShip, handleReceive, handleComplete, handleDeleteClick]
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
          调拨单总数
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
          待处理
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'warning.dark' }}
        >
          {transfers.filter((t) => t.status === 'pending').length}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已发货
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'info.dark' }}
        >
          {transfers.filter((t) => t.status === 'shipped').length}
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
          {transfers.filter((t) => t.status === 'completed').length}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='库存调拨'
      subtitle='管理库存调拨单，包括调拨出库、调拨入库等'
      headerProps={{
        pageIcon: <ArrowRightLeft style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main}, ${ct.secondary.dark})`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '仓储', href: '/wms' },
          { label: '库存调拨' },
        ]}
        columns={columns}
        data={transfers}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索调拨单号...'
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
            label: '新增调拨',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        renderRowActions={renderRowActions}
        headerContent={statsContent}
        emptyMessage='暂无调拨单数据'
        getRowId={(row) => row.id}
      />

      {/* 新增对话框 */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增调拨单</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 2,
              py: 2,
            }}
          >
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>调拨类型</InputLabel>
              <Select
                value={newItem.transfer_type}
                label='调拨类型'
                onChange={(e) => setNewItem({ ...newItem, transfer_type: e.target.value })}
              >
                {Object.entries(transferTypeConfig).map(([key, label]) => (
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
              <InputLabel>优先级</InputLabel>
              <Select
                value={newItem.priority}
                label='优先级'
                onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
              >
                {Object.entries(priorityConfig).map(([key, config]) => (
                  <MenuItem
                    key={key}
                    value={key}
                  >
                    {config.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>源仓库 *</InputLabel>
              <Select
                value={newItem.from_warehouse_id}
                label='源仓库 *'
                onChange={(e) => setNewItem({ ...newItem, from_warehouse_id: e.target.value })}
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
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>目标仓库 *</InputLabel>
              <Select
                value={newItem.to_warehouse_id}
                label='目标仓库 *'
                onChange={(e) => setNewItem({ ...newItem, to_warehouse_id: e.target.value })}
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
              label='计划日期'
              type='date'
              value={newItem.planned_date}
              onChange={(e) => setNewItem({ ...newItem, planned_date: e.target.value })}
              fullWidth
              size='small'
              slotProps={{ inputLabel: { shrink: true } } as any}
            />
            <TextField
              label='承运人'
              value={newItem.transporter}
              onChange={(e) => setNewItem({ ...newItem, transporter: e.target.value })}
              fullWidth
              size='small'
            />
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                label='备注'
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
            提示：调拨单物料需要在详情页中添加
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
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>调拨单详情</DialogTitle>
        <DialogContent>
          {selectedTransfer && (
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
                    调拨单号
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedTransfer.order_number}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    调拨类型
                  </Typography>
                  <Typography variant='body1'>
                    {transferTypeConfig[selectedTransfer.transfer_type] ||
                      selectedTransfer.transfer_type}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    源仓库
                  </Typography>
                  <Typography variant='body1'>
                    {getWarehouseName(selectedTransfer.from_warehouse_id)}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    源库位
                  </Typography>
                  <Typography variant='body1'>
                    {selectedTransfer.from_location_code || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    目标仓库
                  </Typography>
                  <Typography variant='body1'>
                    {getWarehouseName(selectedTransfer.to_warehouse_id)}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    目标库位
                  </Typography>
                  <Typography variant='body1'>
                    {selectedTransfer.to_location_code || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    优先级
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {getPriorityBadge(selectedTransfer.priority || 'normal')}
                  </Box>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedTransfer.status)}</Box>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    总数量
                  </Typography>
                  <Typography variant='body1'>{selectedTransfer.total_quantity || 0}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    计划日期
                  </Typography>
                  <Typography variant='body1'>
                    {selectedTransfer.planned_date
                      ? new Date(selectedTransfer.planned_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    承运人
                  </Typography>
                  <Typography variant='body1'>{selectedTransfer.transporter || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    物流单号
                  </Typography>
                  <Typography variant='body1'>{selectedTransfer.tracking_number || '-'}</Typography>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    备注
                  </Typography>
                  <Typography variant='body1'>{selectedTransfer.remarks || '-'}</Typography>
                </Box>
              </Box>

              {/* 操作时间线 */}
              {(selectedTransfer.shipped_at ||
                selectedTransfer.received_at ||
                selectedTransfer.approved_at) && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ mb: 1 }}
                  >
                    操作记录
                  </Typography>
                  <Stack spacing={1}>
                    {selectedTransfer.approved_at && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {new Date(selectedTransfer.approved_at).toLocaleString('zh-CN')}
                        </Typography>
                        <Typography variant='caption'>已确认</Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          by {selectedTransfer.approved_by || '-'}
                        </Typography>
                      </Box>
                    )}
                    {selectedTransfer.shipped_at && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {new Date(selectedTransfer.shipped_at).toLocaleString('zh-CN')}
                        </Typography>
                        <Typography variant='caption'>已发货</Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          by {selectedTransfer.shipped_by || '-'}
                        </Typography>
                      </Box>
                    )}
                    {selectedTransfer.received_at && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {new Date(selectedTransfer.received_at).toLocaleString('zh-CN')}
                        </Typography>
                        <Typography variant='caption'>已收货</Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          by {selectedTransfer.received_by || '-'}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Box>
              )}
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

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title='确认删除'
        message='确定要删除这个调拨单吗？此操作不可撤销。'
        danger
      />
    </PageContainer>
  );
};

export default TransferPage;
