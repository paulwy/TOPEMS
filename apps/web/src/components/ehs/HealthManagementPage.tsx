import React, { useState } from 'react';
import styles from './HealthManagementPage.module.css';
import { Box, Card, CardContent, Typography, Chip, Tabs, Tab, useTheme } from '@mui/material';
import { Heart, FileText, Users, ClipboardList, CheckSquare, ShieldAlert } from 'lucide-react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema-dsl/crudPageAdapter';
import {
  healthManagementSchema,
  healthCheckPlanSchema,
  healthCheckRecordSchema,
  contraindicationSchema,
} from '@/schemas/ehs';
import { ehsApi } from '@/api/ehs';
import type {
  HealthRecord,
  CreateHealthRecordRequest,
  HealthCheckPlan,
  CreateHealthCheckPlanRequest,
  HealthCheckRecord,
  CreateHealthCheckRecordRequest,
  Contraindication,
  CreateContraindicationRequest,
} from '@/api/ehs';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const apiAdapter = createCrudPageAdapter<HealthRecord, CreateHealthRecordRequest>({
  list: ehsApi.listHealthRecords,
  create: ehsApi.createHealthRecord,
  update: ehsApi.updateHealthRecord,
  delete: ehsApi.deleteHealthRecord,
});

const checkPlanAdapter = createCrudPageAdapter<HealthCheckPlan, CreateHealthCheckPlanRequest>({
  list: ehsApi.listHealthCheckPlans,
  create: ehsApi.createHealthCheckPlan,
  update: ehsApi.updateHealthCheckPlan,
  delete: ehsApi.deleteHealthCheckPlan,
});

const checkRecordAdapter = createCrudPageAdapter<HealthCheckRecord, CreateHealthCheckRecordRequest>(
  {
    list: ehsApi.listHealthCheckRecords,
    create: ehsApi.createHealthCheckRecord,
    update: ehsApi.updateHealthCheckRecord,
    delete: ehsApi.deleteHealthCheckRecord,
  }
);

const contraindicationAdapter = createCrudPageAdapter<
  Contraindication,
  CreateContraindicationRequest
>({
  list: ehsApi.listContraindications,
  create: ehsApi.createContraindication,
  update: ehsApi.updateContraindication,
  delete: ehsApi.deleteContraindication,
});

const HealthManagementPage: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);

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
                  bgcolor: 'pink.50',
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
                  sx={{
                    color: 'slate.600',
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                  }}
                >
                  {t('ehs.health_management_page.total_records')}
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
                  bgcolor: 'success.50',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Heart sx={{ width: 20, height: 20, color: 'success.700' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{
                    color: 'slate.600',
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                  }}
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
                  bgcolor: 'warning.50',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users sx={{ width: 20, height: 20, color: 'warning.700' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{
                    color: 'slate.600',
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                  }}
                >
                  {t('ehs.health_management_page.disabled')}
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
      active: { bg: 'success.50', color: 'success.700' },
      inactive: { bg: 'error.50', color: 'error.700' },
      suspended: { bg: 'warning.50', color: 'warning.700' },
    };
    const statusLabels: Record<string, string> = {
      active: t('ehs.health_management_page.normal'),
      inactive: t('ehs.health_management_page.off_duty'),
      suspended: t('ehs.health_management_page.disabled'),
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
        ? t('ehs.health_management_page.male')
        : record.gender === 'female'
          ? t('ehs.health_management_page.female')
          : '-';

    const fieldValue = (label: string, value: React.ReactNode) => (
      <Box>
        <Box
          component='span'
          sx={{
            color: 'text.secondary',
            fontSize: designTokens.typography.fontSize.scale['0.875rem'],
          }}
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
        {fieldValue(t('ehs.health_management_page.total_records'), record.record_no || '-')}
        {fieldValue(t('ehs.health_management_page.name'), record.employee_name)}
        {fieldValue(t('ehs.health_management_page.gender'), genderLabel)}
        {fieldValue(t('ehs.health_management_page.date'), record.birthday || '-')}
        {fieldValue(t('ehs.health_management_page.department'), record.department || '-')}
        {fieldValue(t('ehs.health_management_page.job_title'), record.position || '-')}
        {fieldValue(t('ehs.health_management_page.workplace'), record.workplace || '-')}
        {fieldValue(t('ehs.health_management_page.blood_type'), record.blood_type || '-')}
        {fieldValue(
          t('ehs.health_management_page.contact_information'),
          record.contact_info || '-'
        )}
        {fieldValue(t('ehs.health_management_page.status'), getStatusBadge(record.status || ''))}
        <Box sx={{ gridColumn: '1 / -1' }}>
          {fieldValue(
            t('ehs.health_management_page.allergy_history'),
            record.allergy_history || '-'
          )}
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          {fieldValue(
            t('ehs.health_management_page.medical_history'),
            record.medical_history || '-'
          )}
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          {fieldValue(
            t(
              'ehs.health_management_page.occupational_hazards',
              i18n.t('pages.health_management_page.k0')
            ),
            Array.isArray(record.hazard_factors) ? record.hazard_factors.join(', ') : '-'
          )}
        </Box>
      </Box>
    );
  };

  const tabStyle = {
    textTransform: 'none',
    fontWeight: 600,
  };

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Heart sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${theme.palette.pink[500]} 0%, ${theme.palette.pink[600]} 100%)`,
      }}
      maxWidth='xl'
    >
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          sx={tabStyle}
          icon={<FileText className={styles.il1} />}
          iconPosition='start'
          label={t('ehs.health_management_page.list')}
        />
        <Tab
          sx={tabStyle}
          icon={<ClipboardList className={styles.il2} />}
          iconPosition='start'
          label={t('ehs.health_check_plan.k0')}
        />
        <Tab
          sx={tabStyle}
          icon={<CheckSquare className={styles.il3} />}
          iconPosition='start'
          label={t('ehs.health_check_record.k0')}
        />
        <Tab
          sx={tabStyle}
          icon={<ShieldAlert className={styles.il4} />}
          iconPosition='start'
          label={t('ehs.contraindication.k0')}
        />
      </Tabs>

      {tab === 0 && (
        <CrudPage
          schema={healthManagementSchema}
          apiAdapter={apiAdapter}
          headerContent={headerContent}
          detailContent={detailContent}
          detailMaxWidth='lg'
          breadcrumbs={[{ label: t('ehs.title') }, { label: t('ehs.health_management_page.list') }]}
        />
      )}
      {tab === 1 && (
        <CrudPage
          schema={healthCheckPlanSchema}
          apiAdapter={checkPlanAdapter}
          detailMaxWidth='lg'
          breadcrumbs={[{ label: t('ehs.title') }, { label: t('ehs.health_check_plan.k0') }]}
        />
      )}
      {tab === 2 && (
        <CrudPage
          schema={healthCheckRecordSchema}
          apiAdapter={checkRecordAdapter}
          detailMaxWidth='lg'
          breadcrumbs={[{ label: t('ehs.title') }, { label: t('ehs.health_check_record.k0') }]}
        />
      )}
      {tab === 3 && (
        <CrudPage
          schema={contraindicationSchema}
          apiAdapter={contraindicationAdapter}
          detailMaxWidth='lg'
          breadcrumbs={[{ label: t('ehs.title') }, { label: t('ehs.contraindication.k0') }]}
        />
      )}
    </PageContainer>
  );
};

export default HealthManagementPage;
