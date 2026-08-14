import { useMemo, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import { formulaSchema } from '@/schemas/pdm';
import { pdmApi, type ProductionFormula } from '@/api/pdm';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens } from '@/theme/tokens';

const ct= designTokens.colors;

export default function PdmFormulaPage() {
  const queryClient = useQueryClient();

  const apiAdapter = useMemo<CrudApiAdapter<ProductionFormula>>(
    () => ({
      list: async (params) => {
        const response = await pdmApi.listFormulas();
        if (!response.success || !response.data) {
          return { data: [], total: 0 };
        }
        let items = (response.data as unknown as ProductionFormula[]) || [];
        const search = params?.search;
        if (search) {
          const lower = search.toLowerCase();
          items = items.filter(
            (f) =>
              (f.name || '').toLowerCase().includes(lower) ||
              (f.formula_no || '').toLowerCase().includes(lower)
          );
        }
        const status = params?.status as string | undefined;
        if (status && status !== 'all') {
          items = items.filter((f) => f.status === status);
        }
        return { data: items, total: items.length };
      },
      create: async (data) => {
        const response = await pdmApi.createFormula(
          data as Parameters<typeof pdmApi.createFormula>[0]
        );
        if (!response.success) throw new Error(response.message || '创建失败');
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.FORMULAS ,
  exact: false,
  refetchType: 'active',
});
        return (response.data ?? {}) as ProductionFormula;
      },
      update: async (id, data) => {
        const response = await pdmApi.updateFormula(
          id,
          data as Parameters<typeof pdmApi.updateFormula>[1]
        );
        if (!response.success) throw new Error(response.message || '更新失败');
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.FORMULAS ,
  exact: false,
  refetchType: 'active',
});
        return (response.data ?? {}) as ProductionFormula;
      },
      delete: async (id) => {
        const response = await pdmApi.deleteFormula(id);
        if (!response.success) throw new Error(response.message || '删除失败');
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.FORMULAS ,
  exact: false,
  refetchType: 'active',
});
      },
    }),
    [queryClient]
  );

  const headerContent = useCallback((rows: Record<string, unknown>[], _total: number) => {
    const stats = {
      total: rows.length,
      active: rows.filter((r) => r.status === 'active').length,
      draft: rows.filter((r) => r.status === 'draft').length,
      approved: rows.filter((r) => r.status === 'approved').length,
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
        <Box sx={{ p: 2, bgcolor: ct.pink[50], borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'slate.600' }}
          >
            配方总数
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {stats.total}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'slate.600' }}
          >
            已启用
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {stats.active}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'slate.600' }}
          >
            草稿
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {stats.draft}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'slate.600' }}
          >
            已批准
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {stats.approved}
          </Typography>
        </Box>
      </Box>
    );
  }, []);

  return (
    <CrudPage
      schema={formulaSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'PDM' }, { label: '生产配方' }]}
      headerContent={headerContent}
    />
  );
}
