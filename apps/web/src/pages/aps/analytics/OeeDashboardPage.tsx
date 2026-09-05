/**
 * OEE 综合设备效率仪表盘
 *
 * 使用 recharts 展示 OEE 及其三大构成指标：
 * - 可用率（Availability）
 * - 性能率（Performance）
 * - 质量率（Quality）
 * - OEE = Availability × Performance × Quality
 * 数据使用内置 mock 数据。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Typography, Chip } from '@mui/material';
import { Gauge, Zap, Activity, CheckCircle } from 'lucide-react';
import { mesApi } from '@/api/mes';
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

const mockData = [
  { workCenter: 'WC-A', availability: 88, performance: 92, quality: 96 },
  { workCenter: 'WC-B', availability: 82, performance: 85, quality: 94 },
  { workCenter: 'WC-C', availability: 90, performance: 88, quality: 98 },
  { workCenter: 'WC-D', availability: 75, performance: 80, quality: 92 },
  { workCenter: 'WC-E', availability: 85, performance: 90, quality: 95 },
  { workCenter: 'WC-F', availability: 92, performance: 94, quality: 99 },
];

export default function OeeDashboardPage() {
  const { t } = useTranslation();

  useQuery({
    queryKey: ['aps', 'OeeDashboardPage'],
    queryFn: async () => {
      try {
        const mesApiWithOee = mesApi as {
          equipmentOee?: { list?: () => Promise<unknown> };
        };
        const res = await (typeof mesApiWithOee.equipmentOee?.list === 'function'
          ? (mesApi as { equipmentOee: { list: () => Promise<unknown> } }).equipmentOee.list()
          : Promise.resolve({ data: { records: [] } }));
        const data = (res as { data?: unknown })?.data;
        const items = Array.isArray(data)
          ? data
          : Array.isArray((data as { records?: unknown[] })?.records)
            ? (data as { records: unknown[] }).records
            : Array.isArray((data as { items?: unknown[] })?.items)
              ? (data as { items: unknown[] }).items
              : [];
        return { oeeRecords: items };
      } catch {
        return {};
      }
    },
  });

  const oeeData = useMemo(() => {
    return mockData.map((d) => ({
      ...d,
      oee: Number(((d.availability * d.performance * d.quality) / 10000).toFixed(1)),
    }));
  }, []);
  const avgOee = useMemo(() => {
    const sum = oeeData.reduce((s, d) => s + d.oee, 0);
    return Number((sum / oeeData.length).toFixed(1));
  }, [oeeData]);
  const avgAvailability = useMemo(() => {
    return Number((oeeData.reduce((s, d) => s + d.availability, 0) / oeeData.length).toFixed(1));
  }, [oeeData]);
  const avgPerformance = useMemo(() => {
    return Number((oeeData.reduce((s, d) => s + d.performance, 0) / oeeData.length).toFixed(1));
  }, [oeeData]);
  const avgQuality = useMemo(() => {
    return Number((oeeData.reduce((s, d) => s + d.quality, 0) / oeeData.length).toFixed(1));
  }, [oeeData]);
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
            {t('aps.oee_dashboard_page.oee_7')}
          </Typography>
          <Box sx={{ width: '100%', height: 300 }}>
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
                  unit='%'
                  fontSize={11}
                />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey='availability'
                  name={t('aps.oee_dashboard_page.k8')}
                  fill={designTokens.colors.secondary.dark}
                />
                <Bar
                  dataKey='performance'
                  name={t('aps.oee_dashboard_page.k9')}
                  fill={designTokens.colors.warning.main}
                />
                <Bar
                  dataKey='quality'
                  name={t('aps.oee_dashboard_page.k10')}
                  fill={designTokens.colors.success.dark}
                />
                <Bar
                  dataKey='oee'
                  name='OEE'
                  fill={designTokens.colors.error.main}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Box>
    </StatsPageTemplate>
  );
}
