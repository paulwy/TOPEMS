import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Clock, BarChart3, CheckCircle } from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCardConfig, ChartConfig } from '@/components/templates/DashboardTemplate';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';
import { useLimsDashboardSchema } from '@/schemas/lims';


import { QUERY_KEYS } from '@/lib/reactQuery';

const LimsDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const schema = useLimsDashboardSchema();

  const { isPending: loading} = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.LIMS_DASHBOARD_BASE,
    queryFn: async () => {
      await schema.loader?.();
      return window.__limsStats ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const statCards = useMemo<StatCardConfig[]>(() => {
    return (
      schema.statCards?.map((sc) => {
        const value = typeof sc.value === 'function' ? sc.value() : sc.value;
        const iconMap: Record<string, React.ReactNode> = {
          FileText: <FileText size={24} />,
          Clock: <Clock size={24} />,
          BarChart3: <BarChart3 size={24} />,
          CheckCircle: <CheckCircle size={24} />,
        };
        return {
          title: t(`lims.dashboard.${sc.id}`),
          value: value as string | number,
          icon: iconMap[sc.icon as string] ?? <FileText size={24} />,
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
          title: t(`lims.dashboard.${ch.id}`),
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
      title={t('lims.dashboard.title')}
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

export default LimsDashboardPage;
