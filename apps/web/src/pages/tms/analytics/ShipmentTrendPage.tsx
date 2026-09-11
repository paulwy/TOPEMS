import { designTokens } from '@topems/tokens';
/**
 * 运单趋势分析页
 *
 * 使用 recharts BarChart 和 LineChart 展示月度运单趋势：
 * - 运单总量（柱状）
 * - 已送达量、取消量（柱状）
 * - 送达率（折线）
 * 数据来自后端 /tms/analytics/shipment-trend-enhanced API。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { tmsAnalyticsApi } from '@/api/tms';
import type { ShipmentTrendEnhancedItem } from '@/api/tms';
import { StatsPageTemplate } from '@/components/templates';
import type { StatCard } from '@/components/templates/StatsPageTemplate';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { Package, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

export default function ShipmentTrendPage() {
  const { t } = useTranslation();

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['tms', 'shipmentTrendEnhanced'],
    queryFn: async () => {
      const res = await tmsAnalyticsApi.getShipmentTrendEnhanced();
      return (res?.data ?? []) as ShipmentTrendEnhancedItem[];
    },
  });

  const data = useMemo(
    () =>
      (apiData ?? []).map((d) => ({
        month: d.month,
        total: d.total,
        delivered: d.delivered,
        cancelled: d.cancelled,
        deliveryRate: d.total > 0 ? Math.round((d.delivered / d.total) * 1000) / 10 : 0,
      })),
    [apiData]
  );

  const totalShipments = data.reduce((s, d) => s + d.total, 0);
  const totalDelivered = data.reduce((s, d) => s + d.delivered, 0);
  const totalCancelled = data.reduce((s, d) => s + d.cancelled, 0);
  const deliveryRate =
    totalShipments > 0 ? Math.round((totalDelivered / totalShipments) * 1000) / 10 : 0;

  const statCards: StatCard[] = [
    {
      id: 'totalShipments',
      title: t('tms.shipment_trend_page.k2'),
      value: totalShipments,
      icon: <Package size={24} />,
      color: 'primary',
    },
    {
      id: 'totalDelivered',
      title: t('tms.shipment_trend_page.k3'),
      value: totalDelivered,
      icon: <CheckCircle size={24} />,
      color: 'success',
    },
    {
      id: 'totalCancelled',
      title: t('tms.shipment_trend_page.k4'),
      value: totalCancelled,
      icon: <XCircle size={24} />,
      color: 'error',
    },
    {
      id: 'deliveryRate',
      title: t('tms.shipment_trend_page.k5'),
      value: deliveryRate,
      suffix: '%',
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
      title={t('tms.shipment_trend_page.k0')}
      subtitle={t('tms.shipment_trend_page.k1')}
      statCards={statCards}
      showStatCards={statCards.length > 0}
      showSearch={false}
      showTimeRange={false}
      showExport={false}
      showRefresh={false}
      showCharts={false}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('tms.shipment_trend_page.k6')}
          </Typography>
          <ResponsiveContainer
            width='100%'
            height={300}
          >
            <BarChart
              data={data}
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
                dataKey='total'
                name={t('tms.shipment_trend_page.k7')}
                fill={designTokens.colors.primary.main}
                barSize={20}
              />
              <Bar
                dataKey='delivered'
                name={t('tms.shipment_trend_page.k8')}
                fill={designTokens.colors.success.dark}
                barSize={20}
              />
              <Bar
                dataKey='cancelled'
                name={t('tms.shipment_trend_page.k9')}
                fill={designTokens.colors.error.main}
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
            {t('tms.shipment_trend_page.k10')}
          </Typography>
          <ResponsiveContainer
            width='100%'
            height={250}
          >
            <LineChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='month'
                fontSize={11}
              />
              <YAxis
                unit='%'
                fontSize={11}
                domain={[0, 100]}
              />
              <Tooltip formatter={(value: unknown) => `${value}%`} />
              <Legend />
              <Line
                type='monotone'
                dataKey='deliveryRate'
                name={t('tms.shipment_trend_page.k11')}
                stroke={designTokens.colors.primary.main}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Box>
    </StatsPageTemplate>
  );
}
