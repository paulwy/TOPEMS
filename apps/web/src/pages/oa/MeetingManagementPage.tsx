import React from 'react';
import { Typography } from '@mui/material';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useQuery } from '@tanstack/react-query';
import { oaApi } from '@/api/mobile';

export const MeetingManagementPage: React.FC = () => {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['oa-meetings'],
    queryFn: async () => {
      try {
        return await oaApi.listMeetings();
      } catch (e) {
        return {};
      }
    },
  });
  const { t } = useTranslation('oa');
  return (
    <PageContainer title={t('oa.meeting_management_page.k0')}>
      <Typography color='text.secondary'>{i18n.t('pages.meeting_management_page.k0')}</Typography>
    </PageContainer>
  );
};

export default MeetingManagementPage;
