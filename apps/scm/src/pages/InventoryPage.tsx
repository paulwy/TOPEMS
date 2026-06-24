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
  TextField,
  Button,
  Stack,
  Pagination,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Inventory2 as InventoryIcon,
} from '@mui/icons-material';
import { inventoryApi, type InventoryItem, type PaginatedResult, type ListParams } from '../api/scm';

const getStatusColor = (
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'normal':
      return 'success';
    case 'low':
      return 'warning';
    case 'out':
      return 'error';
    case 'reserved':
      return 'info';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'normal':
      return '正常';
    case 'low':
      return '低库存';
    case 'out':
      return '缺货';
    case 'reserved':
      return '预留';
    default:
      return status;
  }
};

export const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadInventory = async (p: number, ps: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: ListParams = {
        page: p,
        page_size: ps,
        search: searchKeyword || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      const data: PaginatedResult<InventoryItem> = await inventoryApi.list(params);
      setItems(data.items);
      setTotal(data.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载库存列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    loadInventory(1, pageSize);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, p: number) => {
    loadInventory(p, pageSize);
  };

  const totalPages = Math.ceil(total / pageSize);
  const totalQuantity = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const lowStockCount = items.filter((i) => i.status === 'low' || i.status === 'out').length;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            库存管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            SKU 库存数量、可用量与库位分布
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadInventory(page, pageSize)}
          >
            刷新
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <InventoryIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    SKU 总数
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
                <InventoryIcon color="info" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    当前页库存总量
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {totalQuantity.toLocaleString()}
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
                <WarningIcon color="warning" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    异常 SKU
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {lowStockCount}
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
                <InventoryIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    正常 SKU
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {items.filter((i) => i.status === 'normal').length}
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
            placeholder="搜索 SKU/名称..."
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
              <MenuItem value="normal">正常</MenuItem>
              <MenuItem value="low">低库存</MenuItem>
              <MenuItem value="out">缺货</MenuItem>
              <MenuItem value="reserved">预留</MenuItem>
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
                <TableCell>SKU</TableCell>
                <TableCell>名称</TableCell>
                <TableCell>规格</TableCell>
                <TableCell>单位</TableCell>
                <TableCell align="right">库存数量</TableCell>
                <TableCell align="right">可用数量</TableCell>
                <TableCell>仓库</TableCell>
                <TableCell>状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无库存数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.sku}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.specification || '-'}</TableCell>
                    <TableCell>{item.unit || '-'}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">{item.available_quantity}</TableCell>
                    <TableCell>{item.warehouse_name || item.warehouse_id}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(item.status)}
                        size="small"
                        color={getStatusColor(item.status)}
                      />
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
    </Container>
  );
};

export default InventoryPage;
