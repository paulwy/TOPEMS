/**
 * 产能利用率分析页
 *
 * 使用 recharts LineChart 展示工作中心利用率趋势：
 * - 各工作中心利用率折线
 * - 目标利用率基准线
 * 数据使用内置 mock 数据。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Typography } from '@mui/material';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { apsApi } from '@/api/aps';
import type { Capacity } from '@/api/aps/types';
import { StatsPageTemplate } from '@/components/templates';
import type { StatCard } from '@/components/templates/StatsPageTemplate';
import { designTokens } from '@topems/tokens';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

const mockData = [
  { date: 'W1', wcA: 78, wcB: 65, wcC: 88 },
  { date: 'W2', wcA: 82, wcB: 70, wcC: 91 },
  { date: 'W3', wcA: 85, wcB: 75, wcC: 85 },
  { date: 'W4', wcA: 90, wcB: 80, wcC: 92 },
  { date: 'W5', wcA: 88, wcB: 85, wcC: 89 },
  { date: 'W6', wcA: 92, wcB: 78, wcC: 94 },
  { date: 'W7', wcA: 85, wcB: 82, wcC: 90 },
  { date: 'W8', wcA: 89, wcB: 88, wcC: 93 },
  { date: 'W9', wcA: 94, wcB: 90, wcC: 96 },
  { date: 'W10', wcA: 91, wcB: 85, wcC: 92 },
  { date: 'W11', wcA: 87, wcB: 83, wcC: 88 },
  { date: 'W12', wcA: 93, wcB: 89, wcC: 95 },
];

export default function CapacityUtilizationPage() {
  const { t } = useTranslation();

  useQuery({
    queryKey: ['aps', 'CapacityUtilizationPage'],
    queryFn: async () => {
      try {
        const res = await apsApi.listCapacities();
        const items = res?.data?.items ?? (Array.isArray(res?.data) ? res.data : []);
        const totalUsed = items.reduce<number>(
          (s, c: Capacity & { usedQty?: number; used?: number }) => s + (c.usedQty || c.used || 0),
          0
        );
        const totalCap = items.reduce<number>(
          (s, c: Capacity & { totalQty?: number; total?: number; capacity?: number }) =>
            s + (c.totalQty || c.total || c.capacity || 0),
          0
        );
        return {
          capacities: items,
          usedRatio: totalCap > 0 ? totalUsed / totalCap : 0,
        };
      } catch {
        return {};
      }
    },
  });

  const data = mockData;
  const avgUtilization = useMemo(() => {
    const allValues = data.flatMap((d) => [d.wcA, d.wcB, d.wcC]);
    return Math.round((allValues.reduce((s, v) => s + v, 0) / allValues.length) * 10) / 10;
  }, [data]);
  const maxUtilization = useMemo(() => {
    return Math.max(...data.flatMap((d) => [d.wcA, d.wcB, d.wcC]));
  }, [data]);
  const minUtilization = useMemo(() => {
    return Math.min(...data.flatMap((d) => [d.wcA, d.wcB, d.wcC]));
  }, [data]);

  const statCards: StatCard[] = [
    {
      id: 'avgUtilization',
      title: t('aps.capacity_utilization_page.k2'),
      value: avgUtilization,
      suffix: '%',
      icon: <Activity size={24} />,
      color: 'primary',
    },
    {
      id: 'maxUtilization',
      title: t('aps.capacity_utilization_page.k3'),
      value: maxUtilization,
      suffix: '%',
      icon: <TrendingUp size={24} />,
      color: 'success',
    },
    {
      id: 'minUtilization',
      title: t('aps.capacity_utilization_page.k4'),
      value: minUtilization,
      suffix: '%',
      icon: <TrendingDown size={24} />,
      color: 'warning',
    },
  ];

  return (
    <StatsPageTemplate
      title={t('aps.capacity_utilization_page.k0')}
      subtitle={t('pages.capacity_utilization_page.k0')}
      statCards={statCards}
      showStatCards={statCards.length > 0}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
    >
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {t('aps.capacity_utilization_page.k5')}
        </Typography>
        <Box sx={{ width: '100%', height: 340 }}>
          <ResponsiveContainer
            width='100%'
            height={340}
          >
            <LineChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='date'
                fontSize={11}
              />
              <YAxis
                domain={[50, 100]}
                unit='%'
                fontSize={11}
                label={{
                  value: t('aps.capacity_utilization_page.k6'),
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <Tooltip />
              <Legend />
              <ReferenceLine
                y={85}
                stroke={designTokens.colors.success.dark}
                strokeDasharray='4 4'
                label={t('aps.capacity_utilization_page.85_7')}
              />
              <Line
                type='monotone'
                dataKey='wcA'
                name={t('aps.capacity_utilization_page.a_8')}
                stroke={designTokens.colors.secondary.dark}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type='monotone'
                dataKey='wcB'
                name={t('aps.capacity_utilization_page.b_9')}
                stroke={designTokens.colors.warning.main}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type='monotone'
                dataKey='wcC'
                name={t('aps.capacity_utilization_page.c_10')}
                stroke={designTokens.colors.success.dark}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </StatsPageTemplate>
  );
}
