import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Target, TrendingUp, Users, Clock } from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCardConfig, ChartConfig } from '@/components/templates/DashboardTemplate';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';
import { useCrmDashboardSchema } from '@/schemas/crm';


import { QUERY_KEYS } from '@/lib/reactQuery';

const CrmDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const schema = useCrmDashboardSchema();

  const { isPending: loading} = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.CRM_DASHBOARD_BASE,
    queryFn: async () => {
      await schema.loader?.();
      return window.__crmStats ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const statCards = useMemo<StatCardConfig[]>(() => {
    return (
      schema.statCards?.map((sc) => {
        const value = typeof sc.value === 'function' ? sc.value() : sc.value;
        const iconMap: Record<string, React.ReactNode> = {
          Target: <Target size={24} />,
          TrendingUp: <TrendingUp size={24} />,
          Users: <Users size={24} />,
          Clock: <Clock size={24} />,
        };
        return {
          title: t(`crm.dashboard.${sc.id}`),
          value: value as string | number,
          icon: iconMap[sc.icon as string] ?? <Target size={24} />,
          color: sc.color,
          trend: sc.trend,
          loading,
        } as StatCardConfig;
      }) ?? []
    );
  }, [schema.statCards, loading, t]);

  const charts = useMemo<ChartConfig[]>(() => {
    return (
      schema.charts?.map((ch) => {
        const rawData =
          typeof ch.data === 'function'
            ? (ch.data as () => Array<Record<string, unknown>>)()
            : (ch.data as Array<Record<string, unknown>>);
        return {
          title: t(`crm.dashboard.${ch.id}`),
          type: ch.type,
          data: (rawData ?? []) as Array<Record<string, unknown>>,
          xField: 'name',
          yField: 'value',
          height: ch.height,
          loading,
        };
      }) ?? []
    );
  }, [schema.charts, loading, t]);

  return (
    <PageContainer
      title={t('crm.dashboard.title')}
      padding={false}
      maxWidth={false}
      autoTitle
      autoBreadcrumbs
    >
      <DashboardTemplate
        title=''
        statCards={statCards}
        charts={charts as any}
        loading={loading}
      />
    </PageContainer>
  );
};

export default CrmDashboardPage;
