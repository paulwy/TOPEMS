import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
/**
 * 运费成本分析页
 *
 * 使用 recharts BarChart 展示运费成本：
 * - 月度运费趋势（真实数据，来自后端 API）
 * - 月度运单数/均价对比（真实数据，来自后端 API）
 *
 * 注意：成本结构（燃油费/路桥费/人工等细分分类）后端暂无对应 API
 * 和数据库字段，饼图已移除。待后端接真后可恢复。
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tmsAnalyticsApi } from '@/api/tms';
import type { FreightCostTrendItem } from '@/api/tms';
import { StatsPageTemplate } from '@/components/templates';
import type { StatCard } from '@/components/templates/StatsPageTemplate';
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
import { Box, Paper, Typography, CircularProgress, Alert, useTheme } from '@mui/material';
import { DollarSign, TrendingUp, Package } from 'lucide-react';

export default function FreightCostPage() {
  const theme = useTheme();
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

  const totalFreight = monthlyData.reduce((s, d) => s + d.totalFreight, 0);
  const totalShipments = monthlyData.reduce((s, d) => s + d.shipmentCount, 0);
  const avgFreight = totalShipments > 0 ? Math.round(totalFreight / totalShipments) : 0;

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

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
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
            <Legend
              formatter={(v) => <span style={{ color: 'var(--text-secondary)' }}>{v}</span>}
            />
            <Bar
              dataKey='totalFreight'
              name={t('tms.freight_cost_page.k14')}
              fill={theme.palette.primary.main}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

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
            <Legend
              formatter={(v) => <span style={{ color: 'var(--text-secondary)' }}>{v}</span>}
            />
            <Bar
              dataKey='shipmentCount'
              name={t('tms.freight_cost_page.k16')}
              fill={theme.palette.secondary.dark}
              barSize={20}
            />
            <Bar
              dataKey='avgFreight'
              name={t('tms.freight_cost_page.k17')}
              fill={theme.palette.success.dark}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </StatsPageTemplate>
  );
}
