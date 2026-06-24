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
import { assetApi } from '../api/finance';
import type { FixedAsset } from '../api/finance';

const statusColor: Record<FixedAsset['status'], 'default' | 'primary' | 'warning' | 'error'> = {
  in_use: 'primary',
  idle: 'warning',
  disposed: 'default',
  scrapped: 'error',
};

const statusLabel: Record<FixedAsset['status'], string> = {
  in_use: '在用',
  idle: '闲置',
  disposed: '已处置',
  scrapped: '已报废',
};

export const FinanceAssetPage: React.FC = () => {
  const [items, setItems] = useState<FixedAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await assetApi.list({ page: p, page_size: pageSize });
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
            固定资产
          </Typography>
          <Typography variant="body2" color="text.secondary">
            资产卡片、折旧计提与处置
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => load()}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<AddIcon />}>
            新增资产
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
                <TableCell>资产编号</TableCell>
                <TableCell>名称</TableCell>
                <TableCell>类别</TableCell>
                <TableCell>规格</TableCell>
                <TableCell align="right">原值</TableCell>
                <TableCell align="right">净值</TableCell>
                <TableCell>购入日期</TableCell>
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
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无资产数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((a) => (
                  <TableRow key={a.id} hover>
                    <TableCell>{a.asset_no}</TableCell>
                    <TableCell>{a.name}</TableCell>
                    <TableCell>{a.category}</TableCell>
                    <TableCell>{a.spec ?? '-'}</TableCell>
                    <TableCell align="right">
                      ¥{a.original_value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right">
                      ¥{a.net_value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{a.purchase_date}</TableCell>
                    <TableCell>
                      <Chip size="small" label={statusLabel[a.status]} color={statusColor[a.status]} />
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

export default FinanceAssetPage;
