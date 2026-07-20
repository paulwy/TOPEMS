import React, { useState, useMemo } from 'react';
import { designTokens } from '@/theme/tokens';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  Building2,
  DollarSign,
  PieChart,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar,
  FileText,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { budgetApi, type Budget, type PaginatedResult } from '@/api/erp';
import { financeApi } from '@/api/finance';
import type { AccountBalance } from '@/types/finance';
import { useNotificationStore } from '@/store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCrudOperations, type CrudOperations } from '@/hooks/useCrudQueries';
import {
  Typography,
  Box,
  IconButton,
  LinearProgress,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import { ListPageTemplate, StatCardGroup } from '@/components';
import OrganizationFilter, {
  type OrganizationFilterValue,
} from '@/components/ui/OrganizationFilter';
import { StatsChart } from '@/components/bi/StatsChart';
import { apiLogger } from '@/utils/logger';
import {
  ActionButton,
  FormField,
  FormSelect,
  Dialog,
  ConfirmDialog,
  StatusBadge,
  PageContainer,
} from '@/components/common';

const ct = designTokens.colors;

const FinanceBudgetPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [organizationFilter, setOrganizationFilter] = useState<OrganizationFilterValue>({});
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    department_id: '',
    budget_type: 'operating',
    fiscal_year: new Date().getFullYear().toString(),
    total_budget: '',
    status: 'active',
  });

  const {
    data: budgets,
    loading: budgetsLoading,
    create: createBudget,
    update: updateBudget,
    delete: deleteBudget,
    fetch: fetchBudgets,
  } = useCrudOperations<Budget>({
    api: budgetApi as unknown as CrudOperations<Budget>,
    queryKey: 'finance-budgets',
    defaultPageSize: 50,
  });

  const accountBalancesQuery = useQuery({
    queryKey: ['finance-account-balances'],
    queryFn: async () => {
      const periodRes = await financeApi.period.getCurrent();
      if (periodRes.success && periodRes.data) {
        const balancesRes = await financeApi.account.getBalances({
          period: periodRes.data.period,
        });
        if (balancesRes.success && balancesRes.data) {
          return balancesRes.data;
        }
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const accountBalances = accountBalancesQuery.data || [];
  const loading = budgetsLoading || accountBalancesQuery.isLoading;
  const error = budgetsLoading ? undefined : (accountBalancesQuery.error as Error)?.message;

  const handleCreate = async () => {
    try {
      const data = {
        ...formData,
        total_budget: parseFloat(formData.total_budget),
      };
      const result = await createBudget(data as unknown as Record<string, unknown>);
      if (result) {
        setShowCreateDialog(false);
        resetForm();
      }
    } catch (err: unknown) {
      // 错误已在 mutation 中处理
    }
  };

  const handleUpdate = async () => {
    if (!editingBudget) return;
    try {
      const data = {
        ...formData,
        total_budget: parseFloat(formData.total_budget),
      };
      const result = await updateBudget(editingBudget.id, data as unknown as Record<string, unknown>);
      if (result) {
        setEditingBudget(null);
        setShowCreateDialog(false);
        resetForm();
      }
    } catch (err: unknown) {
      // 错误已在 mutation 中处理
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteBudget(deletingId);
    } catch (err: unknown) {
      // 错误已在 mutation 中处理
    }
  };

  const openEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      department_id: budget.department_id || '',
      budget_type: budget.budget_type || 'operating',
      fiscal_year: budget.fiscal_year || new Date().getFullYear().toString(),
      total_budget: budget.total_budget.toString(),
      status: budget.status,
    });
    setShowCreateDialog(true);
  };

  const openDetailDialog = (budget: Budget) => {
    setSelectedBudget(budget);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setFormData({
      department_id: '',
      budget_type: 'operating',
      fiscal_year: new Date().getFullYear().toString(),
      total_budget: '',
      status: 'active',
    });
  };

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const filteredBudgets = budgets.filter((budget) => {
    const matchesSearch =
      budget.budget_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      budget.fiscal_year?.includes(searchTerm);
    const matchesType = !filterType || budget.budget_type === filterType;
    const matchesStatus = !filterStatus || budget.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalBudget = budgets.reduce((sum, b) => sum + b.total_budget, 0);
  const totalUsed = budgets.reduce((sum, b) => sum + (b.used_amount || 0), 0);
  const totalRemaining = budgets.reduce((sum, b) => sum + (b.remaining_amount || 0), 0);
  const avgUsageRate =
    budgets.length > 0
      ? budgets.reduce((sum, b) => sum + (b.usage_rate || 0), 0) / budgets.length
      : 0;

  // 预算统计数据
  const budgetStats = useMemo(
    () => ({
      totalBudget,
      totalUsed,
      totalRemaining,
      avgUsageRate,
      activeBudgets: budgets.filter((b) => b.status === 'active').length,
      completedBudgets: budgets.filter((b) => b.status === 'completed').length,
      frozenBudgets: budgets.filter((b) => b.status === 'frozen').length,
      expiredBudgets: budgets.filter((b) => b.status === 'expired').length,
    }),
    [budgets, totalBudget, totalUsed, totalRemaining, avgUsageRate]
  );

  // 统计卡片数据
  const statCards = useMemo(
    () => [
      {
        title: t('finance.finance_budget_page.text_b91eb1'),
        value: formatCurrency(budgetStats.totalBudget),
        icon: <DollarSign size={24} />,
        color: 'primary' as const,
      },
      {
        title: t('finance.finance_budget_page.text_b59b00'),
        value: formatCurrency(budgetStats.totalUsed),
        icon: <PieChart size={24} />,
        color: 'warning' as const,
      },
      {
        title: t('finance.finance_budget_page.text_3f2783'),
        value: formatCurrency(budgetStats.totalRemaining),
        icon: <CheckCircle2 size={24} />,
        color: 'success' as const,
      },
      {
        title: t('finance.finance_budget_page.text_bf99c1'),
        value: formatPercent(budgetStats.avgUsageRate),
        icon: <Calendar size={24} />,
        color: 'secondary' as const,
      },
      {
        title: t('finance.finance_budget_page.text_e5f5f7'),
        value: budgetStats.activeBudgets,
        icon: <CheckCircle2 size={24} />,
        color: 'success' as const,
      },
      {
        title: t('finance.finance_budget_page.completed'),
        value: budgetStats.completedBudgets,
        icon: <FileText size={24} />,
        color: 'primary' as const,
      },
      {
        title: t('finance.finance_budget_page.text_416804'),
        value: budgetStats.frozenBudgets,
        icon: <XCircle size={24} />,
        color: 'info' as const,
      },
      {
        title: t('finance.finance_budget_page.text_9e6eab'),
        value: budgetStats.expiredBudgets,
        icon: <AlertCircle size={24} />,
        color: 'error' as const,
      },
    ],
    [budgetStats]
  );

  // 预算类型分布数据
  const budgetTypeData = useMemo(
    () => [
      {
        name: t('finance.finance_budget_page.text_e9e771'),
        value: budgets
          .filter((b) => b.budget_type === 'operating')
          .reduce((sum, b) => sum + b.total_budget, 0),
        color: 'primary.main',
      },
      {
        name: t('finance.finance_budget_page.text_2fc835'),
        value: budgets
          .filter((b) => b.budget_type === 'capital')
          .reduce((sum, b) => sum + b.total_budget, 0),
        color: 'success.dark',
      },
      {
        name: t('finance.finance_budget_page.text_fa2986'),
        value: budgets
          .filter((b) => b.budget_type === 'project')
          .reduce((sum, b) => sum + b.total_budget, 0),
        color: 'warning.main',
      },
      {
        name: t('finance.finance_budget_page.text_fb0bc4'),
        value: budgets
          .filter((b) => b.budget_type === 'marketing')
          .reduce((sum, b) => sum + b.total_budget, 0),
        color: 'error.main',
      },
      {
        name: t('finance.finance_budget_page.text_859388'),
        value: budgets
          .filter((b) => b.budget_type === 'personnel')
          .reduce((sum, b) => sum + b.total_budget, 0),
        color: 'secondary.main',
      },
    ],
    [budgets]
  );

  // 预算状态分布数据
  const budgetStatusData = useMemo(
    () => [
      {
        name: t('finance.finance_budget_page.text_46e386'),
        value: budgets.filter((b) => b.status === 'active').length,
        color: 'success.dark',
      },
      {
        name: t('finance.finance_budget_page.completed_1'),
        value: budgets.filter((b) => b.status === 'completed').length,
        color: 'primary.main',
      },
      {
        name: t('finance.finance_budget_page.text_92cff4'),
        value: budgets.filter((b) => b.status === 'frozen').length,
        color: 'grey.400',
      },
      {
        name: t('finance.finance_budget_page.text_4d5ccd'),
        value: budgets.filter((b) => b.status === 'expired').length,
        color: 'error.main',
      },
    ],
    [budgets]
  );

  const getStatusChip = (status: string) => {
    const variants: Record<
      string,
      { color: 'success' | 'error' | 'default' | 'warning'; label: string }
    > = {
      active: { color: 'success', label: t('finance.finance_budget_page.text_46e386') },
      expired: { color: 'error', label: t('finance.finance_budget_page.text_4d5ccd') },
      frozen: { color: 'default', label: t('finance.finance_budget_page.text_92cff4') },
      completed: { color: 'warning', label: t('finance.finance_budget_page.completed_1') },
    };
    const config = variants[status as keyof typeof variants] || variants.active;
    return (
      <StatusBadge
        status={status}
        label={config.label}
        color={config.color}
      />
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      operating: t('finance.finance_budget_page.text_e9e771'),
      capital: t('finance.finance_budget_page.text_2fc835'),
      project: t('finance.finance_budget_page.text_fa2986'),
      marketing: t('finance.finance_budget_page.text_fb0bc4'),
      personnel: t('finance.finance_budget_page.text_859388'),
    };
    return labels[type] || type;
  };

  // 列定义
  const columns = useMemo(
    () => [
      {
        id: 'budget_type',
        label: t('finance.finance_budget_page.type'),
        render: (row: Budget) => (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Building2
              sx={{
                width: 16,
                height: 16,
                mr: 2,
                color: 'grey.400',
              }}
            />
            {getTypeLabel(row.budget_type || '')}
          </Box>
        ),
      },
      {
        id: 'fiscal_year',
        label: t('finance.finance_budget_page.text_58d7d9'),
        render: (row: Budget) => <Box sx={{ color: 'text.secondary' }}>{row.fiscal_year}</Box>,
      },
      {
        id: 'total_budget',
        label: t('finance.finance_budget_page.amount'),
        align: 'right' as const,
        render: (row: Budget) => (
          <Box sx={{ fontWeight: 'medium' }}>{formatCurrency(row.total_budget)}</Box>
        ),
      },
      {
        id: 'used_amount',
        label: t('finance.finance_budget_page.text_b59b00'),
        align: 'right' as const,
        render: (row: Budget) => (
          <Box sx={{ color: 'warning.main' }}>{formatCurrency(row.used_amount || 0)}</Box>
        ),
      },
      {
        id: 'remaining_amount',
        label: t('finance.finance_budget_page.text_43b510'),
        align: 'right' as const,
        render: (row: Budget) => (
          <Box sx={{ color: 'success.main' }}>{formatCurrency(row.remaining_amount || 0)}</Box>
        ),
      },
      {
        id: 'usage_rate',
        label: t('finance.finance_budget_page.text_41d8b2'),
        render: (row: Budget) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box sx={{ flex: 1, maxWidth: 100 }}>
              <LinearProgress
                variant='determinate'
                value={row.usage_rate || 0}
                sx={{ height: 8, borderRadius: 1 }}
              />
            </Box>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ width: 50 }}
            >
              {formatPercent(row.usage_rate || 0)}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'status',
        label: t('finance.finance_budget_page.status'),
        render: (row: Budget) => getStatusChip(row.status),
      },
    ],
    []
  );

  // 行操作
  const rowActions = useMemo(
    () => [
      {
        label: t('finance.finance_budget_page.view_detail'),
        icon: <Eye sx={{ width: 16, height: 16 }} />,
        onClick: (row: Budget) => openDetailDialog(row),
      },
      {
        label: t('finance.finance_budget_page.edit'),
        icon: <Edit2 sx={{ width: 16, height: 16 }} />,
        onClick: (row: Budget) => openEditDialog(row),
      },
      {
        label: t('finance.finance_budget_page.delete'),
        icon: <Trash2 sx={{ width: 16, height: 16 }} />,
        color: 'error' as const,
        onClick: (row: Budget) => handleDeleteClick(row.id),
      },
    ],

    []
  );

  // 筛选器配置
  const filters = useMemo(
    () => [
      {
        id: 'budget_type',
        label: t('finance.finance_budget_page.type_1'),
        type: 'select' as const,
        options: [
          { value: 'operating', label: t('finance.finance_budget_page.text_e9e771') },
          { value: 'capital', label: t('finance.finance_budget_page.text_2fc835') },
          { value: 'project', label: t('finance.finance_budget_page.text_fa2986') },
          { value: 'marketing', label: t('finance.finance_budget_page.text_fb0bc4') },
          { value: 'personnel', label: t('finance.finance_budget_page.text_859388') },
        ],
        value: filterType,
        onChange: (value: unknown) => setFilterType(value as string),
      },
      {
        id: 'status',
        label: t('finance.finance_budget_page.status'),
        type: 'select' as const,
        options: [
          { value: 'active', label: t('finance.finance_budget_page.text_46e386') },
          { value: 'completed', label: t('finance.finance_budget_page.completed_1') },
          { value: 'frozen', label: t('finance.finance_budget_page.text_92cff4') },
          { value: 'expired', label: t('finance.finance_budget_page.text_4d5ccd') },
        ],
        value: filterStatus,
        onChange: (value: unknown) => setFilterStatus(value as string),
      },
    ],
    [filterType, filterStatus]
  );

  return (
    <PageContainer
      title={t('finance.finance_budget_page.list')}
      subtitle=''
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography
            variant='h4'
            sx={{ fontWeight: 'bold' }}
          >
            预算管理
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 0.5 }}
          >
            管理企业各项预算的分配与执行情况
          </Typography>
        </Box>
        <ActionButton
          label={t('finance.finance_budget_page.add')}
          icon={<Plus size={16} />}
          variant='primary'
          onClick={() => {
            setEditingBudget(null);
            resetForm();
            setShowCreateDialog(true);
          }}
        />
      </Box>

      <Box sx={{ bgcolor: 'grey.100', borderRadius: 1, p: 2, mb: 3 }}>
        <OrganizationFilter
          value={organizationFilter}
          onChange={setOrganizationFilter}
          showCompany={true}
          showDepartment={true}
          showEmployee={false}
        />
      </Box>

      {/* 统计卡片 */}
      <StatCardGroup
        stats={statCards}
        columns={4}
      />

      {/* 图表区域 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
          gap: 3,
        }}
      >
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography
              variant='h6'
              sx={{ fontWeight: 'semibold' }}
              gutterBottom
            >
              预算类型分布
            </Typography>
            <StatsChart
              type='pie'
              data={budgetTypeData}
              height={250}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography
              variant='h6'
              sx={{ fontWeight: 'semibold' }}
              gutterBottom
            >
              预算状态分布
            </Typography>
            <StatsChart
              type='pie'
              data={budgetStatusData}
              height={250}
            />
          </CardContent>
        </Card>
      </Box>

      {/* 预算列表 */}
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredBudgets}
        loading={loading}
        error={error}
        searchable
        searchPlaceholder={t('finance.finance_budget_page.search')}
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        filters={filters}
        filtersValue={{
          budget_type: filterType,
          status: filterStatus,
        }}
        onFilterChange={(filterValues) => {
          if (filterValues.budget_type !== undefined)
            setFilterType(filterValues.budget_type as string);
          if (filterValues.status !== undefined) setFilterStatus(filterValues.status as string);
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        rowActions={rowActions}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['finance-budgets'] });
        }}
        emptyMessage={t('finance.finance_budget_page.no_data')}
        emptyIcon={<AlertCircle sx={{ width: 48, height: 48, color: 'grey.300' }} />}
        actions={[
          {
            label: t('finance.finance_budget_page.refresh'),
            icon: <RefreshCw sx={{ width: 16, height: 16 }} />,
            variant: 'outlined',
            onClick: () => {
              queryClient.invalidateQueries({ queryKey: ['finance-budgets'] });
            },
          },
        ]}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title={editingBudget ? t('finance.finance_budget_page.edit_1') : t('finance.finance_budget_page.add')}
        cancelButton={{
          label: t('finance.finance_budget_page.cancel'),
          onClick: () => {
            setShowCreateDialog(false);
            setEditingBudget(null);
            resetForm();
          },
        }}
        confirmButton={{
          label: editingBudget ? t('finance.finance_budget_page.update') : t('finance.finance_budget_page.create'),
          onClick: editingBudget ? handleUpdate : handleCreate,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormSelect
            name='budget_type'
            label={t('finance.finance_budget_page.type')}
            value={formData.budget_type}
            onChange={(value: string | number | string[]) =>
              setFormData({ ...formData, budget_type: value as string })
            }
            options={[
              { value: 'operating', label: t('finance.finance_budget_page.text_e9e771') },
              { value: 'capital', label: t('finance.finance_budget_page.text_2fc835') },
              { value: 'project', label: t('finance.finance_budget_page.text_fa2986') },
              { value: 'marketing', label: t('finance.finance_budget_page.text_fb0bc4') },
              { value: 'personnel', label: t('finance.finance_budget_page.text_859388') },
            ]}
          />
          <FormField
            name='fiscal_year'
            label={t('finance.finance_budget_page.text_58d7d9')}
            type='number'
            value={formData.fiscal_year}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, fiscal_year: e.target.value })
            }
          />
          <FormField
            name='total_budget'
            label={t('finance.finance_budget_page.amount')}
            type='number'
            value={formData.total_budget}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, total_budget: e.target.value })
            }
          />
          <FormSelect
            name='status'
            label={t('finance.finance_budget_page.status')}
            value={formData.status}
            onChange={(value: string | number | string[]) =>
              setFormData({ ...formData, status: value as string })
            }
            options={[
              { value: 'active', label: t('finance.finance_budget_page.text_46e386') },
              { value: 'completed', label: t('finance.finance_budget_page.completed_1') },
              { value: 'frozen', label: t('finance.finance_budget_page.text_92cff4') },
              { value: 'expired', label: t('finance.finance_budget_page.text_4d5ccd') },
            ]}
          />
        </Box>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        title={t('finance.finance_budget_page.detail')}
      >
        {selectedBudget && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 2,
              }}
            >
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  预算类型
                </Typography>
                <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
                  {getTypeLabel(selectedBudget.budget_type || '')}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  预算年度
                </Typography>
                <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
                  {selectedBudget.fiscal_year}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                p: 2,
                bgcolor: `linear-gradient(to right, primary.light, ${ct.primary[50]})`,
                borderRadius: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  预算金额
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 'bold' }}
                  color='primary'
                >
                  {formatCurrency(selectedBudget.total_budget)}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    已使用
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 'bold' }}
                    color='warning.main'
                  >
                    {formatCurrency(selectedBudget.used_amount || 0)}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    剩余预算
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 'bold' }}
                    color='success.main'
                  >
                    {formatCurrency(selectedBudget.remaining_amount || 0)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  使用进度
                </Typography>
                <Typography sx={{ fontWeight: 'medium' }}>
                  {formatPercent(selectedBudget.usage_rate || 0)}
                </Typography>
              </Box>
              <LinearProgress
                variant='determinate'
                value={selectedBudget.usage_rate || 0}
                sx={{ height: 16, borderRadius: 1 }}
              />
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 1,
              }}
            >
              <Typography
                variant='body2'
                color='text.secondary'
              >
                状态
              </Typography>
              {getStatusChip(selectedBudget.status)}
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                typography: 'body2',
                color: 'text.secondary',
              }}
            >
              <span>创建时间: {new Date(selectedBudget.created_at).toLocaleDateString()}</span>
              <span>更新时间: {new Date(selectedBudget.updated_at).toLocaleDateString()}</span>
            </Box>
          </Box>
        )}
      </Dialog>
    </PageContainer>
  );
};

export default FinanceBudgetPage;
