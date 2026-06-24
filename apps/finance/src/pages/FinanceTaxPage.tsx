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
  TextField,
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon, Search as SearchIcon } from '@mui/icons-material';
import { taxApi } from '../api/finance';

interface Declaration {
  id: string;
  declaration_no: string;
  tax_type: string;
  period: string;
  amount: number;
  status: string;
  submitted_at?: string;
}

export const FinanceTaxPage: React.FC = () => {
  const [items, setItems] = useState<Declaration[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await taxApi.listDeclarations({
        page: p,
        page_size: pageSize,
        period: keyword || undefined,
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            税务管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            增值税、所得税等申报
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => load()}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />}>
            新建申报
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="期间 YYYY-MM"
            size="small"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(1)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
            }}
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

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>申报编号</TableCell>
                <TableCell>税种</TableCell>
                <TableCell>期间</TableCell>
                <TableCell align="right">金额</TableCell>
                <TableCell>提交时间</TableCell>
                <TableCell>状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无申报记录</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((d) => (
                  <TableRow key={d.id} hover>
                    <TableCell>{d.declaration_no}</TableCell>
                    <TableCell>{d.tax_type}</TableCell>
                    <TableCell>{d.period}</TableCell>
                    <TableCell align="right">
                      ¥{d.amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{d.submitted_at ?? '-'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={d.status} />
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

export default FinanceTaxPage;
