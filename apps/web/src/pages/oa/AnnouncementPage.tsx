import React from 'react';
import { Typography } from '@mui/material';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useQuery } from '@tanstack/react-query';
import { oaApi } from '@/api/mobile';

export const AnnouncementPage: React.FC = () => {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['oa-announcements'],
    queryFn: async () => {
      try {
        return await oaApi.listAnnouncements();
      } catch (e) {
        return {};
      }
    },
  });
  const { t } = useTranslation('oa');
  return (
    <PageContainer title={t('oa.announcement_page.k0')}>
      <Typography color='text.secondary'>{i18n.t('pages.announcement_page.k0')}</Typography>
    </PageContainer>
  );
};

export default AnnouncementPage;
