import { useMemo, useCallback, useState, useEffect } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Database } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { bomItemSchema } from '@/schemas/pdm';
import { pdmApi, type BomItem, type Product, type CreateBomItemRequest } from '@/api/pdm';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

export default function PdmBomPage() {
  const { t } = useTranslation('pdm');
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<string>('');

  const { data: products = [], isPending: productsLoading } = useQuery<Product[]>({
    queryKey: QUERY_KEYS.PDM.PRODUCTS,
    queryFn: async (): Promise<Product[]> => {
      const response = await pdmApi.listProducts();
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return (Array.isArray(data) ? data : data.products || []) as unknown as Product[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!productsLoading && !selectedProduct && products.length > 0) {
      setSelectedProduct(products[0].id);
    }
  }, [productsLoading, selectedProduct, products]);

  const apiAdapter = useMemo<CrudApiAdapter<BomItem>>(
    () => ({
      list: async (params) => {
        const response = await pdmApi.listBomItems();
        if (!response.success || !response.data) {
          return { data: [], total: 0 };
        }
        const data = response.data as unknown as Record<string, unknown>;
        let items = (Array.isArray(data) ? data : data.items || []) as BomItem[];
        items = items.map((item: BomItem) => ({
          ...item,
          partNumber: item.part_number || '',
          partName: item.part_name || '',
          unitPrice: item.unit_price || 0,
          totalPrice: item.total_price || 0,
        })) as BomItem[];
        const productId = params?.product_id as string | undefined;
        if (productId) {
          items = items.filter((item: BomItem) => item.product_id === productId);
        }
        const search = params?.search;
        if (search) {
          const lower = search.toLowerCase();
          items = items.filter(
            (item: BomItem) =>
              (item.part_name || '').toLowerCase().includes(lower) ||
              (item.part_number || '').toLowerCase().includes(lower)
          );
        }
        return { data: items, total: items.length };
      },
      create: async (data) => {
        const itemData = data as Partial<BomItem> & { total_price?: number };
        const requestData: CreateBomItemRequest & { total_price?: number } = {
          bom_version_id: itemData.bom_version_id || '',
          item_no: itemData.item_no || `${itemData.part_number}-${Date.now()}`,
          part_number: itemData.part_number || '',
          part_name: itemData.part_name || '',
          quantity: itemData.quantity || 0,
          unit: itemData.unit || 'kg',
          unit_price: itemData.unit_price || 0,
          level: itemData.level || 1,
          is_alternative: itemData.is_alternative || false,
          remarks: itemData.remarks || '',
        };
        requestData.total_price = (requestData.quantity || 0) * (requestData.unit_price || 0);
        const response = await pdmApi.createBomItem(requestData);
        if (!response.success) throw new Error(response.message || t('pdm.pdm_bom_page.k0'));
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PDM.BOM_ITEMS,
          exact: false,
          refetchType: 'active',
        });
        return (response.data ?? {}) as BomItem;
      },
      update: async (id, data) => {
        const itemData = data as Partial<BomItem>;
        const requestData: Partial<CreateBomItemRequest> & { total_price?: number } = {
          part_number: itemData.part_number,
          part_name: itemData.part_name,
          quantity: itemData.quantity,
          unit: itemData.unit,
          unit_price: itemData.unit_price,
          level: itemData.level,
          is_alternative: itemData.is_alternative,
          remarks: itemData.remarks,
        };
        if (requestData.quantity !== undefined && requestData.unit_price !== undefined) {
          requestData.total_price = requestData.quantity * requestData.unit_price;
        }
        const response = await pdmApi.updateBomItem(id, requestData);
        if (!response.success) throw new Error(response.message || t('pdm.pdm_bom_page.k1'));
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PDM.BOM_ITEMS,
          exact: false,
          refetchType: 'active',
        });
        return (response.data ?? {}) as BomItem;
      },
      delete: async (id) => {
        const response = await pdmApi.deleteBomItem(id);
        if (!response.success) throw new Error(response.message || t('pdm.pdm_bom_page.k2'));
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PDM.BOM_ITEMS,
          exact: false,
          refetchType: 'active',
        });
      },
    }),
    [queryClient, selectedProduct]
  );

  const headerContent = useCallback(
    (rows: Record<string, unknown>[], _total: number) => {
      const items = rows as unknown as BomItem[];
      const totalCost = items.reduce(
        (sum: number, item: BomItem) =>
          sum + (item.total_price || item.quantity * (item.unit_price || 0)),
        0
      );
      const stats = {
        total: items.length,
        totalCost,
      };
      return (
        <Box>
          <Box sx={{ mb: 2 }}>
            <FormControl sx={{ minWidth: 250 }}>
              <InputLabel>{t('pdm.pdm_bom_page.k3')}</InputLabel>
              <Select
                value={selectedProduct}
                label={t('pdm.pdm_bom_page.k4')}
                onChange={(e) => setSelectedProduct(e.target.value)}
              >
                {products.map((p: Product) => (
                  <MenuItem
                    key={p.id}
                    value={p.id}
                  >
                    {p.name} ({p.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
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
                物料总数
              </Typography>
              <Typography sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
                {stats.total} 项
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
                物料总成本
              </Typography>
              <Typography sx={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'primary.main' }}>
                ¥ {stats.totalCost.toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </Box>
      );
    },
    [selectedProduct, products]
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Database style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.cyan.main} 0%, ${ct.cyan.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={bomItemSchema}
        apiAdapter={apiAdapter}
        breadcrumbs={[{ label: 'PDM' }, { label: 'BOM 管理' }]}
        headerContent={headerContent}
        extraQueryParams={{ product_id: selectedProduct }}
      />
    </PageContainer>
  );
}
