import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema-dsl/crudPageAdapter';
import { supplierSchema } from '@/schemas/srm';
import { masterDataApi } from '@/api/master-data';
import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import { Users } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';
// 切 MDM 权威源（2026-11-07）：4 个显式方法全部改走 /api/master-data/suppliers。
// mdm list 信封为 { items, total, page, page_size }，默认 itemsField='items' 即可。
// 注意：mdm update 是 PATCH 不是 PUT（masterDataApi.suppliers.update 已按 PATCH 注册）。
const apiAdapter = createCrudPageAdapter({
  list: masterDataApi.suppliers.list,
  create: masterDataApi.suppliers.create,
  update: masterDataApi.suppliers.update,
  delete: masterDataApi.suppliers.delete,
});

const SupplierStats: React.FC = () => {
  const theme = useTheme();
  const { data: suppliers = [] } = useQuery({
    // 挂在 [schema.entity] 前缀下，增/改/删成功后 CrudPage 的失效会连带刷新统计；
    // 加独有的 'stats' 段，避免与其他页面同名的 ['supplier'] 查询串键
    queryKey: [supplierSchema.entity, 'stats'],
    queryFn: async () => {
      const response = await masterDataApi.suppliers.list({ page: 1, page_size: 100 });
      if (response.success && response.data) {
        const data = response.data as unknown as {
          items?: Array<{ status: string; risk_level: string }>;
        };
        return data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = React.useMemo(
    () => ({
      total: suppliers.length,
      active: suppliers.filter(
        (s) => s.status === i18n.t('pages.srm_supplier_page.k0') || s.status === 'active'
      ).length,
      lowRisk: suppliers.filter((s) => s.risk_level === 'low').length,
      highRisk: suppliers.filter((s) => s.risk_level === 'high').length,
    }),
    [suppliers]
  );

  const statCards = [
    {
      label: i18n.t('pages.srm_supplier_page.k1'),
      value: stats.total,
      color: theme.palette.purple[500],
      bgColor: 'secondary.light',
    },
    {
      label: i18n.t('pages.srm_supplier_page.k2'),
      value: stats.active,
      color: 'success.700',
      bgColor: 'success.50',
    },
    {
      label: i18n.t('pages.srm_supplier_page.k3'),
      value: stats.lowRisk,
      color: 'success.700',
      bgColor: 'success.50',
    },
    {
      label: i18n.t('pages.srm_supplier_page.k4'),
      value: stats.highRisk,
      color: 'error.700',
      bgColor: 'error.50',
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        // 窄视口（≈860px）下 4 列会把“供应商总数”等标签挤成竖排，改为 2 列起步、md 以上 4 列
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(4, minmax(0, 1fr))',
        },
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
                <Users sx={{ width: 20, height: 20, color: card.color }} />
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

export default function SrmSupplierPage() {
  return (
    <CrudPage
      schema={supplierSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'SRM' }, { label: i18n.t('pages.srm_supplier_page.k5') }]}
      headerContent={<SupplierStats />}
    />
  );
}
