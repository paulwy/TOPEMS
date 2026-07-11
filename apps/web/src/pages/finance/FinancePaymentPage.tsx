import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Download,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Eye,
  RefreshCw,
} from 'lucide-react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Box as MuiBox,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import type { ColumnDef } from '@/components';
import { ListPageTemplate, MuiStatCard as StatCard } from '@/components';
import { DataExport, PageContainer } from '@/components/common';
import { financeApi } from '@/api/finance';
import { apiLogger } from '@/utils/logger';
import type { PaymentRecord } from '@/types/finance';

import { ConfirmDialog } from '@topems/shared-components';

interface Payment {
  id: string;
  payment_number: string;
  payment_date: string;
  supplier: string;
  payment_method: string;
  amount: number;
  bank_account: string;
  status: string;
}

const FinancePaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [paymentData, setPaymentData] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [filterMethod, setFilterMethod] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rejectingPayment, setRejectingPayment] = useState<Payment | null>(null);

  const [newPayment, setNewPayment] = useState({
    supplier: '',
    payment_method: '银行转账',
    amount: 0,
    bank_account: '',
  });

  const mapPaymentRecordToPayment = (record: PaymentRecord): Payment => {
    const bankAccount = record.bank_name
      ? `${record.bank_name} ${record.bank_account_no || ''}`
      : record.bank_account_no || '';

    let statusText = '';
    switch (record.status) {
      case 'recorded':
        statusText = '待审批';
        break;
      case 'matched':
        statusText = '已付款';
        break;
      case 'cancelled':
        statusText = '已拒绝';
        break;
      default:
        statusText = record.status;
    }

    return {
      id: record.id,
      payment_number: record.payment_no,
      payment_date: record.payment_date,
      supplier: record.supplier_name || '',
      payment_method: '银行转账',
      amount: record.amount,
      bank_account: bankAccount,
      status: statusText,
    };
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await financeApi.receivablePayable.listPayments({
        page: 1,
        pagesize: 100,
      });
      if (response.success && response.data) {
        const payments = response.data.items.map(mapPaymentRecordToPayment);
        setPaymentData(payments);
      }
    } catch (err) {
      addNotification({
        title: '错误',
        message: '获取付款记录失败',
        type: 'error',
      });
      apiLogger.error('Failed to fetch payments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filteredData = useMemo(() => {
    return paymentData.filter((payment) => {
      if (filterMethod && payment.payment_method !== filterMethod) return false;
      if (filterStatus && payment.status !== filterStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !payment.payment_number.toLowerCase().includes(query) &&
          !payment.supplier.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [paymentData, filterMethod, filterStatus, searchQuery]);

  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      {
        color: 'success' | 'warning' | 'error' | 'default';
        icon: React.ReactNode;
      }
    > = {
      已付款: { color: 'success', icon: <CheckCircle size={12} /> },
      审批中: { color: 'warning', icon: <Clock size={12} /> },
      待审批: { color: 'default', icon: <Clock size={12} /> },
      已拒绝: { color: 'error', icon: <XCircle size={12} /> },
    };
    return configs[status] || { color: 'default', icon: null };
  };

  const handleCreate = async () => {
    if (!newPayment.supplier || !newPayment.amount) {
      addNotification({
        title: '错误',
        message: '请填写供应商和付款金额',
        type: 'error',
      });
      return;
    }

    setCreateLoading(true);
    try {
      const response = await financeApi.receivablePayable.createPayment({
        supplier_id: '',
        supplier_name: newPayment.supplier,
        amount: newPayment.amount,
        payment_date: new Date().toISOString().split('T')[0],
        bank_account_id: '',
        bank_account_no: newPayment.bank_account || '默认账户',
        bank_name: '',
        invoice_ids: [],
        status: 'recorded',
      });

      if (response.success && response.data) {
        const newEntry = mapPaymentRecordToPayment(response.data);
        setPaymentData([newEntry, ...paymentData]);
        addNotification({
          title: '成功',
          message: '付款申请已提交',
          type: 'success',
        });
        setShowCreateModal(false);
        setNewPayment({
          supplier: '',
          payment_method: '银行转账',
          amount: 0,
          bank_account: '',
        });
      } else {
        addNotification({
          title: '错误',
          message: response.message || '付款申请提交失败',
          type: 'error',
        });
      }
    } catch (err) {
      addNotification({
        title: '错误',
        message: '付款申请提交失败',
        type: 'error',
      });
      apiLogger.error('Failed to create payment', err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleApprove = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowApproveModal(true);
  };

  const confirmApprove = () => {
    if (!selectedPayment) return;
    setPaymentData(
      paymentData.map((p) => (p.id === selectedPayment.id ? { ...p, status: '已付款' } : p))
    );
    addNotification({ title: '成功', message: '付款已确认', type: 'success' });
    setShowApproveModal(false);
  };

  const handleRejectClick = (payment: Payment) => {
    setRejectingPayment(payment);
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (!rejectingPayment) return;
    setPaymentData(
      paymentData.map((p) => (p.id === rejectingPayment.id ? { ...p, status: '已拒绝' } : p))
    );
    addNotification({
      title: '已拒绝',
      message: '付款申请已拒绝',
      type: 'warning',
    });
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!deletingId) return;
    setPaymentData(paymentData.filter((p) => p.id !== deletingId));
    addNotification({
      title: '成功',
      message: '付款记录已删除',
      type: 'success',
    });
  };

  const handleExport = () => {
    addNotification({
      title: '导出成功',
      message: '付款数据已导出',
      type: 'success',
    });
  };

  const handleRefresh = () => {
    fetchPayments();
  };

  const statsData = useMemo(() => {
    const totalPayments = paymentData.length;
    const paidAmount = paymentData
      .filter((p) => p.status === '已付款')
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingApproval = paymentData.filter((p) => p.status === '待审批').length;
    const inApproval = paymentData.filter((p) => p.status === '审批中').length;

    return [
      {
        title: '总付款次数',
        value: totalPayments,
        icon: <CreditCard size={24} />,
        color: 'primary' as const,
      },
      {
        title: '已付款金额',
        value: `¥${paidAmount.toLocaleString()}`,
        icon: <CheckCircle size={24} />,
        color: 'success' as const,
      },
      {
        title: '待审批',
        value: pendingApproval,
        icon: <Clock size={24} />,
        color: 'warning' as const,
      },
      {
        title: '审批中',
        value: inApproval,
        icon: <Send size={24} />,
        color: 'info' as const,
      },
    ];
  }, [paymentData]);

  const columns = useMemo<ColumnDef<Payment>[]>(
    () => [
      {
        id: 'payment_number',
        label: '付款单号',
        render: (row) => (
          <MuiBox sx={{ fontWeight: 600, color: 'success.main' }}>{row.payment_number}</MuiBox>
        ),
      },
      {
        id: 'payment_date',
        label: '付款日期',
        render: (row) => (
          <MuiBox sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{row.payment_date}</MuiBox>
        ),
      },
      {
        id: 'supplier',
        label: '供应商',
        render: (row) => <MuiBox sx={{ fontWeight: 500 }}>{row.supplier}</MuiBox>,
      },
      {
        id: 'payment_method',
        label: '付款方式',
        render: (row) => (
          <Chip
            label={row.payment_method}
            size='small'
          />
        ),
      },
      {
        id: 'amount',
        label: '付款金额',
        align: 'right' as const,
        render: (row) => (
          <MuiBox
            sx={{
              fontWeight: 700,
              color: 'error.main',
              fontFamily: 'monospace',
            }}
          >
            ¥{row.amount.toLocaleString()}
          </MuiBox>
        ),
      },
      {
        id: 'bank_account',
        label: '银行账户',
        render: (row) => (
          <MuiBox sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{row.bank_account}</MuiBox>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => {
          const config = getStatusConfig(row.status);
          return (
            <Chip
              label={row.status}
              size='small'
              color={config.color}
              icon={config.icon as React.ReactElement}
            />
          );
        },
      },
    ],
    []
  );

  const renderRowActions = (row: Payment) => (
    <Stack
      direction='row'
      spacing={1}
    >
      {row.status === '待审批' && (
        <>
          <Tooltip title='审批'>
            <IconButton
              size='small'
              color='success'
              onClick={() => handleApprove(row)}
              aria-label='审批'
            >
              <CheckCircle sx={{ width: 16, height: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title='拒绝'>
            <IconButton
              size='small'
              color='error'
              onClick={() => handleRejectClick(row)}
              aria-label='拒绝'
            >
              <XCircle sx={{ width: 16, height: 16 }} />
            </IconButton>
          </Tooltip>
        </>
      )}
      {row.status === '已付款' && (
        <>
          <Tooltip title='查看'>
            <IconButton
              size='small'
              aria-label='查看'
            >
              <Eye sx={{ width: 16, height: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title='删除'>
            <IconButton
              size='small'
              color='error'
              onClick={() => handleDeleteClick(row.id)}
              aria-label='删除'
            >
              <Trash2 sx={{ width: 16, height: 16 }} />
            </IconButton>
          </Tooltip>
        </>
      )}
    </Stack>
  );

  const advancedFilters = useMemo(
    () => [
      {
        id: 'payment_method',
        label: '付款方式',
        type: 'select' as const,
        options: [
          { value: '银行转账', label: '银行转账' },
          { value: '银行承兑汇票', label: '银行承兑汇票' },
          { value: '商业承兑汇票', label: '商业承兑汇票' },
          { value: '现金', label: '现金' },
        ],
        value: filterMethod,
        onChange: (value: unknown) => setFilterMethod(value as string),
      },
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { value: '已付款', label: '已付款' },
          { value: '审批中', label: '审批中' },
          { value: '待审批', label: '待审批' },
          { value: '已拒绝', label: '已拒绝' },
        ],
        value: filterStatus,
        onChange: (value: unknown) => setFilterStatus(value as string),
      },
    ],
    [filterMethod, filterStatus]
  );

  const exportFields = useMemo(
    () => [
      { key: 'payment_number', title: '付款单号' },
      { key: 'payment_date', title: '付款日期' },
      { key: 'supplier', title: '供应商' },
      { key: 'payment_method', title: '付款方式' },
      { key: 'amount', title: '付款金额' },
      { key: 'bank_account', title: '银行账户' },
      { key: 'status', title: '状态' },
    ],
    []
  );

  return (
    <PageContainer
      title='付款管理'
      subtitle='管理供应商付款申请，审批和确认付款'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        backButton={{
          onClick: () => navigate('/finance/dashboard'),
        }}
        columns={columns}
        data={filteredData}
        searchable
        searchPlaceholder='搜索付款单号、供应商...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={advancedFilters}
        renderRowActions={renderRowActions}
        headerContent={
          <Grid
            container
            spacing={2}
            sx={{ mb: 3 }}
          >
            {statsData.map((stat, index) => (
              <Grid
                key={index}
                size={{ xs: 12, sm: 6, md: 3 }}
              >
                <StatCard {...stat} />
              </Grid>
            ))}
          </Grid>
        }
        actions={[
          {
            label: '刷新',
            variant: 'outlined',
            icon: <RefreshCw sx={{ width: 20, height: 20 }} />,
            onClick: handleRefresh,
          },
          {
            label: '导出',
            variant: 'outlined',
            icon: <Download sx={{ width: 20, height: 20 }} />,
            onClick: handleExport,
          },
          {
            label: '付款申请',
            variant: 'contained',
            icon: <Plus sx={{ width: 20, height: 20 }} />,
            onClick: () => setShowCreateModal(true),
          },
        ]}
        loading={loading}
      />

      <DataExport
        data={paymentData as unknown as Record<string, unknown>[]}
        fields={exportFields}
        defaultFileName='付款数据'
        buttonText='数据导出'
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>付款申请</DialogTitle>
        <DialogContent>
          <Stack
            spacing={3}
            sx={{ pt: 2 }}
          >
            <TextField
              label='供应商 *'
              fullWidth
              value={newPayment.supplier}
              onChange={(e) => setNewPayment({ ...newPayment, supplier: e.target.value })}
            />
            <Stack
              direction='row'
              spacing={2}
            >
              <FormControl fullWidth>
                <InputLabel>付款方式</InputLabel>
                <Select
                  value={newPayment.payment_method}
                  label='付款方式'
                  onChange={(e) =>
                    setNewPayment({
                      ...newPayment,
                      payment_method: e.target.value,
                    })
                  }
                >
                  <MenuItem value='银行转账'>银行转账</MenuItem>
                  <MenuItem value='银行承兑汇票'>银行承兑汇票</MenuItem>
                  <MenuItem value='商业承兑汇票'>商业承兑汇票</MenuItem>
                  <MenuItem value='现金'>现金</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label='付款金额 *'
                type='number'
                fullWidth
                value={newPayment.amount}
                onChange={(e) =>
                  setNewPayment({
                    ...newPayment,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </Stack>
            <TextField
              label='银行账户'
              fullWidth
              value={newPayment.bank_account}
              onChange={(e) => setNewPayment({ ...newPayment, bank_account: e.target.value })}
              placeholder='请输入银行账户'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleCreate}
            disabled={createLoading}
          >
            {createLoading ? '提交中...' : '提交申请'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>确认付款</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Stack
              spacing={3}
              sx={{ pt: 2 }}
            >
              <MuiBox
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <MuiBox>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    付款单号
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 600, color: 'success.main' }}
                  >
                    {selectedPayment.payment_number}
                  </Typography>
                </MuiBox>
                <MuiBox>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    付款日期
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedPayment.payment_date}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  供应商
                </Typography>
                <Typography
                  variant='body1'
                  sx={{ fontWeight: 500 }}
                >
                  {selectedPayment.supplier}
                </Typography>
              </MuiBox>
              <MuiBox
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <MuiBox sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    付款方式
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedPayment.payment_method}
                  </Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    付款金额
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'error.main' }}
                  >
                    ¥{selectedPayment.amount.toLocaleString()}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  银行账户
                </Typography>
                <Typography
                  variant='body1'
                  sx={{ fontWeight: 500 }}
                >
                  {selectedPayment.bank_account}
                </Typography>
              </MuiBox>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApproveModal(false)}>取消</Button>
          <Button
            variant='contained'
            color='success'
            onClick={confirmApprove}
          >
            确认付款
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={rejectDialogOpen}
        onClose={() => {
          setRejectDialogOpen(false);
          setRejectingPayment(null);
        }}
        onConfirm={handleReject}
        title='确认拒绝'
        message='确定要拒绝该付款申请吗？'
        type='warning'
        confirmLabel='拒绝'
        cancelLabel='取消'
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeletingId(null);
        }}
        onConfirm={handleDelete}
        title='确认删除'
        message='确定要删除该付款记录吗？'
        danger
      />
    </PageContainer>
  );
};

export default FinancePaymentPage;
