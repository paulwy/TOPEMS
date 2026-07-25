import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { budgetSchema } from '@/schemas/finance/budget';
import { budgetApi, type Budget } from '@/api/erp';
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

const FinanceBudgetStats: React.FC = () => {
  const { data } = useQuery({
    queryKey: [QUERY_KEYS.ERP.BUDGET, 'stats'],
    queryFn: async () => {
      const response = await budgetApi.list({ page: 0, pagesize: 1000 });
      if (!response.success) throw new Error('加载预算统计失败');
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
      label: '预算总额',
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
      label: '已使用',
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
      label: '剩余预算',
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
      label: '平均使用率',
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
      label: '活跃预算',
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
      label: '已完成',
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
      label: '已冻结',
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
      label: '已过期',
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
                sx={{ color: 'slate.600', fontSize: '0.875rem' }}
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

const budgetApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await budgetApi.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
    } as Parameters<typeof budgetApi.list>[0]);
    if (!response.success) {
      throw new Error('加载预算列表失败');
    }
    const data = response.data;
    return {
      data: (data?.items || []) as unknown as Record<string, unknown>[],
      total: data?.total || 0,
    };
  },

  create: async (data) => {
    const response = await budgetApi.create(data as Parameters<typeof budgetApi.create>[0]);
    if (!response.success) {
      throw new Error('创建预算失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await budgetApi.update(id, data as Parameters<typeof budgetApi.update>[1]);
    if (!response.success) {
      throw new Error('更新预算失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await budgetApi.delete(id);
    if (!response.success) {
      throw new Error('删除预算失败');
    }
  },
};

const FinanceBudgetPage: React.FC = () => {
  return (
    <CrudPage
      schema={budgetSchema}
      apiAdapter={budgetApiAdapter}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: '财务', href: '/finance' },
        { label: '预算管理' },
      ]}
      headerContent={<FinanceBudgetStats />}
    />
  );
};

export default FinanceBudgetPage;
