import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, GraduationCap, Award, ArrowRight } from 'lucide-react';
import { BarChart3, Activity } from 'lucide-react';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';

const barData = [
  { name: '技术部', value: 85 },
  { name: '产品部', value: 45 },
  { name: '市场部', value: 52 },
  { name: '财务部', value: 28 },
  { name: '人事部', value: 18 },
  { name: '运营部', value: 28 },
];
const pieData = [
  { name: '试用期', value: 15 },
  { name: '正式', value: 75 },
  { name: '实习', value: 10 },
];
const lineData = [
  { name: '1月', value: 2 },
  { name: '2月', value: 3 },
  { name: '3月', value: 5 },
  { name: '4月', value: 4 },
  { name: '5月', value: 6 },
  { name: '6月', value: 8 },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return '上午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'total-employees',
        title: '员工总数',
        value: '256',
        icon: <Users size={24} />,
        change: 12,
        changeLabel: '较上周期',
        color: 'primary',
      },
      {
        id: 'new-hires',
        title: '本月入职',
        value: '8',
        icon: <UserPlus size={24} />,
        change: 3,
        changeLabel: '较上周期',
        color: 'success',
      },
      {
        id: 'training',
        title: '培训课程',
        value: '23',
        icon: <GraduationCap size={24} />,
        change: 5,
        changeLabel: '较上周期',
        color: 'info',
      },
      {
        id: 'performance',
        title: '绩效考核',
        value: '189',
        icon: <Award size={24} />,
        change: 45,
        changeLabel: '较上周期',
        color: 'warning',
      },
    ],
    []
  );

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'overview',
        title: '数据概览',
        chart: (
          <BarChartComponent
            data={barData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
        type: 'bar',
      },
      {
        id: 'trend',
        title: '趋势分析',
        chart: (
          <LineChartComponent
            data={lineData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
        type: 'line',
      },
      {
        id: 'distribution',
        title: '分类占比',
        chart: <PieChartComponent data={pieData} />,
        height: 300,
        type: 'pie',
      },
    ],
    []
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'new-employee',
        label: '新增员工',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate('/hrm/employees/create'),
      },
      {
        id: 'recruitment',
        label: '招聘管理',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate('/hrm/recruitment'),
      },
      {
        id: 'training-plan',
        label: '培训计划',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate('/hrm/training'),
      },
      {
        id: 'performance-review',
        label: '绩效考核',
        icon: <ArrowRight size={18} />,
        onClick: () => navigate('/hrm/performance'),
      },
    ],
    [navigate]
  );

  return (
    <DashboardTemplate
      title='人力资源管理'
      subtitle={`${getGreeting()}，员工管理与绩效考核`}
      breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '人力资源' }]}
      stats={stats}
      charts={charts}
      quickActions={quickActions}
      quickActionsTitle='快捷操作'
      loading={loading}
    />
  );
};

export default DashboardPage;
