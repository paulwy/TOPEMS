/**
 * 车辆管理页面 — Schema 驱动的 CRUD 页面
 */

import React from 'react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { vehicleSchema } from '@/schemas/erp/vehicle';
import { vehicleApi } from '@/api/erp';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { Car } from 'lucide-react';

const VehicleStats: React.FC = () => {
  const { data } = useQuery({
    queryKey: [QUERY_KEYS.ERP.VEHICLES, 'stats'],
    queryFn: async () => {
      const response = await vehicleApi.list({ page: 0, pagesize: 1000 });
      if (!response.success) throw new Error('加载车辆统计失败');
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
    { label: '车辆总数', value: total, color: 'secondary[100]', textColor: 'secondary.700' },
    { label: '可用', value: available, color: 'success.lighter', textColor: 'success.700' },
    { label: '使用中', value: inUse, color: 'info.lighter', textColor: 'info.700' },
    { label: '维护中', value: maintenance, color: 'warning.light', textColor: 'warning.700' },
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

const vehicleApiAdapter: CrudApiAdapter = {
  list: async (params) => {
    const response = await vehicleApi.list({
      page: params?.page,
      pagesize: params?.pageSize,
      search: params?.search,
      status: params?.status as string | undefined,
      vehicle_type: params?.vehicle_type as string | undefined,
    });
    if (!response.success) {
      throw new Error('加载车辆失败');
    }
    const data = response.data;
    return {
      data: (data?.items || []) as unknown as Record<string, unknown>[],
      total: data?.total || 0,
    };
  },

  create: async (data) => {
    const response = await vehicleApi.create(data as Parameters<typeof vehicleApi.create>[0]);
    if (!response.success) {
      throw new Error('创建车辆失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  update: async (id, data) => {
    const response = await vehicleApi.update(id, data as Parameters<typeof vehicleApi.update>[1]);
    if (!response.success) {
      throw new Error('更新车辆失败');
    }
    return response.data as unknown as Record<string, unknown>;
  },

  delete: async (id) => {
    const response = await vehicleApi.delete(id);
    if (!response.success) {
      throw new Error('删除车辆失败');
    }
  },
};

const VehiclePage: React.FC = () => {
  return (
    <CrudPage
      schema={vehicleSchema}
      apiAdapter={vehicleApiAdapter}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: 'ERP', href: '/erp' },
        { label: '车辆管理' },
      ]}
      headerContent={<VehicleStats />}
    />
  );
};

export default VehiclePage;
