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
  Tabs,
  Tab,
} from '@mui/material';

import { invoiceApi } from '../api/finance';
import type { Invoice, InvoiceStatus } from '../api/finance';
import { Plus, RefreshCw } from 'lucide-react';
const AddIcon = Plus;
const RefreshIcon = RefreshCw;

const statusColor: Record<InvoiceStatus, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  approved: 'primary',
  invoiced: 'warning',
  partial_received: 'warning',
  received: 'success',
  overdue: 'error',
};

const statusLabel: Record<InvoiceStatus, string> = {
  draft: '草稿',
  approved: '已审核',
  invoiced: '已开票',
  partial_received: '部分收款',
  received: '已收款',
  overdue: '已逾期',
};

export const FinanceInvoicePage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [items, setItems] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoiceApi.list({
        page: p,
        page_size: pageSize,
        invoice_type: tab === 0 ? 'sales' : 'purchase',
      });
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
  }, [tab]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            发票管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            销项 / 进项发票
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => load()}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />}>
            新增发票
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
          <Tab label="销项发票" />
          <Tab label="进项发票" />
        </Tabs>
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
                <TableCell>发票号</TableCell>
                <TableCell>{tab === 0 ? '客户' : '供应商'}</TableCell>
                <TableCell>开票日期</TableCell>
                <TableCell align="right">金额</TableCell>
                <TableCell align="right">税额</TableCell>
                <TableCell align="right">价税合计</TableCell>
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
                    <Typography color="text.secondary">暂无发票数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((inv) => {
                  const s = statusColor[inv.status];
                  return (
                    <TableRow key={inv.id} hover>
                      <TableCell>{inv.invoice_no}</TableCell>
                      <TableCell>{inv.counterparty_name}</TableCell>
                      <TableCell>{inv.invoice_date}</TableCell>
                      <TableCell align="right">
                        {inv.amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right">
                        {inv.tax_amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right">
                        {inv.total_amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={statusLabel[inv.status]} color={s} />
                      </TableCell>
                    </TableRow>
                  );
                })
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

export default FinanceInvoicePage;
