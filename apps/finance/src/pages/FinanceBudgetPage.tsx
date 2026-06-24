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
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { budgetApi } from '../api/finance';
import type { Budget } from '../api/finance';

const statusColor: Record<Budget['status'], 'default' | 'primary' | 'success' | 'warning'> = {
  draft: 'default',
  approved: 'primary',
  executing: 'warning',
  closed: 'success',
};

const statusLabel: Record<Budget['status'], string> = {
  draft: '草稿',
  approved: '已审批',
  executing: '执行中',
  closed: '已关闭',
};

export const FinanceBudgetPage: React.FC = () => {
  const [items, setItems] = useState<Budget[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Budget> | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await budgetApi.list({
        page: p,
        page_size: pageSize,
        period: keyword || undefined,
        status: status !== 'all' ? status : undefined,
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

  const handleSave = async () => {
    if (!editing) return;
    try {
      if (editing.id) {
        await budgetApi.update(editing.id, editing);
      } else {
        await budgetApi.create(editing);
      }
      setEditOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该预算？')) return;
    try {
      await budgetApi.delete(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            预算管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            部门/项目预算编制与执行跟踪
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => load()}>
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing({ period: '', budget_amount: 0, category: 'expense' });
              setEditOpen(true);
            }}
          >
            新增预算
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
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>状态</InputLabel>
            <Select
              value={status}
              label="状态"
              onChange={(e) => {
                setStatus(e.target.value);
                load(1);
              }}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="draft">草稿</MenuItem>
              <MenuItem value="approved">已审批</MenuItem>
              <MenuItem value="executing">执行中</MenuItem>
              <MenuItem value="closed">已关闭</MenuItem>
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
                <TableCell>预算编号</TableCell>
                <TableCell>名称</TableCell>
                <TableCell>期间</TableCell>
                <TableCell>部门</TableCell>
                <TableCell align="right">预算金额</TableCell>
                <TableCell align="right">已用</TableCell>
                <TableCell>执行率</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无预算数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((b) => {
                  const rate = b.budget_amount > 0 ? Math.min(100, (b.used_amount / b.budget_amount) * 100) : 0;
                  return (
                    <TableRow key={b.id} hover>
                      <TableCell>{b.budget_no}</TableCell>
                      <TableCell>{b.name}</TableCell>
                      <TableCell>{b.period}</TableCell>
                      <TableCell>{b.department_name ?? '-'}</TableCell>
                      <TableCell align="right">
                        {b.budget_amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell align="right">
                        {b.used_amount.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress variant="determinate" value={rate} sx={{ flex: 1 }} />
                          <Typography variant="caption">{rate.toFixed(1)}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={statusLabel[b.status]} color={statusColor[b.status]} />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => { setEditing(b); setEditOpen(true); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(b.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
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

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing?.id ? '编辑预算' : '新增预算'}</DialogTitle>
        {editing && (
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="预算名称"
                value={editing.name ?? ''}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
              <TextField
                label="期间 (YYYY-MM)"
                value={editing.period ?? ''}
                onChange={(e) => setEditing({ ...editing, period: e.target.value })}
              />
              <TextField
                label="预算金额"
                type="number"
                value={editing.budget_amount ?? 0}
                onChange={(e) => setEditing({ ...editing, budget_amount: Number(e.target.value) })}
              />
            </Box>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinanceBudgetPage;
