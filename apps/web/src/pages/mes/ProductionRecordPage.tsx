import React from 'react';
import { Box, Typography } from '@mui/material';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { productionRecordSchema } from '@/schemas/mes';
import { mesApi } from '@/api/mes';
import { Activity } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import { PageContainer } from '@/components/common';
import i18n from '@/i18n';

const ct = designTokens.colors;
const apiAdapter = createCrudPageAdapter(mesApi.records, {
  itemsField: 'records',
});
const ProductionRecordPage: React.FC = () => {
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Activity style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={productionRecordSchema}
        apiAdapter={apiAdapter as CrudApiAdapter}
        breadcrumbs={[{ label: 'MES' }, { label: i18n.t('mes.production_record_page.k0') }]}
        headerContent={(rows) => {
          const total = rows.length;
          const completed = rows.filter((r) => r.status === 'completed').length;
          const inProgress = rows.filter((r) => r.status === 'in_progress').length;
          return (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: 2,
                mb: 3,
              }}
            >
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.production_record_page.k0')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {total}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.production_record_page.k1')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {completed}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.production_record_page.k2')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {inProgress}
                </Typography>
              </Box>
            </Box>
          );
        }}
      />
    </PageContainer>
  );
};
export default ProductionRecordPage;
