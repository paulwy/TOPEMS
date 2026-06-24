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
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  FactCheck as FactCheckIcon,
} from '@mui/icons-material';
import {
  stockTakeApi,
  type StockTake,
  type PaginatedResult,
  type ListParams,
} from '../api/wms';

const getStatusColor = (
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'draft':
      return 'default';
    case 'in_progress':
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
    case 'in_progress':
      return '进行中';
    case 'completed':
      return '已完成';
    case 'cancelled':
      return '已取消';
    default:
      return status;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'full':
      return '全盘';
    case 'partial':
      return '部分盘点';
    case 'cycle':
      return '循环盘点';
    default:
      return type;
  }
};

export const InventoryCheckPage: React.FC = () => {
  const [stockTakes, setStockTakes] = useState<StockTake[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newStockTake, setNewStockTake] = useState<Partial<StockTake>>({
    stock_take_number: '',
    stock_take_type: 'full',
    planned_date: new Date().toISOString().slice(0, 10),
    status: 'draft',
  });

  const loadStockTakes = async (p: number, ps: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: ListParams = {
        page: p,
        page_size: ps,
        search: searchKeyword || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      const data: PaginatedResult<StockTake> = await stockTakeApi.list(params);
      setStockTakes(data.items);
      setTotal(data.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载盘点单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockTakes(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    loadStockTakes(1, pageSize);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, p: number) => {
    loadStockTakes(p, pageSize);
  };

  const handleCreate = async () => {
    if (!newStockTake.stock_take_number) return;
    setSubmitting(true);
    try {
      await stockTakeApi.create(newStockTake as any);
      setCreateDialogOpen(false);
      setNewStockTake({
        stock_take_number: '',
        stock_take_type: 'full',
        planned_date: new Date().toISOString().slice(0, 10),
        status: 'draft',
      });
      await loadStockTakes(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建盘点单失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      await stockTakeApi.start(id);
      await loadStockTakes(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '启动盘点失败');
    }
  };

  const handleComplete = async (id: string) => {
    if (!window.confirm('确定要完成本次盘点吗？')) return;
    try {
      await stockTakeApi.complete(id);
      await loadStockTakes(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '完成盘点失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该盘点单吗？')) return;
    try {
      await stockTakeApi.delete(id);
      await loadStockTakes(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除盘点单失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            库存盘点
          </Typography>
          <Typography variant="body2" color="text.secondary">
            定期/不定期库存盘点与差异调整
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadStockTakes(page, pageSize)}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新增盘点单
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <FactCheckIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    盘点单总数
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
                <FactCheckIcon color="info" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    进行中
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {stockTakes.filter((s) => s.status === 'in_progress').length}
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
                <FactCheckIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    已完成
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {stockTakes.filter((s) => s.status === 'completed').length}
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
                <FactCheckIcon color="warning" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    差异项
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {stockTakes.reduce((sum, s) => sum + (s.discrepancy_items || 0), 0)}
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
            placeholder="搜索盘点单号..."
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
              <MenuItem value="in_progress">进行中</MenuItem>
              <MenuItem value="completed">已完成</MenuItem>
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
                <TableCell>盘点单号</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>仓库</TableCell>
                <TableCell>计划日期</TableCell>
                <TableCell>实际日期</TableCell>
                <TableCell align="right">计划项</TableCell>
                <TableCell align="right">差异项</TableCell>
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
              ) : stockTakes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无盘点单数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                stockTakes.map((stockTake) => (
                  <TableRow key={stockTake.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {stockTake.stock_take_number}
                      </Typography>
                    </TableCell>
                    <TableCell>{getTypeLabel(stockTake.stock_take_type)}</TableCell>
                    <TableCell>{stockTake.warehouse_name || stockTake.warehouse_id}</TableCell>
                    <TableCell>{stockTake.planned_date || '-'}</TableCell>
                    <TableCell>{stockTake.actual_date || '-'}</TableCell>
                    <TableCell align="right">{stockTake.total_items || 0}</TableCell>
                    <TableCell align="right">{stockTake.discrepancy_items || 0}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(stockTake.status)}
                        size="small"
                        color={getStatusColor(stockTake.status)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {stockTake.status === 'draft' && (
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleStart(stockTake.id)}
                          title="启动"
                        >
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                      )}
                      {stockTake.status === 'in_progress' && (
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleComplete(stockTake.id)}
                          title="完成"
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(stockTake.id)}
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
        <DialogTitle>新增盘点单</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="盘点单号"
              required
              value={newStockTake.stock_take_number || ''}
              onChange={(e) =>
                setNewStockTake({ ...newStockTake, stock_take_number: e.target.value })
              }
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>盘点类型</InputLabel>
              <Select
                value={newStockTake.stock_take_type || 'full'}
                label="盘点类型"
                onChange={(e) =>
                  setNewStockTake({ ...newStockTake, stock_take_type: e.target.value })
                }
              >
                <MenuItem value="full">全盘</MenuItem>
                <MenuItem value="partial">部分盘点</MenuItem>
                <MenuItem value="cycle">循环盘点</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="仓库ID"
              required
              value={newStockTake.warehouse_id || ''}
              onChange={(e) =>
                setNewStockTake({ ...newStockTake, warehouse_id: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="计划日期"
              type="date"
              value={newStockTake.planned_date || ''}
              onChange={(e) =>
                setNewStockTake({ ...newStockTake, planned_date: e.target.value })
              }
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !newStockTake.stock_take_number || !newStockTake.warehouse_id}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InventoryCheckPage;
