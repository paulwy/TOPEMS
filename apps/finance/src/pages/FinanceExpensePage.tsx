import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Pagination,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { expenseApi } from '../api/finance';
import type { ExpenseReport } from '../api/finance';

const statusColor: Record<ExpenseReport['status'], 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  submitted: 'primary',
  approved: 'success',
  rejected: 'error',
  paid: 'success',
};

const statusLabel: Record<ExpenseReport['status'], string> = {
  draft: '草稿',
  submitted: '已提交',
  approved: '已审核',
  rejected: '已拒绝',
  paid: '已支付',
};

export const FinanceExpensePage: React.FC = () => {
  const [items, setItems] = useState<ExpenseReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await expenseApi.list({ page: p, page_size: pageSize });
      setItems(res.items);
      setTotal(res.total);
      setPage(res.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            费用报销
          </Typography>
          <Typography variant="body2" color="text.secondary">
            员工差旅、办公等费用报销
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => load()}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />}>
            新增报销
          </Button>
        </Box>
      </Box>

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
                <TableCell>报销单号</TableCell>
                <TableCell>申请人</TableCell>
                <TableCell>部门</TableCell>
                <TableCell>类别</TableCell>
                <TableCell>发生日期</TableCell>
                <TableCell align="right">金额</TableCell>
                <TableCell>状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无报销单</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell>{e.report_no}</TableCell>
                    <TableCell>{e.applicant_name}</TableCell>
                    <TableCell>{e.department_name ?? '-'}</TableCell>
                    <TableCell>{e.category}</TableCell>
                    <TableCell>{e.expense_date}</TableCell>
                    <TableCell align="right">
                      ¥{e.total_amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={statusLabel[e.status]} color={statusColor[e.status]} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {total > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination count={totalPages} page={page} onChange={(_e, p) => load(p)} size="small" />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default FinanceExpensePage;
