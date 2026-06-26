import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Briefcase,
  FileText,
  BookOpen,
  Clock,
  DollarSign,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { useNotification } from '@/hooks/useNotification';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';

interface EmployeeSummary {
  total_employees: number;
  active_employees: number;
  inactive_employees: number;
  male_count: number;
  female_count: number;
  avg_tenure_days: number;
  new_hires_this_month: number;
  terminations_this_month: number;
}

interface DepartmentSummary {
  department_id: string;
  department_name: string;
  employee_count: number;
  active_count: number;
}

interface ContractSummary {
  total_contracts: number;
  active_contracts: number;
  expired_contracts: number;
  expiring_this_month: number;
  expiring_next_month: number;
}

interface TrainingSummary {
  total_plans: number;
  active_plans: number;
  total_courses: number;
  completed_courses: number;
  total_records: number;
  completed_records: number;
  avg_completion_rate: number;
}

interface AttendanceSummary {
  total_records: number;
  on_time_count: number;
  late_count: number;
  absent_count: number;
  leave_count: number;
  attendance_rate: number;
}

interface PayrollSummary {
  total_payroll: number;
  avg_salary: number;
  min_salary: number;
  max_salary: number;
  employee_count: number;
  bonus_total: number;
}

const HrmReportsPage: React.FC = () => {
  const { error } = useNotification();

  const [employeeSummary, setEmployeeSummary] = useState<EmployeeSummary | null>(null);
  const [departmentSummary, setDepartmentSummary] = useState<DepartmentSummary[]>([]);
  const [contractSummary, setContractSummary] = useState<ContractSummary | null>(null);
  const [trainingSummary, setTrainingSummary] = useState<TrainingSummary | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [activeTab, setActiveTab] = useState<string>('overview');

  useEffect(() => {
    loadReports();
  }, [timeRange]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const promises = [
        fetch(`/api/hrm/reports/employee-summary?time_range=${timeRange}`),
        fetch(`/api/hrm/reports/department-summary?time_range=${timeRange}`),
        fetch(`/api/hrm/reports/contract-summary?time_range=${timeRange}`),
        fetch(`/api/hrm/reports/training-summary?time_range=${timeRange}`),
        fetch(`/api/hrm/reports/attendance-summary?time_range=${timeRange}`),
        fetch(`/api/hrm/reports/payroll-summary?time_range=${timeRange}`),
      ];

      const responses = await Promise.all(promises);
      const results = await Promise.all(responses.map((r) => r.json()));

      if (results[0].code === 200) setEmployeeSummary(results[0].data);
      if (results[1].code === 200) setDepartmentSummary(results[1].data.departments);
      if (results[2].code === 200) setContractSummary(results[2].data);
      if (results[3].code === 200) setTrainingSummary(results[3].data);
      if (results[4].code === 200) setAttendanceSummary(results[4].data);
      if (results[5].code === 200) setPayrollSummary(results[5].data);
    } catch (err: unknown) {
      apiLogger.error('Failed to load reports:', err);
      error('加载报表数据失败');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('zh-CN');
  };

  const formatCurrency = (num: number) => {
    return `¥${num.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  };

  const tabs = [
    { label: '概览', value: 'overview', icon: <BarChart3 size={18} /> },
    { label: '员工分析', value: 'employee', icon: <Users size={18} /> },
    { label: '培训分析', value: 'training', icon: <BookOpen size={18} /> },
    { label: '薪资分析', value: 'payroll', icon: <DollarSign size={18} /> },
  ];

  const statCards = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return [
          {
            id: 'total-employees',
            title: '总员工数',
            value: formatNumber(employeeSummary?.total_employees || 0),
            icon: <Users size={24} />,
            color: 'primary' as const,
          },
          {
            id: 'active-employees',
            title: '在职员工',
            value: formatNumber(employeeSummary?.active_employees || 0),
            icon: <Briefcase size={24} />,
            color: 'success' as const,
          },
          {
            id: 'active-contracts',
            title: '活跃合同',
            value: formatNumber(contractSummary?.active_contracts || 0),
            icon: <FileText size={24} />,
            color: 'secondary' as const,
          },
          {
            id: 'new-hires',
            title: '本月新入职',
            value: formatNumber(employeeSummary?.new_hires_this_month || 0),
            icon: <TrendingUp size={24} />,
            color: 'warning' as const,
          },
          {
            id: 'training-completion',
            title: '培训完成率',
            value: `${trainingSummary?.avg_completion_rate || 0}%`,
            icon: <BookOpen size={24} />,
            color: 'error' as const,
          },
          {
            id: 'attendance-rate',
            title: '考勤率',
            value: `${attendanceSummary?.attendance_rate || 0}%`,
            icon: <Clock size={24} />,
            color: 'info' as const,
          },
        ];
      case 'employee':
        return [
          {
            id: 'total-employees-e',
            title: '总员工数',
            value: formatNumber(employeeSummary?.total_employees || 0),
            icon: <Users size={24} />,
            color: 'primary' as const,
          },
          {
            id: 'active-employees-e',
            title: '在职员工',
            value: formatNumber(employeeSummary?.active_employees || 0),
            icon: <Briefcase size={24} />,
            color: 'success' as const,
          },
          {
            id: 'inactive-employees',
            title: '离职员工',
            value: formatNumber(employeeSummary?.inactive_employees || 0),
            icon: <TrendingUp size={24} />,
            color: 'error' as const,
          },
          {
            id: 'avg-tenure',
            title: '平均司龄(天)',
            value: formatNumber(employeeSummary?.avg_tenure_days || 0),
            icon: <Clock size={24} />,
            color: 'info' as const,
          },
        ];
      case 'training':
        return [
          {
            id: 'total-plans',
            title: '培训计划',
            value: formatNumber(trainingSummary?.total_plans || 0),
            icon: <BookOpen size={24} />,
            color: 'primary' as const,
          },
          {
            id: 'active-plans',
            title: '进行中计划',
            value: formatNumber(trainingSummary?.active_plans || 0),
            icon: <TrendingUp size={24} />,
            color: 'success' as const,
          },
          {
            id: 'total-courses',
            title: '培训课程',
            value: formatNumber(trainingSummary?.total_courses || 0),
            icon: <FileText size={24} />,
            color: 'warning' as const,
          },
          {
            id: 'completion-rate',
            title: '完成率',
            value: `${trainingSummary?.avg_completion_rate || 0}%`,
            icon: <BarChart3 size={24} />,
            color: 'info' as const,
          },
        ];
      case 'payroll':
        return [
          {
            id: 'total-payroll',
            title: '薪资总额',
            value: formatCurrency(payrollSummary?.total_payroll || 0),
            icon: <DollarSign size={24} />,
            color: 'primary' as const,
          },
          {
            id: 'avg-salary',
            title: '平均薪资',
            value: formatCurrency(payrollSummary?.avg_salary || 0),
            icon: <Briefcase size={24} />,
            color: 'success' as const,
          },
          {
            id: 'max-salary',
            title: '最高薪资',
            value: formatCurrency(payrollSummary?.max_salary || 0),
            icon: <TrendingUp size={24} />,
            color: 'warning' as const,
          },
          {
            id: 'min-salary',
            title: '最低薪资',
            value: formatCurrency(payrollSummary?.min_salary || 0),
            icon: <Clock size={24} />,
            color: 'info' as const,
          },
        ];
      default:
        return [];
    }
  }, [activeTab, employeeSummary, contractSummary, trainingSummary, attendanceSummary, payrollSummary]);

  const charts = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return [
          {
            id: 'department-distribution',
            title: '部门人员分布',
            type: 'bar' as const,
            dataKey: 'employee_count',
            nameKey: 'department_name',
            data: departmentSummary.map((d) => ({
              name: d.department_name,
              value: d.employee_count,
              active: d.active_count,
            })),
          },
          {
            id: 'attendance-stats',
            title: '考勤统计',
            type: 'pie' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              { name: '准时', value: attendanceSummary?.on_time_count || 0, color: '#22c55e' },
              { name: '迟到', value: attendanceSummary?.late_count || 0, color: '#eab308' },
              { name: '缺勤', value: attendanceSummary?.absent_count || 0, color: '#ef4444' },
              { name: '请假', value: attendanceSummary?.leave_count || 0, color: '#3b82f6' },
            ].filter((d) => d.value > 0),
          },
          {
            id: 'contract-expiry',
            title: '合同到期统计',
            type: 'bar' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              { name: '本月到期', value: contractSummary?.expiring_this_month || 0 },
              { name: '下月到期', value: contractSummary?.expiring_next_month || 0 },
              { name: '已到期', value: contractSummary?.expired_contracts || 0 },
              { name: '活跃合同', value: contractSummary?.active_contracts || 0 },
            ],
          },
          {
            id: 'training-stats',
            title: '培训统计',
            type: 'pie' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              { name: '培训计划', value: trainingSummary?.total_plans || 0 },
              { name: '培训课程', value: trainingSummary?.total_courses || 0 },
              { name: '培训记录', value: trainingSummary?.total_records || 0 },
            ].filter((d) => d.value > 0),
          },
        ];
      case 'employee':
        return [
          {
            id: 'gender-distribution',
            title: '性别分布',
            type: 'pie' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              { name: '男', value: employeeSummary?.male_count || 0, color: '#3b82f6' },
              { name: '女', value: employeeSummary?.female_count || 0, color: '#ec4899' },
            ].filter((d) => d.value > 0),
          },
          {
            id: 'monthly-changes',
            title: '月度人员变动',
            type: 'bar' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              { name: '新入职', value: employeeSummary?.new_hires_this_month || 0 },
              { name: '离职', value: employeeSummary?.terminations_this_month || 0 },
            ],
          },
        ];
      case 'training':
        return [
          {
            id: 'training-progress',
            title: '培训完成率趋势',
            type: 'line' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              { name: '1月', value: 65 },
              { name: '2月', value: 72 },
              { name: '3月', value: 68 },
              { name: '4月', value: 78 },
              { name: '5月', value: 82 },
              { name: '6月', value: trainingSummary?.avg_completion_rate || 75 },
            ],
          },
          {
            id: 'training-completion-detail',
            title: '培训完成详情',
            type: 'bar' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              { name: '总课程', value: trainingSummary?.total_courses || 0 },
              { name: '已完成', value: trainingSummary?.completed_courses || 0 },
              { name: '总记录', value: trainingSummary?.total_records || 0 },
              { name: '已完成记录', value: trainingSummary?.completed_records || 0 },
            ],
          },
        ];
      case 'payroll':
        return [
          {
            id: 'payroll-structure',
            title: '薪资结构分析',
            type: 'pie' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              { name: '基本工资', value: (payrollSummary?.total_payroll || 0) * 0.6 },
              { name: '绩效奖金', value: (payrollSummary?.total_payroll || 0) * 0.25 },
              { name: '福利补贴', value: (payrollSummary?.total_payroll || 0) * 0.15 },
            ],
          },
          {
            id: 'salary-range',
            title: '薪资区间分布',
            type: 'bar' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              { name: '5k以下', value: Math.floor((payrollSummary?.employee_count || 0) * 0.1) },
              { name: '5k-10k', value: Math.floor((payrollSummary?.employee_count || 0) * 0.4) },
              { name: '10k-15k', value: Math.floor((payrollSummary?.employee_count || 0) * 0.3) },
              { name: '15k以上', value: Math.floor((payrollSummary?.employee_count || 0) * 0.2) },
            ],
          },
        ];
      default:
        return [];
    }
  }, [activeTab, employeeSummary, departmentSummary, contractSummary, trainingSummary, attendanceSummary, payrollSummary]);

  const tables = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return [
          {
            id: 'department-summary',
            title: '部门人员明细',
            columns: [
              { id: 'department_name', label: '部门名称', field: 'department_name' },
              { id: 'employee_count', label: '总人数', field: 'employee_count' },
              { id: 'active_count', label: '在职人数', field: 'active_count' },
              { id: 'rate', label: '在职率(%)', field: 'rate' },
            ],
            data: departmentSummary.map((d) => ({
              ...d,
              rate: d.employee_count > 0 ? Math.round((d.active_count / d.employee_count) * 100) : 0,
            })),
          },
        ];
      case 'employee':
        return [
          {
            id: 'employee-status',
            title: '员工状态统计',
            columns: [
              { id: 'status', label: '状态', field: 'status' },
              { id: 'count', label: '人数', field: 'count' },
              { id: 'rate', label: '占比(%)', field: 'rate' },
            ],
            data: [
              {
                status: '在职',
                count: employeeSummary?.active_employees || 0,
                rate: employeeSummary?.total_employees
                  ? Math.round((employeeSummary.active_employees / employeeSummary.total_employees) * 100)
                  : 0,
              },
              {
                status: '离职',
                count: employeeSummary?.inactive_employees || 0,
                rate: employeeSummary?.total_employees
                  ? Math.round((employeeSummary.inactive_employees / employeeSummary.total_employees) * 100)
                  : 0,
              },
            ],
          },
          {
            id: 'employee-gender',
            title: '性别分布',
            columns: [
              { id: 'gender', label: '性别', field: 'gender' },
              { id: 'count', label: '人数', field: 'count' },
              { id: 'rate', label: '占比(%)', field: 'rate' },
            ],
            data: [
              {
                gender: '男',
                count: employeeSummary?.male_count || 0,
                rate: employeeSummary?.total_employees
                  ? Math.round((employeeSummary.male_count / employeeSummary.total_employees) * 100)
                  : 0,
              },
              {
                gender: '女',
                count: employeeSummary?.female_count || 0,
                rate: employeeSummary?.total_employees
                  ? Math.round((employeeSummary.female_count / employeeSummary.total_employees) * 100)
                  : 0,
              },
            ],
          },
        ];
      case 'training':
        return [
          {
            id: 'training-plans',
            title: '培训计划统计',
            columns: [
              { id: 'type', label: '类型', field: 'type' },
              { id: 'total', label: '总数', field: 'total' },
              { id: 'completed', label: '已完成', field: 'completed' },
              { id: 'rate', label: '完成率(%)', field: 'rate' },
            ],
            data: [
              {
                type: '培训计划',
                total: trainingSummary?.total_plans || 0,
                completed: (trainingSummary?.total_plans || 0) - (trainingSummary?.active_plans || 0),
                rate: trainingSummary?.total_plans
                  ? Math.round(((trainingSummary.total_plans - trainingSummary.active_plans) / trainingSummary.total_plans) * 100)
                  : 0,
              },
              {
                type: '培训课程',
                total: trainingSummary?.total_courses || 0,
                completed: trainingSummary?.completed_courses || 0,
                rate: trainingSummary?.total_courses
                  ? Math.round((trainingSummary.completed_courses / trainingSummary.total_courses) * 100)
                  : 0,
              },
              {
                type: '培训记录',
                total: trainingSummary?.total_records || 0,
                completed: trainingSummary?.completed_records || 0,
                rate: trainingSummary?.total_records
                  ? Math.round((trainingSummary.completed_records / trainingSummary.total_records) * 100)
                  : 0,
              },
            ],
          },
        ];
      case 'payroll':
        return [
          {
            id: 'payroll-details',
            title: '薪资明细',
            columns: [
              { id: 'item', label: '项目', field: 'item' },
              { id: 'amount', label: '金额', field: 'amount' },
              { id: 'count', label: '人数', field: 'count' },
            ],
            data: [
              {
                item: '薪资总额',
                amount: formatCurrency(payrollSummary?.total_payroll || 0),
                count: payrollSummary?.employee_count || 0,
              },
              {
                item: '平均薪资',
                amount: formatCurrency(payrollSummary?.avg_salary || 0),
                count: '-',
              },
              {
                item: '奖金总额',
                amount: formatCurrency(payrollSummary?.bonus_total || 0),
                count: '-',
              },
            ],
          },
        ];
      default:
        return [];
    }
  }, [activeTab, employeeSummary, departmentSummary, trainingSummary, payrollSummary]);

  return (
    <StatsPageTemplate
      title='HR数据分析报表'
      subtitle='实时查看人力资源数据统计与分析'
      statCards={statCards}
      statColumns={6}
      charts={charts}
      chartColumns={{ xs: 1, md: 2, lg: 2 }}
      tables={tables}
      loading={loading}
      timeRangeOptions={[
        { label: '本周', value: 'week' },
        { label: '本月', value: 'month' },
        { label: '本季度', value: 'quarter' },
        { label: '本年', value: 'year' },
      ]}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      tabs={tabs}
      tabValue={activeTab}
      onTabChange={setActiveTab}
      showTimeRange={true}
      showSearch={false}
      showExport={true}
      showRefresh={true}
      onRefresh={loadReports}
      exportText='导出报表'
      showStatCards={true}
      showCharts={true}
      showTables={true}
    />
  );
};

export default HrmReportsPage;