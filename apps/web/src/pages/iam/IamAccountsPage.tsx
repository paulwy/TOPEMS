/**
 * IAM 账号管理页面 - V4.0 标准化改造
 *
 * 改造要点：
 * 1. 使用 ListPageTemplate 统一列表页布局
 * 2. PageContainer autoTitle + autoBreadcrumbs
 * 3. 使用 ConfirmDialog 替代原生 confirm()
 * 4. 支持搜索、筛选、分页
 *
 * @module pages/iam
 * @path /iam/accounts
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
import { UserCircle, Plus, Edit, Trash2, RefreshCw, Building2 } from 'lucide-react';

import { useAppStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';

/**
 * 账号类型配置
 */
const ACCOUNT_TYPE_CONFIG: Record<
  string,
  { label: string; color: 'primary' | 'error' | 'success' | 'info' | 'warning' | 'default' }
> = {
  admin: { label: '管理员', color: 'primary' },
  normal: { label: '普通用户', color: 'info' },
  service: { label: '服务账号', color: 'warning' },
  system: { label: '系统账号', color: 'default' },
};

/**
 * 账号状态配置
 */
const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'error' | 'default' }> = {
  active: { label: '正常', color: 'success' },
  disabled: { label: '禁用', color: 'error' },
  locked: { label: '锁定', color: 'default' },
};

/**
 * 模拟账号数据类型
 */
interface AdminAccount {
  id: string;
  username: string;
  account_type: string;
  email: string;
  phone: string;
  department: string;
  status: string;
  last_login_at?: string;
  created_at: string;
}

// 模拟数据
const mockAccounts: AdminAccount[] = [
  {
    id: '1',
    username: 'admin',
    account_type: 'admin',
    email: 'admin@example.com',
    phone: '13800138000',
    department: '技术部',
    status: 'active',
    last_login_at: '2024-01-15 10:30:00',
    created_at: '2024-01-01',
  },
  {
    id: '2',
    username: 'service_user',
    account_type: 'service',
    email: 'service@example.com',
    phone: '13800138001',
    department: '运维部',
    status: 'active',
    last_login_at: '2024-01-14 09:00:00',
    created_at: '2024-01-02',
  },
  {
    id: '3',
    username: 'finance_user',
    account_type: 'normal',
    email: 'finance@example.com',
    phone: '13800138002',
    department: '财务部',
    status: 'active',
    last_login_at: '2024-01-13 14:20:00',
    created_at: '2024-01-03',
  },
];

