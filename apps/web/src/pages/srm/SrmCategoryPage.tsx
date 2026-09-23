import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { categorySchema } from '@/schemas/srm';
import { supplierCategoryApi } from '@/api/srm';
import type { SupplierCategory as ApiSupplierCategory } from '@/api/srm/supplierCategory';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { FolderTree } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';

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

const toPageModel = (c: ApiSupplierCategory & { supplier_count?: number }): SupplierCategory => ({
  id: c.id,
  code: (c as { category_no?: string }).category_no || c.code || '',
  name: c.name,
  description: c.description || '',
  supplier_count: Number(c.supplier_count ?? 0),
  level: c.level ?? 1,
  status: c.is_active ? 'active' : 'inactive',
  created_at: c.created_at,
  updated_at: c.updated_at,
});

const categoryApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const search = params?.search || '';
    const page = params?.page || 0;
    const pageSize = params?.pageSize || 10;
    const res = await supplierCategoryApi.listCategories({
      page: page + 1,
      page_size: pageSize,
      search,
    });
    const items = res.data?.items || [];
    return {
      data: items.map(toPageModel) as unknown as Record<string, unknown>[],
      total: res.data?.total ?? items.length,
    };
  },
  create: async (data) => {
    const res = await supplierCategoryApi.createCategory({
      category_no: (data.code as string) || '',
      name: (data.name as string) || '',
      description: (data.description as string) || undefined,
      level: Number(data.level ?? 1),
      is_active: (data.status as string) !== 'inactive',
    } as unknown as Parameters<typeof supplierCategoryApi.createCategory>[0]);
    return toPageModel(
      res.data as unknown as ApiSupplierCategory & { supplier_count?: number }
    ) as unknown as Record<string, unknown>;
  },
  update: async (id, data) => {
    const res = await supplierCategoryApi.updateCategory(id, {
      category_no: (data.code as string) || undefined,
      name: (data.name as string) || undefined,
      description: (data.description as string) || undefined,
      level: data.level !== undefined ? Number(data.level) : undefined,
      is_active: data.status !== undefined ? (data.status as string) !== 'inactive' : undefined,
    } as unknown as Parameters<typeof supplierCategoryApi.updateCategory>[1]);
    return toPageModel(
      res.data as unknown as ApiSupplierCategory & { supplier_count?: number }
    ) as unknown as Record<string, unknown>;
  },
  delete: async (id) => {
    await supplierCategoryApi.deleteCategory(id);
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
    {
      label: i18n.t('pages.srm_category_page.k17'),
      value: stats.total,
      color: ct.purple[500],
      bgColor: 'secondary.light',
    },
    {
      label: i18n.t('pages.srm_category_page.k18'),
      value: stats.active,
      color: 'success.dark',
      bgColor: 'success.lighter',
    },
    {
      label: i18n.t('pages.srm_category_page.k19'),
      value: stats.withSuppliers,
      color: 'info.dark',
      bgColor: 'info.lighter',
    },
    {
      label: i18n.t('pages.srm_category_page.k20'),
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

const SrmCategoryPage: React.FC = () => {
  return (
    <CrudPage
      schema={categorySchema}
      apiAdapter={categoryApiAdapter}
      breadcrumbs={[{ label: 'SRM' }, { label: i18n.t('pages.srm_category_page.k21') }]}
      headerContent={(rows) => <CategoryStats rows={rows as SupplierCategory[]} />}
    />
  );
};

export default SrmCategoryPage;
