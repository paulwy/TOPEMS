import { useMemo } from 'react';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { useWmsMock, type WmsMockShape } from '@/api/wms/_mock';
import { designTokens, semanticTokens } from '@topems/tokens';

function getColor(rate: number): string {
  if (rate >= 95) return designTokens.colors.success.dark;
  if (rate >= 90) return designTokens.colors.primary.main;
  if (rate >= 85) return designTokens.colors.warning.main;
  return designTokens.colors.error.main;
}

export default function WmsOrderFulfillmentPage() {
  const { data } = useWmsMock<WmsMockShape>();

  const fulfillment = useMemo(() => data.fulfillment ?? [], [data.fulfillment]);

  const { avgOnTime, avgHours, avgSla, best } = useMemo(() => {
    if (fulfillment.length === 0) {
      return { avgOnTime: 0, avgHours: 0, avgSla: 0, best: '-' };
    }
    const onTime = fulfillment.reduce((s, f) => s + f.onTimeRate, 0) / fulfillment.length;
    const hours = fulfillment.reduce((s, f) => s + f.avgHours, 0) / fulfillment.length;
    const sla = fulfillment.reduce((s, f) => s + f.slaPass, 0) / fulfillment.length;
    const bestWh = [...fulfillment].sort((a, b) => b.onTimeRate - a.onTimeRate)[0];
    return {
      avgOnTime: Number(onTime.toFixed(1)),
      avgHours: Number(hours.toFixed(1)),
      avgSla: Number(sla.toFixed(1)),
      best: bestWh?.warehouse ?? '-',
    };
  }, [fulfillment]);

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>订单履约与 SLA 分析</h1>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>平均准时履约率</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{avgOnTime}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>平均出库时长</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{avgHours} 小时</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>SLA 达标率</p>
          <p className='mt-1 text-3xl font-bold text-purple-600'>{avgSla}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>最佳履约仓库</p>
          <p className='mt-1 text-3xl font-bold text-orange-600'>{best}</p>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>SLA 准时履约率（径向）</h3>
          <ResponsiveContainer
            width='100%'
            height={360}
          >
            <RadialBarChart
              innerRadius='20%'
              outerRadius='100%'
              data={fulfillment.map((f) => ({
                ...f,
                fill: getColor(f.onTimeRate),
              }))}
              startAngle={180}
              endAngle={0}
              barCategoryGap='20%'
            >
              <RadialBar
                dataKey='onTimeRate'
                name='准时履约率 %'
                cornerRadius={8}
                background={{ fill: 'colors.grey.100' }}
              />
              <Legend
                iconSize={10}
                layout='horizontal'
                verticalAlign='bottom'
              />
              <Tooltip formatter={(v: unknown) => [`${v}%`, '准时履约率']} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>

        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>平均出库时长（小时）by 仓库</h3>
          <ResponsiveContainer
            width='100%'
            height={360}
          >
            <BarChart
              data={fulfillment}
              layout='vertical'
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                type='number'
                fontSize={11}
              />
              <YAxis
                type='category'
                dataKey='warehouse'
                fontSize={12}
                width={80}
              />
              <Tooltip />
              <Bar
                dataKey='avgHours'
                name='平均出库时长（小时）'
                radius={[0, 6, 6, 0]}
              >
                {fulfillment.map((f, i) => (
                  <Cell
                    key={i}
                    fill={
                      f.avgHours <= 10
                        ? designTokens.colors.success.dark
                        : f.avgHours <= 15
                          ? designTokens.colors.primary.main
                          : f.avgHours <= 20
                            ? designTokens.colors.warning.main
                            : designTokens.colors.error.main
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>SLA 达标率 vs 准时履约率 对比</h3>
        <ResponsiveContainer
          width='100%'
          height={300}
        >
          <BarChart data={fulfillment}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='warehouse'
              fontSize={12}
            />
            <YAxis
              domain={[80, 100]}
              fontSize={11}
            />
            <Tooltip />
            <Legend />
            <Bar
              dataKey='onTimeRate'
              name='准时履约率'
              fill={designTokens.colors.primary.main}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey='slaPass'
              name='SLA 达标率'
              fill={designTokens.colors.success.dark}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
