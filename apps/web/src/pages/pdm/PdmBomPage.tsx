import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Package,
  Plus,
  Edit,
  Delete,
  Search,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Save,
  X,
} from 'lucide-react';

interface BomItem {
  id: string;
  partNumber: string;
  partName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  level: number;
  parentId?: string;
  children?: BomItem[];
}

interface Product {
  id: string;
  name: string;
  code: string;
  version: string;
  status: 'active' | 'draft' | 'archived';
}

export const PdmBomPage: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState('P001');
  const [searchTerm, setSearchTerm] = useState('');
  const [bomItems, setBomItems] = useState<BomItem[]>([
    {
      id: '1',
      partNumber: 'PRT-001',
      partName: '聚乙烯颗粒 A级',
      quantity: 100,
      unit: 'kg',
      unitPrice: 12.5,
      totalPrice: 1250,
      level: 1,
    },
    {
      id: '2',
      partNumber: 'PRT-002',
      partName: '添加剂 B',
      quantity: 5,
      unit: 'kg',
      unitPrice: 85.0,
      totalPrice: 425,
      level: 1,
    },
    {
      id: '3',
      partNumber: 'PRT-003',
      partName: '颜料 C',
      quantity: 2,
      unit: 'kg',
      unitPrice: 250.0,
      totalPrice: 500,
      level: 1,
    },
    {
      id: '4',
      partNumber: 'PRT-004',
      partName: '包装材料',
      quantity: 1000,
      unit: '个',
      unitPrice: 0.5,
      totalPrice: 500,
      level: 1,
    },
  ]);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<BomItem | null>(null);

  const products: Product[] = [
    {
      id: 'P001',
      name: '塑料板材 A',
      code: 'PLA-2024-001',
      version: 'V1.0',
      status: 'active',
    },
    {
      id: 'P002',
      name: '塑料板材 B',
      code: 'PLB-2024-002',
      version: 'V2.1',
      status: 'active',
    },
    {
      id: 'P003',
      name: '塑料薄膜',
      code: 'PLF-2024-003',
      version: 'V1.0',
      status: 'draft',
    },
  ];

  const handleEditItem = (item: BomItem) => {
    setEditingItem(item);
    setOpenDialog(true);
  };

  const handleDeleteItem = (id: string) => {
    setBomItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveItem = () => {
    if (editingItem) {
      setBomItems((prev) => prev.map((item) => (item.id === editingItem.id ? editingItem : item)));
    }
    setOpenDialog(false);
    setEditingItem(null);
  };

  const totalCost = bomItems.reduce((sum, item) => sum + item.totalPrice, 0);

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
                {bomItems.length} 项
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
                ¥ {totalCost.toLocaleString()}
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
                {bomItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {item.level === 1 && <Layers size={14} />}
                        {item.level > 1 && <ArrowDownRight size={14} />}
                        <Typography variant='caption'>L{item.level}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{item.partNumber}</TableCell>
                    <TableCell>{item.partName}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>¥ {item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell>¥ {item.totalPrice.toFixed(2)}</TableCell>
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
        </CardContent>
      </Card>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      >
        <DialogTitle>{editingItem ? '编辑物料' : '添加物料'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              label='物料编号'
              value={editingItem?.partNumber || ''}
              onChange={(e) =>
                setEditingItem((prev) => (prev ? { ...prev, partNumber: e.target.value } : null))
              }
              fullWidth
            />
            <TextField
              label='物料名称'
              value={editingItem?.partName || ''}
              onChange={(e) =>
                setEditingItem((prev) => (prev ? { ...prev, partName: e.target.value } : null))
              }
              fullWidth
            />
            <Grid
              container
              spacing={3}
            >
              <Grid size={{ xs: 6 }}>
                <TextField
                  label='数量'
                  type='number'
                  value={editingItem?.quantity || ''}
                  onChange={(e) =>
                    setEditingItem((prev) =>
                      prev ? { ...prev, quantity: parseFloat(e.target.value) || 0 } : null
                    )
                  }
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>单位</InputLabel>
                  <Select
                    value={editingItem?.unit || ''}
                    label='单位'
                    onChange={(e) =>
                      setEditingItem((prev) => (prev ? { ...prev, unit: e.target.value } : null))
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
              label='单价'
              type='number'
              value={editingItem?.unitPrice || ''}
              onChange={(e) =>
                setEditingItem((prev) =>
                  prev ? { ...prev, unitPrice: parseFloat(e.target.value) || 0 } : null
                )
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
    </Box>
  );
};

export default PdmBomPage;
