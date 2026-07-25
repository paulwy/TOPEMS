import React from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import { Heart, FileText, Users } from 'lucide-react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { healthManagementSchema } from '@/schemas/ehs';
import { ehsApi } from '@/api/ehs';
import type { HealthRecord } from '@/api/ehs';
import { PageContainer } from '@/components/common/PageContainer';
import { designTokens } from '@/theme/tokens';
import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

const apiAdapter = createCrudPageAdapter<HealthRecord>({
  list: ehsApi.listHealthRecords,
  create: ehsApi.createHealthRecord,
  update: ehsApi.updateHealthRecord,
  delete: ehsApi.deleteHealthRecord,
});

const HealthManagementPage: React.FC = () => {
  const { t } = useTranslation();

  const headerContent = (rows: Record<string, unknown>[], total: number) => {
    const active = rows.filter((r) => r.status === 'active').length;
    const followUp = rows.filter((r) => r.status === 'suspended').length;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <Card sx={{ bgcolor: 'pink.light' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'pink.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText sx={{ width: 20, height: 20, color: 'pink.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  {t('ehs.health_management_page.text_d09fb9')}
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
                  bgcolor: 'success.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Heart sx={{ width: 20, height: 20, color: 'success.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  {t('ehs.health_management_page.normal')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {active}
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
                  bgcolor: 'warning.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users sx={{ width: 20, height: 20, color: 'warning.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  {t('ehs.health_management_page.text_8d63ef')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {followUp}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      active: { bg: 'success.lighter', color: 'success.dark' },
      inactive: { bg: 'error.lighter', color: 'error.dark' },
      suspended: { bg: 'warning.lighter', color: 'warning.dark' },
    };
    const statusLabels: Record<string, string> = {
      active: t('ehs.health_management_page.normal'),
      inactive: t('ehs.health_management_page.text_1abbb1'),
      suspended: t('ehs.health_management_page.text_8d63ef'),
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: 'text.secondary' };
    const label = statusLabels[status] || status;
    return (
      <Chip
        label={label}
        size='small'
        sx={{
          backgroundColor: colors.bg,
          color: colors.color,
          fontWeight: 500,
        }}
      />
    );
  };

  const detailContent = (row: Record<string, unknown>) => {
    const record = row as Partial<HealthRecord>;
    const genderLabel =
      record.gender === 'male'
        ? t('ehs.health_management_page.text_36a490')
        : record.gender === 'female'
          ? t('ehs.health_management_page.text_87c835')
          : '-';

    const fieldValue = (label: string, value: React.ReactNode) => (
      <Box>
        <Box
          component='span'
          sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
        >
          {label}
        </Box>
        <Box sx={{ fontWeight: 500 }}>{value}</Box>
      </Box>
    );

    return (
      <Box
        sx={{
          pt: 2,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2,
        }}
      >
        {fieldValue(t('ehs.health_management_page.text_d09fb9'), record.record_no || '-')}
        {fieldValue(t('ehs.health_management_page.text_50df90'), record.employee_name)}
        {fieldValue(t('ehs.health_management_page.text_787b56'), genderLabel)}
        {fieldValue(t('ehs.health_management_page.date'), record.birthday || '-')}
        {fieldValue(t('ehs.health_management_page.text_1e1459'), record.department || '-')}
        {fieldValue(t('ehs.health_management_page.text_8402fc'), record.position || '-')}
        {fieldValue(t('ehs.health_management_page.text_e23e4a'), record.workplace || '-')}
        {fieldValue(t('ehs.health_management_page.text_6eb003'), record.blood_type || '-')}
        {fieldValue(t('ehs.health_management_page.text_b58943'), record.contact_info || '-')}
        {fieldValue(t('ehs.health_management_page.status'), getStatusBadge(record.status || ''))}
        <Box sx={{ gridColumn: '1 / -1' }}>
          {fieldValue(t('ehs.health_management_page.text_2ac7fd'), record.allergy_history || '-')}
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          {fieldValue(t('ehs.health_management_page.text_044dcd'), record.medical_history || '-')}
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          {fieldValue(
            t('ehs.health_management_page.text_9c1b2a', '危害因素'),
            Array.isArray(record.hazard_factors) ? record.hazard_factors.join(', ') : '-'
          )}
        </Box>
      </Box>
    );
  };

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Heart sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.pink[500]} 0%, ${ct.pink[600]} 100%)`,
      }}
      maxWidth='xl'
    >
      <CrudPage
        schema={healthManagementSchema}
        apiAdapter={apiAdapter}
        headerContent={headerContent}
        detailContent={detailContent}
        detailMaxWidth='lg'
        breadcrumbs={[{ label: t('ehs.title') }, { label: t('ehs.health_management_page.list') }]}
      />
    </PageContainer>
  );
};

export default HealthManagementPage;
