/**
 * 车辆管理页面 — Schema 驱动的 CRUD 页面
 */
import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { vehicleSchema } from '@/schemas/erp/vehicle';
import { vehicleApi } from '@/api/erp';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { Car } from 'lucide-react';
import i18n from '@/i18n';

const VehicleStats: React.FC = () => {
  const { data } = useQuery({
    queryKey: [QUERY_KEYS.ERP.VEHICLES, 'stats'],
    queryFn: async () => {
      const response = await vehicleApi.list({ page: 0, page_size: 1000 });
      if (!response.success) throw new Error(i18n.t('erp.vehicle_page.k0'));
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const vehicles = data?.items || [];
  const total = vehicles.length;
  const available = vehicles.filter((v) => v.status === 'available').length;
  const inUse = vehicles.filter((v) => v.status === 'in_use').length;
  const maintenance = vehicles.filter((v) => v.status === 'maintenance').length;
  const stats = [
    {
      label: i18n.t('erp.vehicle_page.k1'),
      value: total,
      color: 'secondary[100]',
      textColor: 'secondary.700',
    },
    {
      label: i18n.t('erp.vehicle_page.k2'),
      value: available,
      color: 'success.lighter',
      textColor: 'success.700',
    },
    {
      label: i18n.t('erp.vehicle_page.k3'),
      value: inUse,
      color: 'info.lighter',
      textColor: 'info.700',
    },
    {
      label: i18n.t('erp.vehicle_page.k4'),
      value: maintenance,
      color: 'warning.light',
      textColor: 'warning.700',
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
            <Car
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
const vehicleApiAdapter = createCrudPageAdapter(vehicleApi);
const VehiclePage: React.FC = () => {
  return (
    <CrudPage
      schema={vehicleSchema}
      apiAdapter={vehicleApiAdapter}
      breadcrumbs={[
        { label: i18n.t('erp.vehicle_page.k9'), href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: i18n.t('erp.vehicle_page.k10') },
      ]}
      headerContent={<VehicleStats />}
    />
  );
};
export default VehiclePage;
