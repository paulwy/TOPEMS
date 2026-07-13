import React, { useState, useMemo } from 'react';
import {
  FileText,
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  Check,
  Clock,
  AlertCircle,
  Send,
  DollarSign,
  Calendar,
  User,
  RefreshCw,
  XCircle,
  FolderOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { financeApi } from '@/api/finance';
import type { Account } from '@/types/finance';
import { useNotificationStore } from '../../store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ListPageTemplate, type ColumnDef as ListColumnDef } from '@/components';
import type { StatCard } from '@/components/templates/DashboardTemplate';
import type { OrganizationFilterValue } from '@/components/ui/OrganizationFilter';
import OrganizationFilter from '@/components/ui/OrganizationFilter';
import { StatsChart } from '@/components/bi/StatsChart';
import { apiLogger } from '@/utils/logger';

import {
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import { FormField, FormSelect, ActionButton, PageContainer } from '@/components/common';
import { ModeToggle } from '@/components/theme/ModeToggle';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { ConfirmDialog, StatusBadge } from '@topems/shared-components';

const FinanceExpensePage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Account | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<OrganizationFilterValue>({
    companyId: undefined,
    departmentId: undefined,
    employeeId: undefined,
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  const [newExpense, setNewExpense] = useState<Partial<Account>>({
    code: '',
    name: '',
    category: 'expense',
    balance_direction: 'debit',
    level: 1,
    status: 'active',
    description: '',
  });

  const expensesQuery = useQuery({
    queryKey: ['finance', 'expenses', filterStatus, filterType, organizationFilter],
    queryFn: async () => {
      const response = await financeApi.account.list({
        category: 'expense',
        keyword: filterType || undefined,
        status: filterStatus || undefined,
      });
      if (response.success && response.data) {
        return response.data.items || [];
      }
      throw new Error(response.message || '加载数据失败');
    },
    staleTime: 60000,
  });

  const expenses = expensesQuery.data || [];
  const loading = expensesQuery.isLoading;

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Account>) => {
      const res = await financeApi.account.create(data);
      if (!res.success) {
        throw new Error(
          (res as unknown as { error?: { message?: string } }).error?.message || '创建失败'
        );
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'expenses'] });
      addNotification({
        title: '成功',
        message: '费用科目创建成功',
        type: 'success',
      });
      setShowCreateModal(false);
      setNewExpense({
        code: '',
        name: '',
        category: 'expense',
        balance_direction: 'debit',
        level: 1,
        status: 'active',
        description: '',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error('创建费用科目失败:', err);
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '创建失败',
        type: 'error',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Account> }) => {
      const res = await financeApi.account.update(id, data);
      if (!res.success) {
        throw new Error(
          (res as unknown as { error?: { message?: string } }).error?.message || '更新失败'
        );
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'expenses'] });
      addNotification({
        title: '成功',
        message: '费用科目更新成功',
        type: 'success',
      });
      setEditingExpense(null);
    },
    onError: (err: unknown) => {
      apiLogger.error('更新费用科目失败:', err);
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '更新失败',
        type: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await financeApi.account.delete(id);
      if (!res.success) {
        throw new Error(
          (res as unknown as { error?: { message?: string } }).error?.message || '删除失败'
        );
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'expenses'] });
      addNotification({
        title: '成功',
        message: '费用科目删除成功',
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error('删除费用科目失败:', err);
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '删除失败',
        type: 'error',
      });
    },
    onSettled: () => {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    },
  });

  const batchUpdateMutation = useMutation({
    mutationFn: async ({ ids, data }: { ids: string[]; data: Partial<Account> }) => {
      const promises = ids.map((id) => financeApi.account.update(id, data));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;
      return { successCount, total: ids.length };
    },
    onSuccess: ({ successCount, total }) => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'expenses'] });
      if (successCount === total) {
        addNotification({
          title: '成功',
          message: `批量操作成功，共 ${successCount} 条记录`,
          type: 'success',
        });
      } else {
        addNotification({
          title: '部分成功',
          message: `成功 ${successCount} 条，失败 ${total - successCount} 条`,
          type: 'warning',
        });
      }
      setSelectedIds([]);
    },
    onError: (err: unknown) => {
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '批量操作失败',
        type: 'error',
      });
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const promises = ids.map((id) => financeApi.account.delete(id));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;
      return { successCount, total: ids.length };
    },
    onSuccess: ({ successCount, total }) => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'expenses'] });
      if (successCount === total) {
        addNotification({
          title: '成功',
          message: `批量删除成功，共 ${successCount} 条记录`,
          type: 'success',
        });
      } else {
        addNotification({
          title: '部分成功',
          message: `成功删除 ${successCount} 条，失败 ${total - successCount} 条`,
          type: 'warning',
        });
      }
      setSelectedIds([]);
    },
    onError: (err: unknown) => {
      apiLogger.error('批量删除科目失败:', err);
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '批量删除失败',
        type: 'error',
      });
    },
    onSettled: () => {
      setBatchDeleteDialogOpen(false);
    },
  });

  const handleCreate = () => {
    createMutation.mutate(newExpense);
  };

  const handleUpdate = () => {
    if (!editingExpense) return;
    updateMutation.mutate({ id: editingExpense.id, data: editingExpense });
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteMutation.mutate(deletingId);
  };

  const handleApprove = (expense: Account) => {
    updateMutation.mutate({ id: expense.id, data: { status: 'active' } });
  };

  const handleBatchApprove = () => {
    if (selectedIds.length === 0) return;
    batchUpdateMutation.mutate({ ids: selectedIds, data: { status: 'active' } });
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    batchDeleteMutation.mutate(selectedIds);
  };

  const handleBatchReject = () => {
    if (selectedIds.length === 0) return;
    batchUpdateMutation.mutate({ ids: selectedIds, data: { status: 'disabled' } });
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (filterStatus && e.status !== filterStatus) return false;
      return true;
    });
  }, [expenses, filterStatus, filterType]);

  const advancedFilters = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { value: 'active', label: '启用' },
          { value: 'disabled', label: '停用' },
        ],
        value: filterStatus,
        onChange: (value: unknown) => setFilterStatus(value as string),
      },
    ],
    [filterStatus, filterType]
  );

  const columns = useMemo<ListColumnDef<Account>[]>(
    () => [
      {
        id: 'code',
        label: '科目编码',
        render: (row) => <Box sx={{ fontWeight: 500, color: 'primary.main' }}>{row.code}</Box>,
      },
      {
        id: 'name',
        label: '科目名称',
        render: (row) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: 'text.primary',
            }}
          >
            <User sx={{ width: 16, height: 16, mr: 1, color: 'primary.main' }} />
            {row.name}
          </Box>
        ),
      },
      {
        id: 'category',
        label: '科目类别',
        render: (row) => <Box sx={{ color: 'text.primary' }}>费用类</Box>,
      },
      {
        id: 'balance_direction',
        label: '余额方向',
        render: (row) => (
          <Box sx={{ color: 'text.primary' }}>
            {row.balance_direction === 'debit' ? '借方' : '贷方'}
          </Box>
        ),
      },
      {
        id: 'level',
        label: '层级',
        render: (row) => <Box sx={{ fontWeight: 700, color: 'success.main' }}>{row.level}</Box>,
      },
      {
        id: 'haschildren',
        label: '有下级',
        render: (row) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: 'text.secondary',
              fontSize: '0.875rem',
            }}
          >
            {row.haschildren ? '是' : '否'}
          </Box>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => (
          <StatusBadge
            status={row.status === 'active' ? 'active' : 'inactive'}
            showIcon
          />
        ),
      },
      {
        id: 'actions',
        label: '操作',
        render: (row) => {
          const expense = row;
          return (
            <Stack
              direction='row'
              spacing={1}
            >
              {expense.status === 'disabled' && (
                <Tooltip title='启用'>
                  <IconButton
                    size='small'
                    color='success'
                    onClick={() => handleApprove(expense)}
                  >
                    <Check sx={{ width: 16, height: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title='编辑'>
                <IconButton
                  size='small'
                  onClick={() => setEditingExpense(expense)}
                >
                  <Edit sx={{ width: 16, height: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title='删除'>
                <IconButton
                  size='small'
                  color='error'
                  onClick={() => {
                    setDeletingId(expense.id);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 sx={{ width: 16, height: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    []
  );

  const activeCount = expenses.filter((e) => e.status === 'active').length;
  const disabledCount = expenses.filter((e) => e.status === 'disabled').length;
  const hasChildrenCount = expenses.filter((e) => e.haschildren).length;
  const leafCount = expenses.filter((e) => !e.haschildren).length;

  const expenseStatusData = useMemo(
    () => [
      { name: '启用', value: activeCount, color: 'success.main' },
      { name: '停用', value: disabledCount, color: 'error.main' },
    ],
    [activeCount, disabledCount]
  );

  const expenseTypeData = useMemo(
    () => [
      {
        name: '上级科目',
        value: hasChildrenCount,
        color: 'primary.main',
      },
      {
        name: '明细科目',
        value: leafCount,
        color: 'success.dark',
      },
    ],
    [expenses, hasChildrenCount, leafCount]
  );

  const statsCards: StatCard[] = [
    {
      id: 'active',
      title: '启用',
      value: activeCount,
      color: 'success',
      icon: <Check size={20} />,
    },
    {
      id: 'disabled',
      title: '停用',
      value: disabledCount,
      color: 'error',
      icon: <XCircle size={20} />,
    },
    {
      id: 'haschildren',
      title: '上级科目',
      value: hasChildrenCount,
      color: 'primary',
      icon: <FolderOpen size={20} />,
    },
    {
      id: 'total',
      title: '费用科目总数',
      value: expenses.length,
      color: 'secondary',
      icon: <FileText size={20} />,
    },
  ];

  const listTemplateColumns = useMemo(() => {
    return columns.map((col) => ({
      id: col.id,
      label: col.label,
      render: col.render,
      align: col.align as 'left' | 'center' | 'right' | undefined,
      sortable: col.sortable,
      width: col.width,
      minWidth: col.minWidth,
    }));
  }, [columns]);

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title='费用管理'
      subtitle='管理费用类会计科目，维护科目结构'
      autoTitle
      autoBreadcrumbs
    >
      <DashboardTemplate
        title=''
        subtitle=''
        stats={statsCards}
        onRefresh={() => expensesQuery.refetch()}
        headerContent={
          <Stack
            direction='row'
            spacing={1}
          >
            <ModeToggle />
            <ActionButton
              label='新增科目'
              variant='primary'
              icon={<Plus sx={{ width: 20, height: 20 }} />}
              onClick={() => setShowCreateModal(true)}
            />
          </Stack>
        }
        chartsArea={
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(1, 1fr)', lg: 'repeat(2, 1fr)' },
              gap: 3,
              mb: 3,
            }}
          >
            <Box
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 1.5,
                boxShadow: 1,
                p: 3,
              }}
            >
              <Typography
                variant='h6'
                sx={{ mb: 2, fontWeight: 600 }}
              >
                科目状态分布
              </Typography>
              <StatsChart
                type='pie'
                data={expenseStatusData}
                height={250}
              />
            </Box>

            <Box
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 1.5,
                boxShadow: 1,
                p: 3,
              }}
            >
              <Typography
                variant='h6'
                sx={{ mb: 2, fontWeight: 600 }}
              >
                科目层级分布
              </Typography>
              <StatsChart
                type='bar'
                data={expenseTypeData}
                height={250}
              />
            </Box>
          </Box>
        }
        charts={[]}
      >
        <Stack
          sx={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
          spacing={2}
        >
          <OrganizationFilter
            value={organizationFilter}
            onChange={setOrganizationFilter}
            showCompany={true}
            showDepartment={true}
            showEmployee={true}
          />
          <ActionButton
            label='刷新'
            variant='secondary'
            icon={<RefreshCw sx={{ width: 16, height: 16 }} />}
            onClick={() => expensesQuery.refetch()}
          />
        </Stack>

        {selectedIds.length > 0 && (
          <Card sx={{ mb: 2, bgcolor: 'action.selected' }}>
            <CardContent>
              <Stack
                direction='row'
                sx={{ justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Typography
                  variant='body2'
                  color='primary'
                >
                  已选择{' '}
                  <Box
                    component='span'
                    sx={{ fontWeight: 600 }}
                  >
                    {selectedIds.length}
                  </Box>{' '}
                  条记录
                </Typography>
                <Stack
                  direction='row'
                  spacing={1}
                >
                  <ActionButton
                    label='批量启用'
                    variant='secondary'
                    size='small'
                    icon={<Check sx={{ width: 16, height: 16 }} />}
                    onClick={handleBatchApprove}
                  />
                  <ActionButton
                    label='批量停用'
                    variant='secondary'
                    size='small'
                    icon={<AlertCircle sx={{ width: 16, height: 16 }} />}
                    onClick={handleBatchReject}
                  />
                  <ActionButton
                    label='批量删除'
                    variant='danger'
                    size='small'
                    icon={<Trash2 sx={{ width: 16, height: 16 }} />}
                    onClick={() => setBatchDeleteDialogOpen(true)}
                  />
                  <ActionButton
                    label='取消选择'
                    variant='secondary'
                    size='small'
                    onClick={() => setSelectedIds([])}
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        <ListPageTemplate
          columns={listTemplateColumns}
          data={filteredExpenses}
          loading={loading}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={(ids) => setSelectedIds(ids as string[])}
          getRowId={(row) => row.id}
          searchable
          searchPlaceholder='搜索科目编码、科目名称...'
          filters={advancedFilters}
          onFilterChange={(filters) => {
            if (filters.status) setFilterStatus(filters.status);
            if (filters.expense_type) setFilterType(filters.expense_type);
          }}
          onRefresh={() => expensesQuery.refetch()}
          batchActions={[
            {
              label: '批量启用',
              icon: <Check size={16} />,
              color: 'success',
              onClick: handleBatchApprove,
            },
            {
              label: '批量停用',
              icon: <AlertCircle size={16} />,
              color: 'warning',
              onClick: handleBatchReject,
            },
            {
              label: '批量删除',
              icon: <Trash2 size={16} />,
              color: 'error',
              confirm: true,
              confirmMessage: `确定要删除选中的 ${selectedIds.length} 条科目记录吗？`,
              onClick: () => setBatchDeleteDialogOpen(true),
            },
          ]}
        />

        {/* Create Dialog */}
        <Dialog
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>新建费用科目</DialogTitle>
          <DialogContent>
            <Stack
              spacing={3}
              sx={{ pt: 2 }}
            >
              <Stack
                direction='row'
                spacing={2}
              >
                <FormField
                  name='code'
                  label='科目编码 *'
                  required
                  fullWidth
                  value={newExpense.code}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      code: e.target.value,
                    })
                  }
                  placeholder='请输入科目编码'
                />
                <FormField
                  name='name'
                  label='科目名称 *'
                  required
                  fullWidth
                  value={newExpense.name}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      name: e.target.value,
                    })
                  }
                  placeholder='请输入科目名称'
                />
              </Stack>

              <Stack
                direction='row'
                spacing={2}
              >
                <FormSelect
                  name='balance_direction'
                  label='余额方向'
                  value={newExpense.balance_direction}
                  options={[
                    { value: 'debit', label: '借方' },
                    { value: 'credit', label: '贷方' },
                  ]}
                  onChange={(value) =>
                    setNewExpense({
                      ...newExpense,
                      balance_direction: value as 'debit' | 'credit',
                    })
                  }
                  placeholder='请选择余额方向'
                />
                <FormSelect
                  name='level'
                  label='层级'
                  value={newExpense.level}
                  options={[
                    { value: 1, label: '1级' },
                    { value: 2, label: '2级' },
                    { value: 3, label: '3级' },
                    { value: 4, label: '4级' },
                  ]}
                  onChange={(value) =>
                    setNewExpense({
                      ...newExpense,
                      level: Number(value) || 1,
                    })
                  }
                  placeholder='请选择层级'
                />
              </Stack>

              <FormField
                name='description'
                label='科目描述'
                fullWidth
                multiline
                rows={3}
                value={newExpense.description || ''}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                placeholder='请输入科目描述...'
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <ActionButton
              label='取消'
              variant='secondary'
              onClick={() => setShowCreateModal(false)}
            />
            <ActionButton
              label='保存'
              variant='primary'
              onClick={handleCreate}
            />
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog
          open={!!editingExpense}
          onClose={() => setEditingExpense(null)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>编辑费用科目</DialogTitle>
          <DialogContent>
            {editingExpense && (
              <Stack
                spacing={3}
                sx={{ pt: 2 }}
              >
                <Stack
                  direction='row'
                  spacing={2}
                >
                  <FormField
                    name='code'
                    label='科目编码'
                    fullWidth
                    value={editingExpense.code}
                    slotProps={{ input: { readOnly: true } }}
                  />
                  <FormField
                    name='name'
                    label='科目名称'
                    fullWidth
                    value={editingExpense.name}
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        name: e.target.value,
                      })
                    }
                  />
                </Stack>

                <Stack
                  direction='row'
                  spacing={2}
                >
                  <FormSelect
                    name='balance_direction'
                    label='余额方向'
                    value={editingExpense.balance_direction}
                    options={[
                      { value: 'debit', label: '借方' },
                      { value: 'credit', label: '贷方' },
                    ]}
                    onChange={(value) =>
                      setEditingExpense({
                        ...editingExpense,
                        balance_direction: value as 'debit' | 'credit',
                      })
                    }
                    placeholder='请选择余额方向'
                  />
                  <FormSelect
                    name='status'
                    label='状态'
                    value={editingExpense.status}
                    options={[
                      { value: 'active', label: '启用' },
                      { value: 'disabled', label: '停用' },
                    ]}
                    onChange={(value) =>
                      setEditingExpense({
                        ...editingExpense,
                        status: value as 'active' | 'disabled',
                      })
                    }
                    placeholder='请选择状态'
                  />
                </Stack>

                <FormField
                  name='description'
                  label='科目描述'
                  fullWidth
                  multiline
                  rows={3}
                  value={editingExpense.description || ''}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      description: e.target.value,
                    })
                  }
                  placeholder='请输入科目描述...'
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <ActionButton
              label='取消'
              variant='secondary'
              onClick={() => setEditingExpense(null)}
            />
            <ActionButton
              label='保存'
              variant='primary'
              onClick={handleUpdate}
            />
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
          message='确定要删除这条费用科目吗？'
          danger
        />

        <ConfirmDialog
          isOpen={batchDeleteDialogOpen}
          onClose={() => setBatchDeleteDialogOpen(false)}
          onConfirm={handleBatchDelete}
          title='确认批量删除'
          message={`确定要删除选中的 ${selectedIds.length} 条费用科目吗？`}
          danger
        />
      </DashboardTemplate>
    </PageContainer>
  );
};

export default FinanceExpensePage;
