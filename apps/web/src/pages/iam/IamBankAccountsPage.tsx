/**
 * IAM 银行账号管理页面 - V4.0 标准化改造
 *
 * 改造要点：
 * 1. 使用 ListPageTemplate 统一列表页布局
 * 2. PageContainer autoTitle + autoBreadcrumbs
 * 3. 使用 ConfirmDialog 替代原生 confirm()
 * 4. 支持搜索、筛选、分页
 *
 * @module pages/iam
 * @path /iam/bank-accounts
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
} from '@mui/material';
import React, { useState, useMemo, useCallback } from 'react';
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Building2,
  Star,
} from 'lucide-react';

import { useAppStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';

/**
 * 账户类型配置
 */
const ACCOUNT_TYPE_CONFIG: Record<
  string,
  { label: string; color: 'primary' | 'success' | 'secondary' | 'warning' }
> = {
  checking: { label: '基本户', color: 'primary' },
  savings: { label: '一般户', color: 'success' },
  dedicated: { label: '专用户', color: 'secondary' },
  foreign: { label: '外币户', color: 'warning' },
};

/**
 * 账户状态配置
 */
const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'error' | 'default' }> = {
  active: { label: '正常', color: 'success' },
  frozen: { label: '冻结', color: 'error' },
  closed: { label: '销户', color: 'default' },
};

/**
 * 银行账号数据类型
 */
interface BankAccountInfo {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_branch?: string;
  account_type: string;
  currency: string;
  status: string;
  balance: number;
  is_primary: boolean;
  description?: string;
  created_at: string;
}

// 模拟数据
const mockBankAccounts: BankAccountInfo[] = [
  {
    id: '1',
    account_name: '基本户',
    account_number: '1234567890123456',
    bank_name: '中国工商银行',
    bank_branch: '北京分行',
    account_type: 'checking',
    currency: 'CNY',
    status: 'active',
    balance: 1234567.89,
    is_primary: true,
    description: '公司主要结算账户',
    created_at: '2024-01-01',
  },
  {
    id: '2',
    account_name: '一般户',
    account_number: '9876543210987654',
    bank_name: '中国建设银行',
    bank_branch: '上海分行',
    account_type: 'savings',
    currency: 'CNY',
    status: 'active',
    balance: 654321.12,
    is_primary: false,
    description: '备用账户',
    created_at: '2024-01-15',
  },
  {
    id: '3',
    account_name: '美元户',
    account_number: 'USD123456789',
    bank_name: '中国银行',
    bank_branch: '深圳分行',
    account_type: 'foreign',
    currency: 'USD',
    status: 'active',
    balance: 50000.0,
    is_primary: false,
    description: '外币结算账户',
    created_at: '2024-02-01',
  },
];

