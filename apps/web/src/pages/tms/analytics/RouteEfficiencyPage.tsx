import { designTokens } from '@topems/tokens';
/**
 * 路线效率分析页
 *
 * 使用 recharts BarChart 和 ScatterChart 展示各路线的效率对比：
 * - 平均时长、每公里成本、距离、总行程数
 * 数据来自后端 /tms/analytics/route-efficiency API。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { tmsAnalyticsApi } from '@/api/tms';
import type { RouteEfficiencyItem } from '@/api/tms';
import { StatsPageTemplate } from '@/components/templates';
import type { StatCard } from '@/components/templates/StatsPageTemplate';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { Clock, DollarSign, Navigation, MapPin } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

export default function RouteEfficiencyPage() {
  const { t } = useTranslation();

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['tms', 'routeEfficiency'],
    queryFn: async () => {
      const res = await tmsAnalyticsApi.getRouteEfficiency();
      return (res?.data ?? []) as RouteEfficiencyItem[];
    },
  });

  const data = useMemo(
    () =>
      (apiData ?? []).map((d) => ({
        route: d.route_name,
        distance: Math.round(d.distance_km * 10) / 10,
        avgHours: Math.round(d.estimated_hours * 10) / 10,
        costPerKm: Math.round(d.cost_per_km * 100) / 100,
        totalTrips: d.total_trips,
      })),
    [apiData]
  );

  const avgHours =
    data.length > 0
      ? Math.round((data.reduce((s, d) => s + d.avgHours, 0) / data.length) * 10) / 10
      : 0;
  const avgCostPerKm =
    data.length > 0
      ? Math.round((data.reduce((s, d) => s + d.costPerKm, 0) / data.length) * 100) / 100
      : 0;
  const totalTrips = data.reduce((s, d) => s + d.totalTrips, 0);
  const totalDistance = data.reduce((s, d) => s + d.distance, 0);

  const statCards: StatCard[] = [
    {
      id: 'avgHours',
      title: t('pages.route_efficiency_page.k10'),
      value: avgHours,
      suffix: 'h',
      icon: <Clock size={24} />,
      color: 'info',
    },
    {
      id: 'avgCostPerKm',
      title: t('pages.route_efficiency_page.k11'),
      value: avgCostPerKm,
      prefix: '¥',
      suffix: '/km',
      icon: <DollarSign size={24} />,
      color: 'warning',
    },
    {
      id: 'totalTrips',
      title: t('pages.route_efficiency_page.k12'),
      value: totalTrips,
      icon: <Navigation size={24} />,
      color: 'success',
    },
    {
      id: 'totalDistance',
      title: t('pages.route_efficiency_page.k13'),
      value: Math.round(totalDistance),
      suffix: 'km',
      icon: <MapPin size={24} />,
      color: 'primary',
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
      title={t('pages.route_efficiency_page.k8')}
      subtitle={t('pages.route_efficiency_page.k9')}
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
            {t('pages.route_efficiency_page.k14')}
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
                dataKey='route'
                fontSize={11}
              />
              <YAxis
                yAxisId='left'
                fontSize={11}
                unit='h'
              />
              <YAxis
                yAxisId='right'
                orientation='right'
                fontSize={11}
                unit='/km'
              />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId='left'
                dataKey='avgHours'
                name={t('pages.route_efficiency_page.h_15')}
                fill={designTokens.colors.primary.main}
                barSize={20}
              />
              <Bar
                yAxisId='right'
                dataKey='costPerKm'
                name={t('pages.route_efficiency_page.km_0')}
                fill={designTokens.colors.warning.main}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('pages.route_efficiency_page.k16')}
          </Typography>
          <ResponsiveContainer
            width='100%'
            height={300}
          >
            <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                type='number'
                dataKey='distance'
                name={t('pages.route_efficiency_page.k17')}
                unit='km'
                fontSize={11}
              />
              <YAxis
                type='number'
                dataKey='totalTrips'
                name={t('pages.route_efficiency_page.k18')}
                fontSize={11}
              />
              <ZAxis
                type='number'
                dataKey='avgHours'
                name={t('pages.route_efficiency_page.k19')}
                unit='h'
                range={[60, 400]}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter
                name={t('pages.route_efficiency_page.k20')}
                data={data}
                fill={designTokens.colors.secondary.dark}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </Paper>
      </Box>
    </StatsPageTemplate>
  );
}
