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

import { receivablePayableApi } from '../api/finance';
import type { PaymentRecord } from '../api/finance';
import { Plus, RefreshCw } from 'lucide-react';
const AddIcon = Plus;
const RefreshIcon = RefreshCw;

const statusColor: Record<PaymentRecord['status'], 'default' | 'success' | 'error'> = {
  recorded: 'default',
  matched: 'success',
  cancelled: 'error',
};

const statusLabel: Record<PaymentRecord['status'], string> = {
  recorded: '已记录',
  matched: '已核销',
  cancelled: '已取消',
};

export const FinancePaymentPage: React.FC = () => {
  const [items, setItems] = useState<PaymentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await receivablePayableApi.listPayments({ page: p, page_size: pageSize });
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
            付款管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            供应商付款记录与核销
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => load()}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />}>
            新增付款
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
                <TableCell>付款单号</TableCell>
                <TableCell>供应商</TableCell>
                <TableCell>付款日期</TableCell>
                <TableCell align="right">金额</TableCell>
                <TableCell>银行账户</TableCell>
                <TableCell>凭证号</TableCell>
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
                    <Typography color="text.secondary">暂无付款记录</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{p.payment_no}</TableCell>
                    <TableCell>{p.supplier_name}</TableCell>
                    <TableCell>{p.payment_date}</TableCell>
                    <TableCell align="right">
                      ¥
                      {p.amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {p.bank_name} {p.bank_account_no}
                    </TableCell>
                    <TableCell>{p.voucher_no ?? '-'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={statusLabel[p.status]} color={statusColor[p.status]} />
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

export default FinancePaymentPage;
