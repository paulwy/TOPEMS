import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { logger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { BI_PATHS } from '@/modules/bi/config';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Database,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
} from 'recharts';
import { fetchAnalyticsOverview, fetchModuleData } from '@/api/bi';
import { BIChartColors } from '@/components/charts/chartTheme';
import { type OrganizationFilterValue } from '@/components/ui/OrganizationFilter';
import { Box, Typography, Skeleton, Alert } from '@mui/material';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard as ChartCardType,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

const ModuleCard = ({
  id,
  name,
  icon,
  stats,
  trend,
  onSelect,
  color,
}: {
  id: string;
  name: string;
  icon: string;
  stats: Record<string, string | number>;
  trend: 'up' | 'down' | 'stable';
  onSelect: (id: string) => void;
  color: string;
}) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp sx={{ width: 16, height: 16, color: 'success.main' }} />;
    if (trend === 'down')
      return <TrendingDown sx={{ width: 16, height: 16, color: 'error.main' }} />;
    return <Minus sx={{ width: 16, height: 16, color: 'grey.400' }} />;
  };

  const getTrendValue = () => {
    if (trend === 'up') return '+12.5%';
    if (trend === 'down') return '-3.2%';
    return '0%';
  };

  const getTrendTextColor = () => {
    if (trend === 'up') return 'success.main';
    if (trend === 'down') return 'error.main';
    return 'grey.400';
  };

  return (
    <Box
      onClick={() => onSelect(id)}
      sx={{
        position: 'relative',
        bgcolor: 'background.paper',
        borderRadius: 3,
        boxShadow: 1,
        border: '1px solid',
        borderColor: 'divider',
        p: 3,
        cursor: 'pointer',
        transition: 'all 0.3s',
        overflow: 'hidden',
        '&:hover': {
          boxShadow: 2,
          borderColor: 'grey.300',
          transform: 'scale(1.02)',
        },
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 96,
          height: 96,
          opacity: 0.05,
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            background: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
            borderRadius: '50%',
            filter: 'blur(48px)',
            transform: 'translate(32px, -32px)',
          }}
        />
      </Box>

      <Box sx={{ position: 'relative', zIndex: 10 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant='h4'>{icon}</Typography>
            <Box>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, color: 'grey.900' }}
              >
                {name}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mt: 0.25,
                }}
              >
                {getTrendIcon()}
                <Typography
                  variant='caption'
                  sx={{
                    fontWeight: 500,
                    color: getTrendTextColor(),
                  }}
                >
                  {getTrendValue()}
                </Typography>
              </Box>
            </Box>
          </Box>
          <ArrowRight
            sx={{
              width: 20,
              height: 20,
              color: 'grey.300',
              transition: 'all 0.3s',
              '.group:hover &': {
                color: 'grey.500',
                transform: 'translateX(4px)',
              },
            }}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          {Object.entries(stats)
            .slice(0, 3)
            .map(([key, value]) => (
              <Box
                key={key}
                sx={{ textAlign: 'center' }}
              >
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 700, color: 'grey.900' }}
                >
                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                </Typography>
                <Typography
                  variant='caption'
                  sx={{ color: 'grey.500', mt: 0.25 }}
                >
                  {key}
                </Typography>
              </Box>
            ))}
        </Box>
      </Box>
    </Box>
  );
};

