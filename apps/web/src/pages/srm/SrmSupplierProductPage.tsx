import React from 'react';
import { useQuery } from '@tanstack/react-query';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { supplierProductSchema } from '@/schemas/srm';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { Package } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';
import { srmApi } from '@/api/srm';

const ct = designTokens.colors;

interface SupplierProduct {
  id: string;
  product_code: string;
  name: string;
  supplier: string;
  category: string;
  price: number;
  unit: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const mockProducts: SupplierProduct[] = [
  {
    id: '1',
    product_code: 'SP-001',
    name: i18n.t('pages.srm_supplier_product_page.304_0'),
    supplier: i18n.t('pages.srm_supplier_product_page.k1'),
    category: i18n.t('pages.srm_supplier_product_page.k2'),
    price: 12500,
    unit: i18n.t('pages.srm_supplier_product_page.k3'),
    status: 'active',
    created_at: '2025-01-15',
    updated_at: '2025-06-01',
  },
  {
    id: '2',
    product_code: 'SP-002',
    name: i18n.t('pages.srm_supplier_product_page.6061_4'),
    supplier: i18n.t('pages.srm_supplier_product_page.k5'),
    category: i18n.t('pages.srm_supplier_product_page.k6'),
    price: 18500,
    unit: i18n.t('pages.srm_supplier_product_page.k7'),
    status: 'active',
    created_at: '2025-01-20',
    updated_at: '2025-06-01',
  },
  {
    id: '3',
    product_code: 'SP-003',
    name: i18n.t('pages.srm_supplier_product_page.nbr_8'),
    supplier: i18n.t('pages.srm_supplier_product_page.k9'),
    category: i18n.t('pages.srm_supplier_product_page.k10'),
    price: 2.5,
    unit: i18n.t('pages.srm_supplier_product_page.k11'),
    status: 'active',
    created_at: '2025-02-01',
    updated_at: '2025-05-28',
  },
  {
    id: '4',
    product_code: 'SP-004',
    name: i18n.t('pages.srm_supplier_product_page.y275kw_0'),
    supplier: i18n.t('pages.srm_supplier_product_page.k12'),
    category: i18n.t('pages.srm_supplier_product_page.k13'),
    price: 3500,
    unit: i18n.t('pages.srm_supplier_product_page.k14'),
    status: 'active',
    created_at: '2025-02-15',
    updated_at: '2025-06-01',
  },
  {
    id: '5',
    product_code: 'SP-005',
    name: i18n.t('pages.srm_supplier_product_page.hm46_15'),
    supplier: i18n.t('pages.srm_supplier_product_page.k16'),
    category: i18n.t('pages.srm_supplier_product_page.k17'),
    price: 28,
    unit: i18n.t('pages.srm_supplier_product_page.k18'),
    status: 'active',
    created_at: '2025-03-01',
    updated_at: '2025-05-30',
  },
  {
    id: '6',
    product_code: 'SP-006',
    name: i18n.t('pages.srm_supplier_product_page.pt100_19'),
    supplier: i18n.t('pages.srm_supplier_product_page.k20'),
    category: i18n.t('pages.srm_supplier_product_page.k21'),
    price: 85,
    unit: i18n.t('pages.srm_supplier_product_page.k22'),
    status: 'pending',
    created_at: '2025-03-10',
    updated_at: '2025-06-01',
  },
  {
    id: '7',
    product_code: 'SP-007',
    name: i18n.t('pages.srm_supplier_product_page.k23'),
    supplier: i18n.t('pages.srm_supplier_product_page.k24'),
    category: i18n.t('pages.srm_supplier_product_page.k25'),
    price: 3.8,
    unit: i18n.t('pages.srm_supplier_product_page.k26'),
    status: 'active',
    created_at: '2025-04-01',
    updated_at: '2025-05-25',
  },
  {
    id: '8',
    product_code: 'SP-008',
    name: i18n.t('pages.srm_supplier_product_page.skf6205_27'),
    supplier: i18n.t('pages.srm_supplier_product_page.skf_28'),
    category: i18n.t('pages.srm_supplier_product_page.k29'),
    price: 68,
    unit: i18n.t('pages.srm_supplier_product_page.k30'),
    status: 'inactive',
    created_at: '2025-04-15',
    updated_at: '2025-05-20',
  },
];

let productStore = [...mockProducts];

const supplierProductApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const search = params?.search?.toLowerCase() || '';
    const page = params?.page || 0;
    const pageSize = params?.pageSize || 10;

