/**
 * SPC 控制图分析页
 *
 * 使用 recharts LineChart + ReferenceLine 展示统计过程控制图：
 * - UCL/LCL/CL 控制限
 * - 样本均值点（超限标红）
 * 数据来自 useQmsMock 的 spcCharts + spcDataPoints。
 */
import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { useQmsMock, type QmsMockShape } from '@/api/qms/_mock';
import { designTokens, semanticTokens } from '@topems/tokens';

export default function QmsSpcControlChartPage() {
  const { data } = useQmsMock<QmsMockShape>();
  const charts = data.spcCharts ?? [];
  const [chartId, setChartId] = useState<string>(charts[0]?.id ?? '');

  const selectedChart = useMemo(
    () => charts.find((c) => c.id === chartId) ?? charts[0],
    [charts, chartId]
  );

  const points = useMemo(() => {
    if (!selectedChart) return [];
    return (data.spcDataPoints ?? [])
      .filter((p) => p.chartId === selectedChart.id)
      .map((p) => ({
        sampleNo: p.sampleNo,
        mean: p.mean ?? 0,
        range: p.range ?? 0,
        isOOC: p.isOutOfControl,
      }));
  }, [data.spcDataPoints, selectedChart]);

  const ucl = selectedChart?.ucl ?? 0;
  const lcl = selectedChart?.lcl ?? 0;
  const cl = selectedChart?.cl ?? 0;
  const oocCount = points.filter((p) => p.isOOC).length;
  const oocRate = points.length > 0 ? Math.round((oocCount / points.length) * 1000) / 10 : 0;

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>SPC 控制图分析</h1>
        <select
          value={chartId}
          onChange={(e) => setChartId(e.target.value)}
          className='border rounded px-3 py-1.5 text-sm'
          aria-label='控制图选择'
        >
          {charts.map((c) => (
            <option
              key={c.id}
              value={c.id}
            >
              {c.chartName}（{c.chartType}）
            </option>
          ))}
        </select>
      </div>

      {selectedChart && (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <div className='rounded-lg border p-4'>
            <p className='text-sm text-gray-600'>控制特性</p>
            <p className='mt-1 text-lg font-bold'>{selectedChart.characteristic}</p>
          </div>
          <div className='rounded-lg border p-4'>
            <p className='text-sm text-gray-600'>中心线 CL</p>
            <p className='mt-1 text-2xl font-bold text-blue-600'>{cl}</p>
          </div>
          <div className='rounded-lg border p-4'>
            <p className='text-sm text-gray-600'>控制限 UCL/LCL</p>
            <p className='mt-1 text-sm font-bold'>
              <span className='text-red-600'>{ucl}</span>
              <span className='mx-2 text-gray-400'>/</span>
              <span className='text-orange-600'>{lcl}</span>
            </p>
          </div>
          <div className='rounded-lg border p-4'>
            <p className='text-sm text-gray-600'>超限点数 / 占比</p>
            <p className='mt-1 text-2xl font-bold text-red-600'>
              {oocCount} <span className='text-sm'>({oocRate}%)</span>
            </p>
          </div>
        </div>
      )}

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>均值控制图（X̄ 图）</h3>
        <ResponsiveContainer
          width='100%'
          height={360}
        >
          <LineChart
            data={points}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='sampleNo'
              fontSize={10}
            />
            <YAxis
              fontSize={11}
              domain={[lcl - 1, ucl + 1]}
            />
            <Tooltip />
            <Legend />
            <ReferenceLine
              y={ucl}
              stroke={designTokens.colors.error.main}
              strokeDasharray='4 4'
              label={{ value: `UCL=${ucl}`, position: 'right', fontSize: 11 }}
            />
            <ReferenceLine
              y={cl}
              stroke={designTokens.colors.success.dark}
              strokeDasharray='2 2'
              label={{ value: `CL=${cl}`, position: 'right', fontSize: 11 }}
            />
            <ReferenceLine
              y={lcl}
              stroke={designTokens.colors.warning.main}
              strokeDasharray='4 4'
              label={{ value: `LCL=${lcl}`, position: 'right', fontSize: 11 }}
            />
            <Line
              type='monotone'
              dataKey='mean'
              name='样本均值'
              stroke={designTokens.colors.secondary.dark}
              strokeWidth={2}
              dot={(props: { cx?: number; cy?: number; payload?: { isOOC?: boolean } }) => {
                const { cx, cy, payload } = props;
                if (cx == null || cy == null) return <g key='empty' />;
                return (
                  <circle
                    key={`dot-${cx}-${cy}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={payload?.isOOC ? designTokens.colors.error.main : designTokens.colors.secondary.dark}
                    stroke={payload?.isOOC ? designTokens.colors.error['800'] : '#4338ca'}
                    strokeWidth={1}
                  />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>极差控制图（R 图）</h3>
        <ResponsiveContainer
          width='100%'
          height={240}
        >
          <LineChart data={points}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='sampleNo'
              fontSize={10}
            />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Line
              type='monotone'
              dataKey='range'
              name='样本极差'
              stroke={designTokens.colors.secondary.main}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
