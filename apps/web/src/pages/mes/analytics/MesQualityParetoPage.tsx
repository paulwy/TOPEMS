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
import type { QualityParetoData } from '@/api/mes/types';
import { designTokens, semanticTokens } from '@topems/tokens';

const DISPOSITION_COLORS = [designTokens.colors.secondary.dark, designTokens.colors.success.dark, designTokens.colors.warning.main, designTokens.colors.error.main, designTokens.colors.secondary.main];

function useQualityParetoMock(): QualityParetoData {
  return useMemo(() => {
    const types = [
      '划痕',
      '尺寸偏差',
      '色差',
      '气泡',
      '变形',
      '毛刺',
      '杂质',
      '虚焊',
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
        process: `工序 ${(i % 6) + 1}`,
        defect_type: types[i % types.length] ?? '其他',
        count: 2 + ((i * 5) % 18),
      })),
      disposition: [
        { category: '返工', count: 86 },
        { category: '让步接收', count: 32 },
        { category: '报废', count: 24 },
        { category: '降级', count: 18 },
        { category: '复检', count: 12 },
      ],
    };
  }, []);
}

export default function MesQualityParetoPage() {
  const data = useQualityParetoMock();
  const [line, setLine] = useState('all');

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">质量缺陷 Pareto 分析</h1>
        <select
          value={line}
          onChange={(e) => setLine(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
          aria-label="产线筛选"
        >
          <option value="all">全部产线</option>
          <option value="l1">产线 1</option>
          <option value="l2">产线 2</option>
        </select>
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="mb-2 font-semibold">缺陷类型 Pareto（柱+累积线）</h3>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data.defect_types}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="type" fontSize={11} angle={-15} textAnchor="end" height={60} />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="count" name="缺陷数" fill={designTokens.colors.secondary.dark} barSize={32} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative_pct"
              name="累积占比"
              stroke={designTokens.colors.error.main}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">工序 × 缺陷 热力图</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid />
              <XAxis dataKey="defect_type" name="缺陷类型" type="category" fontSize={10} />
              <YAxis dataKey="process" name="工序" type="category" fontSize={10} />
              <ZAxis dataKey="count" range={[40, 360]} name="次数" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={data.heatmap} fill={designTokens.colors.warning.main} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">处置分布</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data.disposition}
                dataKey="count"
                nameKey="category"
                label
                outerRadius={90}
              >
                {data.disposition.map((entry, idx) => (
                  <Cell key={entry.category} fill={DISPOSITION_COLORS[idx % DISPOSITION_COLORS.length]} />
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