    let filtered = productStore;
    if (search) {
      filtered = productStore.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.product_code.toLowerCase().includes(search) ||
          p.supplier.toLowerCase().includes(search)
      );
    }

    const total = filtered.length;
    const data = filtered.slice(page * pageSize, (page + 1) * pageSize);
    return { data: data as unknown as Record<string, unknown>[], total };
  },
  create: async (data) => {
    const newProduct: SupplierProduct = {
      id: Date.now().toString(),
      product_code: (data.product_code as string) || '',
      name: (data.name as string) || '',
      supplier: (data.supplier as string) || '',
      category: (data.category as string) || '',
      price: (data.price as number) || 0,
      unit: (data.unit as string) || i18n.t('pages.srm_supplier_product_page.k31'),
      status: (data.status as string) || 'active',
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
    };
    productStore = [newProduct, ...productStore];
    return newProduct as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const idx = productStore.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(i18n.t('pages.srm_supplier_product_page.k32'));
    const updated = {
      ...productStore[idx],
      ...data,
      updated_at: new Date().toISOString().split('T')[0],
    };
    productStore[idx] = updated;
    return updated as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    productStore = productStore.filter((p) => p.id !== id);
  },
};

const SupplierProductStats: React.FC<{ rows: SupplierProduct[] }> = ({ rows }) => {
  const stats = React.useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => r.status === 'active').length,
      pending: rows.filter((r) => r.status === 'pending').length,
      totalValue: rows.reduce((sum, r) => sum + (r.price || 0), 0),
    }),
    [rows]
  );

  const statCards = [
    {
      label: i18n.t('pages.srm_supplier_product_page.k33'),
      value: stats.total,
      color: ct.purple[500],
      bgColor: 'secondary.light',
    },
    {
      label: i18n.t('pages.srm_supplier_product_page.k34'),
      value: stats.active,
      color: 'success.dark',
      bgColor: 'success.lighter',
    },
    {
      label: i18n.t('pages.srm_supplier_product_page.k35'),
      value: stats.pending,
      color: 'warning.dark',
      bgColor: 'warning.lighter',
    },
    {
      label: i18n.t('pages.srm_supplier_product_page.k36'),
      value: `¥${stats.totalValue.toLocaleString()}`,
      color: 'primary.dark',
      bgColor: 'primary.lighter',
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 4,
      }}
    >
      {statCards.map((card) => (
        <Card key={card.label}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: card.bgColor,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Package sx={{ width: 20, height: 20, color: card.color }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{
                    color: 'text.secondary',
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                  }}
                >
                  {card.label}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'slate.900' }}
                >
                  {card.value}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

const SrmSupplierProductPage: React.FC = () => {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['srm-supplier-product'],
    queryFn: async () => {
      try {
        const res = await srmApi.listProducts();
        if (res.success && res.data) return res.data;
        return {};
      } catch {
        return {};
      }
    },
  });
  return (
    <CrudPage
      schema={supplierProductSchema}
      apiAdapter={supplierProductApiAdapter}
      breadcrumbs={[{ label: 'SRM' }, { label: i18n.t('pages.srm_supplier_product_page.k37') }]}
      headerContent={(rows) => <SupplierProductStats rows={rows as SupplierProduct[]} />}
    />
  );
};

export default SrmSupplierProductPage;
