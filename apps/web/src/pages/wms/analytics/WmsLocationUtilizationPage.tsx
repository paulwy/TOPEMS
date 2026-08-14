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
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';
import { designTokens, semanticTokens } from '@topems/tokens';

export default function WmsLocationUtilizationPage() {
  const { data } = useWmsMock<WmsMockShape>();

  const locationUtil = useMemo(() => data.locationUtil ?? [], [data.locationUtil]);

  const avgUtil = useMemo(() => {
    if (locationUtil.length === 0) return 0;
    return Math.round(locationUtil.reduce((s, l) => s + l.utilization, 0) / locationUtil.length);
  }, [locationUtil]);

  const avgDead = useMemo(() => {
    if (locationUtil.length === 0) return 0;
    return Math.round(locationUtil.reduce((s, l) => s + l.deadStock, 0) / locationUtil.length);
  }, [locationUtil]);

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>库位利用率分析</h1>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>平均利用率</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{avgUtil}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>平均空置率</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{100 - avgUtil - avgDead}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>平均呆滞占比</p>
          <p className='mt-1 text-3xl font-bold text-red-600'>{avgDead}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>分析库区数</p>
          <p className='mt-1 text-3xl font-bold text-purple-600'>{locationUtil.length}</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>各库区堆叠柱状（已用 / 空置 / 呆滞）</h3>
        <ResponsiveContainer
          width='100%'
          height={400}
        >
          <BarChart
            data={locationUtil}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='area'
              fontSize={12}
            />
            <YAxis
              domain={[0, 100]}
              fontSize={11}
            />
            <Tooltip
              formatter={(v: unknown, n: unknown) => {
                const labels: Record<string, string> = {
                  utilization: '已用 %',
                  vacancy: '空置 %',
                  deadStock: '呆滞 %',
                };
                return [`${v}%`, labels[String(n)] ?? String(n)];
              }}
            />
            <Legend />
            <Bar
              dataKey='utilization'
              name='已用'
              stackId='a'
              fill={designTokens.colors.success.dark}
            />
            <Bar
              dataKey='vacancy'
              name='空置'
              stackId='a'
              fill={designTokens.colors.primary.main}
            />
            <Bar
              dataKey='deadStock'
              name='呆滞'
              stackId='a'
              fill={designTokens.colors.error.main}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
