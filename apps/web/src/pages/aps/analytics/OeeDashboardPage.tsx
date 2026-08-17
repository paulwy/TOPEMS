import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';
/**
 * OEE 综合设备效率仪表盘
 *
 * 使用 recharts 展示 OEE 及其三大构成指标：
 * - 可用率（Availability）
 * - 性能率（Performance）
 * - 质量率（Quality）
 * - OEE = Availability × Performance × Quality
 * 数据使用内置 mock 数据。
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apsApi } from '@/api/aps';
import { mesApi } from '@/api/mes';
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
  PolarAngleAxis,
} from 'recharts';

const mockData = [
  { workCenter: 'WC-A', availability: 88, performance: 92, quality: 96 },
  { workCenter: 'WC-B', availability: 82, performance: 85, quality: 94 },
  { workCenter: 'WC-C', availability: 90, performance: 88, quality: 98 },
  { workCenter: 'WC-D', availability: 75, performance: 80, quality: 92 },
  { workCenter: 'WC-E', availability: 85, performance: 90, quality: 95 },
  { workCenter: 'WC-F', availability: 92, performance: 94, quality: 99 },
];
export default function OeeDashboardPage() {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['aps', 'OeeDashboardPage'],
    queryFn: async () => {
      try {
        const res = await (typeof (mesApi as any).equipmentOee?.list === 'function'
          ? (mesApi as any).equipmentOee.list()
          : Promise.resolve({ data: { records: [] } }));
        const data = (res as { data?: unknown })?.data;
        const items = Array.isArray(data)
          ? data
          : Array.isArray((data as { records?: unknown[] })?.records)
            ? (data as { records: unknown[] }).records
            : Array.isArray((data as { items?: unknown[] })?.items)
              ? (data as { items: unknown[] }).items
              : [];
        return { oeeRecords: items };
      } catch {
        return {};
      }
    },
  });
  const oeeData = useMemo(() => {
    return mockData.map((d) => ({
      ...d,
      oee: Number(((d.availability * d.performance * d.quality) / 10000).toFixed(1)),
    }));
  }, []);
  const avgOee = useMemo(() => {
    const sum = oeeData.reduce((s, d) => s + d.oee, 0);
    return Number((sum / oeeData.length).toFixed(1));
  }, [oeeData]);
  const avgAvailability = useMemo(() => {
    return Number((oeeData.reduce((s, d) => s + d.availability, 0) / oeeData.length).toFixed(1));
  }, [oeeData]);
  const avgPerformance = useMemo(() => {
    return Number((oeeData.reduce((s, d) => s + d.performance, 0) / oeeData.length).toFixed(1));
  }, [oeeData]);
  const avgQuality = useMemo(() => {
    return Number((oeeData.reduce((s, d) => s + d.quality, 0) / oeeData.length).toFixed(1));
  }, [oeeData]);
  const radialData = [
    {
      name: i18n.t('aps.oee_dashboard_page.k0'),
      value: avgAvailability,
      fill: designTokens.colors.secondary.dark,
    },
    {
      name: i18n.t('aps.oee_dashboard_page.k1'),
      value: avgPerformance,
      fill: designTokens.colors.warning.main,
    },
    {
      name: i18n.t('aps.oee_dashboard_page.k2'),
      value: avgQuality,
      fill: designTokens.colors.success.dark,
    },
    { name: 'OEE', value: avgOee, fill: designTokens.colors.error.main },
  ];
  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>{i18n.t('aps:oee_dashboard_page.oee_2')}</h1>
        <span className='text-sm text-gray-500'>Overall Equipment Effectiveness</span>
      </div>
      <p className='text-sm text-gray-600'>{i18n.t('pages.oee_dashboard_page.k0')}</p>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('aps.oee_dashboard_page.oee_3')}</p>
          <p className='mt-1 text-3xl font-bold text-red-600'>{avgOee}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('aps.oee_dashboard_page.k4')}</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{avgAvailability}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('aps.oee_dashboard_page.k5')}</p>
          <p className='mt-1 text-3xl font-bold text-orange-600'>{avgPerformance}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('aps.oee_dashboard_page.k6')}</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{avgQuality}%</p>
        </div>
      </div>
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>{i18n.t('aps:oee_dashboard_page.oee_1')}</h3>
          <ResponsiveContainer
            width='100%'
            height={300}
          >
            <RadialBarChart
              data={radialData}
              innerRadius='20%'
              outerRadius='100%'
              startAngle={180}
              endAngle={0}
            >
              <PolarAngleAxis
                type='number'
                domain={[0, 100]}
                angleAxisId={0}
              />
              <RadialBar
                background
                dataKey='value'
              />
              <Legend />
              <Tooltip />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>{i18n.t('aps.oee_dashboard_page.oee_7')}</h3>
          <ResponsiveContainer
            width='100%'
            height={300}
          >
            <BarChart
              data={oeeData}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='workCenter'
                fontSize={11}
              />
              <YAxis
                domain={[0, 100]}
                unit='%'
                fontSize={11}
              />
              <Tooltip />
              <Legend />
              <Bar
                dataKey='availability'
                name={i18n.t('aps.oee_dashboard_page.k8')}
                fill={designTokens.colors.secondary.dark}
              />
              <Bar
                dataKey='performance'
                name={i18n.t('aps.oee_dashboard_page.k9')}
                fill={designTokens.colors.warning.main}
              />
              <Bar
                dataKey='quality'
                name={i18n.t('aps.oee_dashboard_page.k10')}
                fill={designTokens.colors.success.dark}
              />
              <Bar
                dataKey='oee'
                name='OEE'
                fill={designTokens.colors.error.main}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('aps:oee_dashboard_page.oee_0')}</h3>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b text-left text-gray-600'>
              <th className='py-2 pr-4'>{i18n.t('aps.oee_dashboard_page.k11')}</th>
              <th className='py-2 pr-4'>{i18n.t('aps.oee_dashboard_page.k12')}</th>
              <th className='py-2 pr-4'>{i18n.t('aps.oee_dashboard_page.k13')}</th>
              <th className='py-2 pr-4'>{i18n.t('aps.oee_dashboard_page.k14')}</th>
              <th className='py-2'>OEE</th>
            </tr>
          </thead>
          <tbody>
            {oeeData.map((d) => (
              <tr
                key={d.workCenter}
                className='border-b'
              >
                <td className='py-2 pr-4 font-medium'>{d.workCenter}</td>
                <td className='py-2 pr-4'>{d.availability}%</td>
                <td className='py-2 pr-4'>{d.performance}%</td>
                <td className='py-2 pr-4'>{d.quality}%</td>
                <td className='py-2'>
                  <span
                    className={
                      d.oee >= 75
                        ? 'inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs text-green-700'
                        : d.oee >= 60
                          ? 'inline-flex items-center rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700'
                          : 'inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs text-red-700'
                    }
                  >
                    {d.oee}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
