import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, FlaskConical, CheckCircle, Rocket } from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import BarChartComponent from '../../components/charts/BarChart';
import LineChartComponent from '../../components/charts/LineChart';
import { rdApi } from '@/api/rd';
import type { RsStatistics } from '@/api/rd';
import { RD_PATHS } from '@/modules/rd/config';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText size={24} />,
  FlaskConical: <FlaskConical size={24} />,
  CheckCircle: <CheckCircle size={24} />,
  Rocket: <Rocket size={24} />,
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return '上午好';
  if (hour < 18) return '下午好';
  return '晚上好';
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.RD.STATISTICS,
    queryFn: async () => {
      const response = await rdApi.getStatistics();
      if (response.success && response.data) {
        return response.data as RsStatistics;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const statsCards: StatCard[] = useMemo(
    () => [
      {
        id: 'research-projects',
        title: '研发项目',
        value: (stats?.total_projects || 8).toString(),
        icon: iconMap.FlaskConical,
        change: 1,
        changeLabel: 'vs 上周期',
        color: 'primary',
      },
      {
        id: 'document-count',
        title: '文档数量',
        value: (stats?.total_formulas || 256).toString(),
        icon: iconMap.FileText,
        change: 24,
        changeLabel: 'vs 上周期',
        color: 'info',
      },
      {
        id: 'test-cases',
        title: '测试用例',
        value: (stats?.total_tasks || 1234).toString(),
        icon: iconMap.CheckCircle,
        change: 156,
        changeLabel: 'vs 上周期',
        color: 'success',
      },
      {
        id: 'version-releases',
        title: '版本发布',
        value: (stats?.total_experiments || 5).toString(),
        icon: iconMap.Rocket,
        change: 2,
        changeLabel: 'vs 上周期',
        color: 'warning',
      },
    ],
    [stats]
  );

  const charts: ChartCard[] = useMemo(() => {
    const barData = [
      { name: '待处理', value: stats?.pending_projects || 0 },
      { name: '进行中', value: stats?.in_progress_projects || 0 },
      { name: '已完成', value: stats?.completed_projects || 0 },
      { name: '已取消', value: stats?.cancelled_projects || 0 },
    ];
    const lineData = [
      { name: '待处理', value: stats?.pending_experiments || 0 },
      { name: '进行中', value: stats?.in_progress_experiments || 0 },
      { name: '已完成', value: stats?.completed_experiments || 0 },
    ];
    return [
      {
        id: 'project-type-distribution',
        title: '项目状态分布',
        chart: (
          <BarChartComponent
            data={barData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
      {
        id: 'monthly-release-trend',
        title: '实验状态分布',
        chart: (
          <LineChartComponent
            data={lineData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
    ];
  }, [stats]);

  const quickActions: QuickAction[] = [
    {
      id: 'create-research-project',
      label: '创建研发项目',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(RD_PATHS.projectCreate),
    },
    {
      id: 'write-test-case',
      label: '编写测试用例',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(RD_PATHS.test),
    },
    {
      id: 'release-new-version',
      label: '发布新版本',
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(RD_PATHS.deploy),
    },
  ];

  return (
    <PageContainer
      title='研发管理'
      subtitle={`${getGreeting()}，研发项目与文档管理`}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        stats={statsCards}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle='快捷操作'
        loading={loading}
      />
    </PageContainer>
  );
};

export default DashboardPage;
