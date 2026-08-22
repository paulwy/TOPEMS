import { designTokens } from '@topems/tokens';
/**
 * 运单趋势分析页
 *
 * 使用 recharts LineChart 展示月度运单趋势：
 * - 运单总量（柱状）
 * - 已送达量（折线）
 * - 取消量（折线）
 * 数据为 mock 数据。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { tmsApi } from '@/api/tms';
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
import { Box, Paper, Typography } from '@mui/material';
import { Package, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

const MOCK_DATA = [
  { month: '2025-01', total: 120, delivered: 95, cancelled: 8 },
  { month: '2025-02', total: 135, delivered: 110, cancelled: 10 },
  { month: '2025-03', total: 150, delivered: 128, cancelled: 7 },
  { month: '2025-04', total: 142, delivered: 120, cancelled: 12 },
  { month: '2025-05', total: 168, delivered: 145, cancelled: 9 },
  { month: '2025-06', total: 180, delivered: 160, cancelled: 6 },
  { month: '2025-07', total: 195, delivered: 175, cancelled: 8 },
  { month: '2025-08', total: 210, delivered: 188, cancelled: 10 },
  { month: '2025-09', total: 225, delivered: 200, cancelled: 12 },
  { month: '2025-10', total: 240, delivered: 215, cancelled: 9 },
  { month: '2025-11', total: 255, delivered: 230, cancelled: 11 },
  { month: '2025-12', total: 270, delivered: 245, cancelled: 8 },
];
export default function ShipmentTrendPage() {
  const { t } = useTranslation();

  useQuery({
    queryKey: ['tms', 'ShipmentTrendPage'],
    queryFn: async () => {
      try {
        const allRes = await tmsApi.listShipments({ page: 1, pageSize: 2000 });
        const extractItems = (res: unknown) => {
          const data = (res as { data?: unknown })?.data;
          if (Array.isArray(data)) return data as Record<string, unknown>[];
          const items = (data as { items?: unknown[] })?.items;
          return Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
        };
        const items = extractItems(allRes);
        const statusOf = (x: Record<string, unknown>) => String(x.status ?? '').toLowerCase();
        const deliveredItems = items.filter((x) => statusOf(x).includes('deliver'));
        const cancelledItems = items.filter((x) => statusOf(x).includes('cancel'));
        return {
          total: items.length,
          delivered: deliveredItems.length,
          cancelled: cancelledItems.length,
        };
      } catch {
        return {};
      }
    },
  });

  const data = useMemo(() => MOCK_DATA, []);
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
            height={300}
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
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Line
                type='monotone'
                dataKey='delivered'
                name={t('tms.shipment_trend_page.k11')}
                stroke={designTokens.colors.success.dark}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type='monotone'
                dataKey='cancelled'
                name={t('tms.shipment_trend_page.k12')}
                stroke={designTokens.colors.error.main}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Box>
    </StatsPageTemplate>
  );
}
