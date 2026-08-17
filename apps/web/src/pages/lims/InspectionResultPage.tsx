import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Typography } from '@mui/material';
import { PageContainer } from '@/components/common';
import i18n from '@/i18n';
import { limsApi } from '@/api/lims';
export default function InspectionResultPage() {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['lims-inspection-result'],
    queryFn: async () => {
      try {
        // TODO: limsApi.listInspectionResult 不存在，等待后端接口对接
        return {};
      } catch (e) {
        return {};
      }
    },
  });
  return (
    <PageContainer title={i18n.t('lims.inspection_result_page.k0')}>
      <Typography color='text.secondary'>{i18n.t('pages.inspection_result_page.k0')}</Typography>
    </PageContainer>
  );
}