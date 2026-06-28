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

import { Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
const AddIcon = Plus;
const RefreshIcon = RefreshCw;
const SearchIcon = Search;

import { accountApi } from '../api/finance';
import type { Account, AccountCategory } from '../api/finance';

const DeleteIcon = Trash2;
const EditIcon = Pencil;

const categoryLabel: Record<AccountCategory, string> = {
  asset: '资产类',
  liability: '负债类',
  equity: '权益类',
  cost: '成本类',
  expense: '费用类',
  income: '收入类',
};

const directionLabel = {
  debit: '借',
  credit: '贷',
} as const;

export const FinanceAccountPage: React.FC = () => {
  const [items, setItems] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Account> | null>(null);

  const load = async (p = page, k = keyword, c = category) => {
    setLoading(true);
    setError(null);
    try {
      const res = await accountApi.list({
        page: p,
        page_size: pageSize,
        keyword: k || undefined,
        category: c !== 'all' ? (c as AccountCategory) : undefined,
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
        await accountApi.update(editing.id, editing);
      } else {
        await accountApi.create(editing);
      }
      setEditOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个科目吗？')) return;
    try {
      await accountApi.delete(id);
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
            科目管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理会计科目体系
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
              setEditing({ category: 'asset', balance_direction: 'debit', level: 1 });
              setEditOpen(true);
            }}
          >
            新增科目
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索科目编码或名称"
            
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(1)}
             
            slotProps={{ input: { size: 'small', startAdornment: <SearchIcon style={{ color: '#9e9e9e', marginRight: 1, fontSize: 20 }}  />  }}}
            sx={{ minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>类别</InputLabel>
            <Select
              value={category}
              label="类别"
              onChange={(e) => {
                setCategory(e.target.value);
                load(1, keyword, e.target.value);
              }}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="asset">资产类</MenuItem>
              <MenuItem value="liability">负债类</MenuItem>
              <MenuItem value="equity">权益类</MenuItem>
              <MenuItem value="cost">成本类</MenuItem>
              <MenuItem value="expense">费用类</MenuItem>
              <MenuItem value="income">收入类</MenuItem>
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
                <TableCell>编码</TableCell>
                <TableCell>名称</TableCell>
                <TableCell>类别</TableCell>
                <TableCell>方向</TableCell>
                <TableCell>层级</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
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
                    <Typography color="text.secondary">暂无科目数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((account) => (
                  <TableRow key={account.id} hover>
                    <TableCell>{account.code}</TableCell>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>{categoryLabel[account.category]}</TableCell>
                    <TableCell>{directionLabel[account.balance_direction]}</TableCell>
                    <TableCell>{account.level}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={account.status === 'active' ? '启用' : '禁用'}
                        color={account.status === 'active' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => { setEditing(account); setEditOpen(true); }}>
                        <EditIcon size={16} />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(account.id)}>
                        <DeleteIcon size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {total > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_e, p) => load(p)}
              size="small"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing?.id ? '编辑科目' : '新增科目'}</DialogTitle>
        {editing && (
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="科目编码"
                required
                value={editing.code ?? ''}
                onChange={(e) => setEditing({ ...editing, code: e.target.value })}
              />
              <TextField
                label="科目名称"
                required
                value={editing.name ?? ''}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
              <FormControl>
                <InputLabel>类别</InputLabel>
                <Select
                  value={editing.category ?? 'asset'}
                  label="类别"
                  onChange={(e) =>
                    setEditing({ ...editing, category: e.target.value as AccountCategory })
                  }
                >
                  <MenuItem value="asset">资产类</MenuItem>
                  <MenuItem value="liability">负债类</MenuItem>
                  <MenuItem value="equity">权益类</MenuItem>
                  <MenuItem value="cost">成本类</MenuItem>
                  <MenuItem value="expense">费用类</MenuItem>
                  <MenuItem value="income">收入类</MenuItem>
                </Select>
              </FormControl>
              <FormControl>
                <InputLabel>余额方向</InputLabel>
                <Select
                  value={editing.balance_direction ?? 'debit'}
                  label="余额方向"
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      balance_direction: e.target.value as 'debit' | 'credit',
                    })
                  }
                >
                  <MenuItem value="debit">借</MenuItem>
                  <MenuItem value="credit">贷</MenuItem>
                </Select>
              </FormControl>
              <FormControl>
                <InputLabel>状态</InputLabel>
                <Select
                  value={editing.status ?? 'active'}
                  label="状态"
                  onChange={(e) =>
                    setEditing({ ...editing, status: e.target.value as 'active' | 'disabled' })
                  }
                >
                  <MenuItem value="active">启用</MenuItem>
                  <MenuItem value="disabled">禁用</MenuItem>
                </Select>
              </FormControl>
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

export default FinanceAccountPage;
