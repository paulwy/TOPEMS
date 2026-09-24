import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { inventorySchema } from '@/schemas/wms';
import { wmsApi } from '@/api/wms';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Card, CardContent, Stack } from '@mui/material';
import { Package, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { designTokens } from '@/theme/tokens';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const ct = designTokens.colors;

const InventoryStats: React.FC = () => {
  const { data: stats } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.WMS_INVENTORY_ALERT_STATS_BASE,
    queryFn: async () => {
      const response = await wmsApi.inventoryAlerts.getStatistics();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: QUERY_KEYS.WMS.INVENTORY,
    queryFn: async () => {
      const response = await wmsApi.inventory.list({ page: 1, page_size: 1 });
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const statCards = [
    {
      label: i18n.t('pages.inventory_page.k0'),
      value: stats?.total_alerts || inventory.length,
      color: ct.info.main,
      bgColor: 'grey.100',
      icon: (
        <Package
          size={20}
          color={ct.info.main}
        />
      ),
    },
    {
      label: i18n.t('pages.inventory_page.k1'),
      value: stats?.low_stock_count || 0,
      color: 'warning.dark',
      bgColor: 'warning.light',
      icon: (
        <AlertTriangle
          size={20}
          color='warning.dark'
        />
      ),
    },
    {
      label: i18n.t('pages.inventory_page.k2'),
      value: stats?.pending_alerts || 0,
      color: 'error.main',
      bgColor: ct.error[50],
      icon: (
        <XCircle
          size={20}
          color='error.main'
        />
      ),
    },
    {
      label: i18n.t('pages.inventory_page.k3'),
      value: stats?.total_alerts || 0,
      color: 'success.dark',
      bgColor: 'success.lighter',
      icon: (
        <CheckCircle
          size={20}
          color='success.dark'
        />
      ),
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 4,
      }}
    >
      {statCards.map((card) => (
        <Card key={card.label}>
          <CardContent sx={{ p: 2 }}>
            <Stack
              direction='row'
              spacing={1.5}
              sx={{ alignItems: 'center' }}
            >
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
                {card.icon}
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {card.label}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {card.value}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

const inventoryApiAdapter = createCrudPageAdapter(wmsApi.inventory);

export default function InventoryPage() {
  return (
    <CrudPage
      schema={inventorySchema}
      apiAdapter={inventoryApiAdapter}
      breadcrumbs={[{ label: 'WMS' }, { label: i18n.t('pages.inventory_page.k8') }]}
      headerContent={<InventoryStats />}
    />
  );
}
