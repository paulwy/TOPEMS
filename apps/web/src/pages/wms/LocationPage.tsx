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
} from '@mui/material';
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
import { useAppStore } from '@/store';
import { Plus, Edit, Trash2, Eye, MapPin } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ConfirmDialog, PageContainer } from '@/components/common';

const statusConfig: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  empty: { label: '空闲', color: 'success' },
  partially_filled: { label: '部分占用', color: 'warning' },
  full: { label: '已满', color: 'error' },
  inactive: { label: '停用', color: 'default' },
};

const locationTypeConfig: Record<string, string> = {
  storage: '存储区',
  picking: '拣货区',
  receiving: '收货区',
  shipping: '发货区',
  staging: '暂存区',
  quarantine: '检疫区',
  returned: '退货区',
};

const LocationPage: React.FC = () => {
  const { addNotification } = useAppStore();

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusSummary, setStatusSummary] = useState<LocationStatusSummary | null>(null);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null);

  // Form states
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

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouse_id = warehouseFilter;

      const response = await wmsApi.locations.list(params);
      if (response.success && response.data) {
        setLocations(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('获取库位列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载库位列表',
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

  const fetchStatusSummary = useCallback(async () => {
    try {
      const params: Record<string, unknown> = {};
      if (warehouseFilter) params.warehouse_id = warehouseFilter;
      const response = await wmsApi.locations.getStatus(params);
      if (response.success && response.data) {
        setStatusSummary(response.data);
      }
    } catch (error: unknown) {
      apiLogger.error('获取库位状态统计失败:', error);
    }
  }, [warehouseFilter]);

  useEffect(() => {
    fetchLocations();
    fetchWarehouses();
    fetchStatusSummary();
  }, [fetchLocations, fetchStatusSummary]);

  const handleCreate = async () => {
    if (!newItem.code || !newItem.name || !newItem.warehouse_id) {
      addNotification({
        type: 'warning',
        title: '验证错误',
        message: '请填写必要信息（库位编码、名称、仓库）',
      });
      return;
    }

    try {
      const response = await wmsApi.locations.create(newItem);
      if (response.success) {
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '库位已创建',
        });
        setShowCreateDialog(false);
        resetNewItem();
        fetchLocations();
        fetchStatusSummary();
      }
    } catch (error: unknown) {
      apiLogger.error('创建库位失败:', error);
      addNotification({
        type: 'error',
        title: '创建失败',
        message: '创建库位失败',
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedLocation) return;

    try {
      const response = await wmsApi.locations.update(selectedLocation.id, editItem);
      if (response.success) {
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '库位已更新',
        });
        setShowEditDialog(false);
        fetchLocations();
        fetchStatusSummary();
      }
    } catch (error: unknown) {
      apiLogger.error('更新库位失败:', error);
      addNotification({
        type: 'error',
        title: '更新失败',
        message: '更新库位失败',
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteLocationId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = useCallback(async () => {
    if (!deleteLocationId) return;

    try {
      const response = await wmsApi.locations.delete(deleteLocationId);
      if (response.success) {
        addNotification({
          type: 'success',
          title: '删除成功',
          message: '库位已删除',
        });
        fetchLocations();
        fetchStatusSummary();
      }
    } catch (error: unknown) {
      apiLogger.error('删除库位失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '删除库位失败',
      });
    }
  }, [addNotification, fetchLocations, fetchStatusSummary, deleteLocationId]);

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
      { id: 'code', label: '库位编码', sortable: true },
      { id: 'name', label: '库位名称', sortable: true },
      {
        id: 'warehouse_id',
        label: '仓库',
        render: (row) => getWarehouseName(row.warehouse_id),
      },
      { id: 'zone_name', label: '库区' },
      {
        id: 'location_type',
        label: '类型',
        render: (row) => locationTypeConfig[row.location_type] || row.location_type,
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
      { id: 'capacity', label: '容量' },
      { id: 'occupied_quantity', label: '已占用' },
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
          { label: '空闲', value: 'empty' },
          { label: '部分占用', value: 'partially_filled' },
          { label: '已满', value: 'full' },
          { label: '停用', value: 'inactive' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value);
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
          setWarehouseFilter(value);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter, warehouseFilter, warehouses]
  );

  const rowActions: RowAction<Location>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDeleteClick(row.id),
      },
    ],
    [handleDelete]
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
          {total}
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
      title='库位管理'
      subtitle='管理仓库库位信息，包括库位编码、类型、容量等'
      headerProps={{
        pageIcon: <MapPin style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #10B981, #059669)',
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '仓储', href: '/wms' },
          { label: '库位管理' },
        ]}
        columns={columns}
        data={locations}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索库位编码或名称...'
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
            label: '新增库位',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无库位数据'
        getRowId={(row) => row.id}
        mobileCardTitleKey='name'
        mobileCardSubtitleKey='code'
        mobileCardDisplayFields={['warehouse_name', 'zone_name', 'capacity', 'status']}
        mobileCardFieldLabels={{
          warehouse_name: '仓库',
          zone_name: '库区',
          capacity: '容量',
          status: '状态',
        }}
      />

      {/* 新增对话框 */}
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
              label='库位编码 *'
              value={newItem.code}
              onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
              fullWidth
              required
              size='small'
            />
            <TextField
              label='库位名称 *'
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
                label='仓库 *'
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
                label='库位类型'
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
              label='库区'
              value={newItem.zone_id}
              onChange={(e) => setNewItem({ ...newItem, zone_id: e.target.value })}
              fullWidth
              size='small'
            />
            <TextField
              label='通道'
              value={newItem.aisle}
              onChange={(e) => setNewItem({ ...newItem, aisle: e.target.value })}
              fullWidth
              size='small'
            />
            <TextField
              label='排'
              value={newItem.row}
              onChange={(e) => setNewItem({ ...newItem, row: e.target.value })}
              fullWidth
              size='small'
            />
            <TextField
              label='列'
              value={newItem.column}
              onChange={(e) => setNewItem({ ...newItem, column: e.target.value })}
              fullWidth
              size='small'
            />
            <TextField
              label='层'
              value={newItem.layer}
              onChange={(e) => setNewItem({ ...newItem, layer: e.target.value })}
              fullWidth
              size='small'
            />
            <TextField
              label='容量'
              type='number'
              value={newItem.capacity}
              onChange={(e) =>
                setNewItem({ ...newItem, capacity: parseFloat(e.target.value) || 0 })
              }
              fullWidth
              size='small'
            />
            <TextField
              label='体积'
              type='number'
              value={newItem.volume}
              onChange={(e) => setNewItem({ ...newItem, volume: parseFloat(e.target.value) || 0 })}
              fullWidth
              size='small'
            />
            <TextField
              label='重量限制'
              type='number'
              value={newItem.weight_limit}
              onChange={(e) =>
                setNewItem({ ...newItem, weight_limit: parseFloat(e.target.value) || 0 })
              }
              fullWidth
              size='small'
            />
            <TextField
              label='温度区间'
              value={newItem.temperature_zone}
              onChange={(e) => setNewItem({ ...newItem, temperature_zone: e.target.value })}
              fullWidth
              size='small'
              placeholder='如：常温、冷藏、冷冻'
            />
            <TextField
              label='条码'
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
              label='备注'
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
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑对话框 */}
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
                label='库位编码'
                value={selectedLocation.code}
                fullWidth
                size='small'
                disabled
              />
              <TextField
                label='库位名称'
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
                  label='状态'
                  onChange={(e) => setEditItem({ ...editItem, status: e.target.value })}
                >
                  <MenuItem value='empty'>空闲</MenuItem>
                  <MenuItem value='partially_filled'>部分占用</MenuItem>
                  <MenuItem value='full'>已满</MenuItem>
                  <MenuItem value='inactive'>停用</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label='容量'
                type='number'
                value={editItem.capacity ?? ''}
                onChange={(e) =>
                  setEditItem({ ...editItem, capacity: parseFloat(e.target.value) || 0 })
                }
                fullWidth
                size='small'
              />
              <TextField
                label='体积'
                type='number'
                value={editItem.volume ?? ''}
                onChange={(e) =>
                  setEditItem({ ...editItem, volume: parseFloat(e.target.value) || 0 })
                }
                fullWidth
                size='small'
              />
              <TextField
                label='重量限制'
                type='number'
                value={editItem.weight_limit ?? ''}
                onChange={(e) =>
                  setEditItem({ ...editItem, weight_limit: parseFloat(e.target.value) || 0 })
                }
                fullWidth
                size='small'
              />
              <TextField
                label='温度区间'
                value={editItem.temperature_zone || ''}
                onChange={(e) => setEditItem({ ...editItem, temperature_zone: e.target.value })}
                fullWidth
                size='small'
              />
              <TextField
                label='条码'
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
                label='备注'
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
          >
            保存
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

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title='确认删除'
        message='确定要删除这个库位吗？此操作不可撤销。'
        danger
      />
    </PageContainer>
  );
};

export default LocationPage;
