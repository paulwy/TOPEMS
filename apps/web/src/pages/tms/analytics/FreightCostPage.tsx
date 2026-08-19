import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';
/**
 * 运费成本分析页
 *
 * 使用 recharts PieChart 展示运费成本结构：
 * - 燃油费 / 路桥费 / 人工费 / 车辆折旧 / 保险费 / 其他
 * 数据为 mock 数据。
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tmsApi } from '@/api/tms';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const COST_COLORS: Record<string, string> = {
  fuel: designTokens.colors.primary.main,
  toll: designTokens.colors.warning.main,
  labor: designTokens.colors.success.dark,
  depreciation: designTokens.colors.secondary.main,
  insurance: designTokens.colors.error.main,
  other: 'colors.grey.500',
};
function getCostLabels(): Record<string, string> {
  return {
    fuel: i18n.t('tms.freight_cost_page.k0'),
    toll: i18n.t('tms.freight_cost_page.k1'),
    labor: i18n.t('tms.freight_cost_page.k2'),
    depreciation: i18n.t('tms.freight_cost_page.k3'),
    insurance: i18n.t('tms.freight_cost_page.k4'),
    other: i18n.t('tms.freight_cost_page.k5'),
  };
}
const MOCK_COST_DATA = [
  { type: 'fuel', amount: 185000 },
  { type: 'toll', amount: 92000 },
  { type: 'labor', amount: 156000 },
  { type: 'depreciation', amount: 78000 },
  { type: 'insurance', amount: 45000 },
  { type: 'other', amount: 34000 },
];
const MOCK_MONTHLY = [
  { month: '2025-07', fuel: 30000, toll: 15000, labor: 26000, other: 25000 },
  { month: '2025-08', fuel: 32000, toll: 16000, labor: 26000, other: 26000 },
  { month: '2025-09', fuel: 31000, toll: 15500, labor: 26000, other: 25500 },
  { month: '2025-10', fuel: 30500, toll: 15250, labor: 26000, other: 25500 },
  { month: '2025-11', fuel: 31500, toll: 15125, labor: 26000, other: 25000 },
  { month: '2025-12', fuel: 30000, toll: 15125, labor: 26000, other: 27000 },
];
export default function FreightCostPage() {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['tms', 'FreightCostPage'],
    queryFn: async () => {
      try {
        const [shipmentsRes, routesRes, carriersRes] = await Promise.all([
          tmsApi.listShipments(),
          tmsApi.listRoutes(),
          tmsApi.listCarriers(),
        ]);
        const extractItems = (res: unknown) => {
          const data = (res as { data?: unknown })?.data;
          if (Array.isArray(data)) return data;
          const items = (data as { items?: unknown[] })?.items;
          return Array.isArray(items) ? items : [];
        };
        const n1 = extractItems(shipmentsRes).length;
        const n2 = extractItems(routesRes).length;
        const n3 = extractItems(carriersRes).length;
        return {
          shipments: n1,
          routes: n2,
          carriers: n3,
        };
      } catch {
        return {};
      }
    },
  });
  const costData = useMemo(
    () =>
      MOCK_COST_DATA.map((c) => ({
        ...c,
        label: getCostLabels()[c.type] ?? c.type,
      })),
    []
  );
  const monthlyData = useMemo(() => MOCK_MONTHLY, []);
  const totalCost = costData.reduce((s, c) => s + c.amount, 0);
  const largestCost = [...costData].sort((a, b) => b.amount - a.amount)[0];
  const fuelRatio =
    totalCost > 0
      ? Math.round(((costData.find((c) => c.type === 'fuel')?.amount ?? 0) / totalCost) * 1000) / 10
      : 0;
  return (
    <div className='space-y-4 p-4'>
      <div>
        <h1 className='text-2xl font-bold'>{i18n.t('tms.freight_cost_page.k6')}</h1>
        <p className='mt-1 text-sm text-gray-500'>{i18n.t('tms.freight_cost_page.k7')}</p>
      </div>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('tms.freight_cost_page.k8')}</p>
          <p className='mt-1 text-2xl font-bold text-blue-600'>¥{totalCost.toLocaleString()}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('tms.freight_cost_page.k9')}</p>
          <p className='mt-1 text-2xl font-bold text-orange-600'>{largestCost?.label ?? '-'}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('tms.freight_cost_page.k10')}</p>
          <p className='mt-1 text-2xl font-bold text-red-600'>{fuelRatio}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>{i18n.t('tms.freight_cost_page.k11')}</p>
          <p className='mt-1 text-2xl font-bold text-green-600'>{costData.length}</p>
        </div>
      </div>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>{i18n.t('tms.freight_cost_page.k12')}</h3>
          <ResponsiveContainer
            width='100%'
            height={300}
          >
            <PieChart>
              <Pie
                data={costData}
                dataKey='amount'
                nameKey='label'
                label={(entry: unknown) => {
                  const e = entry as { label?: string; amount?: number };
                  return `${e.label}: ¥${(e.amount ?? 0).toLocaleString()}`;
                }}
                outerRadius={100}
              >
                {costData.map((entry) => (
                  <Cell
                    key={entry.type}
                    fill={COST_COLORS[entry.type] ?? 'colors.grey.400'}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: unknown) => `¥${Number(value).toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>{i18n.t('tms.freight_cost_page.k13')}</h3>
          <ResponsiveContainer
            width='100%'
            height={300}
          >
            <BarChart
              data={costData}
              margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='label'
                fontSize={11}
              />
              <YAxis fontSize={11} />
              <Tooltip formatter={(value: unknown) => `¥${Number(value).toLocaleString()}`} />
              <Legend />
              <Bar
                dataKey='amount'
                name={i18n.t('tms.freight_cost_page.k14')}
                fill={designTokens.colors.secondary.dark}
                barSize={28}
              >
                {costData.map((entry) => (
                  <Cell
                    key={entry.type}
                    fill={COST_COLORS[entry.type] ?? 'colors.grey.400'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>{i18n.t('tms.freight_cost_page.k15')}</h3>
        <ResponsiveContainer
          width='100%'
          height={280}
        >
          <BarChart
            data={monthlyData}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='month'
              fontSize={11}
            />
            <YAxis fontSize={11} />
            <Tooltip formatter={(value: unknown) => `¥${Number(value).toLocaleString()}`} />
            <Legend />
            <Bar
              dataKey='fuel'
              name={i18n.t('tms.freight_cost_page.k16')}
              fill={COST_COLORS.fuel}
              stackId='a'
            />
            <Bar
              dataKey='toll'
              name={i18n.t('tms.freight_cost_page.k17')}
              fill={COST_COLORS.toll}
              stackId='a'
            />
            <Bar
              dataKey='labor'
              name={i18n.t('tms.freight_cost_page.k18')}
              fill={COST_COLORS.labor}
              stackId='a'
            />
            <Bar
              dataKey='other'
              name={i18n.t('tms.freight_cost_page.k19')}
              fill={COST_COLORS.other}
              stackId='a'
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
