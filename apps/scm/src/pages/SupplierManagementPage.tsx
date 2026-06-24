import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  Button,
  Stack,
  Pagination,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { supplierApi, type Supplier, type PaginatedResult, type ListParams } from '../api/scm';

const getStatusColor = (
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'default';
    case 'pending':
      return 'warning';
    case 'suspended':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return '合作中';
    case 'inactive':
      return '停用';
    case 'pending':
      return '待审核';
    case 'suspended':
      return '已暂停';
    default:
      return status;
  }
};

export const SupplierManagementPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
    name: '',
    contact_name: '',
    contact_phone: '',
    email: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadSuppliers = async (p: number, ps: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: ListParams = {
        page: p,
        page_size: ps,
        search: searchKeyword || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      const data: PaginatedResult<Supplier> = await supplierApi.list(params);
      setSuppliers(data.items);
      setTotal(data.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载供应商列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    loadSuppliers(1, pageSize);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, p: number) => {
    loadSuppliers(p, pageSize);
  };

  const handleCreate = async () => {
    if (!newSupplier.name) return;
    setSubmitting(true);
    try {
      await supplierApi.create(newSupplier as any);
      setCreateDialogOpen(false);
      setNewSupplier({ name: '', contact_name: '', contact_phone: '', email: '', status: 'active' });
      await loadSuppliers(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建供应商失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedSupplier) return;
    setSubmitting(true);
    try {
      await supplierApi.update(selectedSupplier.id, selectedSupplier);
      setEditDialogOpen(false);
      setSelectedSupplier(null);
      await loadSuppliers(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新供应商失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该供应商吗？')) return;
    try {
      await supplierApi.delete(id);
      await loadSuppliers(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除供应商失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            供应商管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理供应链中的供应商档案、联系信息与状态
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadSuppliers(page, pageSize)}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新增供应商
          </Button>
        </Stack>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="搜索供应商名称/简称..."
            size="small"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
            }}
            sx={{ minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>状态</InputLabel>
            <Select
              value={statusFilter}
              label="状态"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="active">合作中</MenuItem>
              <MenuItem value="inactive">停用</MenuItem>
              <MenuItem value="pending">待审核</MenuItem>
              <MenuItem value="suspended">已暂停</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={handleSearch}>
            搜索
          </Button>
        </Stack>
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
                <TableCell>供应商名称</TableCell>
                <TableCell>简称</TableCell>
                <TableCell>联系人</TableCell>
                <TableCell>联系电话</TableCell>
                <TableCell>邮箱</TableCell>
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
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无供应商数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {supplier.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{supplier.short_name || '-'}</TableCell>
                    <TableCell>{supplier.contact_name || '-'}</TableCell>
                    <TableCell>{supplier.contact_phone || '-'}</TableCell>
                    <TableCell>{supplier.email || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(supplier.status)}
                        size="small"
                        color={getStatusColor(supplier.status)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedSupplier(supplier);
                          setEditDialogOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(supplier.id)}
                      >
                        <DeleteIcon fontSize="small" />
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
              onChange={handlePageChange}
              size="small"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增供应商</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="供应商名称"
              required
              value={newSupplier.name || ''}
              onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="简称"
              value={newSupplier.short_name || ''}
              onChange={(e) => setNewSupplier({ ...newSupplier, short_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="联系人"
              value={newSupplier.contact_name || ''}
              onChange={(e) => setNewSupplier({ ...newSupplier, contact_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="联系电话"
              value={newSupplier.contact_phone || ''}
              onChange={(e) => setNewSupplier({ ...newSupplier, contact_phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="邮箱"
              type="email"
              value={newSupplier.email || ''}
              onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="地址"
              value={newSupplier.address || ''}
              onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !newSupplier.name}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑供应商</DialogTitle>
        {selectedSupplier && (
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="供应商名称"
                value={selectedSupplier.name}
                onChange={(e) =>
                  setSelectedSupplier({ ...selectedSupplier, name: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="简称"
                value={selectedSupplier.short_name || ''}
                onChange={(e) =>
                  setSelectedSupplier({ ...selectedSupplier, short_name: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="联系人"
                value={selectedSupplier.contact_name || ''}
                onChange={(e) =>
                  setSelectedSupplier({ ...selectedSupplier, contact_name: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="联系电话"
                value={selectedSupplier.contact_phone || ''}
                onChange={(e) =>
                  setSelectedSupplier({ ...selectedSupplier, contact_phone: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="邮箱"
                value={selectedSupplier.email || ''}
                onChange={(e) =>
                  setSelectedSupplier({ ...selectedSupplier, email: e.target.value })
                }
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={selectedSupplier.status}
                  label="状态"
                  onChange={(e) =>
                    setSelectedSupplier({ ...selectedSupplier, status: e.target.value })
                  }
                >
                  <MenuItem value="active">合作中</MenuItem>
                  <MenuItem value="inactive">停用</MenuItem>
                  <MenuItem value="pending">待审核</MenuItem>
                  <MenuItem value="suspended">已暂停</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setSelectedSupplier(null);
            }}
          >
            取消
          </Button>
          <Button variant="contained" onClick={handleEdit} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SupplierManagementPage;
