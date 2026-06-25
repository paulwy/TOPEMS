import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { ListPageTemplate, ColumnDef, RowAction } from '@/components/templates/ListPageTemplate';
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
  useAccountBalances,
} from '@/hooks/useFinance';
import type { Account, BalanceDirection } from '@/types/finance';
import { useAppStore } from '@/store';
import { logger } from '@/utils/logger';

const ACCOUNT_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    color: 'primary' | 'error' | 'success' | 'info' | 'warning' | 'default';
  }
> = {
  asset: { label: '资产', color: 'primary' },
  liability: { label: '负债', color: 'error' },
  equity: { label: '权益', color: 'success' },
  revenue: { label: '收入', color: 'info' },
  expense: { label: '费用', color: 'warning' },
  cost: { label: '成本', color: 'default' },
};

const BALANCE_DIRECTION_CONFIG: Record<string, { label: string; color: 'primary' | 'error' }> = {
  debit: { label: '借', color: 'primary' },
  credit: { label: '贷', color: 'error' },
};

interface AccountFormData {
  code: string;
  name: string;
  type: string;
  balance_direction: BalanceDirection;
  parent_id?: string;
  is_detail: boolean;
  is_active: boolean;
  description?: string;
}

export default function AccountManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDetailFilter, setIsDetailFilter] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const addNotification = useAppStore((state) => state.addNotification);

  const {
    data: accountsData,
    isLoading,
    refetch,
  } = useAccounts({
    type: typeFilter !== 'all' ? typeFilter : undefined,
    is_detail:
      isDetailFilter === 'detail' ? true : isDetailFilter === 'summary' ? false : undefined,
  });

  const { data: balancesData } = useAccountBalances({
    company_id: 'default',
    period: new Date().toISOString().slice(0, 7),
  });

  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const filteredAccounts = useMemo(() => {
    if (!accountsData?.data?.items) return [];
    const accounts = accountsData.data.items;

    if (!searchQuery) return accounts;

    return accounts.filter(
      (acc: Account) =>
        acc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [accountsData, searchQuery]);

  const getBalance = (accountId: string) => {
    if (!balancesData?.data) return null;
    return balancesData.data.find((b: { account_id: string }) => b.account_id === accountId);
  };

  const handleCreate = async (data: AccountFormData) => {
    try {
      await createAccount.mutateAsync(data as any);
      setIsCreating(false);
      addNotification({
        title: '创建成功',
        message: '科目创建成功',
        type: 'success',
      });
      refetch();
    } catch (error: unknown) {
      logger.error('创建科目失败:', error);
      addNotification({
        title: '创建失败',
        message: '创建科目失败',
        type: 'error',
      });
    }
  };

  const handleUpdate = async (data: AccountFormData) => {
    if (!selectedAccount) return;
    try {
      await updateAccount.mutateAsync({ id: selectedAccount.id, data });
      setIsEditing(false);
      setSelectedAccount(null);
      addNotification({
        title: '更新成功',
        message: '科目更新成功',
        type: 'success',
      });
      refetch();
    } catch (error: unknown) {
      logger.error('更新科目失败:', error);
      addNotification({
        title: '更新失败',
        message: '更新科目失败',
        type: 'error',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteAccount.mutateAsync(deletingId);
      setDeletingId(null);
      addNotification({
        title: '删除成功',
        message: '科目删除成功',
        type: 'success',
      });
      refetch();
    } catch (error: unknown) {
      logger.error('删除科目失败:', error);
      addNotification({
        title: '删除失败',
        message: '删除科目失败',
        type: 'error',
      });
    }
  };

  const columns: ColumnDef<Account>[] = [
    {
      id: 'code',
      label: '科目编码',
      sortable: true,
      render: (row) => (
        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{row.code}</Typography>
      ),
    },
    {
      id: 'name',
      label: '科目名称',
      sortable: true,
      render: (row) => (
        <Typography sx={{ fontWeight: row.is_detail ? 400 : 500 }}>{row.name}</Typography>
      ),
    },
    {
      id: 'type',
      label: '科目类型',
      render: (row) => {
        const config = ACCOUNT_TYPE_CONFIG[row.type as keyof typeof ACCOUNT_TYPE_CONFIG] || {
          label: row.type,
          color: 'default' as const,
        };
        return <Chip size='small' color={config.color} label={config.label} />;
      },
    },
    {
      id: 'balance_direction',
      label: '余额方向',
      render: (row) => {
        const config = BALANCE_DIRECTION_CONFIG[row.balance_direction as keyof typeof BALANCE_DIRECTION_CONFIG] || {
          label: row.balance_direction,
          color: 'default' as const,
        };
        return <Chip size='small' color={config.color} label={config.label} />;
      },
    },
    {
      id: 'is_detail',
      label: '明细',
      render: (row) => (
        <Chip
          size='small'
          variant={row.is_detail ? 'filled' : 'outlined'}
          label={row.is_detail ? '明细科目' : '总账科目'}
        />
      ),
    },
    {
      id: 'is_active',
      label: '状态',
      render: (row) => (
        <Chip
          size='small'
          variant={row.is_active ? 'filled' : 'outlined'}
          color={row.is_active ? 'success' : 'default'}
          label={row.is_active ? '启用' : '停用'}
        />
      ),
    },
    {
      id: 'balance',
      label: '余额',
      align: 'right',
      render: (row) => {
        const balance = getBalance(row.id);
        if (!balance) return '-';
        const amount = balance.debit_balance || balance.credit_balance || 0;
        return (
          <Typography
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              color: amount >= 0 ? 'green' : 'red',
            }}
          >
            {amount.toLocaleString('zh-CN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Typography>
        );
      },
    },
  ];

  const rowActions: RowAction<Account>[] = [
    {
      label: '编辑',
      icon: <Edit sx={{ width: 16, height: 16 }} />,
      onClick: (row) => {
        setSelectedAccount(row);
        setIsEditing(true);
      },
      color: 'primary',
    },
    {
      label: '删除',
      icon: <Trash2 sx={{ width: 16, height: 16 }} />,
      onClick: (row) => setDeletingId(row.id),
      color: 'error',
    },
  ];

  const stats = useMemo(() => {
    const accounts = accountsData?.data?.items || [];
    return {
      total: accounts.length,
      detail: accounts.filter((a: Account) => a.is_detail).length,
      summary: accounts.filter((a: Account) => !a.is_detail).length,
      inactive: accounts.filter((a: Account) => !a.is_active).length,
    };
  }, [accountsData]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* 统计卡片 */}
      <Box sx={{ p: 3, maxWidth: 1280, mx: 'auto' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 3 }}>
            <Typography variant='h4' sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {stats.total}
            </Typography>
            <Typography variant='body2' color='text.secondary'>科目总数</Typography>
          </Box>
          <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 3 }}>
            <Typography variant='h4' sx={{ fontWeight: 'bold', color: 'success.main' }}>
              {stats.detail}
            </Typography>
            <Typography variant='body2' color='text.secondary'>明细科目</Typography>
          </Box>
          <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 3 }}>
            <Typography variant='h4' sx={{ fontWeight: 'bold', color: 'info.main' }}>
              {stats.summary}
            </Typography>
            <Typography variant='body2' color='text.secondary'>总账科目</Typography>
          </Box>
          <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 3 }}>
            <Typography variant='h4' sx={{ fontWeight: 'bold', color: 'warning.main' }}>
              {stats.inactive}
            </Typography>
            <Typography variant='body2' color='text.secondary'>已停用</Typography>
          </Box>
        </Box>
      </Box>

      <ListPageTemplate
        title='会计科目管理'
        subtitle='管理企业会计科目体系，支持多级科目结构'
        columns={columns}
        data={filteredAccounts}
        loading={isLoading}
        searchable
        searchPlaceholder='搜索科目编码或名称...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={[
          {
            id: 'type',
            label: '科目类型',
            type: 'select',
            value: typeFilter,
            options: [
              { label: '全部类型', value: 'all' },
              { label: '资产', value: 'asset' },
              { label: '负债', value: 'liability' },
              { label: '权益', value: 'equity' },
              { label: '收入', value: 'revenue' },
              { label: '费用', value: 'expense' },
              { label: '成本', value: 'cost' },
            ],
            onChange: (value) => setTypeFilter(value as string),
          },
          {
            id: 'is_detail',
            label: '明细类型',
            type: 'select',
            value: isDetailFilter,
            options: [
              { label: '全部', value: 'all' },
              { label: '明细科目', value: 'detail' },
              { label: '总账科目', value: 'summary' },
            ],
            onChange: (value) => setIsDetailFilter(value as string),
          },
        ]}
        actions={[
          {
            label: '刷新',
            icon: <RefreshCw sx={{ width: 16, height: 16 }} />,
            onClick: refetch,
            variant: 'outlined',
          },
          {
            label: '新增科目',
            icon: <Plus sx={{ width: 16, height: 16 }} />,
            onClick: () => {
              setSelectedAccount(null);
              setIsCreating(true);
            },
          },
        ]}
        rowActions={rowActions}
        onRefresh={refetch}
        showRowNumber
      />

      <Dialog
        open={isCreating || isEditing}
        onClose={() => {
          setIsCreating(false);
          setIsEditing(false);
          setSelectedAccount(null);
        }}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{isCreating ? '新增科目' : '编辑科目'}</DialogTitle>
        <DialogContent>
          <AccountForm
            account={selectedAccount}
            accounts={accountsData?.data?.items || []}
            onSubmit={isCreating ? handleCreate : handleUpdate}
            onCancel={() => {
              setIsCreating(false);
              setIsEditing(false);
              setSelectedAccount(null);
            }}
            isLoading={createAccount.isPending || updateAccount.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>确定要删除该科目吗？此操作不可恢复。</Typography>
          {accountsData?.data?.items?.some((a: Account) => a.parent_id === deletingId) && (
            <Typography color='warning.main' sx={{ mt: 2 }}>
              警告：该科目存在下级科目，删除后将同时删除所有下级科目。
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingId(null)}>取消</Button>
          <Button color='error' onClick={handleDelete} variant='contained'>
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

interface AccountFormProps {
  account: Account | null;
  accounts: Account[];
  onSubmit: (data: AccountFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function AccountForm({ account, accounts, onSubmit, onCancel, isLoading }: AccountFormProps) {
  const [formData, setFormData] = useState<AccountFormData>({
    code: account?.code || '',
    name: account?.name || '',
    type: account?.type || 'asset',
    balance_direction: account?.balance_direction || 'debit',
    parent_id: account?.parent_id,
    is_detail: account?.is_detail ?? true,
    is_active: account?.is_active ?? true,
    description: account?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Box
      component='form'
      onSubmit={handleSubmit}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}
    >
      <TextField
        label='科目编码 *'
        value={formData.code}
        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
        placeholder='例如: 1001'
        required
        size='small'
      />

      <TextField
        label='科目名称 *'
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder='例如: 库存现金'
        required
        size='small'
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <FormControl size='small' fullWidth>
          <InputLabel>科目类型 *</InputLabel>
          <Select
            value={formData.type}
            label='科目类型 *'
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <MenuItem value='asset'>资产</MenuItem>
            <MenuItem value='liability'>负债</MenuItem>
            <MenuItem value='equity'>权益</MenuItem>
            <MenuItem value='revenue'>收入</MenuItem>
            <MenuItem value='expense'>费用</MenuItem>
            <MenuItem value='cost'>成本</MenuItem>
          </Select>
        </FormControl>

        <FormControl size='small' fullWidth>
          <InputLabel>余额方向 *</InputLabel>
          <Select
            value={formData.balance_direction}
            label='余额方向 *'
            onChange={(e) =>
              setFormData({
                ...formData,
                balance_direction: e.target.value as BalanceDirection,
              })
            }
          >
            <MenuItem value='debit'>借</MenuItem>
            <MenuItem value='credit'>贷</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <FormControl size='small' fullWidth>
        <InputLabel>上级科目</InputLabel>
        <Select
          value={formData.parent_id || ''}
          label='上级科目'
          onChange={(e) =>
            setFormData({
              ...formData,
              parent_id: e.target.value || undefined,
            })
          }
        >
          <MenuItem value=''>无（顶级科目）</MenuItem>
          {accounts
            .filter((a) => !a.is_detail && a.id !== account?.id)
            .map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.code} - {a.name}
              </MenuItem>
            ))}
        </Select>
      </FormControl>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <FormControl size='small' fullWidth>
          <InputLabel>明细标志</InputLabel>
          <Select
            value={formData.is_detail ? 'detail' : 'summary'}
            label='明细标志'
            onChange={(e) =>
              setFormData({
                ...formData,
                is_detail: e.target.value === 'detail',
              })
            }
          >
            <MenuItem value='detail'>明细科目</MenuItem>
            <MenuItem value='summary'>总账科目</MenuItem>
          </Select>
        </FormControl>

        <FormControl size='small' fullWidth>
          <InputLabel>状态</InputLabel>
          <Select
            value={formData.is_active ? 'active' : 'inactive'}
            label='状态'
            onChange={(e) =>
              setFormData({
                ...formData,
                is_active: e.target.value === 'active',
              })
            }
          >
            <MenuItem value='active'>启用</MenuItem>
            <MenuItem value='inactive'>停用</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TextField
        label='描述'
        value={formData.description || ''}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder='可选描述信息'
        size='small'
        multiline
        rows={2}
      />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1,
          pt: 2,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Button type='button' variant='outlined' onClick={onCancel}>
          取消
        </Button>
        <Button type='submit' variant='contained' disabled={isLoading}>
          {isLoading ? '保存中...' : '保存'}
        </Button>
      </Box>
    </Box>
  );
}