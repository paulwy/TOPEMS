import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';
/**
 * 路线效率分析页
 *
 * 使用 recharts BarChart 展示各路线的成本与时间分析：
 * - 平均运输时长（小时）
 * - 单位成本（元/公里）
 * 数据为 mock 数据。
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tmsApi } from '@/api/tms';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

const MOCK_DATA = [
  {
    route: i18n.t('pages.route_efficiency_page.k0'),
    distance: 1213,
    avgHours: 14.5,
    costPerKm: 8.2,
    totalTrips: 85,
  },
  {
    route: i18n.t('pages.route_efficiency_page.k1'),
    distance: 140,
    avgHours: 2.0,
    costPerKm: 6.5,
    totalTrips: 120,
  },
  {
    route: i18n.t('pages.route_efficiency_page.k2'),
    distance: 308,
    avgHours: 4.0,
    costPerKm: 7.1,
    totalTrips: 95,
  },
  {
    route: i18n.t('pages.route_efficiency_page.k3'),
    distance: 352,
    avgHours: 4.5,
    costPerKm: 6.8,
    totalTrips: 78,
  },
  {
    route: i18n.t('pages.route_efficiency_page.k4'),
    distance: 511,
    avgHours: 6.5,
    costPerKm: 7.5,
    totalTrips: 62,
  },
  {
    route: i18n.t('pages.route_efficiency_page.k5'),
    distance: 276,
    avgHours: 3.5,
    costPerKm: 6.9,
    totalTrips: 88,
  },
  {
    route: i18n.t('pages.route_efficiency_page.k6'),
    distance: 325,
    avgHours: 4.2,
    costPerKm: 7.3,
    totalTrips: 70,
  },
  {
    route: i18n.t('pages.route_efficiency_page.k7'),
    distance: 392,
    avgHours: 5.0,
    costPerKm: 7.8,
    totalTrips: 55,
  },
];

export default function RouteEfficiencyPage() {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['tms', 'RouteEfficiencyPage'],
    queryFn: async () => {
      try {
        const res = await tmsApi.listRoutes();
        const data = (res as { data?: unknown })?.data;
        const items = Array.isArray(data)
          ? data
          : Array.isArray((data as { items?: unknown[] })?.items)
            ? (data as { items: unknown[] }).items
            : [];
        const distances = items
          .map((x: unknown) => (x as { distance?: number })?.distance)
          .filter((v: unknown): v is number => typeof v === 'number' && !isNaN(v));
        const avgDistance =
          distances.length > 0 ? distances.reduce((s, d) => s + d, 0) / distances.length : 0;
        const totalTrips = items.reduce(
          (s: number, x: unknown) => s + ((x as { total_trips?: number })?.total_trips ?? 0),
          0
        );
        return {
          total: items.length,
          avgDistance,
          totalTrips,
        };
      } catch {
        return {};
      }
    },
  });
  const data = useMemo(() => MOCK_DATA, []);

  const avgHours =
    data.length > 0
      ? Math.round((data.reduce((s, d) => s + d.avgHours, 0) / data.length) * 10) / 10
      : 0;
  const avgCostPerKm =
    data.length > 0
      ? Math.round((data.reduce((s, d) => s + d.costPerKm, 0) / data.length) * 100) / 100
      : 0;
  const totalTrips = data.reduce((s, d) => s + d.totalTrips, 0);
  const totalDistance = data.reduce((s, d) => s + d.distance, 0);

  return (
    <div className='space-y-4 p-4'>
      <div>
        <h1 className='text-2xl font-bold'>{i18n.t('pages.route_efficiency_page.k8')}</h1>
        <p className='mt-1 text-sm text-gray-500'>{i18n.t('pages.route_efficiency_page.k9')}</p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.route_efficiency_page.k10')}</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{avgHours}h</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.route_efficiency_page.k11')}</p>
          <p className='mt-1 text-3xl font-bold text-orange-600'>¥{avgCostPerKm}/km</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.route_efficiency_page.k12')}</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{totalTrips}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('pages.route_efficiency_page.k13')}</p>
          <p className='mt-1 text-3xl font-bold text-purple-600'>{totalDistance}km</p>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('pages.route_efficiency_page.k14')}</h3>
        <ResponsiveContainer
          width='100%'
          height={340}
        >
          <BarChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='route'
              fontSize={11}
            />
            <YAxis
              yAxisId='left'
              fontSize={11}
              unit='h'
            />
            <YAxis
              yAxisId='right'
              orientation='right'
              fontSize={11}
              unit='/km'
            />
            <Tooltip />
            <Legend />
            <Bar
              yAxisId='left'
              dataKey='avgHours'
              name={i18n.t('pages.route_efficiency_page.h_15')}
              fill={designTokens.colors.primary.main}
              barSize={20}
            />
            <Bar
              yAxisId='right'
              dataKey='costPerKm'
              name={i18n.t('pages.route_efficiency_page.km_0')}
              fill={designTokens.colors.warning.main}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('pages.route_efficiency_page.k16')}</h3>
        <ResponsiveContainer
          width='100%'
          height={300}
        >
          <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              type='number'
              dataKey='distance'
              name={i18n.t('pages.route_efficiency_page.k17')}
              unit='km'
              fontSize={11}
            />
            <YAxis
              type='number'
              dataKey='totalTrips'
              name={i18n.t('pages.route_efficiency_page.k18')}
              fontSize={11}
            />
            <ZAxis
              type='number'
              dataKey='avgHours'
              name={i18n.t('pages.route_efficiency_page.k19')}
              unit='h'
              range={[60, 400]}
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter
              name={i18n.t('pages.route_efficiency_page.k20')}
              data={data}
              fill={designTokens.colors.secondary.dark}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
