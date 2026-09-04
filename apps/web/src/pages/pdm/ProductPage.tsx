import { useMemo, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { Package } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import { productSchema } from '@/schemas/pdm';
import { pdmApi, type Product } from '@/api/pdm';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

export default function ProductPage() {
  const { t } = useTranslation('pdm');
  const queryClient = useQueryClient();

  const apiAdapter = useMemo<CrudApiAdapter<Product>>(
    () => ({
      list: async (params) => {
        const response = await pdmApi.listProducts();
        if (!response.success || !response.data) {
          return { data: [], total: 0 };
        }
        const data = response.data as unknown as Record<string, unknown>;
        let items = (Array.isArray(data) ? data : data.products || []) as Product[];
        const search = params?.search;
        if (search) {
          const lower = search.toLowerCase();
          items = items.filter(
            (p) =>
              (p.name || '').toLowerCase().includes(lower) ||
              (p.code || '').toLowerCase().includes(lower) ||
              (p.category || '').toLowerCase().includes(lower)
          );
        }
        const status = params?.status as string | undefined;
        if (status && status !== 'all') {
          items = items.filter((p) => p.status === status);
        }
        return { data: items, total: items.length };
      },
      create: async (data) => {
        const response = await pdmApi.createProduct(
          data as Parameters<typeof pdmApi.createProduct>[0]
        );
        if (!response.success) throw new Error(response.message || t('pdm.product_page.k0'));
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PDM.PRODUCTS,
          exact: false,
          refetchType: 'active',
        });
        return (response.data ?? {}) as Product;
      },
      update: async (id, data) => {
        const response = await pdmApi.updateProduct(
          id,
          data as Parameters<typeof pdmApi.updateProduct>[1]
        );
        if (!response.success) throw new Error(response.message || t('pdm.product_page.k1'));
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PDM.PRODUCTS,
          exact: false,
          refetchType: 'active',
        });
        return (response.data ?? {}) as Product;
      },
      delete: async (id) => {
        const response = await pdmApi.deleteProduct(id);
        if (!response.success) throw new Error(response.message || t('pdm.product_page.k2'));
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PDM.PRODUCTS,
          exact: false,
          refetchType: 'active',
        });
      },
    }),
    [queryClient, t]
  );

  const headerContent = useCallback(
    (rows: Record<string, unknown>[], _total: number) => {
      const products = rows as unknown as Product[];
      const stats = {
        total: products.length,
        active: products.filter((p) => p.status === 'active').length,
        draft: products.filter((p) => p.status === 'draft').length,
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
              sx={{
                color: 'text.secondary',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                mb: 1,
              }}
            >
              {t('pdm.product_page.e1')}
            </Typography>
            <Typography
              sx={{
                fontWeight: 'bold',
                fontSize: designTokens.typography.fontSize.scale['1.5rem'],
              }}
            >
              {t('pdm.product_page.m1', { v1: stats.total })}
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
              sx={{
                color: 'text.secondary',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                mb: 1,
              }}
            >
              {t('pdm.product_page.e2')}
            </Typography>
            <Typography
              sx={{
                fontWeight: 'bold',
                fontSize: designTokens.typography.fontSize.scale['1.5rem'],
                color: 'success.main',
              }}
            >
              {t('pdm.product_page.m1', { v1: stats.active })}
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
              sx={{
                color: 'text.secondary',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                mb: 1,
              }}
            >
              {t('pdm.product_page.e3')}
            </Typography>
            <Typography
              sx={{
                fontWeight: 'bold',
                fontSize: designTokens.typography.fontSize.scale['1.5rem'],
                color: 'warning.main',
              }}
            >
              {t('pdm.product_page.m1', { v1: stats.draft })}
            </Typography>
          </Box>
        </Box>
      );
    },
    [t]
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Package style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main} 0%, ${ct.secondary.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={productSchema}
        apiAdapter={apiAdapter}
        breadcrumbs={[{ label: 'PDM' }, { label: t('pdm.product_page.k3') }]}
        headerContent={headerContent}
      />
    </PageContainer>
  );
}
