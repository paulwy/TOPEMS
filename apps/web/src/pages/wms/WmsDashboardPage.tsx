import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Warehouse,
  Package,
  Clock,
  Activity,
  BarChart3,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { DashboardTemplate } from '@/components/templates';
import type { StatCardConfig, ChartConfig } from '@/components/templates/DashboardTemplate';
import { PageContainer } from '@/components/common/PageContainer';
import { useWmsDashboardSchema } from '@/schemas/wms';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Warehouse,
  Package,
  Clock,
  Activity,
  BarChart3,
  AlertCircle,
  CheckCircle,
};

const WmsDashboardPage: React.FC = () => {
  const schema = useWmsDashboardSchema();

  const { isLoading: loading } = useQuery({
    queryKey: ['wms-dashboard-schema'],
    queryFn: async () => {
      if (schema.loader) return schema.loader();
      return null;
    },
    enabled: !!schema.loader,
  });

  const statCards = useMemo<StatCardConfig[]>(() => {
    if (!schema.statCards) return [];
    return schema.statCards.map((sc) => {
      const IconComponent = iconMap[sc.icon as string] || Package;
      return {
        title: sc.title,
        value: typeof sc.value === 'function' ? sc.value() : sc.value,
        icon: <IconComponent size={24} />,
        color: sc.color as StatCardConfig['color'],
        trend: sc.trend,
        loading,
      };
    }) as StatCardConfig[];
  }, [schema.statCards, loading]);

  const chartConfigs = useMemo<ChartConfig[]>(() => {
    if (!schema.charts) return [];
    return schema.charts.map((ch) => ({
      title: ch.title,
      type: ch.type as ChartConfig['type'],
      data: typeof ch.data === 'function' ? (ch.data() as Array<Record<string, unknown>>) : [],
      xField: 'name',
      yField: 'value',
      height: (ch as { height?: number }).height,
      loading,
    })) as ChartConfig[];
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
        charts={chartConfigs as any}
        loading={loading}
      />
    </PageContainer>
  );
};

export default WmsDashboardPage;
