import { useMemo, useState } from 'react';
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
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import i18n from '@/i18n';
import type { QualityParetoData } from '@/api/mes/types';
import { designTokens, semanticTokens } from '@topems/tokens';

const DISPOSITION_COLORS = [
  designTokens.colors.secondary.dark,
  designTokens.colors.success.dark,
  designTokens.colors.warning.main,
  designTokens.colors.error.main,
  designTokens.colors.secondary.main,
];
function useQualityParetoMock(): QualityParetoData {
  return useMemo(() => {
    const types = [
      i18n.t('mes.mes_quality_pareto_page.k0'),
      i18n.t('mes.mes_quality_pareto_page.k1'),
      i18n.t('mes.mes_quality_pareto_page.k2'),
      i18n.t('mes.mes_quality_pareto_page.k3'),
      i18n.t('mes.mes_quality_pareto_page.k4'),
      i18n.t('mes.mes_quality_pareto_page.k5'),
      i18n.t('mes.mes_quality_pareto_page.k6'),
      i18n.t('mes.mes_quality_pareto_page.k7'),
    ];
    const counts = types.map((t, i) => ({
      type: t,
      count: Math.round(120 - i * 12 + Math.sin(i * 1.3) * 8),
    }));
    const total = counts.reduce((s, c) => s + c.count, 0);
    let acc = 0;
    const withCumulative = counts
      .sort((a, b) => b.count - a.count)
      .map((c) => {
        acc += c.count;
        return { ...c, cumulative_pct: Number(((acc / total) * 100).toFixed(1)) };
      });
    return {
      defect_types: withCumulative,
      heatmap: Array.from({ length: 24 }, (_, i) => ({
        process: `${i18n.t('pages.mes_quality_pareto_page.k0')}${(i % 6) + 1}`,
        defect_type: types[i % types.length] ?? i18n.t('mes.mes_quality_pareto_page.k8'),
        count: 2 + ((i * 5) % 18),
      })),
      disposition: [
        { category: i18n.t('mes.mes_quality_pareto_page.k9'), count: 86 },
        { category: i18n.t('mes.mes_quality_pareto_page.k10'), count: 32 },
        { category: i18n.t('mes.mes_quality_pareto_page.k11'), count: 24 },
        { category: i18n.t('mes.mes_quality_pareto_page.k12'), count: 18 },
        { category: i18n.t('mes.mes_quality_pareto_page.k13'), count: 12 },
      ],
    };
  }, []);
}
export default function MesQualityParetoPage() {
  const data = useQualityParetoMock();
  const [line, setLine] = useState('all');
  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>{i18n.t('mes.mes_quality_pareto_page.pareto_14')}</h1>
        <select
          value={line}
          onChange={(e) => setLine(e.target.value)}
          className='border rounded px-3 py-1.5 text-sm'
          aria-label={i18n.t('mes.mes_quality_pareto_page.k15')}
        >
          <option value='all'>{i18n.t('mes.mes_quality_pareto_page.k16')}</option>
          <option value='l1'>{i18n.t('mes.mes_quality_pareto_page.1_17')}</option>
          <option value='l2'>{i18n.t('mes.mes_quality_pareto_page.2_18')}</option>
        </select>
      </div>
      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('mes.analytics.qualityPareto.k0')}</h3>
        <ResponsiveContainer
          width='100%'
          height={320}
        >
          <ComposedChart data={data.defect_types}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='type'
              fontSize={11}
              angle={-15}
              textAnchor='end'
              height={60}
            />
            <YAxis yAxisId='left' />
            <YAxis
              yAxisId='right'
              orientation='right'
              domain={[0, 100]}
              unit='%'
            />
            <Tooltip />
            <Legend />
            <Bar
              yAxisId='left'
              dataKey='count'
              name={i18n.t('mes.mes_quality_pareto_page.k19')}
              fill={designTokens.colors.secondary.dark}
              barSize={32}
            />
            <Line
              yAxisId='right'
              type='monotone'
              dataKey='cumulative_pct'
              name={i18n.t('mes.mes_quality_pareto_page.k20')}
              stroke={designTokens.colors.error.main}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>{i18n.t('mes.analytics.qualityPareto.k1')}</h3>
          <ResponsiveContainer
            width='100%'
            height={280}
          >
            <ScatterChart>
              <CartesianGrid />
              <XAxis
                dataKey='defect_type'
                name={i18n.t('mes.mes_quality_pareto_page.k21')}
                type='category'
                fontSize={10}
              />
              <YAxis
                dataKey='process'
                name={i18n.t('mes.mes_quality_pareto_page.k22')}
                type='category'
                fontSize={10}
              />
              <ZAxis
                dataKey='count'
                range={[40, 360]}
                name={i18n.t('mes.mes_quality_pareto_page.k23')}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter
                data={data.heatmap}
                fill={designTokens.colors.warning.main}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>{i18n.t('mes.mes_quality_pareto_page.k24')}</h3>
          <ResponsiveContainer
            width='100%'
            height={280}
          >
            <PieChart>
              <Pie
                data={data.disposition}
                dataKey='count'
                nameKey='category'
                label
                outerRadius={90}
              >
                {data.disposition.map((entry, idx) => (
                  <Cell
                    key={entry.category}
                    fill={DISPOSITION_COLORS[idx % DISPOSITION_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
