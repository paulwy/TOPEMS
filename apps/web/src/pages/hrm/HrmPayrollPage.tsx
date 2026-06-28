import React, { useState, useEffect, useMemo } from 'react';
import { PageContainer } from '@/components/common';
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
import { useNavigate } from 'react-router-dom';
import { Box, InputBase, Typography, Button } from '@mui/material';
import { apiLogger } from '@/utils/logger';
import { useNotification } from '@/hooks/useNotification';
import { StatsChart } from '@/components/bi/StatsChart';
import { StatusBadge } from '@/components/common/StatusBadge';
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
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();

  const [activeTab, setActiveTab] = useState<'payroll' | 'adjustments' | 'calculator'>('payroll');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('2026-05');
  const [loading, setLoading] = useState(true);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [adjustments, setAdjustments] = useState<SalaryAdjustment[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [paying, setPaying] = useState(false);

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [payrollRes, employeeRes, adjustmentRes] = await Promise.all([
        payrollApi.list(),
        employeeApi.list(),
        salaryAdjustmentApi.list(),
      ]);

      let empList: Employee[] = [];

      if (payrollRes.success && payrollRes.data) {
        setPayrollRuns(payrollRes.data.items);
      }

      if (employeeRes.success && employeeRes.data) {
        empList = employeeRes.data.items;
        setEmployees(empList);
      }

      if (adjustmentRes.success && adjustmentRes.data) {
        setAdjustments(adjustmentRes.data.items);
      }
    } catch (err: unknown) {
      error('加载数据失败');
      apiLogger.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 加载工资条明细
  const loadPayrollItems = async (runId: string) => {
    try {
      setLoading(true);
      const res = await payrollItemApi.list({ payroll_run_id: runId });
      if (res.success && res.data) {
        setPayrollItems(res.data.items);
      }
    } catch (err: unknown) {
      error('加载工资条明细失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建工资发放批次
  const handleCreatePayroll = async () => {
    try {
      setLoading(true);
      const res = await payrollApi.create({ pay_period: selectedPeriod });
      if (res.success && res.data) {
        success('工资发放批次创建成功');
        await loadData();
      }
    } catch (err: unknown) {
      error('创建工资发放批次失败');
    } finally {
      setLoading(false);
    }
  };

  // 计算薪资
  const handleCalculate = async (runId: string) => {
    try {
      setCalculating(true);
      const res = await payrollApi.calculate(runId);
      if (res.success) {
        success('薪资计算完成');
        await loadData();
      }
    } catch (err: unknown) {
      error('薪资计算失败');
    } finally {
      setCalculating(false);
    }
  };

  // 执行发放
  const handlePay = async (runId: string) => {
    try {
      setPaying(true);
      const res = await payrollApi.pay(runId);
      if (res.success) {
        success('薪资发放完成');
        await loadData();
      }
    } catch (err: unknown) {
      error('薪资发放失败');
    } finally {
      setPaying(false);
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    return emp ? emp.name : '未知员工';
  };

  const getPayrollStatusBadge = (status: string) => (
    <StatusBadge
      status={`payroll_${status}`}
      showIcon
    />
  );

  const getAdjustmentTypeName = (type: string) => {
    const types: Record<string, string> = {
      promotion: '晋升调薪',
      demotion: '降职调薪',
      bonus: '奖金发放',
      deduction: '扣款',
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
      { name: '基本工资', value: 60, color: 'primary.main' },
      { name: '奖金', value: 15, color: 'success.dark' },
      { name: '补贴', value: 10, color: 'warning.main' },
      { name: '社保公积金（个人）', value: 8, color: 'error.main' },
      { name: '个人所得税', value: 7, color: 'secondary.main' },
    ],
    []
  );

  // 工资发放状态分布
  const payrollStatusData = useMemo(
    () => [
      {
        name: '待计算',
        value: payrollRuns.filter((r) => r.status === 'draft').length,
        color: 'warning.main',
      },
      {
        name: '已计算',
        value: payrollRuns.filter((r) => r.status === 'calculated').length,
        color: 'primary.main',
      },
      {
        name: '已发放',
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
        title: '发放人数',
        value: payrollStats.totalEmployees,
        unit: '人',
        icon: <Users sx={{ width: 20, height: 20 }} />,
        color: 'primary' as const,
      },
      {
        title: '基本工资合计',
        value: formatCurrency(payrollStats.totalBaseSalary),
        icon: <DollarSign sx={{ width: 20, height: 20 }} />,
        color: 'success' as const,
      },
      {
        title: '奖金合计',
        value: formatCurrency(payrollStats.totalBonus),
        icon: <TrendingUp sx={{ width: 20, height: 20 }} />,
        color: 'secondary' as const,
      },
      {
        title: '实发工资合计',
        value: formatCurrency(payrollStats.totalNetSalary),
        icon: <CreditCard sx={{ width: 20, height: 20 }} />,
        color: 'primary' as const,
      },
      {
        title: '平均工资',
        value: formatCurrency(payrollStats.avgSalary),
        icon: <Receipt sx={{ width: 20, height: 20 }} />,
        color: 'info' as const,
      },
      {
        title: '待计算批次',
        value: payrollStats.pendingRuns,
        icon: <Clock sx={{ width: 20, height: 20 }} />,
        color: 'warning' as const,
      },
      {
        title: '已发放批次',
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
        label: '发放周期',
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
        label: '员工人数',
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
        label: '总金额',
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
        label: '状态',
        render: (row) => getPayrollStatusBadge(row.status),
      },
      {
        id: 'paid_at',
        label: '发放时间',
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
        label: '查看明细',
        icon: <FileText size={16} />,
        onClick: (row) => loadPayrollItems(row.id),
      },
      {
        label: '计算薪资',
        icon: <Calculator size={16} />,
        color: 'success',
        show: (row) => row.status === 'draft',
        onClick: (row) => handleCalculate(row.id),
      },
      {
        label: '执行发放',
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
        label: '员工姓名',
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
        label: '调薪类型',
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
        label: '原工资',
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
        label: '新工资',
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
        label: '调整金额',
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
        label: '原因',
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
        label: '生效日期',
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
        label: '状态',
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
              label: '员工',
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
              label: '应发工资',
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
              label: '扣款',
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
              label: '个税',
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
              label: '实发工资',
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
              label: '状态',
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
            borderRadius: 2,
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
            borderRadius: 2,
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
          searchPlaceholder='搜索...'
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          emptyMessage='暂无工资发放批次数据'
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
                  borderRadius: 2,
                }}
              >
                导出
              </Button>
            </Box>
          }
          expandable={(row) => (selectedRunId === row.id ? renderPayrollItemDetail(row.id) : null)}
          onRowClick={(row) => setSelectedRunId(selectedRunId === row.id ? null : row.id)}
        />
      )}

      {activeTab === 'adjustments' && (
        <ListPageTemplate
          columns={adjustmentColumns}
          data={adjustments}
          loading={loading}
          getRowId={(row) => row.id}
          searchable
          searchPlaceholder='搜索...'
          emptyMessage='暂无调薪记录'
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
                  borderRadius: 2,
                }}
              >
                导出
              </Button>
            </Box>
          }
        />
      )}

      {activeTab === 'calculator' && (
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
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
                placeholder='请输入税前收入'
                sx={{
                  width: '100%',
                  px: 2,
                  py: 1,
                  border: 1,
                  borderColor: 'grey.300',
                  borderRadius: 2,
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
                placeholder='请输入社保公积金'
                sx={{
                  width: '100%',
                  px: 2,
                  py: 1,
                  border: 1,
                  borderColor: 'grey.300',
                  borderRadius: 2,
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
                placeholder='请输入专项附加扣除'
                sx={{
                  width: '100%',
                  px: 2,
                  py: 1,
                  border: 1,
                  borderColor: 'grey.300',
                  borderRadius: 2,
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
                  borderRadius: 2,
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
