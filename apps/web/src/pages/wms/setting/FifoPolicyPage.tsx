import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import i18n from '@/i18n';
import { wmsApi } from '@/api/wms';

export const FifoPolicyPage: React.FC = () => {
  const { data: backendData, isLoading } = useQuery({
    queryKey: ['wms-fifo-policy'],
    queryFn: async () => {
      try {
        // TODO: 待后端提供 FIFO 策略接口后替换
        return {};
      } catch (e) {
        return {};
      }
    },
  });
  return (
    <PageContainer
      title={i18n.t('pages.fifo_policy_page.k0')}
      subtitle={i18n.t('pages.fifo_policy_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={i18n.t('pages.fifo_policy_page.k2')}
        description={i18n.t('pages.fifo_policy_page.k0')}
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default FifoPolicyPage;
