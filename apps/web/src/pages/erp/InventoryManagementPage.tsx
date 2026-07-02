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
  Typography,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Inventory, CreateInventoryRequest, UpdateInventoryRequest } from '@/api/erp';
import { erpApi } from '@/api/erp';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye, Package, AlertTriangle } from 'lucide-react';
import { apiLogger } from '@/utils/logger';

const InventoryManagementPage: React.FC = () => {
  const [items, setItems] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateInventoryRequest>({
    material_id: '',
    material_code: '',
    material_name: '',
    specification: '',
    unit: '',
    warehouse_id: '',
    warehouse_name: '',
    location_id: '',
    location_name: '',
    quantity: 0,
    safety_stock: 0,
    max_stock: 0,
    unit_cost: 0,
    batch_number: '',
  });

  const { addNotification } = useAppStore();

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (warehouseFilter !== 'all') params.warehouse = warehouseFilter;

      const response = await erpApi.inventory.list(params);
      if (response.success && response.data) {
        setItems(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载库存列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载库存列表',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, warehouseFilter, addNotification]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await erpApi.inventory.update(selectedItem.id, formData as UpdateInventoryRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '库存信息已更新',
        });
      } else {
        await erpApi.inventory.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新库存记录已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadItems();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedItem ? '更新库存失败' : '创建库存失败',
      });
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这条库存记录吗?')) return;
      try {
        await erpApi.inventory.delete(id);
        addNotification({
          type: 'success',
          title: '删除成功',
          message: '库存记录已删除',
        });
        loadItems();
      } catch (error: unknown) {
        apiLogger.error('删除失败:', error);
        addNotification({
          type: 'error',
          title: '删除失败',
          message: '无法删除库存记录',
        });
      }
    },
    [loadItems, addNotification]
  );

  const handleEdit = useCallback((item: Inventory) => {
    setSelectedItem(item);
    setFormData({
      material_id: item.material_id,
      material_code: item.material_code,
      material_name: item.material_name,
      specification: item.specification,
      unit: item.unit,
      warehouse_id: item.warehouse_id,
      warehouse_name: item.warehouse_name,
      location_id: item.location_id,
      location_name: item.location_name,
      quantity: item.quantity,
      safety_stock: item.safety_stock,
      max_stock: item.max_stock,
      unit_cost: item.unit_cost,
      batch_number: item.batch_number,
      production_date: item.production_date,
      expiry_date: item.expiry_date,
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback((item: Inventory) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  }, []);

  const resetForm = () => {
    setSelectedItem(null);
    setFormData({
      material_id: '',
      material_code: '',
      material_name: '',
      specification: '',
      unit: '',
      warehouse_id: '',
      warehouse_name: '',
      location_id: '',
      location_name: '',
      quantity: 0,
      safety_stock: 0,
      max_stock: 0,
      unit_cost: 0,
      batch_number: '',
    });
  };

  const getStockStatus = (item: Inventory) => {
    if (item.quantity <= 0) return { label: '缺货', color: 'error' as const };
    if (item.safety_stock && item.quantity < item.safety_stock) {
      return { label: '低于安全库存', color: 'warning' as const };
    }
    return { label: '正常', color: 'success' as const };
  };

  const getStockBadge = (item: Inventory) => {
    const status = getStockStatus(item);
    const colorMap = {
      success: { bg: 'success.lighter', color: '#15803d' },
      warning: { bg: 'warning.light', color: '#b45309' },
      error: { bg: 'error.lighter', color: 'error.dark' },
    };
    const s = colorMap[status.color];
    return (
      <Chip
        size='small'
        label={status.label}
        sx={{ backgroundColor: s.bg, color: s.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<Inventory>[] = useMemo(
    () => [
      { id: 'material_code', label: '物料编码', sortable: true },
      { id: 'material_name', label: '物料名称', sortable: true },
      { id: 'specification', label: '规格型号' },
      { id: 'warehouse_name', label: '仓库' },
      { id: 'location_name', label: '库位' },
      { id: 'quantity', label: '库存数量', sortable: true },
      {
        id: 'unit_cost',
        label: '库存金额',
        render: (row) =>
          row.total_cost
            ? `¥${row.total_cost.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
            : '-',
      },
      {
        id: 'status',
        label: '库存状态',
        render: (row) => getStockBadge(row),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'warehouse',
        label: '仓库',
        type: 'select',
        options: [
          { label: '全部仓库', value: 'all' },
          { label: '原材料仓库', value: 'W001' },
          { label: '成品仓库', value: 'W002' },
          { label: '半成品仓库', value: 'W003' },
        ],
        value: warehouseFilter,
        onChange: (value) => {
          setWarehouseFilter(value);
          setCurrentPage(1);
        },
      },
    ],
    [warehouseFilter]
  );

  const rowActions: RowAction<Inventory>[] = useMemo(
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
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这条库存记录吗?',
      },
    ],
    [handleViewDetail, handleEdit, handleDelete]
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const stats = useMemo(() => {
    const totalValue = items.reduce((sum, item) => sum + (item.total_cost || 0), 0);
    const lowStock = items.filter((i) => i.safety_stock && i.quantity < i.safety_stock).length;
    const totalItems = items.length;
    return {
      totalItems,
      totalValue,
      lowStock,
      inStock: items.filter((i) => i.quantity > 0).length,
    };
  }, [items]);

  if (loading) return <LoadingSpinner />;

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          物料总数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.totalItems}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          库存总金额
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          ¥{stats.totalValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          低于安全库存
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.lowStock}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: '#e0e7ff', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          有库存物料
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: '#4338ca' }}
        >
          {stats.inStock}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='库存管理'
      subtitle='管理库存信息，包括物料、数量、仓库、库位等'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={items}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索物料编码、名称或批次号...'
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
            label: '新增库存',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无库存数据'
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedItem ? '编辑库存' : '新增库存'}</DialogTitle>
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
            {selectedItem ? '修改库存信息' : '填写新库存信息'}
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
                <InputLabel htmlFor='material_code'>物料编码 *</InputLabel>
                <TextField
                  id='material_code'
                  required
                  size='small'
                  value={formData.material_code}
                  onChange={(e) => setFormData({ ...formData, material_code: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='material_name'>物料名称 *</InputLabel>
                <TextField
                  id='material_name'
                  required
                  size='small'
                  value={formData.material_name}
                  onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='specification'>规格型号</InputLabel>
                <TextField
                  id='specification'
                  size='small'
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='unit'>单位</InputLabel>
                <TextField
                  id='unit'
                  size='small'
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='warehouse_name'>仓库 *</InputLabel>
                <FormControl size='small'>
                  <Select
                    id='warehouse_name'
                    value={formData.warehouse_name}
                    onChange={(e) => {
                      const name = e.target.value;
                      let id = '';
                      if (name === '原材料仓库') id = 'W001';
                      else if (name === '成品仓库') id = 'W002';
                      else if (name === '半成品仓库') id = 'W003';
                      setFormData({ ...formData, warehouse_id: id, warehouse_name: name });
                    }}
                  >
                    <MenuItem value='原材料仓库'>原材料仓库</MenuItem>
                    <MenuItem value='成品仓库'>成品仓库</MenuItem>
                    <MenuItem value='半成品仓库'>半成品仓库</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='location_name'>库位</InputLabel>
                <TextField
                  id='location_name'
                  size='small'
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='quantity'>库存数量 *</InputLabel>
                <TextField
                  id='quantity'
                  type='number'
                  required
                  size='small'
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='unit_cost'>单位成本</InputLabel>
                <TextField
                  id='unit_cost'
                  type='number'
                  size='small'
                  value={formData.unit_cost}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unit_cost: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='safety_stock'>安全库存</InputLabel>
                <TextField
                  id='safety_stock'
                  type='number'
                  size='small'
                  value={formData.safety_stock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      safety_stock: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='max_stock'>最大库存</InputLabel>
                <TextField
                  id='max_stock'
                  type='number'
                  size='small'
                  value={formData.max_stock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_stock: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='batch_number'>批次号</InputLabel>
                <TextField
                  id='batch_number'
                  size='small'
                  value={formData.batch_number}
                  onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='production_date'>生产日期</InputLabel>
                <TextField
                  id='production_date'
                  type='date'
                  size='small'
                  value={formData.production_date}
                  onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
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

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>库存详情</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>物料编码</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedItem.material_code}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>物料名称</InputLabel>
                  <Box component='span'>{selectedItem.material_name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>规格型号</InputLabel>
                  <Box component='span'>{selectedItem.specification || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>单位</InputLabel>
                  <Box component='span'>{selectedItem.unit || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>仓库</InputLabel>
                  <Box component='span'>{selectedItem.warehouse_name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>库位</InputLabel>
                  <Box component='span'>{selectedItem.location_name || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>库存数量</InputLabel>
                  <Box component='span'>{selectedItem.quantity}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>可用数量</InputLabel>
                  <Box component='span'>{selectedItem.available_quantity ?? '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>单位成本</InputLabel>
                  <Box component='span'>
                    {selectedItem.unit_cost ? `¥${selectedItem.unit_cost.toFixed(2)}` : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>库存金额</InputLabel>
                  <Box component='span'>
                    {selectedItem.total_cost
                      ? `¥${selectedItem.total_cost.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>安全库存</InputLabel>
                  <Box component='span'>{selectedItem.safety_stock ?? '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>库存状态</InputLabel>
                  <Box>{getStockBadge(selectedItem)}</Box>
                </Box>
                {selectedItem.batch_number && (
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>批次号</InputLabel>
                    <Box component='span'>{selectedItem.batch_number}</Box>
                  </Box>
                )}
                {selectedItem.production_date && (
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>生产日期</InputLabel>
                    <Box component='span'>
                      {new Date(selectedItem.production_date).toLocaleDateString('zh-CN')}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default InventoryManagementPage;
