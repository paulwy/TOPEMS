import { designTokens } from '@topems/tokens';
/**
 * 承运商绩效分析页
 *
 * 使用 recharts BarChart 展示各承运商的配送统计对比：
 * - 总运单数、已完成数、平均运费
 * 数据来自后端 /tms/analytics/carrier-performance API。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { tmsAnalyticsApi } from '@/api/tms';
import type { CarrierPerformanceItem } from '@/api/tms';
import { StatsPageTemplate } from '@/components/templates';
import type { StatCard } from '@/components/templates/StatsPageTemplate';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { Truck, CheckCircle, DollarSign, TrendingUp } from 'lucide-react';
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

export default function CarrierPerformancePage() {
  const { t } = useTranslation();

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['tms', 'carrierPerformance'],
    queryFn: async () => {
      const res = await tmsAnalyticsApi.getCarrierPerformance();
      return (res?.data ?? []) as CarrierPerformanceItem[];
    },
  });

  const data = useMemo(
    () =>
      (apiData ?? []).map((d) => ({
        carrier: d.carrier_name,
        totalShipments: d.total_shipments,
        completed: d.completed_shipments,
        avgFreight: Math.round(d.avg_freight * 100) / 100,
        completionRate:
          d.total_shipments > 0
            ? Math.round((d.completed_shipments / d.total_shipments) * 1000) / 10
            : 0,
      })),
    [apiData]
  );

  const totalShipments = data.reduce((s, d) => s + d.totalShipments, 0);
  const totalCompleted = data.reduce((s, d) => s + d.completed, 0);
  const totalFreight = (apiData ?? []).reduce((s, d) => s + d.total_freight, 0);
  const avgCompletionRate =
    totalShipments > 0 ? Math.round((totalCompleted / totalShipments) * 1000) / 10 : 0;

  const statCards: StatCard[] = [
    {
      id: 'totalShipments',
      title: t('tms.carrier_performance_page.k9'),
      value: totalShipments,
      icon: <Truck size={24} />,
      color: 'primary',
    },
    {
      id: 'totalCompleted',
      title: t('tms.carrier_performance_page.k10'),
      value: totalCompleted,
      icon: <CheckCircle size={24} />,
      color: 'success',
    },
    {
      id: 'totalFreight',
      title: t('tms.carrier_performance_page.k11'),
      value: `¥${Math.round(totalFreight).toLocaleString()}`,
      icon: <DollarSign size={24} />,
      color: 'warning',
    },
    {
      id: 'avgCompletionRate',
      title: t('tms.carrier_performance_page.k12'),
      value: `${avgCompletionRate}%`,
      icon: <TrendingUp size={24} />,
      color: 'info',
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
                dataKey='completed'
                name={t('tms.carrier_performance_page.k15')}
                fill={designTokens.colors.success.dark}
                barSize={20}
              />
              <Bar
                dataKey='avgFreight'
                name={t('tms.carrier_performance_page.k16')}
                fill={designTokens.colors.warning.main}
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
                dataKey='completionRate'
                name={t('tms.carrier_performance_page.k18')}
                fill={designTokens.colors.success.dark}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </StatsPageTemplate>
  );
}
