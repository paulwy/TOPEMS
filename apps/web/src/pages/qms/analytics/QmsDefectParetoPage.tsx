/**
 * 缺陷帕累托分析页
 *
 * 使用 recharts ComposedChart（Bar + Line）展示缺陷帕累托图：
 * - 柱状图：缺陷数量（降序）
 * - 折线图：累积占比（80/20 分析基准线）
 * 数据来自 useQmsMock 的 defectDistribution。
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
import i18n from '@/i18n';
import { useQmsMock, type QmsMockShape } from '@/api/qms/_mock';
import { designTokens, semanticTokens } from '@topems/tokens';

export default function QmsDefectParetoPage() {
  const { data } = useQmsMock<QmsMockShape>();

  const paretoData = useMemo(() => {
    const list = (data.defectDistribution ?? []).slice();
    list.sort((a, b) => b.count - a.count);
    const total = list.reduce((s, c) => s + c.count, 0) || 1;
    let acc = 0;
    return list.map((c) => {
      acc += c.count;
      return {
        category: c.category,
        count: c.count,
        percentage: c.percentage,
        cumulativePct: Number(((acc / total) * 100).toFixed(1)),
      };
    });
  }, [data.defectDistribution]);

  const vitalFew = useMemo(() => {
    const vital = paretoData.filter((d) => d.cumulativePct <= 80);
    return vital.length === 0 ? paretoData.slice(0, 2) : vital;
  }, [paretoData]);

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>{i18n.t('pages.qms_defect_pareto_page.k0')}</h1>
        <span className='text-sm text-gray-500'>80/20 关键少数：{vitalFew.length} 类</span>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.qms_defect_pareto_page.k1')}</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{paretoData.length}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.qms_defect_pareto_page.k2')}</p>
          <p className='mt-1 text-3xl font-bold text-red-600'>
            {paretoData.reduce((s, d) => s + d.count, 0)}
          </p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.qms_defect_pareto_page.k3')}</p>
          <p className='mt-1 text-lg font-bold text-orange-600'>
            {vitalFew.map((v) => v.category).join('、') || '-'}
          </p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>缺陷帕累托图（柱+累积线）</h3>
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
              dataKey='category'
              fontSize={11}
              angle={-15}
              textAnchor='end'
              height={60}
            />
            <YAxis
              yAxisId='left'
              fontSize={11}
              label={{ value: i18n.t('pages.qms_defect_pareto_page.k4'), angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId='right'
              orientation='right'
              domain={[0, 100]}
              unit='%'
              fontSize={11}
              label={{ value: i18n.t('pages.qms_defect_pareto_page.k5'), angle: 90, position: 'insideRight' }}
            />
            <Tooltip />
            <Legend />
            <ReferenceLine
              yAxisId='right'
              y={80}
              stroke={designTokens.colors.error.main}
              strokeDasharray='4 4'
              label={i18n.t('pages.qms_defect_pareto_page.80_0')}
            />
            <Bar
              yAxisId='left'
              dataKey='count'
              name={i18n.t('pages.qms_defect_pareto_page.k6')}
              fill={designTokens.colors.secondary.dark}
              barSize={36}
            />
            <Line
              yAxisId='right'
              type='monotone'
              dataKey='cumulativePct'
              name={i18n.t('pages.qms_defect_pareto_page.k7')}
              stroke={designTokens.colors.error.main}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('pages.qms_defect_pareto_page.k8')}</h3>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b text-left text-gray-600'>
              <th className='py-2 pr-4'>{i18n.t('pages.qms_defect_pareto_page.k9')}</th>
              <th className='py-2 pr-4'>{i18n.t('pages.qms_defect_pareto_page.k10')}</th>
              <th className='py-2 pr-4'>{i18n.t('pages.qms_defect_pareto_page.k11')}</th>
              <th className='py-2 pr-4'>{i18n.t('pages.qms_defect_pareto_page.k12')}</th>
              <th className='py-2'>{i18n.t('pages.qms_defect_pareto_page.k13')}</th>
            </tr>
          </thead>
          <tbody>
            {paretoData.map((d) => (
              <tr
                key={d.category}
                className='border-b'
              >
                <td className='py-2 pr-4 font-medium'>{d.category}</td>
                <td className='py-2 pr-4'>{d.count}</td>
                <td className='py-2 pr-4'>{d.percentage}%</td>
                <td className='py-2 pr-4'>{d.cumulativePct}%</td>
                <td className='py-2'>
                  {d.cumulativePct <= 80 ? (
                    <span className='inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs text-red-700'>
                      {i18n.t('pages.qms_defect_pareto_page.k1')}
                    </span>
                  ) : (
                    <span className='inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600'>
                      {i18n.t('pages.qms_defect_pareto_page.k2')}
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
