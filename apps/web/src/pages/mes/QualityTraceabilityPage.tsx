import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import { mesApi } from '@/api/mes';
import i18n from '@/i18n';

type TraceabilityApi = {
  forward?: (lot: string) => Promise<{ data?: unknown }>;
  forwardTraceability?: (lot: string) => Promise<{ data?: unknown }>;
};

const QualityTraceabilityPage: React.FC = () => {
  const { isLoading, refetch } = useQuery({
    queryKey: ['mes-quality-traceability'],
    queryFn: async () => {
      try {
        const traceability = mesApi.traceability as unknown as TraceabilityApi;
        if (typeof traceability.forward === 'function') {
          const res = await traceability.forward('SAMPLE-LOT');
          return res?.data ?? {};
        }
        if (typeof traceability.forwardTraceability === 'function') {
          const res = await traceability.forwardTraceability('SAMPLE-LOT');
          return res?.data ?? {};
        }
        const [records] = await Promise.all([mesApi.records.list({ pageSize: 10 })]);
        return records?.data ?? {};
      } catch (_e) {
        return {};
      }
    },
  });

  return (
    <StatsPageTemplate
      title={i18n.t('mes.quality_traceability.title')}
      subtitle={i18n.t('mes.quality_traceability.description')}
      loading={isLoading}
      onRefresh={refetch}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      emptyState={{
        emoji: '🔍',
        title: i18n.t('mes.quality_traceability.title'),
        description: i18n.t('mes.quality_traceability.description'),
      }}
    />
  );
};

export default QualityTraceabilityPage;
