import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ClipboardList, CheckCircle, Activity } from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type {
  StatCardConfig,
  ChartConfig,
  ChartCard,
} from '@/components/templates/DashboardTemplate';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';
import { useEhsDashboardSchema } from '@/schemas/ehs';

import { QUERY_KEYS } from '@/lib/reactQuery';

const EhsDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const schema = useEhsDashboardSchema();

  const { isPending: loading } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.EHS_DASHBOARD_BASE,
    queryFn: async () => {
      // schema.loader 内部调用 ehsDashboardApi.getOverview() 并填充模块级 ehsStats
      await schema.loader?.();
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const statCards = useMemo<StatCardConfig[]>(() => {
    return (
      schema.statCards?.map((sc) => {
        const value = typeof sc.value === 'function' ? sc.value() : sc.value;
        const iconMap: Record<string, React.ReactNode> = {
          AlertCircle: <AlertCircle size={24} />,
          ClipboardList: <ClipboardList size={24} />,
          CheckCircle: <CheckCircle size={24} />,
          Activity: <Activity size={24} />,
        };
        return {
          title: t(`ehs.dashboard.${sc.id}`),
          value: value as string | number,
          icon: iconMap[sc.icon as string] ?? <Activity size={24} />,
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
          title: t(`ehs.dashboard.${ch.id}`),
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
      title={t('ehs.dashboard.title')}
      padding={false}
      maxWidth={false}
      autoTitle
      autoBreadcrumbs
    >
      <DashboardTemplate
        title=''
        statCards={statCards}
        charts={charts as unknown as ChartCard[]}
        loading={loading}
      />
    </PageContainer>
  );
};

export default EhsDashboardPage;
