import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, ShieldCheck, KeyRound, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { DashboardTemplate } from '@/components/templates';
import type { StatCard, ChartCard, QuickAction } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import { userApi } from '@/api/iam/user';
import { roleApi } from '@/api/iam/role';
import { permissionApi } from '@/api/iam/permission';
import { IAM_PATHS } from '@/module-configs/iam/config';

/**
 * 身份管理（IAM）专属看板。
 *
 * 与系统管理 admin 看板解耦：这里只聚合 IAM 域的用户 / 角色 / 权限概览，
 * 数据来自既有列表接口（用户总数取 listUsers.total，角色/权限取列表长度），
 * 不引入服务健康、ERP 统计等 admin 域内容。
 */
export const DashboardPage: React.FC = () => {
  const { t } = useTranslation('iam');
  const navigate = useNavigate();

  const usersQuery = useQuery({
    queryKey: ['iam-dashboard', 'users'],
    queryFn: async () => {
      const res = await userApi.listUsers({ page: 1, page_size: 1 });
      return res.data?.total ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  const rolesQuery = useQuery({
    queryKey: ['iam-dashboard', 'roles'],
    queryFn: async () => {
      const res = await roleApi.listRoles();
      return res.data?.length ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  const permissionsQuery = useQuery({
    queryKey: ['iam-dashboard', 'permissions'],
    queryFn: async () => {
      const res = await permissionApi.listPermissions();
      return res.data?.length ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  const loading = usersQuery.isLoading || rolesQuery.isLoading || permissionsQuery.isLoading;

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'users',
        title: t('iam.dashboard_page.stat_users'),
        value: usersQuery.data ?? '-',
        icon: <Users size={24} />,
        color: 'primary',
      },
      {
        id: 'roles',
        title: t('iam.dashboard_page.stat_roles'),
        value: rolesQuery.data ?? '-',
        icon: <ShieldCheck size={24} />,
        color: 'success',
      },
      {
        id: 'permissions',
        title: t('iam.dashboard_page.stat_permissions'),
        value: permissionsQuery.data ?? '-',
        icon: <KeyRound size={24} />,
        color: 'info',
      },
    ],
    [usersQuery.data, rolesQuery.data, permissionsQuery.data, t]
  );

  const charts: ChartCard[] = [];

  const quickActions: QuickAction[] = [
    {
      id: 'user-management',
      label: t('iam.dashboard_page.action_users'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(IAM_PATHS.user),
    },
    {
      id: 'role-management',
      label: t('iam.dashboard_page.action_roles'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(IAM_PATHS.role),
    },
    {
      id: 'permission-management',
      label: t('iam.dashboard_page.action_permissions'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(IAM_PATHS.permission),
    },
    {
      id: 'resource-acl',
      label: t('iam.dashboard_page.action_acl'),
      icon: <ArrowRight size={18} />,
      onClick: () => navigate(IAM_PATHS.resourceAcl),
    },
  ];

  return (
    <PageContainer
      title={t('iam.dashboard_page.title')}
      subtitle={t('iam.dashboard_page.subtitle')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        autoTitle={false}
        title=''
        subtitle=''
        stats={stats}
        charts={charts}
        quickActions={quickActions}
        quickActionsTitle={t('iam.dashboard_page.quick_actions_title')}
        loading={loading}
      />
    </PageContainer>
  );
};

export default DashboardPage;
