import React, { useMemo } from 'react';
import { Box, Typography, Card, CardContent, Stepper, Step, StepLabel, Chip } from '@mui/material';
import { TestTube, Package, CheckCircle, Clock } from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { sampleSchema } from '@/schemas/lims';
import { limsApi, type Sample } from '@/api/lims';
import { designTokens } from '@/theme/tokens';
import { LIMS_PATHS } from '@/modules/lims/config';
import { getStatusColor } from '@/utils/status';
import i18n from '@/i18n';
const ct = designTokens.colors;
const getWorkflowSteps = () => [
  i18n.t('lims.sample_receive_page.k4'),
  i18n.t('lims.sample_receive_page.k3'),
  i18n.t('lims.sample_receive_page.k2'),
  i18n.t('lims.sample_receive_page.k1'),
  i18n.t('lims.sample_receive_page.k0'),
];
const getStageStep = (status: string): number => {
  const stageMap: Record<string, number> = {
    [i18n.t('pages.sample_receive_page.k0')]: 0,
    [i18n.t('pages.sample_receive_page.k1')]: 1,
    [i18n.t('pages.sample_receive_page.k2')]: 2,
    [i18n.t('pages.sample_receive_page.k3')]: 3,
    [i18n.t('pages.sample_receive_page.k4')]: 4,
    [i18n.t('pages.sample_receive_page.k5')]: 4,
    [i18n.t('pages.sample_receive_page.k6')]: 5,
  };
  return stageMap[status] ?? 0;
};
const getSampleStatusColor = (status: string): string =>
  getStatusColor(status, { category: 'lims', fallback: 'grey.100' }) as string;
