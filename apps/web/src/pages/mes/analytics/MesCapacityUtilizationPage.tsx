import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import i18n from '@/i18n';
import type { CapacityUtilizationData } from '@/api/mes/types';
import { designTokens, semanticTokens } from '@topems/tokens';

const SCHEDULE_COLORS = [
  designTokens.colors.success.dark,
  designTokens.colors.warning.main,
  designTokens.colors.error.main,
  designTokens.colors.secondary.dark,
];
function useCapacityMock(): CapacityUtilizationData {
  return useMemo(() => {
    const equipments = [
      'CNC-01',
      'CNC-02',
      i18n.t('mes.mes_capacity_utilization_page.01_3'),
      i18n.t('mes.mes_capacity_utilization_page.01_2'),
      i18n.t('mes.mes_capacity_utilization_page.01_1'),
      i18n.t('mes.mes_capacity_utilization_page.01_0'),
    ];
    const shifts = [
      i18n.t('mes.mes_capacity_utilization_page.k6'),
      i18n.t('mes.mes_capacity_utilization_page.k5'),
      i18n.t('mes.mes_capacity_utilization_page.k4'),
    ];
    const days = [
      i18n.t('mes.mes_capacity_utilization_page.k11'),
      i18n.t('mes.mes_capacity_utilization_page.k10'),
      i18n.t('mes.mes_capacity_utilization_page.k9'),
      i18n.t('mes.mes_capacity_utilization_page.k8'),
      i18n.t('mes.mes_capacity_utilization_page.k7'),
    ];
    const heatmap: CapacityUtilizationData['heatmap'] = [];
    equipments.forEach((eq, ei) => {
      days.forEach((d, di) => {
        shifts.forEach((s, si) => {
          heatmap.push({
            equipment: eq,
            date: d,
            shift: s,
            utilization: Math.round(
              55 + Math.sin(ei * 0.7 + di * 0.4 + si) * 25 + ((ei + di + si) % 4) * 5
            ),
          });
        });
      });
    });
    const stages = [
      i18n.t('mes.mes_capacity_utilization_page.k16'),
      i18n.t('mes.mes_capacity_utilization_page.k15'),
      i18n.t('mes.mes_capacity_utilization_page.k14'),
      i18n.t('mes.mes_capacity_utilization_page.k13'),
      i18n.t('mes.mes_capacity_utilization_page.k12'),
    ];
    let running = 100;
    const waterfall = stages.map((stage, i) => {
      const delta = i === 0 ? 100 : -(i * 7 + (i % 2) * 4);
      running += delta > 0 ? 0 : delta;
      return {
        stage,
        value: i === 0 ? 100 : delta,
        end: i === 0 ? 100 : running,
      };
    });
    return {
      heatmap,
      waterfall,
      bottleneck_top10: equipments
        .map((eq, i) => ({
          equipment: eq,
          utilization: Math.round(85 + Math.cos(i) * 10),
        }))
        .sort((a, b) => a.utilization - b.utilization),
    };
  }, []);
}
const SCHEDULE_PIE = [
  { name: i18n.t('mes.mes_capacity_utilization_page.k17'), value: 42 },
  { name: i18n.t('mes.mes_capacity_utilization_page.k18'), value: 38 },
  { name: i18n.t('mes.mes_capacity_utilization_page.k19'), value: 14 },
  { name: i18n.t('mes.mes_capacity_utilization_page.k20'), value: 6 },
];
export default function MesCapacityUtilizationPage() {
  const data = useCapacityMock();
  const [workCenter, setWorkCenter] = useState('all');
  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>{i18n.t('mes.mes_capacity_utilization_page.k21')}</h1>
        <select
          value={workCenter}
          onChange={(e) => setWorkCenter(e.target.value)}
          className='border rounded px-3 py-1.5 text-sm'
          aria-label={i18n.t('mes.mes_capacity_utilization_page.k22')}
        >
          <option value='all'>{i18n.t('mes.mes_capacity_utilization_page.k23')}</option>
          <option value='wc1'>WC-A</option>
          <option value='wc2'>WC-B</option>
        </select>
      </div>
      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('mes.analytics.capacityUtilization.k0')}</h3>
        <ResponsiveContainer
          width='100%'
          height={320}
        >
          <ScatterChart>
            <CartesianGrid />
            <XAxis
              dataKey='equipment'
              name={i18n.t('mes.mes_capacity_utilization_page.k24')}
              type='category'
              fontSize={11}
            />
            <YAxis
              dataKey='shift'
              name={i18n.t('mes.mes_capacity_utilization_page.k25')}
              type='category'
              fontSize={11}
            />
            <ZAxis
              dataKey='utilization'
              range={[50, 400]}
              name={i18n.t('mes.mes_capacity_utilization_page.k26')}
              unit='%'
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              data={data.heatmap}
              fill={designTokens.colors.secondary.dark}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>{i18n.t('mes.mes_capacity_utilization_page.k27')}</h3>
          <ResponsiveContainer
            width='100%'
            height={260}
          >
            <BarChart data={data.waterfall}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='stage'
                fontSize={10}
                angle={-15}
                textAnchor='end'
                height={60}
              />
              <YAxis unit='%' />
              <Tooltip />
              <Legend />
              <Bar
                dataKey='value'
                name={i18n.t('mes.mes_capacity_utilization_page.k28')}
                fill={designTokens.colors.warning.main}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>{i18n.t('mes.mes_capacity_utilization_page.k29')}</h3>
          <ResponsiveContainer
            width='100%'
            height={260}
          >
            <PieChart>
              <Pie
                data={SCHEDULE_PIE}
                dataKey='value'
                nameKey='name'
                innerRadius={50}
                outerRadius={90}
                label
              >
                {SCHEDULE_PIE.map((entry, idx) => (
                  <Cell
                    key={entry.name}
                    fill={SCHEDULE_COLORS[idx % SCHEDULE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>
          {i18n.t('mes.mes_capacity_utilization_page.top10_30')}
        </h3>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='bg-gray-50 text-left text-gray-600'>
              <tr>
                <th className='px-3 py-2'>{i18n.t('mes.mes_capacity_utilization_page.k31')}</th>
                <th className='px-3 py-2'>{i18n.t('mes.mes_capacity_utilization_page.k32')}</th>
                <th className='px-3 py-2'>{i18n.t('mes.mes_capacity_utilization_page.k33')}</th>
              </tr>
            </thead>
            <tbody>
              {data.bottleneck_top10.map((row) => (
                <tr
                  key={row.equipment}
                  className='border-b'
                >
                  <td className='px-3 py-2 font-mono'>{row.equipment}</td>
                  <td className='px-3 py-2'>{row.utilization}%</td>
                  <td className='px-3 py-2'>
                    <span
                      className={
                        row.utilization < 80
                          ? 'rounded bg-red-100 px-2 py-0.5 text-xs text-red-700'
                          : 'rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700'
                      }
                    >
                      {row.utilization < 80
                        ? i18n.t('mes.mes_capacity_utilization_page.k35')
                        : i18n.t('mes.mes_capacity_utilization_page.k34')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
