import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';
/**
 * 物料短缺帕累托分析页
 *
 * 使用 recharts ComposedChart（Bar + Line）展示物料短缺帕累托图：
 * - 柱状图：短缺数量（降序）
 * - 折线图：累积占比（80/20 分析基准线）
 * 数据使用内置 mock 数据。
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apsApi } from '@/api/aps';
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
  { material: i18n.t('pages.material_shortage_page.2mm_0'), shortage: 500 },
  { material: i18n.t('pages.material_shortage_page.4040_1'), shortage: 380 },
  { material: i18n.t('pages.material_shortage_page.15kw_0'), shortage: 320 },
  { material: i18n.t('pages.material_shortage_page.6204_2'), shortage: 250 },
  { material: i18n.t('pages.material_shortage_page.m8_3'), shortage: 180 },
  { material: i18n.t('pages.material_shortage_page.4mm_1'), shortage: 120 },
  { material: i18n.t('pages.material_shortage_page.o_4'), shortage: 80 },
  { material: i18n.t('pages.material_shortage_page.k5'), shortage: 50 },
];
export default function MaterialShortagePage() {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['aps', 'MaterialShortagePage'],
    queryFn: async () => {
      try {
        const res = await apsApi.listMaterialPlans();
        const items = res?.data?.items ?? (Array.isArray(res?.data) ? res.data : []);
        return {
          materialPlans: items,
          shortage: items.filter((x: any) => (x.shortageQty || 0) > 0),
        };
      } catch {
        return {};
      }
    },
  });
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
  const totalShortage = useMemo(() => paretoData.reduce((s, d) => s + d.shortage, 0), [paretoData]);
  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>{i18n.t('pages.material_shortage_page.k6')}</h1>
        <span className='text-sm text-gray-500'>
          {i18n.t('aps.analytics.materialShortage.k0')}
          {vitalFew.length} {i18n.t('aps.analytics.materialShortage.k2')}
        </span>
      </div>
      <p className='text-sm text-gray-600'>{i18n.t('pages.material_shortage_page.k2')}</p>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.material_shortage_page.k7')}</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{paretoData.length}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.material_shortage_page.k8')}</p>
          <p className='mt-1 text-3xl font-bold text-red-600'>{totalShortage.toLocaleString()}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.material_shortage_page.k9')}</p>
          <p className='mt-1 text-lg font-bold text-orange-600'>
            {vitalFew.map((v) => v.material).join('、') || '-'}
          </p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('aps.analytics.materialShortage.k1')}</h3>
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
              label={{
                value: i18n.t('pages.material_shortage_page.k10'),
                angle: -90,
                position: 'insideLeft',
              }}
            />
            <YAxis
              yAxisId='right'
              orientation='right'
              domain={[0, 100]}
              unit='%'
              fontSize={11}
              label={{
                value: i18n.t('pages.material_shortage_page.k11'),
                angle: 90,
                position: 'insideRight',
              }}
            />
            <Tooltip />
            <Legend />
            <ReferenceLine
              yAxisId='right'
              y={80}
              stroke={designTokens.colors.error.main}
              strokeDasharray='4 4'
              label={i18n.t('pages.material_shortage_page.80_3')}
            />
            <Bar
              yAxisId='left'
              dataKey='shortage'
              name={i18n.t('pages.material_shortage_page.k12')}
              fill={designTokens.colors.secondary.dark}
              barSize={36}
            />
            <Line
              yAxisId='right'
              type='monotone'
              dataKey='cumulativePct'
              name={i18n.t('pages.material_shortage_page.k13')}
              stroke={designTokens.colors.error.main}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('pages.material_shortage_page.k14')}</h3>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b text-left text-gray-600'>
              <th className='py-2 pr-4'>{i18n.t('pages.material_shortage_page.k15')}</th>
              <th className='py-2 pr-4'>{i18n.t('pages.material_shortage_page.k16')}</th>
              <th className='py-2 pr-4'>{i18n.t('pages.material_shortage_page.k17')}</th>
              <th className='py-2'>{i18n.t('pages.material_shortage_page.k18')}</th>
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
                      {i18n.t('pages.material_shortage_page.k4')}
                    </span>
                  ) : (
                    <span className='inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600'>
                      {i18n.t('pages.material_shortage_page.k5')}
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
