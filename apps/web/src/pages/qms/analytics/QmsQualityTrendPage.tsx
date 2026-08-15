/**
 * 质量趋势分析页
 *
 * 使用 recharts LineChart 展示月度质量趋势：
 * - 合格率（左 Y 轴，%）
 * - 问题数 / 缺陷数（右 Y 轴，计数）
 * 数据来自 useQmsMock 的 qualityTrend。
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
import i18n from '@/i18n';
import { useQmsMock, type QmsMockShape } from '@/api/qms/_mock';
import { designTokens, semanticTokens } from '@topems/tokens';
import { useTranslation } from 'react-i18next';

export default function QmsQualityTrendPage() {
  const { data } = useQmsMock<QmsMockShape>();
  const { t } = useTranslation('qms');
  const [range, setRange] = useState<'6m' | '12m'>('12m');

  const trend = useMemo(() => {
    const list = data.qualityTrend ?? [];
    return range === '6m' ? list.slice(-6) : list;
  }, [data.qualityTrend, range]);

  const avgPassRate = useMemo(() => {
    if (trend.length === 0) return 0;
    return Math.round((trend.reduce((s, t) => s + t.passRate, 0) / trend.length) * 10) / 10;
  }, [trend]);

  const totalDefects = useMemo(() => trend.reduce((s, t) => s + t.defectCount, 0), [trend]);

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>{t('qms.qms_quality_trend_page.k0')}</h1>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as '6m' | '12m')}
          className='border rounded px-3 py-1.5 text-sm'
          aria-label={t('qms.qms_quality_trend_page.k1')}
        >
          <option value='6m'>{t('qms.qms_quality_trend_page.6_2')}</option>
          <option value='12m'>{t('qms.qms_quality_trend_page.12_3')}</option>
        </select>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{t('qms.qms_quality_trend_page.k4')}</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{avgPassRate}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{t('qms.qms_quality_trend_page.k5')}</p>
          <p className='mt-1 text-3xl font-bold text-red-600'>{totalDefects}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{t('qms.qms_quality_trend_page.k6')}</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{i18n.t('pages.qms_quality_trend_page.trendlength_0')}</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{t('qms.qms_quality_trend_page.y_7')}</h3>
        <ResponsiveContainer
          width='100%'
          height={340}
        >
          <LineChart
            data={trend}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='date'
              fontSize={11}
            />
            <YAxis
              yAxisId='left'
              domain={[70, 100]}
              unit='%'
              fontSize={11}
              label={{ value: t('qms.qms_quality_trend_page.k8'), angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId='right'
              orientation='right'
              fontSize={11}
              label={{ value: t('qms.qms_quality_trend_page.k9'), angle: 90, position: 'insideRight' }}
            />
            <Tooltip />
            <Legend />
            <ReferenceLine
              yAxisId='left'
              y={95}
              stroke={designTokens.colors.success.dark}
              strokeDasharray='4 4'
              label={t('qms.qms_quality_trend_page.95_10')}
            />
            <Line
              yAxisId='left'
              type='monotone'
              dataKey='passRate'
              name={t('qms.qms_quality_trend_page.k11')}
              stroke={designTokens.colors.success.dark}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId='right'
              type='monotone'
              dataKey='defectCount'
              name={t('qms.qms_quality_trend_page.k12')}
              stroke={designTokens.colors.error.main}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId='right'
              type='monotone'
              dataKey='issueCount'
              name={t('qms.qms_quality_trend_page.k13')}
              stroke={designTokens.colors.warning.main}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{t('qms.qms_quality_trend_page.k14')}</h3>
        <ResponsiveContainer
          width='100%'
          height={240}
        >
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='date'
              fontSize={11}
            />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Line
              type='monotone'
              dataKey='inspectionCount'
              name={t('qms.qms_quality_trend_page.k15')}
              stroke={designTokens.colors.secondary.dark}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
