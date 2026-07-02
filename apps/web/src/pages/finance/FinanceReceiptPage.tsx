import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Banknote, CheckCircle, Clock, Eye, Check, RefreshCw } from 'lucide-react';
import { DataExport, BackButton, PageContainer, CurrencyField } from '@/components/common';
import { ListPageTemplate, StatCardGroup } from '@/components';
import { useNotification } from '@/hooks/useNotification';
import { apiLogger } from '@/utils/logger';
import { financeApi } from '@/api/finance';
import type { CollectionRecord } from '@/types/finance';

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
  Button,
} from '@mui/material';
import ConfirmDialog from '@/components/common/ConfirmDialog';

interface Receipt {
  id: string;
  receipt_number: string;
  receipt_date: string;
  customer: string;
  receipt_method: string;
  amount: number;
  bank_account: string;
  status: string;
}

const FinanceReceiptPage: React.FC = () => {
  const { success, error, notifications, hideNotification } = useNotification();

  const [receiptData, setReceiptData] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [filterMethod, setFilterMethod] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newReceipt, setNewReceipt] = useState({
    customer: '',
    receipt_method: '银行转账',
    amount: 0,
    bank_account: '',
  });

  const mapCollectionRecordToReceipt = (record: CollectionRecord): Receipt => {
    const bankAccount = record.bank_name
      ? `${record.bank_name} ${record.bank_account_no}`
      : record.bank_account_no;

    let statusText = '';
    switch (record.status) {
      case 'recorded':
        statusText = '已到账';
        break;
      case 'matched':
        statusText = '已核销';
        break;
      case 'cancelled':
        statusText = '已取消';
        break;
      default:
        statusText = record.status;
    }

    return {
      id: record.id,
      receipt_number: record.collection_no,
      receipt_date: record.collection_date,
      customer: record.customer_name,
      receipt_method: '银行转账',
      amount: record.amount,
      bank_account: bankAccount,
      status: statusText,
    };
  };

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const response = await financeApi.receivablePayable.listCollections({
        page: 1,
        pagesize: 100,
      });
      if (response.success && response.data) {
        const receipts = response.data.items.map(mapCollectionRecordToReceipt);
        setReceiptData(receipts);
      }
    } catch (err) {
      error('获取收款记录失败');
      apiLogger.error('Failed to fetch collections', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const filteredData = useMemo(() => {
    return receiptData.filter((receipt) => {
      if (filterMethod && receipt.receipt_method !== filterMethod) return false;
      if (filterStatus && receipt.status !== filterStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !receipt.receipt_number.toLowerCase().includes(query) &&
          !receipt.customer.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [receiptData, filterMethod, filterStatus, searchQuery]);

  const statCards = useMemo(() => {
    const totalCount = receiptData.length;
    const receivedCount = receiptData.filter((r) => r.status === '已到账').length;
    const pendingCount = receiptData.filter((r) => r.status === '待到账').length;
    const verifyCount = receiptData.filter((r) => r.status === '待核销').length;
    const totalAmount = receiptData.reduce((sum, r) => sum + r.amount, 0);

    return [
      {
        title: '总收款数',
        value: totalCount,
        icon: <Banknote size={24} />,
        color: 'primary' as const,
      },
      {
        title: '已到账',
        value: receivedCount,
        icon: <CheckCircle size={24} />,
        color: 'success' as const,
      },
      {
        title: '待到账',
        value: pendingCount,
        icon: <Clock size={24} />,
        color: 'warning' as const,
      },
      {
        title: '待核销',
        value: verifyCount,
        icon: <Clock size={24} />,
        color: 'error' as const,
      },
      {
        title: '总金额',
        value: `¥${totalAmount.toLocaleString()}`,
        icon: <Banknote size={24} />,
        color: 'secondary' as const,
      },
    ];
  }, [receiptData]);

  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      {
        color: 'success' | 'warning' | 'error' | 'default';
        icon: React.ReactNode;
      }
    > = {
      已到账: { color: 'success', icon: <CheckCircle size={12} /> },
      已核销: { color: 'success', icon: <Check size={12} /> },
      待核销: { color: 'warning', icon: <Clock size={12} /> },
      待到账: { color: 'default', icon: <Clock size={12} /> },
      已取消: { color: 'error', icon: <Clock size={12} /> },
    };
    return configs[status] || { color: 'default', icon: null };
  };

  const handleCreate = async () => {
    if (!newReceipt.customer || !newReceipt.amount) {
      error('请填写客户和收款金额');
      return;
    }

    setCreateLoading(true);
    try {
      const response = await financeApi.receivablePayable.createCollection({
        customer_id: '',
        customer_name: newReceipt.customer,
        amount: newReceipt.amount,
        collection_date: new Date().toISOString().split('T')[0],
        bank_account_id: '',
        bank_account_no: newReceipt.bank_account || '默认账户',
        bank_name: '',
        invoice_ids: [],
        status: 'recorded',
      });

      if (response.success && response.data) {
        const newEntry = mapCollectionRecordToReceipt(response.data);
        setReceiptData([newEntry, ...receiptData]);
        success('收款登记成功');
        setShowCreateModal(false);
        setNewReceipt({
          customer: '',
          receipt_method: '银行转账',
          amount: 0,
          bank_account: '',
        });
      } else {
        error(response.error?.message || '收款登记失败');
      }
    } catch (err) {
      error('收款登记失败');
      apiLogger.error('Failed to create collection', err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleConfirm = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowConfirmModal(true);
  };

  const confirmReceipt = () => {
    if (!selectedReceipt) return;
    setReceiptData(
      receiptData.map((r) => (r.id === selectedReceipt.id ? { ...r, status: '已到账' } : r))
    );
    success('收款已确认到账');
    setShowConfirmModal(false);
  };

  const handleVerify = (receipt: Receipt) => {
    setReceiptData(receiptData.map((r) => (r.id === receipt.id ? { ...r, status: '已核销' } : r)));
    success('收款已核销');
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!deletingId) return;
    setReceiptData(receiptData.filter((r) => r.id !== deletingId));
    success('收款记录已删除');
  };

  const handleSearch = () => {};

  const handleReset = () => {
    setSearchQuery('');
    setFilterMethod('');
    setFilterStatus('');
  };

  const handleRefresh = () => {
    fetchCollections();
  };

  const columns = useMemo(
    () => [
      {
        id: 'receipt_number',
        label: '收款单号',
        render: (row: Receipt) => (
          <MuiBox sx={{ fontWeight: 600, color: 'success.main' }}>{row.receipt_number}</MuiBox>
        ),
      },
      {
        id: 'receipt_date',
        label: '收款日期',
        render: (row: Receipt) => (
          <MuiBox sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{row.receipt_date}</MuiBox>
        ),
      },
      {
        id: 'customer',
        label: '客户',
        render: (row: Receipt) => <MuiBox sx={{ fontWeight: 500 }}>{row.customer}</MuiBox>,
      },
      {
        id: 'receipt_method',
        label: '收款方式',
        render: (row: Receipt) => (
          <Chip
            label={row.receipt_method}
            size='small'
          />
        ),
      },
      {
        id: 'amount',
        label: '收款金额',
        render: (row: Receipt) => (
          <MuiBox
            sx={{
              fontWeight: 700,
              color: 'success.main',
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
        render: (row: Receipt) => (
          <MuiBox sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{row.bank_account}</MuiBox>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row: Receipt) => {
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

  const rowActions = useMemo(
    () => [
      {
        label: '确认到账',
        icon: <CheckCircle sx={{ width: 16, height: 16 }} />,
        color: 'success' as const,
        show: (row: Receipt) => row.status === '待到账',
        onClick: (row: Receipt) => handleConfirm(row),
      },
      {
        label: '核销',
        icon: <Check sx={{ width: 16, height: 16 }} />,
        color: 'success' as const,
        show: (row: Receipt) => row.status === '已到账',
        onClick: (row: Receipt) => handleVerify(row),
      },
      {
        label: '查看',
        icon: <Eye sx={{ width: 16, height: 16 }} />,
        onClick: (row: Receipt) => apiLogger.info('查看', row),
      },
      {
        label: '删除',
        icon: <Trash2 sx={{ width: 16, height: 16 }} />,
        color: 'error' as const,
        onClick: (row: Receipt) => handleDeleteClick(row.id),
      },
    ],
    []
  );

  const advancedFilters = useMemo(
    () => [
      {
        id: 'receipt_method',
        label: '收款方式',
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
          { value: '已到账', label: '已到账' },
          { value: '已核销', label: '已核销' },
          { value: '待核销', label: '待核销' },
          { value: '待到账', label: '待到账' },
          { value: '已取消', label: '已取消' },
        ],
        value: filterStatus,
        onChange: setFilterStatus,
      },
    ],
    [filterMethod, filterStatus]
  );

  const exportFields = useMemo(
    () => [
      { key: 'receipt_number', title: '收款单号' },
      { key: 'receipt_date', title: '收款日期' },
      { key: 'customer', title: '客户' },
      { key: 'receipt_method', title: '收款方式' },
      { key: 'amount', title: '收款金额' },
      { key: 'bank_account', title: '银行账户' },
      { key: 'status', title: '状态' },
    ],
    []
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <MuiBox
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 'sm',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <MuiBox
          sx={{
            maxWidth: 1280,
            mx: 'auto',
            px: { xs: 2, sm: 3, lg: 4 },
            py: 3,
          }}
        >
          <Stack
            direction='row'
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Stack
              direction='row'
              sx={{ alignItems: 'center' }}
              spacing={2}
            >
              <BackButton href='/finance/dashboard' />
              <MuiBox>
                <Typography
                  variant='h5'
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: 700,
                  }}
                >
                  <MuiBox
                    component='span'
                    sx={{
                      width: 28,
                      height: 28,
                      mr: 1.5,
                      color: 'success.main',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Banknote size={28} />
                  </MuiBox>
                  收款管理
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  管理客户收款登记，确认到账和核销
                </Typography>
              </MuiBox>
            </Stack>
            <Stack
              direction='row'
              spacing={1}
            >
              <IconButton onClick={handleRefresh}>
                <RefreshCw sx={{ width: 20, height: 20 }} />
              </IconButton>
              <DataExport
                data={receiptData as unknown as Record<string, unknown>[]}
                fields={exportFields}
                defaultFileName='收款数据'
                buttonText='数据导出'
              />
              <Button
                variant='contained'
                startIcon={<Plus sx={{ width: 20, height: 20 }} />}
                onClick={() => setShowCreateModal(true)}
              >
                收款登记
              </Button>
            </Stack>
          </Stack>
        </MuiBox>
      </MuiBox>

      <MuiBox sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}>
        <StatCardGroup
          stats={statCards}
          columns={5}
        />

        <ListPageTemplate
          columns={columns}
          data={filteredData}
          searchable
          searchPlaceholder='搜索收款单号、客户...'
          filters={advancedFilters}
          filtersValue={{
            receipt_method: filterMethod,
            status: filterStatus,
          }}
          onFilterChange={(filters) => {
            if (filters.receipt_method !== undefined)
              setFilterMethod(filters.receipt_method as string);
            if (filters.status !== undefined) setFilterStatus(filters.status as string);
          }}
          onSearch={handleSearch}
          actions={[
            { label: '搜索', variant: 'outlined', onClick: handleSearch },
            { label: '重置', variant: 'outlined', onClick: handleReset },
          ]}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          rowActions={rowActions}
          loading={loading}
        />
      </MuiBox>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>收款登记</DialogTitle>
        <DialogContent>
          <Stack
            spacing={3}
            sx={{ pt: 2 }}
          >
            <TextField
              label='客户 *'
              fullWidth
              value={newReceipt.customer}
              onChange={(e) => setNewReceipt({ ...newReceipt, customer: e.target.value })}
            />
            <Stack
              direction='row'
              spacing={2}
            >
              <FormControl fullWidth>
                <InputLabel>收款方式</InputLabel>
                <Select
                  value={newReceipt.receipt_method}
                  label='收款方式'
                  onChange={(e) =>
                    setNewReceipt({
                      ...newReceipt,
                      receipt_method: e.target.value,
                    })
                  }
                >
                  <MenuItem value='银行转账'>银行转账</MenuItem>
                  <MenuItem value='银行承兑汇票'>银行承兑汇票</MenuItem>
                  <MenuItem value='商业承兑汇票'>商业承兑汇票</MenuItem>
                  <MenuItem value='现金'>现金</MenuItem>
                </Select>
              </FormControl>
              <CurrencyField
                label='收款金额 *'
                fullWidth
                value={newReceipt.amount || 0}
                onChange={(val) =>
                  setNewReceipt({
                    ...newReceipt,
                    amount: val,
                  })
                }
              />
            </Stack>
            <TextField
              label='银行账户'
              fullWidth
              value={newReceipt.bank_account}
              onChange={(e) => setNewReceipt({ ...newReceipt, bank_account: e.target.value })}
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
            {createLoading ? '登记中...' : '登记'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>确认到账</DialogTitle>
        <DialogContent>
          {selectedReceipt && (
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
                    收款单号
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 600, color: 'success.main' }}
                  >
                    {selectedReceipt.receipt_number}
                  </Typography>
                </MuiBox>
                <MuiBox>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    收款日期
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedReceipt.receipt_date}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  客户
                </Typography>
                <Typography
                  variant='body1'
                  sx={{ fontWeight: 500 }}
                >
                  {selectedReceipt.customer}
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
                    收款方式
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedReceipt.receipt_method}
                  </Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    收款金额
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700, color: 'success.main' }}
                  >
                    ¥{selectedReceipt.amount.toLocaleString()}
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
                  {selectedReceipt.bank_account}
                </Typography>
              </MuiBox>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmModal(false)}>取消</Button>
          <Button
            variant='contained'
            color='success'
            onClick={confirmReceipt}
          >
            确认到账
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeletingId(null);
        }}
        onConfirm={handleDelete}
        title='确认删除'
        message='确定要删除该收款记录吗？'
        danger
      />
    </PageContainer>
  );
};

export default FinanceReceiptPage;
