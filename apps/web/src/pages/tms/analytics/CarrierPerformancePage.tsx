import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';
/**
 * 承运商绩效分析页
 *
 * 使用 recharts BarChart 展示各承运商的配送统计对比：
 * - 总运单数、准时送达数、破损数
 * 数据为 mock 数据。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { tmsApi } from '@/api/tms';
import { StatsPageTemplate } from '@/components/templates';
import type { StatCard } from '@/components/templates/StatsPageTemplate';
import { Box, Paper, Typography } from '@mui/material';
import { Truck, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

function getMockData() {
  return [
    {
      carrier: i18n.t('tms.carrier_performance_page.k0'),
      totalShipments: 320,
      onTime: 285,
      damaged: 5,
    },
    {
      carrier: i18n.t('tms.carrier_performance_page.k1'),
      totalShipments: 280,
      onTime: 240,
      damaged: 8,
    },
    {
      carrier: i18n.t('tms.carrier_performance_page.k2'),
      totalShipments: 350,
      onTime: 320,
      damaged: 3,
    },
    {
      carrier: i18n.t('tms.carrier_performance_page.k3'),
      totalShipments: 410,
      onTime: 370,
      damaged: 6,
    },
    {
      carrier: i18n.t('tms.carrier_performance_page.k4'),
      totalShipments: 260,
      onTime: 225,
      damaged: 4,
    },
    {
      carrier: i18n.t('tms.carrier_performance_page.k5'),
      totalShipments: 300,
      onTime: 265,
      damaged: 7,
    },
    {
      carrier: i18n.t('tms.carrier_performance_page.k6'),
      totalShipments: 240,
      onTime: 210,
      damaged: 9,
    },
  ];
}

export default function CarrierPerformancePage() {
  const { t } = useTranslation();

  useQuery({
    queryKey: ['tms', 'CarrierPerformancePage'],
    queryFn: async () => {
      try {
        const res = await tmsApi.listCarriers();
        const data = (res as { data?: unknown })?.data;
        const items = Array.isArray(data)
          ? data
          : Array.isArray((data as { items?: unknown[] })?.items)
            ? (data as { items: unknown[] }).items
            : [];
        const totalShipments = items.reduce(
          (s: number, x: unknown) =>
            s + ((x as { total_shipments?: number })?.total_shipments ?? 0),
          0
        );
        const onTime = items.reduce(
          (s: number, x: unknown) => s + ((x as { on_time?: number })?.on_time ?? 0),
          0
        );
        const damaged = items.reduce(
          (s: number, x: unknown) => s + ((x as { damaged?: number })?.damaged ?? 0),
          0
        );
        const pending = items.filter(
          (x: unknown) => (x as { status?: string })?.status === 'PENDING'
        ).length;
        const active = items.filter(
          (x: unknown) => (x as { status?: string })?.status === 'ACTIVE'
        ).length;
        return {
          total: items.length,
          totalShipments,
          onTime,
          damaged,
          pending,
          active,
        };
      } catch {
        return {};
      }
    },
  });

  const data = useMemo(
    () =>
      getMockData().map((d) => ({
        ...d,
        onTimeRate:
          d.totalShipments > 0 ? Math.round((d.onTime / d.totalShipments) * 1000) / 10 : 0,
        damageRate:
          d.totalShipments > 0 ? Math.round((d.damaged / d.totalShipments) * 1000) / 10 : 0,
      })),
    []
  );

  const totalShipments = data.reduce((s, d) => s + d.totalShipments, 0);
  const totalOnTime = data.reduce((s, d) => s + d.onTime, 0);
  const totalDamaged = data.reduce((s, d) => s + d.damaged, 0);
  const avgOnTimeRate =
    totalShipments > 0 ? Math.round((totalOnTime / totalShipments) * 1000) / 10 : 0;

  const statCards: StatCard[] = [
    {
      id: 'totalShipments',
      title: t('tms.carrier_performance_page.k9'),
      value: totalShipments,
      icon: <Truck size={24} />,
      color: 'primary',
    },
    {
      id: 'totalOnTime',
      title: t('tms.carrier_performance_page.k10'),
      value: totalOnTime,
      icon: <CheckCircle size={24} />,
      color: 'success',
    },
    {
      id: 'totalDamaged',
      title: t('tms.carrier_performance_page.k11'),
      value: totalDamaged,
      icon: <AlertTriangle size={24} />,
      color: 'error',
    },
    {
      id: 'avgOnTimeRate',
      title: t('tms.carrier_performance_page.k12'),
      value: `${avgOnTimeRate}%`,
      icon: <TrendingUp size={24} />,
      color: 'warning',
    },
  ];

  return (
    <StatsPageTemplate
      title={t('tms.carrier_performance_page.k7')}
      subtitle={t('tms.carrier_performance_page.k8')}
      statCards={statCards}
      showStatCards={statCards.length > 0}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
    >
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {t('tms.carrier_performance_page.k13')}
        </Typography>
        <Box sx={{ width: '100%', height: 340 }}>
          <ResponsiveContainer
            width='100%'
            height='100%'
          >
            <BarChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='carrier'
                fontSize={11}
              />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey='totalShipments'
                name={t('tms.carrier_performance_page.k14')}
                fill={designTokens.colors.primary.main}
                barSize={20}
              />
              <Bar
                dataKey='onTime'
                name={t('tms.carrier_performance_page.k15')}
                fill={designTokens.colors.success.dark}
                barSize={20}
              />
              <Bar
                dataKey='damaged'
                name={t('tms.carrier_performance_page.k16')}
                fill={designTokens.colors.error.main}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {t('tms.carrier_performance_page.k17')}
        </Typography>
        <Box sx={{ width: '100%', height: 240 }}>
          <ResponsiveContainer
            width='100%'
            height='100%'
          >
            <BarChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='carrier'
                fontSize={11}
              />
              <YAxis
                unit='%'
                fontSize={11}
              />
              <Tooltip formatter={(value: unknown) => `${value}%`} />
              <Legend />
              <Bar
                dataKey='onTimeRate'
                name={t('tms.carrier_performance_page.k18')}
                fill={designTokens.colors.success.dark}
                barSize={20}
              />
              <Bar
                dataKey='damageRate'
                name={t('tms.carrier_performance_page.k19')}
                fill={designTokens.colors.warning.main}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </StatsPageTemplate>
  );
}
