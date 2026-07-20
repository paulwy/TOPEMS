import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { PageContainer } from '@/components/common/PageContainerV2';
import {
  DollarSign,
  FileText,
  TrendingUp,
  Calculator,
  Search,
  Plus,
  Download,
  Loader2,
  Users,
  CreditCard,
  Receipt,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Box, InputBase, Typography, Button } from '@mui/material';
import { apiLogger } from '@/utils/logger';
import { useNotification } from '@/hooks/useNotification';
import { StatsChart } from '@/components/bi/StatsChart';
import { StatusBadge } from '@topems/shared-components';
import { ListPageTemplate, MuiStatCard as StatCard } from '@/components';
import type { ColumnDef, RowAction } from '@/components';
import {
  payrollApi,
  payrollItemApi,
  employeeApi,
  salaryAdjustmentApi,
  type PayrollRun,
  type PayrollItem,
  type Employee,
  type SalaryAdjustment,
} from '@/api/hrm';

interface PayrollSummary {
  total_employees: number;
  total_base_salary: number;
  total_bonus: number;
  total_deductions: number;
  total_net_salary: number;
  period: string;
}

const HrmPayrollPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'payroll' | 'adjustments' | 'calculator'>('payroll');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('2026-05');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // 加载工资发放批次
  const payrollRunsQuery = useQuery<PayrollRun[]>({
    queryKey: QUERY_KEYS.HRM.PAYROLL,
    queryFn: async () => {
      const res = await payrollApi.list();
      if (res.success && res.data) {
        return res.data.items;
      }
      return [];
    },
  });

  // 加载员工
  const employeesQuery = useQuery<Employee[]>({
    queryKey: QUERY_KEYS.HRM.EMPLOYEES,
    queryFn: async () => {
      const res = await employeeApi.list();
      if (res.success && res.data) {
        return res.data.items;
      }
      return [];
    },
  });

  // 加载调薪记录
  const adjustmentsQuery = useQuery<SalaryAdjustment[]>({
    queryKey: QUERY_KEYS.HRM.SALARY_ADJUSTMENT,
    queryFn: async () => {
      const res = await salaryAdjustmentApi.list();
      if (res.success && res.data) {
        return res.data.items;
      }
      return [];
    },
  });

  // 加载工资条明细
  const payrollItemsQuery = useQuery<PayrollItem[]>({
    queryKey: QUERY_KEYS.HRM.PAYROLL_ITEMS(selectedRunId || ''),
    queryFn: async () => {
      if (!selectedRunId) return [];
      const res = await payrollItemApi.list({ payroll_run_id: selectedRunId });
      if (res.success && res.data) {
        return res.data.items;
      }
      return [];
    },
    enabled: !!selectedRunId,
  });

  const loading = payrollRunsQuery.isLoading || employeesQuery.isLoading;
  const payrollRuns = payrollRunsQuery.data || [];
  const employees = employeesQuery.data || [];
  const adjustments = adjustmentsQuery.data || [];
  const payrollItems = payrollItemsQuery.data || [];

  // 创建工资发放批次
  const createPayrollMutation = useMutation({
    mutationFn: async (period: string) => payrollApi.create({ pay_period: period }),
    onSuccess: () => {
      success(t('hrm.hrm_payroll_page.create'));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.PAYROLL });
    },
    onError: (err: unknown) => {
      error(t('hrm.hrm_payroll_page.create_1'));
      apiLogger.error(err);
    },
  });

  // 计算薪资
  const calculateMutation = useMutation({
    mutationFn: async (runId: string) => payrollApi.calculate(runId),
    onSuccess: () => {
      success(t('hrm.hrm_payroll_page.completed'));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.PAYROLL });
    },
    onError: (err: unknown) => {
      error(t('hrm.hrm_payroll_page.fail'));
      apiLogger.error(err);
    },
  });

  // 执行发放
  const payMutation = useMutation({
    mutationFn: async (runId: string) => payrollApi.pay(runId),
    onSuccess: () => {
      success(t('hrm.hrm_payroll_page.completed_1'));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.PAYROLL });
    },
    onError: (err: unknown) => {
      error(t('hrm.hrm_payroll_page.fail_1'));
      apiLogger.error(err);
    },
  });

  const calculating = calculateMutation.isPending;
  const paying = payMutation.isPending;

  const handleCreatePayroll = () => {
    createPayrollMutation.mutate(selectedPeriod);
  };

  const handleCalculate = (runId: string) => {
    calculateMutation.mutate(runId);
  };

  const handlePay = (runId: string) => {
    payMutation.mutate(runId);
  };

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp ? emp.name : t('hrm.hrm_payroll_page.text_e92bd2');
  };

  const getPayrollStatusBadge = (status: string) => (
    <StatusBadge
      status={`payroll_${status}`}
      showIcon
    />
  );

  const getAdjustmentTypeName = (type: string) => {
    const types: Record<string, string> = {
      promotion: t('hrm.hrm_payroll_page.text_34714b'),
      demotion: t('hrm.hrm_payroll_page.text_309ae8'),
      bonus: t('hrm.hrm_payroll_page.text_265086'),
      deduction: t('hrm.hrm_payroll_page.text_b99e70'),
    };
    return types[type] || type;
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  // 计算汇总
  const totalAmount = payrollRuns.reduce((sum, run) => sum + Number(run.total_amount), 0);
  const totalEmployees = payrollRuns.reduce((sum, run) => sum + run.employee_count, 0);

  // 薪资统计数据
  const payrollStats = useMemo(
    () => ({
      totalEmployees,
      totalBaseSalary: totalAmount * 0.6,
      totalBonus: totalAmount * 0.2,
      totalDeductions: totalAmount * 0.1,
      totalNetSalary: totalAmount * 0.9,
      avgSalary: totalEmployees > 0 ? (totalAmount * 0.9) / totalEmployees : 0,
      pendingRuns: payrollRuns.filter((r) => r.status === 'draft').length,
      paidRuns: payrollRuns.filter((r) => r.status === 'paid').length,
    }),
    [payrollRuns, totalAmount, totalEmployees]
  );

  // 薪资构成数据
  const salaryCompositionData = useMemo(
    () => [
      { name: t('hrm.hrm_payroll_page.text_d0e803'), value: 60, color: 'primary.main' },
      { name: t('hrm.hrm_payroll_page.text_f41af7'), value: 15, color: 'success.dark' },
      { name: t('hrm.hrm_payroll_page.text_805400'), value: 10, color: 'warning.main' },
      { name: t('hrm.hrm_payroll_page.text_3d6bd6'), value: 8, color: 'error.main' },
      { name: t('hrm.hrm_payroll_page.text_b7432c'), value: 7, color: 'secondary.main' },
    ],
    []
  );

  // 工资发放状态分布
  const payrollStatusData = useMemo(
    () => [
      {
        name: t('hrm.hrm_payroll_page.text_714999'),
        value: payrollRuns.filter((r) => r.status === 'draft').length,
        color: 'warning.main',
      },
      {
        name: t('hrm.hrm_payroll_page.text_9cf9bc'),
        value: payrollRuns.filter((r) => r.status === 'calculated').length,
        color: 'primary.main',
      },
      {
        name: t('hrm.hrm_payroll_page.text_43d640'),
        value: payrollRuns.filter((r) => r.status === 'paid').length,
        color: 'success.dark',
      },
    ],
    [payrollRuns]
  );

  const summary: PayrollSummary = {
    total_employees: totalEmployees,
    total_base_salary: totalAmount * 0.6,
    total_bonus: totalAmount * 0.2,
    total_deductions: totalAmount * 0.1,
    total_net_salary: totalAmount * 0.9,
    period: selectedPeriod,
  };

  // 统计卡片数据
  const statCards = useMemo(
    () => [
      {
        title: t('hrm.hrm_payroll_page.text_5adbd7'),
        value: payrollStats.totalEmployees,
        unit: t('hrm.hrm_payroll_page.text_465afe'),
        icon: <Users sx={{ width: 20, height: 20 }} />,
        color: 'primary' as const,
      },
      {
        title: t('hrm.hrm_payroll_page.text_c82ad3'),
        value: formatCurrency(payrollStats.totalBaseSalary),
        icon: <DollarSign sx={{ width: 20, height: 20 }} />,
        color: 'success' as const,
      },
      {
        title: t('hrm.hrm_payroll_page.text_a3ad89'),
        value: formatCurrency(payrollStats.totalBonus),
        icon: <TrendingUp sx={{ width: 20, height: 20 }} />,
        color: 'secondary' as const,
      },
      {
        title: t('hrm.hrm_payroll_page.text_48e9fd'),
        value: formatCurrency(payrollStats.totalNetSalary),
        icon: <CreditCard sx={{ width: 20, height: 20 }} />,
        color: 'primary' as const,
      },
      {
        title: t('hrm.hrm_payroll_page.text_f0f769'),
        value: formatCurrency(payrollStats.avgSalary),
        icon: <Receipt sx={{ width: 20, height: 20 }} />,
        color: 'info' as const,
      },
      {
        title: t('hrm.hrm_payroll_page.text_480381'),
        value: payrollStats.pendingRuns,
        icon: <Clock sx={{ width: 20, height: 20 }} />,
        color: 'warning' as const,
      },
      {
        title: t('hrm.hrm_payroll_page.text_b0fa63'),
        value: payrollStats.paidRuns,
        icon: <CheckCircle sx={{ width: 20, height: 20 }} />,
        color: 'success' as const,
      },
    ],
    [payrollStats]
  );

  // 工资发放批次列定义
  const payrollColumns: ColumnDef<PayrollRun>[] = useMemo(
    () => [
      {
        id: 'pay_period',
        label: t('hrm.hrm_payroll_page.text_52f37d'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 500, color: 'grey.900' }}
          >
            {row.pay_period}
          </Typography>
        ),
      },
      {
        id: 'employee_count',
        label: t('hrm.hrm_payroll_page.text_34586c'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ color: 'grey.900' }}
          >
            {row.employee_count}
          </Typography>
        ),
      },
      {
        id: 'total_amount',
        label: t('hrm.hrm_payroll_page.amount'),
        render: (row) => (
          <Typography
            variant='h6'
            sx={{ fontWeight: 700, color: 'primary.main' }}
          >
            {formatCurrency(Number(row.total_amount))}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: t('hrm.hrm_payroll_page.status'),
        render: (row) => getPayrollStatusBadge(row.status),
      },
      {
        id: 'paid_at',
        label: t('hrm.hrm_payroll_page.time'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ color: 'grey.500' }}
          >
            {row.paid_at || '-'}
          </Typography>
        ),
      },
    ],
    []
  );

  // 工资发放批次行操作
  const payrollRowActions: RowAction<PayrollRun>[] = useMemo(
    () => [
      {
        label: t('hrm.hrm_payroll_page.view'),
        icon: <FileText size={16} />,
        onClick: (row) => setSelectedRunId(row.id),
      },
      {
        label: t('hrm.hrm_payroll_page.text_ed8d89'),
        icon: <Calculator size={16} />,
        color: 'success',
        show: (row) => row.status === 'draft',
        onClick: (row) => handleCalculate(row.id),
      },
      {
        label: t('hrm.hrm_payroll_page.text_df6e5e'),
        icon: <CreditCard size={16} />,
        color: 'success',
        show: (row) => row.status === 'calculated',
        onClick: (row) => handlePay(row.id),
      },
    ],

    []
  );

  // 调薪记录列定义
  const adjustmentColumns: ColumnDef<SalaryAdjustment>[] = useMemo(
    () => [
      {
        id: 'employee_name',
        label: t('hrm.hrm_payroll_page.text_50df90'),
        render: (row) => (
          <Box>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500, color: 'grey.900' }}
            >
              {row.employee_name}
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'grey.500' }}
            >
              {row.department}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'adjustment_type',
        label: t('hrm.hrm_payroll_page.type'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ color: 'grey.900' }}
          >
            {getAdjustmentTypeName(row.adjustment_type)}
          </Typography>
        ),
      },
      {
        id: 'old_salary',
        label: t('hrm.hrm_payroll_page.text_a80942'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ color: 'grey.500' }}
          >
            {formatCurrency(row.old_salary)}
          </Typography>
        ),
      },
      {
        id: 'new_salary',
        label: t('hrm.hrm_payroll_page.text_f740b8'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ color: 'grey.900' }}
          >
            {formatCurrency(row.new_salary)}
          </Typography>
        ),
      },
      {
        id: 'adjustment_amount',
        label: t('hrm.hrm_payroll_page.amount_1'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 500, color: 'success.main' }}
          >
            +{formatCurrency(row.adjustment_amount)}
          </Typography>
        ),
      },
      {
        id: 'reason',
        label: t('hrm.hrm_payroll_page.text_41dfb0'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{
              color: 'grey.500',
              maxWidth: 256,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.reason}
          </Typography>
        ),
      },
      {
        id: 'effective_date',
        label: t('hrm.hrm_payroll_page.date'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ color: 'grey.900' }}
          >
            {row.effective_date}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: t('hrm.hrm_payroll_page.status'),
        render: (row) => (
          <StatusBadge
            status={`employee_${row.status}`}
            showIcon
          />
        ),
      },
    ],
    []
  );

  // 工资条明细展开行
  const renderPayrollItemDetail = (runId: string) => {
    if (payrollItems.length === 0) return null;

    return (
      <Box sx={{ p: 2 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, color: 'grey.900', mb: 2 }}
        >
          工资条明细
        </Typography>
        <ListPageTemplate
          columns={[
            {
              id: 'employee_name',
              label: t('hrm.hrm_payroll_page.text_2ed392'),
              render: (item) => (
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500, color: 'grey.900' }}
                >
                  {getEmployeeName(item.employee_id)}
                </Typography>
              ),
            },
            {
              id: 'gross_amount',
              label: t('hrm.hrm_payroll_page.text_84098f'),
              render: (item) => (
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.900' }}
                >
                  {formatCurrency(Number(item.gross_amount))}
                </Typography>
              ),
            },
            {
              id: 'deductions',
              label: t('hrm.hrm_payroll_page.text_b99e70'),
              render: (item) => (
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.900' }}
                >
                  {formatCurrency(Number(item.deductions))}
                </Typography>
              ),
            },
            {
              id: 'taxes',
              label: t('hrm.hrm_payroll_page.text_b6c9b4'),
              render: (item) => (
                <Typography
                  variant='body2'
                  sx={{ color: 'error.main' }}
                >
                  {formatCurrency(Number(item.taxes))}
                </Typography>
              ),
            },
            {
              id: 'net_amount',
              label: t('hrm.hrm_payroll_page.text_fc0a99'),
              render: (item) => (
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 700, color: 'primary.main' }}
                >
                  {formatCurrency(Number(item.net_amount))}
                </Typography>
              ),
            },
            {
              id: 'status',
              label: t('hrm.hrm_payroll_page.status'),
              render: (item) => getPayrollStatusBadge(item.status),
            },
          ]}
          data={payrollItems}
          expandable
          getRowId={(item) => item.id}
          rowActions={[]}
          searchable={false}
          pagination={undefined}
        />
      </Box>
    );
  };

  if (loading && payrollRuns.length === 0) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'grey.100',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Loader2
          sx={{
            width: 32,
            height: 32,
            animation: 'spin 1s linear infinite',
            color: 'primary.main',
          }}
        />
      </Box>
    );
  }

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title={t('hrm.hrm_payroll_page.text_bf8ab5')}
      subtitle={t('hrm.hrm_payroll_page.text_507738')}
      autoTitle
      autoBreadcrumbs
    >
      {/* StatCards */}
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

      {/* Charts */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
          gap: 3,
          mb: 3,
        }}
      >
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Typography
            variant='h6'
            sx={{ mb: 2, color: 'grey.900' }}
          >
            薪资构成比例
          </Typography>
          <StatsChart
            type='pie'
            data={salaryCompositionData}
            height={250}
          />
        </Box>

        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Typography
            variant='h6'
            sx={{ mb: 2, color: 'grey.900' }}
          >
            工资发放状态
          </Typography>
          <StatsChart
            type='pie'
            data={payrollStatusData}
            height={250}
          />
        </Box>
      </Box>

      {/* Tabs */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 3,
          borderBottom: 1,
          borderColor: 'grey.200',
        }}
      >
        <Button
          onClick={() => setActiveTab('payroll')}
          sx={{
            pb: 2,
            px: 1,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: activeTab === 'payroll' ? 'primary.main' : 'grey.500',
            borderBottom: 2,
            borderColor: activeTab === 'payroll' ? 'primary.main' : 'transparent',
            '&:hover': { color: 'grey.700' },
          }}
        >
          <FileText sx={{ width: 20, height: 20 }} />
          <span>工资发放批次</span>
        </Button>
        <Button
          onClick={() => setActiveTab('adjustments')}
          sx={{
            pb: 2,
            px: 1,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: activeTab === 'adjustments' ? 'primary.main' : 'grey.500',
            borderBottom: 2,
            borderColor: activeTab === 'adjustments' ? 'primary.main' : 'transparent',
            '&:hover': { color: 'grey.700' },
          }}
        >
          <TrendingUp sx={{ width: 20, height: 20 }} />
          <span>调薪记录</span>
        </Button>
        <Button
          onClick={() => setActiveTab('calculator')}
          sx={{
            pb: 2,
            px: 1,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: activeTab === 'calculator' ? 'primary.main' : 'grey.500',
            borderBottom: 2,
            borderColor: activeTab === 'calculator' ? 'primary.main' : 'transparent',
            '&:hover': { color: 'grey.700' },
          }}
        >
          <Calculator sx={{ width: 20, height: 20 }} />
          <span>个税计算器</span>
        </Button>
      </Box>

      {/* Content */}
      {activeTab === 'payroll' && (
        <ListPageTemplate
          columns={payrollColumns}
          data={payrollRuns}
          loading={loading}
          getRowId={(row) => row.id}
          rowActions={payrollRowActions}
          searchable
          searchPlaceholder={t('hrm.hrm_payroll_page.search')}
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          emptyMessage={t('hrm.hrm_payroll_page.no_data')}
          headerContent={
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                variant='outlined'
                startIcon={<Download size={16} />}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  borderRadius: 3,
                }}
              >
                导出
              </Button>
            </Box>
          }
          expandable={(row) => (selectedRunId === row.id ? renderPayrollItemDetail(row.id) : null)}
          onRowClick={(row) => setSelectedRunId(selectedRunId === row.id ? null : row.id)}
          exportable
          exportFileName={t('hrm.hrm_payroll_page.text_8257cc')}
          persistFilters
          persistSearch
          emptyActionButton={{
            label: t('hrm.hrm_payroll_page.text_483368'),
            icon: <Plus size={16} />,
            onClick: handleCreatePayroll,
          }}
        />
      )}

      {activeTab === 'adjustments' && (
        <ListPageTemplate
          columns={adjustmentColumns}
          data={adjustments}
          loading={loading}
          getRowId={(row) => row.id}
          searchable
          searchPlaceholder={t('hrm.hrm_payroll_page.search')}
          emptyMessage={t('hrm.hrm_payroll_page.no_data_1')}
          headerContent={
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                variant='outlined'
                startIcon={<Download size={16} />}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  borderRadius: 3,
                }}
              >
                导出
              </Button>
            </Box>
          }
          exportable
          exportFileName={t('hrm.hrm_payroll_page.text_4d088e')}
          persistFilters
          persistSearch
        />
      )}

      {activeTab === 'calculator' && (
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 1,
            p: 3,
          }}
        >
          <Typography
            variant='h6'
            sx={{ mb: 3, color: 'grey.900' }}
          >
            个税计算器
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
                税前月收入 (元)
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
                社保公积金 (元)
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
                专项附加扣除 (元)
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
                计算
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </PageContainer>
  );
};

export default HrmPayrollPage;
