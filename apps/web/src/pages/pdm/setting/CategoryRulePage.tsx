import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';

export const CategoryRulePage: React.FC = () => {
  const { t } = useTranslation('pdm');
  return (
    <PageContainer
      title={t('pdm.category_rule_page.k0')}
      subtitle={t('pdm.category_rule_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('pdm.category_rule_page.k2')}
        description='分类规则相关配置参数（页面建设中…）'
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default CategoryRulePage;
