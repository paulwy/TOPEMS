import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type { BankAccount, BankTransaction, CreateBankTransactionRequest, PaginationParams } from '@/api/erp';
import { bankAccountApi, bankTransactionApi } from '@/api/erp';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Edit, Trash2, Eye, Save, CreditCard, ArrowRightLeft } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

type AccountFormData = {
  bank_name: string;
  branch_name?: string;
  account_name: string;
  account_number: string;
  account_type: string;
  balance: number;
  currency: string;
  status: string;
};

type TransactionFormData = {
  account_id: string;
  transaction_date: string;
  transaction_type: string;
  amount: number;
  description?: string;
  counterparty_account?: string;
  counterparty_name?: string;
  voucher_id?: string;
};

const BankAccountPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BankAccount | BankTransaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [accountForm, setAccountForm] = useState<AccountFormData>({
    bank_name: '',
    branch_name: '',
    account_name: '',
    account_number: '',
    account_type: 'basic',
    balance: 0,
    currency: 'CNY',
    status: 'active',
  });
  const [transactionForm, setTransactionForm] = useState<TransactionFormData>({
    account_id: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    transaction_type: '',
    amount: 0,
    description: '',
    counterparty_account: '',
    counterparty_name: '',
    voucher_id: '',
  });

  const params: PaginationParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.ERP.BANK_ACCOUNTS, params],
    queryFn: async () => {
      const response = await bankAccountApi.list(params);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 0,
  });

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.ERP.BANK_TRANSACTIONS, params],
    queryFn: async () => {
      const response = await bankTransactionApi.list(params);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 1,
  });

  const accounts = accountsData?.items || [];
  const transactions = transactionsData?.items || [];
  const data = activeTab === 0 ? accounts : transactions;
  const total = activeTab === 0 ? (accountsData?.total || 0) : (transactionsData?.total || 0);
  const loading = activeTab === 0 ? accountsLoading : transactionsLoading;

  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.BANK_ACCOUNTS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.BANK_TRANSACTIONS });
  };

  const createAccountMutation = useMutation({
    mutationFn: (data: Partial<BankAccount>) => bankAccountApi.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '银行账户已添加' });
      invalidateData();
      setShowDialog(false);
      resetAccountForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '添加银行账户失败' });
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BankAccount> }) =>
      bankAccountApi.update(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '银行账户已更新' });
      invalidateData();
      setShowDialog(false);
      resetAccountForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '更新银行账户失败' });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => bankAccountApi.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '银行账户已删除' });
      invalidateData();
    },
    onError: (error: unknown) => {
      apiLogger.error('删除失败:', error);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除银行账户' });
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data: CreateBankTransactionRequest) => bankTransactionApi.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '交易记录已添加' });
      invalidateData();
      setShowDialog(false);
      resetTransactionForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '添加交易记录失败' });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (id: string) => bankTransactionApi.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '交易记录已删除' });
      invalidateData();
    },
    onError: (error: unknown) => {
      apiLogger.error('删除失败:', error);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除交易记录' });
    },
  });

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      active: '正常',
      frozen: '冻结',
      closed: '已注销',
      pending: '待审核',
      income: '收入',
      expense: '支出',
      transfer: '转账',
    };
    return statusMap[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        bg: string;
        color: string;
      }
    > = {
      active: { label: '正常', bg: 'success.lighter', color: 'success.700' },
      frozen: { label: '冻结', bg: 'warning.light', color: 'warning.700' },
      closed: { label: '已注销', bg: 'error.lighter', color: 'error.dark' },
      pending: { label: '待审核', bg: 'info.light', color: 'info.700' },
      income: { label: '收入', bg: 'success.lighter', color: 'success.700' },
      expense: { label: '支出', bg: 'error.lighter', color: 'error.dark' },
      transfer: { label: '转账', bg: 'secondary[100]', color: 'secondary.700' },
    };
    const s = statusMap[status] || { label: status, bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        size='small'
        label={s.label}
        sx={{ backgroundColor: s.bg, color: s.color, fontWeight: 500 }}
      />
    );
  };

  const handleSubmitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem && activeTab === 0) {
      updateAccountMutation.mutate({ id: selectedItem.id, data: accountForm });
    } else {
      createAccountMutation.mutate(accountForm);
    }
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    createTransactionMutation.mutate(transactionForm as CreateBankTransactionRequest);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('确定要删除这条记录吗?')) return;
    if (activeTab === 0) {
      deleteAccountMutation.mutate(id);
    } else {
      deleteTransactionMutation.mutate(id);
    }
  };

  const handleEdit = (item: BankAccount | BankTransaction) => {
    setSelectedItem(item);
    if (activeTab === 0) {
      const a = item as BankAccount;
      setAccountForm({
        bank_name: a.bank_name || '',
        branch_name: a.branch_name || '',
        account_name: a.account_name || '',
        account_number: a.account_number || '',
        account_type: a.account_type || 'basic',
        balance: a.balance || 0,
        currency: a.currency || 'CNY',
        status: a.status || 'active',
      });
    }
    setShowDialog(true);
  };

  const handleViewDetail = (item: BankAccount | BankTransaction) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  };

  const resetAccountForm = () => {
    setAccountForm({
      bank_name: '',
      branch_name: '',
      account_name: '',
      account_number: '',
      account_type: 'basic',
      balance: 0,
      currency: 'CNY',
      status: 'active',
    });
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      account_id: '',
      transaction_date: new Date().toISOString().slice(0, 10),
      transaction_type: '',
      amount: 0,
      description: '',
      counterparty_account: '',
      counterparty_name: '',
      voucher_id: '',
    });
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const accountColumns: ColumnDef<BankAccount>[] = useMemo(
    () => [
      {
        id: 'account_name',
        label: '账户名称',
        accessorKey: 'account_name',
        sortable: true,
      },
      {
        id: 'bank_name',
        label: '银行名称',
        accessorKey: 'bank_name',
        sortable: true,
      },
      {
        id: 'account_number',
        label: '账号',
        accessorKey: 'account_number',
      },
      {
        id: 'balance',
        label: '账户余额',
        render: (row) => `¥${(row.balance || 0).toFixed(2)}`,
        sortable: true,
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'created_at',
        label: '创建时间',
        render: (row) => new Date(row.created_at).toLocaleDateString('zh-CN'),
      },
    ],
    []
  );

  const transactionColumns: ColumnDef<BankTransaction>[] = useMemo(
    () => [
      {
        id: 'description',
        label: '交易描述',
        render: (row) => row.description || '-',
      },
      {
        id: 'transaction_type',
        label: '交易类型',
        render: (row) => getStatusBadge(row.transaction_type || ''),
      },
      {
        id: 'counterparty_name',
        label: '交易对方',
        render: (row) => row.counterparty_name || '-',
      },
      {
        id: 'amount',
        label: '交易金额',
        render: (row) => `¥${(row.amount || 0).toFixed(2)}`,
        sortable: true,
      },
      {
        id: 'transaction_date',
        label: '交易日期',
        render: (row) => new Date(row.transaction_date).toLocaleDateString('zh-CN'),
        sortable: true,
      },
      {
        id: 'created_at',
        label: '创建时间',
        render: (row) => new Date(row.created_at).toLocaleDateString('zh-CN'),
      },
    ],
    []
  );

  const columns = (activeTab === 0 ? accountColumns : transactionColumns) as ColumnDef<
    BankAccount | BankTransaction
  >[];

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: activeTab === 0 ? '状态' : '类型',
        type: 'select',
        options:
          activeTab === 0
            ? [
                { label: '全部状态', value: 'all' },
                { label: '正常', value: 'active' },
                { label: '冻结', value: 'frozen' },
                { label: '已注销', value: 'closed' },
                { label: '待审核', value: 'pending' },
              ]
            : [
                { label: '全部类型', value: 'all' },
                { label: '收入', value: 'income' },
                { label: '支出', value: 'expense' },
                { label: '转账', value: 'transfer' },
              ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter, activeTab]
  );

  const rowActions: RowAction<BankAccount | BankTransaction>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      ...(activeTab === 0
        ? [
            {
              label: '编辑',
              icon: <Edit size={16} />,
              onClick: handleEdit,
            },
          ]
        : []),
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这条记录吗?',
      },
    ],
    [activeTab]
  );

  const handleOpenCreate = () => {
    setSelectedItem(null);
    if (activeTab === 0) {
      resetAccountForm();
    } else {
      resetTransactionForm();
    }
    setShowDialog(true);
  };

  const totalBalance = accounts.reduce((sum, item) => sum + (item.balance || 0), 0);
  const incomeAmount = transactions
    .filter((t) => t.transaction_type === 'income')
    .reduce((sum, item) => sum + (item.amount || 0), 0);
  const expenseAmount = transactions
    .filter((t) => t.transaction_type === 'expense')
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {activeTab === 0 ? (
            <CreditCard size={18} sx={{ color: 'secondary.700' }} />
          ) : (
            <ArrowRightLeft size={18} sx={{ color: 'secondary.700' }} />
          )}
          <Box component='span' sx={{ color: 'text.secondary', fontSize: 14 }}>
            {activeTab === 0 ? '账户总数' : '交易总数'}
          </Box>
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'secondary.700' }}>{data.length}</Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>
          {activeTab === 0 ? '账户总余额' : '总收入'}
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
          ¥{(activeTab === 0 ? totalBalance : incomeAmount).toFixed(2)}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>
          {activeTab === 0 ? '正常账户' : '总支出'}
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>
          {activeTab === 0
            ? accounts.filter((a) => a.status === 'active').length
            : `¥${expenseAmount.toFixed(2)}`}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>
          {activeTab === 0 ? '冻结/注销' : '转账数量'}
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>
          {activeTab === 0
            ? accounts.filter((a) => ['frozen', 'closed'].includes(a.status)).length
            : transactions.filter((t) => t.transaction_type === 'transfer').length}
        </Box>
      </Box>
    </Box>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: activeTab === 0 ? <CreditCard style={{ width: 20, height: 20 }} /> : <ArrowRightLeft style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(_, v) => {
          setActiveTab(v);
          setCurrentPage(1);
        }}
        sx={{ mb: 3 }}
      >
        <Tab label='银行账户' icon={<CreditCard size={16} />} />
        <Tab label='交易流水' icon={<ArrowRightLeft size={16} />} />
      </Tabs>

      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={data}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={activeTab === 0 ? '搜索账户名称...' : '搜索交易描述...'}
        searchValue={searchTerm}
        onSearch={handleSearch}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
        actions={[
          {
            label: `新增${activeTab === 0 ? '银行账户' : '交易记录'}`,
            icon: <Save size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={`暂无${activeTab === 0 ? '银行账户' : '交易流水'}数据`}
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedItem ? '编辑记录' : `新增${activeTab === 0 ? '银行账户' : '交易记录'}`}</DialogTitle>
        <DialogContent>
          {activeTab === 0 ? (
            <form onSubmit={handleSubmitAccount}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                  py: 2,
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='bank_name'>银行名称 *</InputLabel>
                  <TextField
                    id='bank_name'
                    required
                    size='small'
                    value={accountForm.bank_name}
                    onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='branch_name'>支行名称</InputLabel>
                  <TextField
                    id='branch_name'
                    size='small'
                    value={accountForm.branch_name || ''}
                    onChange={(e) => setAccountForm({ ...accountForm, branch_name: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='account_number'>账号 *</InputLabel>
                  <TextField
                    id='account_number'
                    required
                    size='small'
                    value={accountForm.account_number}
                    onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='account_name'>账户名称 *</InputLabel>
                  <TextField
                    id='account_name'
                    required
                    size='small'
                    value={accountForm.account_name}
                    onChange={(e) => setAccountForm({ ...accountForm, account_name: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='currency'>货币</InputLabel>
                  <FormControl fullWidth size='small'>
                    <Select
                      id='currency'
                      value={accountForm.currency || 'CNY'}
                      onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}
                    >
                      <MenuItem value='CNY'>CNY</MenuItem>
                      <MenuItem value='USD'>USD</MenuItem>
                      <MenuItem value='EUR'>EUR</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='account_type'>账户类型</InputLabel>
                  <FormControl fullWidth size='small'>
                    <Select
                      id='account_type'
                      value={accountForm.account_type || 'basic'}
                      onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value })}
                    >
                      <MenuItem value='basic'>基本账户</MenuItem>
                      <MenuItem value='general'>一般账户</MenuItem>
                      <MenuItem value='special'>专用账户</MenuItem>
                      <MenuItem value='temporary'>临时账户</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='balance'>账户余额</InputLabel>
                  <TextField
                    id='balance'
                    size='small'
                    type='number'
                    value={accountForm.balance}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, balance: parseFloat(e.target.value) || 0 })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='status'>状态</InputLabel>
                  <FormControl fullWidth size='small'>
                    <Select
                      id='status'
                      value={accountForm.status || 'active'}
                      onChange={(e) => setAccountForm({ ...accountForm, status: e.target.value })}
                    >
                      <MenuItem value='active'>正常</MenuItem>
                      <MenuItem value='frozen'>冻结</MenuItem>
                      <MenuItem value='closed'>已注销</MenuItem>
                      <MenuItem value='pending'>待审核</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              <DialogActions sx={{ mt: 2 }}>
                <Button type='button' variant='outlined' onClick={() => setShowDialog(false)}>
                  取消
                </Button>
                <Button type='submit' variant='contained' startIcon={<Save size={16} />}>
                  保存
                </Button>
              </DialogActions>
            </form>
          ) : (
            <form onSubmit={handleSubmitTransaction}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                  py: 2,
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='account_id'>账户ID *</InputLabel>
                  <TextField
                    id='account_id'
                    required
                    size='small'
                    value={transactionForm.account_id}
                    onChange={(e) => setTransactionForm({ ...transactionForm, account_id: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='transaction_date'>交易日期 *</InputLabel>
                  <TextField
                    id='transaction_date'
                    required
                    size='small'
                    type='date'
                    value={transactionForm.transaction_date}
                    onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='transaction_type'>交易类型 *</InputLabel>
                  <FormControl fullWidth size='small'>
                    <Select
                      id='transaction_type'
                      value={transactionForm.transaction_type || ''}
                      onChange={(e) => setTransactionForm({ ...transactionForm, transaction_type: e.target.value })}
                    >
                      <MenuItem value='income'>收入</MenuItem>
                      <MenuItem value='expense'>支出</MenuItem>
                      <MenuItem value='transfer'>转账</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='amount'>交易金额 *</InputLabel>
                  <TextField
                    id='amount'
                    required
                    size='small'
                    type='number'
                    value={transactionForm.amount}
                    onChange={(e) =>
                      setTransactionForm({ ...transactionForm, amount: parseFloat(e.target.value) || 0 })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='counterparty_name'>对方名称</InputLabel>
                  <TextField
                    id='counterparty_name'
                    size='small'
                    value={transactionForm.counterparty_name || ''}
                    onChange={(e) => setTransactionForm({ ...transactionForm, counterparty_name: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='counterparty_account'>对方账号</InputLabel>
                  <TextField
                    id='counterparty_account'
                    size='small'
                    value={transactionForm.counterparty_account || ''}
                    onChange={(e) => setTransactionForm({ ...transactionForm, counterparty_account: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='voucher_id'>凭证ID</InputLabel>
                  <TextField
                    id='voucher_id'
                    size='small'
                    value={transactionForm.voucher_id || ''}
                    onChange={(e) => setTransactionForm({ ...transactionForm, voucher_id: e.target.value })}
                  />
                </Box>
                <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='description'>备注</InputLabel>
                  <TextField
                    id='description'
                    size='small'
                    multiline
                    rows={2}
                    value={transactionForm.description || ''}
                    onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                  />
                </Box>
              </Box>

              <DialogActions sx={{ mt: 2 }}>
                <Button type='button' variant='outlined' onClick={() => setShowDialog(false)}>
                  取消
                </Button>
                <Button type='submit' variant='contained' startIcon={<Save size={16} />}>
                  保存
                </Button>
              </DialogActions>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{activeTab === 0 ? '银行账户' : '交易记录'}详情</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {activeTab === 0 ? (
                  <>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>银行名称</InputLabel>
                      <Box sx={{ fontWeight: 500 }}>{(selectedItem as BankAccount).bank_name}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>支行名称</InputLabel>
                      <Box component='span'>{(selectedItem as BankAccount).branch_name || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>账号</InputLabel>
                      <Box component='span'>{(selectedItem as BankAccount).account_number}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>账户名称</InputLabel>
                      <Box component='span'>{(selectedItem as BankAccount).account_name}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>账户类型</InputLabel>
                      <Box component='span'>{(selectedItem as BankAccount).account_type}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>货币</InputLabel>
                      <Box component='span'>{(selectedItem as BankAccount).currency}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>账户余额</InputLabel>
                      <Box component='span'>¥{(selectedItem as BankAccount).balance?.toFixed(2) || '0.00'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                      <Box>{getStatusBadge((selectedItem as BankAccount).status)}</Box>
                    </Box>
                  </>
                ) : (
                  <>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>交易类型</InputLabel>
                      <Box>{getStatusBadge((selectedItem as BankTransaction).transaction_type || '')}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>交易金额</InputLabel>
                      <Box component='span'>¥{(selectedItem as BankTransaction).amount?.toFixed(2) || '0.00'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>交易日期</InputLabel>
                      <Box component='span'>{(selectedItem as BankTransaction).transaction_date}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>余额</InputLabel>
                      <Box component='span'>¥{(selectedItem as BankTransaction).balance_after?.toFixed(2) || '0.00'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>对方名称</InputLabel>
                      <Box component='span'>{(selectedItem as BankTransaction).counterparty_name || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>对方账号</InputLabel>
                      <Box component='span'>{(selectedItem as BankTransaction).counterparty_account || '-'}</Box>
                    </Box>
                    {(selectedItem as BankTransaction).voucher_id && (
                      <Box>
                        <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>凭证ID</InputLabel>
                        <Box component='span'>{(selectedItem as BankTransaction).voucher_id}</Box>
                      </Box>
                    )}
                    {(selectedItem as BankTransaction).description && (
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>备注</InputLabel>
                        <Box>{(selectedItem as BankTransaction).description}</Box>
                      </Box>
                    )}
                  </>
                )}
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>{new Date(selectedItem.created_at).toLocaleString('zh-CN')}</Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default BankAccountPage;
