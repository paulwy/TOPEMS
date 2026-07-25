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
import type { StatCardConfig, ChartConfig } from '@/components/templates/DashboardTemplate';
import { PageContainer } from '@/components/common/PageContainer';
import { usePdmDashboardSchema } from '@/schemas/pdm';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
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

const PdmDashboardPage: React.FC = () => {
  const schema = usePdmDashboardSchema();

  const { isLoading: loading } = useQuery({
    queryKey: ['pdm-dashboard-schema'],
    queryFn: async () => {
      if (schema.loader) return schema.loader();
      return null;
    },
    enabled: !!schema.loader,
  });

  const statCards = useMemo<StatCardConfig[]>(() => {
    if (!schema.statCards) return [];
    return schema.statCards.map((sc) => {
      const IconComponent = iconMap[sc.icon as string] || ClipboardList;
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
    return schema.charts.map((ch) => ({
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
        charts={chartConfigs as any}
        loading={loading}
      />
    </PageContainer>
  );
};

export default PdmDashboardPage;
