import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import i18n from '@/i18n';
import type { DeliveryAnalyticsData } from '@/api/mes/types';
import { designTokens, semanticTokens } from '@topems/tokens';
const DONUT_COLORS = [designTokens.colors.success.dark, designTokens.colors.warning.main, designTokens.colors.error.main, designTokens.colors.secondary.dark];
function useDeliveryMock(): DeliveryAnalyticsData {
  return useMemo(() => {
    const reasons = [i18n.t('mes.mes_delivery_analytics_page.k4'), i18n.t('mes.mes_delivery_analytics_page.k3'), i18n.t('mes.mes_delivery_analytics_page.k2'), i18n.t('mes.mes_delivery_analytics_page.k1'), i18n.t('mes.mes_delivery_analytics_page.k0')];
    return {
      on_time_rate: 87.4,
      sla_achievement: 92.1,
      top10_delayed: Array.from({ length: 10 }, (_, i) => ({
        order_no: `WO-${String(20240001 + i).padStart(8, '0')}`,
        delay_days: 1 + ((i * 3) % 7) + 0.5,
        reason: reasons[i % reasons.length] ?? i18n.t('mes.mes_delivery_analytics_page.k5'),
      })),
      distribution: Array.from({ length: 12 }, (_, i) => ({
        order_no: `WO-${String(20240010 + i).padStart(8, '0')}`,
        planned: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
        actual: `2024-01-${String((i % 28) + 1 + (i % 3)).padStart(2, '0')}`,
        diff_days: (i % 5) - 2,
      })),
    };
  }, []);
}
export default function MesDeliveryAnalyticsPage() {
  const data = useDeliveryMock();
  const [productFamily, setProductFamily] = useState('all');
  const donutData = useMemo(
    () => [
      { name: i18n.t('mes.mes_delivery_analytics_page.k6'), value: 32 },
      { name: i18n.t('mes.mes_delivery_analytics_page.k7'), value: 124 },
      { name: i18n.t('mes.mes_delivery_analytics_page.k8'), value: 18 },
      { name: i18n.t('mes.mes_delivery_analytics_page.k9'), value: 6 },
    ],
    []
  );
  const boxApprox = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        week: `W${i + 1}`,
        min: 1 + i * 0.5,
        q1: 2 + i * 0.6,
        median: 3 + i * 0.7,
        q3: 4 + i * 0.8,
        max: 6 + i * 0.9,
      })),
    []
  );
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n.t('mes.mes_delivery_analytics_page.k10')}</h1>
        <select
          value={productFamily}
          onChange={(e) => setProductFamily(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
          aria-label={i18n.t('mes.mes_delivery_analytics_page.k11')}
        >
          <option value="all">{i18n.t('mes.mes_delivery_analytics_page.k12')}</option>
          <option value="fa">{i18n.t('mes:mes_delivery_analytics_page.k3')}</option>
          <option value="fb">{i18n.t('mes:mes_delivery_analytics_page.k2')}</option>
        </select>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h3 className="mb-1 font-semibold">{i18n.t('mes.mes_delivery_analytics_page.k13')}</h3>
          <p className="text-3xl font-bold text-emerald-600">{data.on_time_rate.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-gray-500">{i18n.t('mes:mes_delivery_analytics_page.slav0_1', { v0: (data.sla_achievement.toFixed(1)) })}</p>
        </div>
        <div className="rounded-lg border p-4 md:col-span-2">
          <h3 className="mb-2 font-semibold">{i18n.t('mes.mes_delivery_analytics_page.k14')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={donutData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {donutData.map((entry, idx) => (
                  <Cell key={entry.name} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">{i18n.t('mes.mes_delivery_analytics_page.k15')}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={boxApprox}>
              <defs>
                <linearGradient id="deliveryArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={designTokens.colors.secondary.dark} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={designTokens.colors.secondary.dark} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" fontSize={11} />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="max"
                stroke={designTokens.colors.secondary.dark}
                fill="url(#deliveryArea)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="median"
                stroke={designTokens.colors.success.dark}
                fill="transparent"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">{i18n.t('mes.mes_delivery_analytics_page.top6_16')}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={boxApprox}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" fontSize={11} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="min" stackId="box" fill={designTokens.colors.success['200']} name={i18n.t('mes.mes_delivery_analytics_page.k17')} />
              <Bar dataKey="q1" stackId="box" fill='colors.success.light' name="Q1" />
              <Bar dataKey="median" stackId="box" fill={designTokens.colors.success.dark} name={i18n.t('mes.mes_delivery_analytics_page.k18')} />
              <Bar dataKey="q3" stackId="box" fill="#34d399" name="Q3" />
              <Bar dataKey="max" stackId="box" fill={designTokens.colors.success.dark} name={i18n.t('mes.mes_delivery_analytics_page.k19')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-lg border p-4">
        <h3 className="mb-2 font-semibold">{i18n.t('mes.mes_delivery_analytics_page.top10_20')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2">{i18n.t('mes.mes_delivery_analytics_page.k21')}</th>
                <th className="px-3 py-2">{i18n.t('mes.mes_delivery_analytics_page.k22')}</th>
                <th className="px-3 py-2">{i18n.t('mes.mes_delivery_analytics_page.k23')}</th>
              </tr>
            </thead>
            <tbody>
              {data.top10_delayed.map((row) => (
                <tr key={row.order_no} className="border-b">
                  <td className="px-3 py-2 font-mono">{row.order_no}</td>
                  <td className="px-3 py-2 text-amber-600">{i18n.t('mes:mes_delivery_analytics_page.v0_0', { v0: (row.delay_days.toFixed(1)) })}</td>
                  <td className="px-3 py-2">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}