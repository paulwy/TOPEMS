import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { supplierSchema } from '@/schemas/srm';
import { srmApi } from '@/api/srm';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { Users } from 'lucide-react';
import { designTokens } from '@/theme/tokens';

const ct= designTokens.colors;

const apiAdapter = createCrudPageAdapter({
  list: srmApi.listSuppliers,
  create: srmApi.createSupplier,
  update: srmApi.updateSupplier,
  delete: srmApi.deleteSupplier,
});

const SupplierStats: React.FC = () => {
  const { data: suppliers = [] } = useQuery({
    queryKey: QUERY_KEYS.SRM.SUPPLIERS,
    queryFn: async () => {
      const response = await srmApi.listSuppliers();
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return (Array.isArray(data)
          ? data
          : (data.suppliers as unknown as Record<string, unknown>[]) || []) as unknown as Array<{
          status: string;
          risklevel: string;
        }>;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = React.useMemo(
    () => ({
      total: suppliers.length,
      active: suppliers.filter((s) => s.status === '启用' || s.status === 'active').length,
      lowRisk: suppliers.filter((s) => s.risklevel === 'low').length,
      highRisk: suppliers.filter((s) => s.risklevel === 'high').length,
    }),
    [suppliers]
  );

  const statCards = [
    {
      label: '供应商总数',
      value: stats.total,
      color: ct.purple[500],
      bgColor: 'secondary.light',
    },
    {
      label: '已启用',
      value: stats.active,
      color: 'success.dark',
      bgColor: 'success.lighter',
    },
    {
      label: '低风险',
      value: stats.lowRisk,
      color: 'success.dark',
      bgColor: 'success.lighter',
    },
    {
      label: '高风险',
      value: stats.highRisk,
      color: 'error.dark',
      bgColor: 'error.lighter',
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
                <Users sx={{ width: 20, height: 20, color: card.color }} />
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

export default function SrmSupplierPage() {
  return (
    <CrudPage
      schema={supplierSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: 'SRM' }, { label: '供应商管理' }]}
      headerContent={<SupplierStats />}
    />
  );
}
