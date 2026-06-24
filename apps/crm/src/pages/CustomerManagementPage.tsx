import React, { useEffect, useState, useMemo } from 'react';
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
  CircularProgress,
  Alert,
  Pagination,
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
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useCrmStore } from '../store/crmStore';
import type { Customer, CreateCustomerRequest, UpdateCustomerRequest } from '../api/crm';

const getStatusColor = (status: string): 'success' | 'default' | 'error' | 'warning' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'default';
    case 'churned':
      return 'error';
    case 'potential':
      return 'warning';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return '活跃';
    case 'inactive':
      return '非活跃';
    case 'churned':
      return '已流失';
    case 'potential':
      return '潜在';
    default:
      return status;
  }
};

export const CustomerManagementPage: React.FC = () => {
  const {
    customers,
    customersTotal,
    customersPage,
    customersPageSize,
    loading,
    error,
    loadCustomers,
    addCustomer,
    updateCustomer,
    removeCustomer,
  } = useCrmStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState<CreateCustomerRequest>({
    name: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCustomers({ page: 1, pageSize: 10 });
  }, [loadCustomers]);

  const handleSearch = () => {
    loadCustomers({
      page: 1,
      pageSize: customersPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadCustomers({
      page,
      pageSize: customersPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handleCreate = async () => {
    if (!newCustomer.name) return;
    setSubmitting(true);
    try {
      await addCustomer(newCustomer);
      setCreateDialogOpen(false);
      setNewCustomer({ name: '' });
    } catch (err) {
      console.error('创建客户失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedCustomer) return;
    setSubmitting(true);
    try {
      const updateData: UpdateCustomerRequest = {
        name: selectedCustomer.name,
        status: selectedCustomer.status,
        customer_type: selectedCustomer.customer_type,
        rating: selectedCustomer.rating,
        notes: selectedCustomer.notes,
      };
      await updateCustomer(selectedCustomer.id, updateData);
      setEditDialogOpen(false);
      setSelectedCustomer(null);
    } catch (err) {
      console.error('更新客户失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该客户吗？')) return;
    try {
      await removeCustomer(id);
    } catch (err) {
      console.error('删除客户失败:', err);
    }
  };

  const totalPages = useMemo(
    () => Math.ceil(customersTotal / customersPageSize),
    [customersTotal, customersPageSize]
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            客户管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理客户档案、基本信息和分类标签
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() =>
              loadCustomers({
                page: customersPage,
                pageSize: customersPageSize,
                search: searchKeyword || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
              })
            }
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新建客户
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索客户名称、编码..."
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
              <MenuItem value="active">活跃</MenuItem>
              <MenuItem value="inactive">非活跃</MenuItem>
              <MenuItem value="potential">潜在</MenuItem>
              <MenuItem value="churned">已流失</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={handleSearch}>
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
                <TableCell>客户名称</TableCell>
                <TableCell>客户编码</TableCell>
                <TableCell>行业</TableCell>
                <TableCell>客户类型</TableCell>
                <TableCell>评级</TableCell>
                <TableCell>联系电话</TableCell>
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
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无客户数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {customer.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={customer.code || '-'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{customer.industry || '-'}</TableCell>
                    <TableCell>{customer.customer_type || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={customer.rating || '未评级'}
                        size="small"
                        color={customer.rating === 'A' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(customer.status)}
                        size="small"
                        color={getStatusColor(customer.status)}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="查看详情">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setEditDialogOpen(true);
                        }}
                        title="编辑"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(customer.id)}
                        title="删除"
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
        {customersTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination
              count={totalPages}
              page={customersPage}
              onChange={handlePageChange}
              size="small"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建客户</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="客户名称"
              required
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="客户编码"
              value={newCustomer.code || ''}
              onChange={(e) => setNewCustomer({ ...newCustomer, code: e.target.value })}
              fullWidth
            />
            <TextField
              label="所属行业"
              value={newCustomer.industry || ''}
              onChange={(e) => setNewCustomer({ ...newCustomer, industry: e.target.value })}
              fullWidth
            />
            <TextField
              label="联系电话"
              value={newCustomer.phone || ''}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="备注"
              multiline
              rows={3}
              value={newCustomer.notes || ''}
              onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !newCustomer.name}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑客户</DialogTitle>
        {selectedCustomer && (
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="客户名称"
                required
                value={selectedCustomer.name}
                onChange={(e) => setSelectedCustomer({ ...selectedCustomer, name: e.target.value })}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={selectedCustomer.status}
                  label="状态"
                  onChange={(e) =>
                    setSelectedCustomer({ ...selectedCustomer, status: e.target.value })
                  }
                >
                  <MenuItem value="active">活跃</MenuItem>
                  <MenuItem value="inactive">非活跃</MenuItem>
                  <MenuItem value="potential">潜在</MenuItem>
                  <MenuItem value="churned">已流失</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="评级"
                value={selectedCustomer.rating || ''}
                onChange={(e) => setSelectedCustomer({ ...selectedCustomer, rating: e.target.value })}
                fullWidth
              />
              <TextField
                label="备注"
                multiline
                rows={3}
                value={selectedCustomer.notes || ''}
                onChange={(e) => setSelectedCustomer({ ...selectedCustomer, notes: e.target.value })}
                fullWidth
              />
            </Box>
          </DialogContent>
        )}
        <DialogActions>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setSelectedCustomer(null);
            }}
          >
            取消
          </Button>
          <Button variant="contained" onClick={handleEdit} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerManagementPage;
