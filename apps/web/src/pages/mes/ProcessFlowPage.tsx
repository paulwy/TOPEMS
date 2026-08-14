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
import {QUERY_KEYS, CACHE_DURATIONS} from '@/lib/reactQuery';
import { designTokens } from '@/theme/tokens';
import { useTranslation } from 'react-i18next';

const ct= designTokens.colors;

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
  const { t } = useTranslation();
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
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const { data: capacityData } = useQuery({
    queryKey: [...QUERY_KEYS.MES.PROCESS_FLOWS, flowId, 'capacity'],
    queryFn: async () => {
      const response = await processFlowApi.analyzeCapacity(flowId);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const steps = (stepsData as ProcessFlowStep[]) || [];
  const capacity = capacityData as CapacityAnalysis | null;

  const statusMap: Record<string, { label: string; bg: string; color: string }> = {
    active: { label: '启用', bg: 'success.lighter', color: 'success.dark' },
    inactive: { label: '停用', bg: 'grey.100', color: 'text.secondary' },
    draft: { label: '草稿', bg: 'warning.light', color: 'warning.dark' },
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
            流程编号
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
            流程名称
          </Typography>
          <Typography variant='body2'>{String(row.name || '-')}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            生产线
          </Typography>
          <Typography variant='body2'>{String(row.production_line || '-')}</Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            产能
          </Typography>
          <Typography variant='body2'>
            {Number(row.capacity) || 0} {String(row.unit || '件/小时')}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            状态
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
            创建时间
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
            描述
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
            产能分析
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
                理论产能
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
                有效产能
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
                利用率
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
        工序列表
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
                  {step.process_code} | 标准工时: {step.standard_time || 0} 分钟
                  {step.quality_check_required
                    ? ` | ${t('mes.process_flow_page.quality_inspection')}`
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
        <Typography color='text.secondary'>暂无工序数据</Typography>
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
                总流程数
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
                启用流程
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
                草稿流程
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
                停用流程
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