export const IamBankAccountsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [accounts, setAccounts] = useState<BankAccountInfo[]>(mockBankAccounts);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 分页状态
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // 弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccountInfo | null>(null);

  // 确认对话框状态
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    bank_branch: '',
    account_type: 'checking',
    currency: 'CNY',
    status: 'active',
    is_primary: false,
    description: '',
    balance: 0,
  });

  /**
   * 打开确认对话框
   */
  const openConfirmDialog = useCallback(
    (config: { title: string; message: string; onConfirm: () => void; danger?: boolean }) => {
      setConfirmDialogConfig(config);
      setConfirmDialogOpen(true);
    },
    []
  );

  /**
   * 加载数据
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setAccounts(mockBankAccounts);
    } catch (_err: unknown) {
      addNotification({
        title: '加载失败',
        message: extractErrorMessage(_err, '加载银行账号列表失败'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  /**
   * 创建账号
   */
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const newAccount: BankAccountInfo = {
          id: String(Date.now()),
          ...formData,
          created_at: new Date().toISOString().split('T')[0],
        };
        setAccounts((prev) => [...prev, newAccount]);
        addNotification({
          title: '成功',
          message: '银行账号创建成功',
          type: 'success',
        });
        setShowCreateModal(false);
      } catch (_err: unknown) {
        addNotification({
          title: '失败',
          message: extractErrorMessage(_err, '创建银行账号失败'),
          type: 'error',
        });
      }
    },
    [formData, addNotification]
  );

  /**
   * 更新账号
   */
  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingAccount) return;
      try {
        setAccounts((prev) =>
          prev.map((acc) => (acc.id === editingAccount.id ? { ...acc, ...formData } : acc))
        );
        addNotification({
          title: '成功',
          message: '银行账号更新成功',
          type: 'success',
        });
        setShowEditModal(false);
        setEditingAccount(null);
      } catch (_err: unknown) {
        addNotification({
          title: '失败',
          message: extractErrorMessage(_err, '更新银行账号失败'),
          type: 'error',
        });
      }
    },
    [editingAccount, formData, addNotification]
  );

  /**
   * 删除账号
   */
  const handleDelete = useCallback(
    (accountId: string) => {
      const account = accounts.find((a) => a.id === accountId);
      openConfirmDialog({
        title: '确认删除',
        message: `确定要删除银行账号"${account?.account_name || ''}"吗？`,
        danger: true,
        onConfirm: () => {
          try {
            setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
            addNotification({
              title: '成功',
              message: '银行账号删除成功',
              type: 'success',
            });
          } catch (_err: unknown) {
            addNotification({
              title: '失败',
              message: extractErrorMessage(_err, '删除银行账号失败'),
              type: 'error',
            });
          }
        },
      });
    },
    [accounts, addNotification, openConfirmDialog]
  );

  /**
   * 设为主账户
   */
  const handleSetPrimary = useCallback(
    (accountId: string) => {
      setAccounts((prev) =>
        prev.map((acc) => ({
          ...acc,
          is_primary: acc.id === accountId,
        }))
      );
      addNotification({
        title: '成功',
        message: '已设为主账户',
        type: 'success',
      });
    },
    [addNotification]
  );

  /**
   * 编辑账号
   */
  const handleEdit = useCallback((account: BankAccountInfo) => {
    setEditingAccount(account);
    setFormData({
      account_name: account.account_name,
      account_number: account.account_number,
      bank_name: account.bank_name,
      bank_branch: account.bank_branch || '',
      account_type: account.account_type,
      currency: account.currency,
      status: account.status,
      is_primary: account.is_primary,
      description: account.description || '',
      balance: account.balance,
    });
    setShowEditModal(true);
  }, []);

  /**
   * 新增账号
   */
  const handleAdd = useCallback(() => {
    setFormData({
      account_name: '',
      account_number: '',
      bank_name: '',
      bank_branch: '',
      account_type: 'checking',
      currency: 'CNY',
      status: 'active',
      is_primary: false,
      description: '',
      balance: 0,
    });
    setShowCreateModal(true);
  }, []);

  /**
   * 过滤后的数据
   */
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchesSearch =
        !searchQuery ||
        acc.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.account_number.includes(searchQuery) ||
        acc.bank_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === 'all' || acc.account_type === typeFilter;
      const matchesStatus = statusFilter === 'all' || acc.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [accounts, searchQuery, typeFilter, statusFilter]);

  // 统计数据
  const stats = useMemo(() => {
    const total = accounts.length;
    const activeCount = accounts.filter((a) => a.status === 'active').length;
    const totalBalance = accounts
      .filter((a) => a.currency === 'CNY')
      .reduce((sum, a) => sum + a.balance, 0);
    return [
      { id: 'total', title: '账号总数', value: total, icon: <CreditCard size={20} />, color: 'primary' as const },
      { id: 'active', title: '正常账号', value: activeCount, icon: <Building2 size={20} />, color: 'success' as const },
      { id: 'balance', title: '人民币余额', value: totalBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), icon: <CreditCard size={20} />, color: 'info' as const },
    ];
  }, [accounts]);

  // 表格列定义
  const columns: ColumnDef<BankAccountInfo>[] = useMemo(
    () => [
      {
        id: 'account_number',
        label: '账号',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                bgcolor: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreditCard size={18} color='primary.main' />
            </Box>
            <Box>
              <Typography variant='body2' sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                {row.account_number}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {row.account_name}
              </Typography>
            </Box>
            {row.is_primary && (
              <Chip
                size='small'
                icon={<Star size={12} />}
                label='主账户'
                color='warning'
                variant='filled'
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
        ),
      },
      {
        id: 'bank_name',
        label: '开户银行',
        render: (row) => (
          <Box>
            <Typography variant='body2'>{row.bank_name}</Typography>
            {row.bank_branch && (
              <Typography variant='caption' color='text.secondary'>
                {row.bank_branch}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        id: 'account_type',
        label: '账户类型',
        render: (row) => {
          const config = ACCOUNT_TYPE_CONFIG[row.account_type] || {
            label: row.account_type,
            color: 'default' as const,
          };
          return <Chip size='small' color={config.color} label={config.label} variant='outlined' />;
        },
      },
      {
        id: 'currency',
        label: '币种',
        render: (row) => (
          <Typography variant='body2' color='text.secondary'>
            {row.currency === 'CNY' ? '人民币 (CNY)' : row.currency}
          </Typography>
        ),
      },
      {
        id: 'balance',
        label: '余额',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}
          >
            {row.balance.toLocaleString('zh-CN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => {
          const config = STATUS_CONFIG[row.status] || {
            label: row.status,
            color: 'default' as const,
          };
          return <Chip size='small' color={config.color} label={config.label} />;
        },
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
            {!row.is_primary && (
              <Button
                size='small'
                variant='text'
                onClick={() => handleSetPrimary(row.id)}
                startIcon={<Star size={14} />}
              >
                设为主账户
              </Button>
            )}
            <Button size='small' onClick={() => handleEdit(row)} startIcon={<Edit size={14} />}>
              编辑
            </Button>
            <Button
              size='small'
              color='error'
              onClick={() => handleDelete(row.id)}
              startIcon={<Trash2 size={14} />}
            >
              删除
            </Button>
          </Box>
        ),
      },
    ],
    [handleEdit, handleDelete, handleSetPrimary]
  );

  // 筛选器
  const filters = useMemo(
    () => [
      {
        id: 'type',
        label: '账户类型',
        type: 'select' as const,
        options: [
          { label: '全部类型', value: 'all' },
          ...Object.entries(ACCOUNT_TYPE_CONFIG).map(([value, config]) => ({
            label: config.label,
            value,
          })),
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { label: '全部状态', value: 'all' },
          ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({
            label: config.label,
            value,
          })),
        ],
      },
    ],
    []
  );

  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    if (typeof filters.type === 'string') {
      setTypeFilter(filters.type);
    }
    if (typeof filters.status === 'string') {
      setStatusFilter(filters.status);
    }
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return (
    <PageContainer
      headerProps={{
        pageIcon: <CreditCard size={20} />,
        backButton: {
          href: '/iam/dashboard',
        },
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredAccounts}
        loading={loading}
        searchable
        searchPlaceholder='搜索账户名称、账号、开户银行...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        filtersValue={{
          type: typeFilter,
          status: statusFilter,
        }}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total: filteredAccounts.length,
          onPageChange: handlePageChange,
        }}
        actions={[
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: loadData,
            variant: 'outlined',
          },
          {
            label: '新增账号',
            icon: <Plus size={16} />,
            onClick: handleAdd,
            variant: 'contained',
          },
        ]}
        onRefresh={loadData}
        emptyMessage='暂无银行账号'
      />

      {/* 创建账号对话框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新增银行账号</DialogTitle>
        <Box component='form' onSubmit={handleCreate}>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label='账户名称 *'
                required
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                size='small'
                placeholder='如：基本户、一般户'
              />
              <TextField
                fullWidth
                label='账号 *'
                required
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                size='small'
              />
              <TextField
                fullWidth
                label='开户银行 *'
                required
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                size='small'
              />
              <TextField
                fullWidth
                label='开户支行'
                value={formData.bank_branch}
                onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                size='small'
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl size='small' fullWidth>
                  <InputLabel>账户类型</InputLabel>
                  <Select
                    value={formData.account_type}
                    label='账户类型'
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  >
                    {Object.entries(ACCOUNT_TYPE_CONFIG).map(([value, config]) => (
                      <MenuItem key={value} value={value}>
                        {config.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label='币种'
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  size='small'
                />
              </Box>
              <TextField
                fullWidth
                label='初始余额'
                type='number'
                value={formData.balance}
                onChange={(e) =>
                  setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })
                }
                size='small'
              />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant='body2'>设为主账户</Typography>
                <Switch
                  checked={formData.is_primary}
                  onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                />
              </Box>
              <TextField
                fullWidth
                label='备注'
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                size='small'
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant='outlined' onClick={() => setShowCreateModal(false)}>
              取消
            </Button>
            <Button type='submit' variant='contained'>
              创建
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* 编辑账号对话框 */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑银行账号</DialogTitle>
        <Box component='form' onSubmit={handleUpdate}>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label='账户名称 *'
                required
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                size='small'
              />
              <TextField
                fullWidth
                label='账号 *'
                required
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                size='small'
              />
              <TextField
                fullWidth
                label='开户银行 *'
                required
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                size='small'
              />
              <TextField
                fullWidth
                label='开户支行'
                value={formData.bank_branch}
                onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                size='small'
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl size='small' fullWidth>
                  <InputLabel>账户类型</InputLabel>
                  <Select
                    value={formData.account_type}
                    label='账户类型'
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  >
                    {Object.entries(ACCOUNT_TYPE_CONFIG).map(([value, config]) => (
                      <MenuItem key={value} value={value}>
                        {config.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label='币种'
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  size='small'
                />
              </Box>
              <TextField
                fullWidth
                label='余额'
                type='number'
                value={formData.balance}
                onChange={(e) =>
                  setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })
                }
                size='small'
              />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant='body2'>设为主账户</Typography>
                <Switch
                  checked={formData.is_primary}
                  onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant='body2'>状态</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant='body2' color='text.secondary'>
                    {STATUS_CONFIG[formData.status]?.label || formData.status}
                  </Typography>
                  <Switch
                    checked={formData.status === 'active'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.checked ? 'active' : 'frozen',
                      })
                    }
                  />
                </Box>
              </Box>
              <TextField
                fullWidth
                label='备注'
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                size='small'
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant='outlined' onClick={() => { setShowEditModal(false); setEditingAccount(null); }}>
              取消
            </Button>
            <Button type='submit' variant='contained'>
              保存
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogOpen(false);
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default IamBankAccountsPage;
