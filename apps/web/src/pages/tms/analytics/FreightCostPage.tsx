import { designTokens, semanticTokens } from '@topems/tokens';
/**
 * 运费成本分析页
 *
 * 使用 recharts PieChart 展示运费成本结构：
 * - 燃油费 / 路桥费 / 人工费 / 车辆折旧 / 保险费 / 其他
 * 数据为 mock 数据。
 */
import { useMemo } from 'react';
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

const COST_LABELS: Record<string, string> = {
  fuel: '燃油费',
  toll: '路桥费',
  labor: '人工费',
  depreciation: '车辆折旧',
  insurance: '保险费',
  other: '其他',
};

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
  const costData = useMemo(
    () =>
      MOCK_COST_DATA.map((c) => ({
        ...c,
        label: COST_LABELS[c.type] ?? c.type,
      })),
    []
  );

  const monthlyData = useMemo(() => MOCK_MONTHLY, []);

  const totalCost = costData.reduce((s, c) => s + c.amount, 0);
  const largestCost = [...costData].sort((a, b) => b.amount - a.amount)[0];
  const fuelRatio =
    totalCost > 0
      ? Math.round(
          ((costData.find((c) => c.type === 'fuel')?.amount ?? 0) / totalCost) * 1000
        ) / 10
      : 0;

  return (
    <div className='space-y-4 p-4'>
      <div>
        <h1 className='text-2xl font-bold'>运费成本分析</h1>
        <p className='mt-1 text-sm text-gray-500'>展示运费成本结构占比及月度趋势</p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>总运费成本</p>
          <p className='mt-1 text-2xl font-bold text-blue-600'>¥{totalCost.toLocaleString()}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>最大成本项</p>
          <p className='mt-1 text-2xl font-bold text-orange-600'>{largestCost?.label ?? '-'}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>燃油费占比</p>
          <p className='mt-1 text-2xl font-bold text-red-600'>{fuelRatio}%</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>成本项数</p>
          <p className='mt-1 text-2xl font-bold text-green-600'>{costData.length}</p>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>运费成本结构（饼图）</h3>
          <ResponsiveContainer width='100%' height={300}>
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
                  <Cell key={entry.type} fill={COST_COLORS[entry.type] ?? 'colors.grey.400'} />
                ))}
              </Pie>
              <Tooltip formatter={(value: unknown) => `¥${Number(value).toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>成本项对比（柱状图）</h3>
          <ResponsiveContainer width='100%' height={300}>
            <BarChart data={costData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='label' fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(value: unknown) => `¥${Number(value).toLocaleString()}`} />
              <Legend />
              <Bar dataKey='amount' name='成本' fill={designTokens.colors.secondary.dark} barSize={28}>
                {costData.map((entry) => (
                  <Cell key={entry.type} fill={COST_COLORS[entry.type] ?? 'colors.grey.400'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>月度成本趋势（柱状图）</h3>
        <ResponsiveContainer width='100%' height={280}>
          <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='month' fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip formatter={(value: unknown) => `¥${Number(value).toLocaleString()}`} />
            <Legend />
            <Bar dataKey='fuel' name='燃油费' fill={COST_COLORS.fuel} stackId='a' />
            <Bar dataKey='toll' name='路桥费' fill={COST_COLORS.toll} stackId='a' />
            <Bar dataKey='labor' name='人工费' fill={COST_COLORS.labor} stackId='a' />
            <Bar dataKey='other' name='其他' fill={COST_COLORS.other} stackId='a' />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
