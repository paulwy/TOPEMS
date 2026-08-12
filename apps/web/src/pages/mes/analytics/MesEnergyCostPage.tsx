import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { EnergyCostData } from '@/api/mes/types';

function useEnergyMock(): EnergyCostData {
  return useMemo(() => {
    const workshops = ['一车间', '二车间', '三车间', '四车间', '五车间', '六车间'];
    return {
      per_unit_trend: Array.from({ length: 30 }, (_, i) => ({
        date: `D${i + 1}`,
        kwh_per_unit: Number((2.4 + Math.sin(i / 4) * 0.4 + (i % 7) * 0.03).toFixed(2)),
      })),
      energy_mix: [
        { type: '电力', percentage: 62, cost: 184000 },
        { type: '天然气', percentage: 21, cost: 62000 },
        { type: '蒸汽', percentage: 11, cost: 33000 },
        { type: '水', percentage: 6, cost: 18000 },
      ],
      workshop_top_n: workshops
        .map((w, i) => ({
          workshop: w,
          cost: Math.round(50000 - i * 6000 + Math.cos(i) * 4000),
        }))
        .sort((a, b) => b.cost - a.cost),
    };
  }, []);
}

const STACKED_TREND = Array.from({ length: 12 }, (_, i) => ({
  month: `M${i + 1}`,
  电力: Math.round(15000 + Math.sin(i / 2) * 2000),
  天然气: Math.round(5000 + Math.cos(i / 3) * 800),
  蒸汽: Math.round(2800 + ((i * 100) % 600)),
  水: Math.round(1500 + ((i * 80) % 300)),
}));

export default function MesEnergyCostPage() {
  const data = useEnergyMock();
  const [energyType, setEnergyType] = useState('all');

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">能耗成本分析</h1>
        <select
          value={energyType}
          onChange={(e) => setEnergyType(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
          aria-label="能源类型"
        >
          <option value="all">全部能源</option>
          <option value="elec">电力</option>
          <option value="gas">天然气</option>
          <option value="steam">蒸汽</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {data.energy_mix.map((e, idx) => {
          const colors = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6'];
          return (
            <div key={e.type} className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">{e.type}</p>
              <p className="text-xl font-bold" style={{ color: colors[idx % colors.length] }}>
                ¥{(e.cost / 1000).toFixed(1)}k
              </p>
              <p className="mt-1 text-xs text-gray-500">占比 {e.percentage}%</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border p-4">
        <h3 className="mb-2 font-semibold">单位产品能耗趋势（30 天）</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.per_unit_trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={10} interval={2} />
            <YAxis unit=" kWh" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="kwh_per_unit"
              name="单位能耗"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">能源占比堆叠（12 月）</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={STACKED_TREND}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="电力"
                stackId="1"
                stroke="#6366f1"
                fill="#6366f1"
              />
              <Area
                type="monotone"
                dataKey="天然气"
                stackId="1"
                stroke="#f59e0b"
                fill="#f59e0b"
              />
              <Area
                type="monotone"
                dataKey="蒸汽"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
              />
              <Area type="monotone" dataKey="水" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-semibold">车间成本 Top N</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.workshop_top_n} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" unit="¥" />
              <YAxis dataKey="workshop" type="category" width={70} fontSize={11} />
              <Tooltip />
              <Bar dataKey="cost" name="能耗成本" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
