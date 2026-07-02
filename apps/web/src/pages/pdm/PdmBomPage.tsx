import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
} from '@mui/material';
import { Plus, Edit, Delete, Layers, ArrowDownRight, Database } from 'lucide-react';
import { pdmApi } from '@/api/pdm';
import type { BomItem, Product } from '@/api/pdm';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { PageContainer } from '@/components/common/PageContainerV2';

interface BomItemFormData {
  part_number: string;
  part_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  level: number;
}

export const PdmBomPage: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<BomItem | null>(null);
  const [formData, setFormData] = useState<BomItemFormData>({
    part_number: '',
    part_name: '',
    quantity: 0,
    unit: 'kg',
    unit_price: 0,
    level: 1,
  });
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    loadProducts();
    loadBomItems();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await pdmApi.listProducts();
      if (response.success && response.data) {
        const data = response.data as any;
        const items = Array.isArray(data) ? data : data.products || [];
        setProducts(items);
        if (items.length > 0 && !selectedProduct) {
          setSelectedProduct(items[0].id);
        }
      }
    } catch (err: unknown) {
      apiLogger.error('加载产品数据失败:', err);
      setProducts([]);
    }
  };

  const loadBomItems = async () => {
    try {
      setLoading(true);
      const response = await pdmApi.listBomItems();
      if (response.success && response.data) {
        const data = response.data as any;
        const items = Array.isArray(data) ? data : data.items || [];
        const adapted = items.map((item: { [key: string]: unknown }) => ({
          ...item,
          partNumber: item.part_number || item.partNumber || '',
          partName: item.part_name || item.partName || '',
          unitPrice: item.unit_price || item.unitPrice || 0,
          totalPrice: item.total_price || item.totalPrice || 0,
        }));
        setBomItems(adapted as BomItem[]);
      } else {
        setBomItems([]);
      }
    } catch (err: unknown) {
      apiLogger.error('加载BOM数据失败:', err);
      setBomItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (item: BomItem) => {
    setEditingItem(item);
    setFormData({
      part_number: item.part_number,
      part_name: item.part_name,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      level: item.level,
    });
    setOpenDialog(true);
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await pdmApi.deleteBomItem(id);
      addNotification({ title: '成功', message: '物料删除成功', type: 'success' });
      loadBomItems();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '删除失败', type: 'error' });
      apiLogger.error('删除BOM物料失败:', err);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      part_number: '',
      part_name: '',
      quantity: 0,
      unit: 'kg',
      unit_price: 0,
      level: 1,
    });
    setOpenDialog(true);
  };

  const handleSaveItem = async () => {
    if (!selectedProduct) {
      addNotification({ title: '提示', message: '请先选择产品', type: 'warning' });
      return;
    }

    try {
      const requestData = {
        product_id: selectedProduct,
        part_number: formData.part_number,
        part_name: formData.part_name,
        quantity: formData.quantity,
        unit: formData.unit,
        unit_price: formData.unit_price,
        level: formData.level,
        total_price: formData.quantity * formData.unit_price,
      };

      if (editingItem) {
        await pdmApi.updateBomItem(editingItem.id, requestData);
        addNotification({ title: '成功', message: '物料更新成功', type: 'success' });
      } else {
        await pdmApi.createBomItem(requestData);
        addNotification({ title: '成功', message: '物料添加成功', type: 'success' });
      }
      setOpenDialog(false);
      setEditingItem(null);
      loadBomItems();
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: editingItem ? '更新失败' : '创建失败',
        type: 'error',
      });
      apiLogger.error('保存BOM物料失败:', err);
    }
  };

  const filteredBomItems = useMemo(() => {
    return bomItems.filter((item) => {
      const matchesProduct = !selectedProduct || item.product_id === selectedProduct;
      const matchesSearch =
        !searchTerm ||
        item.part_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.part_number.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesProduct && matchesSearch;
    });
  }, [bomItems, selectedProduct, searchTerm]);

  const totalCost = filteredBomItems.reduce(
    (sum, item) => sum + (item.total_price || item.quantity * item.unit_price),
    0
  );

  const productFilterOptions = useMemo(
    () => products.map((p) => ({ label: `${p.name} (${p.code})`, value: p.id })),
    [products]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'product',
        label: '选择产品',
        type: 'select',
        options: productFilterOptions,
      },
    ],
    [productFilterOptions]
  );

  const handleFilterChange = useCallback((values: Record<string, any>) => {
    setSelectedProduct(values.product || '');
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const columns: ColumnDef<BomItem>[] = useMemo(
    () => [
      {
        id: 'level',
        label: '层级',
        minWidth: 80,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {row.level === 1 && <Layers size={14} />}
            {row.level > 1 && <ArrowDownRight size={14} />}
            <span>L{row.level}</span>
          </Box>
        ),
      },
      { id: 'part_number', label: '物料编号', minWidth: 120 },
      { id: 'part_name', label: '物料名称', minWidth: 160 },
      { id: 'quantity', label: '数量', minWidth: 80, align: 'right' },
      { id: 'unit', label: '单位', minWidth: 80, align: 'center' },
      {
        id: 'unit_price',
        label: '单价',
        minWidth: 100,
        align: 'right',
        render: (row) => `¥ ${row.unit_price.toFixed(2)}`,
      },
      {
        id: 'total_price',
        label: '总价',
        minWidth: 100,
        align: 'right',
        render: (row) => `¥ ${(row.total_price || row.quantity * row.unit_price).toFixed(2)}`,
      },
    ],
    []
  );

  const rowActions: RowAction<BomItem>[] = useMemo(
    () => [
      {
        label: '编辑',
        icon: <Edit size={16} />,
        color: 'primary',
        onClick: (row) => handleEditItem(row),
      },
      {
        label: '删除',
        icon: <Delete size={16} />,
        color: 'error',
        onClick: (row) => handleDeleteItem(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个物料吗？',
      },
    ],
    []
  );

  const statsCards = (
    <Grid
      container
      spacing={3}
      sx={{ mb: 2 }}
    >
      <Grid size={{ xs: 12, sm: 6 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>物料总数</Box>
          <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
            {loading ? '...' : `${filteredBomItems.length} 项`}
          </Box>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>物料总成本</Box>
          <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'primary.main' }}>
            {loading ? '...' : `¥ ${totalCost.toLocaleString()}`}
          </Box>
        </Box>
      </Grid>
    </Grid>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Database style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredBomItems}
        loading={loading}
        searchable
        searchPlaceholder='搜索物料编号或名称...'
        onSearch={handleSearch}
        filters={filters}
        filtersValue={{ product: selectedProduct }}
        onFilterChange={handleFilterChange}
        rowActions={rowActions}
        actions={[
          {
            label: '添加物料',
            icon: <Plus size={16} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        onRefresh={loadBomItems}
        headerContent={statsCards}
        emptyMessage='暂无物料数据'
      />

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{editingItem ? '编辑物料' : '添加物料'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              label='物料编号 *'
              value={formData.part_number}
              onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label='物料名称 *'
              value={formData.part_name}
              onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
              fullWidth
              required
            />
            <Grid
              container
              spacing={3}
            >
              <Grid size={{ xs: 6 }}>
                <TextField
                  label='数量 *'
                  type='number'
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>单位</InputLabel>
                  <Select
                    value={formData.unit}
                    label='单位'
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <MenuItem value='kg'>kg</MenuItem>
                    <MenuItem value='个'>个</MenuItem>
                    <MenuItem value='米'>米</MenuItem>
                    <MenuItem value='升'>升</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField
              label='单价 *'
              type='number'
              value={formData.unit_price}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  unit_price: parseFloat(e.target.value) || 0,
                })
              }
              fullWidth
              required
            />
            <TextField
              label='层级'
              type='number'
              value={formData.level}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  level: Math.max(1, parseInt(e.target.value) || 1),
                })
              }
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleSaveItem}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default PdmBomPage;
