import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  Button,
  Stack,
  Pagination,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import {
  purchaseOrderApi,
  type PurchaseOrder,
  type PaginatedResult,
  type ListParams,
} from '../api/scm';

const getStatusColor = (
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'draft':
      return 'default';
    case 'pending':
      return 'warning';
    case 'approved':
      return 'info';
    case 'received':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'draft':
      return '草稿';
    case 'pending':
      return '待审核';
    case 'approved':
      return '已审核';
    case 'received':
      return '已入库';
    case 'cancelled':
      return '已取消';
    default:
      return status;
  }
};

export const PurchaseOrderPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newOrder, setNewOrder] = useState<Partial<PurchaseOrder>>({
    order_number: '',
    order_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
  });

  const loadOrders = async (p: number, ps: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: ListParams = {
        page: p,
        page_size: ps,
        search: searchKeyword || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      const data: PaginatedResult<PurchaseOrder> = await purchaseOrderApi.list(params);
      setOrders(data.items);
      setTotal(data.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载采购订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    loadOrders(1, pageSize);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, p: number) => {
    loadOrders(p, pageSize);
  };

  const handleCreate = async () => {
    if (!newOrder.order_number) return;
    setSubmitting(true);
    try {
      await purchaseOrderApi.create(newOrder as any);
      setCreateDialogOpen(false);
      setNewOrder({
        order_number: '',
        order_date: new Date().toISOString().slice(0, 10),
        status: 'draft',
      });
      await loadOrders(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建采购订单失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await purchaseOrderApi.approve(id);
      await loadOrders(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '审核采购订单失败');
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('确定要取消该采购订单吗？')) return;
    try {
      await purchaseOrderApi.cancel(id);
      await loadOrders(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消采购订单失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该采购订单吗？')) return;
    try {
      await purchaseOrderApi.delete(id);
      await loadOrders(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除采购订单失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            采购订单
          </Typography>
          <Typography variant="body2" color="text.secondary">
            采购订单的创建、审核与跟踪管理
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadOrders(page, pageSize)}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新增采购单
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <AssignmentIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    订单总数
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {total}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <AssignmentIcon color="warning" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    待审核
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {orders.filter((o) => o.status === 'pending').length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <AssignmentIcon color="info" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    已审核
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {orders.filter((o) => o.status === 'approved').length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <AssignmentIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    已入库
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {orders.filter((o) => o.status === 'received').length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="搜索订单号..."
            size="small"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
            }}
            sx={{ minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>状态</InputLabel>
            <Select
              value={statusFilter}
              label="状态"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="draft">草稿</MenuItem>
              <MenuItem value="pending">待审核</MenuItem>
              <MenuItem value="approved">已审核</MenuItem>
              <MenuItem value="received">已入库</MenuItem>
              <MenuItem value="cancelled">已取消</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={handleSearch}>
            搜索
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>订单号</TableCell>
                <TableCell>供应商</TableCell>
                <TableCell>订单日期</TableCell>
                <TableCell>交货日期</TableCell>
                <TableCell align="right">总金额</TableCell>
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
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无采购订单数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {order.order_number}
                      </Typography>
                    </TableCell>
                    <TableCell>{order.supplier_name || order.supplier_id || '-'}</TableCell>
                    <TableCell>{order.order_date}</TableCell>
                    <TableCell>{order.delivery_date || '-'}</TableCell>
                    <TableCell align="right">
                      ¥{order.total_amount?.toLocaleString() || '0.00'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(order.status)}
                        size="small"
                        color={getStatusColor(order.status)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {order.status === 'pending' && (
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleApprove(order.id)}
                          title="审核"
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      )}
                      {(order.status === 'draft' || order.status === 'pending') && (
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => handleCancel(order.id)}
                          title="取消"
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(order.id)}
                        title="删除"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {total > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              size="small"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增采购订单</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="订单号"
              required
              value={newOrder.order_number || ''}
              onChange={(e) => setNewOrder({ ...newOrder, order_number: e.target.value })}
              fullWidth
            />
            <TextField
              label="供应商ID"
              value={newOrder.supplier_id || ''}
              onChange={(e) => setNewOrder({ ...newOrder, supplier_id: e.target.value })}
              fullWidth
            />
            <TextField
              label="订单日期"
              type="date"
              value={newOrder.order_date || ''}
              onChange={(e) => setNewOrder({ ...newOrder, order_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="交货日期"
              type="date"
              value={newOrder.delivery_date || ''}
              onChange={(e) => setNewOrder({ ...newOrder, delivery_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="总金额"
              type="number"
              value={newOrder.total_amount || ''}
              onChange={(e) =>
                setNewOrder({ ...newOrder, total_amount: Number(e.target.value) })
              }
              fullWidth
            />
            <TextField
              label="备注"
              multiline
              rows={2}
              value={newOrder.remarks || ''}
              onChange={(e) => setNewOrder({ ...newOrder, remarks: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !newOrder.order_number}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PurchaseOrderPage;
