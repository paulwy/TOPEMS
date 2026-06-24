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
  Card,
  CardContent,
  Grid,
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
  Store as StoreIcon,
} from '@mui/icons-material';
import {
  warehouseApi,
  type Warehouse,
  type PaginatedResult,
  type ListParams,
} from '../api/wms';

const getStatusColor = (
  status: string
): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'default';
    case 'maintenance':
      return 'warning';
    case 'closed':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return '运营中';
    case 'inactive':
      return '停用';
    case 'maintenance':
      return '维护中';
    case 'closed':
      return '已关闭';
    default:
      return status;
  }
};

export const WarehousePage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [newWarehouse, setNewWarehouse] = useState<Partial<Warehouse>>({
    name: '',
    code: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadWarehouses = async (p: number, ps: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: ListParams = {
        page: p,
        page_size: ps,
        search: searchKeyword || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      const data: PaginatedResult<Warehouse> = await warehouseApi.list(params);
      setWarehouses(data.items);
      setTotal(data.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载仓库列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    loadWarehouses(1, pageSize);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, p: number) => {
    loadWarehouses(p, pageSize);
  };

  const handleCreate = async () => {
    if (!newWarehouse.name || !newWarehouse.code) return;
    setSubmitting(true);
    try {
      await warehouseApi.create(newWarehouse as any);
      setCreateDialogOpen(false);
      setNewWarehouse({ name: '', code: '', status: 'active' });
      await loadWarehouses(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建仓库失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedWarehouse) return;
    setSubmitting(true);
    try {
      await warehouseApi.update(selectedWarehouse.id, selectedWarehouse);
      setEditDialogOpen(false);
      setSelectedWarehouse(null);
      await loadWarehouses(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新仓库失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该仓库吗？')) return;
    try {
      await warehouseApi.delete(id);
      await loadWarehouses(page, pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除仓库失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            仓库管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            仓库档案、地址与负责人信息维护
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadWarehouses(page, pageSize)}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新增仓库
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <StoreIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    仓库总数
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {total}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <StoreIcon color="success" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    运营中
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {warehouses.filter((w) => w.status === 'active').length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <StoreIcon color="warning" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    维护中
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {warehouses.filter((w) => w.status === 'maintenance').length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <StoreIcon color="error" fontSize="large" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    已停用/关闭
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {warehouses.filter((w) => w.status === 'closed' || w.status === 'inactive').length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="搜索仓库名称/编码..."
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
              <MenuItem value="active">运营中</MenuItem>
              <MenuItem value="inactive">停用</MenuItem>
              <MenuItem value="maintenance">维护中</MenuItem>
              <MenuItem value="closed">已关闭</MenuItem>
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
                <TableCell>仓库编码</TableCell>
                <TableCell>仓库名称</TableCell>
                <TableCell>地址</TableCell>
                <TableCell>联系人</TableCell>
                <TableCell>联系电话</TableCell>
                <TableCell>负责人</TableCell>
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
              ) : warehouses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无仓库数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                warehouses.map((warehouse) => (
                  <TableRow key={warehouse.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {warehouse.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{warehouse.name}</TableCell>
                    <TableCell>{warehouse.address || '-'}</TableCell>
                    <TableCell>{warehouse.contact || '-'}</TableCell>
                    <TableCell>{warehouse.phone || '-'}</TableCell>
                    <TableCell>{warehouse.manager || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(warehouse.status)}
                        size="small"
                        color={getStatusColor(warehouse.status)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedWarehouse(warehouse);
                          setEditDialogOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(warehouse.id)}
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
        <DialogTitle>新增仓库</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="仓库编码"
              required
              value={newWarehouse.code || ''}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, code: e.target.value })}
              fullWidth
            />
            <TextField
              label="仓库名称"
              required
              value={newWarehouse.name || ''}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="地址"
              value={newWarehouse.address || ''}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, address: e.target.value })}
              fullWidth
            />
            <TextField
              label="联系人"
              value={newWarehouse.contact || ''}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, contact: e.target.value })}
              fullWidth
            />
            <TextField
              label="联系电话"
              value={newWarehouse.phone || ''}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="负责人"
              value={newWarehouse.manager || ''}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, manager: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !newWarehouse.name || !newWarehouse.code}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑仓库</DialogTitle>
        {selectedWarehouse && (
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="仓库编码"
                value={selectedWarehouse.code}
                onChange={(e) =>
                  setSelectedWarehouse({ ...selectedWarehouse, code: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="仓库名称"
                value={selectedWarehouse.name}
                onChange={(e) =>
                  setSelectedWarehouse({ ...selectedWarehouse, name: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="地址"
                value={selectedWarehouse.address || ''}
                onChange={(e) =>
                  setSelectedWarehouse({ ...selectedWarehouse, address: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="联系人"
                value={selectedWarehouse.contact || ''}
                onChange={(e) =>
                  setSelectedWarehouse({ ...selectedWarehouse, contact: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="联系电话"
                value={selectedWarehouse.phone || ''}
                onChange={(e) =>
                  setSelectedWarehouse({ ...selectedWarehouse, phone: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="负责人"
                value={selectedWarehouse.manager || ''}
                onChange={(e) =>
                  setSelectedWarehouse({ ...selectedWarehouse, manager: e.target.value })
                }
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={selectedWarehouse.status}
                  label="状态"
                  onChange={(e) =>
                    setSelectedWarehouse({ ...selectedWarehouse, status: e.target.value })
                  }
                >
                  <MenuItem value="active">运营中</MenuItem>
                  <MenuItem value="inactive">停用</MenuItem>
                  <MenuItem value="maintenance">维护中</MenuItem>
                  <MenuItem value="closed">已关闭</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setSelectedWarehouse(null);
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

export default WarehousePage;
