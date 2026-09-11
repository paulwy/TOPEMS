/**
 * OEE 综合设备效率仪表盘
 *
 * 使用 recharts 展示 OEE 及其三大构成指标：
 * - 可用率（Availability）
 * - 性能率（Performance）
 * - 质量率（Quality）
 * - OEE = Availability × Performance × Quality
 * 数据来自 MES 后端聚合 API。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Typography, Chip, CircularProgress } from '@mui/material';
import { Gauge, Zap, Activity, CheckCircle } from 'lucide-react';
import { mesAnalyticsApi } from '@/api/mes/analytics';
import type { OeeDashboardResponse } from '@/api/mes/analytics';
import { StatsPageTemplate } from '@/components/templates';
import type { StatCard, DataTable, TableColumn } from '@/components/templates/StatsPageTemplate';
import { designTokens } from '@topems/tokens';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PolarAngleAxis,
} from 'recharts';

export default function OeeDashboardPage() {
  const { t } = useTranslation();

  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['aps', 'oeeDashboard'],
    queryFn: async () => {
      const res = await mesAnalyticsApi.getOeeDashboard({ days: 7 });
      return res as OeeDashboardResponse;
    },
  });

  const apiData = apiResponse;

  const oeeData = useMemo(() => {
    const equipmentList = apiData?.by_equipment ?? [];
    return equipmentList.map((item) => ({
      workCenter: item.equipment_name,
      availability: Math.round(item.availability * 10) / 10,
      performance: Math.round(item.performance * 10) / 10,
      quality: Math.round(item.quality_rate * 10) / 10,
      oee: Math.round(item.oee * 10) / 10,
    }));
  }, [apiData]);

  const avgOee = useMemo(() => {
    if (apiData?.avg_oee !== undefined) return Math.round(apiData.avg_oee * 10) / 10;
    if (oeeData.length === 0) return 0;
    const sum = oeeData.reduce((s, d) => s + d.oee, 0);
    return Number((sum / oeeData.length).toFixed(1));
  }, [apiData, oeeData]);

  const avgAvailability = useMemo(() => {
    if (apiData?.avg_availability !== undefined)
      return Math.round(apiData.avg_availability * 10) / 10;
    if (oeeData.length === 0) return 0;
    return Number((oeeData.reduce((s, d) => s + d.availability, 0) / oeeData.length).toFixed(1));
  }, [apiData, oeeData]);

  const avgPerformance = useMemo(() => {
    if (apiData?.avg_performance !== undefined)
      return Math.round(apiData.avg_performance * 10) / 10;
    if (oeeData.length === 0) return 0;
    return Number((oeeData.reduce((s, d) => s + d.performance, 0) / oeeData.length).toFixed(1));
  }, [apiData, oeeData]);

  const avgQuality = useMemo(() => {
    if (apiData?.avg_quality_rate !== undefined)
      return Math.round(apiData.avg_quality_rate * 10) / 10;
    if (oeeData.length === 0) return 0;
    return Number((oeeData.reduce((s, d) => s + d.quality, 0) / oeeData.length).toFixed(1));
  }, [apiData, oeeData]);

  const radialData = [
    {
      name: t('aps.oee_dashboard_page.k0'),
      value: avgAvailability,
      fill: designTokens.colors.secondary.dark,
    },
    {
      name: t('aps.oee_dashboard_page.k1'),
      value: avgPerformance,
      fill: designTokens.colors.warning.main,
    },
    {
      name: t('aps.oee_dashboard_page.k2'),
      value: avgQuality,
      fill: designTokens.colors.success.dark,
    },
    { name: 'OEE', value: avgOee, fill: designTokens.colors.error.main },
  ];

  const statCards: StatCard[] = [
    {
      id: 'avgOee',
      title: t('aps.oee_dashboard_page.oee_3'),
      value: avgOee,
      suffix: '%',
      icon: <Gauge size={24} />,
      color: 'error',
    },
    {
      id: 'avgAvailability',
      title: t('aps.oee_dashboard_page.k4'),
      value: avgAvailability,
      suffix: '%',
      icon: <Activity size={24} />,
      color: 'info',
    },
    {
      id: 'avgPerformance',
      title: t('aps.oee_dashboard_page.k5'),
      value: avgPerformance,
      suffix: '%',
      icon: <Zap size={24} />,
      color: 'warning',
    },
    {
      id: 'avgQuality',
      title: t('aps.oee_dashboard_page.k6'),
      value: avgQuality,
      suffix: '%',
      icon: <CheckCircle size={24} />,
      color: 'success',
    },
  ];

  const columns: TableColumn[] = [
    { id: 'workCenter', label: t('aps.oee_dashboard_page.k11'), field: 'workCenter' },
    {
      id: 'availability',
      label: t('aps.oee_dashboard_page.k12'),
      field: 'availability',
      render: (value) => `${value}%`,
    },
    {
      id: 'performance',
      label: t('aps.oee_dashboard_page.k13'),
      field: 'performance',
      render: (value) => `${value}%`,
    },
    {
      id: 'quality',
      label: t('aps.oee_dashboard_page.k14'),
      field: 'quality',
      render: (value) => `${value}%`,
    },
    {
      id: 'oee',
      label: 'OEE',
      field: 'oee',
      render: (value) => {
        const oee = Number(value);
        const color = oee >= 75 ? 'success' : oee >= 60 ? 'warning' : 'error';
        return (
          <Chip
            size='small'
            label={`${oee}%`}
            color={color}
          />
        );
      },
    },
  ];

  const tables: DataTable[] = [
    {
      id: 'oeeTable',
      title: t('aps:oee_dashboard_page.oee_0'),
      columns,
      data: oeeData.map((d) => ({ ...d })) as Record<string, unknown>[],
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
      title={t('aps:oee_dashboard_page.oee_2')}
      subtitle={t('pages.oee_dashboard_page.k0')}
      statCards={statCards}
      showStatCards={statCards.length > 0}
      tables={tables}
      showTables={tables.length > 0}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
          gap: 3,
          mb: 3,
        }}
      >
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('aps:oee_dashboard_page.oee_1')}
          </Typography>
          <Box sx={{ width: '100%', height: 300 }}>
            <ResponsiveContainer
              width='100%'
              height={300}
            >
              <RadialBarChart
                data={radialData}
                innerRadius='20%'
                outerRadius='100%'
                startAngle={180}
                endAngle={0}
              >
                <PolarAngleAxis
                  type='number'
                  domain={[0, 100]}
                  angleAxisId={0}
                />
                <RadialBar
                  background
                  dataKey='value'
                />
                <Legend />
                <Tooltip />
              </RadialBarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('aps.oee_dashboard_page.k10')}
          </Typography>
          <ResponsiveContainer
            width='100%'
            height={300}
          >
            <BarChart
              data={oeeData}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='workCenter'
                fontSize={11}
              />
              <YAxis
                domain={[0, 100]}
                fontSize={11}
              />
              <Tooltip formatter={(value: unknown) => `${value}%`} />
              <Legend />
              <Bar
                dataKey='availability'
                name={t('aps.oee_dashboard_page.k0')}
                fill={designTokens.colors.secondary.dark}
                barSize={12}
              />
              <Bar
                dataKey='performance'
                name={t('aps.oee_dashboard_page.k1')}
                fill={designTokens.colors.warning.main}
                barSize={12}
              />
              <Bar
                dataKey='quality'
                name={t('aps.oee_dashboard_page.k2')}
                fill={designTokens.colors.success.dark}
                barSize={12}
              />
              <Bar
                dataKey='oee'
                name='OEE'
                fill={designTokens.colors.error.main}
                barSize={12}
              />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Box>
    </StatsPageTemplate>
  );
}
