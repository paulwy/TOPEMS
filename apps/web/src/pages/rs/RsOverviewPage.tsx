import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Activity,
  Bug,
  Code,
  Hammer,
  Rocket,
  GitBranch,
  FileCode,
  Users,
  Plus,
  ClipboardList,
  ShieldCheck,
} from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction, RecentItem } from '@/components/templates';
import { PageContainer } from '@/components/common';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import PieChartComponent from '../../components/charts/PieChart';

const RsOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'total-projects',
        title: '项目总数',
        value: '24',
        icon: <FolderKanban size={24} />,
        change: 2,
        changeLabel: '较上月',
        color: 'primary',
      },
      {
        id: 'in-progress',
        title: '进行中',
        value: '12',
        icon: <Activity size={24} />,
        change: 3,
        changeLabel: '较上月',
        color: 'info',
      },
      {
        id: 'bug-count',
        title: '缺陷数',
        value: '67',
        icon: <Bug size={24} />,
        change: -15,
        changeLabel: '较上月',
        color: 'error',
      },
      {
        id: 'code-commits',
        title: '代码提交',
        value: '1,842',
        icon: <Code size={24} />,
        change: 28,
        changeLabel: '较上月',
        color: 'success',
      },
      {
        id: 'build-success',
        title: '构建成功率',
        value: '94.2%',
        icon: <Hammer size={24} />,
        change: 2.1,
        changeLabel: '较上月',
        color: 'warning',
      },
      {
        id: 'releases',
        title: '发布版本',
        value: '8',
        icon: <Rocket size={24} />,
        change: 3,
        changeLabel: '较上月',
        color: 'success',
      },
    ],
    []
  );

  const projectStatusData = [
    { name: '进行中', value: 12 },
    { name: '已完成', value: 8 },
    { name: '暂停', value: 3 },
    { name: '规划中', value: 1 },
  ];

  const monthlyBugTrendData = [
    { name: '1月', value: 45 },
    { name: '2月', value: 52 },
    { name: '3月', value: 38 },
    { name: '4月', value: 41 },
    { name: '5月', value: 29 },
    { name: '6月', value: 67 },
  ];

  const moduleCodeData = [
    { name: '前端', value: 85000 },
    { name: '后端', value: 120000 },
    { name: '移动端', value: 45000 },
    { name: '公共库', value: 32000 },
    { name: '测试', value: 18000 },
  ];

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'project-status',
        title: '项目状态分布',
        chart: <PieChartComponent data={projectStatusData} />,
        height: 300,
      },
      {
        id: 'bug-trend',
        title: '月度缺陷趋势',
        chart: (
          <LineChartComponent
            data={monthlyBugTrendData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
      {
        id: 'module-code',
        title: '模块代码量',
        chart: (
          <BarChartComponent
            data={moduleCodeData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
    ],
    []
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'new-project',
        label: '新建项目',
        icon: <Plus size={20} />,
        onClick: () => navigate('/rs/projects/create'),
        color: '#1976d2',
      },
      {
        id: 'bug-manage',
        label: '缺陷管理',
        icon: <Bug size={20} />,
        onClick: () => navigate('/rs/bugs'),
        color: '#c62828',
      },
      {
        id: 'code-manage',
        label: '代码管理',
        icon: <GitBranch size={20} />,
        onClick: () => navigate('/rs/code'),
        color: '#7b1fa2',
      },
      {
        id: 'build-manage',
        label: '构建管理',
        icon: <Hammer size={20} />,
        onClick: () => navigate('/rs/builds'),
        color: '#f57c00',
      },
      {
        id: 'release',
        label: '版本发布',
        icon: <Rocket size={20} />,
        onClick: () => navigate('/rs/releases'),
        color: '#00796b',
      },
      {
        id: 'review',
        label: '评审管理',
        icon: <ShieldCheck size={20} />,
        onClick: () => navigate('/rs/reviews'),
        color: '#388e3c',
      },
    ],
    [navigate]
  );

  const recentItems: RecentItem[] = useMemo(
    () => [
      {
        id: 'bug1',
        title: 'BUG-2026-0142',
        description: '登录页面白屏问题',
        time: '2026-06-29 10:15',
        icon: <Bug size={18} />,
        status: 'error',
        tags: [{ label: '严重', color: '#c62828' }],
        onClick: () => navigate('/rs/bugs/bug1'),
      },
      {
        id: 'bug2',
        title: 'BUG-2026-0141',
        description: '数据导出超时',
        time: '2026-06-29 09:30',
        icon: <Bug size={18} />,
        status: 'warning',
        tags: [{ label: '中等', color: '#f57c00' }],
        onClick: () => navigate('/rs/bugs/bug2'),
      },
      {
        id: 'build1',
        title: 'Build #328',
        description: '前端生产构建成功',
        time: '2026-06-29 08:00',
        icon: <Hammer size={18} />,
        status: 'success',
        onClick: () => navigate('/rs/builds/build1'),
      },
      {
        id: 'rel1',
        title: 'v2.8.1',
        description: '修复登录相关缺陷，优化性能',
        time: '2026-06-28 18:30',
        icon: <Rocket size={18} />,
        status: 'success',
        onClick: () => navigate('/rs/releases/rel1'),
      },
      {
        id: 'commit1',
        title: 'feat: 新增用户权限模块',
        description: '提交者: 张三 | main分支',
        time: '2026-06-28 17:45',
        icon: <FileCode size={18} />,
        status: 'info',
        onClick: () => navigate('/rs/code'),
      },
    ],
    [navigate]
  );

  return (
    <PageContainer
      title='研发管理'
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '研发' }]}
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

export default RsOverviewPage;
