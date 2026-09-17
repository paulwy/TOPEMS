import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, Shield, Activity, AlertTriangle, ArrowRight } from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction, RecentItem } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { IAM_PATHS } from '@/modules/iam/config';
import { ADMIN_PATHS } from '@/modules/admin/config';
import { designTokens } from '@/theme/tokens';
import { LazyChart } from '@/components/charts';
import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const ct = designTokens.colors;
const iconMap: Record<string, React.ReactNode> = {
  Users: <Users size={24} />,
  Shield: <Shield size={24} />,
  Activity: <Activity size={24} />,
  AlertTriangle: <AlertTriangle size={24} />,
};
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return i18n.t('admin.dashboard_page.k4');
  if (hour < 18) return i18n.t('admin.dashboard_page.k5');
  return i18n.t('admin.dashboard_page.k6');
};
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const dashboardQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_DASHBOARD_BASE,
    queryFn: async () => {
      const { getDashboard } = await import('@/api/bff');
      return getDashboard();
    },
    staleTime: 5 * 60 * 1000,
  });
  const loading = dashboardQuery.isLoading;
  const services = dashboardQuery.data?.services ?? [];
  const erpStats = dashboardQuery.data?.stats?.erp;
  const healthyCount = services.filter((s) => s.healthy).length;
  const stats: StatCard[] = [
    {
      id: 'service-health',
      title: i18n.t('admin.dashboard_page.k27'),
      value: `${healthyCount}/${services.length || 0}`,
      icon: iconMap.Activity,
      change: services.length ? Math.round((healthyCount / services.length) * 100) : 0,
      changeLabel: '%',
      color: healthyCount === services.length && services.length > 0 ? 'success' : 'warning',
    },
    {
      id: 'erp-purchase-orders',
      title: i18n.t('admin.dashboard_page.k28'),
      value: erpStats?.total ?? '—',
      icon: iconMap.Shield,
      color: 'primary',
    },
    {
      id: 'erp-inventory-items',
      title: i18n.t('admin.dashboard_page.k29'),
      value: erpStats?.active ?? '—',
      icon: iconMap.Users,
      color: 'info',
    },
    {
      id: 'erp-available',
      title: i18n.t('admin.dashboard_page.k30'),
      value: erpStats?.available
        ? i18n.t('admin.dashboard_page.k33')
        : i18n.t('admin.dashboard_page.k34'),
      icon: iconMap.AlertTriangle,
      color: erpStats?.available ? 'success' : 'warning',
    },
  ];
  const charts: ChartCard[] = [
    {
      id: 'service-health-distribution',
      title: i18n.t('admin.dashboard_page.k37'),
      chart: (
        <LazyChart
          type='pie'
          data={[
            { name: i18n.t('admin.dashboard_page.k35'), value: healthyCount },
            {
              name: i18n.t('admin.dashboard_page.k36'),
              value: Math.max(services.length - healthyCount, 0),
            },
          ]}
        />
      ),
      height: 300,
    },
  ];
  const recentItems: RecentItem[] = services.map((s) => ({
    id: s.service,
    title: s.service,
    description: s.url,
    status: s.healthy ? ('success' as const) : ('default' as const),
  }));
  const quickActions: QuickAction[] = [
    {
      id: 'user-management',
      label: i18n.t('admin.dashboard_page.k20'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(IAM_PATHS.user),
    },
    {
      id: 'role-management',
      label: i18n.t('admin.dashboard_page.k21'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(IAM_PATHS.role),
    },
    {
      id: 'permission-management',
      label: i18n.t('admin.dashboard_page.k22'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(IAM_PATHS.permission),
    },
    {
      id: 'audit-log',
      label: i18n.t('admin.dashboard_page.k23'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(ADMIN_PATHS.auditLog),
    },
  ];
  return (
    <PageContainer
      title={i18n.t('admin.dashboard_page.k24')}
      subtitle={getGreeting()}
      headerProps={{
        pageIcon: <Shield style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.main} 100%)`,
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        stats={stats}
        charts={charts}
        recentItems={recentItems}
        recentTitle={i18n.t('admin.dashboard_page.k25')}
        quickActions={quickActions}
        quickActionsTitle={i18n.t('admin.dashboard_page.k26')}
        loading={loading}
      />
    </PageContainer>
  );
};
export default DashboardPage;
