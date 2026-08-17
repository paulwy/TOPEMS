import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { BarChart3, Table as TableIcon, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import i18n from '@/i18n';
import { ExportButton } from '@/components/export';
import { logger } from '@/utils/logger';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard as ChartCardType,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import {
  fetchRsSummary,
  fetchLimsSummary,
  fetchQmsSummary,
  fetchEhsSummary,
  fetchSrmSummary,
  fetchPdmSummary,
  fetchRsProjectTimeline,
  fetchLimsSampleTimeline,
  fetchQmsQualityTrend,
  fetchEhsIncidentTrend,
  fetchSrmOrderTimeline,
  fetchPdmProductionTrend,
} from '@/api/bi';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';
import { BIChartColors } from '@/components/charts/chartTheme';
import { designTokens } from '@/theme/tokens';
import { BI_PATHS } from '@/modules/bi/config';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;
const moduleConfig: Record<string, { name: string; icon: string; color: string }> = {
  rs: { name: i18n.t('bi.bi_module_detail_page.k0'), icon: '🔬', color: 'primary.main' },
  lims: { name: i18n.t('bi.bi_module_detail_page.k1'), icon: '🧪', color: 'success.main' },
  qms: { name: i18n.t('bi.bi_module_detail_page.k2'), icon: '✅', color: 'warning.main' },
  ehs: { name: i18n.t('bi.bi_module_detail_page.k3'), icon: '🛡️', color: 'error.main' },
  srm: { name: i18n.t('bi.bi_module_detail_page.k4'), icon: '📦', color: 'secondary.main' },
  pdm: { name: i18n.t('bi.bi_module_detail_page.k5'), icon: '🏭', color: ct.cyan.main },
};
interface ModuleData {
  summary: Record<string, number | string>;
  timeline: Array<{ month: string; count: number }>;
  distribution: Array<{ name: string; value: number }>;
  detailTable: Array<Record<string, string | number>>;
}
const getFallbackData = (moduleId: string): ModuleData => {
  const fallbackData: Record<string, ModuleData> = {
    rs: {
      summary: {
        total_projects: 120,
        active_projects: 45,
        completed_projects: 75,
        avg_duration: 45.5,
      },
      timeline: [
        { month: i18n.t('pages.bi_module_detail_page.1_0'), count: 25 },
        { month: i18n.t('pages.bi_module_detail_page.2_1'), count: 30 },
        { month: i18n.t('pages.bi_module_detail_page.3_2'), count: 28 },
        { month: i18n.t('pages.bi_module_detail_page.4_3'), count: 35 },
        { month: i18n.t('pages.bi_module_detail_page.5_4'), count: 42 },
        { month: i18n.t('pages.bi_module_detail_page.6_5'), count: 38 },
      ],
      distribution: [
        { name: i18n.t('bi.bi_module_detail_page.k6'), value: 60 },
        { name: i18n.t('bi.bi_module_detail_page.k7'), value: 30 },
        { name: i18n.t('bi.bi_module_detail_page.k8'), value: 10 },
      ],
      detailTable: [],
    },
    lims: {
      summary: {
        total_samples: 2450,
        completed_tests: 2150,
        pending_tests: 180,
        avg_turnaround: 48,
      },
      timeline: [
        { month: i18n.t('pages.bi_module_detail_page.1_6'), count: 420 },
        { month: i18n.t('pages.bi_module_detail_page.2_7'), count: 380 },
        { month: i18n.t('pages.bi_module_detail_page.3_8'), count: 450 },
        { month: i18n.t('pages.bi_module_detail_page.4_9'), count: 520 },
        { month: i18n.t('pages.bi_module_detail_page.5_10'), count: 480 },
        { month: i18n.t('pages.bi_module_detail_page.6_11'), count: 550 },
      ],
      distribution: [
        { name: i18n.t('bi.bi_module_detail_page.k9'), value: 40 },
        { name: i18n.t('bi.bi_module_detail_page.k10'), value: 30 },
        { name: i18n.t('bi.bi_module_detail_page.k11'), value: 20 },
        { name: i18n.t('bi.bi_module_detail_page.k12'), value: 10 },
      ],
      detailTable: [],
    },
    qms: {
      summary: {
        total_inspections: 3250,
        passed: 3180,
        failed: 70,
        pass_rate: 97.8,
      },
      timeline: [
        { month: i18n.t('pages.bi_module_detail_page.1_12'), count: 520 },
        { month: i18n.t('pages.bi_module_detail_page.2_13'), count: 480 },
        { month: i18n.t('pages.bi_module_detail_page.3_14'), count: 550 },
        { month: i18n.t('pages.bi_module_detail_page.4_15'), count: 620 },
        { month: i18n.t('pages.bi_module_detail_page.5_16'), count: 580 },
        { month: i18n.t('pages.bi_module_detail_page.6_17'), count: 650 },
      ],
      distribution: [
        { name: i18n.t('bi.bi_module_detail_page.k13'), value: 97.8 },
        { name: i18n.t('bi.bi_module_detail_page.k14'), value: 2.2 },
      ],
      detailTable: [],
    },
    ehs: {
      summary: {
        total_risks: 125,
        high_risks: 15,
        incidents: 18,
        resolved: 110,
      },
      timeline: [
        { month: i18n.t('pages.bi_module_detail_page.1_18'), count: 15 },
        { month: i18n.t('pages.bi_module_detail_page.2_19'), count: 12 },
        { month: i18n.t('pages.bi_module_detail_page.3_20'), count: 18 },
        { month: i18n.t('pages.bi_module_detail_page.4_21'), count: 8 },
        { month: i18n.t('pages.bi_module_detail_page.5_22'), count: 10 },
        { month: i18n.t('pages.bi_module_detail_page.6_23'), count: 15 },
      ],
      distribution: [
        { name: i18n.t('bi.bi_module_detail_page.k15'), value: 15 },
        { name: i18n.t('bi.bi_module_detail_page.k16'), value: 45 },
        { name: i18n.t('bi.bi_module_detail_page.k17'), value: 65 },
      ],
      detailTable: [],
    },
    srm: {
      summary: {
        total_suppliers: 280,
        qualified: 220,
        avg_rating: 4.5,
        pending_orders: 35,
      },
      timeline: [
        { month: i18n.t('pages.bi_module_detail_page.1_24'), count: 220 },
        { month: i18n.t('pages.bi_module_detail_page.2_25'), count: 235 },
        { month: i18n.t('pages.bi_module_detail_page.3_26'), count: 240 },
        { month: i18n.t('pages.bi_module_detail_page.4_27'), count: 245 },
        { month: i18n.t('pages.bi_module_detail_page.5_28'), count: 250 },
        { month: i18n.t('pages.bi_module_detail_page.6_29'), count: 280 },
      ],
      distribution: [
        { name: i18n.t('bi.bi_module_detail_page.k18'), value: 220 },
        { name: i18n.t('bi.bi_module_detail_page.k19'), value: 45 },
        { name: i18n.t('bi.bi_module_detail_page.k20'), value: 15 },
      ],
      detailTable: [],
    },
    pdm: {
      summary: {
        total_batches: 450,
        completed: 415,
        in_progress: 28,
        efficiency: 92.5,
      },
      timeline: [
        { month: i18n.t('pages.bi_module_detail_page.1_30'), count: 1850 },
        { month: i18n.t('pages.bi_module_detail_page.2_31'), count: 2100 },
        { month: i18n.t('pages.bi_module_detail_page.3_32'), count: 1980 },
        { month: i18n.t('pages.bi_module_detail_page.4_33'), count: 2350 },
        { month: i18n.t('pages.bi_module_detail_page.5_34'), count: 2200 },
        { month: i18n.t('pages.bi_module_detail_page.6_35'), count: 2420 },
      ],
      distribution: [
        { name: i18n.t('bi.bi_module_detail_page.k21'), value: 415 },
        { name: i18n.t('bi.bi_module_detail_page.k22'), value: 28 },
        { name: i18n.t('bi.bi_module_detail_page.k23'), value: 7 },
      ],
      detailTable: [],
    },
  };
  return fallbackData[moduleId] || fallbackData.rs;
};
const moduleApiMap: Record<
  string,
  {
    summary: () => Promise<any>;
    timeline?: () => Promise<any>;
    distribution?: () => Promise<any>;
  }
> = {
  rs: {
    summary: fetchRsSummary,
    timeline: fetchRsProjectTimeline,
  },
  lims: {
    summary: fetchLimsSummary,
    timeline: fetchLimsSampleTimeline,
  },
  qms: {
    summary: fetchQmsSummary,
    timeline: fetchQmsQualityTrend,
  },
  ehs: {
    summary: fetchEhsSummary,
    timeline: fetchEhsIncidentTrend,
  },
  srm: {
    summary: fetchSrmSummary,
    timeline: fetchSrmOrderTimeline,
  },
  pdm: {
    summary: fetchPdmSummary,
    timeline: fetchPdmProductionTrend,
  },
};
const summaryLabels: Record<string, string> = {
  total_projects: i18n.t('bi.bi_module_detail_page.k24'),
  active_projects: i18n.t('bi.bi_module_detail_page.k25'),
  completed_projects: i18n.t('bi.bi_module_detail_page.k26'),
  avg_duration: i18n.t('bi.bi_module_detail_page.k27'),
  total_samples: i18n.t('bi.bi_module_detail_page.k28'),
  completed_tests: i18n.t('bi.bi_module_detail_page.k29'),
  pending_tests: i18n.t('bi.bi_module_detail_page.k30'),
  avg_turnaround: i18n.t('bi.bi_module_detail_page.k31'),
  total_inspections: i18n.t('bi.bi_module_detail_page.k32'),
  passed: i18n.t('bi.bi_module_detail_page.k33'),
  failed: i18n.t('bi.bi_module_detail_page.k34'),
  pass_rate: i18n.t('bi.bi_module_detail_page.k35'),
  total_risks: i18n.t('bi.bi_module_detail_page.k36'),
  high_risks: i18n.t('bi.bi_module_detail_page.k37'),
  incidents: i18n.t('bi.bi_module_detail_page.k38'),
  resolved: i18n.t('bi.bi_module_detail_page.k39'),
  total_suppliers: i18n.t('bi.bi_module_detail_page.k40'),
  qualified: i18n.t('bi.bi_module_detail_page.k41'),
  avg_rating: i18n.t('bi.bi_module_detail_page.k42'),
  pending_orders: i18n.t('bi.bi_module_detail_page.k43'),
  total_batches: i18n.t('bi.bi_module_detail_page.k44'),
  completed: i18n.t('bi.bi_module_detail_page.k45'),
  in_progress: i18n.t('bi.bi_module_detail_page.k46'),
  efficiency: i18n.t('bi.bi_module_detail_page.k47'),
};
const BIModuleDetailPage = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const config = moduleConfig[moduleId || 'rs'] || {
    name: i18n.t('bi.bi_module_detail_page.text_912fa5'),
    icon: '📊',
    color: 'grey.500',
  };
  const moduleDataQuery = useQuery<ModuleData>({
    queryKey: [...QUERY_KEYS.AD_HOC.BI_MODULE_DETAIL_BASE, moduleId || 'rs'],
    queryFn: async () => {
      const modId = moduleId || 'rs';
      const fallback = getFallbackData(modId);
      const apiConfig = moduleApiMap[modId];
      if (!apiConfig) {
        return fallback;
      }
      let summaryData: Record<string, number | string> | null = null;
      let timelineData: Array<{ month: string; count: number }> = fallback.timeline;
      let distributionData: Array<{ name: string; value: number }> = fallback.distribution;
      try {
        const summaryRes = await apiConfig.summary();
        if (summaryRes.success && summaryRes.data) {
          summaryData = summaryRes.data;
        }
      } catch (e) {
        logger.error(`Failed to load ${modId} summary:`, e);
      }
      if (apiConfig.timeline) {
        try {
          const timelineRes = await apiConfig.timeline();
          if (timelineRes.success && timelineRes.data) {
            const timelineItems = timelineRes.data.items || timelineRes.data || [];
            if (Array.isArray(timelineItems) && timelineItems.length > 0) {
              timelineData = timelineItems.map(
                (
                  item: { month?: string; date?: string; count?: number; value?: number },
                  index: number
                ) => ({
                  month:
                    item.month ||
                    item.date ||
                    `${index + 1}${i18n.t('pages.bi_module_detail_page.k36')}`,
                  count: item.count || item.value || 0,
                })
              );
            }
          }
        } catch (e) {
          logger.error(`Failed to load ${modId} timeline:`, e);
        }
      }
      const summary = summaryData || fallback.summary;
      if (modId === 'rs' && summaryData?.project_type_distribution) {
        distributionData = Object.entries(summaryData.project_type_distribution).map(
          ([key, value]) => ({
            name:
              key === 'research'
                ? i18n.t('bi.bi_module_detail_page.text_fc7393')
                : key === 'development'
                  ? i18n.t('bi.bi_module_detail_page.text_3ff3c3')
                  : key === 'improvement'
                    ? i18n.t('bi.bi_module_detail_page.text_50b419')
                    : key,
            value: value as number,
          })
        );
      } else if (modId === 'lims' && summaryData?.test_type_distribution) {
        distributionData = Object.entries(summaryData.test_type_distribution).map(
          ([key, value]) => ({
            name:
              key === 'chemical'
                ? i18n.t('bi.bi_module_detail_page.inspection')
                : key === 'physical'
                  ? i18n.t('bi.bi_module_detail_page.inspection_1')
                  : key === 'microbiological'
                    ? i18n.t('bi.bi_module_detail_page.inspection_2')
                    : i18n.t('bi.bi_module_detail_page.other'),
            value: value as number,
          })
        );
      } else if (modId === 'qms' && summaryData?.defect_types) {
        distributionData = Object.entries(summaryData.defect_types).map(([key, value]) => ({
          name:
            key === 'material'
              ? i18n.t('bi.bi_module_detail_page.text_ebc9d9')
              : key === 'process'
                ? i18n.t('bi.bi_module_detail_page.process_route')
                : key === 'equipment'
                  ? i18n.t('bi.bi_module_detail_page.equipment')
                  : i18n.t('bi.bi_module_detail_page.other'),
          value: value as number,
        }));
      } else if (modId === 'ehs' && summaryData?.risk_distribution) {
        distributionData = Object.entries(summaryData.risk_distribution).map(([key, value]) => ({
          name:
            key === 'high'
              ? i18n.t('bi.bi_module_detail_page.text_4433e7')
              : key === 'medium'
                ? i18n.t('bi.bi_module_detail_page.text_8a8992')
                : i18n.t('bi.bi_module_detail_page.text_b56976'),
          value: value as number,
        }));
      } else if (modId === 'pdm' && summaryData?.product_line_usage) {
        distributionData = Object.entries(summaryData.product_line_usage).map(([key, value]) => ({
          name: key,
          value: value as number,
        }));
      }
      return {
        summary,
        timeline: timelineData,
        distribution: distributionData,
        detailTable: [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });
  const moduleData = moduleDataQuery.data ?? null;
  const loading = moduleDataQuery.isLoading;
  useEffect(() => {
    if (moduleDataQuery.isError) {
      logger.error('Failed to load module data:', moduleDataQuery.error);
      setError(i18n.t('bi.bi_module_detail_page.fail'));
    } else {
      setError(null);
    }
  }, [moduleDataQuery.isError, moduleDataQuery.error]);
  const handleRefresh = useCallback(() => {
    moduleDataQuery.refetch();
  }, [moduleDataQuery]);
  const exportData = moduleData?.detailTable || [];
  const statsCards: StatCard[] = moduleData?.summary
    ? Object.entries(moduleData.summary)
        .slice(0, 4)
        .map(([key, value]) => ({
          id: key,
          title: summaryLabels[key] || key,
          value:
            typeof value === 'number'
              ? key.includes('rate') || key.includes('efficiency')
                ? `${value}%`
                : value
              : value,
          icon:
            key.includes('rate') || key.includes('pass') ? (
              <CheckCircle size={24} />
            ) : key.includes('risk') || key.includes('high') ? (
              <AlertCircle size={24} />
            ) : (
              <BarChart3 size={24} />
            ),
          color: config.color as StatCard['color'],
        }))
    : [];
  const timelineChartData = moduleData?.timeline || [];
  const distributionChartData = moduleData?.distribution || [];
  const chartCards: ChartCardType[] = [
    {
      id: 'timeline-chart',
      title: i18n.t('bi.bi_module_detail_page.text_a819e1'),
      subtitle: i18n.t('bi.bi_module_detail_page.text_8268d9'),
      chart: (
        <ResponsiveContainer
          width='100%'
          height='100%'
          minWidth={0}
          minHeight={0}
        >
          <RechartsLineChart data={timelineChartData}>
            <CartesianGrid
              strokeDasharray='3 3'
              stroke={ct.border.default}
            />
            <XAxis
              dataKey='month'
              tick={{ fill: ct.text.secondary, fontSize: isMobile ? 10 : 12 }}
            />
            <YAxis tick={{ fill: ct.text.secondary, fontSize: isMobile ? 10 : 12 }} />
            <Tooltip />
            <Line
              type='monotone'
              dataKey='count'
              stroke={config.color}
              strokeWidth={2}
              dot={{ fill: config.color, r: isMobile ? 3 : 4 }}
              activeDot={{ r: isMobile ? 5 : 6 }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      ),
      height: isMobile ? 250 : 300,
      type: 'line',
      onRefresh: handleRefresh,
    },
    {
      id: 'distribution-chart',
      title: i18n.t('bi.bi_module_detail_page.text_772b34'),
      subtitle: i18n.t('bi.bi_module_detail_page.text_c9454d'),
      chart: (
        <ResponsiveContainer
          width='100%'
          height='100%'
          minWidth={0}
          minHeight={0}
        >
          <RechartsPieChart>
            <Pie
              data={distributionChartData}
              cx='50%'
              cy='50%'
              labelLine={!isMobile}
              label={
                !isMobile
                  ? ({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''} ${((percent || 0) * 100).toFixed(0)}%`
                  : undefined
              }
              outerRadius={isMobile ? 60 : 80}
              innerRadius={isMobile ? 35 : 50}
              dataKey='value'
            >
              {distributionChartData.map(
                (_entry: { name: string; value: number }, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={BIChartColors.series[index % BIChartColors.series.length]}
                  />
                )
              )}
            </Pie>
            <Tooltip />
          </RechartsPieChart>
        </ResponsiveContainer>
      ),
      height: isMobile ? 250 : 300,
      type: 'pie',
      onRefresh: handleRefresh,
    },
  ];
  if (loading) {
    return (
      <PageContainer
        title={i18n.t('bi.bi_module_detail_page.detail')}
        subtitle={i18n.t('bi.bi_module_detail_page.text_b5cd64')}
        padding={false}
        maxWidth={false}
      >
        <DashboardTemplate
          title=''
          subtitle=''
          breadcrumbs={[
            { label: i18n.t('bi.bi_module_detail_page.home'), href: '/dashboard' },
            { label: 'BI', href: BI_PATHS.analytics },
            { label: config.name },
          ]}
          loading={true}
        />
      </PageContainer>
    );
  }
  return (
    <PageContainer
      title={`${config.name}${i18n.t('pages.bi_module_detail_page.k37')}`}
      subtitle={i18n.t('bi.bi_module_detail_page.text_b5cd64')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: i18n.t('bi.bi_module_detail_page.home'), href: '/dashboard' },
          { label: 'BI', href: BI_PATHS.analytics },
          { label: config.name },
        ]}
        stats={statsCards}
        charts={chartCards}
        loading={loading}
        onRefresh={handleRefresh}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            mb: 2,
          }}
        >
          <Typography
            variant='body2'
            color='text.secondary'
          >
            <Clock size={14} /> {i18n.t('bi.bi_module_detail_page.k0')}:{' '}
            {new Date().toLocaleString(i18n.language === 'zh' ? 'zh-CN' : 'en-US')}
          </Typography>
          <ExportButton
            data={exportData}
            columns={
              moduleId === 'rs'
                ? ['id', 'project', 'status', 'progress', 'owner']
                : moduleId === 'lims'
                  ? ['id', 'sample', 'type', 'status', 'result']
                  : moduleId === 'qms'
                    ? ['id', 'inspection', 'batch', 'status', 'quality']
                    : moduleId === 'ehs'
                      ? ['id', 'risk', 'level', 'status', 'date']
                      : moduleId === 'srm'
                        ? ['id', 'supplier', 'type', 'rating', 'status']
                        : ['id', 'batch', 'product', 'status', 'output']
            }
            filename={`bi-${moduleId}-detail`}
          />
        </Box>
        {error && (
          <Alert
            severity='warning'
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        )}
        <Card>
          <CardHeader
            title={i18n.t('bi.bi_module_detail_page.text_615db0')}
            subheader={i18n.t('bi.bi_module_detail_page.text_e6af8d')}
            avatar={<TableIcon size={20} />}
          />
          <CardContent>
            <Box sx={{ overflow: 'auto' }}>
              <Table size={isMobile ? 'small' : 'medium'}>
                <TableHead>
                  <TableRow>
                    {moduleId === 'rs' && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k48')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k49')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k50')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k51')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k52')}
                        </TableCell>
                      </>
                    )}
                    {moduleId === 'lims' && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k53')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k54')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k55')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k56')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k57')}
                        </TableCell>
                      </>
                    )}
                    {moduleId === 'qms' && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k58')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k59')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k60')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k61')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k62')}
                        </TableCell>
                      </>
                    )}
                    {moduleId === 'ehs' && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k63')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k64')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k65')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k66')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k67')}
                        </TableCell>
                      </>
                    )}
                    {moduleId === 'srm' && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k68')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k69')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k70')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k71')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k72')}
                        </TableCell>
                      </>
                    )}
                    {moduleId === 'pdm' && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k73')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k74')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k75')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {i18n.t('bi.bi_module_detail_page.k76')}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {moduleData?.detailTable.map((row, index) => (
                    <TableRow
                      key={index}
                      hover
                    >
                      {Object.values(row).map((cell, cellIndex) => (
                        <TableCell
                          key={cellIndex}
                          sx={{ fontSize: isMobile ? 12 : 14 }}
                        >
                          {typeof cell === 'number' ? cell.toLocaleString() : cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>
      </DashboardTemplate>
    </PageContainer>
  );
};
export default BIModuleDetailPage;
