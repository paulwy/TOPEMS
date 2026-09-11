/**
 * 产能利用率分析页
 *
 * 使用 recharts LineChart 展示设备利用率趋势：
 * - 各设备利用率折线
 * - 目标利用率基准线
 * 数据来自 MES 后端聚合 API。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { mesAnalyticsApi } from '@/api/mes/analytics';
import type { CapacityUtilizationResponse } from '@/api/mes/analytics';
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

const LINE_COLORS = [
  designTokens.colors.secondary.dark,
  designTokens.colors.warning.main,
  designTokens.colors.success.dark,
  designTokens.colors.error.main,
  designTokens.colors.info.main,
  designTokens.colors.primary.main,
];

export default function CapacityUtilizationPage() {
  const { t } = useTranslation();

  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['aps', 'capacityUtilization'],
    queryFn: async () => {
      const res = await mesAnalyticsApi.getCapacityUtilization({ days: 7 });
      return res as CapacityUtilizationResponse;
    },
  });

  const apiData = apiResponse;

  const { chartData, equipmentList } = useMemo(() => {
    const heatmap = apiData?.heatmap ?? [];
    if (heatmap.length === 0) return { chartData: [], equipmentList: [] as string[] };

    // 获取所有设备列表
    const equipmentSet = new Set<string>();
    heatmap.forEach((item) => equipmentSet.add(item.equipment));
    const equipments = Array.from(equipmentSet);

    // 按日期分组，计算每个设备每天的平均利用率（跨班次）
    const dateMap = new Map<string, Map<string, number[]>>();
    heatmap.forEach((item) => {
      if (!dateMap.has(item.date)) {
        dateMap.set(item.date, new Map());
      }
      const equipMap = dateMap.get(item.date)!;
      if (!equipMap.has(item.equipment)) {
        equipMap.set(item.equipment, []);
      }
      equipMap.get(item.equipment)!.push(item.utilization);
    });

    // 转换为图表数据格式
    const dates = Array.from(dateMap.keys()).sort();
    const data = dates.map((date) => {
      const equipMap = dateMap.get(date)!;
      const row: Record<string, string | number> = { date };
      equipments.forEach((equip) => {
        const values = equipMap.get(equip) ?? [];
        const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
        row[equip] = Math.round(avg * 10) / 10;
      });
      return row;
    });

    return { chartData: data, equipmentList: equipments };
  }, [apiData]);

  const allUtilizations = useMemo(() => {
    return chartData.flatMap((row) =>
      equipmentList.map((equip) => Number(row[equip] ?? 0)).filter((v) => v > 0)
    );
  }, [chartData, equipmentList]);

  const avgUtilization = useMemo(() => {
    if (apiData?.avg_utilization !== undefined)
      return Math.round(apiData.avg_utilization * 10) / 10;
    if (allUtilizations.length === 0) return 0;
    return (
      Math.round((allUtilizations.reduce((s, v) => s + v, 0) / allUtilizations.length) * 10) / 10
    );
  }, [apiData, allUtilizations]);

  const maxUtilization = useMemo(() => {
    return allUtilizations.length > 0 ? Math.max(...allUtilizations) : 0;
  }, [allUtilizations]);

  const minUtilization = useMemo(() => {
    const positive = allUtilizations.filter((v) => v > 0);
    return positive.length > 0 ? Math.min(...positive) : 0;
  }, [allUtilizations]);

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
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='date'
                fontSize={11}
              />
              <YAxis
                domain={[0, 100]}
                unit='%'
                fontSize={11}
                label={{
                  value: t('aps.capacity_utilization_page.k6'),
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <Tooltip formatter={(value: unknown) => `${value}%`} />
              <Legend />
              <ReferenceLine
                y={85}
                stroke={designTokens.colors.success.dark}
                strokeDasharray='4 4'
                label={t('aps.capacity_utilization_page.85_7')}
              />
              {equipmentList.map((equip, index) => (
                <Line
                  key={equip}
                  type='monotone'
                  dataKey={equip}
                  name={equip}
                  stroke={LINE_COLORS[index % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </StatsPageTemplate>
  );
}
