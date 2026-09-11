import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
/**
 * 运费成本分析页
 *
 * 使用 recharts PieChart 和 BarChart 展示运费成本：
 * - 成本结构饼图（示例数据，数据库暂无细分字段）
 * - 月度运费趋势图（真实数据，来自后端 API）
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tmsAnalyticsApi } from '@/api/tms';
import type { FreightCostTrendItem } from '@/api/tms';
import { StatsPageTemplate } from '@/components/templates';
import type { StatCard } from '@/components/templates/StatsPageTemplate';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Box, Paper, Typography, CircularProgress, Alert } from '@mui/material';
import { DollarSign, TrendingUp, Package, Layers } from 'lucide-react';

const COST_COLORS: Record<string, string> = {
  fuel: designTokens.colors.primary.main,
  toll: designTokens.colors.warning.main,
  labor: designTokens.colors.success.dark,
  depreciation: designTokens.colors.secondary.main,
  insurance: designTokens.colors.error.main,
  other: designTokens.colors.grey[500],
};

function getCostLabels(): Record<string, string> {
  return {
    fuel: i18n.t('tms.freight_cost_page.k0'),
    toll: i18n.t('tms.freight_cost_page.k1'),
    labor: i18n.t('tms.freight_cost_page.k2'),
    depreciation: i18n.t('tms.freight_cost_page.k3'),
    insurance: i18n.t('tms.freight_cost_page.k4'),
    other: i18n.t('tms.freight_cost_page.k5'),
  };
}

// 示例数据：成本结构（数据库暂无燃油费/路桥费等细分字段）
const MOCK_COST_DATA = [
  { type: 'fuel', amount: 185000 },
  { type: 'toll', amount: 92000 },
  { type: 'labor', amount: 156000 },
  { type: 'depreciation', amount: 78000 },
  { type: 'insurance', amount: 45000 },
  { type: 'other', amount: 34000 },
];

export default function FreightCostPage() {
  const { t } = useTranslation();

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['tms', 'freightCostTrend'],
    queryFn: async () => {
      const res = await tmsAnalyticsApi.getFreightCostTrend();
      return (res?.data ?? []) as FreightCostTrendItem[];
    },
  });

  const monthlyData = useMemo(
    () =>
      (apiData ?? []).map((d) => ({
        month: d.month,
        totalFreight: Math.round(d.total_freight),
        shipmentCount: d.shipment_count,
        avgFreight: Math.round(d.avg_freight),
      })),
    [apiData]
  );

  const costData = useMemo(
    () =>
      MOCK_COST_DATA.map((c) => ({
        ...c,
        label: getCostLabels()[c.type] ?? c.type,
      })),
    []
  );

  const totalFreight = monthlyData.reduce((s, d) => s + d.totalFreight, 0);
  const totalShipments = monthlyData.reduce((s, d) => s + d.shipmentCount, 0);
  const avgFreight = totalShipments > 0 ? Math.round(totalFreight / totalShipments) : 0;
  const totalCost = costData.reduce((s, c) => s + c.amount, 0);
  const largestCost = [...costData].sort((a, b) => b.amount - a.amount)[0];

  const statCards: StatCard[] = [
    {
      id: 'totalFreight',
      title: t('tms.freight_cost_page.k8'),
      value: totalFreight.toLocaleString(),
      prefix: '¥',
      icon: <DollarSign size={24} />,
      color: 'primary',
    },
    {
      id: 'totalShipments',
      title: t('tms.freight_cost_page.k9'),
      value: totalShipments,
      icon: <Package size={24} />,
      color: 'success',
    },
    {
      id: 'avgFreight',
      title: t('tms.freight_cost_page.k10'),
      value: avgFreight.toLocaleString(),
      prefix: '¥',
      icon: <TrendingUp size={24} />,
      color: 'warning',
    },
    {
      id: 'costTypes',
      title: t('tms.freight_cost_page.k11'),
      value: costData.length,
      icon: <Layers size={24} />,
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
      title={t('tms.freight_cost_page.k6')}
      subtitle={t('tms.freight_cost_page.k7')}
      statCards={statCards}
      showStatCards={statCards.length > 0}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
    >
      <Alert
        severity='info'
        sx={{ mb: 3 }}
      >
        {t('tms.freight_cost_page.k20')}
      </Alert>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 3,
          mb: 3,
        }}
      >
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('tms.freight_cost_page.k12')}
          </Typography>
          <ResponsiveContainer
            width='100%'
            height={300}
          >
            <PieChart>
              <Pie
                data={costData}
                dataKey='amount'
                nameKey='label'
                label={(entry: unknown) => {
                  const e = entry as { label?: string; amount?: number };
                  return `${e.label}: ¥${(e.amount ?? 0).toLocaleString()}`;
                }}
                outerRadius={100}
              >
                {costData.map((entry) => (
                  <Cell
                    key={entry.type}
                    fill={COST_COLORS[entry.type] ?? designTokens.colors.grey[400]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: unknown) => `¥${Number(value).toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('tms.freight_cost_page.k13')}
          </Typography>
          <ResponsiveContainer
            width='100%'
            height={300}
          >
            <BarChart
              data={monthlyData}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='month'
                fontSize={11}
              />
              <YAxis fontSize={11} />
              <Tooltip formatter={(value: unknown) => `¥${Number(value).toLocaleString()}`} />
              <Legend />
              <Bar
                dataKey='totalFreight'
                name={t('tms.freight_cost_page.k14')}
                fill={designTokens.colors.primary.main}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Box>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {t('tms.freight_cost_page.k15')}
        </Typography>
        <ResponsiveContainer
          width='100%'
          height={250}
        >
          <BarChart
            data={monthlyData}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='month'
              fontSize={11}
            />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Bar
              dataKey='shipmentCount'
              name={t('tms.freight_cost_page.k16')}
              fill={designTokens.colors.secondary.dark}
              barSize={20}
            />
            <Bar
              dataKey='avgFreight'
              name={t('tms.freight_cost_page.k17')}
              fill={designTokens.colors.success.dark}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </StatsPageTemplate>
  );
}
