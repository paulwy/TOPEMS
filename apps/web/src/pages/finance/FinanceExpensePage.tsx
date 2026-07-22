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

import { useTranslation } from 'react-i18next';
const FinanceExpensePage: React.FC = () => {
  const { t } = useTranslation();
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
      throw new Error(response.message || t('finance.finance_expense_page.fail'));
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
          (res as unknown as { error?: { message?: string } }).error?.message || t('finance.finance_expense_page.create')
        );
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'expenses'] });
      addNotification({
        title: t('finance.finance_expense_page.success'),
        message: t('finance.finance_expense_page.create_1'),
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
      apiLogger.error(t('finance.finance_expense_page.create_2'), err);
      addNotification({
        title: t('finance.finance_expense_page.error'),
        message: (err as { message?: string }).message || t('finance.finance_expense_page.create'),
        type: 'error',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Account> }) => {
      const res = await financeApi.account.update(id, data);
      if (!res.success) {
        throw new Error(
          (res as unknown as { error?: { message?: string } }).error?.message || t('finance.finance_expense_page.update')
        );
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'expenses'] });
      addNotification({
        title: t('finance.finance_expense_page.success'),
        message: t('finance.finance_expense_page.update_1'),
        type: 'success',
      });
      setEditingExpense(null);
    },
    onError: (err: unknown) => {
      apiLogger.error(t('finance.finance_expense_page.update_2'), err);
      addNotification({
        title: t('finance.finance_expense_page.error'),
        message: (err as { message?: string }).message || t('finance.finance_expense_page.update'),
        type: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await financeApi.account.delete(id);
      if (!res.success) {
        throw new Error(
          (res as unknown as { error?: { message?: string } }).error?.message || t('finance.finance_expense_page.delete')
        );
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'expenses'] });
      addNotification({
        title: t('finance.finance_expense_page.success'),
        message: t('finance.finance_expense_page.delete_success'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(t('finance.finance_expense_page.delete_1'), err);
      addNotification({
        title: t('finance.finance_expense_page.error'),
        message: (err as { message?: string }).message || t('finance.finance_expense_page.delete'),
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
          title: t('finance.finance_expense_page.success'),
          message: `批量操作成功，共 ${successCount} 条记录`,
          type: 'success',
        });
      } else {
        addNotification({
          title: t('finance.finance_expense_page.success_1'),
          message: `成功 ${successCount} 条，失败 ${total - successCount} 条`,
          type: 'warning',
        });
      }
      setSelectedIds([]);
    },
    onError: (err: unknown) => {
      addNotification({
        title: t('finance.finance_expense_page.error'),
        message: (err as { message?: string }).message || t('finance.finance_expense_page.operation_failed'),
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
          title: t('finance.finance_expense_page.success'),
          message: `批量删除成功，共 ${successCount} 条记录`,
          type: 'success',
        });
      } else {
        addNotification({
          title: t('finance.finance_expense_page.success_1'),
          message: `成功删除 ${successCount} 条，失败 ${total - successCount} 条`,
          type: 'warning',
        });
      }
      setSelectedIds([]);
    },
    onError: (err: unknown) => {
      apiLogger.error(t('finance.finance_expense_page.batch_delete_1'), err);
      addNotification({
        title: t('finance.finance_expense_page.error'),
        message: (err as { message?: string }).message || t('finance.finance_expense_page.batch_delete_2'),
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
        label: t('finance.finance_expense_page.status'),
        type: 'select' as const,
        options: [
          { value: 'active', label: t('finance.finance_expense_page.active') },
          { value: 'disabled', label: t('finance.finance_expense_page.inactive') },
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
        label: t('finance.finance_expense_page.code'),
        render: (row) => <Box sx={{ fontWeight: 500, color: 'primary.main' }}>{row.code}</Box>,
      },
      {
        id: 'name',
        label: t('finance.finance_expense_page.name'),
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
        label: t('finance.finance_expense_page.text_f31b4e'),
        render: (row) => <Box sx={{ color: 'text.primary' }}>费用类</Box>,
      },
      {
        id: 'balance_direction',
        label: t('finance.finance_expense_page.text_98f933'),
        render: (row) => (
          <Box sx={{ color: 'text.primary' }}>
            {row.balance_direction === 'debit' ? t('finance.finance_expense_page.text_63e2bc') : t('finance.finance_expense_page.text_9ff9a6')}
          </Box>
        ),
      },
      {
        id: 'level',
        label: t('finance.finance_expense_page.text_6896da'),
        render: (row) => <Box sx={{ fontWeight: 700, color: 'success.main' }}>{row.level}</Box>,
      },
      {
        id: 'haschildren',
        label: t('finance.finance_expense_page.text_e5b707'),
        render: (row) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: 'text.secondary',
              fontSize: '0.875rem',
            }}
          >
            {row.haschildren ? t('finance.finance_expense_page.yes') : t('finance.finance_expense_page.no')}
          </Box>
        ),
      },
      {
        id: 'status',
        label: t('finance.finance_expense_page.status'),
        render: (row) => (
          <StatusBadge
            status={row.status === 'active' ? 'active' : 'inactive'}
            showIcon
          />
        ),
      },
      {
        id: 'actions',
        label: t('finance.finance_expense_page.action'),
        render: (row) => {
          const expense = row;
          return (
            <Stack
              direction='row'
              spacing={1}
            >
              {expense.status === 'disabled' && (
                <Tooltip title={t('finance.finance_expense_page.active')}>
                  <IconButton
                    size='small'
                    color='success'
                    onClick={() => handleApprove(expense)}
                  >
                    <Check sx={{ width: 16, height: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={t('finance.finance_expense_page.edit')}>
                <IconButton
                  size='small'
                  onClick={() => setEditingExpense(expense)}
                >
                  <Edit sx={{ width: 16, height: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('finance.finance_expense_page.delete_3')}>
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
      { name: t('finance.finance_expense_page.active'), value: activeCount, color: 'success.main' },
      { name: t('finance.finance_expense_page.inactive'), value: disabledCount, color: 'error.main' },
    ],
    [activeCount, disabledCount]
  );

  const expenseTypeData = useMemo(
    () => [
      {
        name: t('finance.finance_expense_page.text_e18d32'),
        value: hasChildrenCount,
        color: 'primary.main',
      },
      {
        name: t('finance.finance_expense_page.text_7586c1'),
        value: leafCount,
        color: 'success.dark',
      },
    ],
    [expenses, hasChildrenCount, leafCount]
  );

  const statsCards: StatCard[] = [
    {
      id: 'active',
      title: t('finance.finance_expense_page.active'),
      value: activeCount,
      color: 'success',
      icon: <Check size={20} />,
    },
    {
      id: 'disabled',
      title: t('finance.finance_expense_page.inactive'),
      value: disabledCount,
      color: 'error',
      icon: <XCircle size={20} />,
    },
    {
      id: 'haschildren',
      title: t('finance.finance_expense_page.text_e18d32'),
      value: hasChildrenCount,
      color: 'primary',
      icon: <FolderOpen size={20} />,
    },
    {
      id: 'total',
      title: t('finance.finance_expense_page.text_d1e912'),
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
      title={t('finance.finance_expense_page.text_9b25b0')}
      subtitle={t('finance.finance_expense_page.text_e76cef')}
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
              label={t('finance.finance_expense_page.add')}
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
            label={t('finance.finance_expense_page.refresh')}
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
                    label={t('finance.finance_expense_page.active_1')}
                    variant='secondary'
                    size='small'
                    icon={<Check sx={{ width: 16, height: 16 }} />}
                    onClick={handleBatchApprove}
                  />
                  <ActionButton
                    label={t('finance.finance_expense_page.inactive_1')}
                    variant='secondary'
                    size='small'
                    icon={<AlertCircle sx={{ width: 16, height: 16 }} />}
                    onClick={handleBatchReject}
                  />
                  <ActionButton
                    label={t('finance.finance_expense_page.batch_delete_3')}
                    variant='danger'
                    size='small'
                    icon={<Trash2 sx={{ width: 16, height: 16 }} />}
                    onClick={() => setBatchDeleteDialogOpen(true)}
                  />
                  <ActionButton
                    label={t('finance.finance_expense_page.cancel')}
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
          onSelectionChange={(ids: (string | number)[]) => setSelectedIds(ids as string[])}
          getRowId={(row) => row.id}
          searchable
          searchPlaceholder={t('finance.finance_expense_page.search')}
          filters={advancedFilters}
          onFilterChange={(filters) => {
            if (filters.status) setFilterStatus(filters.status);
            if (filters.expense_type) setFilterType(filters.expense_type);
          }}
          onRefresh={() => expensesQuery.refetch()}
          batchActions={[
            {
              label: t('finance.finance_expense_page.active_1'),
              icon: <Check size={16} />,
              color: 'success',
              onClick: handleBatchApprove,
            },
            {
              label: t('finance.finance_expense_page.inactive_1'),
              icon: <AlertCircle size={16} />,
              color: 'warning',
              onClick: handleBatchReject,
            },
            {
              label: t('finance.finance_expense_page.batch_delete_3'),
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
                  label={t('finance.finance_expense_page.code_1')}
                  required
                  fullWidth
                  value={newExpense.code}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewExpense({
                      ...newExpense,
                      code: e.target.value,
                    })
                  }
                  placeholder={t('finance.finance_expense_page.please_input')}
                />
                <FormField
                  name='name'
                  label={t('finance.finance_expense_page.name_1')}
                  required
                  fullWidth
                  value={newExpense.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewExpense({
                      ...newExpense,
                      name: e.target.value,
                    })
                  }
                  placeholder={t('finance.finance_expense_page.please_input_1')}
                />
              </Stack>

              <Stack
                direction='row'
                spacing={2}
              >
                <FormSelect
                  name='balance_direction'
                  label={t('finance.finance_expense_page.text_98f933')}
                  value={newExpense.balance_direction}
                  options={[
                    { value: 'debit', label: t('finance.finance_expense_page.text_63e2bc') },
                    { value: 'credit', label: t('finance.finance_expense_page.text_9ff9a6') },
                  ]}
                  onChange={(value: string | number | string[]) =>
                    setNewExpense({
                      ...newExpense,
                      balance_direction: value as 'debit' | 'credit',
                    })
                  }
                  placeholder={t('finance.finance_expense_page.please_select')}
                />
                <FormSelect
                  name='level'
                  label={t('finance.finance_expense_page.text_6896da')}
                  value={newExpense.level}
                  options={[
                    { value: 1, label: t('finance.finance_expense_page.text_3f303d') },
                    { value: 2, label: t('finance.finance_expense_page.text_5f10fe') },
                    { value: 3, label: t('finance.finance_expense_page.text_d48c13') },
                    { value: 4, label: t('finance.finance_expense_page.text_0c9e5c') },
                  ]}
                  onChange={(value: string | number | string[]) =>
                    setNewExpense({
                      ...newExpense,
                      level: Number(value) || 1,
                    })
                  }
                  placeholder={t('finance.finance_expense_page.please_select_1')}
                />
              </Stack>

              <FormField
                name='description'
                label={t('finance.finance_expense_page.description')}
                fullWidth
                multiline
                rows={3}
                value={newExpense.description || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewExpense({ ...newExpense, description: e.target.value })
                }
                placeholder={t('finance.finance_expense_page.please_input_2')}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <ActionButton
              label={t('finance.finance_expense_page.cancel_1')}
              variant='secondary'
              onClick={() => setShowCreateModal(false)}
            />
            <ActionButton
              label={t('finance.finance_expense_page.save')}
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
                    label={t('finance.finance_expense_page.code')}
                    fullWidth
                    value={editingExpense.code}
                    slotProps={{ input: { readOnly: true } }}
                  />
                  <FormField
                    name='name'
                    label={t('finance.finance_expense_page.name')}
                    fullWidth
                    value={editingExpense.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
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
                    label={t('finance.finance_expense_page.text_98f933')}
                    value={editingExpense.balance_direction}
                    options={[
                      { value: 'debit', label: t('finance.finance_expense_page.text_63e2bc') },
                      { value: 'credit', label: t('finance.finance_expense_page.text_9ff9a6') },
                    ]}
                    onChange={(value: string | number | string[]) =>
                      setEditingExpense({
                        ...editingExpense,
                        balance_direction: value as 'debit' | 'credit',
                      })
                    }
                    placeholder={t('finance.finance_expense_page.please_select')}
                  />
                  <FormSelect
                    name='status'
                    label={t('finance.finance_expense_page.status')}
                    value={editingExpense.status}
                    options={[
                      { value: 'active', label: t('finance.finance_expense_page.active') },
                      { value: 'disabled', label: t('finance.finance_expense_page.inactive') },
                    ]}
                    onChange={(value: string | number | string[]) =>
                      setEditingExpense({
                        ...editingExpense,
                        status: value as 'active' | 'disabled',
                      })
                    }
                    placeholder={t('finance.finance_expense_page.please_select_2')}
                  />
                </Stack>

                <FormField
                  name='description'
                  label={t('finance.finance_expense_page.description')}
                  fullWidth
                  multiline
                  rows={3}
                  value={editingExpense.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditingExpense({
                      ...editingExpense,
                      description: e.target.value,
                    })
                  }
                  placeholder={t('finance.finance_expense_page.please_input_2')}
                />
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <ActionButton
              label={t('finance.finance_expense_page.cancel_1')}
              variant='secondary'
              onClick={() => setEditingExpense(null)}
            />
            <ActionButton
              label={t('finance.finance_expense_page.save')}
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
          title={t('finance.finance_expense_page.confirm_delete')}
          message={t('finance.finance_expense_page.confirm_1')}
          danger
        />

        <ConfirmDialog
          isOpen={batchDeleteDialogOpen}
          onClose={() => setBatchDeleteDialogOpen(false)}
          onConfirm={handleBatchDelete}
          title={t('finance.finance_expense_page.batch_delete_4')}
          message={`确定要删除选中的 ${selectedIds.length} 条费用科目吗？`}
          danger
        />
      </DashboardTemplate>
    </PageContainer>
  );
};

export default FinanceExpensePage;
