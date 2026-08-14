import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { supplierProductSchema } from '@/schemas/srm';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { Package } from 'lucide-react';
import { designTokens } from '@/theme/tokens';

const ct= designTokens.colors;

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
    name: '不锈钢板材 304',
    supplier: '宝钢集团',
    category: '原材料',
    price: 12500,
    unit: '吨',
    status: 'active',
    created_at: '2025-01-15',
    updated_at: '2025-06-01',
  },
  {
    id: '2',
    product_code: 'SP-002',
    name: '铝合金型材 6061',
    supplier: '中铝集团',
    category: '原材料',
    price: 18500,
    unit: '吨',
    status: 'active',
    created_at: '2025-01-20',
    updated_at: '2025-06-01',
  },
  {
    id: '3',
    product_code: 'SP-003',
    name: '密封圈 NBR',
    supplier: '三力密封',
    category: '零部件',
    price: 2.5,
    unit: '个',
    status: 'active',
    created_at: '2025-02-01',
    updated_at: '2025-05-28',
  },
  {
    id: '4',
    product_code: 'SP-004',
    name: '电机 Y2-7.5kW',
    supplier: '西门子电气',
    category: '设备配件',
    price: 3500,
    unit: '台',
    status: 'active',
    created_at: '2025-02-15',
    updated_at: '2025-06-01',
  },
  {
    id: '5',
    product_code: 'SP-005',
    name: '液压油 HM46',
    supplier: '长城润滑油',
    category: '化工原料',
    price: 28,
    unit: '升',
    status: 'active',
    created_at: '2025-03-01',
    updated_at: '2025-05-30',
  },
  {
    id: '6',
    product_code: 'SP-006',
    name: '传感器 PT100',
    supplier: '霍尼韦尔',
    category: '电子元器件',
    price: 85,
    unit: '只',
    status: 'pending',
    created_at: '2025-03-10',
    updated_at: '2025-06-01',
  },
  {
    id: '7',
    product_code: 'SP-007',
    name: '瓦楞纸箱定制',
    supplier: '合兴包装',
    category: '包装材料',
    price: 3.8,
    unit: '个',
    status: 'active',
    created_at: '2025-04-01',
    updated_at: '2025-05-25',
  },
  {
    id: '8',
    product_code: 'SP-008',
    name: '轴承 SKF6205',
    supplier: '瑞典SKF',
    category: '零部件',
    price: 68,
    unit: '只',
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
      unit: (data.unit as string) || '个',
      status: (data.status as string) || 'active',
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
    };
    productStore = [newProduct, ...productStore];
    return newProduct as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const idx = productStore.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('产品不存在');
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
    { label: '产品总数', value: stats.total, color: ct.purple[500], bgColor: 'secondary.light' },
    { label: '在售', value: stats.active, color: 'success.dark', bgColor: 'success.lighter' },
    { label: '待审核', value: stats.pending, color: 'warning.dark', bgColor: 'warning.lighter' },
    {
      label: '总价值',
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
                  sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
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
  return (
    <CrudPage
      schema={supplierProductSchema}
      apiAdapter={supplierProductApiAdapter}
      breadcrumbs={[{ label: 'SRM' }, { label: '供应商产品' }]}
      headerContent={(rows) => <SupplierProductStats rows={rows as SupplierProduct[]} />}
    />
  );
};

export default SrmSupplierProductPage;
