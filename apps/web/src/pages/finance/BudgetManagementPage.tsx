import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { TrendingUp, Plus, Edit, Trash2, DollarSign, Calendar, Settings } from 'lucide-react';
import { budgetApi, type Budget } from '@/api/erp';
import { BackButton, PageContainer } from '@/components/common';
import { departmentApi, type Department } from '@/api/hrm';
import { financeApi } from '@/api/finance';
import { apiLogger } from '@/utils/logger';
import { useNotificationStore } from '@/store';
import { ListPageTemplate, StatCardGroup } from '@/components';
import type { ColumnDef, RowAction, BatchAction } from '@/components';

import { FINANCE_PATHS } from '@/modules/finance/config';
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
  FormLabel,
  Chip,
  Box,
  Typography,
  Stack,
  Button,
} from '@mui/material';
import { ModeToggle } from '@/components/theme/ModeToggle';
import OrganizationFilter, {
  type OrganizationFilterValue,
} from '@/components/ui/OrganizationFilter';
import { useTranslation } from 'react-i18next';

const BudgetManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [organizationFilter, setOrganizationFilter] = useState<OrganizationFilterValue>({});
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [showBatchStatusModal, setShowBatchStatusModal] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string>('');

  const budgetsQuery = useQuery<Budget[]>({
    queryKey: QUERY_KEYS.FINANCE.BUDGET,
    queryFn: async () => {
      const res = await budgetApi.list();
      if (res.success && res.data) {
        return res.data.items || [];
      }
      return [];
    },
  });

  const departmentsQuery = useQuery<Department[]>({
    queryKey: QUERY_KEYS.HRM.DEPARTMENTS,
    queryFn: async () => {
      const res = await departmentApi.list();
      if (res.success && res.data) {
        return res.data.items || [];
      }
      return [];
    },
  });

  const budgets = budgetsQuery.data || [];
  const departments = departmentsQuery.data || [];
  const loading = budgetsQuery.isLoading || departmentsQuery.isLoading;
  const error = budgetsQuery.error ? t('finance.budget_management_page.fail') : undefined;

  const invalidateBudgets = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCE.BUDGET });
  };

  const batchUpdateStatusMutation = useMutation({
    mutationFn: async (params: { ids: (string | number)[]; status: string }) => {
      const promises = params.ids.map((id) =>
        budgetApi.update(id as string, { status: params.status })
      );
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;
      return { successCount, total: params.ids.length };
    },
    onSuccess: (data) => {
      addNotification({
        title: t('finance.budget_management_page.update'),
        message: `成功更新 ${data.successCount} 条预算状态，失败 ${data.total - data.successCount} 条`,
        type: 'success',
      });
      setSelectedIds([]);
      setShowBatchStatusModal(false);
      setBatchStatus('');
      invalidateBudgets();
    },
    onError: (err: unknown) => {
      addNotification({
        title: t('finance.budget_management_page.update_2'),
        message: (err as { message?: string }).message || t('finance.budget_management_page.update_3'),
        type: 'error',
      });
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: (string | number)[]) => {
      const promises = ids.map((id) => budgetApi.delete(id as string));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;
      return { successCount, total: ids.length };
    },
    onSuccess: (data) => {
      addNotification({
        title: t('finance.budget_management_page.batch_delete'),
        message: `成功删除 ${data.successCount} 条预算，失败 ${data.total - data.successCount} 条`,
        type: 'success',
      });
      setSelectedIds([]);
      invalidateBudgets();
    },
    onError: (err: unknown) => {
      addNotification({
        title: t('finance.budget_management_page.batch_delete_1'),
        message: (err as { message?: string }).message || t('finance.budget_management_page.batch_delete_1'),
        type: 'error',
      });
    },
  });

  const handleBatchUpdateStatus = () => {
    setShowBatchStatusModal(true);
  };

  const confirmBatchUpdateStatus = () => {
    if (selectedIds.length === 0 || !batchStatus) return;
    batchUpdateStatusMutation.mutate({ ids: selectedIds, status: batchStatus });
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    batchDeleteMutation.mutate(selectedIds);
  };

  const [newBudget, setNewBudget] = useState({
    department_id: '',
    budget_type: '',
    fiscal_year: new Date().getFullYear().toString(),
    total_budget: 0,
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      department_id?: string;
      budget_type?: string;
      fiscal_year: string;
      total_budget: number;
    }) => {
      const res = await budgetApi.create(data);
      if (!res.success) {
        throw new Error(res.message || t('finance.budget_management_page.create'));
      }
      return res;
    },
    onSuccess: () => {
      addNotification({ title: t('finance.budget_management_page.success'), message: t('finance.budget_management_page.create_1'), type: 'success' });
      setShowCreateModal(false);
      setNewBudget({
        department_id: '',
        budget_type: '',
        fiscal_year: new Date().getFullYear().toString(),
        total_budget: 0,
      });
      invalidateBudgets();
    },
    onError: (err: unknown) => {
      addNotification({
        title: t('finance.budget_management_page.fail_1'),
        message: (err as { message?: string }).message || t('finance.budget_management_page.create'),
        type: 'error',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<
      string,
      { color: 'primary' | 'default' | 'error' | 'warning'; label: string }
    > = {
      active: { color: 'primary', label: t('finance.budget_management_page.text_46e386') },
      frozen: { color: 'warning', label: t('finance.budget_management_page.text_92cff4') },
      exhausted: { color: 'error', label: t('finance.budget_management_page.text_7bb9ff') },
    };

    const badgeConfig = config[status] || {
      color: 'default' as const,
      label: status,
    };
    return (
      <Chip
        size='small'
        label={badgeConfig.label}
        color={badgeConfig.color}
      />
    );
  };

  const getDepartmentName = (id: string) => {
    const dept = departments.find((d) => d.id === id);
    return dept?.name || '-';
  };

  const getBudgetTypeName = (type: string) => {
    const types: Record<string, string> = {
      office: t('finance.budget_management_page.text_976cad'),
      marketing: t('finance.budget_management_page.text_656113'),
      development: t('finance.budget_management_page.text_6d566d'),
      travel: t('finance.budget_management_page.text_2038cb'),
      training: t('finance.budget_management_page.text_b11633'),
      other: t('finance.budget_management_page.other'),
    };
    return types[type] || type;
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 90) return 'error.main';
    if (rate >= 70) return 'warning.main';
    return 'primary.main';
  };

  const updateMutation = useMutation({
    mutationFn: async (params: { id: string; data: any }) => {
      const res = await budgetApi.update(params.id, params.data);
      if (!res.success) {
        throw new Error(res.message || t('finance.budget_management_page.update_4'));
      }
      return res;
    },
    onSuccess: () => {
      addNotification({ title: t('finance.budget_management_page.success'), message: t('finance.budget_management_page.update_5'), type: 'success' });
      setEditingBudget(null);
      invalidateBudgets();
    },
    onError: (err: unknown) => {
      addNotification({
        title: t('finance.budget_management_page.error'),
        message: (err as { message?: string }).message || t('finance.budget_management_page.update_4'),
        type: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await budgetApi.delete(id);
      if (!res.success) {
        throw new Error(res.message || t('finance.budget_management_page.delete_1'));
      }
      return res;
    },
    onSuccess: () => {
      addNotification({ title: t('finance.budget_management_page.success'), message: t('finance.budget_management_page.delete_success'), type: 'success' });
      invalidateBudgets();
    },
    onError: (err: unknown) => {
      addNotification({
        title: t('finance.budget_management_page.error'),
        message: (err as { message?: string }).message || t('finance.budget_management_page.delete_1'),
        type: 'error',
      });
    },
  });

  const handleCreate = () => {
    createMutation.mutate({
      department_id: newBudget.department_id || undefined,
      budget_type: newBudget.budget_type || undefined,
      fiscal_year: newBudget.fiscal_year,
      total_budget: newBudget.total_budget,
    });
  };

  const handleUpdate = () => {
    if (!editingBudget) return;
    updateMutation.mutate({
      id: editingBudget.id,
      data: {
        department_id: editingBudget.department_id || undefined,
        budget_type: editingBudget.budget_type || undefined,
        fiscal_year: editingBudget.fiscal_year,
        total_budget: editingBudget.total_budget,
        used_amount: editingBudget.used_amount,
        status: editingBudget.status,
      },
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm(t('finance.budget_management_page.confirm'))) return;
    deleteMutation.mutate(id);
  };

  // 统计卡片数据
  const totalBudget = budgets.reduce((sum, b) => sum + b.total_budget, 0);
  const totalUsed = budgets.reduce((sum, b) => sum + (b.used_amount ?? 0), 0);
  const avgUsageRate =
    budgets.length > 0
      ? budgets.reduce((sum, b) => sum + (b.usage_rate ?? 0), 0) / budgets.length
      : 0;

  const statCards = useMemo(
    () => [
      {
        title: t('finance.budget_management_page.text_b91eb1'),
        value: `¥${totalBudget.toLocaleString()}`,
        icon: <DollarSign size={24} />,
        color: 'primary' as const,
      },
      {
        title: t('finance.budget_management_page.text_b59b00'),
        value: `¥${totalUsed.toLocaleString()}`,
        icon: <TrendingUp size={24} />,
        color: 'success' as const,
      },
      {
        title: t('finance.budget_management_page.text_bf99c1'),
        value: `${avgUsageRate.toFixed(1)}%`,
        icon: <Calendar size={24} />,
        color: avgUsageRate > 80 ? ('error' as const) : ('warning' as const),
      },
    ],
    [totalBudget, totalUsed, avgUsageRate]
  );

  // 列定义
  const columns = useMemo<ColumnDef<Budget>[]>(
    () => [
      {
        id: 'department_id',
        label: t('finance.budget_management_page.text_1e1459'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 500, color: 'grey.900' }}
          >
            {getDepartmentName(row.department_id || '')}
          </Typography>
        ),
      },
      {
        id: 'budget_type',
        label: t('finance.budget_management_page.type'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ color: 'grey.900' }}
          >
            {getBudgetTypeName(row.budget_type || '')}
          </Typography>
        ),
      },
      {
        id: 'fiscal_year',
        label: t('finance.budget_management_page.text_dcdd8c'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ color: 'grey.900' }}
          >
            {row.fiscal_year}年
          </Typography>
        ),
      },
      {
        id: 'total_budget',
        label: t('finance.budget_management_page.text_f415f9'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 700, color: 'primary.main' }}
          >
            ¥{row.total_budget.toLocaleString()}
          </Typography>
        ),
      },
      {
        id: 'usage',
        label: t('finance.budget_management_page.text_085706'),
        render: (row) => (
          <Box sx={{ width: '100%', maxWidth: 320 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography
                variant='body2'
                sx={{ fontSize: '0.75rem', color: 'grey.600' }}
              >
                已用: ¥{(row.used_amount ?? 0).toLocaleString()}
              </Typography>
              <Typography
                variant='body2'
                sx={{
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: (row.usage_rate ?? 0) > 80 ? 'error.main' : 'primary.main',
                }}
              >
                {(row.usage_rate ?? 0).toFixed(1)}%
              </Typography>
            </Box>
            <Box
              sx={{
                width: '100%',
                bgcolor: 'grey.200',
                borderRadius: 1,
                height: 8,
              }}
            >
              <Box
                sx={{
                  height: 8,
                  borderRadius: 1,
                  transition: 'width 0.3s',
                  width: `${Math.min(row.usage_rate ?? 0, 100)}%`,
                  bgcolor: getProgressColor(row.usage_rate ?? 0),
                }}
              />
            </Box>
          </Box>
        ),
      },
      {
        id: 'remaining_amount',
        label: t('finance.budget_management_page.text_43b510'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{
              fontWeight: 700,
              color:
                (row.remaining_amount ?? 0) < row.total_budget * 0.2
                  ? 'error.main'
                  : 'success.main',
            }}
          >
            ¥{(row.remaining_amount ?? 0).toLocaleString()}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: t('finance.budget_management_page.status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],

    [departments]
  );

  // 行操作
  const rowActions = useMemo<RowAction<Budget>[]>(
    () => [
      {
        label: t('finance.budget_management_page.edit'),
        icon: <Edit sx={{ width: 16, height: 16 }} />,
        onClick: (row) => setEditingBudget(row),
      },
      {
        label: t('finance.budget_management_page.delete_2'),
        icon: <Trash2 sx={{ width: 16, height: 16 }} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: t('finance.budget_management_page.confirm'),
      },
    ],

    []
  );

  // 批量操作
  const batchActions = useMemo<BatchAction[]>(
    () => [
      {
        label: t('finance.budget_management_page.update_6'),
        icon: <Settings sx={{ width: 16, height: 16 }} />,
        onClick: handleBatchUpdateStatus,
        showWhenSelected: true,
      },
      {
        label: t('finance.budget_management_page.batch_delete_2'),
        icon: <Trash2 sx={{ width: 16, height: 16 }} />,
        color: 'error',
        onClick: handleBatchDelete,
        showWhenSelected: true,
        confirm: true,
        confirmMessage: t('finance.budget_management_page.confirm_1'),
      },
    ],

    [selectedIds]
  );

  // 筛选器配置
  const filters = useMemo(
    () => [
      {
        id: 'status',
        label: t('finance.budget_management_page.status'),
        type: 'select' as const,
        options: [
          { value: '', label: t('finance.budget_management_page.all') },
          { value: 'active', label: t('finance.budget_management_page.in_progress') },
          { value: 'frozen', label: t('finance.budget_management_page.text_92cff4') },
          { value: 'exhausted', label: t('finance.budget_management_page.text_7bb9ff') },
        ],
      },
      {
        id: 'budget_type',
        label: t('finance.budget_management_page.type'),
        type: 'select' as const,
        options: [
          { value: '', label: t('finance.budget_management_page.all') },
          { value: 'office', label: t('finance.budget_management_page.text_976cad') },
          { value: 'marketing', label: t('finance.budget_management_page.text_656113') },
          { value: 'development', label: t('finance.budget_management_page.text_6d566d') },
          { value: 'travel', label: t('finance.budget_management_page.text_2038cb') },
          { value: 'training', label: t('finance.budget_management_page.text_b11633') },
          { value: 'other', label: t('finance.budget_management_page.other') },
        ],
      },
    ],
    []
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <BackButton href={FINANCE_PATHS.dashboard} />
              <Box>
                <Typography
                  variant='h5'
                  sx={{
                    fontWeight: 700,
                    color: 'grey.900',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <TrendingUp
                    sx={{
                      width: 28,
                      height: 28,
                      mr: 1.5,
                      color: 'success.main',
                    }}
                  />
                  预算管理
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ mt: 0.5, color: 'grey.500' }}
                >
                  管理各部门预算，追踪预算使用情况
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ModeToggle />
              <Button
                variant='contained'
                onClick={() => setShowCreateModal(true)}
              >
                <Plus sx={{ width: 20, height: 20, mr: 1 }} />
                新增预算
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
        {/* 组织筛选 */}
        <Box sx={{ bgcolor: 'grey.200', borderRadius: 3, p: 2, mb: 3 }}>
          <OrganizationFilter
            value={organizationFilter}
            onChange={setOrganizationFilter}
            showCompany={true}
            showDepartment={true}
            showEmployee={false}
          />
        </Box>

        {/* 统计卡片 */}
        <Box sx={{ mb: 3 }}>
          <StatCardGroup
            stats={statCards}
            columns={3}
          />
        </Box>

        {/* 预算列表 */}
        <ListPageTemplate
          columns={columns}
          data={budgets}
          loading={loading}
          error={error}
          searchable
          searchPlaceholder={t('finance.budget_management_page.search')}
          filters={filters}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          rowActions={rowActions}
          batchActions={batchActions}
          showBatchActionBar
          onRefresh={() => {
            budgetsQuery.refetch();
            departmentsQuery.refetch();
          }}
          emptyMessage={t('finance.budget_management_page.no_data')}
        />
      </Box>

      {/* 创建预算弹窗 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新增预算</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
            <Box>
              <FormLabel htmlFor='department'>部门</FormLabel>
              <FormControl
                size='small'
                fullWidth
              >
                <Select
                  value={newBudget.department_id}
                  onChange={(e) =>
                    setNewBudget({
                      ...newBudget,
                      department_id: e.target.value,
                    })
                  }
                  displayEmpty
                >
                  <MenuItem
                    value=''
                    disabled
                  >
                    选择部门
                  </MenuItem>
                  {departments.map((dept) => (
                    <MenuItem
                      key={dept.id}
                      value={dept.id}
                    >
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box>
              <FormLabel htmlFor='type'>预算类型</FormLabel>
              <FormControl
                size='small'
                fullWidth
              >
                <Select
                  value={newBudget.budget_type}
                  onChange={(e) => setNewBudget({ ...newBudget, budget_type: e.target.value })}
                  displayEmpty
                >
                  <MenuItem
                    value=''
                    disabled
                  >
                    选择类型
                  </MenuItem>
                  <MenuItem value='office'>办公费</MenuItem>
                  <MenuItem value='marketing'>市场费</MenuItem>
                  <MenuItem value='development'>研发费</MenuItem>
                  <MenuItem value='travel'>差旅费</MenuItem>
                  <MenuItem value='training'>培训费</MenuItem>
                  <MenuItem value='other'>其他</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box>
              <FormLabel htmlFor='year'>财年</FormLabel>
              <TextField
                id='year'
                size='small'
                fullWidth
                type='text'
                value={newBudget.fiscal_year}
                onChange={(e) => setNewBudget({ ...newBudget, fiscal_year: e.target.value })}
                placeholder={t('finance.budget_management_page.text_8e0be6')}
              />
            </Box>

            <Box>
              <FormLabel htmlFor='amount'>预算金额</FormLabel>
              <TextField
                id='amount'
                size='small'
                fullWidth
                type='number'
                value={newBudget.total_budget}
                onChange={(e) =>
                  setNewBudget({
                    ...newBudget,
                    total_budget: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder={t('finance.budget_management_page.amount')}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleCreate}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑预算弹窗 */}
      <Dialog
        open={!!editingBudget}
        onClose={() => setEditingBudget(null)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑预算</DialogTitle>
        <DialogContent>
          {editingBudget && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
              <Box>
                <FormLabel htmlFor='edit-department'>部门</FormLabel>
                <FormControl
                  size='small'
                  fullWidth
                >
                  <Select
                    value={editingBudget.department_id || ''}
                    onChange={(e) =>
                      setEditingBudget({
                        ...editingBudget,
                        department_id: e.target.value || undefined,
                      })
                    }
                    displayEmpty
                  >
                    <MenuItem
                      value=''
                      disabled
                    >
                      选择部门
                    </MenuItem>
                    {departments.map((dept) => (
                      <MenuItem
                        key={dept.id}
                        value={dept.id}
                      >
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <FormLabel htmlFor='edit-type'>预算类型</FormLabel>
                <FormControl
                  size='small'
                  fullWidth
                >
                  <Select
                    value={editingBudget.budget_type || ''}
                    onChange={(e) =>
                      setEditingBudget({
                        ...editingBudget,
                        budget_type: e.target.value || undefined,
                      })
                    }
                    displayEmpty
                  >
                    <MenuItem
                      value=''
                      disabled
                    >
                      选择类型
                    </MenuItem>
                    <MenuItem value='office'>办公费</MenuItem>
                    <MenuItem value='marketing'>市场费</MenuItem>
                    <MenuItem value='development'>研发费</MenuItem>
                    <MenuItem value='travel'>差旅费</MenuItem>
                    <MenuItem value='training'>培训费</MenuItem>
                    <MenuItem value='other'>其他</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <FormLabel htmlFor='edit-year'>财年</FormLabel>
                <TextField
                  id='edit-year'
                  size='small'
                  fullWidth
                  type='text'
                  value={editingBudget.fiscal_year}
                  onChange={(e) =>
                    setEditingBudget({
                      ...editingBudget,
                      fiscal_year: e.target.value,
                    })
                  }
                />
              </Box>

              <Box>
                <FormLabel htmlFor='edit-total'>预算总额</FormLabel>
                <TextField
                  id='edit-total'
                  size='small'
                  fullWidth
                  type='number'
                  value={editingBudget.total_budget}
                  onChange={(e) =>
                    setEditingBudget({
                      ...editingBudget,
                      total_budget: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Box>

              <Box>
                <FormLabel htmlFor='edit-used'>已使用金额</FormLabel>
                <TextField
                  id='edit-used'
                  size='small'
                  fullWidth
                  type='number'
                  value={editingBudget.used_amount}
                  onChange={(e) =>
                    setEditingBudget({
                      ...editingBudget,
                      used_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Box>

              <Box>
                <FormLabel htmlFor='edit-status'>状态</FormLabel>
                <FormControl
                  size='small'
                  fullWidth
                >
                  <Select
                    value={editingBudget.status}
                    onChange={(e) =>
                      setEditingBudget({
                        ...editingBudget,
                        status: e.target.value,
                      })
                    }
                  >
                    <MenuItem value='active'>执行中</MenuItem>
                    <MenuItem value='frozen'>已冻结</MenuItem>
                    <MenuItem value='exhausted'>已耗尽</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setEditingBudget(null)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleUpdate}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 批量更新状态弹窗 */}
      <Dialog
        open={showBatchStatusModal}
        onClose={() => setShowBatchStatusModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>批量更新状态</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <FormLabel htmlFor='batch_status'>选择新状态</FormLabel>
              <FormControl
                size='small'
                fullWidth
              >
                <Select
                  value={batchStatus}
                  onChange={(e) => setBatchStatus(e.target.value)}
                  displayEmpty
                >
                  <MenuItem
                    value=''
                    disabled
                  >
                    请选择状态
                  </MenuItem>
                  <MenuItem value='active'>进行中</MenuItem>
                  <MenuItem value='frozen'>已冻结</MenuItem>
                  <MenuItem value='exhausted'>已耗尽</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Typography
              variant='body2'
              sx={{ color: 'grey.500' }}
            >
              将批量更新{' '}
              <Box
                component='span'
                sx={{ fontWeight: 600 }}
              >
                {selectedIds.length}
              </Box>{' '}
              条预算的状态
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ mt: 2 }}>
          <Button
            variant='outlined'
            onClick={() => {
              setShowBatchStatusModal(false);
              setBatchStatus('');
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={confirmBatchUpdateStatus}
            disabled={!batchStatus}
          >
            确认更新
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default BudgetManagementPage;
