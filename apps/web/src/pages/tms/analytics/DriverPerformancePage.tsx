import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';
/**
 * 司机绩效分析页
 *
 * 使用 recharts BarChart 展示各司机的准点送达率：
 * - 准点率（%）
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
  ReferenceLine,
} from 'recharts';

const MOCK_DATA = [
  {
    driver: i18n.t('tms.driver_performance_page.k0'),
    onTimeRate: 92,
    totalDeliveries: 45,
    avgDelayMin: 5,
  },
  {
    driver: i18n.t('tms.driver_performance_page.k1'),
    onTimeRate: 88,
    totalDeliveries: 38,
    avgDelayMin: 8,
  },
  {
    driver: i18n.t('tms.driver_performance_page.k2'),
    onTimeRate: 95,
    totalDeliveries: 52,
    avgDelayMin: 3,
  },
  {
    driver: i18n.t('tms.driver_performance_page.k3'),
    onTimeRate: 78,
    totalDeliveries: 30,
    avgDelayMin: 15,
  },
  {
    driver: i18n.t('tms.driver_performance_page.k4'),
    onTimeRate: 90,
    totalDeliveries: 42,
    avgDelayMin: 6,
  },
  {
    driver: i18n.t('tms.driver_performance_page.k5'),
    onTimeRate: 85,
    totalDeliveries: 35,
    avgDelayMin: 10,
  },
  {
    driver: i18n.t('tms.driver_performance_page.k6'),
    onTimeRate: 97,
    totalDeliveries: 48,
    avgDelayMin: 2,
  },
  {
    driver: i18n.t('tms.driver_performance_page.k7'),
    onTimeRate: 82,
    totalDeliveries: 33,
    avgDelayMin: 12,
  },
  {
    driver: i18n.t('tms.driver_performance_page.k8'),
    onTimeRate: 89,
    totalDeliveries: 40,
    avgDelayMin: 7,
  },
  {
    driver: i18n.t('tms.driver_performance_page.k9'),
    onTimeRate: 94,
    totalDeliveries: 46,
    avgDelayMin: 4,
  },
];
export default function DriverPerformancePage() {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['tms', 'DriverPerformancePage'],
    queryFn: async () => {
      try {
        const res = await tmsApi.listDrivers();
        const data = (res as { data?: unknown })?.data;
        const items = Array.isArray(data)
          ? data
          : Array.isArray((data as { items?: unknown[] })?.items)
            ? (data as { items: unknown[] }).items
            : [];
        const ratings = items
          .map((x: unknown) => (x as { avg_rating?: number })?.avg_rating)
          .filter((v: unknown): v is number => typeof v === 'number' && !isNaN(v));
        const avgScore =
          ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
        return {
          total: items.length,
          avgScore,
        };
      } catch {
        return {};
      }
    },
  });
  const data = useMemo(() => MOCK_DATA, []);
  const avgOnTimeRate =
    data.length > 0
      ? Math.round((data.reduce((s, d) => s + d.onTimeRate, 0) / data.length) * 10) / 10
      : 0;
  const totalDeliveries = data.reduce((s, d) => s + d.totalDeliveries, 0);
  const topPerformer = [...data].sort((a, b) => b.onTimeRate - a.onTimeRate)[0];
  return (
    <div className='space-y-4 p-4'>
      <div>
        <h1 className='text-2xl font-bold'>{i18n.t('tms.driver_performance_page.k10')}</h1>
        <p className='mt-1 text-sm text-gray-500'>{i18n.t('tms.driver_performance_page.k11')}</p>
      </div>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('tms.driver_performance_page.k12')}</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{avgOnTimeRate}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('tms.driver_performance_page.k13')}</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{totalDeliveries}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('tms.driver_performance_page.k14')}</p>
          <p className='mt-1 text-3xl font-bold text-orange-600'>{topPerformer?.driver ?? '-'}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('tms.driver_performance_page.k15')}</p>
          <p className='mt-1 text-3xl font-bold text-purple-600'>
            {topPerformer?.onTimeRate ?? 0}%
          </p>
        </div>
      </div>
      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('tms.driver_performance_page.k16')}</h3>
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
              dataKey='driver'
              fontSize={11}
            />
            <YAxis
              domain={[60, 100]}
              unit='%'
              fontSize={11}
            />
            <Tooltip formatter={(value: unknown) => `${value}%`} />
            <Legend />
            <ReferenceLine
              y={90}
              stroke={designTokens.colors.success.dark}
              strokeDasharray='4 4'
              label={i18n.t('tms.driver_performance_page.90_17')}
            />
            <Bar
              dataKey='onTimeRate'
              name={i18n.t('tms.driver_performance_page.k18')}
              fill={designTokens.colors.primary.main}
              barSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('tms.driver_performance_page.k19')}</h3>
        <ResponsiveContainer
          width='100%'
          height={240}
        >
          <BarChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='driver'
              fontSize={11}
            />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Bar
              dataKey='totalDeliveries'
              name={i18n.t('tms.driver_performance_page.k20')}
              fill={designTokens.colors.secondary.dark}
              barSize={20}
            />
            <Bar
              dataKey='avgDelayMin'
              name={i18n.t('tms.driver_performance_page.k21')}
              fill={designTokens.colors.warning.main}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
