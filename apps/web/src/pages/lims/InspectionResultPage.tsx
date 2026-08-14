import React from 'react';
import { Typography } from '@mui/material';
import { PageContainer } from '@/components/common';
import i18n from '@/i18n';
export default function InspectionResultPage() {
  return (
    <PageContainer title={i18n.t('lims.inspection_result_page.k0')}>
      <Typography color='text.secondary'>{i18n.t('pages.inspection_result_page.k0')}</Typography>
    </PageContainer>
  );
}