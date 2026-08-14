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
import i18n from '@/i18n';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction, RecentItem } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { RD_PATHS } from '@/modules/rd/config';
import { LazyChart } from '@/components/charts';
import { QUERY_KEYS } from '@/lib/reactQuery';
const ct= designTokens.colors;
const RsOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const loadingQuery = useQuery<boolean>({
    queryKey: QUERY_KEYS.AD_HOC.RD_DASHBOARD_BASE,
    queryFn: async () => true,
    staleTime: Infinity,
  });
  const loading = loadingQuery.isLoading;
  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'total-projects',
        title: i18n.t('rd.rs_overview_page.k0'),
        value: '24',
        icon: <FolderKanban size={24} />,
        change: 2,
        changeLabel: i18n.t('rd.rs_overview_page.k1'),
        color: 'primary',
      },
      {
        id: 'in-progress',
        title: i18n.t('rd.rs_overview_page.k2'),
        value: '12',
        icon: <Activity size={24} />,
        change: 3,
        changeLabel: i18n.t('rd.rs_overview_page.k3'),
        color: 'info',
      },
      {
        id: 'bug-count',
        title: i18n.t('rd.rs_overview_page.k4'),
        value: '67',
        icon: <Bug size={24} />,
        change: -15,
        changeLabel: i18n.t('rd.rs_overview_page.k5'),
        color: 'error',
      },
      {
        id: 'code-commits',
        title: i18n.t('rd.rs_overview_page.k6'),
        value: '1,842',
        icon: <Code size={24} />,
        change: 28,
        changeLabel: i18n.t('rd.rs_overview_page.k7'),
        color: 'success',
      },
      {
        id: 'build-success',
        title: i18n.t('rd.rs_overview_page.k8'),
        value: '94.2%',
        icon: <Hammer size={24} />,
        change: 2.1,
        changeLabel: i18n.t('rd.rs_overview_page.k9'),
        color: 'warning',
      },
      {
        id: 'releases',
        title: i18n.t('rd.rs_overview_page.k10'),
        value: '8',
        icon: <Rocket size={24} />,
        change: 3,
        changeLabel: i18n.t('rd.rs_overview_page.k11'),
        color: 'success',
      },
    ],
    []
  );
  const projectStatusData = [
    { name: i18n.t('rd.rs_overview_page.k12'), value: 12 },
    { name: i18n.t('rd.rs_overview_page.k13'), value: 8 },
    { name: i18n.t('rd.rs_overview_page.k14'), value: 3 },
    { name: i18n.t('rd.rs_overview_page.k15'), value: 1 },
  ];
  const monthlyBugTrendData = [
    { name: i18n.t('pages.rs_overview_page.1_0'), value: 45 },
    { name: i18n.t('pages.rs_overview_page.2_1'), value: 52 },
    { name: i18n.t('pages.rs_overview_page.3_2'), value: 38 },
    { name: i18n.t('pages.rs_overview_page.4_3'), value: 41 },
    { name: i18n.t('pages.rs_overview_page.5_4'), value: 29 },
    { name: i18n.t('pages.rs_overview_page.6_5'), value: 67 },
  ];
  const moduleCodeData = [
    { name: i18n.t('rd.rs_overview_page.k16'), value: 85000 },
    { name: i18n.t('rd.rs_overview_page.k17'), value: 120000 },
    { name: i18n.t('rd.rs_overview_page.k18'), value: 45000 },
    { name: i18n.t('rd.rs_overview_page.k19'), value: 32000 },
    { name: i18n.t('rd.rs_overview_page.k20'), value: 18000 },
  ];
  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'project-status',
        title: i18n.t('rd.rs_overview_page.k21'),
        chart: <LazyChart type='pie' data={projectStatusData} />,
        height: 300,
      },
      {
        id: 'bug-trend',
        title: i18n.t('rd.rs_overview_page.k22'),
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
        title: i18n.t('rd.rs_overview_page.k23'),
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
        label: i18n.t('rd.rs_overview_page.k24'),
        icon: <Plus size={20} />,
        onClick: () => navigate(RD_PATHS.projectCreate),
        color: ct.primary.dark,
      },
      {
        id: 'bug-manage',
        label: i18n.t('rd.rs_overview_page.k25'),
        icon: <Bug size={20} />,
        onClick: () => navigate(RD_PATHS.bug),
        color: ct.error.dark,
      },
      {
        id: 'code-manage',
        label: i18n.t('rd.rs_overview_page.k26'),
        icon: <GitBranch size={20} />,
        onClick: () => navigate(RD_PATHS.code),
        color: ct.secondary.dark,
      },
      {
        id: 'build-manage',
        label: i18n.t('rd.rs_overview_page.k27'),
        icon: <Hammer size={20} />,
        onClick: () => navigate(RD_PATHS.build),
        color: ct.warning.dark,
      },
      {
        id: 'release',
        label: i18n.t('rd.rs_overview_page.k28'),
        icon: <Rocket size={20} />,
        onClick: () => navigate(RD_PATHS.release),
        color: ct.teal[700],
      },
      {
        id: 'review',
        label: i18n.t('rd.rs_overview_page.k29'),
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
        description: i18n.t('rd.rs_overview_page.k30'),
        time: '2026-06-29 10:15',
        icon: <Bug size={18} />,
        status: 'error',
        tags: [{ label: i18n.t('rd.rs_overview_page.k31'), color: ct.error.dark }],
        onClick: () => navigate(RD_PATHS.bug),
      },
      {
        id: 'bug2',
        title: 'BUG-2026-0141',
        description: i18n.t('rd.rs_overview_page.k32'),
        time: '2026-06-29 09:30',
        icon: <Bug size={18} />,
        status: 'warning',
        tags: [{ label: i18n.t('rd.rs_overview_page.k33'), color: ct.warning.dark }],
        onClick: () => navigate(RD_PATHS.bug),
      },
      {
        id: 'build1',
        title: 'Build #328',
        description: i18n.t('rd.rs_overview_page.k34'),
        time: '2026-06-29 08:00',
        icon: <Hammer size={18} />,
        status: 'success',
        onClick: () => navigate(RD_PATHS.build),
      },
      {
        id: 'rel1',
        title: 'v2.8.1',
        description: i18n.t('rd.rs_overview_page.k35'),
        time: '2026-06-28 18:30',
        icon: <Rocket size={18} />,
        status: 'success',
        onClick: () => navigate(RD_PATHS.release),
      },
      {
        id: 'commit1',
        title: i18n.t('pages.rs_overview_page.feat_6'),
        description: i18n.t('pages.rs_overview_page.main_7'),
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
      title={i18n.t('rd.rs_overview_page.k36')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[{ label: i18n.t('rd.rs_overview_page.k38'), href: '/dashboard' }, { label: i18n.t('rd.rs_overview_page.k37') }]}
        stats={stats}
        charts={charts}
        recentItems={recentItems}
        recentTitle={i18n.t('rd.rs_overview_page.k39')}
        quickActions={quickActions}
        quickActionsTitle={i18n.t('rd.rs_overview_page.k40')}
        loading={loading}
      />
    </PageContainer>
  );
};
export default RsOverviewPage;