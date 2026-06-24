import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { reportApi } from '../api/finance';

interface LedgerRow {
  date: string;
  voucher_no: string;
  summary: string;
  debit: number;
  credit: number;
  balance: number;
  counterparty?: string;
}

export const FinanceLedgerPage: React.FC = () => {
  const [items, setItems] = useState<LedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [accountId, setAccountId] = useState('');
  const [startPeriod, setStartPeriod] = useState('');
  const [endPeriod, setEndPeriod] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (p = page) => {
    if (!accountId || !startPeriod || !endPeriod) return;
    setLoading(true);
    setError(null);
    try {
      const res = await reportApi.getAccountLedger({
        account_id: accountId,
        start_period: startPeriod,
        end_period: endPeriod,
        page: p,
        page_size: pageSize,
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
    // 不自动加载
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            总账 / 明细账
          </Typography>
          <Typography variant="body2" color="text.secondary">
            按科目和期间查询账务明细
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => load(1)}>
          刷新
        </Button>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="科目ID"
            size="small"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          />
          <TextField
            label="开始期间"
            size="small"
            placeholder="YYYY-MM"
            value={startPeriod}
            onChange={(e) => setStartPeriod(e.target.value)}
          />
          <TextField
            label="结束期间"
            size="small"
            placeholder="YYYY-MM"
            value={endPeriod}
            onChange={(e) => setEndPeriod(e.target.value)}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>公司</InputLabel>
            <Select label="公司" value="">
              <MenuItem value="">全部</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<SearchIcon />} onClick={() => load(1)}>
            查询
          </Button>
        </Box>
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
                <TableCell>日期</TableCell>
                <TableCell>凭证号</TableCell>
                <TableCell>摘要</TableCell>
                <TableCell>对方</TableCell>
                <TableCell align="right">借方</TableCell>
                <TableCell align="right">贷方</TableCell>
                <TableCell align="right">余额</TableCell>
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
                    <Typography color="text.secondary">
                      请选择科目与期间后查询
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.voucher_no}</TableCell>
                    <TableCell>{row.summary}</TableCell>
                    <TableCell>{row.counterparty ?? '-'}</TableCell>
                    <TableCell align="right">
                      {row.debit.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right">
                      {row.credit.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right">
                      {row.balance.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
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

export default FinanceLedgerPage;
