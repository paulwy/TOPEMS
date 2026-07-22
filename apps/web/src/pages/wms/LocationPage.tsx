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
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import type {
  Location,
  CreateLocationRequest,
  UpdateLocationRequest,
  Warehouse,
  LocationStatusSummary,
} from '@/api/wms';
import { wmsApi } from '@/api/wms';
import { useNotificationStore } from '@/store';
import { Plus, Edit, Trash2, Eye, MapPin } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ConfirmDialog, PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;



const LocationPage: React.FC = () => {
  const { t } = useTranslation();
  const statusConfig: Record<
    string,
    { label: string; color: 'success' | 'warning' | 'error' | 'default' }
  > = {
    empty: { label: t('wms.location_page.idle'), color: 'success' },
    partially_filled: { label: t('wms.location_page.text_01cdea'), color: 'warning' },
    full: { label: t('wms.location_page.text_822faf'), color: 'error' },
    inactive: { label: t('wms.location_page.action_disable'), color: 'default' },
  };

  const locationTypeConfig: Record<string, string> = {
    storage: t('wms.location_page.text_12b387'),
    picking: t('wms.location_page.text_cb8ea4'),
    receiving: t('wms.location_page.text_d804f0'),
    shipping: t('wms.location_page.text_63e819'),
    staging: t('wms.location_page.text_15dc2f'),
    quarantine: t('wms.location_page.text_c371b5'),
    returned: t('wms.location_page.text_81a3ad'),
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
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null);

  const [newItem, setNewItem] = useState<CreateLocationRequest>({
    code: '',
    name: '',
    warehouse_id: '',
    location_type: 'storage',
    zone_id: '',
    aisle: '',
    row: '',
    column: '',
    layer: '',
    storage_type: '',
    capacity: 0,
    volume: 0,
    weight_limit: 0,
    temperature_zone: '',
    isactive: true,
    barcode: '',
    rfid: '',
    sort_order: 0,
    remarks: '',
  });

  const [editItem, setEditItem] = useState<UpdateLocationRequest>({});

  const { data: locationsData = { items: [], total: 0 }, isLoading: locationsLoading } = useQuery({
    queryKey: ['wms-locations', currentPage, pageSize, searchTerm, statusFilter, warehouseFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { page: currentPage, pagesize: pageSize };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouse_id = warehouseFilter;

      const response = await wmsApi.locations.list(params);
      return response.success && response.data ? response.data : { items: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['wms-warehouses-for-location'],
    queryFn: async () => {
      const response = await wmsApi.warehouses.list({ page: 1, pagesize: 100 });
      return response.success && response.data ? response.data.items || [] : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: statusSummary } = useQuery({
    queryKey: ['wms-location-status-summary', warehouseFilter],
    queryFn: async () => {
      const response = await wmsApi.locations.getStatus(warehouseFilter || undefined);
      return response.success && response.data ? response.data : null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateLocationRequest) => {
      return await wmsApi.locations.create(data);
    },
    onSuccess: (response) => {
      if (response.success) {
        addNotification({ type: 'success', title: t('wms.location_page.create'), message: t('wms.location_page.create_1') });
        setShowCreateDialog(false);
        resetNewItem();
        queryClient.invalidateQueries({ queryKey: ['wms-locations'] });
        queryClient.invalidateQueries({ queryKey: ['wms-location-status-summary'] });
      }
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.location_page.create_2'), error);
      addNotification({ type: 'error', title: t('wms.location_page.create_3'), message: t('wms.location_page.create_4') });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateLocationRequest }) => {
      return await wmsApi.locations.update(id, data);
    },
    onSuccess: (response) => {
      if (response.success) {
        addNotification({ type: 'success', title: t('wms.location_page.update'), message: t('wms.location_page.update_1') });
        setShowEditDialog(false);
        queryClient.invalidateQueries({ queryKey: ['wms-locations'] });
        queryClient.invalidateQueries({ queryKey: ['wms-location-status-summary'] });
      }
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.location_page.update_2'), error);
      addNotification({ type: 'error', title: t('wms.location_page.update_3'), message: t('wms.location_page.update_4') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await wmsApi.locations.delete(id);
    },
    onSuccess: (response) => {
      if (response.success) {
        addNotification({ type: 'success', title: t('wms.location_page.delete_success'), message: t('wms.location_page.deleted') });
        queryClient.invalidateQueries({ queryKey: ['wms-locations'] });
        queryClient.invalidateQueries({ queryKey: ['wms-location-status-summary'] });
      }
    },
    onError: (error: unknown) => {
      apiLogger.error(t('wms.location_page.delete'), error);
      addNotification({ type: 'error', title: t('wms.location_page.delete_1'), message: t('wms.location_page.delete_2') });
    },
  });

  const handleCreate = () => {
    if (!newItem.code || !newItem.name || !newItem.warehouse_id) {
      addNotification({
        type: 'warning',
        title: t('wms.location_page.error'),
        message: t('wms.location_page.location_code'),
      });
      return;
    }
    createMutation.mutate(newItem);
  };

  const handleUpdate = () => {
    if (!selectedLocation) return;
    updateMutation.mutate({ id: selectedLocation.id, data: editItem });
  };

  const handleDeleteClick = (id: string) => {
    setDeleteLocationId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = () => {
    if (!deleteLocationId) return;
    deleteMutation.mutate(deleteLocationId);
    setShowDeleteConfirm(false);
  };

  const handleEdit = (item: Location) => {
    setSelectedLocation(item);
    setEditItem({
      name: item.name,
      zone_id: item.zone_id,
      aisle: item.aisle,
      row: item.row,
      column: item.column,
      layer: item.layer,
      location_type: item.location_type,
      storage_type: item.storage_type,
      capacity: item.capacity,
      volume: item.volume,
      weight_limit: item.weight_limit,
      status: item.status,
      temperature_zone: item.temperature_zone,
      isactive: item.isactive,
      barcode: item.barcode,
      rfid: item.rfid,
      sort_order: item.sort_order,
      remarks: item.remarks,
    });
    setShowEditDialog(true);
  };

  const handleViewDetail = (item: Location) => {
    setSelectedLocation(item);
    setShowDetailDialog(true);
  };

  const resetNewItem = () => {
    setNewItem({
      code: '',
      name: '',
      warehouse_id: '',
      location_type: 'storage',
      zone_id: '',
      aisle: '',
      row: '',
      column: '',
      layer: '',
      storage_type: '',
      capacity: 0,
      volume: 0,
      weight_limit: 0,
      temperature_zone: '',
      isactive: true,
      barcode: '',
      rfid: '',
      sort_order: 0,
      remarks: '',
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

  const getWarehouseName = useMemo(() => {
    return (warehouseId: string) => {
      return warehouses.find((w) => w.id === warehouseId)?.name || warehouseId;
    };
  }, [warehouses]);

  const columns: ColumnDef<Location>[] = useMemo(
    () => [
      { id: 'code', label: t('wms.location_page.column_location_code'), sortable: true },
      { id: 'name', label: t('wms.location_page.column_location_name'), sortable: true },
      { id: 'warehouse_id', label: t('wms.location_page.filter_warehouse'), render: (row) => getWarehouseName(row.warehouse_id) },
      { id: 'zone_name', label: t('wms.location_page.zone') },
      {
        id: 'location_type',
        label: t('wms.location_page.type'),
        render: (row) => locationTypeConfig[row.location_type] || row.location_type,
      },
      { id: 'status', label: t('wms.location_page.filter_status'), render: (row) => getStatusBadge(row.status) },
      { id: 'capacity', label: t('wms.location_page.field_capacity') },
      { id: 'occupied_quantity', label: t('wms.location_page.status_occupied') },
    ],
    [getWarehouseName]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('wms.location_page.filter_status'),
        type: 'select',
        options: [
          { label: t('wms.location_page.filter_option_all_status'), value: '' },
          { label: t('wms.location_page.idle'), value: 'empty' },
          { label: t('wms.location_page.text_01cdea'), value: 'partially_filled' },
          { label: t('wms.location_page.text_822faf'), value: 'full' },
          { label: t('wms.location_page.action_disable'), value: 'inactive' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
      {
        id: 'warehouse_id',
        label: t('wms.location_page.filter_warehouse'),
        type: 'select',
        options: [
          { label: t('wms.location_page.filter_option_all_warehouse'), value: '' },
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

  const rowActions: RowAction<Location>[] = useMemo(
    () => [
      { label: t('wms.location_page.action_view_detail'), icon: <Eye size={16} />, onClick: handleViewDetail },
      { label: t('wms.location_page.action_edit'), icon: <Edit size={16} />, onClick: handleEdit },
      {
        label: t('wms.location_page.action_delete'),
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
          库位总数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {locationsData.total}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          空闲库位
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'success.dark' }}
        >
          {statusSummary?.empty_locations || 0}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          部分占用
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'warning.dark' }}
        >
          {statusSummary?.partially_filled || 0}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已满库位
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'error.dark' }}
        >
          {statusSummary?.full_locations || 0}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title={t('wms.location_page.breadcrumb_current')}
      subtitle={t('wms.location_page.location_code_1')}
      headerProps={{
        pageIcon: <MapPin style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main}, ${ct.success.dark})`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('wms.location_page.breadcrumb_home'), href: '/dashboard' },
          { label: t('wms.location_page.breadcrumb_module'), href: '/wms' },
          { label: t('wms.location_page.breadcrumb_current') },
        ]}
        columns={columns}
        data={locationsData.items}
        loading={locationsLoading}
        filters={filters}
        searchable
        searchPlaceholder={t('wms.location_page.location_code_2')}
        onSearch={handleSearch}
        searchValue={searchTerm}
        pagination={{
          page: currentPage,
          pageSize,
          total: locationsData.total,
          onPageChange: setCurrentPage,
        }}
        actions={[{ label: t('wms.location_page.dialog_create_title'), icon: <Plus size={16} />, onClick: handleOpenCreate }]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={t('wms.location_page.empty_message')}
        getRowId={(row) => row.id}
        mobileCardTitleKey='name'
        mobileCardSubtitleKey='code'
        mobileCardDisplayFields={['warehouse_name', 'zone_name', 'capacity', 'status']}
        mobileCardFieldLabels={{
          warehouse_name: t('wms.location_page.filter_warehouse'),
          zone_name: t('wms.location_page.zone'),
          capacity: t('wms.location_page.field_capacity'),
          status: t('wms.location_page.filter_status'),
        }}
      />

      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增库位</DialogTitle>
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
              label={t('wms.location_page.field_location_code_required')}
              value={newItem.code}
              onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
              fullWidth
              required
              size='small'
            />
            <TextField
              label={t('wms.location_page.field_location_name_required')}
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              fullWidth
              required
              size='small'
            />
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>仓库 *</InputLabel>
              <Select
                value={newItem.warehouse_id}
                label={t('wms.location_page.warehouse')}
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
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>库位类型</InputLabel>
              <Select
                value={newItem.location_type}
                label={t('wms.location_page.field_location_type')}
                onChange={(e) => setNewItem({ ...newItem, location_type: e.target.value })}
              >
                {Object.entries(locationTypeConfig).map(([key, label]) => (
                  <MenuItem
                    key={key}
                    value={key}
                  >
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t('wms.location_page.zone')}
              value={newItem.zone_id}
              onChange={(e) => setNewItem({ ...newItem, zone_id: e.target.value })}
              fullWidth
              size='small'
            />
            <TextField
              label={t('wms.location_page.text_e4f52e')}
              value={newItem.aisle}
              onChange={(e) => setNewItem({ ...newItem, aisle: e.target.value })}
              fullWidth
              size='small'
            />
            <TextField
              label={t('wms.location_page.field_row')}
              value={newItem.row}
              onChange={(e) => setNewItem({ ...newItem, row: e.target.value })}
              fullWidth
              size='small'
            />
            <TextField
              label={t('wms.location_page.field_column')}
              value={newItem.column}
              onChange={(e) => setNewItem({ ...newItem, column: e.target.value })}
              fullWidth
              size='small'
            />
            <TextField
              label={t('wms.location_page.field_layer')}
              value={newItem.layer}
              onChange={(e) => setNewItem({ ...newItem, layer: e.target.value })}
              fullWidth
              size='small'
            />
            <TextField
              label={t('wms.location_page.field_capacity')}
              type='number'
              value={newItem.capacity}
              onChange={(e) =>
                setNewItem({ ...newItem, capacity: parseFloat(e.target.value) || 0 })
              }
              fullWidth
              size='small'
            />
            <TextField
              label={t('wms.location_page.text_972d5f')}
              type='number'
              value={newItem.volume}
              onChange={(e) => setNewItem({ ...newItem, volume: parseFloat(e.target.value) || 0 })}
              fullWidth
              size='small'
            />
            <TextField
              label={t('wms.location_page.text_0115ce')}
              type='number'
              value={newItem.weight_limit}
              onChange={(e) =>
                setNewItem({ ...newItem, weight_limit: parseFloat(e.target.value) || 0 })
              }
              fullWidth
              size='small'
            />
            <TextField
              label={t('wms.location_page.text_2d07cc')}
              value={newItem.temperature_zone}
              onChange={(e) => setNewItem({ ...newItem, temperature_zone: e.target.value })}
              fullWidth
              size='small'
              placeholder={t('wms.location_page.text_4c69af')}
            />
            <TextField
              label={t('wms.location_page.text_39f76a')}
              value={newItem.barcode}
              onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
              fullWidth
              size='small'
            />
            <TextField
              label='RFID'
              value={newItem.rfid}
              onChange={(e) => setNewItem({ ...newItem, rfid: e.target.value })}
              fullWidth
              size='small'
            />
            <TextField
              label={t('wms.location_page.remark')}
              value={newItem.remarks}
              onChange={(e) => setNewItem({ ...newItem, remarks: e.target.value })}
              fullWidth
              size='small'
              multiline
              rows={2}
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
            onClick={handleCreate}
            disabled={createMutation.isPending}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>编辑库位</DialogTitle>
        <DialogContent>
          {selectedLocation && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 2,
                py: 2,
              }}
            >
              <TextField
                label={t('wms.location_page.column_location_code')}
                value={selectedLocation.code}
                fullWidth
                size='small'
                disabled
              />
              <TextField
                label={t('wms.location_page.column_location_name')}
                value={editItem.name || ''}
                onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                fullWidth
                size='small'
              />
              <FormControl
                fullWidth
                size='small'
              >
                <InputLabel>状态</InputLabel>
                <Select
                  value={editItem.status || ''}
                  label={t('wms.location_page.filter_status')}
                  onChange={(e) => setEditItem({ ...editItem, status: e.target.value })}
                >
                  <MenuItem value='empty'>空闲</MenuItem>
                  <MenuItem value='partially_filled'>部分占用</MenuItem>
                  <MenuItem value='full'>已满</MenuItem>
                  <MenuItem value='inactive'>停用</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={t('wms.location_page.field_capacity')}
                type='number'
                value={editItem.capacity ?? ''}
                onChange={(e) =>
                  setEditItem({ ...editItem, capacity: parseFloat(e.target.value) || 0 })
                }
                fullWidth
                size='small'
              />
              <TextField
                label={t('wms.location_page.text_972d5f')}
                type='number'
                value={editItem.volume ?? ''}
                onChange={(e) =>
                  setEditItem({ ...editItem, volume: parseFloat(e.target.value) || 0 })
                }
                fullWidth
                size='small'
              />
              <TextField
                label={t('wms.location_page.text_0115ce')}
                type='number'
                value={editItem.weight_limit ?? ''}
                onChange={(e) =>
                  setEditItem({ ...editItem, weight_limit: parseFloat(e.target.value) || 0 })
                }
                fullWidth
                size='small'
              />
              <TextField
                label={t('wms.location_page.text_2d07cc')}
                value={editItem.temperature_zone || ''}
                onChange={(e) => setEditItem({ ...editItem, temperature_zone: e.target.value })}
                fullWidth
                size='small'
              />
              <TextField
                label={t('wms.location_page.text_39f76a')}
                value={editItem.barcode || ''}
                onChange={(e) => setEditItem({ ...editItem, barcode: e.target.value })}
                fullWidth
                size='small'
              />
              <TextField
                label='RFID'
                value={editItem.rfid || ''}
                onChange={(e) => setEditItem({ ...editItem, rfid: e.target.value })}
                fullWidth
                size='small'
              />
              <TextField
                label={t('wms.location_page.remark')}
                value={editItem.remarks || ''}
                onChange={(e) => setEditItem({ ...editItem, remarks: e.target.value })}
                fullWidth
                size='small'
                multiline
                rows={2}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowEditDialog(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleUpdate}
            disabled={updateMutation.isPending}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>库位详情</DialogTitle>
        <DialogContent>
          {selectedLocation && (
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
                    库位编码
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedLocation.code}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    库位名称
                  </Typography>
                  <Typography variant='body1'>{selectedLocation.name}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    仓库
                  </Typography>
                  <Typography variant='body1'>
                    {getWarehouseName(selectedLocation.warehouse_id)}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    库区
                  </Typography>
                  <Typography variant='body1'>{selectedLocation.zone_name || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    库位类型
                  </Typography>
                  <Typography variant='body1'>
                    {locationTypeConfig[selectedLocation.location_type] ||
                      selectedLocation.location_type}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedLocation.status)}</Box>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    容量
                  </Typography>
                  <Typography variant='body1'>{selectedLocation.capacity || 0}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    已占用
                  </Typography>
                  <Typography variant='body1'>{selectedLocation.occupied_quantity || 0}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    可用容量
                  </Typography>
                  <Typography variant='body1'>
                    {selectedLocation.available_capacity || 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    温度区间
                  </Typography>
                  <Typography variant='body1'>
                    {selectedLocation.temperature_zone || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    条码
                  </Typography>
                  <Typography variant='body1'>{selectedLocation.barcode || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    RFID
                  </Typography>
                  <Typography variant='body1'>{selectedLocation.rfid || '-'}</Typography>
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
        title={t('wms.location_page.dialog_delete_title')}
        message={t('wms.location_page.confirm')}
        danger
      />
    </PageContainer>
  );
};

export default LocationPage;
