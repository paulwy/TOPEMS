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
  LocalShipping as LocalShippingIcon,
} from '@mui/icons-material';
import {
  purchaseReceiptApi,
  type PurchaseReceipt,
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
    case 'confirmed':
      return 'info';
    case 'completed':
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
      return '待确认';
    case 'confirmed':
      return '已确认';
    case 'completed':
      return '已完成';
    case 'cancelled':
      return '已取消';
    default:
      return status;
  }
};

export const PurchaseReceiptPage: React.FC = () => {
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newReceipt, setNewReceipt] = useState<Partial<PurchaseReceipt>>({
    receipt_number: '',
    receipt_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
  });

  const loadReceipts = async (p: number, ps: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: ListParams = {
        page: p,
        page_size: ps,
        search: searchKeyword || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      const data: PaginatedResult<PurchaseReceipt> = await purchaseReceiptApi.list(params);
      setReceipts(data.items);
      setTotal(data.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载入库单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    loadReceipts(1, pageSize);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, p: number) => {
    loadReceipts(p, pageSize);
  };

  const handleCreate = async () => {
    if (!newReceipt.receipt_number) return;
    setSubmitting(true);
    try {
      await purchaseReceiptApi.create(newReceipt as any);
      setCreateDialogOpen(false);
      setNewReceipt({
        receipt_number: '',
        receipt_date: new Date().toISOString().slice(0, 10),
        status: 'draft',
      });
      await loadReceipts(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建入库单失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await purchaseReceiptApi.confirm(id);
      await loadReceipts(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认入库单失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该入库单吗？')) return;
    try {
      await purchaseReceiptApi.delete(id);
      await loadReceipts(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除入库单失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            采购入库
          </Typography>
          <Typography variant="body2" color="text.secondary">
            采购到货入库登记与确认
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadReceipts(page, pageSize)}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新增入库单
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <LocalShippingIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    入库单总数
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
                <LocalShippingIcon color="warning" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    待确认
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {receipts.filter((r) => r.status === 'pending').length}
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
                <LocalShippingIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    已完成
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {receipts.filter((r) => r.status === 'completed').length}
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
                <LocalShippingIcon color="info" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    本月入库金额
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    ¥{receipts
                      .reduce((sum, r) => sum + (r.total_amount || 0), 0)
                      .toLocaleString()}
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
            placeholder="搜索入库单号..."
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
              <MenuItem value="pending">待确认</MenuItem>
              <MenuItem value="confirmed">已确认</MenuItem>
              <MenuItem value="completed">已完成</MenuItem>
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
                <TableCell>入库单号</TableCell>
                <TableCell>采购订单</TableCell>
                <TableCell>供应商</TableCell>
                <TableCell>仓库</TableCell>
                <TableCell>入库日期</TableCell>
                <TableCell align="right">数量</TableCell>
                <TableCell align="right">金额</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : receipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无入库单数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                receipts.map((receipt) => (
                  <TableRow key={receipt.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {receipt.receipt_number}
                      </Typography>
                    </TableCell>
                    <TableCell>{receipt.purchase_order_id || '-'}</TableCell>
                    <TableCell>{receipt.supplier_name || '-'}</TableCell>
                    <TableCell>{receipt.warehouse_id || '-'}</TableCell>
                    <TableCell>{receipt.receipt_date}</TableCell>
                    <TableCell align="right">
                      {receipt.total_quantity || 0}
                    </TableCell>
                    <TableCell align="right">
                      ¥{receipt.total_amount?.toLocaleString() || '0.00'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(receipt.status)}
                        size="small"
                        color={getStatusColor(receipt.status)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {receipt.status === 'pending' && (
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleConfirm(receipt.id)}
                          title="确认"
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(receipt.id)}
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
        <DialogTitle>新增入库单</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="入库单号"
              required
              value={newReceipt.receipt_number || ''}
              onChange={(e) => setNewReceipt({ ...newReceipt, receipt_number: e.target.value })}
              fullWidth
            />
            <TextField
              label="采购订单ID"
              value={newReceipt.purchase_order_id || ''}
              onChange={(e) =>
                setNewReceipt({ ...newReceipt, purchase_order_id: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="供应商ID"
              value={newReceipt.supplier_id || ''}
              onChange={(e) => setNewReceipt({ ...newReceipt, supplier_id: e.target.value })}
              fullWidth
            />
            <TextField
              label="仓库ID"
              value={newReceipt.warehouse_id || ''}
              onChange={(e) => setNewReceipt({ ...newReceipt, warehouse_id: e.target.value })}
              fullWidth
            />
            <TextField
              label="入库日期"
              type="date"
              value={newReceipt.receipt_date || ''}
              onChange={(e) => setNewReceipt({ ...newReceipt, receipt_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="总数量"
              type="number"
              value={newReceipt.total_quantity || ''}
              onChange={(e) =>
                setNewReceipt({ ...newReceipt, total_quantity: Number(e.target.value) })
              }
              fullWidth
            />
            <TextField
              label="总金额"
              type="number"
              value={newReceipt.total_amount || ''}
              onChange={(e) =>
                setNewReceipt({ ...newReceipt, total_amount: Number(e.target.value) })
              }
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !newReceipt.receipt_number}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PurchaseReceiptPage;
