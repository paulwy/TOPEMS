import React from 'react';
import { Settings } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { SettingsPageTemplate } from '@/components/templates';
import { useTranslation } from 'react-i18next';

export const PayrollTemplatePage: React.FC = () => {
  const { t } = useTranslation('hrm');
  return (
    <PageContainer
      title={t('hrm.payroll_template_page.k0')}
      subtitle={t('hrm.payroll_template_page.k1')}
      padding={false}
      maxWidth={false}
    >
      <SettingsPageTemplate
        title={t('hrm.payroll_template_page.k2')}
        description='薪资模板相关配置参数（页面建设中…）'
        icon={<Settings size={24} />}
        sections={[]}
        actions={[]}
      />
    </PageContainer>
  );
};

export default PayrollTemplatePage;
