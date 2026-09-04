import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import apiClient from '@/api/client';

import { useTranslation } from 'react-i18next';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const ct = designTokens.colors;

interface DepartmentSummary {
  department_id: string;
  department_name: string;
  employee_count: number;
  active_count: number;
}

const HrmReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const { error } = useNotification();

  const [timeRange, setTimeRange] = useState('month');
  const [activeTab, setActiveTab] = useState<string>('overview');

  const {
    data: reportsData,
    isPending: loading,
    error: queryError,
    refetch: refetchReports,
  } = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.HRM_REPORTS_BASE, timeRange],
    queryFn: async () => {
      const promises = [
        apiClient.hrm.get(`/reports/employee-summary?time_range=${timeRange}`),
        apiClient.hrm.get(`/reports/department-summary?time_range=${timeRange}`),
        apiClient.hrm.get(`/reports/contract-summary?time_range=${timeRange}`),
        apiClient.hrm.get(`/reports/training-summary?time_range=${timeRange}`),
        apiClient.hrm.get(`/reports/attendance-summary?time_range=${timeRange}`),
        apiClient.hrm.get(`/reports/payroll-summary?time_range=${timeRange}`),
      ];

      const results = await Promise.all(promises);

      return {
        employeeSummary: results[0].code === 200 ? results[0].data : null,
        departmentSummary: results[1].code === 200 ? results[1].data.departments : [],
        contractSummary: results[2].code === 200 ? results[2].data : null,
        trainingSummary: results[3].code === 200 ? results[3].data : null,
        attendanceSummary: results[4].code === 200 ? results[4].data : null,
        payrollSummary: results[5].code === 200 ? results[5].data : null,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (queryError) {
      apiLogger.error('Failed to load reports:', queryError);
      error(t('hrm.hrm_reports_page.fail'));
    }
  }, [queryError, error, t]);

  const employeeSummary = reportsData?.employeeSummary ?? null;
  const departmentSummary: DepartmentSummary[] = reportsData?.departmentSummary ?? [];
  const contractSummary = reportsData?.contractSummary ?? null;
  const trainingSummary = reportsData?.trainingSummary ?? null;
  const attendanceSummary = reportsData?.attendanceSummary ?? null;
  const payrollSummary = reportsData?.payrollSummary ?? null;

  const formatNumber = (num: number) => {
    return num.toLocaleString('zh-CN');
  };

  const formatCurrency = (num: number) => {
    return `¥${num.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  };

  const tabs = [
    {
      label: t('hrm.hrm_reports_page.text_863853'),
      value: 'overview',
      icon: <BarChart3 size={18} />,
    },
    { label: t('hrm.hrm_reports_page.text_e23edf'), value: 'employee', icon: <Users size={18} /> },
    {
      label: t('hrm.hrm_reports_page.text_33a1b3'),
      value: 'training',
      icon: <BookOpen size={18} />,
    },
    {
      label: t('hrm.hrm_reports_page.text_e92026'),
      value: 'payroll',
      icon: <DollarSign size={18} />,
    },
  ];

  const statCards = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return [
          {
            id: 'total-employees',
            title: i18n.t('hrm.hrm_reports_page.text_cf4555'),
            value: formatNumber(employeeSummary?.total_employees || 0),
            icon: <Users size={24} />,
            color: 'primary' as const,
          },
          {
            id: 'active-employees',
            title: i18n.t('hrm.hrm_reports_page.text_4d9eda'),
            value: formatNumber(employeeSummary?.active_employees || 0),
            icon: <Briefcase size={24} />,
            color: 'success' as const,
          },
          {
            id: 'active-contracts',
            title: i18n.t('hrm.hrm_reports_page.active'),
            value: formatNumber(contractSummary?.active_contracts || 0),
            icon: <FileText size={24} />,
            color: 'secondary' as const,
          },
          {
            id: 'new-hires',
            title: i18n.t('hrm.hrm_reports_page.this_month'),
            value: formatNumber(employeeSummary?.new_hires_this_month || 0),
            icon: <TrendingUp size={24} />,
            color: 'warning' as const,
          },
          {
            id: 'training-completion',
            title: i18n.t('hrm.hrm_reports_page.completed'),
            value: `${trainingSummary?.avg_completion_rate || 0}%`,
            icon: <BookOpen size={24} />,
            color: 'error' as const,
          },
          {
            id: 'attendance-rate',
            title: i18n.t('hrm.hrm_reports_page.text_7cdb55'),
            value: `${attendanceSummary?.attendance_rate || 0}%`,
            icon: <Clock size={24} />,
            color: 'info' as const,
          },
        ];
      case 'employee':
        return [
          {
            id: 'total-employees-e',
            title: t('hrm.hrm_reports_page.text_cf4555'),
            value: formatNumber(employeeSummary?.total_employees || 0),
            icon: <Users size={24} />,
            color: 'primary' as const,
          },
          {
            id: 'active-employees-e',
            title: t('hrm.hrm_reports_page.text_4d9eda'),
            value: formatNumber(employeeSummary?.active_employees || 0),
            icon: <Briefcase size={24} />,
            color: 'success' as const,
          },
          {
            id: 'inactive-employees',
            title: t('hrm.hrm_reports_page.text_683919'),
            value: formatNumber(employeeSummary?.inactive_employees || 0),
            icon: <TrendingUp size={24} />,
            color: 'error' as const,
          },
          {
            id: 'avg-tenure',
            title: t('hrm.hrm_reports_page.text_8c3336'),
            value: formatNumber(employeeSummary?.avg_tenure_days || 0),
            icon: <Clock size={24} />,
            color: 'info' as const,
          },
        ];
      case 'training':
        return [
          {
            id: 'total-plans',
            title: t('hrm.hrm_reports_page.plan'),
            value: formatNumber(trainingSummary?.total_plans || 0),
            icon: <BookOpen size={24} />,
            color: 'primary' as const,
          },
          {
            id: 'active-plans',
            title: t('hrm.hrm_reports_page.in_progress'),
            value: formatNumber(trainingSummary?.active_plans || 0),
            icon: <TrendingUp size={24} />,
            color: 'success' as const,
          },
          {
            id: 'total-courses',
            title: t('hrm.hrm_reports_page.text_07cb67'),
            value: formatNumber(trainingSummary?.total_courses || 0),
            icon: <FileText size={24} />,
            color: 'warning' as const,
          },
          {
            id: 'completion-rate',
            title: t('hrm.hrm_reports_page.completed_1'),
            value: `${trainingSummary?.avg_completion_rate || 0}%`,
            icon: <BarChart3 size={24} />,
            color: 'info' as const,
          },
        ];
      case 'payroll':
        return [
          {
            id: 'total-payroll',
            title: t('hrm.hrm_reports_page.text_2a0448'),
            value: formatCurrency(payrollSummary?.total_payroll || 0),
            icon: <DollarSign size={24} />,
            color: 'primary' as const,
          },
          {
            id: 'avg-salary',
            title: t('hrm.hrm_reports_page.text_6833de'),
            value: formatCurrency(payrollSummary?.avg_salary || 0),
            icon: <Briefcase size={24} />,
            color: 'success' as const,
          },
          {
            id: 'max-salary',
            title: t('hrm.hrm_reports_page.text_d8c7a1'),
            value: formatCurrency(payrollSummary?.max_salary || 0),
            icon: <TrendingUp size={24} />,
            color: 'warning' as const,
          },
          {
            id: 'min-salary',
            title: t('hrm.hrm_reports_page.text_ac4667'),
            value: formatCurrency(payrollSummary?.min_salary || 0),
            icon: <Clock size={24} />,
            color: 'info' as const,
          },
        ];
      default:
        return [];
    }
  }, [
    activeTab,
    employeeSummary,
    contractSummary,
    trainingSummary,
    attendanceSummary,
    payrollSummary,
    t,
  ]);

  const charts = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return [
          {
            id: 'department-distribution',
            title: i18n.t('hrm.hrm_reports_page.personnel'),
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
            title: i18n.t('hrm.hrm_reports_page.text_d88c02'),
            type: 'pie' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              {
                name: i18n.t('hrm.hrm_reports_page.text_27ff5f'),
                value: attendanceSummary?.on_time_count || 0,
                color: 'success.main',
              },
              {
                name: i18n.t('hrm.hrm_reports_page.text_0a4fd7'),
                value: attendanceSummary?.late_count || 0,
                color: ct.yellow[600],
              },
              {
                name: i18n.t('hrm.hrm_reports_page.text_10399d'),
                value: attendanceSummary?.absent_count || 0,
                color: 'error.main',
              },
              {
                name: i18n.t('hrm.hrm_reports_page.text_11bc8a'),
                value: attendanceSummary?.leave_count || 0,
                color: 'primary.main',
              },
            ].filter((d) => d.value > 0),
          },
          {
            id: 'contract-expiry',
            title: i18n.t('hrm.hrm_reports_page.text_0be4f0'),
            type: 'bar' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              {
                name: t('hrm.hrm_reports_page.this_month_1'),
                value: contractSummary?.expiring_this_month || 0,
              },
              {
                name: t('hrm.hrm_reports_page.text_e69f1a'),
                value: contractSummary?.expiring_next_month || 0,
              },
              {
                name: t('hrm.hrm_reports_page.text_e5b59f'),
                value: contractSummary?.expired_contracts || 0,
              },
              {
                name: t('hrm.hrm_reports_page.active'),
                value: contractSummary?.active_contracts || 0,
              },
            ],
          },
          {
            id: 'training-stats',
            title: t('hrm.hrm_reports_page.text_0eddf1'),
            type: 'pie' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              { name: t('hrm.hrm_reports_page.plan'), value: trainingSummary?.total_plans || 0 },
              {
                name: t('hrm.hrm_reports_page.text_07cb67'),
                value: trainingSummary?.total_courses || 0,
              },
              {
                name: t('hrm.hrm_reports_page.text_6a18d7'),
                value: trainingSummary?.total_records || 0,
              },
            ].filter((d) => d.value > 0),
          },
        ];
      case 'employee':
        return [
          {
            id: 'gender-distribution',
            title: t('hrm.hrm_reports_page.text_aaf1df'),
            type: 'pie' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              {
                name: t('hrm.hrm_reports_page.text_36a490'),
                value: employeeSummary?.male_count || 0,
                color: 'primary.main',
              },
              {
                name: t('hrm.hrm_reports_page.text_87c835'),
                value: employeeSummary?.female_count || 0,
                color: ct.secondary[500],
              },
            ].filter((d) => d.value > 0),
          },
          {
            id: 'monthly-changes',
            title: t('hrm.hrm_reports_page.personnel_1'),
            type: 'bar' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              {
                name: t('hrm.hrm_reports_page.text_798ac1'),
                value: employeeSummary?.new_hires_this_month || 0,
              },
              {
                name: t('hrm.hrm_reports_page.text_583e79'),
                value: employeeSummary?.terminations_this_month || 0,
              },
            ],
          },
        ];
      case 'training':
        return [
          {
            id: 'training-progress',
            title: t('hrm.hrm_reports_page.completed_2'),
            type: 'line' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              { name: t('hrm.hrm_reports_page.text_fccc2b'), value: 65 },
              { name: t('hrm.hrm_reports_page.text_c1d13f'), value: 72 },
              { name: t('hrm.hrm_reports_page.text_c4767b'), value: 68 },
              { name: t('hrm.hrm_reports_page.text_3eaf4b'), value: 78 },
              { name: t('hrm.hrm_reports_page.text_0545f1'), value: 82 },
              {
                name: t('hrm.hrm_reports_page.text_f2422a'),
                value: trainingSummary?.avg_completion_rate || 75,
              },
            ],
          },
          {
            id: 'training-completion-detail',
            title: t('hrm.hrm_reports_page.detail'),
            type: 'bar' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              {
                name: t('hrm.hrm_reports_page.text_3c1218'),
                value: trainingSummary?.total_courses || 0,
              },
              {
                name: t('hrm.hrm_reports_page.completed_3'),
                value: trainingSummary?.completed_courses || 0,
              },
              {
                name: t('hrm.hrm_reports_page.text_03aaf2'),
                value: trainingSummary?.total_records || 0,
              },
              {
                name: t('hrm.hrm_reports_page.completed_4'),
                value: trainingSummary?.completed_records || 0,
              },
            ],
          },
        ];
      case 'payroll':
        return [
          {
            id: 'payroll-structure',
            title: t('hrm.hrm_reports_page.text_ecd515'),
            type: 'pie' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              {
                name: t('hrm.hrm_reports_page.text_d0e803'),
                value: (payrollSummary?.total_payroll || 0) * 0.6,
              },
              {
                name: t('hrm.hrm_reports_page.text_0466ec'),
                value: (payrollSummary?.total_payroll || 0) * 0.25,
              },
              {
                name: t('hrm.hrm_reports_page.text_5e14f3'),
                value: (payrollSummary?.total_payroll || 0) * 0.15,
              },
            ],
          },
          {
            id: 'salary-range',
            title: t('hrm.hrm_reports_page.text_08acc3'),
            type: 'bar' as const,
            dataKey: 'value',
            nameKey: 'name',
            data: [
              {
                name: t('hrm.hrm_reports_page.text_00618d'),
                value: Math.floor((payrollSummary?.employee_count || 0) * 0.1),
              },
              { name: '5k-10k', value: Math.floor((payrollSummary?.employee_count || 0) * 0.4) },
              { name: '10k-15k', value: Math.floor((payrollSummary?.employee_count || 0) * 0.3) },
              {
                name: t('hrm.hrm_reports_page.text_0b05c2'),
                value: Math.floor((payrollSummary?.employee_count || 0) * 0.2),
              },
            ],
          },
        ];
      default:
        return [];
    }
  }, [
    activeTab,
    employeeSummary,
    departmentSummary,
    contractSummary,
    trainingSummary,
    attendanceSummary,
    payrollSummary,
    t,
  ]);

  const tables = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return [
          {
            id: 'department-summary',
            title: i18n.t('hrm.hrm_reports_page.personnel_2'),
            columns: [
              {
                id: 'department_name',
                label: i18n.t('hrm.hrm_reports_page.name'),
                field: 'department_name',
              },
              {
                id: 'employee_count',
                label: i18n.t('hrm.hrm_reports_page.text_c9088f'),
                field: 'employee_count',
              },
              {
                id: 'active_count',
                label: i18n.t('hrm.hrm_reports_page.text_518449'),
                field: 'active_count',
              },
              { id: 'rate', label: i18n.t('hrm.hrm_reports_page.text_72dbeb'), field: 'rate' },
            ],
            data: departmentSummary.map((d) => ({
              ...d,
              rate:
                d.employee_count > 0 ? Math.round((d.active_count / d.employee_count) * 100) : 0,
            })),
          },
        ];
      case 'employee':
        return [
          {
            id: 'employee-status',
            title: i18n.t('hrm.hrm_reports_page.status'),
            columns: [
              { id: 'status', label: i18n.t('hrm.hrm_reports_page.status_1'), field: 'status' },
              { id: 'count', label: i18n.t('hrm.hrm_reports_page.text_3640d2'), field: 'count' },
              { id: 'rate', label: i18n.t('hrm.hrm_reports_page.text_6eada8'), field: 'rate' },
            ],
            data: [
              {
                status: i18n.t('hrm.hrm_reports_page.text_b5509b'),
                count: employeeSummary?.active_employees || 0,
                rate: employeeSummary?.total_employees
                  ? Math.round(
                      (employeeSummary.active_employees / employeeSummary.total_employees) * 100
                    )
                  : 0,
              },
              {
                status: t('hrm.hrm_reports_page.text_583e79'),
                count: employeeSummary?.inactive_employees || 0,
                rate: employeeSummary?.total_employees
                  ? Math.round(
                      (employeeSummary.inactive_employees / employeeSummary.total_employees) * 100
                    )
                  : 0,
              },
            ],
          },
          {
            id: 'employee-gender',
            title: t('hrm.hrm_reports_page.text_aaf1df'),
            columns: [
              { id: 'gender', label: t('hrm.hrm_reports_page.text_787b56'), field: 'gender' },
              { id: 'count', label: t('hrm.hrm_reports_page.text_3640d2'), field: 'count' },
              { id: 'rate', label: t('hrm.hrm_reports_page.text_6eada8'), field: 'rate' },
            ],
            data: [
              {
                gender: t('hrm.hrm_reports_page.text_36a490'),
                count: employeeSummary?.male_count || 0,
                rate: employeeSummary?.total_employees
                  ? Math.round((employeeSummary.male_count / employeeSummary.total_employees) * 100)
                  : 0,
              },
              {
                gender: t('hrm.hrm_reports_page.text_87c835'),
                count: employeeSummary?.female_count || 0,
                rate: employeeSummary?.total_employees
                  ? Math.round(
                      (employeeSummary.female_count / employeeSummary.total_employees) * 100
                    )
                  : 0,
              },
            ],
          },
        ];
      case 'training':
        return [
          {
            id: 'training-plans',
            title: t('hrm.hrm_reports_page.plan_1'),
            columns: [
              { id: 'type', label: t('hrm.hrm_reports_page.type'), field: 'type' },
              { id: 'total', label: t('hrm.hrm_reports_page.text_9ed7d3'), field: 'total' },
              { id: 'completed', label: t('hrm.hrm_reports_page.completed_3'), field: 'completed' },
              { id: 'rate', label: t('hrm.hrm_reports_page.completed_5'), field: 'rate' },
            ],
            data: [
              {
                type: t('hrm.hrm_reports_page.plan'),
                total: trainingSummary?.total_plans || 0,
                completed:
                  (trainingSummary?.total_plans || 0) - (trainingSummary?.active_plans || 0),
                rate: trainingSummary?.total_plans
                  ? Math.round(
                      ((trainingSummary.total_plans - trainingSummary.active_plans) /
                        trainingSummary.total_plans) *
                        100
                    )
                  : 0,
              },
              {
                type: t('hrm.hrm_reports_page.text_07cb67'),
                total: trainingSummary?.total_courses || 0,
                completed: trainingSummary?.completed_courses || 0,
                rate: trainingSummary?.total_courses
                  ? Math.round(
                      (trainingSummary.completed_courses / trainingSummary.total_courses) * 100
                    )
                  : 0,
              },
              {
                type: t('hrm.hrm_reports_page.text_6a18d7'),
                total: trainingSummary?.total_records || 0,
                completed: trainingSummary?.completed_records || 0,
                rate: trainingSummary?.total_records
                  ? Math.round(
                      (trainingSummary.completed_records / trainingSummary.total_records) * 100
                    )
                  : 0,
              },
            ],
          },
        ];
      case 'payroll':
        return [
          {
            id: 'payroll-details',
            title: t('hrm.hrm_reports_page.text_f39721'),
            columns: [
              { id: 'item', label: t('hrm.hrm_reports_page.text_31ecc0'), field: 'item' },
              { id: 'amount', label: t('hrm.hrm_reports_page.amount'), field: 'amount' },
              { id: 'count', label: t('hrm.hrm_reports_page.text_3640d2'), field: 'count' },
            ],
            data: [
              {
                item: t('hrm.hrm_reports_page.text_2a0448'),
                amount: formatCurrency(payrollSummary?.total_payroll || 0),
                count: payrollSummary?.employee_count || 0,
              },
              {
                item: t('hrm.hrm_reports_page.text_6833de'),
                amount: formatCurrency(payrollSummary?.avg_salary || 0),
                count: '-',
              },
              {
                item: t('hrm.hrm_reports_page.text_97a337'),
                amount: formatCurrency(payrollSummary?.bonus_total || 0),
                count: '-',
              },
            ],
          },
        ];
      default:
        return [];
    }
  }, [activeTab, employeeSummary, departmentSummary, trainingSummary, payrollSummary, t]);

  return (
    <PageContainer maxWidth='xl'>
      <StatsPageTemplate
        title={t('hrm.hrm_reports_page.text_1d67f5')}
        subtitle={t('hrm.hrm_reports_page.view')}
        statCards={statCards}
        statColumns={6}
        charts={charts}
        chartColumns={{ xs: 1, md: 2, lg: 2 }}
        tables={tables}
        loading={loading}
        timeRangeOptions={[
          { label: t('hrm.hrm_reports_page.this_week'), value: 'week' },
          { label: t('hrm.hrm_reports_page.this_month_2'), value: 'month' },
          { label: t('hrm.hrm_reports_page.text_0477ce'), value: 'quarter' },
          { label: t('hrm.hrm_reports_page.this_year'), value: 'year' },
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
        onRefresh={() => refetchReports()}
        exportText={t('hrm.hrm_reports_page.export')}
        showStatCards={true}
        showCharts={true}
        showTables={true}
      />
    </PageContainer>
  );
};

export default HrmReportsPage;
