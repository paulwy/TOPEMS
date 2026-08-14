import React from 'react';
import { Typography } from '@mui/material';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';

export const DocumentManagementPage: React.FC = () => {
  const { t } = useTranslation('oa');
  return (
    <PageContainer title={t('oa.document_management_page.k0')}>
      <Typography color='text.secondary'>公文管理功能开发中...</Typography>
    </PageContainer>
  );
};

export default DocumentManagementPage;
