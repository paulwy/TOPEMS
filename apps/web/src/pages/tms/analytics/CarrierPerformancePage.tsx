/**
 * 承运商绩效分析页
 *
 * 使用 recharts BarChart 展示各承运商的配送统计对比：
 * - 总运单数、准时送达数、破损数
 * 数据为 mock 数据。
 */
import { useMemo } from 'react';
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

const MOCK_DATA = [
  { carrier: '顺达物流', totalShipments: 320, onTime: 285, damaged: 5 },
  { carrier: '中远快运', totalShipments: 280, onTime: 240, damaged: 8 },
  { carrier: '华宇运输', totalShipments: 350, onTime: 320, damaged: 3 },
  { carrier: '德邦物流', totalShipments: 410, onTime: 370, damaged: 6 },
  { carrier: '安能物流', totalShipments: 260, onTime: 225, damaged: 4 },
  { carrier: '天地华宇', totalShipments: 300, onTime: 265, damaged: 7 },
  { carrier: '佳吉快运', totalShipments: 240, onTime: 210, damaged: 9 },
];

export default function CarrierPerformancePage() {
  const data = useMemo(
    () =>
      MOCK_DATA.map((d) => ({
        ...d,
        onTimeRate: d.totalShipments > 0 ? Math.round((d.onTime / d.totalShipments) * 1000) / 10 : 0,
        damageRate: d.totalShipments > 0 ? Math.round((d.damaged / d.totalShipments) * 1000) / 10 : 0,
      })),
    []
  );

  const totalShipments = data.reduce((s, d) => s + d.totalShipments, 0);
  const totalOnTime = data.reduce((s, d) => s + d.onTime, 0);
  const totalDamaged = data.reduce((s, d) => s + d.damaged, 0);
  const avgOnTimeRate =
    totalShipments > 0 ? Math.round((totalOnTime / totalShipments) * 1000) / 10 : 0;

  return (
    <div className='space-y-4 p-4'>
      <div>
        <h1 className='text-2xl font-bold'>承运商绩效分析</h1>
        <p className='mt-1 text-sm text-gray-500'>对比各承运商的运单量、准时送达及破损情况</p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>总运单量</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{totalShipments}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>准时送达</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{totalOnTime}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>破损件数</p>
          <p className='mt-1 text-3xl font-bold text-red-600'>{totalDamaged}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>平均准时率</p>
          <p className='mt-1 text-3xl font-bold text-orange-600'>{avgOnTimeRate}%</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>承运商运单量对比（柱状图）</h3>
        <ResponsiveContainer width='100%' height={340}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='carrier' fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Bar dataKey='totalShipments' name='总运单' fill='#3b82f6' barSize={20} />
            <Bar dataKey='onTime' name='准时送达' fill='#10b981' barSize={20} />
            <Bar dataKey='damaged' name='破损' fill='#ef4444' barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>承运商准时率与破损率（柱状图）</h3>
        <ResponsiveContainer width='100%' height={240}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='carrier' fontSize={11} />
            <YAxis unit='%' fontSize={11} />
            <Tooltip formatter={(value: unknown) => `${value}%`} />
            <Legend />
            <Bar dataKey='onTimeRate' name='准时率' fill='#10b981' barSize={20} />
            <Bar dataKey='damageRate' name='破损率' fill='#f59e0b' barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
