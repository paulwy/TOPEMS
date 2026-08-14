import React, { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Button, InputBase } from '@mui/material';
import {
  DollarSign,
  FileText,
  TrendingUp,
  Calculator,
  Download,
  Users,
  CreditCard,
  Receipt,
  Clock,
  CheckCircle,
  BadgeDollarSign,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { MuiStatCard as StatCard } from '@/components';
import { StatsChart } from '@/components/bi/StatsChart';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { payrollApi, salaryAdjustmentApi, type PayrollRun, type SalaryAdjustment } from '@/api/hrm';
import { payrollSchema, salaryAdjustmentSchema } from '@/schemas/hrm';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const ct = designTokens.colors;

const HrmPayrollPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const calculateMutation = useMemo(
    () => ({
      mutate: async (runId: string) => {
        try {
          await payrollApi.calculate(runId);
          addNotification({
            type: 'success',
            title: t('hrm.hrm_payroll_page.completed'),
            message: t('hrm.hrm_payroll_page.completed'),
          });
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AD_HOC.HRM_PAYROLL_BASE,
            exact: false,
            refetchType: 'active',
          });
        } catch {
          addNotification({
            type: 'error',
            title: t('hrm.hrm_payroll_page.fail'),
            message: t('hrm.hrm_payroll_page.fail'),
          });
        }
      },
    }),
    [addNotification, queryClient, t]
  );

  const payMutation = useMemo(
    () => ({
      mutate: async (runId: string) => {
        try {
          await payrollApi.pay(runId);
          addNotification({
            type: 'success',
            title: t('hrm.hrm_payroll_page.completed_1'),
            message: t('hrm.hrm_payroll_page.completed_1'),
          });
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AD_HOC.HRM_PAYROLL_BASE,
            exact: false,
            refetchType: 'active',
          });
        } catch {
          addNotification({
            type: 'error',
            title: t('hrm.hrm_payroll_page.fail_1'),
            message: t('hrm.hrm_payroll_page.fail_1'),
          });
        }
      },
    }),
    [addNotification, queryClient, t]
  );

  const payrollAdapter: CrudApiAdapter<PayrollRun> = {
    list: async (params) => {
      const res = await payrollApi.list(params as unknown as Parameters<typeof payrollApi.list>[0]);
      if (res.success && res.data) {
        return { data: res.data.items, total: res.data.total };
      }
      return { data: [], total: 0 };
    },
    create: async (data) => {
      const res = await payrollApi.create(data as { pay_period: string });
      if (res.success && res.data) {
        addNotification({
          title: t('hrm.hrm_payroll_page.k1'),
          message: t('hrm.hrm_payroll_page.k0'),
          type: 'success',
        });
        return res.data;
      }
      throw new Error(res.message || t('hrm.hrm_payroll_page.k2'));
    },
    update: async (id, data) => {
      const res = await (
        payrollApi as unknown as {
          update: (
            id: string,
            data: unknown
          ) => Promise<{ success?: boolean; data?: PayrollRun; message?: string }>;
        }
      ).update(id, data);
      if (res.success && res.data) {
        addNotification({
          title: t('hrm.hrm_payroll_page.k4'),
          message: t('hrm.hrm_payroll_page.k3'),
          type: 'success',
        });
        return res.data;
      }
      throw new Error(res.message || t('hrm.hrm_payroll_page.k5'));
    },
    delete: async (id) => {
      const res = await payrollApi.delete(id);
      if (res.success) {
        addNotification({
          title: t('hrm.hrm_payroll_page.k7'),
          message: t('hrm.hrm_payroll_page.k6'),
          type: 'success',
        });
      } else {
        throw new Error(res.message || t('hrm.hrm_payroll_page.k8'));
      }
    },
  };

  const salaryAdjustmentAdapter: CrudApiAdapter<SalaryAdjustment> = {
    list: async (params) => {
      const res = await salaryAdjustmentApi.list(
        params as unknown as Parameters<typeof salaryAdjustmentApi.list>[0]
      );
      if (res.success && res.data) {
        return { data: res.data.items, total: res.data.total };
      }
      return { data: [], total: 0 };
    },
    create: async (data) => {
      const res = await salaryAdjustmentApi.create(data as Partial<SalaryAdjustment>);
      if (res.success && res.data) {
        addNotification({
          title: t('hrm.hrm_payroll_page.k10'),
          message: t('hrm.hrm_payroll_page.k9'),
          type: 'success',
        });
        return res.data;
      }
      throw new Error(res.message || t('hrm.hrm_payroll_page.k11'));
    },
    update: async (id, data) => {
      const res = await salaryAdjustmentApi.update(id, data as Partial<SalaryAdjustment>);
      if (res.success && res.data) {
        addNotification({
          title: t('hrm.hrm_payroll_page.k13'),
          message: t('hrm.hrm_payroll_page.k12'),
          type: 'success',
        });
        return res.data;
      }
      throw new Error(res.message || t('hrm.hrm_payroll_page.k14'));
    },
    delete: async (id) => {
      const res = await salaryAdjustmentApi.delete(id);
      if (res.success) {
        addNotification({
          title: t('hrm.hrm_payroll_page.k16'),
          message: t('hrm.hrm_payroll_page.k15'),
          type: 'success',
        });
      } else {
        throw new Error(res.message || t('hrm.hrm_payroll_page.k17'));
      }
    },
  };

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'calculate',
        label: i18n.t('hrm.hrm_payroll_page.text_ed8d89'),
        icon: <Calculator size={16} />,
        color: 'success',
        show: (row: Record<string, unknown>) => row.status === 'draft',
        onClick: (row: Record<string, unknown>) => calculateMutation.mutate(row.id as string),
      },
      {
        key: 'pay',
        label: i18n.t('hrm.hrm_payroll_page.text_df6e5e'),
        icon: <CreditCard size={16} />,
        color: 'success',
        show: (row: Record<string, unknown>) => row.status === 'calculated',
        onClick: (row: Record<string, unknown>) => payMutation.mutate(row.id as string),
      },
    ],
    [t, calculateMutation, payMutation]
  );

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const renderHeaderContent = (rows: PayrollRun[]) => {
    const totalAmount = rows.reduce((sum, run) => sum + Number(run.total_amount || 0), 0);
    const totalEmployees = rows.reduce((sum, run) => sum + (run.employee_count || 0), 0);
    const avgSalary = totalEmployees > 0 ? (totalAmount * 0.9) / totalEmployees : 0;
    const pendingRuns = rows.filter((r) => r.status === 'draft').length;
    const paidRuns = rows.filter((r) => r.status === 'paid').length;

    const statCards = [
      {
        title: t('hrm.hrm_payroll_page.text_5adbd7'),
        value: totalEmployees,
        unit: t('hrm.hrm_payroll_page.text_465afe'),
        icon: <Users sx={{ width: 20, height: 20 }} />,
        color: 'primary' as const,
      },
      {
        title: t('hrm.hrm_payroll_page.text_c82ad3'),
        value: formatCurrency(totalAmount * 0.6),
        icon: <DollarSign sx={{ width: 20, height: 20 }} />,
        color: 'success' as const,
      },
      {
        title: t('hrm.hrm_payroll_page.text_a3ad89'),
        value: formatCurrency(totalAmount * 0.2),
        icon: <TrendingUp sx={{ width: 20, height: 20 }} />,
        color: 'secondary' as const,
      },
      {
        title: t('hrm.hrm_payroll_page.text_48e9fd'),
        value: formatCurrency(totalAmount * 0.9),
        icon: <CreditCard sx={{ width: 20, height: 20 }} />,
        color: 'primary' as const,
      },
      {
        title: t('hrm.hrm_payroll_page.text_f0f769'),
        value: formatCurrency(avgSalary),
        icon: <Receipt sx={{ width: 20, height: 20 }} />,
        color: 'info' as const,
      },
      {
        title: t('hrm.hrm_payroll_page.text_480381'),
        value: pendingRuns,
        icon: <Clock sx={{ width: 20, height: 20 }} />,
        color: 'warning' as const,
      },
      {
        title: t('hrm.hrm_payroll_page.text_b0fa63'),
        value: paidRuns,
        icon: <CheckCircle sx={{ width: 20, height: 20 }} />,
        color: 'success' as const,
      },
    ];

    const salaryCompositionData = [
      { name: t('hrm.hrm_payroll_page.text_d0e803'), value: 60, color: 'primary.main' },
      { name: t('hrm.hrm_payroll_page.text_f41af7'), value: 15, color: 'success.dark' },
      { name: t('hrm.hrm_payroll_page.text_805400'), value: 10, color: 'warning.main' },
      { name: t('hrm.hrm_payroll_page.text_3d6bd6'), value: 8, color: 'error.main' },
      { name: t('hrm.hrm_payroll_page.text_b7432c'), value: 7, color: 'secondary.main' },
    ];

    const payrollStatusData = [
      {
        name: t('hrm.hrm_payroll_page.text_714999'),
        value: rows.filter((r) => r.status === 'draft').length,
        color: 'warning.main',
      },
      {
        name: t('hrm.hrm_payroll_page.text_9cf9bc'),
        value: rows.filter((r) => r.status === 'calculated').length,
        color: 'primary.main',
      },
      {
        name: t('hrm.hrm_payroll_page.text_43d640'),
        value: rows.filter((r) => r.status === 'paid').length,
        color: 'success.dark',
      },
    ];

    return (
      <Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 2,
            mb: 3,
          }}
        >
          {statCards.slice(0, 4).map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              unit={stat.unit}
              icon={stat.icon}
              color={stat.color}
            />
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(3, 1fr)',
            },
            gap: 2,
            mb: 3,
          }}
        >
          {statCards.slice(4).map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              unit={stat.unit}
              icon={stat.icon}
              color={stat.color}
            />
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
            gap: 3,
            mb: 3,
          }}
        >
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1, p: 3 }}>
            <Typography
              variant='h6'
              sx={{ mb: 2, color: 'grey.900' }}
            >
              {t('hrm.hrm_payroll_page.e1')}
            </Typography>
            <StatsChart
              type='pie'
              data={salaryCompositionData}
              height={250}
            />
          </Box>
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1, p: 3 }}>
            <Typography
              variant='h6'
              sx={{ mb: 2, color: 'grey.900' }}
            >
              {t('hrm.hrm_payroll_page.e2')}
            </Typography>
            <StatsChart
              type='pie'
              data={payrollStatusData}
              height={250}
            />
          </Box>
        </Box>
      </Box>
    );
  };

  const adjustmentsContent = (
    <CrudPage
      schema={salaryAdjustmentSchema}
      apiAdapter={salaryAdjustmentAdapter}
      customRowActions={[
        {
          key: 'approve',
          label: t('hrm.hrm_payroll_page.k18'),
          icon: <CheckCircle size={16} />,
          color: 'success',
          show: (row) => row.status === 'pending',
          onClick: async (row) => {
            try {
              await salaryAdjustmentApi.approve(row.id as string, 'current_user');
              addNotification({
                title: t('hrm.hrm_payroll_page.k20'),
                message: t('hrm.hrm_payroll_page.k19'),
                type: 'success',
              });
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.AD_HOC.HRM_SALARY_ADJUSTMENTS_BASE,
                exact: false,
                refetchType: 'active',
              });
            } catch {
              addNotification({
                title: t('hrm.hrm_payroll_page.k22'),
                message: t('hrm.hrm_payroll_page.k21'),
                type: 'error',
              });
            }
          },
        },
      ]}
      headerContent={
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant='outlined'
            startIcon={<Download size={16} />}
            sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1, borderRadius: 3 }}
          >
            {t('hrm.hrm_attendance_page.e1')}
          </Button>
        </Box>
      }
    />
  );

  const calculatorContent = (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1, p: 3 }}>
      <Typography
        variant='h6'
        sx={{ mb: 3, color: 'grey.900' }}
      >
        {t('hrm.hrm_payroll_page.e4')}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            md: 'repeat(2, 1fr)',
          },
          gap: 3,
        }}
      >
        <Box>
          <Typography
            variant='body2'
            sx={{ mb: 1, fontWeight: 500, color: 'grey.700' }}
          >
            {t('hrm.hrm_payroll_page.e1')}
          </Typography>
          <InputBase
            type='number'
            placeholder={t('hrm.hrm_payroll_page.please_input')}
            sx={{
              width: '100%',
              px: 2,
              py: 1,
              border: 1,
              borderColor: 'grey.300',
              borderRadius: 3,
            }}
          />
        </Box>
        <Box>
          <Typography
            variant='body2'
            sx={{ mb: 1, fontWeight: 500, color: 'grey.700' }}
          >
            {t('hrm.hrm_payroll_page.e2')}
          </Typography>
          <InputBase
            type='number'
            placeholder={t('hrm.hrm_payroll_page.please_input_1')}
            sx={{
              width: '100%',
              px: 2,
              py: 1,
              border: 1,
              borderColor: 'grey.300',
              borderRadius: 3,
            }}
          />
        </Box>
        <Box>
          <Typography
            variant='body2'
            sx={{ mb: 1, fontWeight: 500, color: 'grey.700' }}
          >
            {t('hrm.hrm_payroll_page.e3')}
          </Typography>
          <InputBase
            type='number'
            placeholder={t('hrm.hrm_payroll_page.please_input_2')}
            sx={{
              width: '100%',
              px: 2,
              py: 1,
              border: 1,
              borderColor: 'grey.300',
              borderRadius: 3,
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
          <Button
            variant='contained'
            sx={{
              width: '100%',
              px: 3,
              py: 1,
              borderRadius: 3,
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            {t('hrm.hrm_payroll_page.e5')}
          </Button>
        </Box>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title={t('hrm.hrm_payroll_page.k23')}
      subtitle={t('hrm.hrm_payroll_page.k24')}
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <BadgeDollarSign style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main}, ${ct.success.dark})`,
      }}
    >
      <CrudPage
        schema={payrollSchema}
        apiAdapter={payrollAdapter}
        headerContent={renderHeaderContent}
        customRowActions={customRowActions}
        tabs={[
          {
            id: 'payroll',
            label: t('hrm.hrm_payroll_page.text_bf8ab5'),
            icon: <FileText sx={{ width: 20, height: 20 }} />,
            content: null,
          },
          {
            id: 'adjustments',
            label: t('hrm.hrm_payroll_page.text_34714b'),
            icon: <TrendingUp sx={{ width: 20, height: 20 }} />,
            content: adjustmentsContent,
          },
          {
            id: 'calculator',
            label: t('hrm.hrm_payroll_page.k25'),
            icon: <Calculator sx={{ width: 20, height: 20 }} />,
            content: calculatorContent,
          },
        ]}
        defaultTab='payroll'
      />
    </PageContainer>
  );
};

export default HrmPayrollPage;
