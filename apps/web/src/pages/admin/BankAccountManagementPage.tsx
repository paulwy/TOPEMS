/**
 * 银行账户管理页面
 * 管理企业银行账户信息
 */

import React, { useState, useMemo } from 'react';
import { apiLogger } from '@/utils/logger';
import { Plus, Edit, Trash2, Search, Building2, CreditCard } from 'lucide-react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Drawer,
  Alert,
  AlertTitle,
  Stack,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import { ListPageTemplate } from '@/components/mui';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/mui';

/** 账户类型配置 */
const ACCOUNT_TYPE_CONFIG: Record<
  string,
  { label: string; color: 'primary' | 'success' | 'secondary' | 'warning' }
> = {
  checking: { label: '基本户', color: 'primary' },
  savings: { label: '一般户', color: 'success' },
  dedicated: { label: '专用户', color: 'secondary' },
  foreign: { label: '外币户', color: 'warning' },
};

/** 账户状态配置 */
const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'error' | 'default' }> = {
  active: { label: '正常', color: 'success' },
  frozen: { label: '冻结', color: 'error' },
  closed: { label: '销户', color: 'default' },
};

interface BankAccount {
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

interface BankAccountFormData {
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_branch?: string;
  account_type: string;
  currency: string;
  status: string;
  is_primary: boolean;
  description?: string;
}

// 模拟数据
const mockBankAccounts: BankAccount[] = [
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
    created_at: '2024-01-15',
  },
];

export default function BankAccountManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bankAccounts] = useState<BankAccount[]>(mockBankAccounts);

  // 过滤后的数据
  const filteredAccounts = bankAccounts.filter((account) => {
    const matchesSearch =
      !searchQuery ||
      account.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.account_number.includes(searchQuery) ||
      account.bank_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || account.account_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || account.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // 表格列定义
  const columns: ColumnDef<BankAccount>[] = useMemo(
    () => [
      {
        id: 'account_number',
        label: '账号',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CreditCard
              size={16}
              color='#9e9e9e'
            />
            <Typography
              variant='body2'
              sx={{ fontFamily: 'monospace' }}
            >
              {row.account_number}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'account_name',
        label: '账户名称',
        render: (row) => row.account_name,
      },
      {
        id: 'bank_name',
        label: '开户银行',
        render: (row) => row.bank_name,
      },
      {
        id: 'account_type',
        label: '账户类型',
        render: (row) => {
          const config = ACCOUNT_TYPE_CONFIG[row.account_type] || {
            label: row.account_type,
            color: 'default' as const,
          };
          return (
            <Chip
              size='small'
              color={config.color}
              label={config.label}
            />
          );
        },
      },
      {
        id: 'currency',
        label: '币种',
        render: (row) => (row.currency === 'CNY' ? '人民币' : row.currency),
      },
      {
        id: 'balance',
        label: '余额',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontFamily: 'monospace', textAlign: 'right' }}
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
          return (
            <Chip
              size='small'
              color={config.color}
              label={config.label}
            />
          );
        },
      },
      {
        id: 'is_primary',
        label: '主账户',
        render: (row) =>
          row.is_primary ? (
            <Chip
              size='small'
              color='warning'
              label='主账户'
            />
          ) : (
            <Typography
              variant='body2'
              color='text.disabled'
            >
              -
            </Typography>
          ),
      },
    ],

    []
  );

  // 行操作
  const rowActions: RowAction<BankAccount>[] = useMemo(
    () => [
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row) => {
          setSelectedAccount(row);
          setIsEditing(true);
        },
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => setDeletingId(row.id),
        confirm: true,
        confirmMessage: '确定要删除该银行账户吗？此操作不可恢复。',
      },
    ],

    []
  );

  // 筛选配置
  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'type',
        label: '账户类型',
        options: [
          { value: 'all', label: '全部类型' },
          { value: 'checking', label: '基本户' },
          { value: 'savings', label: '一般户' },
          { value: 'dedicated', label: '专用户' },
          { value: 'foreign', label: '外币户' },
        ],
      },
      {
        id: 'status',
        label: '账户状态',
        options: [
          { value: 'all', label: '全部状态' },
          { value: 'active', label: '正常' },
          { value: 'frozen', label: '冻结' },
          { value: 'closed', label: '销户' },
        ],
      },
    ],
    []
  );

  // 处理筛选变化
  const handleFilterChange = (filters: Record<string, any>) => {
    if (filters.type !== undefined) {
      setTypeFilter(filters.type);
    }
    if (filters.status !== undefined) {
      setStatusFilter(filters.status);
    }
  };

  // 处理创建
  const handleCreate = (data: BankAccountFormData) => {
    apiLogger.info('创建银行账户:', data);
    setIsCreating(false);
  };

  // 处理更新
  const handleUpdate = (data: BankAccountFormData) => {
    if (!selectedAccount) return;
    apiLogger.info('更新银行账户:', selectedAccount.id, data);
    setIsEditing(false);
    setSelectedAccount(null);
  };

  // 处理删除
  const handleDelete = () => {
    if (!deletingId) return;
    apiLogger.info('删除银行账户:', deletingId);
    setDeletingId(null);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', p: 3 }}>
      <Box
        sx={{
          maxWidth: 1400,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {/* 统计卡片 */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          <Card>
            <CardContent>
              <Typography
                variant='h4'
                sx={{ fontWeight: 'bold', color: 'primary.main' }}
              >
                {bankAccounts.length}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                账户总数
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography
                variant='h4'
                sx={{ fontWeight: 'bold', color: 'success.main' }}
              >
                {bankAccounts.filter((a) => a.status === 'active').length}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                正常账户
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography
                variant='h4'
                sx={{ fontWeight: 'bold', color: 'secondary.main' }}
              >
                {bankAccounts.filter((a) => a.currency !== 'CNY').length}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                外币账户
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography
                variant='h4'
                sx={{ fontWeight: 'bold', color: 'warning.main' }}
              >
                {bankAccounts
                  .reduce((sum, a) => sum + a.balance, 0)
                  .toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                账户总余额
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* 账户列表 */}
        <ListPageTemplate
          title='银行账户管理'
          subtitle='管理企业银行账户信息'
          data={filteredAccounts}
          columns={columns}
          rowActions={rowActions}
          searchPlaceholder='搜索账户名称、账号或银行...'
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          filters={filters}
          filtersValue={{ type: typeFilter, status: statusFilter }}
          onFilterChange={handleFilterChange}
          actions={[
            {
              label: '新增账户',
              icon: <Plus size={16} />,
              onClick: () => {
                setSelectedAccount(null);
                setIsCreating(true);
              },
            },
          ]}
          emptyIcon={
            <CreditCard
              size={48}
              color='#9e9e9e'
            />
          }
          emptyMessage='暂无银行账户'
        />
      </Box>

      {/* 创建/编辑侧边栏 */}
      <Drawer
        anchor='right'
        open={isCreating || isEditing}
        onClose={() => {
          setIsCreating(false);
          setIsEditing(false);
          setSelectedAccount(null);
        }}
        slotProps={{ paper: { sx: { width: 500, maxWidth: '100%' } } }}
      >
        <Box sx={{ p: 3 }}>
          <Typography
            variant='h6'
            gutterBottom
          >
            {isCreating ? '新增银行账户' : '编辑银行账户'}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            gutterBottom
          >
            {isCreating ? '创建新的银行账户' : `编辑账户: ${selectedAccount?.account_number}`}
          </Typography>
          <BankAccountForm
            account={selectedAccount}
            onSubmit={isCreating ? handleCreate : handleUpdate}
            onCancel={() => {
              setIsCreating(false);
              setIsEditing(false);
              setSelectedAccount(null);
            }}
          />
        </Box>
      </Drawer>

      {/* 删除确认对话框 */}
      {deletingId && (
        <Alert
          severity='warning'
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            maxWidth: 400,
            zIndex: 1300,
          }}
          action={
            <Stack
              direction='row'
              spacing={1}
            >
              <Button
                size='small'
                variant='outlined'
                onClick={() => setDeletingId(null)}
              >
                取消
              </Button>
              <Button
                size='small'
                variant='contained'
                color='error'
                onClick={handleDelete}
              >
                删除
              </Button>
            </Stack>
          }
        >
          <AlertTitle>确认删除</AlertTitle>
          确定要删除该银行账户吗？此操作不可恢复。
        </Alert>
      )}
    </Box>
  );
}

