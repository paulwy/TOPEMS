import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import i18n from '@/i18n';
import { mesApi } from '@/api/mes';

export const BomVersionPolicyPage: React.FC = () => {
  const { data: backendData, isLoading } = useQuery({
    queryKey: ['mes-bom-version-policy'],
    queryFn: async () => {
      try {
        if (typeof mesApi.boms?.list === 'function') {
          const res = await mesApi.boms.list();
          return res?.data ?? {};
        }
        return {};
      } catch (e) {
        return {};
      }
    },
  });
  return (
    <PageContainer
      title={i18n.t('pages.bom_version_policy_page.bom_0')}
      subtitle={i18n.t('pages.bom_version_policy_page.k0')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={i18n.t('pages.bom_version_policy_page.bom_1')}
        description={i18n.t('pages.bom_version_policy_page.k2')}
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default BomVersionPolicyPage;
