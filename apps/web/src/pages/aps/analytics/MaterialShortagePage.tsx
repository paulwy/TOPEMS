import { designTokens, semanticTokens } from '@topems/tokens';
/**
 * 物料短缺帕累托分析页
 *
 * 使用 recharts ComposedChart（Bar + Line）展示物料短缺帕累托图：
 * - 柱状图：短缺数量（降序）
 * - 折线图：累积占比（80/20 分析基准线）
 * 数据使用内置 mock 数据。
 */
import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

const mockShortages = [
  { material: '钢板 2mm', shortage: 500 },
  { material: '铝型材 4040', shortage: 380 },
  { material: '电机 1.5kW', shortage: 320 },
  { material: '轴承 6204', shortage: 250 },
  { material: '螺栓 M8', shortage: 180 },
  { material: '电缆 4mm²', shortage: 120 },
  { material: '密封圈 O型', shortage: 80 },
  { material: '油漆 银灰', shortage: 50 },
];

export default function MaterialShortagePage() {
  const paretoData = useMemo(() => {
    const list = mockShortages.slice().sort((a, b) => b.shortage - a.shortage);
    const total = list.reduce((s, c) => s + c.shortage, 0) || 1;
    let acc = 0;
    return list.map((c) => {
      acc += c.shortage;
      return {
        material: c.material,
        shortage: c.shortage,
        cumulativePct: Number(((acc / total) * 100).toFixed(1)),
      };
    });
  }, []);

  const vitalFew = useMemo(() => {
    const vital = paretoData.filter((d) => d.cumulativePct <= 80);
    return vital.length === 0 ? paretoData.slice(0, 2) : vital;
  }, [paretoData]);

  const totalShortage = useMemo(
    () => paretoData.reduce((s, d) => s + d.shortage, 0),
    [paretoData],
  );

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>物料短缺帕累托分析</h1>
        <span className='text-sm text-gray-500'>80/20 关键少数：{vitalFew.length} 种</span>
      </div>
      <p className='text-sm text-gray-600'>
        基于物料短缺数量的帕累托分析，识别影响生产的关键少数物料，优先解决高短缺物料以降低交付风险。
      </p>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>短缺物料种类</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{paretoData.length}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>短缺总量</p>
          <p className='mt-1 text-3xl font-bold text-red-600'>{totalShortage.toLocaleString()}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>关键短缺物料</p>
          <p className='mt-1 text-lg font-bold text-orange-600'>
            {vitalFew.map((v) => v.material).join('、') || '-'}
          </p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>物料短缺帕累托图（柱+累积线）</h3>
        <ResponsiveContainer
          width='100%'
          height={360}
        >
          <ComposedChart
            data={paretoData}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='material'
              fontSize={11}
              angle={-15}
              textAnchor='end'
              height={60}
            />
            <YAxis
              yAxisId='left'
              fontSize={11}
              label={{ value: '短缺量', angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId='right'
              orientation='right'
              domain={[0, 100]}
              unit='%'
              fontSize={11}
              label={{ value: '累积占比', angle: 90, position: 'insideRight' }}
            />
            <Tooltip />
            <Legend />
            <ReferenceLine
              yAxisId='right'
              y={80}
              stroke={designTokens.colors.error.main}
              strokeDasharray='4 4'
              label='80% 基准'
            />
            <Bar
              yAxisId='left'
              dataKey='shortage'
              name='短缺量'
              fill={designTokens.colors.secondary.dark}
              barSize={36}
            />
            <Line
              yAxisId='right'
              type='monotone'
              dataKey='cumulativePct'
              name='累积占比'
              stroke={designTokens.colors.error.main}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>短缺明细表</h3>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b text-left text-gray-600'>
              <th className='py-2 pr-4'>物料</th>
              <th className='py-2 pr-4'>短缺量</th>
              <th className='py-2 pr-4'>累积占比</th>
              <th className='py-2'>分类</th>
            </tr>
          </thead>
          <tbody>
            {paretoData.map((d) => (
              <tr
                key={d.material}
                className='border-b'
              >
                <td className='py-2 pr-4 font-medium'>{d.material}</td>
                <td className='py-2 pr-4'>{d.shortage}</td>
                <td className='py-2 pr-4'>{d.cumulativePct}%</td>
                <td className='py-2'>
                  {d.cumulativePct <= 80 ? (
                    <span className='inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs text-red-700'>
                      关键少数
                    </span>
                  ) : (
                    <span className='inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600'>
                      有用多数
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
