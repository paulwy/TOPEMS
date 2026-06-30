import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Clock,
  Calendar,
  Award,
  GraduationCap,
  FileCheck,
  DollarSign,
  PersonStanding,
  ClipboardList,
  Briefcase,
} from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction, RecentItem } from '@/components/templates';
import { PageContainer } from '@/components/common';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';

const HrmOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'total-employees',
        title: '员工总数',
        value: '256',
        icon: <Users size={24} />,
        change: 12,
        changeLabel: '较上月',
        color: 'primary',
      },
      {
        id: 'new-hires',
        title: '本月入职',
        value: '8',
        icon: <UserPlus size={24} />,
        change: 3,
        changeLabel: '较上月',
        color: 'success',
      },
      {
        id: 'attendance-exception',
        title: '考勤异常',
        value: '15',
        icon: <Clock size={24} />,
        change: -5,
        changeLabel: '较上月',
        color: 'error',
      },
      {
        id: 'pending-leave',
        title: '待审批请假',
        value: '6',
        icon: <Calendar size={24} />,
        change: 2,
        changeLabel: '待处理',
        color: 'warning',
      },
      {
        id: 'avg-performance',
        title: '平均绩效',
        value: '85.3',
        icon: <Award size={24} />,
        change: 3.2,
        changeLabel: '较上月',
        color: 'info',
      },
      {
        id: 'training-complete',
        title: '培训完成率',
        value: '78%',
        icon: <GraduationCap size={24} />,
        change: 8,
        changeLabel: '较上月',
        color: 'success',
      },
    ],
    []
  );

  const departmentData = [
    { name: '技术部', value: 85 },
    { name: '产品部', value: 42 },
    { name: '市场部', value: 35 },
    { name: '财务部', value: 22 },
    { name: '人事部', value: 18 },
    { name: '运营部', value: 28 },
    { name: '销售部', value: 26 },
  ];

  const monthlyTrendData = [
    { name: '1月', value: 5 },
    { name: '2月', value: 3 },
    { name: '3月', value: 8 },
    { name: '4月', value: 6 },
    { name: '5月', value: 7 },
    { name: '6月', value: 8 },
  ];

  const performanceData = [
    { name: '优秀', value: 25 },
    { name: '良好', value: 40 },
    { name: '合格', value: 28 },
    { name: '待改进', value: 7 },
  ];

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'department-distribution',
        title: '部门人数分布',
        chart: (
          <BarChartComponent
            data={departmentData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
      {
        id: 'hire-trend',
        title: '月度入职离职趋势',
        chart: (
          <LineChartComponent
            data={monthlyTrendData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
      {
        id: 'performance-distribution',
        title: '绩效分布',
        chart: <PieChartComponent data={performanceData} />,
        height: 300,
      },
    ],
    []
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'employee-manage',
        label: '员工管理',
        icon: <Users size={20} />,
        onClick: () => navigate('/hrm/employees'),
        color: '#1976d2',
      },
      {
        id: 'attendance-manage',
        label: '考勤管理',
        icon: <Clock size={20} />,
        onClick: () => navigate('/hrm/attendance'),
        color: '#7b1fa2',
      },
      {
        id: 'leave-manage',
        label: '请假管理',
        icon: <Calendar size={20} />,
        onClick: () => navigate('/hrm/leave'),
        color: '#388e3c',
      },
      {
        id: 'salary-manage',
        label: '薪酬管理',
        icon: <DollarSign size={20} />,
        onClick: () => navigate('/hrm/salary'),
        color: '#f57c00',
      },
      {
        id: 'performance-review',
        label: '绩效考核',
        icon: <Award size={20} />,
        onClick: () => navigate('/hrm/performance'),
        color: '#00796b',
      },
      {
        id: 'recruitment',
        label: '招聘管理',
        icon: <Briefcase size={20} />,
        onClick: () => navigate('/hrm/recruitment'),
        color: '#c62828',
      },
    ],
    [navigate]
  );

  const recentItems: RecentItem[] = useMemo(
    () => [
      {
        id: 'leave1',
        title: '请假申请 - 李四',
        description: '年假 3天 (7/1-7/3)',
        time: '2026-06-29 09:30',
        icon: <Calendar size={18} />,
        status: 'warning',
        tags: [{ label: '待审批', color: '#f57c00' }],
        onClick: () => navigate('/hrm/leave/leave1'),
      },
      {
        id: 'emp1',
        title: '新员工入职 - 王五',
        description: '技术部 - 高级前端工程师',
        time: '2026-06-29 08:00',
        icon: <UserPlus size={18} />,
        status: 'success',
        onClick: () => navigate('/hrm/employees/emp1'),
      },
      {
        id: 'att1',
        title: '考勤异常 - 张三',
        description: '6月28日迟到35分钟',
        time: '2026-06-28 17:30',
        icon: <Clock size={18} />,
        status: 'error',
        onClick: () => navigate('/hrm/attendance/att1'),
      },
      {
        id: 'perf1',
        title: 'Q2绩效考核完成',
        description: '技术部考核已全部提交',
        time: '2026-06-28 16:00',
        icon: <Award size={18} />,
        status: 'success',
        onClick: () => navigate('/hrm/performance'),
      },
      {
        id: 'train1',
        title: '新员工培训 - 第3期',
        description: '已完成 24/30 人',
        time: '2026-06-27 15:00',
        icon: <GraduationCap size={18} />,
        status: 'info',
        tags: [{ label: '进行中', color: '#1976d2' }],
        onClick: () => navigate('/hrm/training/train1'),
      },
    ],
    [navigate]
  );

  return (
    <PageContainer
      title='人力资源管理'
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '人力资源' }]}
        stats={stats}
        charts={charts}
        recentItems={recentItems}
        recentTitle='最近动态'
        quickActions={quickActions}
        quickActionsTitle='快捷操作'
        loading={loading}
      />
    </PageContainer>
  );
};

export default HrmOverviewPage;
