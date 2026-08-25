import { designTokens } from '@topems/tokens';
import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { getBudgetSchema } from '@/schemas/finance/budget';
import { budgetApi } from '@/api/erp';
import type { Budget } from '@/api/finance';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import {
  DollarSign,
  PieChart,
  CheckCircle2,
  Calendar,
  FileText,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const FinanceBudgetStats: React.FC = () => {
  const { t } = useTranslation('finance');
  const { data } = useQuery({
    queryKey: [QUERY_KEYS.ERP.BUDGET, 'stats'],
    queryFn: async () => {
      const response = await budgetApi.list({ page: 0, pagesize: 1000 });
      if (!response.success) throw new Error(t('finance.finance_budget_page.k0'));
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const budgets: Budget[] = data?.items || [];
  const totalBudget = budgets.reduce((sum, b) => sum + (b.total_budget || 0), 0);
  const totalUsed = budgets.reduce((sum, b) => sum + (b.used_amount || 0), 0);
  const totalRemaining = budgets.reduce((sum, b) => sum + (b.remaining_amount || 0), 0);
  const avgUsageRate =
    budgets.length > 0
      ? budgets.reduce((sum, b) => sum + (b.usage_rate || 0), 0) / budgets.length
      : 0;
  const activeBudgets = budgets.filter((b) => b.status === 'active').length;
  const completedBudgets = budgets.filter((b) => b.status === 'completed').length;
  const frozenBudgets = budgets.filter((b) => b.status === 'frozen').length;
  const expiredBudgets = budgets.filter((b) => b.status === 'expired').length;

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const statCards = [
    {
      label: t('finance.finance_budget_page.k1'),
      value: formatCurrency(totalBudget),
      color: 'primary.lighter',
      textColor: 'text.secondary',
      icon: (
        <DollarSign
          size={20}
          color='primary.main'
        />
      ),
    },
    {
      label: t('finance.finance_budget_page.k2'),
      value: formatCurrency(totalUsed),
      color: 'warning.lighter',
      textColor: 'warning.dark',
      icon: (
        <PieChart
          size={20}
          color='warning.dark'
        />
      ),
    },
    {
      label: t('finance.finance_budget_page.k3'),
      value: formatCurrency(totalRemaining),
      color: 'success.lighter',
      textColor: 'success.dark',
      icon: (
        <CheckCircle2
          size={20}
          color='success.dark'
        />
      ),
    },
    {
      label: t('finance.finance_budget_page.k4'),
      value: formatPercent(avgUsageRate),
      color: 'secondary.light',
      textColor: 'text.secondary',
      icon: (
        <Calendar
          size={20}
          color='primary.light'
        />
      ),
    },
    {
      label: t('finance.finance_budget_page.k5'),
      value: activeBudgets,
      color: 'success.lighter',
      textColor: 'success.dark',
      icon: (
        <CheckCircle2
          size={20}
          color='success.dark'
        />
      ),
    },
    {
      label: t('finance.finance_budget_page.k6'),
      value: completedBudgets,
      color: 'primary.lighter',
      textColor: 'primary.dark',
      icon: (
        <FileText
          size={20}
          color='primary.dark'
        />
      ),
    },
    {
      label: t('finance.finance_budget_page.k7'),
      value: frozenBudgets,
      color: 'grey.100',
      textColor: 'text.secondary',
      icon: (
        <XCircle
          size={20}
          color='info.dark'
        />
      ),
    },
    {
      label: t('finance.finance_budget_page.k8'),
      value: expiredBudgets,
      color: 'error.lighter',
      textColor: 'error.dark',
      icon: (
        <AlertCircle
          size={20}
          color='error.dark'
        />
      ),
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          md: 'repeat(4, 1fr)',
        },
        gap: 2,
        mb: 3,
      }}
    >
      {statCards.map((stat) => (
        <Box
          key={stat.label}
          sx={{ p: 2, bgcolor: stat.color, borderRadius: 3 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'action.hover',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {stat.icon}
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{
                  color: 'slate.600',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {stat.label}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stat.value}
              </Typography>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const budgetApiAdapter = createCrudPageAdapter(budgetApi);

const FinanceBudgetPage: React.FC = () => {
  const { t } = useTranslation('finance');
  return (
    <CrudPage
      schema={getBudgetSchema()}
      apiAdapter={budgetApiAdapter}
      breadcrumbs={[
        { label: t('finance.finance_budget_page.k13'), href: '/dashboard' },
        { label: t('finance.finance_budget_page.k14'), href: '/finance' },
        { label: t('finance.finance_budget_page.k15') },
      ]}
      headerContent={<FinanceBudgetStats />}
    />
  );
};

export default FinanceBudgetPage;
