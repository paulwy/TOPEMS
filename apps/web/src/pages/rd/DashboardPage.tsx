import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, FlaskConical, CheckCircle, Rocket } from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { rdApi } from '@/api/rd';
import type { RsStatistics } from '@/api/rd';
import { RD_PATHS } from '@/modules/rd/config';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { LazyChart } from '@/components/charts';
import i18n from '@/i18n';

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText size={24} />,
  FlaskConical: <FlaskConical size={24} />,
  CheckCircle: <CheckCircle size={24} />,
  Rocket: <Rocket size={24} />,
};
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: stats, isPending: loading } = useQuery({
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
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return i18n.t('rd.dashboard_page.greeting.morning');
    if (hour < 18) return i18n.t('rd.dashboard_page.greeting.afternoon');
    return i18n.t('rd.dashboard_page.greeting.evening');
  };
  const statsCards: StatCard[] = useMemo(
    () => [
      {
        id: 'research-projects',
        title: i18n.t('rd.dashboard_page.stat_card.research_projects'),
        value: (stats?.total_projects || 8).toString(),
        icon: iconMap.FlaskConical,
        change: 1,
        changeLabel: i18n.t('rd.common.vs_last_period'),
        color: 'primary',
      },
      {
        id: 'document-count',
        title: i18n.t('rd.dashboard_page.stat_card.document_count'),
        value: (stats?.total_formulas || 256).toString(),
        icon: iconMap.FileText,
        change: 24,
        changeLabel: i18n.t('rd.common.vs_last_period'),
        color: 'info',
      },
      {
        id: 'test-cases',
        title: i18n.t('rd.dashboard_page.stat_card.test_cases'),
        value: (stats?.total_tasks || 1234).toString(),
        icon: iconMap.CheckCircle,
        change: 156,
        changeLabel: i18n.t('rd.common.vs_last_period'),
        color: 'success',
      },
      {
        id: 'version-releases',
        title: i18n.t('rd.dashboard_page.stat_card.version_releases'),
        value: (stats?.total_experiments || 5).toString(),
        icon: iconMap.Rocket,
        change: 2,
        changeLabel: i18n.t('rd.common.vs_last_period'),
        color: 'warning',
      },
    ],
    [stats, i18n.t]
  );
  const charts: ChartCard[] = useMemo(() => {
    const barData = [
      {
        name: i18n.t('rd.dashboard_page.status_label.pending'),
        value: stats?.pending_projects || 0,
      },
      {
        name: i18n.t('rd.dashboard_page.status_label.in_progress'),
        value: stats?.in_progress_projects || 0,
      },
      {
        name: i18n.t('rd.dashboard_page.status_label.completed'),
        value: stats?.completed_projects || 0,
      },
      {
        name: i18n.t('rd.dashboard_page.status_label.cancelled'),
        value: stats?.cancelled_projects || 0,
      },
    ];
    const lineData = [
      {
        name: i18n.t('rd.dashboard_page.status_label.pending'),
        value: stats?.pending_experiments || 0,
      },
      {
        name: i18n.t('rd.dashboard_page.status_label.in_progress'),
        value: stats?.in_progress_experiments || 0,
      },
      {
        name: i18n.t('rd.dashboard_page.status_label.completed'),
        value: stats?.completed_experiments || 0,
      },
    ];
    return [
      {
        id: 'project-type-distribution',
        title: i18n.t('rd.dashboard_page.chart.project_status_distribution'),
        chart: (
          <LazyChart
            type='bar'
            data={barData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
      {
        id: 'monthly-release-trend',
        title: i18n.t('rd.dashboard_page.chart.experiment_status_distribution'),
        chart: (
          <LazyChart
            type='line'
            data={lineData}
            xKey='name'
            yKey='value'
          />
        ),
        height: 300,
      },
    ];
  }, [stats, i18n.t]);
  const quickActions: QuickAction[] = [
    {
      id: 'create-research-project',
      label: i18n.t('rd.dashboard_page.quick_action.create_research_project'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(RD_PATHS.projectCreate),
    },
    {
      id: 'write-test-case',
      label: i18n.t('rd.dashboard_page.quick_action.write_test_case'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(RD_PATHS.test),
    },
    {
      id: 'release-new-version',
      label: i18n.t('rd.dashboard_page.quick_action.release_new_version'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(RD_PATHS.deploy),
    },
  ];
  return (
    <PageContainer
      title={i18n.t('rd.dashboard_page.title')}
      subtitle={i18n.t('rd.dashboard_page.subtitle', { greeting: getGreeting() })}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        stats={statsCards}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={i18n.t('rd.dashboard_page.quick_action.title')}
        loading={loading}
      />
    </PageContainer>
  );
};
export default DashboardPage;
