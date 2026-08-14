/**
 * 质量成本分析页
 *
 * 使用 recharts 展示 PAF 质量成本模型：
 * - PieChart：预防 / 鉴定 / 内部故障 / 外部故障 占比
 * - BarChart：按部门成本分布
 * - LineChart：月度成本趋势
 * 数据来自 useQmsMock 的 qualityCosts。
 */
import { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useQmsMock, type QmsMockShape } from '@/api/qms/_mock';
import { designTokens, semanticTokens } from '@topems/tokens';

const COST_TYPE_COLORS: Record<string, string> = {
  prevention: designTokens.colors.success.dark,
  appraisal: designTokens.colors.primary.main,
  internal_failure: designTokens.colors.warning.main,
  external_failure: designTokens.colors.error.main,
};

const COST_TYPE_LABELS: Record<string, string> = {
  prevention: '预防成本',
  appraisal: '鉴定成本',
  internal_failure: '内部故障',
  external_failure: '外部故障',
};

export default function QmsCostAnalysisPage() {
  const { data } = useQmsMock<QmsMockShape>();

  const costByType = useMemo(() => {
    const map: Record<string, number> = {
      prevention: 0,
      appraisal: 0,
      internal_failure: 0,
      external_failure: 0,
    };
    (data.qualityCosts ?? []).forEach((c) => {
      const key = c.costType;
      if (map[key] !== undefined) map[key] += c.amount;
    });
    return Object.entries(map).map(([type, amount]) => ({
      type,
      label: COST_TYPE_LABELS[type] ?? type,
      amount,
    }));
  }, [data.qualityCosts]);

  const costByDepartment = useMemo(() => {
    const map = new Map<string, number>();
    (data.qualityCosts ?? []).forEach((c) => {
      const dept = c.department || '未分配';
      map.set(dept, (map.get(dept) ?? 0) + c.amount);
    });
    return Array.from(map.entries()).map(([department, amount]) => ({ department, amount }));
  }, [data.qualityCosts]);

  const trend = useMemo(() => {
    const map = new Map<
      string,
      { prevention: number; appraisal: number; internal_failure: number; external_failure: number }
    >();
    (data.qualityCosts ?? []).forEach((c) => {
      const month = (c.occurrenceDate || '').slice(0, 7);
      if (!month) return;
      if (!map.has(month)) {
        map.set(month, { prevention: 0, appraisal: 0, internal_failure: 0, external_failure: 0 });
      }
      const entry = map.get(month)!;
      if (entry[c.costType as keyof typeof entry] !== undefined) {
        entry[c.costType as keyof typeof entry] += c.amount;
      }
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v }));
  }, [data.qualityCosts]);

  const totalCost = costByType.reduce((s, c) => s + c.amount, 0);
  const failureCost =
    (costByType.find((c) => c.type === 'internal_failure')?.amount ?? 0) +
    (costByType.find((c) => c.type === 'external_failure')?.amount ?? 0);
  const preventionCost = costByType.find((c) => c.type === 'prevention')?.amount ?? 0;
  const ratio = preventionCost > 0 ? Math.round((failureCost / preventionCost) * 100) / 100 : 0;

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>质量成本分析（PAF 模型）</h1>
        <span className='text-sm text-gray-500'>符合性 / 不符合性成本比：{ratio}</span>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>总质量成本</p>
          <p className='mt-1 text-2xl font-bold text-blue-600'>¥{totalCost.toLocaleString()}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>预防成本</p>
          <p className='mt-1 text-2xl font-bold text-green-600'>
            ¥{preventionCost.toLocaleString()}
          </p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>故障成本</p>
          <p className='mt-1 text-2xl font-bold text-red-600'>¥{failureCost.toLocaleString()}</p>
        </div>
        <div className='rounded-lg border p-4'>
          <p className='text-sm text-gray-600'>成本记录数</p>
          <p className='mt-1 text-2xl font-bold text-orange-600'>
            {data.qualityCosts?.length ?? 0}
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>PAF 成本结构（饼图）</h3>
          <ResponsiveContainer
            width='100%'
            height={300}
          >
            <PieChart>
              <Pie
                data={costByType}
                dataKey='amount'
                nameKey='label'
                label={(entry: unknown) => {
                  const e = entry as { label?: string; amount?: number };
                  return `${e.label}: ¥${(e.amount ?? 0).toLocaleString()}`;
                }}
                outerRadius={100}
              >
                {costByType.map((entry) => (
                  <Cell
                    key={entry.type}
                    fill={COST_TYPE_COLORS[entry.type] ?? '#9ca3af'}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: unknown) => `¥${Number(value).toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className='rounded-lg border p-4'>
          <h3 className='mb-2 font-semibold'>部门成本分布（柱状图）</h3>
          <ResponsiveContainer
            width='100%'
            height={300}
          >
            <BarChart
              data={costByDepartment}
              margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='department'
                fontSize={11}
              />
              <YAxis fontSize={11} />
              <Tooltip formatter={(value: unknown) => `¥${Number(value).toLocaleString()}`} />
              <Legend />
              <Bar
                dataKey='amount'
                name='成本'
                fill={designTokens.colors.secondary.dark}
                barSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className='rounded-lg border p-4'>
        <h3 className='mb-2 font-semibold'>月度成本趋势（折线图）</h3>
        <ResponsiveContainer
          width='100%'
          height={300}
        >
          <LineChart
            data={trend}
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
            <Line
              type='monotone'
              dataKey='prevention'
              name='预防'
              stroke={COST_TYPE_COLORS.prevention}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type='monotone'
              dataKey='appraisal'
              name='鉴定'
              stroke={COST_TYPE_COLORS.appraisal}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type='monotone'
              dataKey='internal_failure'
              name='内部故障'
              stroke={COST_TYPE_COLORS.internal_failure}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type='monotone'
              dataKey='external_failure'
              name='外部故障'
              stroke={COST_TYPE_COLORS.external_failure}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
