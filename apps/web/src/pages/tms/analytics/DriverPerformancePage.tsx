import { designTokens } from '@topems/tokens';
/**
 * 司机绩效分析页
 *
 * 使用 recharts BarChart 展示各司机的配送统计对比：
 * - 完成率、总配送数、已完成数、平均运费
 * 数据来自后端 /tms/analytics/driver-performance API。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { tmsAnalyticsApi } from '@/api/tms';
import type { DriverPerformanceItem } from '@/api/tms';
import { StatsPageTemplate } from '@/components/templates';
import type { StatCard } from '@/components/templates/StatsPageTemplate';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { Truck, CheckCircle, User, Award } from 'lucide-react';
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

export default function DriverPerformancePage() {
  const { t } = useTranslation();

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['tms', 'driverPerformance'],
    queryFn: async () => {
      const res = await tmsAnalyticsApi.getDriverPerformance();
      return (res?.data ?? []) as DriverPerformanceItem[];
    },
  });

  const data = useMemo(
    () =>
      (apiData ?? []).map((d) => ({
        driver: d.driver_name,
        completionRate:
          d.total_deliveries > 0
            ? Math.round((d.completed_deliveries / d.total_deliveries) * 1000) / 10
            : 0,
        totalDeliveries: d.total_deliveries,
        completed: d.completed_deliveries,
        avgFreight: Math.round(d.avg_freight * 100) / 100,
      })),
    [apiData]
  );

  const avgCompletionRate =
    data.length > 0
      ? Math.round((data.reduce((s, d) => s + d.completionRate, 0) / data.length) * 10) / 10
      : 0;
  const totalDeliveries = data.reduce((s, d) => s + d.totalDeliveries, 0);
  const topPerformer = [...data].sort((a, b) => b.completionRate - a.completionRate)[0];

  const statCards: StatCard[] = [
    {
      id: 'avgCompletionRate',
      title: t('tms.driver_performance_page.k12'),
      value: `${avgCompletionRate}%`,
      icon: <Award size={24} />,
      color: 'success',
    },
    {
      id: 'totalDeliveries',
      title: t('tms.driver_performance_page.k13'),
      value: totalDeliveries,
      icon: <Truck size={24} />,
      color: 'primary',
    },
    {
      id: 'topPerformer',
      title: t('tms.driver_performance_page.k14'),
      value: topPerformer?.driver ?? '-',
      icon: <User size={24} />,
      color: 'warning',
    },
    {
      id: 'topPerformerRate',
      title: t('tms.driver_performance_page.k15'),
      value: `${topPerformer?.completionRate ?? 0}%`,
      icon: <CheckCircle size={24} />,
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
      title={t('tms.driver_performance_page.k10')}
      subtitle={t('tms.driver_performance_page.k11')}
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
          {t('tms.driver_performance_page.k16')}
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
                dataKey='driver'
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
                y={90}
                stroke={designTokens.colors.success.dark}
                strokeDasharray='4 4'
                label={t('tms.driver_performance_page.90_17')}
              />
              <Bar
                dataKey='completionRate'
                name={t('tms.driver_performance_page.k18')}
                fill={designTokens.colors.primary.main}
                barSize={28}
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
          {t('tms.driver_performance_page.k19')}
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
                dataKey='driver'
                fontSize={11}
              />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey='totalDeliveries'
                name={t('tms.driver_performance_page.k20')}
                fill={designTokens.colors.secondary.dark}
                barSize={20}
              />
              <Bar
                dataKey='completed'
                name={t('tms.driver_performance_page.k21')}
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
