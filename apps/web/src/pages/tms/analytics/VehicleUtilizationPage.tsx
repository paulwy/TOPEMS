import { designTokens } from '@topems/tokens';
/**
 * 车辆利用率分析页
 *
 * 使用 recharts BarChart 展示各车辆的使用率：
 * - 利用率（%）和运单数量
 * 数据来自后端 /tms/analytics/vehicle-utilization API。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { tmsAnalyticsApi } from '@/api/tms';
import type { VehicleUtilizationItem } from '@/api/tms';
import { StatsPageTemplate } from '@/components/templates';
import type { StatCard } from '@/components/templates/StatsPageTemplate';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { Gauge, Truck, TrendingUp, TrendingDown } from 'lucide-react';

export default function VehicleUtilizationPage() {
  const { t } = useTranslation();

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['tms', 'vehicleUtilization'],
    queryFn: async () => {
      const res = await tmsAnalyticsApi.getVehicleUtilization();
      return (res?.data ?? []) as VehicleUtilizationItem[];
    },
  });

  const data = useMemo(
    () =>
      (apiData ?? []).map((d) => ({
        vehicleNo: d.vehicle_no,
        utilization: d.utilization_rate,
        trips: d.shipment_count,
      })),
    [apiData]
  );

  const avgUtilization =
    data.length > 0
      ? Math.round((data.reduce((s, d) => s + d.utilization, 0) / data.length) * 10) / 10
      : 0;
  const totalTrips = data.reduce((s, d) => s + d.trips, 0);
  const maxUtil = data.length > 0 ? Math.max(...data.map((d) => d.utilization)) : 0;
  const minUtil = data.length > 0 ? Math.min(...data.map((d) => d.utilization)) : 0;

  const statCards: StatCard[] = [
    {
      id: 'avgUtilization',
      title: t('tms.vehicle_utilization_page.k2'),
      value: avgUtilization,
      suffix: '%',
      icon: <Gauge size={24} />,
      color: 'primary',
    },
    {
      id: 'totalTrips',
      title: t('tms.vehicle_utilization_page.k3'),
      value: totalTrips,
      icon: <Truck size={24} />,
      color: 'success',
    },
    {
      id: 'maxUtil',
      title: t('tms.vehicle_utilization_page.k4'),
      value: maxUtil,
      suffix: '%',
      icon: <TrendingUp size={24} />,
      color: 'warning',
    },
    {
      id: 'minUtil',
      title: t('tms.vehicle_utilization_page.k5'),
      value: minUtil,
      suffix: '%',
      icon: <TrendingDown size={24} />,
      color: 'error',
    },
  ];

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <StatsPageTemplate
      title={t('tms.vehicle_utilization_page.k0')}
      subtitle={t('tms.vehicle_utilization_page.k1')}
      statCards={statCards}
      showStatCards={statCards.length > 0}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('tms.vehicle_utilization_page.k6')}
          </Typography>
          <ResponsiveContainer
            width='100%'
            height={340}
          >
            <BarChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='vehicleNo'
                fontSize={11}
              />
              <YAxis
                domain={[0, 100]}
                unit='%'
                fontSize={11}
              />
              <Tooltip formatter={(value: unknown) => `${value}%`} />
              <Legend />
              <ReferenceLine
                y={80}
                stroke={designTokens.colors.success.dark}
                strokeDasharray='4 4'
                label={t('tms.vehicle_utilization_page.80_7')}
              />
              <Bar
                dataKey='utilization'
                name={t('tms.vehicle_utilization_page.k8')}
                fill={designTokens.colors.primary.main}
                barSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('tms.vehicle_utilization_page.k9')}
          </Typography>
          <ResponsiveContainer
            width='100%'
            height={240}
          >
            <BarChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='vehicleNo'
                fontSize={11}
              />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey='trips'
                name={t('tms.vehicle_utilization_page.k10')}
                fill={designTokens.colors.secondary.dark}
                barSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Box>
    </StatsPageTemplate>
  );
}
