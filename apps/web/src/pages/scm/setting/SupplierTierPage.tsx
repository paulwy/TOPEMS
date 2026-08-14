import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

export const SupplierTierPage: React.FC = () => {
  const { t } = useTranslation('scm');
  return (
    <PageContainer
      title={t('scm.supplier_tier_page.k0')}
      subtitle={t('scm.supplier_tier_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('scm.supplier_tier_page.k2')}
        description={i18n.t('scm.setting_supplier_tier_page.r1')}
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default SupplierTierPage;
