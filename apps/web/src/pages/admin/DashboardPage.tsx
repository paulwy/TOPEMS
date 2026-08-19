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
import { adminApi } from '@/api/admin';
const ct= designTokens.colors;
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
const getPieData = () => [
  { name: i18n.t('admin.dashboard_page.k0'), value: 5 },
  { name: i18n.t('admin.dashboard_page.k1'), value: 10 },
  { name: i18n.t('admin.dashboard_page.k2'), value: 75 },
  { name: i18n.t('admin.dashboard_page.k3'), value: 10 },
];
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      try {
        // TODO: adminApi 暂无 getDashboardSummary 方法
        return {};
      } catch {
        return {};
      }
    },
  });
  const dashboardQuery = useQuery<boolean>({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_DASHBOARD_BASE,
    queryFn: async () => true,
    staleTime: 5 * 60 * 1000,
  });
  const loading = dashboardQuery.isLoading;
  const stats: StatCard[] = [
    {
      id: 'total-users',
      title: i18n.t('admin.dashboard_page.k7'),
      value: '1,280',
      icon: iconMap.Users,
      change: 45,
      changeLabel: i18n.t('pages.dashboard_page.vs_0'),
      color: 'primary',
    },
    {
      id: 'online-users',
      title: i18n.t('admin.dashboard_page.k8'),
      value: '128',
      icon: iconMap.Activity,
      change: 12,
      changeLabel: i18n.t('pages.dashboard_page.vs_1'),
      color: 'success',
    },
    {
      id: 'role-count',
      title: i18n.t('admin.dashboard_page.k9'),
      value: '15',
      icon: iconMap.Shield,
      change: 2,
      changeLabel: i18n.t('pages.dashboard_page.vs_2'),
      color: 'info',
    },
    {
      id: 'system-alerts',
      title: i18n.t('admin.dashboard_page.k10'),
      value: '3',
      icon: iconMap.AlertTriangle,
      change: -5,
      changeLabel: i18n.t('pages.dashboard_page.vs_3'),
      color: 'warning',
    },
  ];
  const charts: ChartCard[] = [
    {
      id: 'user-role-distribution',
      title: i18n.t('admin.dashboard_page.k11'),
      chart: <LazyChart type='pie' data={getPieData()} />,
      height: 300,
    },
  ];
  const recentItems: RecentItem[] = [
    {
      id: 'user-1',
      title: i18n.t('admin.dashboard_page.k12'),
      description: i18n.t('admin.dashboard_page.10_13'),
      status: 'success',
    },
    {
      id: 'user-2',
      title: i18n.t('admin.dashboard_page.k14'),
      description: i18n.t('admin.dashboard_page.30_15'),
      status: 'success',
    },
    {
      id: 'user-3',
      title: i18n.t('admin.dashboard_page.k16'),
      description: i18n.t('admin.dashboard_page.1_17'),
      status: 'default',
    },
    {
      id: 'user-4',
      title: i18n.t('admin.dashboard_page.k18'),
      description: i18n.t('admin.dashboard_page.2_19'),
      status: 'success',
    },
  ];
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