import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  Paper,
  Divider,
  InputAdornment,
} from '@mui/material';
import { Grid, PageContainer } from '@/components/common';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  ArrowUpCircle,
  RefreshCw,
  Filter,
  ChevronRight,
  Download,
  Link2,
  Printer,
} from 'lucide-react';
import { createLogger } from '@/utils/logger';
import { useNotificationStore } from '@/store';
import { financeApi } from '@/api/finance';
import type {
  Payment,
  PaymentItem,
  CreatePaymentRequest,
  ExecutePaymentRequest,
  WriteOffRequest,
} from '@/api/finance/payment';
import { PaymentPrintTemplate } from './PaymentPrintTemplate';

const logger = createLogger('FinancePaymentPage');

const paymentMethodOptions = [
  { value: 'bank_transfer', label: '银行转账' },
  { value: 'cash', label: '现金' },
  { value: 'check', label: '支票' },
  { value: 'acceptance_bill', label: '承兑汇票' },
  { value: 'other', label: '其他' },
];

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'submitted', label: '待审批' },
  { value: 'approved', label: '已审批' },
  { value: 'posted', label: '已过账' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'cancelled', label: '已取消' },
];

const getStatusConfig = (status: string) => {
  const configs: Record<
    string,
    { color: 'success' | 'warning' | 'error' | 'default' | 'info'; label: string }
  > = {
    draft: { color: 'default', label: '草稿' },
    submitted: { color: 'warning', label: '待审批' },
    approved: { color: 'info', label: '已审批' },
    posted: { color: 'success', label: '已过账' },
    rejected: { color: 'error', label: '已拒绝' },
    cancelled: { color: 'default', label: '已取消' },
  };
  return configs[status] || { color: 'default', label: status };
};

const FinancePaymentPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const [showWriteOffDialog, setShowWriteOffDialog] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedItem, setSelectedItem] = useState<PaymentItem | null>(null);
  const [editMode, setEditMode] = useState(false);

  const [executeFormData, setExecuteFormData] = useState({
    bankTransactionNo: '',
    actualPaymentDate: '',
  });

  const [writeOffFormData, setWriteOffFormData] = useState({
    writeOffAmount: '',
  });

  const [formData, setFormData] = useState<CreatePaymentRequest>({
    supplierName: '',
    paymentMethod: 'bank_transfer',
    bankName: '',
    bankAccountNo: '',
    totalAmount: 0,
    remark: '',
    items: [{ payableAmount: 0, paymentAmount: 0, invoiceNo: '' }],
  });

  const paymentsQuery = useQuery<{ items: Payment[]; total: number }>({
    queryKey: ['finance-payments', page, pageSize, statusFilter],
    queryFn: async () => {
      const res = await financeApi.payment.list({
        page: page + 1,
        pageSize,
        status: statusFilter || undefined,
      });
      if (res.success && res.data) {
        return { items: res.data.items, total: res.data.total };
      }
      return { items: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const payments = paymentsQuery.data?.items ?? [];
  const total = paymentsQuery.data?.total ?? 0;
  const loading = paymentsQuery.isLoading;

  const paymentDetailQuery = useQuery<Payment | null>({
    queryKey: ['finance-payment-detail', selectedPayment?.id],
    queryFn: async () => {
      if (!selectedPayment?.id) return null;
      const res = await financeApi.payment.get(selectedPayment.id);
      return res.success && res.data ? res.data : null;
    },
    enabled: !!selectedPayment?.id && showDetailDialog,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (paymentDetailQuery.data) {
      setSelectedPayment(paymentDetailQuery.data);
    }
  }, [paymentDetailQuery.data]);

  useEffect(() => {
    if (paymentsQuery.isError) {
      logger.error('Failed to load payments:', paymentsQuery.error);
      addNotification({ title: '错误', message: '加载付款单列表失败', type: 'error' });
    }
  }, [paymentsQuery.isError, paymentsQuery.error, addNotification]);

  const invalidatePayments = () =>
    queryClient.invalidateQueries({ queryKey: ['finance-payments'] });

  const createMutation = useMutation({
    mutationFn: (data: CreatePaymentRequest) => financeApi.payment.create(data),
    onSuccess: () => {
      invalidatePayments();
      addNotification({ title: '成功', message: '付款单创建成功', type: 'success' });
      setShowCreateDialog(false);
    },
    onError: (err: unknown) => {
      logger.error('Failed to submit payment:', err);
      addNotification({ title: '错误', message: '创建付款单失败', type: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: CreatePaymentRequest }) =>
      financeApi.payment.update(params.id, params.data),
    onSuccess: () => {
      invalidatePayments();
      addNotification({ title: '成功', message: '付款单更新成功', type: 'success' });
      setShowCreateDialog(false);
    },
    onError: (err: unknown) => {
      logger.error('Failed to submit payment:', err);
      addNotification({ title: '错误', message: '更新付款单失败', type: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.payment.remove(id),
    onSuccess: () => {
      invalidatePayments();
      addNotification({ title: '成功', message: '付款单删除成功', type: 'success' });
    },
    onError: (err: unknown) => {
      logger.error('Failed to delete payment:', err);
      addNotification({ title: '错误', message: '删除付款单失败', type: 'error' });
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => financeApi.payment.submit(id),
    onSuccess: () => {
      invalidatePayments();
      addNotification({ title: '成功', message: '提交审批成功', type: 'success' });
    },
    onError: (err: unknown) => {
      logger.error('Failed to submit payment:', err);
      addNotification({ title: '错误', message: '提交审批失败', type: 'error' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => financeApi.payment.approve(id),
    onSuccess: () => {
      invalidatePayments();
      addNotification({ title: '成功', message: '审批通过', type: 'success' });
      setShowDetailDialog(false);
    },
    onError: (err: unknown) => {
      logger.error('Failed to approve payment:', err);
      addNotification({ title: '错误', message: '审批失败', type: 'error' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => financeApi.payment.reject(id),
    onSuccess: () => {
      invalidatePayments();
      addNotification({ title: '成功', message: '已拒绝', type: 'success' });
      setShowDetailDialog(false);
    },
    onError: (err: unknown) => {
      logger.error('Failed to reject payment:', err);
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    },
  });

  const executeMutation = useMutation({
    mutationFn: (params: { id: string; data: ExecutePaymentRequest }) =>
      financeApi.payment.execute(params.id, params.data),
    onSuccess: () => {
      invalidatePayments();
      addNotification({ title: '成功', message: '付款执行成功', type: 'success' });
      setShowExecuteDialog(false);
    },
    onError: (err: unknown) => {
      logger.error('Failed to execute payment:', err);
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    },
  });

  const writeOffMutation = useMutation({
    mutationFn: (data: WriteOffRequest) => financeApi.payment.writeOff(data),
    onSuccess: () => {
      invalidatePayments();
      addNotification({ title: '成功', message: '核销成功', type: 'success' });
      setShowWriteOffDialog(false);
    },
    onError: (err: unknown) => {
      logger.error('Failed to write off payment:', err);
      addNotification({ title: '错误', message: '核销失败', type: 'error' });
    },
  });

  const actionLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    executeMutation.isPending ||
    writeOffMutation.isPending;

  const handleExport = async () => {
    try {
      const res = await financeApi.payment.list({
        page: 1,
        pageSize: 9999,
        status: statusFilter || undefined,
      });
      if (res.success && res.data.items) {
        exportToCSV(res.data.items);
      }
    } catch (error) {
      logger.error('Failed to export payments:', error);
      addNotification({
        title: '错误',
        message: '导出失败',
        type: 'error',
      });
    }
  };

  const exportToCSV = (payments: Payment[]) => {
    const headers = [
      '付款单号',
      '供应商',
      '付款方式',
      '付款金额',
      '币种',
      '付款日期',
      '实际付款日期',
      '银行流水号',
      '状态',
      '创建时间',
    ];

    const rows = payments.map((p) => [
      p.paymentNo,
      p.supplierName || '',
      paymentMethodOptions.find((m) => m.value === p.paymentMethod)?.label || p.paymentMethod,
      p.totalAmount,
      p.currency,
      p.paymentDate || '',
      p.actualPaymentDate || '',
      p.bankTransactionNo || '',
      getStatusConfig(p.status).label,
      p.createdAt,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `付款单_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleCreate = () => {
    setFormData({
      supplierName: '',
      paymentMethod: 'bank_transfer',
      bankName: '',
      bankAccountNo: '',
      totalAmount: 0,
      remark: '',
      items: [{ payableAmount: 0, paymentAmount: 0, invoiceNo: '' }],
    });
    setEditMode(false);
    setShowCreateDialog(true);
  };

  const handleEdit = (payment: Payment) => {
    setSelectedPayment(payment);
    setFormData({
      supplierName: payment.supplierName || '',
      paymentMethod: payment.paymentMethod,
      bankName: payment.bankName || '',
      bankAccountNo: payment.bankAccountNo || '',
      totalAmount: payment.totalAmount,
      remark: payment.remark || '',
      items: payment.items?.length
        ? payment.items.map((item) => ({
            invoiceId: item.invoiceId,
            invoiceNo: item.invoiceNo || '',
            payableAmount: item.payableAmount,
            paymentAmount: item.paymentAmount,
            remark: item.remark,
          }))
        : [{ payableAmount: 0, paymentAmount: 0, invoiceNo: '' }],
    });
    setEditMode(true);
    setShowCreateDialog(true);
  };

  const handleView = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetailDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.supplierName || formData.totalAmount <= 0) {
      addNotification({ title: '提示', message: '请填写供应商名称和付款金额', type: 'warning' });
      return;
    }

    const totalItemAmount = formData.items.reduce((sum, item) => sum + item.paymentAmount, 0);
    if (Math.abs(totalItemAmount - formData.totalAmount) > 0.01) {
      addNotification({ title: '提示', message: '明细付款金额合计应等于总金额', type: 'warning' });
      return;
    }

    if (editMode && selectedPayment) {
      updateMutation.mutate({ id: selectedPayment.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (payment: Payment) => {
    if (!window.confirm('确定要删除该付款单吗？')) return;
    deleteMutation.mutate(payment.id);
  };

  const handleSubmitForApproval = (payment: Payment) => {
    if (!window.confirm('确定要提交审批吗？')) return;
    submitMutation.mutate(payment.id);
  };

  const handleApprove = (payment: Payment) => {
    if (!window.confirm('确定要审批通过吗？')) return;
    approveMutation.mutate(payment.id);
  };

  const handleReject = (payment: Payment) => {
    if (!window.confirm('确定要拒绝该付款单吗？')) return;
    rejectMutation.mutate(payment.id);
  };

  const handleExecute = (payment: Payment) => {
    setSelectedPayment(payment);
    setExecuteFormData({
      bankTransactionNo: '',
      actualPaymentDate: '',
    });
    setShowExecuteDialog(true);
  };

  const handleExecutePayment = () => {
    if (
      !selectedPayment ||
      !executeFormData.bankTransactionNo ||
      !executeFormData.actualPaymentDate
    ) {
      addNotification({
        title: '提示',
        message: '请填写完整的执行信息',
        type: 'error',
      });
      return;
    }

    executeMutation.mutate({
      id: selectedPayment.id,
      data: {
        bankTransactionNo: executeFormData.bankTransactionNo,
        actualPaymentDate: executeFormData.actualPaymentDate,
      },
    });
  };

  const handleWriteOff = (item: PaymentItem) => {
    setSelectedItem(item);
    setWriteOffFormData({
      writeOffAmount: String(item.paymentAmount || 0),
    });
    setShowWriteOffDialog(true);
  };

  const handleWriteOffPayment = () => {
    if (!selectedItem || !writeOffFormData.writeOffAmount) {
      addNotification({
        title: '提示',
        message: '请填写核销金额',
        type: 'error',
      });
      return;
    }

    const amount = parseFloat(writeOffFormData.writeOffAmount);
    if (isNaN(amount) || amount <= 0) {
      addNotification({
        title: '提示',
        message: '请输入有效的核销金额',
        type: 'error',
      });
      return;
    }

    writeOffMutation.mutate({
      itemId: selectedItem.id!,
      writeOffAmount: amount,
    });
  };

  const handlePrint = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowPrintPreview(true);
  };

  const handlePrintExecute = () => {
    window.print();
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { payableAmount: 0, paymentAmount: 0, invoiceNo: '' }],
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: keyof PaymentItem, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value } as PaymentItem;
    setFormData({ ...formData, items: newItems });
  };

  const canEdit = (status: string) => status === 'draft';
  const canDelete = (status: string) => status === 'draft';
  const canSubmit = (status: string) => status === 'draft';
  const canApprove = (status: string) => status === 'submitted';
  const canExecute = (status: string) => status === 'approved';

  return (
    <PageContainer
      title='付款单管理'
      headerActions={
        <Button
          variant='contained'
          startIcon={<Plus size={18} />}
          onClick={handleCreate}
        >
          新建付款单
        </Button>
      }
    >
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction='row'
            spacing={2}
            sx={{ flexWrap: 'wrap', gap: 2 }}
          >
            <TextField
              size='small'
              placeholder='搜索供应商名称...'
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              sx={{ width: 280 }}
            />
            <FormControl
              size='small'
              sx={{ minWidth: 150 }}
            >
              <InputLabel>状态</InputLabel>
              <Select
                value={statusFilter}
                label='状态'
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {statusOptions.map((opt) => (
                  <MenuItem
                    key={opt.value}
                    value={opt.value}
                  >
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant='outlined'
              size='small'
              startIcon={<RefreshCw size={16} />}
              onClick={() => paymentsQuery.refetch()}
            >
              刷新
            </Button>
            <Button
              variant='outlined'
              size='small'
              startIcon={<Download size={16} />}
              onClick={handleExport}
              disabled={loading}
            >
              导出
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>付款单号</TableCell>
                <TableCell>供应商</TableCell>
                <TableCell>付款方式</TableCell>
                <TableCell align='right'>付款金额</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>付款日期</TableCell>
                <TableCell align='center'>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align='center'
                    sx={{ py: 4 }}
                  >
                    <Typography color='text.secondary'>加载中...</Typography>
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align='center'
                    sx={{ py: 4 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <FileText
                        size={40}
                        style={{ opacity: 0.3 }}
                      />
                      <Typography color='text.secondary'>暂无付款单数据</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => {
                  const statusConfig = getStatusConfig(payment.status);
                  return (
                    <TableRow
                      key={payment.id}
                      hover
                    >
                      <TableCell sx={{ fontFamily: 'monospace' }}>{payment.paymentNo}</TableCell>
                      <TableCell>{payment.supplierName || '-'}</TableCell>
                      <TableCell>
                        {paymentMethodOptions.find((m) => m.value === payment.paymentMethod)
                          ?.label || payment.paymentMethod}
                      </TableCell>
                      <TableCell
                        align='right'
                        sx={{ fontWeight: 600 }}
                      >
                        ¥{payment.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusConfig.label}
                          size='small'
                          color={statusConfig.color}
                          variant='outlined'
                        />
                      </TableCell>
                      <TableCell>{payment.paymentDate || '-'}</TableCell>
                      <TableCell align='center'>
                        <Stack
                          direction='row'
                          spacing={0.5}
                          sx={{ justifyContent: 'center' }}
                        >
                          <Tooltip title='查看详情'>
                            <IconButton
                              size='small'
                              onClick={() => handleView(payment)}
                            >
                              <Eye size={16} />
                            </IconButton>
                          </Tooltip>
                          {canEdit(payment.status) && (
                            <Tooltip title='编辑'>
                              <IconButton
                                size='small'
                                onClick={() => handleEdit(payment)}
                              >
                                <Edit size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canSubmit(payment.status) && (
                            <Tooltip title='提交审批'>
                              <IconButton
                                size='small'
                                color='primary'
                                onClick={() => handleSubmitForApproval(payment)}
                              >
                                <ArrowUpCircle size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canDelete(payment.status) && (
                            <Tooltip title='删除'>
                              <IconButton
                                size='small'
                                color='error'
                                onClick={() => handleDelete(payment)}
                              >
                                <Trash2 size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component='div'
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage='每页行数'
          labelDisplayedRows={({ from, to, count }) => `第 ${from}-${to} 条，共 ${count} 条`}
        />
      </Card>

      <Dialog
        open={showCreateDialog}
        onClose={() => !actionLoading && setShowCreateDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{editMode ? '编辑付款单' : '新建付款单'}</DialogTitle>
        <DialogContent dividers>
          <Grid
            container
            spacing={2.5}
            sx={{ mt: 0.5 }}
          >
            <Grid
              item
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label='供应商名称'
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                required
              />
            </Grid>
            <Grid
              item
              xs={12}
              sm={6}
            >
              <FormControl
                fullWidth
                required
              >
                <InputLabel>付款方式</InputLabel>
                <Select
                  value={formData.paymentMethod}
                  label='付款方式'
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                >
                  {paymentMethodOptions.map((opt) => (
                    <MenuItem
                      key={opt.value}
                      value={opt.value}
                    >
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid
              item
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label='开户银行'
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              />
            </Grid>
            <Grid
              item
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label='银行账号'
                value={formData.bankAccountNo}
                onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
              />
            </Grid>
            <Grid
              item
              xs={12}
              sm={6}
            >
              <TextField
                fullWidth
                label='付款总金额'
                type='number'
                value={formData.totalAmount || ''}
                onChange={(e) =>
                  setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })
                }
                required
              />
            </Grid>
            <Grid
              item
              xs={12}
            >
              <TextField
                fullWidth
                label='备注'
                multiline
                rows={2}
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          <Stack
            direction='row'
            sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              付款明细
            </Typography>
            <Button
              size='small'
              onClick={addItem}
              startIcon={<Plus size={14} />}
            >
              添加明细
            </Button>
          </Stack>

          <TableContainer
            component={Paper}
            variant='outlined'
            sx={{ mb: 1 }}
          >
            <Table size='small'>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ width: 40 }}>#</TableCell>
                  <TableCell>发票号</TableCell>
                  <TableCell align='right'>应付金额</TableCell>
                  <TableCell align='right'>本次付款</TableCell>
                  <TableCell>备注</TableCell>
                  <TableCell sx={{ width: 60 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formData.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <TextField
                        size='small'
                        fullWidth
                        value={item.invoiceNo || ''}
                        onChange={(e) => updateItem(index, 'invoiceNo', e.target.value)}
                        placeholder='输入发票号'
                      />
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ width: 150 }}
                    >
                      <TextField
                        size='small'
                        type='number'
                        value={item.payableAmount || ''}
                        onChange={(e) =>
                          updateItem(index, 'payableAmount', parseFloat(e.target.value) || 0)
                        }
                        sx={{ '& input': { textAlign: 'right' } }}
                      />
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ width: 150 }}
                    >
                      <TextField
                        size='small'
                        type='number'
                        value={item.paymentAmount || ''}
                        onChange={(e) =>
                          updateItem(index, 'paymentAmount', parseFloat(e.target.value) || 0)
                        }
                        sx={{ '& input': { textAlign: 'right' } }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size='small'
                        fullWidth
                        value={item.remark || ''}
                        onChange={(e) => updateItem(index, 'remark', e.target.value)}
                        placeholder='备注'
                      />
                    </TableCell>
                    <TableCell align='center'>
                      <IconButton
                        size='small'
                        color='error'
                        onClick={() => removeItem(index)}
                        disabled={formData.items.length <= 1}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack
            direction='row'
            sx={{ justifyContent: 'flex-end' }}
          >
            <Typography
              variant='body2'
              color='text.secondary'
            >
              明细合计：
              <Box
                component='span'
                sx={{ ml: 1, color: 'primary.main', fontWeight: 600 }}
              >
                ¥
                {formData.items
                  .reduce((sum, item) => sum + (item.paymentAmount || 0), 0)
                  .toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </Box>
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setShowCreateDialog(false)}
            disabled={actionLoading}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSubmit}
            disabled={actionLoading}
          >
            {editMode ? '保存修改' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          <Stack
            direction='row'
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>付款单详情</span>
            {selectedPayment && (
              <Chip
                label={getStatusConfig(selectedPayment.status).label}
                size='small'
                color={getStatusConfig(selectedPayment.status).color}
              />
            )}
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {selectedPayment && (
            <>
              <Grid
                container
                spacing={2.5}
                sx={{ mb: 2 }}
              >
                <Grid
                  item
                  xs={12}
                  sm={6}
                >
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    付款单号
                  </Typography>
                  <Typography sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {selectedPayment.paymentNo}
                  </Typography>
                </Grid>
                <Grid
                  item
                  xs={12}
                  sm={6}
                >
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    供应商
                  </Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    {selectedPayment.supplierName || '-'}
                  </Typography>
                </Grid>
                <Grid
                  item
                  xs={12}
                  sm={6}
                >
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    付款方式
                  </Typography>
                  <Typography>
                    {paymentMethodOptions.find((m) => m.value === selectedPayment.paymentMethod)
                      ?.label || selectedPayment.paymentMethod}
                  </Typography>
                </Grid>
                <Grid
                  item
                  xs={12}
                  sm={6}
                >
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    付款金额
                  </Typography>
                  <Typography sx={{ fontWeight: 600, color: 'primary.main' }}>
                    ¥
                    {selectedPayment.totalAmount.toLocaleString('zh-CN', {
                      minimumFractionDigits: 2,
                    })}
                  </Typography>
                </Grid>
                <Grid
                  item
                  xs={12}
                  sm={6}
                >
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    开户银行
                  </Typography>
                  <Typography>{selectedPayment.bankName || '-'}</Typography>
                </Grid>
                <Grid
                  item
                  xs={12}
                  sm={6}
                >
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    银行账号
                  </Typography>
                  <Typography>{selectedPayment.bankAccountNo || '-'}</Typography>
                </Grid>
                <Grid
                  item
                  xs={12}
                >
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    备注
                  </Typography>
                  <Typography>{selectedPayment.remark || '-'}</Typography>
                </Grid>
              </Grid>

              {selectedPayment.items && selectedPayment.items.length > 0 && (
                <>
                  <Divider sx={{ my: 2.5 }} />
                  <Typography
                    variant='subtitle2'
                    sx={{ mb: 2, fontWeight: 600 }}
                  >
                    付款明细
                  </Typography>
                  <TableContainer
                    component={Paper}
                    variant='outlined'
                  >
                    <Table size='small'>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell sx={{ width: 40 }}>#</TableCell>
                          <TableCell>发票号</TableCell>
                          <TableCell align='right'>应付金额</TableCell>
                          <TableCell align='right'>本次付款</TableCell>
                          <TableCell align='right'>已核销金额</TableCell>
                          <TableCell>核销状态</TableCell>
                          <TableCell sx={{ width: 80 }}>操作</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedPayment.items.map((item, index) => (
                          <TableRow key={item.id || index}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{item.invoiceNo || '-'}</TableCell>
                            <TableCell align='right'>
                              {(item.payableAmount || 0).toLocaleString('zh-CN', {
                                minimumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell align='right'>
                              {(item.paymentAmount || 0).toLocaleString('zh-CN', {
                                minimumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell align='right'>
                              {(item.writeOffAmount || 0).toLocaleString('zh-CN', {
                                minimumFractionDigits: 2,
                              })}
                            </TableCell>
                            <TableCell>
                              <Chip
                                size='small'
                                label={
                                  item.writeOffStatus === 'completed'
                                    ? '已核销'
                                    : item.writeOffStatus === 'partial'
                                      ? '部分核销'
                                      : '待核销'
                                }
                                color={
                                  item.writeOffStatus === 'completed'
                                    ? 'success'
                                    : item.writeOffStatus === 'partial'
                                      ? 'warning'
                                      : 'default'
                                }
                              />
                            </TableCell>
                            <TableCell>
                              {item.writeOffStatus !== 'completed' && (
                                <Button
                                  size='small'
                                  color='primary'
                                  startIcon={<Link2 size={12} />}
                                  onClick={() => handleWriteOff(item)}
                                >
                                  核销
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
          {selectedPayment && (
            <Button
              startIcon={<Printer size={16} />}
              onClick={() => handlePrint(selectedPayment)}
            >
              打印
            </Button>
          )}
          {selectedPayment && canApprove(selectedPayment.status) && (
            <>
              <Button
                color='error'
                onClick={() => handleReject(selectedPayment)}
                disabled={actionLoading}
                startIcon={<XCircle size={16} />}
              >
                拒绝
              </Button>
              <Button
                variant='contained'
                color='success'
                onClick={() => handleApprove(selectedPayment)}
                disabled={actionLoading}
                startIcon={<CheckCircle size={16} />}
              >
                审批通过
              </Button>
            </>
          )}
          {selectedPayment && canExecute(selectedPayment.status) && (
            <Button
              variant='contained'
              onClick={() => {
                setShowDetailDialog(false);
                handleExecute(selectedPayment);
              }}
              disabled={actionLoading}
              startIcon={<ArrowUpCircle size={16} />}
            >
              执行付款
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={showExecuteDialog}
        onClose={() => setShowExecuteDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>执行付款</DialogTitle>
        <DialogContent dividers>
          <Grid
            container
            spacing={2.5}
            sx={{ mt: 0.5 }}
          >
            <Grid
              item
              xs={12}
            >
              <TextField
                fullWidth
                label='银行流水号'
                value={executeFormData.bankTransactionNo}
                onChange={(e) =>
                  setExecuteFormData({ ...executeFormData, bankTransactionNo: e.target.value })
                }
                required
              />
            </Grid>
            <Grid
              item
              xs={12}
            >
              <TextField
                fullWidth
                label='实际付款日期'
                type='date'
                value={executeFormData.actualPaymentDate}
                onChange={(e) =>
                  setExecuteFormData({ ...executeFormData, actualPaymentDate: e.target.value })
                }
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowExecuteDialog(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleExecutePayment}
            disabled={actionLoading}
          >
            确认执行
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showWriteOffDialog}
        onClose={() => setShowWriteOffDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>核销付款</DialogTitle>
        <DialogContent dividers>
          <Grid
            container
            spacing={2.5}
            sx={{ mt: 0.5 }}
          >
            <Grid
              item
              xs={12}
            >
              <TextField
                fullWidth
                label='发票号'
                value={selectedItem?.invoiceNo || '-'}
                disabled
              />
            </Grid>
            <Grid
              item
              xs={12}
            >
              <TextField
                fullWidth
                label='应付金额'
                value={`¥${(selectedItem?.payableAmount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`}
                disabled
              />
            </Grid>
            <Grid
              item
              xs={12}
            >
              <TextField
                fullWidth
                label='本次付款'
                value={`¥${(selectedItem?.paymentAmount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`}
                disabled
              />
            </Grid>
            <Grid
              item
              xs={12}
            >
              <TextField
                fullWidth
                label='核销金额'
                type='number'
                value={writeOffFormData.writeOffAmount}
                onChange={(e) =>
                  setWriteOffFormData({ ...writeOffFormData, writeOffAmount: e.target.value })
                }
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowWriteOffDialog(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleWriteOffPayment}
            disabled={actionLoading}
            startIcon={<Link2 size={16} />}
          >
            确认核销
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        maxWidth='lg'
        fullWidth
        slotProps={{ paper: { sx: { maxHeight: '90vh', overflow: 'auto' } } }}
      >
        <DialogTitle>
          <Stack
            direction='row'
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>付款单打印预览</span>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {selectedPayment && <PaymentPrintTemplate payment={selectedPayment} />}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowPrintPreview(false)}>关闭</Button>
          <Button
            variant='contained'
            onClick={handlePrintExecute}
            startIcon={<Printer size={16} />}
          >
            打印
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FinancePaymentPage;
