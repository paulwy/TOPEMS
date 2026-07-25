import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { categorySchema } from '@/schemas/srm';
import { useNotificationStore } from '@/store';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { FolderTree, Users } from 'lucide-react';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

interface SupplierCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  supplier_count: number;
  level: number;
  status: string;
  created_at: string;
  updated_at: string;
}

const mockCategories: SupplierCategory[] = [
  {
    id: '1',
    code: 'CAT-001',
    name: '原材料供应商',
    description: '提供原材料的供应商分类',
    supplier_count: 28,
    level: 1,
    status: 'active',
    created_at: '2025-01-15',
    updated_at: '2025-06-01',
  },
  {
    id: '2',
    code: 'CAT-002',
    name: '零部件供应商',
    description: '提供零部件的供应商',
    supplier_count: 45,
    level: 1,
    status: 'active',
    created_at: '2025-01-15',
    updated_at: '2025-06-01',
  },
  {
    id: '3',
    code: 'CAT-003',
    name: '包装材料供应商',
    description: '提供包装材料的供应商',
    supplier_count: 12,
    level: 1,
    status: 'active',
    created_at: '2025-02-10',
    updated_at: '2025-05-20',
  },
  {
    id: '4',
    code: 'CAT-004',
    name: '设备供应商',
    description: '提供生产设备的供应商',
    supplier_count: 8,
    level: 1,
    status: 'active',
    created_at: '2025-02-20',
    updated_at: '2025-06-01',
  },
  {
    id: '5',
    code: 'CAT-005',
    name: '化工原料供应商',
    description: '提供化工原料的供应商',
    supplier_count: 15,
    level: 2,
    status: 'active',
    created_at: '2025-03-01',
    updated_at: '2025-05-30',
  },
  {
    id: '6',
    code: 'CAT-006',
    name: '电子元器件供应商',
    description: '提供电子元器件的供应商',
    supplier_count: 32,
    level: 2,
    status: 'active',
    created_at: '2025-03-10',
    updated_at: '2025-06-01',
  },
  {
    id: '7',
    code: 'CAT-007',
    name: '物流服务商',
    description: '提供物流配送服务的供应商',
    supplier_count: 6,
    level: 1,
    status: 'inactive',
    created_at: '2025-04-01',
    updated_at: '2025-05-15',
  },
  {
    id: '8',
    code: 'CAT-008',
    name: '检测设备供应商',
    description: '提供检测设备的供应商',
    supplier_count: 4,
    level: 2,
    status: 'active',
    created_at: '2025-04-15',
    updated_at: '2025-06-01',
  },
];

let categoryStore = [...mockCategories];

const categoryApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const search = params?.search?.toLowerCase() || '';
    const page = params?.page || 0;
    const pageSize = params?.pageSize || 10;

    let filtered = categoryStore;
    if (search) {
      filtered = filtered.filter(
        (c) => c.name.toLowerCase().includes(search) || c.code.toLowerCase().includes(search)
      );
    }

    const total = filtered.length;
    const data = filtered.slice(page * pageSize, (page + 1) * pageSize);

    return { data: data as unknown as Record<string, unknown>[], total };
  },
  create: async (data) => {
    const newCategory: SupplierCategory = {
      id: Date.now().toString(),
      code: (data.code as string) || '',
      name: (data.name as string) || '',
      description: (data.description as string) || '',
      supplier_count: 0,
      level: (data.level as number) || 1,
      status: (data.status as string) || 'active',
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
    };
    categoryStore = [newCategory, ...categoryStore];
    return newCategory as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const idx = categoryStore.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('分类不存在');
    const updated = {
      ...categoryStore[idx],
      ...data,
      updated_at: new Date().toISOString().split('T')[0],
    };
    categoryStore[idx] = updated;
    return updated as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    categoryStore = categoryStore.filter((c) => c.id !== id);
  },
};

const CategoryStats: React.FC<{ rows: SupplierCategory[] }> = ({ rows }) => {
  const stats = React.useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => r.status === 'active').length,
      withSuppliers: rows.filter((r) => r.supplier_count > 0).length,
      totalSuppliers: rows.reduce((sum, r) => sum + (r.supplier_count || 0), 0),
    }),
    [rows]
  );

  const statCards = [
    { label: '分类总数', value: stats.total, color: ct.purple[500], bgColor: 'secondary.light' },
    { label: '已启用', value: stats.active, color: 'success.dark', bgColor: 'success.lighter' },
    { label: '含供应商', value: stats.withSuppliers, color: 'info.dark', bgColor: 'info.lighter' },
    {
      label: '供应商总数',
      value: stats.totalSuppliers,
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
                <FolderTree sx={{ width: 20, height: 20, color: card.color }} />
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

const SrmCategoryPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  return (
    <CrudPage
      schema={categorySchema}
      apiAdapter={categoryApiAdapter}
      breadcrumbs={[{ label: 'SRM' }, { label: '供应商分类' }]}
      headerContent={(rows) => <CategoryStats rows={rows as SupplierCategory[]} />}
    />
  );
};

export default SrmCategoryPage;