interface ModuleInfo {
  id: string;
  name: string;
  icon: string;
  stats: Record<string, string | number>;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

const moduleConfigs: Omit<ModuleInfo, 'stats' | 'trend'>[] = [
  {
    id: 'development',
    name: '研发管理',
    icon: '🔬',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'quality',
    name: '质量管理',
    icon: '✅',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'production',
    name: '生产数据',
    icon: '🏭',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'laboratory',
    name: '实验室',
    icon: '🧪',
    color: 'from-violet-500 to-purple-500',
  },
  {
    id: 'ehs',
    name: '安全环保',
    icon: '🛡️',
    color: 'from-rose-500 to-pink-500',
  },
  {
    id: 'srm',
    name: '供应链',
    icon: '📦',
    color: 'from-cyan-500 to-blue-500',
  },
];

const BIAnalyticsPage = () => {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const overviewQuery = useQuery<{
    overview: any;
    modulesData: Record<string, any>;
  }>({
    queryKey: ['bi-analytics-overview'],
    queryFn: async () => {
      const res = await fetchAnalyticsOverview();
      const overview = res.success && res.data ? res.data : null;

      const modulePromises = moduleConfigs.map(async (mod) => {
        try {
          const moduleRes = await fetchModuleData(mod.id);
          if (moduleRes.success && moduleRes.data) {
            return { id: mod.id, data: moduleRes.data };
          }
          return { id: mod.id, data: null };
        } catch (e) {
          logger.error(`Failed to load module ${mod.id}:`, e);
          return { id: mod.id, data: null };
        }
      });

      const results = await Promise.all(modulePromises);
      const dataMap: Record<string, any> = {};
      results.forEach((r) => {
        dataMap[r.id] = r.data;
      });

      return { overview, modulesData: dataMap };
    },
    staleTime: 5 * 60 * 1000,
  });

  const overview = overviewQuery.data?.overview ?? null;
  const modulesData = overviewQuery.data?.modulesData ?? {};
  const loading = overviewQuery.isLoading;

  useEffect(() => {
    if (overviewQuery.isError) {
      logger.error('Failed to load analytics:', overviewQuery.error);
      setError(t('bi.bi_analytics_page.fail'));
    } else {
      setError(null);
    }
  }, [overviewQuery.isError, overviewQuery.error]);

  const handleRefresh = useCallback(() => {
    overviewQuery.refetch();
  }, [overviewQuery]);

  const getModuleStats = (moduleId: string): Record<string, string | number> => {
    const data = modulesData[moduleId];
    if (!data) {
      const fallbackStats: Record<string, Record<string, string | number>> = {
        development: { 项目总数: 120, 进行中: 45, 完成率: '85%' },
        quality: { 检验总数: 3250, 合格率: '97.8%', 待处理: 70 },
        production: { 批次总数: 450, 完成: 415, 效率: '92%' },
        laboratory: { 样品总数: 2450, 完成检验: 2150, 仪器使用率: '87.5%' },
        ehs: { 风险总数: 125, 高风险: 15, 安全事件: 18 },
        srm: { 供应商总数: 280, 合格: 220, 平均评分: 4.5 },
      };
      return fallbackStats[moduleId] || {};
    }

    const statsMap: Record<string, Record<string, string | number>> = {
      development: {
        项目总数: data.total_projects || 0,
        进行中: data.active_projects || 0,
        完成率: data.project_status_distribution
          ? `${Math.round(((data.project_status_distribution.completed || 0) / (data.total_projects || 1)) * 100)}%`
          : '0%',
      },
      quality: {
        检验总数: data.total_inspections || 0,
        合格率: data.pass_rate ? `${data.pass_rate}%` : '0%',
        待处理: data.failed_inspections || 0,
      },
      production: {
        批次总数: data.total_production_batches || 0,
        完成: data.completed_batches || 0,
        效率: data.production_efficiency ? `${data.production_efficiency}%` : '0%',
      },
      laboratory: {
        样品总数: data.total_samples || 0,
        完成检验: data.completed_tests || 0,
        仪器使用率: data.instrument_usage_rate ? `${data.instrument_usage_rate}%` : '0%',
      },
      ehs: {
        风险总数: data.total_risks || 0,
        高风险: data.high_risks || 0,
        安全事件: data.incidents || 0,
      },
      srm: {
        供应商总数: data.total_suppliers || 0,
        合格: data.qualified || 0,
        平均评分: data.avg_rating || 0,
      },
    };
    return statsMap[moduleId] || {};
  };

  const getModuleTrend = (moduleId: string): 'up' | 'down' | 'stable' => {
    const data = modulesData[moduleId];
    if (!data) {
      const fallbackTrends: Record<string, 'up' | 'down' | 'stable'> = {
        development: 'up',
        quality: 'up',
        production: 'stable',
        laboratory: 'up',
        ehs: 'down',
        srm: 'up',
      };
      return fallbackTrends[moduleId] || 'stable';
    }
    return data.trend || 'stable';
  };

  const modules: ModuleInfo[] = moduleConfigs.map((config) => ({
    ...config,
    stats: getModuleStats(config.id),
    trend: getModuleTrend(config.id),
  }));

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100', p: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Skeleton sx={{ height: 32, width: 128, mb: 1 }} />
              <Skeleton sx={{ height: 16, width: 96 }} />
            </Box>
          </Box>
          <Skeleton sx={{ height: 64, width: '100%', borderRadius: 3 }} />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(1, 1fr)',
                lg: 'repeat(3, 1fr)',
              },
              gap: 3,
            }}
          >
            <Skeleton
              sx={{
                gridColumn: { lg: 'span 2' },
                height: 320,
                borderRadius: 3,
              }}
            />
            <Skeleton sx={{ height: 320, borderRadius: 3 }} />
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(1, 1fr)',
                md: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton
                key={i}
                sx={{ height: 160, borderRadius: 3 }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  const fallbackChartData = modules.map((m) => ({
    name: m.name,
    value: (Object.values(m.stats)[0] as number) || 0,
  }));

  const handleModuleSelect = (moduleId: string) => {
    navigate(BI_PATHS.module.replace(':moduleId', moduleId));
  };

  // 构建统计数据卡片
  const statsCards: StatCard[] = [
    {
      id: 'total-projects',
      title: t('bi.bi_analytics_page.text_3ea3ec'),
      value: overview?.total_projects || 120,
      change: 12.5,
      changeLabel: t('bi.bi_analytics_page.last_month'),
      icon: <BarChart3 size={24} />,
      color: 'primary',
      onClick: () => navigate(BI_PATHS.module.replace(':moduleId', 'development')),
    },
    {
      id: 'total-samples',
      title: t('bi.bi_analytics_page.text_14078c'),
      value: overview?.total_samples || 2450,
      change: 8.3,
      changeLabel: t('bi.bi_analytics_page.last_month'),
      icon: <Database size={24} />,
      color: 'info',
      onClick: () => navigate(BI_PATHS.module.replace(':moduleId', 'laboratory')),
    },
    {
      id: 'pass-rate',
      title: t('bi.bi_analytics_page.pass_rate'),
      value: overview?.pass_rate || '97.8',
      unit: '%',
      change: 0.5,
      changeLabel: t('bi.bi_analytics_page.last_month'),
      icon: <CheckCircle size={24} />,
      color: 'success',
    },
    {
      id: 'active-risks',
      title: t('bi.bi_analytics_page.text_b77979'),
      value: overview?.active_risks || 15,
      change: -3.2,
      changeLabel: t('bi.bi_analytics_page.last_month'),
      icon: <AlertCircle size={24} />,
      color: 'warning',
      onClick: () => navigate(BI_PATHS.module.replace(':moduleId', 'ehs')),
    },
  ];

  // 构建图表数据
  const chartData = overview?.chartData || fallbackChartData;

  // 构建图表卡片
  const chartCards: ChartCardType[] = [
    {
      id: 'module-bar-chart',
      title: t('bi.bi_analytics_page.text_7057af'),
      subtitle: t('bi.bi_analytics_page.text_f9e510'),
      chart: (
        <ResponsiveContainer
          width='100%'
          height='100%'
          minWidth={0}
          minHeight={0}
        >
          <BarChart data={chartData}>
            <CartesianGrid
              strokeDasharray='3 3'
              stroke={ct.border.default}
            />
            <XAxis
              dataKey='name'
              tick={{ fill: ct.text.secondary, fontSize: 12 }}
            />
            <YAxis tick={{ fill: ct.text.secondary, fontSize: 12 }} />
            <Tooltip />
            <Bar
              dataKey='value'
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((_entry: { name: string; value: number }, index: number) => (
                <rect
                  key={`cell-${index}`}
                  fill={BIChartColors.series[index % BIChartColors.series.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ),
      height: 300,
      type: 'bar',
      onRefresh: handleRefresh,
    },
    {
      id: 'module-pie-chart',
      title: t('bi.bi_analytics_page.text_c7dd9d'),
      subtitle: t('bi.bi_analytics_page.text_ab0b07'),
      chart: (
        <ResponsiveContainer
          width='100%'
          height='100%'
          minWidth={0}
          minHeight={0}
        >
          <RechartsPieChart>
            <Pie
              data={chartData}
              cx='50%'
              cy='50%'
              labelLine={false}
              label={({ name, percent }: { name?: string; percent?: number }) =>
                `${name ?? ''} ${((percent || 0) * 100).toFixed(0)}%`
              }
              outerRadius={80}
              innerRadius={50}
              dataKey='value'
            >
              {chartData.map((_entry: { name: string; value: number }, index: number) => (
                <rect
                  key={`cell-${index}`}
                  fill={BIChartColors.series[index % BIChartColors.series.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </RechartsPieChart>
        </ResponsiveContainer>
      ),
      height: 300,
      type: 'pie',
      onRefresh: handleRefresh,
    },
  ];

  return (
    <PageContainer
      title={t('bi.bi_analytics_page.text_9cfb27')}
      subtitle={t('bi.bi_analytics_page.text_1ca74a')}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('bi.bi_analytics_page.home'), href: '/dashboard' },
          { label: 'BI' },
          { label: t('bi.bi_analytics_page.text_c93998') },
        ]}
        stats={statsCards}
        charts={chartCards}
        loading={loading}
        onRefresh={handleRefresh}
      >
        {error && (
          <Alert
            severity='error'
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        )}

        {/* 模块卡片列表 */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
            gap: 2,
            mb: 3,
          }}
        >
          {modules.map((module) => (
            <ModuleCard
              key={module.id}
              id={module.id}
              name={module.name}
              icon={module.icon}
              stats={module.stats}
              trend={module.trend}
              onSelect={handleModuleSelect}
              color={module.color}
            />
          ))}
        </Box>

        {/* 系统状态 */}
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 1,
            border: '1px solid',
            borderColor: 'divider',
            p: 3,
          }}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, color: 'grey.800', mb: 2 }}
          >
            系统状态
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(1, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 3,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1.5,
              }}
            >
              <Typography
                variant='body2'
                sx={{ color: 'grey.600' }}
              >
                数据更新时间
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, color: 'grey.900' }}
              >
                {new Date().toLocaleString('zh-CN')}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1.5,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant='body2'
                sx={{ color: 'grey.600' }}
              >
                系统状态
              </Typography>
              <Typography
                variant='caption'
                sx={{
                  px: 1.25,
                  py: 0.5,
                  bgcolor: 'success.50',
                  color: 'success.main',
                  fontWeight: 600,
                  borderRadius: 1,
                }}
              >
                正常运行
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1.5,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant='body2'
                sx={{ color: 'grey.600' }}
              >
                数据源连接
              </Typography>
              <Typography
                variant='caption'
                sx={{
                  px: 1.25,
                  py: 0.5,
                  bgcolor: 'success.50',
                  color: 'success.main',
                  fontWeight: 600,
                  borderRadius: 1,
                }}
              >
                已连接
              </Typography>
            </Box>
          </Box>
        </Box>
      </DashboardTemplate>
    </PageContainer>
  );
};

export default BIAnalyticsPage;