const SampleReceivePage: React.FC = () => {
  const sampleApiAdapter: CrudApiAdapter<Sample> = useMemo(
    () => ({
      list: async (params) => {
        const response = await limsApi.listSamples({
          page: params?.page !== undefined ? params.page : 0,
          pagesize: params?.pageSize ?? 10,
          search: params?.search as string | undefined,
          status: params?.status && params.status !== 'all' ? (params.status as string) : undefined,
        });
        if (!response.success || !response.data) {
          throw new Error(i18n.t('lims.sample_receive_page.k5'));
        }
        const data = response.data as { items?: Sample[]; total?: number } | Sample[];
        if (Array.isArray(data)) {
          return { data, total: data.length };
        }
        return {
          data: data.items || [],
          total: data.total || data.items?.length || 0,
        };
      },
      create: async (data) => {
        const response = await limsApi.createSample(
          data as unknown as Parameters<typeof limsApi.createSample>[0]
        );
        if (!response.success) {
          throw new Error(response.message || i18n.t('lims.sample_receive_page.k6'));
        }
        return response.data as unknown as Sample;
      },
      update: async (id, data) => {
        const response = await limsApi.updateSample(
          id,
          data as unknown as Parameters<typeof limsApi.updateSample>[1]
        );
        if (!response.success) {
          throw new Error(response.message || i18n.t('lims.sample_receive_page.k7'));
        }
        return response.data as unknown as Sample;
      },
      delete: async (id) => {
        const response = await limsApi.deleteSample(id);
        if (!response.success) {
          throw new Error(response.message || i18n.t('lims.sample_receive_page.k8'));
        }
      },
    }),
    []
  );
  const transitionSampleStage = async (id: string, targetStage: string) => {
    const response = await limsApi.transitionSampleStage(id, {
      sample_id: id,
      target_stage: targetStage,
      operator: i18n.t('lims.sample_receive_page.k9'),
      remarks: `${i18n.t('pages.sample_receive_page.k0')}${targetStage}`,
    });
    if (!response.success) {
      throw new Error(response.message || i18n.t('lims.sample_receive_page.k10'));
    }
  };
  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'receive',
        label: i18n.t('lims.sample_receive_page.k11'),
        icon: <Package size={14} />,
        color: 'warning',
        show: (row: Record<string, unknown>) =>
          row.status === i18n.t('lims.sample_receive_page.k12') || row.status === 'received',
        onClick: async (row: Record<string, unknown>) => {
          await transitionSampleStage(String(row.id), i18n.t('lims.sample_receive_page.k13'));
        },
      },
      {
        key: 'confirm',
        label: i18n.t('lims.sample_receive_page.k14'),
        icon: <CheckCircle size={14} />,
        color: 'success',
        show: (row: Record<string, unknown>) =>
          row.status === i18n.t('lims.sample_receive_page.k15') || row.status === 'confirmed',
        onClick: async (row: Record<string, unknown>) => {
          await transitionSampleStage(String(row.id), i18n.t('lims.sample_receive_page.k16'));
        },
      },
    ],
    []
  );
  const statsContent = (rows: Record<string, unknown>[]) => {
    const samples = rows as unknown as Sample[];
    const stats = {
      total: samples.length,
      pending: samples.filter((s) =>
        [i18n.t('lims.sample_receive_page.k18'), i18n.t('lims.sample_receive_page.k17')].includes(
          s.status
        )
      ).length,
      received: samples.filter((s) =>
        [i18n.t('lims.sample_receive_page.k20'), i18n.t('lims.sample_receive_page.k19')].includes(
          s.status
        )
      ).length,
      confirmed: samples.filter((s) =>
        [
          i18n.t('lims.sample_receive_page.k23'),
          i18n.t('lims.sample_receive_page.k22'),
          i18n.t('lims.sample_receive_page.k21'),
        ].includes(s.status)
      ).length,
    };
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'info.lighter',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TestTube sx={{ width: 20, height: 20, color: 'info.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}
                >
                  {i18n.t('pages.sample_receive_page.k7')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {stats.total}
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
                <Clock sx={{ width: 20, height: 20, color: ct.yellow[600] }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}
                >
                  {i18n.t('pages.sample_receive_page.k8')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {stats.pending}
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
                <CheckCircle sx={{ width: 20, height: 20, color: 'success.dark' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}
                >
                  {i18n.t('pages.sample_receive_page.k9')}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {stats.confirmed}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };
  const detailContent = (row: Record<string, unknown>) => {
    const sample = row as unknown as Sample;
    const activeStep = getStageStep(sample.status);
    return (
      <Box>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant='subtitle2'
            sx={{ mb: 2, fontWeight: 600 }}
          >
            {i18n.t('pages.sample_receive_page.k10')}
          </Typography>
          <Stepper
            activeStep={activeStep}
            alternativeLabel
          >
            {getWorkflowSteps().map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 2,
            mb: 3,
          }}
        >
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}
            >
              {i18n.t('pages.sample_receive_page.k11')}
            </Box>
            <Box sx={{ fontWeight: 500 }}>{sample.sample_no || sample.id}</Box>
          </Box>
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}
            >
              {i18n.t('pages.sample_receive_page.k12')}
            </Box>
            <Box sx={{ fontWeight: 500 }}>{sample.name}</Box>
          </Box>
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}
            >
              {i18n.t('pages.sample_receive_page.k13')}
            </Box>
            <Box>{sample.description || '-'}</Box>
          </Box>
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}
            >
              {i18n.t('pages.sample_receive_page.k14')}
            </Box>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={sample.status}
                size='small'
                sx={{
                  backgroundColor: getSampleStatusColor(sample.status),
                  fontWeight: 500,
                }}
              />
            </Box>
          </Box>
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}
            >
              {i18n.t('pages.sample_receive_page.k15')}
            </Box>
            <Box>
              {sample.received_date
                ? new Date(sample.received_date).toLocaleDateString('zh-CN')
                : '-'}
            </Box>
          </Box>
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}
            >
              {i18n.t('pages.sample_receive_page.k16')}
            </Box>
            <Box>{sample.sample_type || '-'}</Box>
          </Box>
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}
            >
              {i18n.t('pages.sample_receive_page.k17')}
            </Box>
            <Box>{sample.source || '-'}</Box>
          </Box>
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}
            >
              {i18n.t('pages.sample_receive_page.k18')}
            </Box>
            <Box>
              {sample.quantity !== undefined ? `${sample.quantity} ${sample.unit || ''}` : '-'}
            </Box>
          </Box>
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}
            >
              {i18n.t('pages.sample_receive_page.k19')}
            </Box>
            <Box>{sample.location || '-'}</Box>
          </Box>
          <Box>
            <Box
              component='span'
              sx={{ color: 'text.secondary', fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}
            >
              {i18n.t('pages.sample_receive_page.k20')}
            </Box>
            <Box>{sample.responsible_person || '-'}</Box>
          </Box>
        </Box>
      </Box>
    );
  };
  return (
    <PageContainer
      title={i18n.t('lims.sample_receive_page.k24')}
      subtitle='Sample Receive Management'
      headerProps={{
        pageIcon: <TestTube style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[400]} 0%, ${ct.teal[600]} 100%)`,
      }}
    >
      <CrudPage
        schema={sampleSchema}
        apiAdapter={sampleApiAdapter}
        customRowActions={customRowActions}
        headerContent={statsContent}
        detailContent={detailContent}
        detailMaxWidth='md'
        breadcrumbs={[
          { label: i18n.t('lims.sample_receive_page.k25'), href: '/dashboard' },
          { label: 'LIMS', href: LIMS_PATHS.root },
          { label: i18n.t('lims.sample_receive_page.k26') },
        ]}
        idField='id'
      />
    </PageContainer>
  );
};
export default SampleReceivePage;
