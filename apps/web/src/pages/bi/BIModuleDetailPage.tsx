import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  RefreshCw,
  Download,
  BarChart3,
  PieChart,
  LineChart,
  Table as TableIcon,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Skeleton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Alert,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Grid } from '@/components';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import { ExportButton } from '@/components/export';
import { apiLogger, logger } from '@/utils/logger';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard as ChartCardType,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import {
  fetchModuleData,
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

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const moduleConfig: Record<string, { name: string; icon: string; color: string }> = {
  rs: { name: '研发管理', icon: '🔬', color: 'primary.main' },
  lims: { name: '实验室管理', icon: '🧪', color: 'success.main' },
  qms: { name: '质量管理', icon: '✅', color: 'warning.main' },
  ehs: { name: '安全环保', icon: '🛡️', color: 'error.main' },
  srm: { name: '供应链管理', icon: '📦', color: 'secondary.main' },
  pdm: { name: '生产数据', icon: '🏭', color: ct.cyan.main },
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
        { month: '1月', count: 25 },
        { month: '2月', count: 30 },
        { month: '3月', count: 28 },
        { month: '4月', count: 35 },
        { month: '5月', count: 42 },
        { month: '6月', count: 38 },
      ],
      distribution: [
        { name: '研发', value: 60 },
        { name: '改进', value: 30 },
        { name: '创新', value: 10 },
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
        { month: '1月', count: 420 },
        { month: '2月', count: 380 },
        { month: '3月', count: 450 },
        { month: '4月', count: 520 },
        { month: '5月', count: 480 },
        { month: '6月', count: 550 },
      ],
      distribution: [
        { name: '化学检验', value: 40 },
        { name: '物理检验', value: 30 },
        { name: '微生物检验', value: 20 },
        { name: '其他', value: 10 },
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
        { month: '1月', count: 520 },
        { month: '2月', count: 480 },
        { month: '3月', count: 550 },
        { month: '4月', count: 620 },
        { month: '5月', count: 580 },
        { month: '6月', count: 650 },
      ],
      distribution: [
        { name: '合格', value: 97.8 },
        { name: '不合格', value: 2.2 },
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
        { month: '1月', count: 15 },
        { month: '2月', count: 12 },
        { month: '3月', count: 18 },
        { month: '4月', count: 8 },
        { month: '5月', count: 10 },
        { month: '6月', count: 15 },
      ],
      distribution: [
        { name: '高风险', value: 15 },
        { name: '中风险', value: 45 },
        { name: '低风险', value: 65 },
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
        { month: '1月', count: 220 },
        { month: '2月', count: 235 },
        { month: '3月', count: 240 },
        { month: '4月', count: 245 },
        { month: '5月', count: 250 },
        { month: '6月', count: 280 },
      ],
      distribution: [
        { name: '合格', value: 220 },
        { name: '待审核', value: 45 },
        { name: '不合格', value: 15 },
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
        { month: '1月', count: 1850 },
        { month: '2月', count: 2100 },
        { month: '3月', count: 1980 },
        { month: '4月', count: 2350 },
        { month: '5月', count: 2200 },
        { month: '6月', count: 2420 },
      ],
      distribution: [
        { name: '已完成', value: 415 },
        { name: '进行中', value: 28 },
        { name: '已取消', value: 7 },
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
  total_projects: '项目总数',
  active_projects: '进行中',
  completed_projects: '已完成',
  avg_duration: '平均周期(天)',
  total_samples: '样品总数',
  completed_tests: '完成检验',
  pending_tests: '待检验',
  avg_turnaround: '平均周期(小时)',
  total_inspections: '检验总数',
  passed: '合格数',
  failed: '不合格数',
  pass_rate: '合格率(%)',
  total_risks: '风险总数',
  high_risks: '高风险',
  incidents: '安全事件',
  resolved: '已解决',
  total_suppliers: '供应商总数',
  qualified: '合格供应商',
  avg_rating: '平均评分',
  pending_orders: '待处理订单',
  total_batches: '批次总数',
  completed: '已完成',
  in_progress: '进行中',
  efficiency: '效率(%)',
};

const BIModuleDetailPage = () => {
  const { t } = useTranslation();
  const { moduleId } = useParams<{ moduleId: string }>();
  const [error, setError] = useState<string | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const config = moduleConfig[moduleId || 'rs'] || {
    name: t('bi.bi_module_detail_page.text_912fa5'),
    icon: '📊',
    color: 'grey.500',
  };

  const moduleDataQuery = useQuery<ModuleData>({
    queryKey: ['bi-module-detail', moduleId || 'rs'],
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
                  month: item.month || item.date || `${index + 1}月`,
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
                ? t('bi.bi_module_detail_page.text_fc7393')
                : key === 'development'
                  ? t('bi.bi_module_detail_page.text_3ff3c3')
                  : key === 'improvement'
                    ? t('bi.bi_module_detail_page.text_50b419')
                    : key,
            value: value as number,
          })
        );
      } else if (modId === 'lims' && summaryData?.test_type_distribution) {
        distributionData = Object.entries(summaryData.test_type_distribution).map(
          ([key, value]) => ({
            name:
              key === 'chemical'
                ? t('bi.bi_module_detail_page.inspection')
                : key === 'physical'
                  ? t('bi.bi_module_detail_page.inspection_1')
                  : key === 'microbiological'
                    ? t('bi.bi_module_detail_page.inspection_2')
                    : t('bi.bi_module_detail_page.other'),
            value: value as number,
          })
        );
      } else if (modId === 'qms' && summaryData?.defect_types) {
        distributionData = Object.entries(summaryData.defect_types).map(([key, value]) => ({
          name:
            key === 'material'
              ? t('bi.bi_module_detail_page.text_ebc9d9')
              : key === 'process'
                ? t('bi.bi_module_detail_page.process_route')
                : key === 'equipment'
                  ? t('bi.bi_module_detail_page.equipment')
                  : t('bi.bi_module_detail_page.other'),
          value: value as number,
        }));
      } else if (modId === 'ehs' && summaryData?.risk_distribution) {
        distributionData = Object.entries(summaryData.risk_distribution).map(([key, value]) => ({
          name: key === 'high' ? t('bi.bi_module_detail_page.text_4433e7') : key === 'medium' ? t('bi.bi_module_detail_page.text_8a8992') : t('bi.bi_module_detail_page.text_b56976'),
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
      setError(t('bi.bi_module_detail_page.fail'));
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
      title: t('bi.bi_module_detail_page.text_a819e1'),
      subtitle: t('bi.bi_module_detail_page.text_8268d9'),
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
      title: t('bi.bi_module_detail_page.text_772b34'),
      subtitle: t('bi.bi_module_detail_page.text_c9454d'),
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
                (entry: { name: string; value: number }, index: number) => (
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
        title={t('bi.bi_module_detail_page.detail')}
        subtitle={t('bi.bi_module_detail_page.text_b5cd64')}
        padding={false}
        maxWidth={false}
      >
        <DashboardTemplate
          title=''
          subtitle=''
          breadcrumbs={[
            { label: t('bi.bi_module_detail_page.home'), href: '/dashboard' },
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
      title={`${config.name} - 模块详情`}
      subtitle={t('bi.bi_module_detail_page.text_b5cd64')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('bi.bi_module_detail_page.home'), href: '/dashboard' },
          { label: 'BI', href: BI_PATHS.analytics },
          { label: config.name },
        ]}
        stats={statsCards}
        charts={chartCards}
        loading={loading}
        onRefresh={handleRefresh}
        headerContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              <Clock size={14} /> 最后更新: {new Date().toLocaleString('zh-CN')}
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
        }
      >
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
            title={t('bi.bi_module_detail_page.text_615db0')}
            subheader={t('bi.bi_module_detail_page.text_e6af8d')}
            avatar={<TableIcon size={20} />}
          />
          <CardContent>
            <Box sx={{ overflow: 'auto' }}>
              <Table size={isMobile ? 'small' : 'medium'}>
                <TableHead>
                  <TableRow>
                    {moduleId === 'rs' && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>项目编号</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>项目名称</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>进度</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>负责人</TableCell>
                      </>
                    )}
                    {moduleId === 'lims' && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>样品编号</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>样品名称</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>检验类型</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>结果</TableCell>
                      </>
                    )}
                    {moduleId === 'qms' && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>检验单号</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>检验项目</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>批次</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>质量等级</TableCell>
                      </>
                    )}
                    {moduleId === 'ehs' && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>风险编号</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>风险描述</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>风险等级</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>处理状态</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>日期</TableCell>
                      </>
                    )}
                    {moduleId === 'srm' && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>供应商编号</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>供应商名称</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>评分</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                      </>
                    )}
                    {moduleId === 'pdm' && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>批次编号</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>产品</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>产量</TableCell>
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
