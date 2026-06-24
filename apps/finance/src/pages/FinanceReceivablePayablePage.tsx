import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
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
  TextField,
  Button,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { receivablePayableApi } from '../api/finance';
import type { SalesInvoice, PurchaseInvoice, InvoiceStatus } from '../api/finance';

const statusLabel: Record<InvoiceStatus, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  draft: { label: '草稿', color: 'default' },
  approved: { label: '已审核', color: 'primary' },
  invoiced: { label: '已开票', color: 'warning' },
  partial_received: { label: '部分收款', color: 'warning' },
  received: { label: '已收款', color: 'success' },
  overdue: { label: '已逾期', color: 'error' },
};

export const FinanceReceivablePayablePage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [receivables, setReceivables] = useState<SalesInvoice[]>([]);
  const [payables, setPayables] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');

  const load = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 0) {
        const res = await receivablePayableApi.listSalesInvoices({
          page: p,
          page_size: 10,
          customer_id: keyword || undefined,
        });
        setReceivables(res.items);
        setTotal(res.total);
      } else {
        const res = await receivablePayableApi.listPurchaseInvoices({
          page: p,
          page_size: 10,
          supplier_id: keyword || undefined,
        });
        setPayables(res.items);
        setTotal(res.total);
      }
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, [tab]);

  const totalPages = Math.ceil(total / 10);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          应收应付管理
        </Typography>
        <Typography variant="body2" color="text.secondary">
          销售应收与采购应付发票
        </Typography>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
          <Tab label="销售应收" />
          <Tab label="采购应付" />
        </Tabs>
      </Paper>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder={tab === 0 ? '客户ID' : '供应商ID'}
            size="small"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(1)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
            }}
            sx={{ minWidth: 280 }}
          />
          <Button variant="outlined" onClick={() => load(1)}>
            查询
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {tab === 0 ? (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>发票号</TableCell>
                  <TableCell>客户</TableCell>
                  <TableCell>开票日期</TableCell>
                  <TableCell>到期日</TableCell>
                  <TableCell align="right">应收金额</TableCell>
                  <TableCell align="right">已收</TableCell>
                  <TableCell align="right">未收</TableCell>
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
                ) : receivables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">暂无数据</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  receivables.map((inv) => {
                    const s = statusLabel[inv.status];
                    return (
                      <TableRow key={inv.id} hover>
                        <TableCell>{inv.invoice_no}</TableCell>
                        <TableCell>{inv.customer_name}</TableCell>
                        <TableCell>{inv.invoice_date}</TableCell>
                        <TableCell>{inv.due_date}</TableCell>
                        <TableCell align="right">
                          {inv.total_amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell align="right">
                          {inv.received_amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell align="right">
                          {inv.pending_amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={s.label} color={s.color} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>发票号</TableCell>
                  <TableCell>供应商</TableCell>
                  <TableCell>收票日期</TableCell>
                  <TableCell>到期日</TableCell>
                  <TableCell align="right">应付金额</TableCell>
                  <TableCell align="right">已付</TableCell>
                  <TableCell align="right">未付</TableCell>
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
                ) : payables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">暂无数据</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  payables.map((inv) => {
                    const s = statusLabel[inv.status];
                    return (
                      <TableRow key={inv.id} hover>
                        <TableCell>{inv.invoice_no}</TableCell>
                        <TableCell>{inv.supplier_name}</TableCell>
                        <TableCell>{inv.invoice_date}</TableCell>
                        <TableCell>{inv.due_date}</TableCell>
                        <TableCell align="right">
                          {inv.total_amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell align="right">
                          {inv.paid_amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell align="right">
                          {inv.pending_amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={s.label} color={s.color} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {total > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
          <Pagination count={totalPages} page={page} onChange={(_e, p) => load(p)} size="small" />
        </Box>
      )}
    </Box>
  );
};

export default FinanceReceivablePayablePage;
