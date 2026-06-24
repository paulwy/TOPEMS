import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import type { ColumnDef } from '@/components/mui';
import { ListPageTemplate, StatCard } from '@/components/mui';
import { DataExport } from '@/components/common';

import {
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
} from '@mui/material';
import { Button } from '@/components/ui/Button';

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

const mockPaymentData: Payment[] = [
  {
    id: '1',
    payment_number: 'FK202401001',
    payment_date: '2024-01-15',
    supplier: '广州电子有限公司',
    payment_method: '银行转账',
    amount: 113000,
    bank_account: '招商银行 ****1234',
    status: '已付款',
  },
  {
    id: '2',
    payment_number: 'FK202401002',
    payment_date: '2024-01-18',
    supplier: '东莞制造有限公司',
    payment_method: '银行承兑汇票',
    amount: 56500,
    bank_account: '工商银行 ****5678',
    status: '审批中',
  },
  {
    id: '3',
    payment_number: 'FK202401003',
    payment_date: '2024-01-20',
    supplier: '惠州材料有限公司',
    payment_method: '银行转账',
    amount: 226000,
    bank_account: '建设银行 ****9012',
    status: '已付款',
  },
  {
    id: '4',
    payment_number: 'FK202401004',
    payment_date: '2024-01-22',
    supplier: '深圳物流公司',
    payment_method: '现金',
    amount: 5000,
    bank_account: '库存现金',
    status: '已付款',
  },
  {
    id: '5',
    payment_number: 'FK202401005',
    payment_date: '2024-01-25',
    supplier: '广州电子有限公司',
    payment_method: '银行转账',
    amount: 50000,
    bank_account: '招商银行 ****1234',
    status: '待审批',
  },
  {
    id: '6',
    payment_number: 'FK202402001',
    payment_date: '2024-02-05',
    supplier: '佛山配件厂',
    payment_method: '银行转账',
    amount: 85000,
    bank_account: '农业银行 ****3456',
    status: '已付款',
  },
  {
    id: '7',
    payment_number: 'FK202402002',
    payment_date: '2024-02-10',
    supplier: '东莞制造有限公司',
    payment_method: '商业承兑汇票',
    amount: 100000,
    bank_account: '中国银行 ****7890',
    status: '审批中',
  },
  {
    id: '8',
    payment_number: 'FK202402003',
    payment_date: '2024-02-15',
    supplier: '广州电子有限公司',
    payment_method: '银行转账',
    amount: 30000,
    bank_account: '招商银行 ****1234',
    status: '已付款',
  },
];

const FinancePaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [paymentData, setPaymentData] = useState<Payment[]>(mockPaymentData);
  const [filterMethod, setFilterMethod] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const [newPayment, setNewPayment] = useState({
    supplier: '',
    payment_method: '银行转账',
    amount: 0,
    bank_account: '',
  });

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

  const handleCreate = () => {
    const newEntry: Payment = {
      id: String(paymentData.length + 1),
      payment_number: `FK${Date.now()}`,
      payment_date: new Date().toISOString().split('T')[0],
      supplier: newPayment.supplier,
      payment_method: newPayment.payment_method,
      amount: newPayment.amount,
      bank_account: newPayment.bank_account || '默认账户',
      status: '待审批',
    };
    setPaymentData([...paymentData, newEntry]);
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

  const handleReject = (payment: Payment) => {
    if (!confirm('确定要拒绝该付款申请吗？')) return;
    setPaymentData(paymentData.map((p) => (p.id === payment.id ? { ...p, status: '已拒绝' } : p)));
    addNotification({
      title: '已拒绝',
      message: '付款申请已拒绝',
      type: 'warning',
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('确定要删除该付款记录吗？')) return;
    setPaymentData(paymentData.filter((p) => p.id !== id));
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

  // 统计卡片数据
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

  // 列定义 - ListPageTemplate 格式
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

  // 行操作渲染
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
            >
              <CheckCircle sx={{ width: 16, height: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title='拒绝'>
            <IconButton
              size='small'
              color='error'
              onClick={() => handleReject(row)}
            >
              <XCircle sx={{ width: 16, height: 16 }} />
            </IconButton>
          </Tooltip>
        </>
      )}
      {row.status === '已付款' && (
        <Tooltip title='查看'>
          <IconButton size='small'>
            <Eye sx={{ width: 16, height: 16 }} />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title='删除'>
        <IconButton
          size='small'
          color='error'
          onClick={() => handleDelete(row.id)}
        >
          <Trash2 sx={{ width: 16, height: 16 }} />
        </IconButton>
      </Tooltip>
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
        onChange: setFilterMethod,
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
        onChange: setFilterStatus,
      },
    ],
    [filterMethod, filterStatus]
  );

  // 导出字段配置
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
    <>
      <ListPageTemplate
        title='付款管理'
        subtitle='管理供应商付款申请，审批和确认付款'
        backButton={{
          onClick: () => navigate('/dashboard'),
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
      />

      {/* DataExport 组件 */}
      <DataExport
        data={paymentData as unknown as Record<string, unknown>[]}
        fields={exportFields}
        defaultFileName='付款数据'
        buttonText='数据导出'
      />

      {/* Create Modal */}
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
          >
            提交申请
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approve Modal */}
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
    </>
  );
};

export default FinancePaymentPage;
