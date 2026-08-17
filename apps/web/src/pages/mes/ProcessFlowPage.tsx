import React from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, BarChart3 } from 'lucide-react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { PageContainer } from '@/components/common';
import { processFlowSchema } from '@/schemas/mes';
import {
  processFlowApi,
  type ProcessFlow,
  type CreateProcessFlowRequest,
  type UpdateProcessFlowRequest,
  type ProcessFlowStep,
  type CapacityAnalysis,
} from '@/api/mes/processFlow';
import i18n from '@/i18n';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;
const apiAdapter = createCrudPageAdapter<
  ProcessFlow,
  CreateProcessFlowRequest,
  UpdateProcessFlowRequest
>(
  {
    list: processFlowApi.list,
    create: processFlowApi.create,
    update: processFlowApi.update,
    delete: processFlowApi.delete,
  },
  { itemsField: 'flows' }
);
function ProcessFlowDetailContent({ row }: { row: Record<string, unknown> }) {
  const flowId = String(row.id);
  const { data: stepsData } = useQuery({
    queryKey: [...QUERY_KEYS.MES.PROCESS_FLOWS, flowId, 'steps'],
    queryFn: async () => {
      const response = await processFlowApi.getSteps(flowId);
      if (response.success && response.data) {
        return response.data.steps || [];
      }
      return [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const { data: capacityData } = useQuery({
    queryKey: [...QUERY_KEYS.MES.PROCESS_FLOWS, flowId, 'capacity'],
    queryFn: async () => {
      const response = await processFlowApi.analyzeCapacity(flowId);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const steps = (stepsData as ProcessFlowStep[]) || [];
  const capacity = capacityData as CapacityAnalysis | null;
  const statusMap: Record<string, { label: string; bg: string; color: string }> = {
    active: {
      label: i18n.t('mes.process_flow_page.k0'),
      bg: 'success.lighter',
      color: 'success.dark',
    },
    inactive: {
      label: i18n.t('mes.process_flow_page.k1'),
      bg: 'grey.100',
      color: 'text.secondary',
    },
    draft: {
      label: i18n.t('mes.process_flow_page.k2'),
      bg: 'warning.light',
      color: 'warning.dark',
    },
  };
  const status = statusMap[String(row.status)] || statusMap.inactive;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.process_flow_page.k0')}
          </Typography>
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {String(row.code || '-')}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.process_flow_page.k1')}
          </Typography>
          <Typography variant='body2'>{String(row.name || '-')}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.process_flow_page.k2')}
          </Typography>
          <Typography variant='body2'>{String(row.production_line || '-')}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.process_flow_page.k3')}
          </Typography>
          <Typography variant='body2'>
            {Number(row.capacity) || 0} {String(row.unit || i18n.t('mes.process_flow_page.k3'))}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.process_flow_page.k4')}
          </Typography>
          <Chip
            size='small'
            label={status.label}
            sx={{ backgroundColor: status.bg, color: status.color, fontWeight: 500 }}
          />
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.process_flow_page.k5')}
          </Typography>
          <Typography variant='body2'>
            {row.created_at ? new Date(String(row.created_at)).toLocaleString('zh-CN') : '-'}
          </Typography>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('pages.process_flow_page.k6')}
          </Typography>
          <Typography variant='body2'>{String(row.description || '-')}</Typography>
        </Box>
      </Box>
      {capacity && (
        <>
          <Typography
            variant='h6'
            sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <BarChart3 size={20} />
            {i18n.t('pages.process_flow_page.k7')}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 2,
              mb: 2,
            }}
          >
            <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 3 }}>
              <Typography
                variant='body2'
                color='white'
              >
                {i18n.t('pages.process_flow_page.k8')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'common.white' }}
              >
                {capacity.theoretical_capacity}
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'success.main', borderRadius: 3 }}>
              <Typography
                variant='body2'
                color='white'
              >
                {i18n.t('pages.process_flow_page.k9')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'common.white' }}
              >
                {capacity.effective_capacity}
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'warning.main', borderRadius: 3 }}>
              <Typography
                variant='body2'
                color='white'
              >
                {i18n.t('pages.process_flow_page.k10')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'common.white' }}
              >
                {(capacity.utilization_rate * 100).toFixed(1)}%
              </Typography>
            </Box>
          </Box>
        </>
      )}
      <Typography
        variant='h6'
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <GitBranch size={20} />
        {i18n.t('pages.process_flow_page.k11')}
      </Typography>
      {steps.length > 0 ? (
        <Stack spacing={1}>
          {steps.map((step, index) => (
            <Box
              key={step.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 1,
              }}
            >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'common.white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                }}
              >
                {index + 1}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {step.process_name}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {step.process_code} | {i18n.t('pages.process_flow_page.k0')}{' '}
                  {step.standard_time || 0} {i18n.t('pages.process_flow_page.k1')}
                  {step.quality_check_required
                    ? ` | ${i18n.t('mes.process_flow_page.quality_inspection')}`
                    : ''}
                </Typography>
              </Box>
              {step.work_station_name && (
                <Chip
                  size='small'
                  label={step.work_station_name}
                  variant='outlined'
                />
              )}
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography color='text.secondary'>{i18n.t('mes.process_flow_page.k4')}</Typography>
      )}
    </Box>
  );
}
function ProcessFlowPage() {
  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <GitBranch style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={processFlowSchema}
        apiAdapter={apiAdapter}
        detailContent={(row: Record<string, unknown>) => <ProcessFlowDetailContent row={row} />}
        detailMaxWidth='lg'
        headerContent={(rows, total) => (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                {i18n.t('pages.process_flow_page.k12')}
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
                {i18n.t('pages.process_flow_page.k13')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {rows.filter((r) => r.status === 'active').length}
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                {i18n.t('pages.process_flow_page.k14')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {rows.filter((r) => r.status === 'draft').length}
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                {i18n.t('pages.process_flow_page.k15')}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {rows.filter((r) => r.status === 'inactive').length}
              </Typography>
            </Box>
          </Box>
        )}
      />
    </PageContainer>
  );
}
export default ProcessFlowPage;
