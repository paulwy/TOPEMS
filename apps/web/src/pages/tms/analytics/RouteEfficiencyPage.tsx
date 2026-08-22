import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
/**
 * 路线效率分析页
 *
 * 使用 recharts BarChart 展示各路线的成本与时间分析：
 * - 平均运输时长（小时）
 * - 单位成本（元/公里）
 * 数据为 mock 数据。
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tmsApi } from '@/api/tms';
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
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { Box, Paper, Typography } from '@mui/material';
import { Clock, DollarSign, Navigation, MapPin } from 'lucide-react';

function getMockData() {
  return [
    {
      route: i18n.t('pages.route_efficiency_page.k0'),
      distance: 1213,
      avgHours: 14.5,
      costPerKm: 8.2,
      totalTrips: 85,
    },
    {
      route: i18n.t('pages.route_efficiency_page.k1'),
      distance: 140,
      avgHours: 2.0,
      costPerKm: 6.5,
      totalTrips: 120,
    },
    {
      route: i18n.t('pages.route_efficiency_page.k2'),
      distance: 308,
      avgHours: 4.0,
      costPerKm: 7.1,
      totalTrips: 95,
    },
    {
      route: i18n.t('pages.route_efficiency_page.k3'),
      distance: 352,
      avgHours: 4.5,
      costPerKm: 6.8,
      totalTrips: 78,
    },
    {
      route: i18n.t('pages.route_efficiency_page.k4'),
      distance: 511,
      avgHours: 6.5,
      costPerKm: 7.5,
      totalTrips: 62,
    },
    {
      route: i18n.t('pages.route_efficiency_page.k5'),
      distance: 276,
      avgHours: 3.5,
      costPerKm: 6.9,
      totalTrips: 88,
    },
    {
      route: i18n.t('pages.route_efficiency_page.k6'),
      distance: 325,
      avgHours: 4.2,
      costPerKm: 7.3,
      totalTrips: 70,
    },
    {
      route: i18n.t('pages.route_efficiency_page.k7'),
      distance: 392,
      avgHours: 5.0,
      costPerKm: 7.8,
      totalTrips: 55,
    },
  ];
}

export default function RouteEfficiencyPage() {
  const { t } = useTranslation();

  useQuery({
    queryKey: ['tms', 'RouteEfficiencyPage'],
    queryFn: async () => {
      try {
        const res = await tmsApi.listRoutes();
        const data = (res as { data?: unknown })?.data;
        const items = Array.isArray(data)
          ? data
          : Array.isArray((data as { items?: unknown[] })?.items)
            ? (data as { items: unknown[] }).items
            : [];
        const distances = items
          .map((x: unknown) => (x as { distance?: number })?.distance)
          .filter((v: unknown): v is number => typeof v === 'number' && !isNaN(v));
        const avgDistance =
          distances.length > 0 ? distances.reduce((s, d) => s + d, 0) / distances.length : 0;
        const totalTrips = items.reduce(
          (s: number, x: unknown) => s + ((x as { total_trips?: number })?.total_trips ?? 0),
          0
        );
        return {
          total: items.length,
          avgDistance,
          totalTrips,
        };
      } catch {
        return {};
      }
    },
  });

  const data = useMemo(() => getMockData(), []);

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
      value: totalDistance,
      suffix: 'km',
      icon: <MapPin size={24} />,
      color: 'primary',
    },
  ];

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
