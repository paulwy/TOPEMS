import React from 'react';
import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import { GraduationCap, FileText, Award } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema-dsl/crudPageAdapter';
import { trainingPlanSchema, trainingRecordSchema, trainingCertificateSchema } from '@/schemas/ehs';
import { trainingApi } from '@/api/ehs';
import type {
  TrainingPlan,
  TrainingRecord,
  TrainingCertificate,
  CreateTrainingPlanRequest,
  CreateTrainingRecordRequest,
  CreateTrainingCertificateRequest,
} from '@/api/ehs';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useTranslation } from 'react-i18next';

const planApi = {
  list: trainingApi.listTrainingPlans,
  create: trainingApi.createTrainingPlan,
  update: trainingApi.updateTrainingPlan,
  delete: trainingApi.deleteTrainingPlan,
};

const planAdapter = createCrudPageAdapter<TrainingPlan, CreateTrainingPlanRequest>(
  planApi
) as unknown as CrudApiAdapter<TrainingPlan>;

const recordApi = {
  list: trainingApi.listTrainingRecords,
  create: trainingApi.createTrainingRecord,
  update: trainingApi.updateTrainingRecord,
  delete: trainingApi.deleteTrainingRecord,
};

const recordAdapter = createCrudPageAdapter<TrainingRecord, CreateTrainingRecordRequest>(
  recordApi
) as unknown as CrudApiAdapter<TrainingRecord>;

const certificateApi = {
  list: trainingApi.listTrainingCertificates,
  create: trainingApi.createTrainingCertificate,
  update: trainingApi.updateTrainingCertificate,
  delete: trainingApi.deleteTrainingCertificate,
};

const certificateAdapter = createCrudPageAdapter<
  TrainingCertificate,
  CreateTrainingCertificateRequest
>(certificateApi) as unknown as CrudApiAdapter<TrainingCertificate>;

const RecordList: React.FC = () => {
  return (
    <CrudPage
      schema={trainingRecordSchema}
      apiAdapter={recordAdapter}
      breadcrumbs={[]}
    />
  );
};

const CertificateList: React.FC = () => {
  return (
    <CrudPage
      schema={trainingCertificateSchema}
      apiAdapter={certificateAdapter}
      breadcrumbs={[]}
    />
  );
};

const TrainingPage: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();

  const { data: recordsData } = useQuery({
    queryKey: QUERY_KEYS.EHS.TRAINING_RECORDS,
    queryFn: async () => {
      const response = await trainingApi.listTrainingRecords({ page_size: 100 });
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return Array.isArray(data) ? data : data.data || [];
      }
      return [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const records = (recordsData as TrainingRecord[]) || [];

  const { data: certificatesData } = useQuery({
    queryKey: QUERY_KEYS.EHS.TRAINING_CERTIFICATES,
    queryFn: async () => {
      const response = await trainingApi.listTrainingCertificates({ page_size: 100 });
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return Array.isArray(data) ? data : data.data || [];
      }
      return [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const certificates = (certificatesData as TrainingCertificate[]) || [];

  const statsContent = (_rows: Record<string, unknown>[], total: number) => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 4,
      }}
    >
      <Card sx={{ bgcolor: 'primary.50' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.50',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText sx={{ width: 20, height: 20, color: 'primary.700' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{
                  color: 'slate.600',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {t('ehs.training_page.plan_2')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {total}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'warning.50',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GraduationCap sx={{ width: 20, height: 20, color: 'warning.700' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{
                  color: 'slate.600',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {t('ehs.training_page.in_progress')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {records.filter((r) => r.status === 'ongoing').length}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'success.50',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText sx={{ width: 20, height: 20, color: 'success.700' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{
                  color: 'slate.600',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {t('ehs.training_page.completed')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {records.filter((r) => r.status === 'completed').length}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'info.50',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award sx={{ width: 20, height: 20, color: 'info.700' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{
                  color: 'slate.600',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {t('ehs.training_page.k0')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {certificates.filter((c) => c.status === 'valid').length}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <GraduationCap sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary[600]} 100%)`,
      }}
      maxWidth='xl'
    >
      <CrudPage
        schema={trainingPlanSchema}
        apiAdapter={planAdapter}
        breadcrumbs={[{ label: t('ehs.title') }, { label: t('ehs.training_page.title') }]}
        headerContent={statsContent}
        tabs={[
          {
            id: 'plans',
            label: t('ehs.training_page.plan_2'),
            content: null as unknown as React.ReactNode,
          },
          {
            id: 'records',
            label: t('ehs.training_page.training_records'),
            content: <RecordList />,
          },
          {
            id: 'certificates',
            label: t('ehs.training_page.training_certificates'),
            content: <CertificateList />,
          },
        ]}
        defaultTab='plans'
      />
    </PageContainer>
  );
};

export default TrainingPage;
