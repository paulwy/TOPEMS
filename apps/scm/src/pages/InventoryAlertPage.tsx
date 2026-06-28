import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, TextField,
  Button, Stack, Pagination, CircularProgress, Alert, Card, CardContent,
  Grid, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';

import { AlertTriangle, CheckCircle, CircleAlert, Clock, Eye, RefreshCw, Search } from 'lucide-react';

import {
  inventoryAlertApi, type InventoryAlert, type PaginatedResult, type ListParams,
} from '../api/wms';

const CheckCircleIcon = CheckCircle;
const AccessTimeIcon = Clock;
const SearchIcon = Search;
const RefreshIcon = RefreshCw;
const WarningIcon = AlertTriangle;
const ErrorOutlineIcon = CircleAlert;
const VisibilityIcon = Eye;

const getAlertTypeColor = (type: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (type) {
    case 'low_stock': return 'warning';
    case 'over_stock': return 'info';
    case 'expiring': return 'warning';
    case 'expired': return 'error';
    default: return 'default';
  }
};

const getAlertTypeLabel = (type: string) => {
  switch (type) {
    case 'low_stock': return '低库存';
    case 'over_stock': return '超储';
    case 'expiring': return '即将过期';
    case 'expired': return '已过期';
    default: return type;
  }
};

const getStatusColor = (status: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'pending': return 'warning';
    case 'acknowledged': return 'info';
    case 'resolved': return 'success';
    default: return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return '待处理';
    case 'acknowledged': return '已确认';
    case 'resolved': return '已解决';
    default: return status;
  }
};

export const InventoryAlertPage: React.FC = () => {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadAlerts = async (p: number, ps: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: ListParams = {
        page: p,
        page_size: ps,
        search: searchKeyword || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      const data: PaginatedResult<InventoryAlert> = await inventoryAlertApi.list(params);
      let filtered = data.items;
      if (typeFilter !== 'all') {
        filtered = filtered.filter((a) => a.alert_type === typeFilter);
      }
      setAlerts(filtered);
      setTotal(data.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载预警列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    loadAlerts(1, pageSize);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, p: number) => {
    loadAlerts(p, pageSize);
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await inventoryAlertApi.acknowledge(id);
      await loadAlerts(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认预警失败');
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await inventoryAlertApi.resolve(id);
      await loadAlerts(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '解决预警失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const pendingCount = alerts.filter((a) => a.status === 'pending').length;
  const lowStockCount = alerts.filter((a) => a.alert_type === 'low_stock').length;
  const expiredCount = alerts.filter((a) => a.alert_type === 'expired').length;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            库存预警
          </Typography>
          <Typography variant="body2" color="text.secondary">
            库存阈值监控与异常预警处理
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadAlerts(page, pageSize)}>
            刷新
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                <WarningIcon color="warning" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">待处理预警</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>{pendingCount}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                <AccessTimeIcon color="warning" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">低库存预警</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>{lowStockCount}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                <ErrorOutlineIcon color="error" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">过期预警</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>{expiredCount}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                <CheckCircleIcon color="success" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">已解决</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {alerts.filter((a) => a.status === 'resolved').length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <TextField
            placeholder="搜索 SKU/产品名称..."
            
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
             
            slotProps={{ input: { size: 'small', startAdornment: <SearchIcon style={{ color: '#9e9e9e', marginRight: 1, fontSize: 20 }}  />  }}}
            sx={{ minWidth: 280 }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>类型</InputLabel>
            <Select value={typeFilter} label="类型" onChange={(e) => setTypeFilter(e.target.value)}>
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="low_stock">低库存</MenuItem>
              <MenuItem value="over_stock">超储</MenuItem>
              <MenuItem value="expiring">即将过期</MenuItem>
              <MenuItem value="expired">已过期</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>状态</InputLabel>
            <Select value={statusFilter} label="状态" onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="pending">待处理</MenuItem>
              <MenuItem value="acknowledged">已确认</MenuItem>
              <MenuItem value="resolved">已解决</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={handleSearch}>搜索</Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>产品名称</TableCell>
                <TableCell>仓库</TableCell>
                <TableCell>预警类型</TableCell>
                <TableCell align="right">当前库存</TableCell>
                <TableCell align="right">最小/最大阈值</TableCell>
                <TableCell>预警时间</TableCell>
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
              ) : alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无预警数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((alert) => (
                  <TableRow key={alert.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{alert.sku}</Typography>
                    </TableCell>
                    <TableCell>{alert.product_name}</TableCell>
                    <TableCell>{alert.warehouse_name || '-'}</TableCell>
                    <TableCell>
                      <Chip label={getAlertTypeLabel(alert.alert_type)} size="small" color={getAlertTypeColor(alert.alert_type)} />
                    </TableCell>
                    <TableCell align="right">{alert.current_quantity}</TableCell>
                    <TableCell align="right">
                      {alert.min_quantity !== undefined && alert.max_quantity !== undefined
                        ? `${alert.min_quantity} / ${alert.max_quantity}`
                        : alert.min_quantity !== undefined
                        ? `>= ${alert.min_quantity}`
                        : alert.max_quantity !== undefined
                        ? `<= ${alert.max_quantity}`
                        : '-'}
                    </TableCell>
                    <TableCell>{alert.alert_date?.split('T')[0] || '-'}</TableCell>
                    <TableCell>
                      <Chip label={getStatusLabel(alert.status)} size="small" color={getStatusColor(alert.status)} />
                    </TableCell>
                    <TableCell align="right">
                      {alert.status === 'pending' && (
                        <IconButton size="small" color="info" onClick={() => handleAcknowledge(alert.id)} title="确认">
                          <VisibilityIcon size={16} />
                        </IconButton>
                      )}
                      {alert.status !== 'resolved' && (
                        <IconButton size="small" color="success" onClick={() => handleResolve(alert.id)} title="解决">
                          <CheckCircleIcon size={16} />
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
            <Pagination count={totalPages} page={page} onChange={handlePageChange} size="small" />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default InventoryAlertPage;
