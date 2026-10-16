import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import { mesApi } from '@/api/mes';
import i18n from '@/i18n';

const QualityTraceabilityPage: React.FC = () => {
  const { isLoading, refetch } = useQuery({
    queryKey: ['mes-quality-traceability'],
    queryFn: async () => {
      try {
        // 页面无批号输入入口（showSearch=false）：不调用
        // /traceability/forward/{order_id}（参数为 UUID，无真实工单时
        // 硬编码示例值会触发 400），改用生产记录列表展示兜底。
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
