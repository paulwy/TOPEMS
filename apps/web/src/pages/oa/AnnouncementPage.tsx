import React from 'react';
import { Typography } from '@mui/material';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';

export const AnnouncementPage: React.FC = () => {
  const { t } = useTranslation('oa');
  return (
    <PageContainer title={t('oa.announcement_page.k0')}>
      <Typography color='text.secondary'>公告通知功能开发中...</Typography>
    </PageContainer>
  );
};

export default AnnouncementPage;
