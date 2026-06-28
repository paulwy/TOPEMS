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

import { useCrmStore } from '../store/crmStore';
import type {  BillingItem, CreateBillingRequest } from '../api/crm';
import { CircleCheck, RefreshCw, Search, Send } from 'lucide-react';
const CheckCircleIcon = CircleCheck;
const RefreshIcon = RefreshCw;
const SearchIcon = Search;
const SendIcon = Send;

const STATUS_LABELS: Record<string, string> = {
  pending: '待回款',
  paid: '已支付',
  overdue: '已逾期',
  cancelled: '已取消',
};

const getStatusColor = (status: string): 'default' | 'success' | 'error' | 'warning' => {
  switch (status) {
    case 'paid':
      return 'success';
    case 'overdue':
      return 'error';
    case 'pending':
      return 'warning';
    case 'cancelled':
      return 'default';
    default:
      return 'default';
  }
};

const buildEmptyItem = (): BillingItem => ({
  name: '',
  quantity: 1,
  unit_price: 0,
  amount: 0,
});

export const BillingPage: React.FC = () => {
  const {
    billings,
    billingsTotal,
    billingsPage,
    billingsPageSize,
    loading,
    error,
    loadBillings,
    addBilling,
    markBillingPaid,
    removeBilling,
  } = useCrmStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBilling, setNewBilling] = useState<CreateBillingRequest>({
    customer_id: '',
    amount: 0,
    currency: 'CNY',
    due_date: '',
    items: [buildEmptyItem()],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBillings({ page: 1, pageSize: 10 });
  }, [loadBillings]);

  const handleSearch = () => {
    loadBillings({
      page: 1,
      pageSize: billingsPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadBillings({
      page,
      pageSize: billingsPageSize,
      search: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handleCreate = async () => {
    if (!newBilling.customer_id || !newBilling.due_date) return;
    setSubmitting(true);
    try {
      await addBilling(newBilling);
      setCreateDialogOpen(false);
      setNewBilling({
        customer_id: '',
        amount: 0,
        currency: 'CNY',
        due_date: '',
        items: [buildEmptyItem()],
      });
    } catch (err) {
      console.error('创建账单失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await markBillingPaid(id);
    } catch (err) {
      console.error('标记账单已支付失败:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该账单吗？')) return;
    try {
      await removeBilling(id);
    } catch (err) {
      console.error('删除账单失败:', err);
    }
  };

  const updateItem = (index: number, patch: Partial<BillingItem>) => {
    setNewBilling((prev) => {
      const items = prev.items.map((item, i) => {
        if (i !== index) return item;
        const merged = { ...item, ...patch };
        merged.amount = (merged.quantity || 0) * (merged.unit_price || 0);
        return merged;
      });
      const amount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
      return { ...prev, items, amount };
    });
  };

  const addItem = () => {
    setNewBilling((prev) => ({
      ...prev,
      items: [...prev.items, buildEmptyItem()],
    }));
  };

  const removeItem = (index: number) => {
    setNewBilling((prev) => {
      const items = prev.items.filter((_, i) => i !== index);
      const amount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
      return { ...prev, items, amount };
    });
  };

  const totalPages = useMemo(
    () => Math.ceil(billingsTotal / billingsPageSize),
    [billingsTotal, billingsPageSize]
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            计费管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            客户账单、付款追踪与提醒
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() =>
              loadBillings({
                page: billingsPage,
                pageSize: billingsPageSize,
                search: searchKeyword || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
              })
            }
          >
            刷新
          </Button>
          <Button variant="contained" onClick={() => setCreateDialogOpen(true)}>
            新建账单
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索发票号、客户..."
            
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
             
            slotProps={{ input: { size: 'small', startAdornment: <SearchIcon style={{ color: '#9e9e9e', marginRight: 4, fontSize: 20 }}  />  }}}
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
              <MenuItem value="pending">待回款</MenuItem>
              <MenuItem value="paid">已支付</MenuItem>
              <MenuItem value="overdue">已逾期</MenuItem>
              <MenuItem value="cancelled">已取消</MenuItem>
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
                <TableCell>发票号</TableCell>
                <TableCell>客户</TableCell>
                <TableCell>金额</TableCell>
                <TableCell>到期日</TableCell>
                <TableCell>支付日</TableCell>
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
              ) : billings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无账单数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                billings.map((billing) => (
                  <TableRow key={billing.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {billing.invoice_no}
                      </Typography>
                    </TableCell>
                    <TableCell>{billing.customer_name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {billing.currency} {billing.amount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(billing.due_date).toLocaleDateString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      {billing.paid_at
                        ? new Date(billing.paid_at).toLocaleDateString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABELS[billing.status] || billing.status}
                        size="small"
                        color={getStatusColor(billing.status)}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {billing.status !== 'paid' && billing.status !== 'cancelled' && (
                        <IconButton
                          size="small"
                          onClick={() => handleMarkPaid(billing.id)}
                          title="标记已支付"
                          color="success"
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        title="发送通知"
                        color="primary"
                      >
                        <SendIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(billing.id)}
                        title="删除"
                      >
                        删除
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {billingsTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination
              count={totalPages}
              page={billingsPage}
              onChange={handlePageChange}
              size="small"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>新建账单</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="客户 ID"
              required
              value={newBilling.customer_id}
              onChange={(e) => setNewBilling({ ...newBilling, customer_id: e.target.value })}
              fullWidth
            />
            <TextField
              label="发票号"
              value={newBilling.invoice_no || ''}
              onChange={(e) => setNewBilling({ ...newBilling, invoice_no: e.target.value })}
              fullWidth
            />
            <TextField
              label="到期日"
              type="date"
              required
              value={newBilling.due_date}
              onChange={(e) => setNewBilling({ ...newBilling, due_date: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="币种"
              value={newBilling.currency || 'CNY'}
              onChange={(e) => setNewBilling({ ...newBilling, currency: e.target.value })}
              fullWidth
            />

            <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 600 }}>
              账单明细
            </Typography>
            {newBilling.items.map((item, index) => (
              <Box
                key={index}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                  gap: 1,
                  alignItems: 'center',
                }}
              >
                <TextField
                  label="项目名称"
                  value={item.name}
                  onChange={(e) => updateItem(index, { name: e.target.value })}
                  
                
            slotProps={{ input: { size: 'small' } }}
          />
                <TextField
                  label="数量"
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                  
                
            slotProps={{ input: { size: 'small' } }}
          />
                <TextField
                  label="单价"
                  type="number"
                  value={item.unit_price}
                  onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) })}
                  
                
            slotProps={{ input: { size: 'small' } }}
          />
                <TextField
                  label="金额"
                  value={item.amount}
                  disabled
                  
                
            slotProps={{ input: { size: 'small' } }}
          />
                <Button
                  color="error"
                  onClick={() => removeItem(index)}
                  disabled={newBilling.items.length === 1}
                >
                  删除
                </Button>
              </Box>
            ))}
            <Button onClick={addItem} sx={{ alignSelf: 'flex-start' }}>
              + 添加项目
            </Button>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                总计：{newBilling.currency} {newBilling.amount.toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting || !newBilling.customer_id || !newBilling.due_date}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BillingPage;
