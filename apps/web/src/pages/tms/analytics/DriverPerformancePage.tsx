/**
 * 司机绩效分析页
 *
 * 使用 recharts BarChart 展示各司机的准点送达率：
 * - 准点率（%）
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
  ReferenceLine,
} from 'recharts';

const MOCK_DATA = [
  { driver: '张伟', onTimeRate: 92, totalDeliveries: 45, avgDelayMin: 5 },
  { driver: '李强', onTimeRate: 88, totalDeliveries: 38, avgDelayMin: 8 },
  { driver: '王磊', onTimeRate: 95, totalDeliveries: 52, avgDelayMin: 3 },
  { driver: '刘洋', onTimeRate: 78, totalDeliveries: 30, avgDelayMin: 15 },
  { driver: '陈杰', onTimeRate: 90, totalDeliveries: 42, avgDelayMin: 6 },
  { driver: '赵峰', onTimeRate: 85, totalDeliveries: 35, avgDelayMin: 10 },
  { driver: '孙浩', onTimeRate: 97, totalDeliveries: 48, avgDelayMin: 2 },
  { driver: '周明', onTimeRate: 82, totalDeliveries: 33, avgDelayMin: 12 },
  { driver: '吴鹏', onTimeRate: 89, totalDeliveries: 40, avgDelayMin: 7 },
  { driver: '郑辉', onTimeRate: 94, totalDeliveries: 46, avgDelayMin: 4 },
];

export default function DriverPerformancePage() {
  const data = useMemo(() => MOCK_DATA, []);

  const avgOnTimeRate =
    data.length > 0
      ? Math.round((data.reduce((s, d) => s + d.onTimeRate, 0) / data.length) * 10) / 10
      : 0;
  const totalDeliveries = data.reduce((s, d) => s + d.totalDeliveries, 0);
  const topPerformer = [...data].sort((a, b) => b.onTimeRate - a.onTimeRate)[0];

  return (
    <div className='space-y-4 p-4'>
      <div>
        <h1 className='text-2xl font-bold'>司机绩效分析</h1>
        <p className='mt-1 text-sm text-gray-500'>展示各司机的准点送达率及配送量</p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>平均准点率</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{avgOnTimeRate}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>总配送量</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{totalDeliveries}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>最佳司机</p>
          <p className='mt-1 text-3xl font-bold text-orange-600'>{topPerformer?.driver ?? '-'}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>最佳准点率</p>
          <p className='mt-1 text-3xl font-bold text-purple-600'>{topPerformer?.onTimeRate ?? 0}%</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>司机准点送达率（柱状图）</h3>
        <ResponsiveContainer width='100%' height={340}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='driver' fontSize={11} />
            <YAxis domain={[60, 100]} unit='%' fontSize={11} />
            <Tooltip formatter={(value: unknown) => `${value}%`} />
            <Legend />
            <ReferenceLine y={90} stroke='#10b981' strokeDasharray='4 4' label='目标 90%' />
            <Bar dataKey='onTimeRate' name='准点率' fill='#3b82f6' barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>司机配送量及平均延误（柱状图）</h3>
        <ResponsiveContainer width='100%' height={240}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='driver' fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Bar dataKey='totalDeliveries' name='配送量' fill='#6366f1' barSize={20} />
            <Bar dataKey='avgDelayMin' name='平均延误(分钟)' fill='#f59e0b' barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
