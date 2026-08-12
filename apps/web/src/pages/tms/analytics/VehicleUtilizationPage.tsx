/**
 * 车辆利用率分析页
 *
 * 使用 recharts BarChart 展示各车辆的使用率：
 * - 运行天数 / 总天数（%）
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
  { vehicleNo: 'V-001', utilization: 85, trips: 42 },
  { vehicleNo: 'V-002', utilization: 72, trips: 35 },
  { vehicleNo: 'V-003', utilization: 91, trips: 48 },
  { vehicleNo: 'V-004', utilization: 65, trips: 28 },
  { vehicleNo: 'V-005', utilization: 88, trips: 45 },
  { vehicleNo: 'V-006', utilization: 78, trips: 38 },
  { vehicleNo: 'V-007', utilization: 95, trips: 52 },
  { vehicleNo: 'V-008', utilization: 60, trips: 25 },
  { vehicleNo: 'V-009', utilization: 82, trips: 40 },
  { vehicleNo: 'V-010', utilization: 70, trips: 32 },
];

export default function VehicleUtilizationPage() {
  const data = useMemo(() => MOCK_DATA, []);

  const avgUtilization =
    data.length > 0
      ? Math.round((data.reduce((s, d) => s + d.utilization, 0) / data.length) * 10) / 10
      : 0;
  const totalTrips = data.reduce((s, d) => s + d.trips, 0);
  const maxUtil = Math.max(...data.map((d) => d.utilization));
  const minUtil = Math.min(...data.map((d) => d.utilization));

  return (
    <div className='space-y-4 p-4'>
      <div>
        <h1 className='text-2xl font-bold'>车辆利用率分析</h1>
        <p className='mt-1 text-sm text-gray-500'>展示各车辆的使用率及运输趟次</p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>平均利用率</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{avgUtilization}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>总运输趟次</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{totalTrips}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>最高利用率</p>
          <p className='mt-1 text-3xl font-bold text-orange-600'>{maxUtil}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>最低利用率</p>
          <p className='mt-1 text-3xl font-bold text-red-600'>{minUtil}%</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>车辆利用率（柱状图）</h3>
        <ResponsiveContainer width='100%' height={340}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='vehicleNo' fontSize={11} />
            <YAxis domain={[0, 100]} unit='%' fontSize={11} />
            <Tooltip formatter={(value: unknown) => `${value}%`} />
            <Legend />
            <ReferenceLine y={80} stroke='#10b981' strokeDasharray='4 4' label='目标 80%' />
            <Bar dataKey='utilization' name='利用率' fill='#3b82f6' barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>车辆运输趟次（柱状图）</h3>
        <ResponsiveContainer width='100%' height={240}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='vehicleNo' fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Bar dataKey='trips' name='运输趟次' fill='#6366f1' barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
