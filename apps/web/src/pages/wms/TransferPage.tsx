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
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import type { TransferOrder, CreateTransferOrderRequest, Warehouse } from '@/api/wms';
import { wmsApi } from '@/api/wms';
import { useNotificationStore } from '@/store';
import { Plus, Edit, Trash2, Eye, ArrowRightLeft, Check, Truck, Package } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ConfirmDialog, PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;




const TransferPage: React.FC = () => {
  const { t } = useTranslation();
  const statusConfig: Record<
    string,
    { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }
  > = {
    pending: { label: t('wms.transfer_page.pending'), color: 'warning' },
    confirmed: { label: t('wms.transfer_page.confirmed'), color: 'info' },
    shipped: { label: t('wms.transfer_page.text_355409'), color: 'info' },
    received: { label: t('wms.transfer_page.text_43ad19'), color: 'success' },
    completed: { label: t('wms.transfer_page.status_completed'), color: 'success' },
    cancelled: { label: t('wms.transfer_page.status_cancelled'), color: 'error' },
  };
  const priorityConfig: Record<
    string,
    { label: string; color: 'error' | 'warning' | 'info' | 'default' }
  > = {
    urgent: { label: t('wms.transfer_page.text_cb0ed5'), color: 'error' },
    high: { label: t('wms.transfer_page.text_4296d7'), color: 'warning' },
    normal: { label: t('wms.transfer_page.text_35242c'), color: 'info' },
    low: { label: t('wms.transfer_page.text_19ac67'), color: 'default' },
  };

  const transferTypeConfig: Record<string, string> = {
    internal: t('wms.transfer_page.transfer'),
    external: t('wms.transfer_page.transfer_1'),
    return: t('wms.transfer_page.transfer_2'),
  };

  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferOrder | null>(null);
  const [deleteTransferId, setDeleteTransferId] = useState<string | null>(null);

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

  const { data: transfersData = { items: [], total: 0 }, isLoading: transfersLoading } = useQuery({
    queryKey: ['wms-transfers', currentPage, pageSize, searchTerm, statusFilter, warehouseFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { page: currentPage, pagesize: pageSize };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouse_id = warehouseFilter;

      const response = await wmsApi.transfers.list(params);
      return response.success && response.data ? response.data : { items: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['wms-warehouses-for-transfer'],
    queryFn: async () => {
      const response = await wmsApi.warehouses.list({ page: 1, pagesize: 100 });
      return response.success && response.data ? response.data.items || [] : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateTransferOrderRequest) => {
      return await wmsApi.transfers.create(data);
    },
    onSuccess: (response) => {
      if (response.success) {
        addNotification({ type: 'success', title: t('wms.transfer_page.create'), message: t('wms.transfer_page.create_1') });
        setShowCreateDialog(false);
        resetNewItem();
        queryClient.invalidateQueries({ queryKey: ['wms-transfers'] });
      }
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.transfer_page.create_2'), error);
      addNotification({ type: 'error', title: t('wms.transfer_page.create_3'), message: t('wms.transfer_page.create_4') });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      return await wmsApi.transfers.confirm(id);
    },
    onSuccess: (response) => {
      if (response.success) {
        addNotification({ type: 'success', title: t('wms.transfer_page.success'), message: t('wms.transfer_page.confirmed_1') });
        queryClient.invalidateQueries({ queryKey: ['wms-transfers'] });
      }
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.transfer_page.fail'), error);
      addNotification({ type: 'error', title: t('wms.transfer_page.fail_1'), message: t('wms.transfer_page.fail_2') });
    },
  });

  const shipMutation = useMutation({
    mutationFn: async (id: string) => {
      return await wmsApi.transfers.ship(id);
    },
    onSuccess: (response) => {
      if (response.success) {
        addNotification({ type: 'success', title: t('wms.transfer_page.success_1'), message: t('wms.transfer_page.transfer_3') });
        queryClient.invalidateQueries({ queryKey: ['wms-transfers'] });
      }
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.transfer_page.fail_3'), error);
      addNotification({ type: 'error', title: t('wms.transfer_page.fail_4'), message: t('wms.transfer_page.fail_4') });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await wmsApi.transfers.receive(id);
    },
    onSuccess: (response) => {
      if (response.success) {
        addNotification({ type: 'success', title: t('wms.transfer_page.success_2'), message: t('wms.transfer_page.transfer_4') });
        queryClient.invalidateQueries({ queryKey: ['wms-transfers'] });
      }
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.transfer_page.fail_5'), error);
      addNotification({ type: 'error', title: t('wms.transfer_page.fail_6'), message: t('wms.transfer_page.fail_6') });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await wmsApi.transfers.complete(id);
    },
    onSuccess: (response) => {
      if (response.success) {
        addNotification({ type: 'success', title: t('wms.transfer_page.success_3'), message: t('wms.transfer_page.completed') });
        queryClient.invalidateQueries({ queryKey: ['wms-transfers'] });
      }
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.transfer_page.fail_7'), error);
      addNotification({ type: 'error', title: t('wms.transfer_page.fail_8'), message: t('wms.transfer_page.fail_9') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await wmsApi.transfers.delete(id);
    },
    onSuccess: (response) => {
      if (response.success) {
        addNotification({ type: 'success', title: t('wms.transfer_page.delete_success'), message: t('wms.transfer_page.deleted') });
        queryClient.invalidateQueries({ queryKey: ['wms-transfers'] });
      }
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.transfer_page.delete'), error);
      addNotification({ type: 'error', title: t('wms.transfer_page.delete_1'), message: t('wms.transfer_page.delete_2') });
    },
  });

  const handleCreate = () => {
    if (!newItem.from_warehouse_id || !newItem.to_warehouse_id) {
      addNotification({
        type: 'warning',
        title: t('wms.transfer_page.error'),
        message: t('wms.transfer_page.please_fill'),
      });
      return;
    }
    createMutation.mutate(newItem);
  };

  const handleConfirm = (id: string) => {
    confirmMutation.mutate(id);
  };

  const handleShip = (id: string) => {
    shipMutation.mutate(id);
  };

  const handleReceive = (id: string) => {
    receiveMutation.mutate(id);
  };

  const handleComplete = (id: string) => {
    completeMutation.mutate(id);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTransferId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = () => {
    if (!deleteTransferId) return;
    deleteMutation.mutate(deleteTransferId);
    setShowDeleteConfirm(false);
  };

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
      { id: 'order_number', label: t('wms.transfer_page.column_transfer_number'), sortable: true },
      {
        id: 'transfer_type',
        label: t('wms.transfer_page.field_transfer_type'),
        render: (row) => transferTypeConfig[row.transfer_type] || row.transfer_type,
      },
      {
        id: 'from_warehouse_id',
        label: t('wms.transfer_page.warehouse'),
        render: (row) => getWarehouseName(row.from_warehouse_id),
      },
      {
        id: 'to_warehouse_id',
        label: t('wms.transfer_page.warehouse_1'),
        render: (row) => getWarehouseName(row.to_warehouse_id),
      },
      { id: 'total_quantity', label: t('wms.transfer_page.column_total_quantity') },
      {
        id: 'priority',
        label: t('wms.transfer_page.text_ee8ecb'),
        render: (row) => getPriorityBadge(row.priority || 'normal'),
      },
      {
        id: 'status',
        label: t('wms.transfer_page.filter_status'),
        render: (row) => getStatusBadge(row.status),
      },
      { id: 'planned_date', label: t('wms.transfer_page.date') },
    ],
    [getWarehouseName]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('wms.transfer_page.filter_status'),
        type: 'select',
        options: [
          { label: t('wms.transfer_page.filter_option_all_status'), value: '' },
          { label: t('wms.transfer_page.pending'), value: 'pending' },
          { label: t('wms.transfer_page.confirmed'), value: 'confirmed' },
          { label: t('wms.transfer_page.text_355409'), value: 'shipped' },
          { label: t('wms.transfer_page.text_43ad19'), value: 'received' },
          { label: t('wms.transfer_page.status_completed'), value: 'completed' },
          { label: t('wms.transfer_page.status_cancelled'), value: 'cancelled' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
      {
        id: 'warehouse_id',
        label: t('wms.transfer_page.warehouse_2'),
        type: 'select',
        options: [
          { label: t('wms.transfer_page.all'), value: '' },
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

  const renderRowActions = useMemo(
    () =>
      (row: TransferOrder): React.ReactNode => {
        const actions: RowAction<TransferOrder>[] = [
          { label: t('wms.transfer_page.action_view_detail'), icon: <Eye size={16} />, onClick: () => handleViewDetail(row) },
        ];

        if (row.status === 'pending') {
          actions.push({
            label: t('wms.transfer_page.confirm'),
            icon: <Check size={16} />,
            onClick: () => handleConfirm(row.id),
          });
        }

        if (row.status === 'confirmed') {
          actions.push({
            label: t('wms.transfer_page.text_045315'),
            icon: <Truck size={16} />,
            onClick: () => handleShip(row.id),
          });
        }

        if (row.status === 'shipped') {
          actions.push({
            label: t('wms.transfer_page.text_430f7d'),
            icon: <Package size={16} />,
            onClick: () => handleReceive(row.id),
          });
        }

        if (row.status === 'received') {
          actions.push({
            label: t('wms.transfer_page.completed_1'),
            icon: <Check size={16} />,
            onClick: () => handleComplete(row.id),
          });
        }

        if (row.status === 'pending' || row.status === 'cancelled') {
          actions.push({
            label: t('wms.transfer_page.action_delete'),
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
    []
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
          {transfersData.total}
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
          {transfersData.items.filter((t) => t.status === 'pending').length}
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
          {transfersData.items.filter((t) => t.status === 'shipped').length}
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
          {transfersData.items.filter((t) => t.status === 'completed').length}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title={t('wms.transfer_page.transfer_5')}
      subtitle={t('wms.transfer_page.transfer_inbound')}
      headerProps={{
        pageIcon: <ArrowRightLeft style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main}, ${ct.secondary.dark})`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('wms.transfer_page.breadcrumb_home'), href: '/dashboard' },
          { label: t('wms.transfer_page.breadcrumb_module'), href: '/wms' },
          { label: t('wms.transfer_page.transfer_5') },
        ]}
        columns={columns}
        data={transfersData.items}
        loading={transfersLoading}
        filters={filters}
        searchable
        searchPlaceholder={t('wms.transfer_page.search_placeholder')}
        onSearch={handleSearch}
        searchValue={searchTerm}
        pagination={{
          page: currentPage,
          pageSize,
          total: transfersData.total,
          onPageChange: setCurrentPage,
        }}
        actions={[{ label: t('wms.transfer_page.dialog_create_title'), icon: <Plus size={16} />, onClick: handleOpenCreate }]}
        renderRowActions={renderRowActions}
        headerContent={statsContent}
        emptyMessage={t('wms.transfer_page.empty_message')}
        getRowId={(row) => row.id}
      />

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
                label={t('wms.transfer_page.field_transfer_type')}
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
                label={t('wms.transfer_page.text_ee8ecb')}
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
                label={t('wms.transfer_page.warehouse_3')}
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
                label={t('wms.transfer_page.warehouse_4')}
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
              label={t('wms.transfer_page.date')}
              type='date'
              value={newItem.planned_date}
              onChange={(e) => setNewItem({ ...newItem, planned_date: e.target.value })}
              fullWidth
              size='small'
              slotProps={{ inputLabel: { shrink: true } } as const}
            />
            <TextField
              label={t('wms.transfer_page.text_c1451d')}
              value={newItem.transporter}
              onChange={(e) => setNewItem({ ...newItem, transporter: e.target.value })}
              fullWidth
              size='small'
            />
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                label={t('wms.transfer_page.field_remark')}
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
            disabled={createMutation.isPending}
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

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('wms.transfer_page.dialog_delete_title')}
        message={t('wms.transfer_page.confirm_1')}
        danger
      />
    </PageContainer>
  );
};

export default TransferPage;
