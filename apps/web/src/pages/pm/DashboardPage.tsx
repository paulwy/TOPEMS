import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { FolderKanban, CheckSquare, Trophy, AlertTriangle, Plus } from 'lucide-react';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';
import { DashboardTemplate, type StatCard, type ChartCard } from '@/components/templates';

const barData = [
  { name: '项目A', value: 85 },
  { name: '项目B', value: 60 },
  { name: '项目C', value: 90 },
  { name: '项目D', value: 45 },
  { name: '项目E', value: 70 },
];
const pieData = [
  { name: '开发中', value: 40 },
  { name: '测试中', value: 25 },
  { name: '待评审', value: 20 },
  { name: '已完成', value: 15 },
];
const lineData = [
  { name: 'W1', value: 5 },
  { name: 'W2', value: 8 },
  { name: 'W3', value: 6 },
  { name: 'W4', value: 10 },
  { name: 'W5', value: 7 },
  { name: 'W6', value: 9 },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // 统计卡片数据
  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'active',
        title: '进行中项目',
        value: '12',
        icon: <FolderKanban size={24} />,
        change: 2,
        changeLabel: '较上周',
        color: 'primary',
      },
      {
        id: 'pending',
        title: '待完成任务',
        value: '86',
        icon: <CheckSquare size={24} />,
        change: -15,
        changeLabel: '较上周',
        color: 'warning',
      },
      {
        id: 'completed',
        title: '本周完成',
        value: '32',
        icon: <Trophy size={24} />,
        change: 8,
        changeLabel: '较上周',
        color: 'success',
      },
      {
        id: 'overdue',
        title: '延期风险',
        value: '3',
        icon: <AlertTriangle size={24} />,
        change: -1,
        changeLabel: '较上周',
        color: 'error',
      },
    ],
    []
  );

  // 图表数据
  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'progress',
        title: '项目进度分布',
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
        title: '本周任务完成趋势',
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
        id: 'status',
        title: '项目状态分布',
        chart: <PieChartComponent data={pieData} />,
        height: 300,
        type: 'pie',
      },
    ],
    []
  );

  // 快捷操作
  const quickActions = useMemo(
    () => [
      {
        id: 'create',
        label: '创建新项目',
        icon: <Plus size={20} />,
        onClick: () => navigate('/pm/projects/create'),
      },
      {
        id: 'assign',
        label: '分配任务',
        icon: <CheckSquare size={20} />,
        onClick: () => navigate('/pm/tasks/assign'),
      },
      {
        id: 'timeline',
        label: '查看时间线',
        icon: <FolderKanban size={20} />,
        onClick: () => navigate('/pm/timeline'),
      },
      {
        id: 'report',
        label: '生成报表',
        icon: <Trophy size={20} />,
        onClick: () => navigate('/pm/reports'),
      },
    ],
    [navigate]
  );

  return (
    <DashboardTemplate
      title='项目管理'
      subtitle='项目进度与任务追踪'
      breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '项目' }]}
      stats={stats}
      charts={charts}
      quickActions={quickActions}
      quickActionsTitle='快捷操作'
      loading={loading}
      onRefresh={() => setLoading(true)}
    />
  );
};

export default DashboardPage;
