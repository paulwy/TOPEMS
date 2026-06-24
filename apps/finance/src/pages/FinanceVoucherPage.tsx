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
  Chip,
  Pagination,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon, Search as SearchIcon } from '@mui/icons-material';
import { voucherApi } from '../api/finance';
import type { Voucher, VoucherStatus } from '../api/finance';

const statusLabel: Record<VoucherStatus, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  draft: { label: '草稿', color: 'default' },
  submitted: { label: '已提交', color: 'primary' },
  approved: { label: '已审核', color: 'warning' },
  posted: { label: '已过账', color: 'success' },
  reversed: { label: '已冲销', color: 'error' },
};

export const FinanceVoucherPage: React.FC = () => {
  const [items, setItems] = useState<Voucher[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (p = page, k = keyword, s = status) => {
    setLoading(true);
    setError(null);
    try {
      const res = await voucherApi.list({
        page: p,
        page_size: pageSize,
        keyword: k || undefined,
        status: s !== 'all' ? s : undefined,
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
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  const handlePost = async (id: string) => {
    if (!window.confirm('确定过账此凭证？')) return;
    try {
      await voucherApi.post(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '过账失败');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            凭证管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            记账凭证录入、审核与过账
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => load()}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />}>
            新增凭证
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索凭证号或摘要"
            size="small"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(1)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
            }}
            sx={{ minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>状态</InputLabel>
            <Select
              value={status}
              label="状态"
              onChange={(e) => {
                setStatus(e.target.value);
                load(1, keyword, e.target.value);
              }}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="draft">草稿</MenuItem>
              <MenuItem value="submitted">已提交</MenuItem>
              <MenuItem value="approved">已审核</MenuItem>
              <MenuItem value="posted">已过账</MenuItem>
              <MenuItem value="reversed">已冲销</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={() => load(1)}>
            搜索
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
                <TableCell>凭证号</TableCell>
                <TableCell>日期</TableCell>
                <TableCell>期间</TableCell>
                <TableCell>类型</TableCell>
                <TableCell>金额</TableCell>
                <TableCell>摘要</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无凭证数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((v) => {
                  const s = statusLabel[v.status];
                  return (
                    <TableRow key={v.id} hover>
                      <TableCell>{v.voucher_no}</TableCell>
                      <TableCell>{v.voucher_date}</TableCell>
                      <TableCell>{v.period}</TableCell>
                      <TableCell>{v.voucher_type}</TableCell>
                      <TableCell>
                        ¥
                        {v.total_amount.toLocaleString('zh-CN', {
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>{v.summary ?? '-'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={s.label} color={s.color} />
                      </TableCell>
                      <TableCell align="right">
                        {v.status === 'approved' && (
                          <Button size="small" onClick={() => handlePost(v.id)}>
                            过账
                          </Button>
                        )}
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

export default FinanceVoucherPage;
