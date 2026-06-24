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
  Tabs,
  Tab,
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
  CheckCircle as CheckCircleIcon,
  LocalShipping as LocalShippingIcon,
  Inventory as OutboundIcon,
} from '@mui/icons-material';
import {
  inboundOrderApi,
  outboundOrderApi,
  type InboundOrder,
  type OutboundOrder,
  type PaginatedResult,
  type ListParams,
} from '../api/wms';

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
    case 'shipped':
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
    case 'shipped':
      return '已发货';
    case 'completed':
      return '已完成';
    case 'cancelled':
      return '已取消';
    default:
      return status;
  }
};

export const InOutBoundPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [inboundOrders, setInboundOrders] = useState<InboundOrder[]>([]);
  const [outboundOrders, setOutboundOrders] = useState<OutboundOrder[]>([]);
  const [inboundTotal, setInboundTotal] = useState(0);
  const [outboundTotal, setOutboundTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadInbound = async (p: number, ps: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: ListParams = {
        page: p,
        page_size: ps,
        search: searchKeyword || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      const data: PaginatedResult<InboundOrder> = await inboundOrderApi.list(params);
      setInboundOrders(data.items);
      setInboundTotal(data.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载入库单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadOutbound = async (p: number, ps: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: ListParams = {
        page: p,
        page_size: ps,
        search: searchKeyword || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      const data: PaginatedResult<OutboundOrder> = await outboundOrderApi.list(params);
      setOutboundOrders(data.items);
      setOutboundTotal(data.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载出库单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 0) {
      loadInbound(1, pageSize);
    } else {
      loadOutbound(1, pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleSearch = () => {
    if (tab === 0) {
      loadInbound(1, pageSize);
    } else {
      loadOutbound(1, pageSize);
    }
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, p: number) => {
    if (tab === 0) {
      loadInbound(p, pageSize);
    } else {
      loadOutbound(p, pageSize);
    }
  };

  const handleConfirmInbound = async (id: string) => {
    try {
      await inboundOrderApi.confirm(id);
      await loadInbound(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认入库单失败');
    }
  };

  const handleShipOutbound = async (id: string) => {
    try {
      await outboundOrderApi.ship(id);
      await loadOutbound(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发货失败');
    }
  };

  const total = tab === 0 ? inboundTotal : outboundTotal;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          出入库管理
        </Typography>
        <Typography variant="body2" color="text.secondary">
          入库与出库单据的统一管理
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab icon={<LocalShippingIcon />} iconPosition="start" label="入库单" />
          <Tab icon={<OutboundIcon />} iconPosition="start" label="出库单" />
        </Tabs>
      </Paper>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                {tab === 0 ? (
                  <LocalShippingIcon color="primary" fontSize="large" />
                ) : (
                  <OutboundIcon color="primary" fontSize="large" />
                )}
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {tab === 0 ? '入库单总数' : '出库单总数'}
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
                {tab === 0 ? (
                  <LocalShippingIcon color="warning" fontSize="large" />
                ) : (
                  <OutboundIcon color="warning" fontSize="large" />
                )}
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    待确认
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {(tab === 0 ? inboundOrders : outboundOrders).filter(
                      (o) => o.status === 'pending'
                    ).length}
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
                {tab === 0 ? (
                  <LocalShippingIcon color="info" fontSize="large" />
                ) : (
                  <OutboundIcon color="info" fontSize="large" />
                )}
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    已确认
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {(tab === 0 ? inboundOrders : outboundOrders).filter(
                      (o) => o.status === 'confirmed' || o.status === 'shipped'
                    ).length}
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
                {tab === 0 ? (
                  <LocalShippingIcon color="success" fontSize="large" />
                ) : (
                  <OutboundIcon color="success" fontSize="large" />
                )}
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    已完成
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {(tab === 0 ? inboundOrders : outboundOrders).filter(
                      (o) => o.status === 'completed'
                    ).length}
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
            placeholder="搜索单号..."
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
              <MenuItem value="shipped">已发货</MenuItem>
              <MenuItem value="completed">已完成</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={handleSearch}>
            搜索
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() =>
              tab === 0 ? loadInbound(page, pageSize) : loadOutbound(page, pageSize)
            }
          >
            刷新
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
              {tab === 0 ? (
                <TableRow>
                  <TableCell>入库单号</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>仓库</TableCell>
                  <TableCell>供应商</TableCell>
                  <TableCell>预计日期</TableCell>
                  <TableCell align="right">数量</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell>出库单号</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>仓库</TableCell>
                  <TableCell>客户</TableCell>
                  <TableCell>预计日期</TableCell>
                  <TableCell align="right">数量</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              )}
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : tab === 0 ? (
                inboundOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">暂无入库单数据</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  inboundOrders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {order.order_number}
                        </Typography>
                      </TableCell>
                      <TableCell>{order.order_type}</TableCell>
                      <TableCell>{order.warehouse_name || order.warehouse_id}</TableCell>
                      <TableCell>{order.supplier_name || order.supplier_id || '-'}</TableCell>
                      <TableCell>{order.expected_date || '-'}</TableCell>
                      <TableCell align="right">{order.total_quantity || 0}</TableCell>
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
                            onClick={() => handleConfirmInbound(order.id)}
                            title="确认"
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )
              ) : outboundOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无出库单数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                outboundOrders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {order.order_number}
                      </Typography>
                    </TableCell>
                    <TableCell>{order.order_type}</TableCell>
                    <TableCell>{order.warehouse_name || order.warehouse_id}</TableCell>
                    <TableCell>{order.customer_name || order.customer_id || '-'}</TableCell>
                    <TableCell>{order.expected_date || '-'}</TableCell>
                    <TableCell align="right">{order.total_quantity || 0}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(order.status)}
                        size="small"
                        color={getStatusColor(order.status)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {order.status === 'confirmed' && (
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleShipOutbound(order.id)}
                          title="发货"
                        >
                          <LocalShippingIcon fontSize="small" />
                        </IconButton>
                      )}
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

export default InOutBoundPage;
