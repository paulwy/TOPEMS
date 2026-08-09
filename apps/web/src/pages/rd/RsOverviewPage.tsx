import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction, RecentItem } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { RD_PATHS } from '@/modules/rd/config';
import { LazyChart } from '@/components/charts';

const ct = designTokens.colors;

const RsOverviewPage: React.FC = () => {
  const navigate = useNavigate();

  const loadingQuery = useQuery<boolean>({
    queryKey: ['rd-dashboard'],
    queryFn: async () => true,
    staleTime: Infinity,
  });
  const loading = loadingQuery.isLoading;

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
        chart: <LazyChart type='pie' data={projectStatusData} />,
        height: 300,
      },
      {
        id: 'bug-trend',
        title: '月度缺陷趋势',
        chart: (
          <LazyChart type='line'
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
          <LazyChart type='bar'
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
        onClick: () => navigate(RD_PATHS.projectCreate),
        color: ct.primary.dark,
      },
      {
        id: 'bug-manage',
        label: '缺陷管理',
        icon: <Bug size={20} />,
        onClick: () => navigate(RD_PATHS.bug),
        color: ct.error.dark,
      },
      {
        id: 'code-manage',
        label: '代码管理',
        icon: <GitBranch size={20} />,
        onClick: () => navigate(RD_PATHS.code),
        color: ct.secondary.dark,
      },
      {
        id: 'build-manage',
        label: '构建管理',
        icon: <Hammer size={20} />,
        onClick: () => navigate(RD_PATHS.build),
        color: ct.warning.dark,
      },
      {
        id: 'release',
        label: '版本发布',
        icon: <Rocket size={20} />,
        onClick: () => navigate(RD_PATHS.release),
        color: ct.teal[700],
      },
      {
        id: 'review',
        label: '评审管理',
        icon: <ShieldCheck size={20} />,
        onClick: () => navigate(RD_PATHS.review),
        color: ct.success.dark,
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
        tags: [{ label: '严重', color: ct.error.dark }],
        onClick: () => navigate(RD_PATHS.bug),
      },
      {
        id: 'bug2',
        title: 'BUG-2026-0141',
        description: '数据导出超时',
        time: '2026-06-29 09:30',
        icon: <Bug size={18} />,
        status: 'warning',
        tags: [{ label: '中等', color: ct.warning.dark }],
        onClick: () => navigate(RD_PATHS.bug),
      },
      {
        id: 'build1',
        title: 'Build #328',
        description: '前端生产构建成功',
        time: '2026-06-29 08:00',
        icon: <Hammer size={18} />,
        status: 'success',
        onClick: () => navigate(RD_PATHS.build),
      },
      {
        id: 'rel1',
        title: 'v2.8.1',
        description: '修复登录相关缺陷，优化性能',
        time: '2026-06-28 18:30',
        icon: <Rocket size={18} />,
        status: 'success',
        onClick: () => navigate(RD_PATHS.release),
      },
      {
        id: 'commit1',
        title: 'feat: 新增用户权限模块',
        description: '提交者: 张三 | main分支',
        time: '2026-06-28 17:45',
        icon: <FileCode size={18} />,
        status: 'info',
        onClick: () => navigate(RD_PATHS.code),
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
