/**
 * 路线效率分析页
 *
 * 使用 recharts BarChart 展示各路线的成本与时间分析：
 * - 平均运输时长（小时）
 * - 单位成本（元/公里）
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
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

const MOCK_DATA = [
  { route: '北京-上海', distance: 1213, avgHours: 14.5, costPerKm: 8.2, totalTrips: 85 },
  { route: '广州-深圳', distance: 140, avgHours: 2.0, costPerKm: 6.5, totalTrips: 120 },
  { route: '成都-重庆', distance: 308, avgHours: 4.0, costPerKm: 7.1, totalTrips: 95 },
  { route: '武汉-长沙', distance: 352, avgHours: 4.5, costPerKm: 6.8, totalTrips: 78 },
  { route: '西安-郑州', distance: 511, avgHours: 6.5, costPerKm: 7.5, totalTrips: 62 },
  { route: '杭州-南京', distance: 276, avgHours: 3.5, costPerKm: 6.9, totalTrips: 88 },
  { route: '天津-济南', distance: 325, avgHours: 4.2, costPerKm: 7.3, totalTrips: 70 },
  { route: '沈阳-大连', distance: 392, avgHours: 5.0, costPerKm: 7.8, totalTrips: 55 },
];

export default function RouteEfficiencyPage() {
  const data = useMemo(() => MOCK_DATA, []);

  const avgHours =
    data.length > 0
      ? Math.round((data.reduce((s, d) => s + d.avgHours, 0) / data.length) * 10) / 10
      : 0;
  const avgCostPerKm =
    data.length > 0
      ? Math.round((data.reduce((s, d) => s + d.costPerKm, 0) / data.length) * 100) / 100
      : 0;
  const totalTrips = data.reduce((s, d) => s + d.totalTrips, 0);
  const totalDistance = data.reduce((s, d) => s + d.distance, 0);

  return (
    <div className='space-y-4 p-4'>
      <div>
        <h1 className='text-2xl font-bold'>路线效率分析</h1>
        <p className='mt-1 text-sm text-gray-500'>展示各路线的运输时长、单位成本及运量分析</p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>平均运输时长</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{avgHours}h</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>平均单位成本</p>
          <p className='mt-1 text-3xl font-bold text-orange-600'>¥{avgCostPerKm}/km</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>总运输趟次</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{totalTrips}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>覆盖总里程</p>
          <p className='mt-1 text-3xl font-bold text-purple-600'>{totalDistance}km</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>路线运输时长与成本（柱状图）</h3>
        <ResponsiveContainer width='100%' height={340}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='route' fontSize={11} />
            <YAxis yAxisId='left' fontSize={11} unit='h' />
            <YAxis yAxisId='right' orientation='right' fontSize={11} unit='/km' />
            <Tooltip />
            <Legend />
            <Bar yAxisId='left' dataKey='avgHours' name='平均时长(h)' fill='#3b82f6' barSize={20} />
            <Bar yAxisId='right' dataKey='costPerKm' name='单位成本(¥/km)' fill='#f59e0b' barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>距离与趟次散点图（ScatterChart）</h3>
        <ResponsiveContainer width='100%' height={300}>
          <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis type='number' dataKey='distance' name='距离' unit='km' fontSize={11} />
            <YAxis type='number' dataKey='totalTrips' name='趟次' fontSize={11} />
            <ZAxis type='number' dataKey='avgHours' name='时长' unit='h' range={[60, 400]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter name='路线' data={data} fill='#6366f1' />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
