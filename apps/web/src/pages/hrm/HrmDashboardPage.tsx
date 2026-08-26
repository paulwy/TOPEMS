import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Clock,
  DollarSign,
  Activity,
  BarChart3,
  CheckCircle,
  ClipboardList,
  FileText,
  AlertCircle,
  Target,
} from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type {
  StatCardConfig,
  ChartConfig,
  ChartCard,
} from '@/components/templates/DashboardTemplate';
import { PageContainer } from '@/components/common';
import { useHrmDashboardSchema } from '@/schemas/hrm';
import type { StatCardSchema, ChartSchema } from '@/schema';

import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';

const iconMap: Record<string, React.ComponentType<any>> = {
  Users,
  Clock,
  DollarSign,
  Activity,
  BarChart3,
  CheckCircle,
  ClipboardList,
  FileText,
  AlertCircle,
  Target,
};

const HrmDashboardPage: React.FC = () => {
  const schema = useHrmDashboardSchema();

  const { isPending: loading } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.HRM_DASHBOARD_SCHEMA_BASE,
    queryFn: async () => {
      if (schema.loader) return schema.loader();
      return null;
    },
    enabled: !!schema.loader,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const statCards = useMemo<StatCardConfig[]>(() => {
    if (!schema.statCards) return [];
    return schema.statCards.map((sc: StatCardSchema) => {
      const IconComponent = iconMap[sc.icon as string] || Users;
      return {
        title: sc.title,
        value: typeof sc.value === 'function' ? sc.value() : sc.value,
        icon: <IconComponent size={24} />,
        color: sc.color,
        trend: sc.trend,
        loading,
      };
    });
  }, [schema.statCards, loading]);

  const chartConfigs = useMemo<ChartConfig[]>(() => {
    if (!schema.charts) return [];
    return schema.charts.map((ch: ChartSchema) => ({
      title: ch.title,
      type: ch.type,
      data: typeof ch.data === 'function' ? (ch.data() as Array<Record<string, unknown>>) : [],
      xField: 'name',
      yField: 'value',
      height: ch.height,
      loading,
    }));
  }, [schema.charts, loading]);

  return (
    <PageContainer
      title={schema.title}
      padding={false}
      maxWidth={false}
      autoTitle
      autoBreadcrumbs
    >
      <DashboardTemplate
        title=''
        statCards={statCards}
        charts={chartConfigs as unknown as ChartCard[]}
        loading={loading}
      />
    </PageContainer>
  );
};

export default HrmDashboardPage;
