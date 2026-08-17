import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/common';
import { MapPin } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import { mesApi } from '@/api/mes';

const ct = designTokens.colors;

const QualityTraceabilityPage: React.FC = () => {
  const { data: backendData, isLoading } = useQuery({
    queryKey: ['mes-quality-traceability'],
    queryFn: async () => {
      try {
        if (typeof (mesApi.traceability as any)?.forward === 'function') {
          const res = await (mesApi.traceability as any).forward('SAMPLE-LOT');
          return res?.data ?? {};
        }
        if (typeof mesApi.traceability?.forwardTraceability === 'function') {
          const res = await mesApi.traceability.forwardTraceability('SAMPLE-LOT');
          return res?.data ?? {};
        }
        const [records] = await Promise.all([mesApi.records.list({ pageSize: 10 })]);
        return records?.data ?? {};
      } catch (e) {
        return {};
      }
    },
  });
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <MapPin style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main} 0%, ${ct.secondary[900]} 100%)`,
      }}
    >
      {null}
    </PageContainer>
  );
};

export default QualityTraceabilityPage;
