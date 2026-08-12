import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Tooltip,
  MenuItem,
  Paper,
  InputAdornment,
} from '@mui/material';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  Calculator,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { PageContainer } from '@/components/common';
import { forecastApi } from '@/api/aps';
import type { DemandForecast, CreateDemandForecastRequest } from '@/api/aps/types';

const METHOD_LABEL: Record<string, string> = {
  moving_average: '移动平均',
  exponential_smoothing: '指数平滑',
  linear_regression: '线性回归',
  arima: 'ARIMA',
};

const QUERY_KEY = 'aps-forecasts';

const emptyForm: CreateDemandForecastRequest = {
  forecast_no: '',
  product_id: '',
  product_name: '',
  forecast_period: '',
  forecast_date: '',
  forecast_quantity: 0,
  actual_quantity: 0,
  method: 'moving_average',
  confidence_level: 0.95,
  notes: '',
};

const ForecastManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateDemandForecastRequest>(emptyForm);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DemandForecast | null>(null);

  const listQuery = useQuery({
    queryKey: [QUERY_KEY, page, pageSize, search],
    queryFn: async () => {
      const res = await forecastApi.list({
        page: page + 1,
        pageSize,
        search: search || undefined,
      });
      if (res.success && res.data) {
        return { items: res.data.items, total: res.data.total };
      }
      return { items: [], total: 0 };
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateDemandForecastRequest) => forecastApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateDemandForecastRequest }) =>
      forecastApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => forecastApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      setDeleteOpen(false);
      setDeleteTarget(null);
    },
  });

  const calculateMutation = useMutation({
    mutationFn: (id: string) => forecastApi.calculate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });

  const validateMutation = useMutation({
    mutationFn: (id: string) => forecastApi.validate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const saving = createMutation.isPending || updateMutation.isPending;

  const handleSearch = () => {
    setSearch(searchInput.trim());
    setPage(0);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (row: DemandForecast) => {
    setEditingId(row.id);
    setForm({
      forecast_no: row.forecast_no,
      product_id: row.product_id ?? '',
      product_name: row.product_name ?? '',
      forecast_period: row.forecast_period ?? '',
      forecast_date: row.forecast_date ?? '',
      forecast_quantity: row.forecast_quantity ?? 0,
      actual_quantity: row.actual_quantity ?? 0,
      method: row.method ?? 'moving_average',
      confidence_level: row.confidence_level ?? 0.95,
      notes: row.notes ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (row: DemandForecast) => {
    setDeleteTarget(row);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  };

  const formatRate = (rate?: number) => {
    if (rate === undefined || rate === null) return '-';
    return `${(rate * 100).toFixed(1)}%`;
  };

  const fieldSx = useMemo(() => ({ minWidth: { xs: '100%', sm: 240 } }), []);

  return (
    <PageContainer
      title='需求预测'
      subtitle='需求预测管理（计算/验证）'
      padding={false}
      maxWidth={false}
    >
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 1 }}>
            <TextField
              placeholder='按预测编号/产品搜索'
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              size='small'
              sx={{ flex: 1, maxWidth: 360 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search size={16} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button variant='outlined' size='small' onClick={handleSearch}>
              搜索
            </Button>
            <Tooltip title='刷新'>
              <IconButton onClick={handleRefresh} size='small'>
                <RefreshCw size={16} />
              </IconButton>
            </Tooltip>
          </Box>
          <Button
            variant='contained'
            size='small'
            startIcon={<Plus size={16} />}
            onClick={handleOpenCreate}
          >
            新增预测
          </Button>
        </Box>

        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper} variant='outlined'>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>预测编号</TableCell>
                    <TableCell>产品</TableCell>
                    <TableCell>预测周期</TableCell>
                    <TableCell align='right'>预测数量</TableCell>
                    <TableCell align='right'>实际数量</TableCell>
                    <TableCell align='right'>准确率</TableCell>
                    <TableCell>方法</TableCell>
                    <TableCell align='center'>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {listQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} align='center'>
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align='center'>
                        <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <TrendingUp size={32} />
                          <Typography variant='body2' color='text.secondary'>
                            暂无需求预测数据
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.forecast_no}</TableCell>
                        <TableCell>{row.product_name ?? '-'}</TableCell>
                        <TableCell>{row.forecast_period ?? '-'}</TableCell>
                        <TableCell align='right'>{row.forecast_quantity ?? 0}</TableCell>
                        <TableCell align='right'>{row.actual_quantity ?? '-'}</TableCell>
                        <TableCell align='right'>{formatRate(row.accuracy_rate)}</TableCell>
                        <TableCell>
                          <Chip
                            label={METHOD_LABEL[row.method ?? ''] ?? row.method ?? '-'}
                            size='small'
                            variant='outlined'
                          />
                        </TableCell>
                        <TableCell align='center'>
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Tooltip title='计算'>
                              <IconButton
                                size='small'
                                color='primary'
                                onClick={() => calculateMutation.mutate(row.id)}
                                disabled={calculateMutation.isPending}
                              >
                                <Calculator size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='验证'>
                              <IconButton
                                size='small'
                                color='success'
                                onClick={() => validateMutation.mutate(row.id)}
                                disabled={validateMutation.isPending}
                              >
                                <ShieldCheck size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='编辑'>
                              <IconButton size='small' onClick={() => handleOpenEdit(row)}>
                                <Edit size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='删除'>
                              <IconButton size='small' color='error' onClick={() => handleDelete(row)}>
                                <Trash2 size={16} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component='div'
              count={total}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50]}
              labelRowsPerPage='每页'
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共 ${count}`}
            />
          </CardContent>
        </Card>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth='md'>
        <DialogTitle>{editingId ? '编辑需求预测' : '新增需求预测'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, pt: 1 }}>
            <TextField
              label='预测编号'
              value={form.forecast_no}
              onChange={(e) => setForm({ ...form, forecast_no: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='产品名称'
              value={form.product_name ?? ''}
              onChange={(e) => setForm({ ...form, product_name: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='预测周期'
              value={form.forecast_period ?? ''}
              onChange={(e) => setForm({ ...form, forecast_period: e.target.value })}
              size='small'
              sx={fieldSx}
              placeholder='如 2026-W33'
            />
            <TextField
              label='预测日期'
              type='date'
              value={form.forecast_date ?? ''}
              onChange={(e) => setForm({ ...form, forecast_date: e.target.value })}
              size='small'
              sx={fieldSx}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label='预测数量'
              type='number'
              value={form.forecast_quantity ?? 0}
              onChange={(e) => setForm({ ...form, forecast_quantity: Number(e.target.value) })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='实际数量'
              type='number'
              value={form.actual_quantity ?? 0}
              onChange={(e) => setForm({ ...form, actual_quantity: Number(e.target.value) })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='预测方法'
              select
              value={form.method ?? 'moving_average'}
              onChange={(e) =>
                setForm({ ...form, method: e.target.value as CreateDemandForecastRequest['method'] })
              }
              size='small'
              sx={fieldSx}
            >
              <MenuItem value='moving_average'>移动平均</MenuItem>
              <MenuItem value='exponential_smoothing'>指数平滑</MenuItem>
              <MenuItem value='linear_regression'>线性回归</MenuItem>
              <MenuItem value='arima'>ARIMA</MenuItem>
            </TextField>
            <TextField
              label='置信水平'
              type='number'
              value={form.confidence_level ?? 0.95}
              onChange={(e) => setForm({ ...form, confidence_level: Number(e.target.value) })}
              size='small'
              sx={fieldSx}
              helperText='0-1 之间，如 0.95'
            />
            <TextField
              label='备注'
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              size='small'
              sx={{ minWidth: { xs: '100%', sm: '100%' } }}
              multiline
              minRows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant='contained' onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确认要删除需求预测「{deleteTarget?.forecast_no}」吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>取消</Button>
          <Button
            variant='contained'
            color='error'
            onClick={confirmDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? '删除中...' : '删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ForecastManagementPage;
