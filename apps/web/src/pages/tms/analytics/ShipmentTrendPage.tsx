import { designTokens, semanticTokens } from '@topems/tokens';
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
  const data = useMemo(() => MOCK_DATA, []);

  const totalShipments = data.reduce((s, d) => s + d.total, 0);
  const totalDelivered = data.reduce((s, d) => s + d.delivered, 0);
  const totalCancelled = data.reduce((s, d) => s + d.cancelled, 0);
  const deliveryRate =
    totalShipments > 0 ? Math.round((totalDelivered / totalShipments) * 1000) / 10 : 0;

  return (
    <div className='space-y-4 p-4'>
      <div>
        <h1 className='text-2xl font-bold'>运单趋势分析</h1>
        <p className='mt-1 text-sm text-gray-500'>展示月度运单创建量、送达量及取消量趋势</p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>运单总量</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{totalShipments}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>已送达</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{totalDelivered}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>已取消</p>
          <p className='mt-1 text-3xl font-bold text-red-600'>{totalCancelled}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>送达率</p>
          <p className='mt-1 text-3xl font-bold text-orange-600'>{deliveryRate}%</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>月度运单量（柱状图）</h3>
        <ResponsiveContainer width='100%' height={300}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='month' fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Bar dataKey='total' name='运单总量' fill={designTokens.colors.primary.main} barSize={20} />
            <Bar dataKey='delivered' name='已送达' fill={designTokens.colors.success.dark} barSize={20} />
            <Bar dataKey='cancelled' name='已取消' fill={designTokens.colors.error.main} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>送达与取消趋势（折线图）</h3>
        <ResponsiveContainer width='100%' height={300}>
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='month' fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Line type='monotone' dataKey='delivered' name='已送达' stroke={designTokens.colors.success.dark} strokeWidth={2} dot={{ r: 3 }} />
            <Line type='monotone' dataKey='cancelled' name='已取消' stroke={designTokens.colors.error.main} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
