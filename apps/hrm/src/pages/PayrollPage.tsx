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
  Stack,
  Button,
  IconButton,
  Pagination,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

import { CreditCard, DollarSign, Play, Plus, RefreshCw } from 'lucide-react';

import { payrollApi, type PayrollRun } from '../api/hrm';

const PaymentIcon = CreditCard;
const AddIcon = Plus;
const RefreshIcon = RefreshCw;
const PlayArrowIcon = Play;
const AttachMoneyIcon = DollarSign;

const getStatusColor = (
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'paid':
    case 'completed':
      return 'success';
    case 'pending':
    case 'draft':
      return 'default';
    case 'calculating':
    case 'processing':
      return 'info';
    case 'failed':
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'paid':
    case 'completed':
      return '已发放';
    case 'pending':
    case 'draft':
      return '待处理';
    case 'calculating':
    case 'processing':
      return '计算中';
    case 'failed':
    case 'cancelled':
      return '已取消';
    default:
      return status;
  }
};

export const PayrollPage: React.FC = () => {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPayPeriod, setNewPayPeriod] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRuns = async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await payrollApi.list({ page: p, page_size: pageSize });
      setRuns(data.items);
      setTotal(data.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载薪资列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!newPayPeriod) return;
    setSubmitting(true);
    try {
      await payrollApi.create({ pay_period: newPayPeriod });
      setCreateDialogOpen(false);
      setNewPayPeriod('');
      await loadRuns(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建薪资批次失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCalculate = async (id: string) => {
    try {
      await payrollApi.calculate(id);
      await loadRuns(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '计算薪资失败');
    }
  };

  const handlePay = async (id: string) => {
    if (!window.confirm('确定要发放该批次薪资吗？')) return;
    try {
      await payrollApi.pay(id);
      await loadRuns(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发放薪资失败');
    }
  };

  const totalAmount = runs.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            薪资管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理员工薪资批次、计算与发放
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadRuns(page)}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新建批次
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                <AttachMoneyIcon color="primary" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    批次总数
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {total}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                <AttachMoneyIcon color="success" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    已发放
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {runs.filter((r) => r.status === 'paid' || r.status === 'completed').length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                <AttachMoneyIcon color="warning" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    待发放
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {runs.filter((r) => r.status === 'pending' || r.status === 'draft').length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Stack direction="row" sx={{ alignItems: 'center' }} spacing={2}>
                <AttachMoneyIcon color="info" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    当前页总额
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    ¥{totalAmount.toLocaleString()}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
                <TableCell>薪资周期</TableCell>
                <TableCell>员工数</TableCell>
                <TableCell>总金额</TableCell>
                <TableCell>发放时间</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : runs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无薪资批次</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                runs.map((run) => (
                  <TableRow key={run.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {run.pay_period}
                      </Typography>
                    </TableCell>
                    <TableCell>{run.employee_count}</TableCell>
                    <TableCell>¥{(run.total_amount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      {run.paid_at
                        ? new Date(run.paid_at).toLocaleString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(run.status)}
                        size="small"
                        color={getStatusColor(run.status)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {(run.status === 'draft' || run.status === 'pending') && (
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleCalculate(run.id)}
                          title="计算薪资"
                        >
                          <PlayArrowIcon size={16} />
                        </IconButton>
                      )}
                      {(run.status === 'calculating' || run.status === 'processing') && (
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handlePay(run.id)}
                          title="发放薪资"
                        >
                          <PaymentIcon size={16} />
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
              onChange={(_, p) => loadRuns(p)}
              size="small"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建薪资批次</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="薪资周期"
              required
              placeholder="例如：2025-01"
              value={newPayPeriod}
              onChange={(e) => setNewPayPeriod(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !newPayPeriod}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PayrollPage;