export const IamAccountsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [accounts, setAccounts] = useState<AdminAccount[]>(mockAccounts);
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
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);

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
    username: '',
    account_type: 'normal',
    email: '',
    phone: '',
    department: '',
    status: 'active',
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
      // 模拟加载
      await new Promise((resolve) => setTimeout(resolve, 300));
      setAccounts(mockAccounts);
    } catch (_err: unknown) {
      addNotification({
        title: '加载失败',
        message: extractErrorMessage(_err, '加载账号列表失败'),
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
        // 模拟创建
        const newAccount: AdminAccount = {
          id: String(Date.now()),
          ...formData,
          created_at: new Date().toISOString(),
        };
        setAccounts((prev) => [...prev, newAccount]);
        addNotification({
          title: '成功',
          message: '账号创建成功',
          type: 'success',
        });
        setShowCreateModal(false);
        setFormData({
          username: '',
          account_type: 'normal',
          email: '',
          phone: '',
          department: '',
          status: 'active',
        });
      } catch (_err: unknown) {
        addNotification({
          title: '失败',
          message: extractErrorMessage(_err, '创建账号失败'),
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
          message: '账号更新成功',
          type: 'success',
        });
        setShowEditModal(false);
        setEditingAccount(null);
      } catch (_err: unknown) {
        addNotification({
          title: '失败',
          message: extractErrorMessage(_err, '更新账号失败'),
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
        message: `确定要删除账号"${account?.username || ''}"吗？`,
        danger: true,
        onConfirm: () => {
          try {
            setAccounts((prev) => prev.filter((acc) => acc.id !== accountId));
            addNotification({
              title: '成功',
              message: '账号删除成功',
              type: 'success',
            });
          } catch (_err: unknown) {
            addNotification({
              title: '失败',
              message: extractErrorMessage(_err, '删除账号失败'),
              type: 'error',
            });
          }
        },
      });
    },
    [accounts, addNotification, openConfirmDialog]
  );

  /**
   * 切换账号状态
   */
  const handleToggleStatus = useCallback(
    (account: AdminAccount) => {
      const newStatus = account.status === 'active' ? 'disabled' : 'active';
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === account.id ? { ...acc, status: newStatus } : acc))
      );
      addNotification({
        title: '成功',
        message: `账号已${newStatus === 'active' ? '启用' : '禁用'}`,
        type: 'success',
      });
    },
    [addNotification]
  );

  /**
   * 编辑账号
   */
  const handleEdit = useCallback((account: AdminAccount) => {
    setEditingAccount(account);
    setFormData({
      username: account.username,
      account_type: account.account_type,
      email: account.email,
      phone: account.phone,
      department: account.department,
      status: account.status,
    });
    setShowEditModal(true);
  }, []);

  /**
   * 新增账号
   */
  const handleAdd = useCallback(() => {
    setFormData({
      username: '',
      account_type: 'normal',
      email: '',
      phone: '',
      department: '',
      status: 'active',
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
        acc.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.phone.includes(searchQuery);

      const matchesType = typeFilter === 'all' || acc.account_type === typeFilter;
      const matchesStatus = statusFilter === 'all' || acc.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [accounts, searchQuery, typeFilter, statusFilter]);

  // 统计数据
  const stats = useMemo(() => {
    const total = accounts.length;
    const activeCount = accounts.filter((a) => a.status === 'active').length;
    const adminCount = accounts.filter((a) => a.account_type === 'admin').length;
    return [
      {
        id: 'total',
        title: '账号总数',
        value: total,
        icon: <UserCircle size={20} />,
        color: 'primary' as const,
      },
      {
        id: 'active',
        title: '正常账号',
        value: activeCount,
        icon: <Building2 size={20} />,
        color: 'success' as const,
      },
      {
        id: 'admin',
        title: '管理员',
        value: adminCount,
        icon: <UserCircle size={20} />,
        color: 'warning' as const,
      },
    ];
  }, [accounts]);

  // 表格列定义
  const columns: ColumnDef<AdminAccount>[] = useMemo(
    () => [
      {
        id: 'username',
        label: '账号',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCircle
                size={20}
                color='primary.main'
              />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {row.username}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {row.department}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: 'account_type',
        label: '账号类型',
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
              variant='outlined'
            />
          );
        },
      },
      {
        id: 'email',
        label: '邮箱',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.email}
          </Typography>
        ),
      },
      {
        id: 'phone',
        label: '手机号',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.phone}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Switch
                checked={row.status === 'active'}
                onChange={() => handleToggleStatus(row)}
                size='small'
              />
              <Typography
                variant='caption'
                sx={{
                  fontWeight: 500,
                  color: row.status === 'active' ? 'success.main' : 'text.disabled',
                }}
              >
                {config.label}
              </Typography>
            </Box>
          );
        },
      },
      {
        id: 'last_login',
        label: '最后登录',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.last_login_at || '-'}
          </Typography>
        ),
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
            <Button
              size='small'
              onClick={() => handleEdit(row)}
              startIcon={<Edit size={14} />}
            >
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
    [handleToggleStatus, handleEdit, handleDelete]
  );

  // 筛选器
  const filters = useMemo(
    () => [
      {
        id: 'type',
        label: '账号类型',
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
        pageIcon: <UserCircle size={20} />,
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
        searchPlaceholder='搜索账号、邮箱、手机号...'
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
        emptyMessage='暂无账号'
      />

      {/* 创建账号对话框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新增账号</DialogTitle>
        <Box
          component='form'
          onSubmit={handleCreate}
        >
          <DialogContent>
            <Stack
              spacing={2}
              sx={{ pt: 1 }}
            >
              <TextField
                fullWidth
                label='账号名 *'
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                size='small'
              />
              <FormControl
                size='small'
                fullWidth
              >
                <InputLabel>账号类型</InputLabel>
                <Select
                  value={formData.account_type}
                  label='账号类型'
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                >
                  {Object.entries(ACCOUNT_TYPE_CONFIG).map(([value, config]) => (
                    <MenuItem
                      key={value}
                      value={value}
                    >
                      {config.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label='邮箱'
                type='email'
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                size='small'
              />
              <TextField
                fullWidth
                label='手机号'
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                size='small'
              />
              <TextField
                fullWidth
                label='所属部门'
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                size='small'
              />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant='body2'>状态</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {formData.status === 'active' ? '启用' : '禁用'}
                  </Typography>
                  <Switch
                    checked={formData.status === 'active'}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.checked ? 'active' : 'disabled' })
                    }
                  />
                </Box>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => setShowCreateModal(false)}
            >
              取消
            </Button>
            <Button
              type='submit'
              variant='contained'
            >
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
        <DialogTitle>编辑账号</DialogTitle>
        <Box
          component='form'
          onSubmit={handleUpdate}
        >
          <DialogContent>
            <Stack
              spacing={2}
              sx={{ pt: 1 }}
            >
              <TextField
                fullWidth
                label='账号名 *'
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                size='small'
              />
              <FormControl
                size='small'
                fullWidth
              >
                <InputLabel>账号类型</InputLabel>
                <Select
                  value={formData.account_type}
                  label='账号类型'
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                >
                  {Object.entries(ACCOUNT_TYPE_CONFIG).map(([value, config]) => (
                    <MenuItem
                      key={value}
                      value={value}
                    >
                      {config.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label='邮箱'
                type='email'
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                size='small'
              />
              <TextField
                fullWidth
                label='手机号'
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                size='small'
              />
              <TextField
                fullWidth
                label='所属部门'
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                size='small'
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => {
                setShowEditModal(false);
                setEditingAccount(null);
              }}
            >
              取消
            </Button>
            <Button
              type='submit'
              variant='contained'
            >
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

export default IamAccountsPage;
