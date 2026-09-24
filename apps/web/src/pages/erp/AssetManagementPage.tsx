/**
 * 资产管理页面 — Schema 驱动的 CRUD 页面
 */
import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { assetSchema } from '@/schemas/erp/asset';
import { assetApi } from '@/api/erp';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { Building2 } from 'lucide-react';
import i18n from '@/i18n';

const AssetStats: React.FC = () => {
  const { data } = useQuery({
    queryKey: [QUERY_KEYS.ERP.ASSETS, 'stats'],
    queryFn: async () => {
      const response = await assetApi.list({ page: 0, page_size: 1000 });
      if (!response.success) throw new Error(i18n.t('erp.asset_management_page.k0'));
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const assets = data?.items || [];
  const total = assets.length;
  const totalValue = assets.reduce((sum, a) => sum + (a.purchase_amount || 0), 0);
  const active = assets.filter((a) => a.status === 'active').length;
  const retired = assets.filter((a) => ['retired', 'transferred'].includes(a.status)).length;
  const stats = [
    {
      label: i18n.t('erp.asset_management_page.k1'),
      value: total,
      color: 'secondary[100]',
      textColor: 'secondary.700',
    },
    {
      label: i18n.t('erp.asset_management_page.k2'),
      value: `¥${totalValue.toFixed(2)}`,
      color: 'success.lighter',
      textColor: 'success.700',
    },
    {
      label: i18n.t('erp.asset_management_page.k3'),
      value: active,
      color: 'warning.light',
      textColor: 'warning.700',
    },
    {
      label: i18n.t('erp.asset_management_page.k4'),
      value: retired,
      color: 'error.lighter',
      textColor: 'error.dark',
    },
  ];
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      {stats.map((stat) => (
        <Box
          key={stat.label}
          sx={{ p: 2, bgcolor: stat.color, borderRadius: 3 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Building2
              size={18}
              sx={{ color: stat.textColor }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary', fontSize: 14 }}
            >
              {stat.label}
            </Typography>
          </Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: stat.textColor }}
          >
            {stat.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};
const assetApiAdapter = createCrudPageAdapter(assetApi);
const AssetManagementPage: React.FC = () => {
  return (
    <CrudPage
      schema={assetSchema}
      apiAdapter={assetApiAdapter}
      breadcrumbs={[
        { label: i18n.t('erp.asset_management_page.k9'), href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: i18n.t('erp.asset_management_page.k10') },
      ]}
      headerContent={<AssetStats />}
    />
  );
};
export default AssetManagementPage;
