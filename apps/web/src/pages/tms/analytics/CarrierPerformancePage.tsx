import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';
/**
 * 承运商绩效分析页
 *
 * 使用 recharts BarChart 展示各承运商的配送统计对比：
 * - 总运单数、准时送达数、破损数
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
} from 'recharts';

const MOCK_DATA = [
  {
    carrier: i18n.t('tms.carrier_performance_page.k0'),
    totalShipments: 320,
    onTime: 285,
    damaged: 5,
  },
  {
    carrier: i18n.t('tms.carrier_performance_page.k1'),
    totalShipments: 280,
    onTime: 240,
    damaged: 8,
  },
  {
    carrier: i18n.t('tms.carrier_performance_page.k2'),
    totalShipments: 350,
    onTime: 320,
    damaged: 3,
  },
  {
    carrier: i18n.t('tms.carrier_performance_page.k3'),
    totalShipments: 410,
    onTime: 370,
    damaged: 6,
  },
  {
    carrier: i18n.t('tms.carrier_performance_page.k4'),
    totalShipments: 260,
    onTime: 225,
    damaged: 4,
  },
  {
    carrier: i18n.t('tms.carrier_performance_page.k5'),
    totalShipments: 300,
    onTime: 265,
    damaged: 7,
  },
  {
    carrier: i18n.t('tms.carrier_performance_page.k6'),
    totalShipments: 240,
    onTime: 210,
    damaged: 9,
  },
];
export default function CarrierPerformancePage() {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['tms', 'CarrierPerformancePage'],
    queryFn: async () => {
      try {
        const res = await tmsApi.listCarriers();
        const data = (res as { data?: unknown })?.data;
        const items = Array.isArray(data)
          ? data
          : Array.isArray((data as { items?: unknown[] })?.items)
            ? (data as { items: unknown[] }).items
            : [];
        const totalShipments = items.reduce(
          (s: number, x: unknown) =>
            s + ((x as { total_shipments?: number })?.total_shipments ?? 0),
          0
        );
        const onTime = items.reduce(
          (s: number, x: unknown) => s + ((x as { on_time?: number })?.on_time ?? 0),
          0
        );
        const damaged = items.reduce(
          (s: number, x: unknown) => s + ((x as { damaged?: number })?.damaged ?? 0),
          0
        );
        const pending = items.filter(
          (x: unknown) => (x as { status?: string })?.status === 'PENDING'
        ).length;
        const active = items.filter(
          (x: unknown) => (x as { status?: string })?.status === 'ACTIVE'
        ).length;
        return {
          total: items.length,
          totalShipments,
          onTime,
          damaged,
          pending,
          active,
        };
      } catch {
        return {};
      }
    },
  });
  const data = useMemo(
    () =>
      MOCK_DATA.map((d) => ({
        ...d,
        onTimeRate:
          d.totalShipments > 0 ? Math.round((d.onTime / d.totalShipments) * 1000) / 10 : 0,
        damageRate:
          d.totalShipments > 0 ? Math.round((d.damaged / d.totalShipments) * 1000) / 10 : 0,
      })),
    []
  );
  const totalShipments = data.reduce((s, d) => s + d.totalShipments, 0);
  const totalOnTime = data.reduce((s, d) => s + d.onTime, 0);
  const totalDamaged = data.reduce((s, d) => s + d.damaged, 0);
  const avgOnTimeRate =
    totalShipments > 0 ? Math.round((totalOnTime / totalShipments) * 1000) / 10 : 0;
  return (
    <div className='space-y-4 p-4'>
      <div>
        <h1 className='text-2xl font-bold'>{i18n.t('tms.carrier_performance_page.k7')}</h1>
        <p className='mt-1 text-sm text-gray-500'>{i18n.t('tms.carrier_performance_page.k8')}</p>
      </div>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('tms.carrier_performance_page.k9')}</p>
          <p className='mt-1 text-3xl font-bold text-blue-600'>{totalShipments}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('tms.carrier_performance_page.k10')}</p>
          <p className='mt-1 text-3xl font-bold text-green-600'>{totalOnTime}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('tms.carrier_performance_page.k11')}</p>
          <p className='mt-1 text-3xl font-bold text-red-600'>{totalDamaged}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('tms.carrier_performance_page.k12')}</p>
          <p className='mt-1 text-3xl font-bold text-orange-600'>{avgOnTimeRate}%</p>
        </div>
      </div>
      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('tms.carrier_performance_page.k13')}</h3>
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
              dataKey='carrier'
              fontSize={11}
            />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Bar
              dataKey='totalShipments'
              name={i18n.t('tms.carrier_performance_page.k14')}
              fill={designTokens.colors.primary.main}
              barSize={20}
            />
            <Bar
              dataKey='onTime'
              name={i18n.t('tms.carrier_performance_page.k15')}
              fill={designTokens.colors.success.dark}
              barSize={20}
            />
            <Bar
              dataKey='damaged'
              name={i18n.t('tms.carrier_performance_page.k16')}
              fill={designTokens.colors.error.main}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('tms.carrier_performance_page.k17')}</h3>
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
              dataKey='carrier'
              fontSize={11}
            />
            <YAxis
              unit='%'
              fontSize={11}
            />
            <Tooltip formatter={(value: unknown) => `${value}%`} />
            <Legend />
            <Bar
              dataKey='onTimeRate'
              name={i18n.t('tms.carrier_performance_page.k18')}
              fill={designTokens.colors.success.dark}
              barSize={20}
            />
            <Bar
              dataKey='damageRate'
              name={i18n.t('tms.carrier_performance_page.k19')}
              fill={designTokens.colors.warning.main}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
