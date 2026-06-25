import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  Package,
  Plus,
  Edit,
  Delete,
  Search,
  Layers,
  ArrowDownRight,
} from 'lucide-react';
import { pdmApi } from '@/api/pdm';
import type { BomItem, Product } from '@/api/pdm';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';

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
      addNotification({ title: '错误', message: editingItem ? '更新失败' : '创建失败', type: 'error' });
      apiLogger.error('保存BOM物料失败:', err);
    }
  };

  const filteredBomItems = bomItems.filter((item) => {
    const matchesProduct = !selectedProduct || item.product_id === selectedProduct;
    const matchesSearch =
      item.part_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.part_number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesProduct && matchesSearch;
  });

  const totalCost = filteredBomItems.reduce((sum, item) => sum + (item.total_price || item.quantity * item.unit_price), 0);

  return (
    <Box sx={{ flex: 1 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <div>
          <Typography
            variant='h4'
            sx={{ fontWeight: 'bold', mb: 1 }}
          >
            物料清单 (BOM)
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            管理产品的物料组成和成本结构
          </Typography>
        </div>
        <Button
          variant='contained'
          startIcon={<Plus />}
          onClick={handleCreate}
          sx={{ bgcolor: 'primary.main' }}
        >
          添加物料
        </Button>
      </Box>

      <Grid
        container
        spacing={3}
        sx={{ mb: 4 }}
      >
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 2 }}
              >
                选择产品
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  sx={{ minHeight: 48 }}
                  disabled={loading}
                >
                  {products.map((product) => (
                    <MenuItem
                      key={product.id}
                      value={product.id}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Package size={16} />
                        <div>
                          <Typography
                            variant='body1'
                            sx={{ fontWeight: 500 }}
                          >
                            {product.name}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {product.code} - {product.version}
                          </Typography>
                        </div>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 2 }}
              >
                物料总数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 'bold' }}
              >
                {loading ? <CircularProgress size={24} /> : `${filteredBomItems.length} 项`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 2 }}
              >
                物料总成本
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 'bold', color: 'primary.main' }}
              >
                {loading ? <CircularProgress size={24} /> : `¥ ${totalCost.toLocaleString()}`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardHeader
          title='BOM 明细'
          action={
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                placeholder='搜索物料...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size='small'
                sx={{ width: 200 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Search
                        size={16}
                        sx={{ mr: 1 }}
                      />
                    ),
                  },
                }}
              />
            </Box>
          }
        />
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>层级</TableCell>
                    <TableCell>物料编号</TableCell>
                    <TableCell>物料名称</TableCell>
                    <TableCell>数量</TableCell>
                    <TableCell>单位</TableCell>
                    <TableCell>单价</TableCell>
                    <TableCell>总价</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredBomItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {item.level === 1 && <Layers size={14} />}
                          {item.level > 1 && <ArrowDownRight size={14} />}
                          <Typography variant='caption'>L{item.level}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{item.part_number}</TableCell>
                      <TableCell>{item.part_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>¥ {item.unit_price.toFixed(2)}</TableCell>
                      <TableCell>¥ {(item.total_price || item.quantity * item.unit_price).toFixed(2)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size='small'
                            onClick={() => handleEditItem(item)}
                          >
                            <Edit size={16} />
                          </IconButton>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Delete size={16} />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

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
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
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
            sx={{ bgcolor: 'primary.main' }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PdmBomPage;