/** 银行账户表单组件 */
interface BankAccountFormProps {
  account: BankAccount | null;
  onSubmit: (data: BankAccountFormData) => void;
  onCancel: () => void;
}

function BankAccountForm({ account, onSubmit, onCancel }: BankAccountFormProps) {
  const [formData, setFormData] = useState<BankAccountFormData>({
    account_name: account?.account_name || '',
    account_number: account?.account_number || '',
    bank_name: account?.bank_name || '',
    bank_branch: account?.bank_branch || '',
    account_type: account?.account_type || 'checking',
    currency: account?.currency || 'CNY',
    status: account?.status || 'active',
    is_primary: account?.is_primary || false,
    description: account?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        marginTop: 24,
      }}
    >
      <TextField
        size='small'
        label='账户名称 *'
        required
        value={formData.account_name}
        onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
        placeholder='例如：基本户'
        fullWidth
      />

      <TextField
        size='small'
        label='银行账号 *'
        required
        value={formData.account_number}
        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
        placeholder='请输入银行账号'
        fullWidth
      />

      <TextField
        size='small'
        label='开户银行 *'
        required
        value={formData.bank_name}
        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
        placeholder='例如：中国工商银行'
        fullWidth
      />

      <TextField
        size='small'
        label='支行名称'
        value={formData.bank_branch || ''}
        onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
        placeholder='例如：北京分行中关村支行'
        fullWidth
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        <FormControl
          size='small'
          fullWidth
        >
          <InputLabel>账户类型 *</InputLabel>
          <Select
            value={formData.account_type}
            label='账户类型 *'
            onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
          >
            <MenuItem value='checking'>基本户</MenuItem>
            <MenuItem value='savings'>一般户</MenuItem>
            <MenuItem value='dedicated'>专用户</MenuItem>
            <MenuItem value='foreign'>外币户</MenuItem>
          </Select>
        </FormControl>

        <FormControl
          size='small'
          fullWidth
        >
          <InputLabel>币种 *</InputLabel>
          <Select
            value={formData.currency}
            label='币种 *'
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
          >
            <MenuItem value='CNY'>人民币 (CNY)</MenuItem>
            <MenuItem value='USD'>美元 (USD)</MenuItem>
            <MenuItem value='EUR'>欧元 (EUR)</MenuItem>
            <MenuItem value='GBP'>英镑 (GBP)</MenuItem>
            <MenuItem value='JPY'>日元 (JPY)</MenuItem>
            <MenuItem value='HKD'>港币 (HKD)</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TextField
        size='small'
        label='描述'
        value={formData.description || ''}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder='可选描述信息'
        fullWidth
      />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
          pt: 2,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Button
          variant='outlined'
          onClick={onCancel}
        >
          取消
        </Button>
        <Button
          variant='contained'
          type='submit'
        >
          保存
        </Button>
      </Box>
    </form>
  );
}
