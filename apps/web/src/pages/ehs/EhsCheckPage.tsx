import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { ClipboardCheck, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { inspectionPlanSchema, inspectionRecordSchema } from '@/schemas/ehs';
import { ehsApi } from '@/api/ehs';
import type {
  InspectionPlan,
  InspectionRecord,
  CreateInspectionPlanRequest,
  CreateInspectionRecordRequest,
} from '@/api/ehs';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

const planApi = {
  list: ehsApi.listInspectionPlans,
  create: ehsApi.createInspectionPlan,
  update: ehsApi.updateInspectionPlan,
  delete: ehsApi.deleteInspectionPlan,
};

const planAdapter = createCrudPageAdapter<InspectionPlan, CreateInspectionPlanRequest>(planApi);

const recordApi = {
  list: ehsApi.listInspectionRecords,
  create: ehsApi.createInspectionRecord,
  update: ehsApi.updateInspectionRecord,
  delete: ehsApi.deleteInspectionRecord,
};

const recordAdapter = createCrudPageAdapter<InspectionRecord, CreateInspectionRecordRequest>(
  recordApi
) as unknown as CrudApiAdapter<InspectionRecord>;

const RecordList: React.FC = () => {
  return (
    <CrudPage
      schema={inspectionRecordSchema}
      apiAdapter={recordAdapter}
      breadcrumbs={[]}
    />
  );
};

const EhsCheckPage: React.FC = () => {
  const { t } = useTranslation();

  const { data: recordsData } = useQuery({
    queryKey: QUERY_KEYS.EHS.INSPECTION_RECORDS,
    queryFn: async () => {
      const response = await ehsApi.listInspectionRecords({ pagesize: 100 });
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return Array.isArray(data)
          ? (data as InspectionRecord[])
          : (data.items as InspectionRecord[]) || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const records = (recordsData as InspectionRecord[]) || [];

  const statsContent = (rows: InspectionPlan[], total: number) => {
    const plansActive = rows.filter((p) => p.status === 'active').length;
    const recordsInProgress = records.filter((r) => r.status === 'in_progress').length;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <Card sx={{ bgcolor: 'primary.light' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'primary.100',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ClipboardCheck sx={{ width: 20, height: 20, color: 'primary.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  {t('ehs.ehs_check_page.plan') || '计划总数'}
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
                <ClipboardCheck sx={{ width: 20, height: 20, color: 'success.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  {t('ehs.ehs_check_page.active') || '启用中'}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {plansActive}
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
                  bgcolor: 'warning.light',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText sx={{ width: 20, height: 20, color: ct.yellow[600] }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'slate.600', fontSize: '0.875rem' }}
                >
                  {t('ehs.ehs_check_page.in_progress') || '进行中'}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {recordsInProgress}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <PageContainer
      headerProps={{
        pageIcon: <ClipboardCheck sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary[600]} 100%)`,
      }}
      maxWidth='xl'
    >
      <CrudPage
        schema={inspectionPlanSchema}
        apiAdapter={planAdapter}
        breadcrumbs={[{ label: t('ehs.title') }, { label: t('ehs.ehs_check_page.plan_1') }]}
        headerContent={statsContent}
        tabs={[
          {
            id: 'plans',
            label: t('ehs.ehs_check_page.plan_1') || '检查计划',
            content: null as unknown as React.ReactNode,
          },
          {
            id: 'records',
            label: t('ehs.ehs_check_page.text_9b9efd') || '检查记录',
            content: <RecordList />,
          },
        ]}
        defaultTab='plans'
      />
    </PageContainer>
  );
};

export default EhsCheckPage;
