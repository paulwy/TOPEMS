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
import type { CollectionRecord } from '../api/finance';
import { Plus, RefreshCw } from 'lucide-react';
const AddIcon = Plus;
const RefreshIcon = RefreshCw;

const statusColor: Record<CollectionRecord['status'], 'default' | 'success' | 'error'> = {
  recorded: 'default',
  matched: 'success',
  cancelled: 'error',
};

const statusLabel: Record<CollectionRecord['status'], string> = {
  recorded: '已记录',
  matched: '已核销',
  cancelled: '已取消',
};

export const FinanceReceiptPage: React.FC = () => {
  const [items, setItems] = useState<CollectionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await receivablePayableApi.listCollections({ page: p, page_size: pageSize });
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
            收款管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            客户收款记录与核销
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => load()}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />}>
            新增收款
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
                <TableCell>收款单号</TableCell>
                <TableCell>客户</TableCell>
                <TableCell>收款日期</TableCell>
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
                    <Typography color="text.secondary">暂无收款记录</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>{c.collection_no}</TableCell>
                    <TableCell>{c.customer_name}</TableCell>
                    <TableCell>{c.collection_date}</TableCell>
                    <TableCell align="right">
                      ¥
                      {c.amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {c.bank_name} {c.bank_account_no}
                    </TableCell>
                    <TableCell>{c.voucher_no ?? '-'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={statusLabel[c.status]} color={statusColor[c.status]} />
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

export default FinanceReceiptPage;
