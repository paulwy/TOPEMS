import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Pagination,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useMesStore } from '../store/mesStore';
import type { ProductionOrder, CreateProductionOrderRequest } from '../api';

const getStatusColor = (status: string): 'success' | 'default' | 'error' | 'warning' | 'info' => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'pending':
      return 'warning';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: '待开始',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return map[status] || status;
};

export const ProductionOrderManagementPage: React.FC = () => {
  const {
    productionOrders,
    productionOrdersTotal,
    productionOrdersPage,
    productionOrdersPageSize,
    loading,
    error,
    loadProductionOrders,
    addProductionOrder,
    updateProductionOrder,
    removeProductionOrder,
  } = useMesStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [newOrder, setNewOrder] = useState<CreateProductionOrderRequest>({
    order_number: '',
    product_name: '',
    quantity: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProductionOrders({ page: 1, pageSize: 10 });
  }, [loadProductionOrders]);

  const handleSearch = () => {
    loadProductionOrders({
      page: 1,
      pageSize: productionOrdersPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadProductionOrders({
      page,
      pageSize: productionOrdersPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handleCreateOrder = async () => {
    if (!newOrder.order_number || !newOrder.product_name) return;
    setSubmitting(true);
    try {
      await addProductionOrder(newOrder);
      setCreateDialogOpen(false);
      setNewOrder({ order_number: '', product_name: '', quantity: 1 });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOrder = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      await updateProductionOrder(selectedOrder.id, {
        product_name: selectedOrder.product_name,
        status: selectedOrder.status,
        priority: selectedOrder.priority,
      });
      setEditDialogOpen(false);
      setSelectedOrder(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('确定要删除该生产订单吗？')) return;
    await removeProductionOrder(id);
  };

  const totalPages = Math.ceil(productionOrdersTotal / productionOrdersPageSize);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>生产订单管理</Typography>
          <Typography variant="body2" color="text.secondary">管理生产订单的全生命周期</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadProductionOrders({ page: productionOrdersPage, pageSize: productionOrdersPageSize })}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            创建订单
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索订单号、产品..."
            size="small"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} /> }}
            sx={{ minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>状态</InputLabel>
            <Select value={statusFilter} label="状态" onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="pending">待开始</MenuItem>
              <MenuItem value="in_progress">进行中</MenuItem>
              <MenuItem value="completed">已完成</MenuItem>
              <MenuItem value="cancelled">已取消</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={handleSearch}>搜索</Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>订单号</TableCell>
                <TableCell>产品名称</TableCell>
                <TableCell>数量</TableCell>
                <TableCell>优先级</TableCell>
                <TableCell>计划开始</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : productionOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无订单数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                productionOrders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{order.order_number}</Typography></TableCell>
                    <TableCell>{order.product_name}</TableCell>
                    <TableCell>{order.quantity} {order.unit || ''}</TableCell>
                    <TableCell>{order.priority || '-'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {order.scheduled_start_date ? new Date(order.scheduled_start_date).toLocaleDateString('zh-CN') : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={getStatusLabel(order.status)} size="small" color={getStatusColor(order.status)} variant="filled" />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => { setSelectedOrder(order); setEditDialogOpen(true); }} title="编辑">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteOrder(order.id)} title="删除">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {productionOrdersTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination count={totalPages} page={productionOrdersPage} onChange={handlePageChange} size="small" />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建生产订单</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="订单号" required value={newOrder.order_number} onChange={(e) => setNewOrder({ ...newOrder, order_number: e.target.value })} fullWidth />
            <TextField label="产品名称" required value={newOrder.product_name} onChange={(e) => setNewOrder({ ...newOrder, product_name: e.target.value })} fullWidth />
            <TextField label="产品编码" value={newOrder.product_code || ''} onChange={(e) => setNewOrder({ ...newOrder, product_code: e.target.value })} fullWidth />
            <TextField label="数量" type="number" required value={newOrder.quantity} onChange={(e) => setNewOrder({ ...newOrder, quantity: Number(e.target.value) })} fullWidth />
            <TextField label="单位" value={newOrder.unit || ''} onChange={(e) => setNewOrder({ ...newOrder, unit: e.target.value })} fullWidth />
            <TextField label="优先级" value={newOrder.priority || ''} onChange={(e) => setNewOrder({ ...newOrder, priority: e.target.value })} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateOrder} disabled={submitting || !newOrder.order_number || !newOrder.product_name}>
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑生产订单</DialogTitle>
        {selectedOrder && (
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField label="订单号" value={selectedOrder.order_number} disabled fullWidth />
              <TextField label="产品名称" value={selectedOrder.product_name} onChange={(e) => setSelectedOrder({ ...selectedOrder, product_name: e.target.value })} fullWidth />
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select value={selectedOrder.status} label="状态" onChange={(e) => setSelectedOrder({ ...selectedOrder, status: e.target.value })}>
                  <MenuItem value="pending">待开始</MenuItem>
                  <MenuItem value="in_progress">进行中</MenuItem>
                  <MenuItem value="completed">已完成</MenuItem>
                  <MenuItem value="cancelled">已取消</MenuItem>
                </Select>
              </FormControl>
              <TextField label="优先级" value={selectedOrder.priority || ''} onChange={(e) => setSelectedOrder({ ...selectedOrder, priority: e.target.value })} fullWidth />
            </Box>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => { setEditDialogOpen(false); setSelectedOrder(null); }}>取消</Button>
          <Button variant="contained" onClick={handleEditOrder} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductionOrderManagementPage;
