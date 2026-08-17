import { useMemo, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { Layers } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import { materialSchema } from '@/schemas/pdm';
import { pdmApi, type Material } from '@/api/pdm';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

export default function MaterialPage() {
  const { t } = useTranslation('pdm');
  const queryClient = useQueryClient();

  const apiAdapter = useMemo<CrudApiAdapter<Record<string, unknown>>>(
    () => ({
      list: async (params) => {
        const response = await pdmApi.listMaterials();
        if (!response.success || !response.data) {
          return { data: [], total: 0 };
        }
        const data = response.data as unknown as Record<string, unknown>;
        let items = (Array.isArray(data) ? data : data.materials || []) as unknown as Record<
          string,
          unknown
        >[];
        const search = params?.search;
        if (search) {
          const lower = search.toLowerCase();
          items = (items as unknown as Material[]).filter(
            (m) =>
              (m.name || '').toLowerCase().includes(lower) ||
              (m.code || '').toLowerCase().includes(lower) ||
              (m.supplier || '').toLowerCase().includes(lower)
          ) as unknown as Record<string, unknown>[];
        }
        const category = params?.category as string | undefined;
        if (category && category !== 'all') {
          items = (items as unknown as Material[]).filter(
            (m) => m.category === category
          ) as unknown as Record<string, unknown>[];
        }
        const status = params?.status as string | undefined;
        if (status && status !== 'all') {
          items = (items as unknown as Material[]).filter((m) => {
            let displayStatus = m.status || 'active';
            if (m.inventory_quantity !== undefined && m.safety_stock !== undefined) {
              if (m.inventory_quantity <= 0) {
                displayStatus = 'out_of_stock';
              } else if (m.inventory_quantity < m.safety_stock) {
                displayStatus = 'low_stock';
              }
            }
            return displayStatus === status;
          }) as unknown as Record<string, unknown>[];
        }
        return { data: items, total: items.length };
      },
      create: async (data) => {
        const response = await pdmApi.createMaterial(
          data as unknown as Parameters<typeof pdmApi.createMaterial>[0]
        );
        if (!response.success) throw new Error(response.message || t('pdm.material_page.k0'));
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PDM.MATERIALS,
          exact: false,
          refetchType: 'active',
        });
        return (response.data ?? {}) as unknown as Record<string, unknown>;
      },
      update: async (id, data) => {
        const response = await pdmApi.updateMaterial(
          id,
          data as unknown as Parameters<typeof pdmApi.updateMaterial>[1]
        );
        if (!response.success) throw new Error(response.message || t('pdm.material_page.k1'));
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PDM.MATERIALS,
          exact: false,
          refetchType: 'active',
        });
        return (response.data ?? {}) as unknown as Record<string, unknown>;
      },
      delete: async (id) => {
        const response = await pdmApi.deleteMaterial(id);
        if (!response.success) throw new Error(response.message || t('pdm.material_page.k2'));
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PDM.MATERIALS,
          exact: false,
          refetchType: 'active',
        });
      },
    }),
    [queryClient]
  );

  const headerContent = useCallback((rows: Record<string, unknown>[], _total: number) => {
    const materials = rows as unknown as Material[];
    const totalValue = materials.reduce(
      (sum, m) => sum + (m.unit_price || 0) * (m.inventory_quantity || 0),
      0
    );
    const totalInventory = materials.reduce((sum, m) => sum + (m.inventory_quantity || 0), 0);
    const stats = {
      total: materials.length,
      totalInventory,
      totalValue,
    };
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}
          >
            {t('pdm.material_page.e1')}
          </Typography>
          <Typography sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
            {t('pdm.material_page.m1', { v1: stats.total })}
          </Typography>
        </Box>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}
          >
            {t('pdm.material_page.e2')}
          </Typography>
          <Typography sx={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'primary.main' }}>
            {t('pdm.material_page.m2', { v1: stats.totalInventory })}
          </Typography>
        </Box>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}
          >
            {t('pdm.material_page.e3')}
          </Typography>
          <Typography sx={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'success.main' }}>
            ¥ {stats.totalValue.toLocaleString()}
          </Typography>
        </Box>
      </Box>
    );
  }, []);

  return (
    <PageContainer
      title={t('pdm.material_page.k3')}
      subtitle={t('pdm.material_page.k4')}
      headerProps={{
        pageIcon: <Layers style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={materialSchema}
        apiAdapter={apiAdapter}
        breadcrumbs={[{ label: 'PDM' }, { label: t('pdm.material_page.k5') }]}
        headerContent={headerContent}
      />
    </PageContainer>
  );
}
