import React, { useMemo, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import { batchSchema } from '@/schemas/pdm';
import { pdmApi, type ProductionBatch } from '@/api/pdm';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

export default function PdmBatchPage() {
  const queryClient = useQueryClient();

  const apiAdapter = useMemo<CrudApiAdapter<ProductionBatch>>(
    () => ({
      list: async (params) => {
        const response = await pdmApi.listBatches();
        if (!response.success || !response.data) {
          return { data: [], total: 0 };
        }
        let items = (response.data as unknown as ProductionBatch[]) || [];
        const search = params?.search;
        if (search) {
          const lower = search.toLowerCase();
          items = items.filter(
            (b) =>
              (b.batch_no || '').toLowerCase().includes(lower) ||
              (b.product_name || '').toLowerCase().includes(lower)
          );
        }
        const status = params?.status as string | undefined;
        if (status && status !== 'all') {
          items = items.filter((b) => b.status === status);
        }
        return { data: items, total: items.length };
      },
      create: async (data) => {
        const response = await pdmApi.createBatch(data as Parameters<typeof pdmApi.createBatch>[0]);
        if (!response.success) throw new Error(response.message || '创建失败');
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.BATCHES });
        return (response.data ?? {}) as ProductionBatch;
      },
      update: async (id, data) => {
        const response = await pdmApi.updateBatch(
          id,
          data as Parameters<typeof pdmApi.updateBatch>[1]
        );
        if (!response.success) throw new Error(response.message || '更新失败');
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.BATCHES });
        return (response.data ?? {}) as ProductionBatch;
      },
      delete: async (id) => {
        const response = await pdmApi.deleteBatch(id);
        if (!response.success) throw new Error(response.message || '删除失败');
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.BATCHES });
      },
    }),
    [queryClient]
  );

  const headerContent = useCallback((rows: Record<string, unknown>[], _total: number) => {
    const stats = {
      total: rows.length,
      planning: rows.filter((r) => r.status === 'planning').length,
      inProgress: rows.filter((r) => r.status === 'in_progress').length,
      completed: rows.filter((r) => r.status === 'completed').length,
    };
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ p: 2, bgcolor: 'cyan.light', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'slate.600' }}
          >
            批次总数
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {stats.total}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'warning.100', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'slate.600' }}
          >
            规划中
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {stats.planning}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'slate.600' }}
          >
            进行中
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {stats.inProgress}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'slate.600' }}
          >
            已完成
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {stats.completed}
          </Typography>
        </Box>
      </Box>
    );
  }, []);

  return (
    <CrudPage
      schema={batchSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'PDM' }, { label: '生产批次' }]}
      headerContent={headerContent}
    />
  );
}
